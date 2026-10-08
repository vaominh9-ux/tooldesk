import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '5432') url.port = '6543';
  const ca = process.env.DATABASE_CA_CERT?.replaceAll('\\n', '\n') || readFileSync('supabase/certs/prod-ca-2021.crt', 'utf8');

  const pool = new Pool({
    connectionString: url.href,
    max: 1,
    ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: true, ca }
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const beforeRes = await client.query(`
      SELECT email_consent, COUNT(*)::int AS count
      FROM customers
      GROUP BY email_consent
      ORDER BY email_consent
    `);
    console.log('Customer consent counts before update:');
    console.table(beforeRes.rows);

    const updateRes = await client.query(`
      UPDATE customers
      SET 
        email_consent = 'opted_in',
        consent_source = CASE 
          WHEN consent_source IS NULL OR trim(consent_source) = '' THEN 'Khách mua tool AI (xác nhận mặc định)'
          ELSE consent_source
        END,
        consent_updated_at = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      WHERE email_consent = 'unknown'
    `);
    console.log(`Updated ${updateRes.rowCount} customers from 'unknown' to 'opted_in'.`);

    // Set schema column defaults for future inserts
    await client.query(`
      ALTER TABLE customers ALTER COLUMN email_consent SET DEFAULT 'opted_in';
      ALTER TABLE customers ALTER COLUMN consent_source SET DEFAULT 'Khách mua tool AI (xác nhận mặc định)';
    `);
    console.log('Set default email_consent column default to opted_in in PostgreSQL schema.');

    const afterRes = await client.query(`
      SELECT email_consent, COUNT(*)::int AS count
      FROM customers
      GROUP BY email_consent
      ORDER BY email_consent
    `);
    console.log('Customer consent counts after update:');
    console.table(afterRes.rows);

    await client.query('COMMIT');
    console.log('Transaction committed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error occurred, rolled back:', err);
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
