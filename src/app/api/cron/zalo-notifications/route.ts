import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runZaloNotificationWorker } from '@/features/communications/zalo-notification-worker';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret || ''}`);
  if (!secret || secret.length < 32 || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: 'Không được phép.' }, { status: 401 });
  if (process.env.APP_DATA_SOURCE !== 'supabase') return NextResponse.json({ error: 'Thông báo Zalo chỉ chạy với dữ liệu Supabase.' }, { status: 409 });
  try { return NextResponse.json(await runZaloNotificationWorker(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'Tác vụ Zalo thất bại. Kiểm tra cấu hình, migration và lịch sử chạy.' }, { status: 503 }); }
}
export const GET = handle;
export const POST = handle;
