import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { zaloPairingMessage } from '@/domain/zalo-notifications';
import { consumeZaloPairing } from '@/lib/zalo-settings-store';
import { sendZaloMessage } from '@/lib/zalo-bot';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const secret = process.env.ZALO_WEBHOOK_SECRET;
  const actual = Buffer.from(request.headers.get('x-bot-api-secret-token') || '');
  const expected = Buffer.from(secret || '');
  if (!secret || secret.length < 32 || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: 'Không được phép.' }, { status: 401 });
  if (process.env.APP_DATA_SOURCE !== 'supabase') return NextResponse.json({ error: 'Webhook bị tắt trong bản demo.' }, { status: 409 });
  try {
    const body = await request.text();
    if (body.length > 16384) return NextResponse.json({ error: 'Nội dung quá lớn.' }, { status: 413 });
    const input: unknown = JSON.parse(body);
    const message = zaloPairingMessage(input);
    // Zalo also posts verification/other events. Never reveal the owner or accept a group.
    if (!message) return NextResponse.json({ ok: true });
    const linked = await consumeZaloPairing(message);
    if (!linked) return NextResponse.json({ ok: true });
    try {
      await sendZaloMessage(message.chatId, 'Đã liên kết Zalo cá nhân với Tooldesk. Vào Cài đặt → Thông báo Zalo để bật thông báo và gửi thử.');
      return NextResponse.json({ ok: true });
    } catch {
      // Pairing is already committed; retries must not relink or repeat the confirmation.
      return NextResponse.json({ ok: true, confirmationSent: false });
    }
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'JSON không hợp lệ.' }, { status: 400 });
    return NextResponse.json({ error: 'Chưa xử lý được liên kết Zalo. Kiểm tra migration.' }, { status: 503 });
  }
}
