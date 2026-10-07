import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, transaction } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { todayInHoChiMinh } from '@/lib/clock';

export const dynamic = 'force-dynamic';
function authorized(request: NextRequest): boolean { const secret = process.env.CRON_SECRET; return Boolean(secret && request.headers.get('authorization') === 'Bearer ' + secret); }

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Không được phép.' }, { status: 401 });
  const today = todayInHoChiMinh(), pool = getDbPool();
  const settings = (await pool.query('SELECT reminder_days, shop_name, owner_name FROM settings LIMIT 1')).rows[0] || { reminder_days: 7, shop_name: 'Tooldesk', owner_name: 'Tooldesk' };
  const rows = (await pool.query("SELECT s.id, s.expires_at::text AS expires_at, c.email, c.name AS customer_name, p.name AS product_name, pp.name AS plan_name FROM subscriptions s JOIN customers c ON c.id=s.customer_id JOIN products p ON p.id=s.product_id JOIN product_plans pp ON pp.id=s.plan_id WHERE s.cancelled=false AND s.expires_at::date > $1::date AND s.expires_at::date <= ($1::date + ($2::int * INTERVAL '1 day')) AND s.reminded_at IS NULL AND c.email IS NOT NULL AND c.email <> '' AND c.email_consent='opted_in' ORDER BY s.expires_at", [today, Number(settings.reminder_days) || 7])).rows;
  let sent = 0, skipped = 0, failed = 0;
  for (const row of rows) {
    const claim = await transaction(async client => {
      const result = await client.query('UPDATE subscriptions SET reminded_at=$1::date WHERE id=$2 AND reminded_at IS NULL RETURNING id', [today, row.id]);
      if (!result.rowCount) return false;
      await client.query("INSERT INTO reminder_deliveries (subscription_id, reminder_date, email, status) VALUES ($1,$2,$3,'claimed') ON CONFLICT (subscription_id, reminder_date) DO NOTHING", [row.id, today, row.email]);
      return true;
    });
    if (!claim) { skipped++; continue; }
    try {
      const days = Math.max(0, Math.round((Date.parse(String(row.expires_at) + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000));
      const result = await sendEmail({ to: String(row.email), subject: String(settings.shop_name) + ' · Gói ' + row.product_name + ' sắp hết hạn', text: 'Chào ' + row.customer_name + ',\n\nGói ' + row.product_name + ' (' + row.plan_name + ') còn khoảng ' + days + ' ngày và hết hạn vào ' + row.expires_at + '. Vui lòng liên hệ ' + settings.owner_name + ' để được hỗ trợ gia hạn.' });
      await pool.query('UPDATE reminder_deliveries SET status=$1, provider_message_id=$2, sent_at=NOW() WHERE subscription_id=$3 AND reminder_date=$4', [result.skipped ? 'skipped' : 'sent', result.messageId || null, row.id, today]);
      result.skipped ? skipped++ : sent++;
    } catch (error) {
      failed++;
      await pool.query("UPDATE reminder_deliveries SET status='failed', error_message=$1 WHERE subscription_id=$2 AND reminder_date=$3", [error instanceof Error ? error.message : 'Lỗi gửi email', row.id, today]);
    }
  }
  return NextResponse.json({ ok: true, today, candidates: rows.length, sent, skipped, failed });
}
