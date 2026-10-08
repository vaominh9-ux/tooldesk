import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
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

    const before = await client.query('SELECT source, COUNT(*)::int AS count FROM customers GROUP BY 1 ORDER BY 1');
    console.log('Customer sources before:');
    console.table(before.rows);

    const updateRes = await client.query(`
      UPDATE customers
      SET source = 'Zalo'
      WHERE source = 'Nhập thủ công' OR source IS NULL OR trim(source) = ''
    `);
    console.log(`Updated ${updateRes.rowCount} customers with 'Nhập thủ công' -> 'Zalo'.`);

    // Ensure database column default is 'Zalo'
    await client.query("ALTER TABLE customers ALTER COLUMN source SET DEFAULT 'Zalo'");
    console.log("Set default column default for source to 'Zalo'.");

    const after = await client.query('SELECT source, COUNT(*)::int AS count FROM customers GROUP BY 1 ORDER BY 1');
    console.log('Customer sources after:');
    console.table(after.rows);

    await client.query('COMMIT');
    console.log('Transaction committed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error, rolled back:', err);
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
