import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runReminderWorker } from '@/features/communications/reminder-worker';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
async function handleCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from('Bearer ' + (secret || ''));
  if (!secret || secret.length < 32 || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: 'Không được phép.' }, { status: 401 });
  if (process.env.APP_DATA_SOURCE !== 'supabase') return NextResponse.json({ error: 'Tác vụ nhắc chỉ chạy trong chế độ Supabase.' }, { status: 409 });
  try { return NextResponse.json(await runReminderWorker()); }
  catch (error) { console.error('Reminder worker failed:', error); return NextResponse.json({ error: 'Tác vụ nhắc lỗi. Kiểm tra nhật ký server.' }, { status: 503 }); }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
