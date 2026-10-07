import { NextResponse } from 'next/server';
import { AccessError, requireUser } from '@/lib/auth';
import { getDbPool } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    if (process.env.APP_DATA_SOURCE !== 'supabase') return NextResponse.json({ jobs: [], counts: [] });
    await requireUser();
    const pool = getDbPool();
    const [jobs, counts] = await Promise.all([
      pool.query('SELECT id,subscription_id,recipient,status,attempts,provider_message_id,last_error,sent_at,created_at FROM email_outbox ORDER BY created_at DESC LIMIT 30'),
      pool.query('SELECT status,count(*)::int AS count FROM email_outbox GROUP BY status')
    ]);
    return NextResponse.json({ jobs: jobs.rows, counts: counts.rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Không tải được lịch sử nhắc.' }, { status: 503 });
  }
}
