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

  try {
    const jobCommand = `
      SELECT net.http_post(
        url := 'https://tooldesk-plum.vercel.app/api/cron/zalo-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer 48bd540a4ad313b92e2d6b1f23a4b384e478dff5230aef51dbfc90ff524e5ccc'
        ),
        body := '{}'::jsonb
      );
    `;

    // Unschedule first if exists to prevent duplicates
    try {
      await pool.query("SELECT cron.unschedule('tooldesk-zalo-notifications-job')");
    } catch {
      // ignore
    }

    // Schedule every 5 minutes
    const res = await pool.query(
      "SELECT cron.schedule('tooldesk-zalo-notifications-job', '*/5 * * * *', $1)",
      [jobCommand]
    );

    console.log('Cron job scheduled successfully, jobId:', res.rows[0]);

    const allJobs = await pool.query('SELECT jobid, jobname, schedule, active FROM cron.job');
    console.table(allJobs.rows);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
