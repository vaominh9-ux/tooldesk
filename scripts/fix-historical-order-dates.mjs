import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
  }

  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '5432') {
    url.port = '6543';
  }

  const ca = process.env.DATABASE_CA_CERT?.replaceAll('\\n', '\n') || readFileSync('supabase/certs/prod-ca-2021.crt', 'utf8');
  const pool = new Pool({
    connectionString: url.href,
    max: 1,
    connectionTimeoutMillis: 10000,
    ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: true, ca }
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Calculate all-time revenue before update
    const beforeAllTimeRes = await client.query(`
      SELECT 
        COUNT(*)::int AS total_orders,
        COALESCE(SUM(price), 0)::numeric AS total_revenue,
        COALESCE(SUM(cost), 0)::numeric AS total_cost
      FROM orders
      WHERE payment = 'paid' AND status <> 'cancelled'
    `);
    const beforeAllTime = beforeAllTimeRes.rows[0];

    // 2. Select the historical orders that need updating
    const candidatesRes = await client.query(`
      SELECT 
        id, customer_id, product_id, plan_id,
        starts_at::text AS starts_at,
        expires_at::text AS expires_at,
        date::text AS date,
        paid_at::text AS paid_at,
        price, cost, payment, status
      FROM orders
      WHERE starts_at < '2026-10-01'
        AND (date >= '2026-10-01' OR paid_at >= '2026-10-01')
      ORDER BY starts_at ASC
    `);

    const candidates = candidatesRes.rows;
    console.log(`Found ${candidates.length} historical orders needing date adjustment.`);

    if (candidates.length === 0) {
      console.log('No historical orders need adjustment.');
      await client.query('ROLLBACK');
      return;
    }

    console.log('\n--- DETAIL OF ORDERS TO BE UPDATED ---');
    for (const order of candidates) {
      const newDate = order.starts_at;
      const newPaidAt = order.payment === 'paid' ? order.starts_at : null;

      console.log(`Order ${order.id}:`);
      console.log(`  starts_at: ${order.starts_at}`);
      console.log(`  date:      ${order.date} -> ${newDate}`);
      console.log(`  paid_at:   ${order.paid_at} -> ${newPaidAt}`);
      console.log(`  price:     ${Number(order.price).toLocaleString('vi-VN')} đ`);

      // Update order date and paid_at
      await client.query(`
        UPDATE orders
        SET date = $1, paid_at = $2
        WHERE id = $3
      `, [newDate, newPaidAt, order.id]);
    }

    // 3. Integrity checks after update
    const checkConstraints = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE paid_at < date) AS payment_before_sale,
        COUNT(*) FILTER (WHERE paid_at > (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AS future_payments,
        COUNT(*) FILTER (WHERE payment = 'unpaid' AND paid_at IS NOT NULL) AS unpaid_with_date,
        COUNT(*) FILTER (WHERE payment = 'paid' AND paid_at IS NULL) AS paid_without_date
      FROM orders
    `);
    const integrity = checkConstraints.rows[0];
    console.log('\n--- INTEGRITY CHECKS ---');
    console.log('Payment before sale count:', integrity.payment_before_sale);
    console.log('Future payment count:', integrity.future_payments);
    console.log('Unpaid with paid_at count:', integrity.unpaid_with_date);
    console.log('Paid without paid_at count:', integrity.paid_without_date);

    if (
      Number(integrity.payment_before_sale) > 0 ||
      Number(integrity.future_payments) > 0 ||
      Number(integrity.unpaid_with_date) > 0 ||
      Number(integrity.paid_without_date) > 0
    ) {
      throw new Error('Integrity validation failed! Rolling back changes.');
    }

    // 4. Verify all-time revenue remains exactly unchanged
    const afterAllTimeRes = await client.query(`
      SELECT 
        COUNT(*)::int AS total_orders,
        COALESCE(SUM(price), 0)::numeric AS total_revenue,
        COALESCE(SUM(cost), 0)::numeric AS total_cost
      FROM orders
      WHERE payment = 'paid' AND status <> 'cancelled'
    `);
    const afterAllTime = afterAllTimeRes.rows[0];

    console.log('\n--- ALL-TIME REVENUE VERIFICATION ---');
    console.log(`Before: Orders=${beforeAllTime.total_orders}, Revenue=${Number(beforeAllTime.total_revenue).toLocaleString('vi-VN')} đ, Cost=${Number(beforeAllTime.total_cost).toLocaleString('vi-VN')} đ`);
    console.log(`After:  Orders=${afterAllTime.total_orders}, Revenue=${Number(afterAllTime.total_revenue).toLocaleString('vi-VN')} đ, Cost=${Number(afterAllTime.total_cost).toLocaleString('vi-VN')} đ`);

    if (
      beforeAllTime.total_orders !== afterAllTime.total_orders ||
      beforeAllTime.total_revenue !== afterAllTime.total_revenue ||
      beforeAllTime.total_cost !== afterAllTime.total_cost
    ) {
      throw new Error('Total financial verification mismatch! Rolling back.');
    }

    // 5. Monthly breakdown
    const monthlyBreakdown = await client.query(`
      SELECT 
        TO_CHAR(COALESCE(paid_at, date), 'YYYY-MM') AS month,
        COUNT(*)::int AS order_count,
        SUM(price)::numeric AS revenue,
        SUM(cost)::numeric AS cost,
        (SUM(price) - SUM(cost))::numeric AS gross_profit
      FROM orders
      WHERE payment = 'paid' AND status <> 'cancelled'
      GROUP BY TO_CHAR(COALESCE(paid_at, date), 'YYYY-MM')
      ORDER BY month ASC
    `);

    console.log('\n--- MONTHLY REVENUE BREAKDOWN AFTER UPDATE ---');
    console.table(monthlyBreakdown.rows.map(r => ({
      'Tháng': r.month,
      'Số đơn': r.order_count,
      'Doanh thu': Number(r.revenue).toLocaleString('vi-VN') + ' đ',
      'Giá vốn': Number(r.cost).toLocaleString('vi-VN') + ' đ',
      'Lợi nhuận gộp': Number(r.gross_profit).toLocaleString('vi-VN') + ' đ'
    })));

    if (isDryRun) {
      console.log('\n[DRY RUN] Rolling back transaction. No changes were committed.');
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
      console.log('\n[SUCCESS] Transaction committed successfully. Database updated.');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n[ERROR] An error occurred. Transaction rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
