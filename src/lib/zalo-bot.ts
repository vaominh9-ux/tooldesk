import 'server-only';
import { z } from 'zod';

const envelopeSchema = z.object({ ok: z.boolean(), result: z.unknown().optional(), error_code: z.number().int().optional() });
export class ZaloApiError extends Error {
  constructor(public definiteRejection: boolean, message: string) { super(message); }
}
export function getZaloBotToken(): string {
  return (process.env.ZALO_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
}
export function zaloTokenConfigured() {
  return /^\d+:[A-Za-z0-9_-]+$/.test(getZaloBotToken());
}
export async function callZalo(method: 'getMe' | 'sendMessage' | 'setWebhook' | 'getWebhookInfo', body: Record<string, unknown> = {}): Promise<unknown> {
  const token = getZaloBotToken();
  if (!zaloTokenConfigured()) throw new ZaloApiError(true, 'Chưa cấu hình ZALO_BOT_TOKEN hợp lệ phía server.');
  let response: Response;
  try {
    response = await fetch(`https://bot-api.zaloplatforms.com/bot${token}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(8000), redirect: 'error',
    });
  } catch {
    // Fetch errors may include the credential-bearing URL; never return/log that error.
    throw new ZaloApiError(false, 'Chưa xác định kết quả yêu cầu Zalo do lỗi mạng hoặc hết thời gian chờ.');
  }
  const parsed = envelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new ZaloApiError(false, 'Zalo trả phản hồi không hợp lệ; cần đối chiếu trước khi gửi lại.');
  if (!response.ok || !parsed.data.ok) throw new ZaloApiError(true, `Zalo từ chối yêu cầu (mã ${parsed.data.error_code ?? response.status}).`);
  return parsed.data.result;
}
export async function sendZaloMessage(chatId: string, text: string): Promise<string> {
  const input = z.object({ chat_id: z.string().min(1).max(200), text: z.string().min(1).max(2000) }).parse({ chat_id: chatId, text });
  const result = await callZalo('sendMessage', input);
  const parsed = z.object({ message_id: z.string().min(1) }).safeParse(result);
  if (!parsed.success) throw new ZaloApiError(false, 'Zalo chưa trả mã tin nhắn; cần đối chiếu trước khi gửi lại.');
  return parsed.data.message_id;
}
