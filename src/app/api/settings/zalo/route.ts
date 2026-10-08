import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { AccessError, requireSameOrigin, requireUser } from '@/lib/auth';
import { getDbPool } from '@/lib/db';
import { callZalo, sendZaloMessage, zaloTokenConfigured, ZaloApiError } from '@/lib/zalo-bot';
import { createZaloPairing, emptyZaloSettings, readZaloSettings, saveZaloPreferences } from '@/lib/zalo-settings-store';
import { zaloPreferencesSchema, zaloStatusSchema } from '@/domain/zalo-notifications';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('pair') }), z.object({ action: z.literal('test') }),
  z.object({ action: z.literal('webhook') }), z.object({ action: z.literal('save'), preferences: zaloPreferencesSchema }),
]);
async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'admin') throw new AccessError(403, 'Chỉ quản trị viên được cấu hình thông báo Zalo.');
}
async function status() {
  const settings = await readZaloSettings();
  const run = await getDbPool().query<{ started_at: Date | string; finished_at: Date | string | null; status: string; sent_count: number; failed_count: number; unknown_count: number }>("SELECT started_at,finished_at,status,sent_count,failed_count,unknown_count FROM zalo_notification_runs ORDER BY started_at DESC LIMIT 1");
  const jobs = await getDbPool().query<{ pending: string; failed: string; unknown: string }>("SELECT COUNT(*) FILTER (WHERE status='pending')::text AS pending,COUNT(*) FILTER (WHERE status='failed')::text AS failed,COUNT(*) FILTER (WHERE status='unknown')::text AS unknown FROM zalo_notification_jobs");
  const row = run.rows[0], count = jobs.rows[0];
  return zaloStatusSchema.parse({ settings, tokenConfigured: zaloTokenConfigured(), webhookSecretConfigured: (process.env.ZALO_WEBHOOK_SECRET?.length || 0) >= 32, cronSecretConfigured: (process.env.CRON_SECRET?.length || 0) >= 32, lastRun: row ? { startedAt: new Date(row.started_at).toISOString(), finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null, status: row.status, sent: row.sent_count, failed: row.failed_count, unknown: row.unknown_count } : null, jobs: { pending: Number(count.pending), failed: Number(count.failed), unknown: Number(count.unknown) }, demo: false });
}
export async function GET() {
  if (process.env.APP_DATA_SOURCE !== 'supabase') return NextResponse.json({ settings: emptyZaloSettings, tokenConfigured: false, webhookSecretConfigured: false, cronSecretConfigured: false, lastRun: null, jobs: { pending: 0, failed: 0, unknown: 0 }, demo: true });
  try { await requireAdmin(); return NextResponse.json(await status(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (process.env.APP_DATA_SOURCE !== 'supabase') return NextResponse.json({ error: 'Bản demo không liên kết hoặc gửi Zalo thật.' }, { status: 409 });
    await requireAdmin();
    const input = actionSchema.parse(await request.json());
    if (!(input.action === 'save' && !input.preferences.enabled) && !zaloTokenConfigured()) throw new AccessError(409, 'Cần cấu hình ZALO_BOT_TOKEN phía server.');
    let result: Record<string, unknown> = {};
    if (input.action === 'pair') {
      if ((process.env.ZALO_WEBHOOK_SECRET?.length || 0) < 32) throw new AccessError(409, 'Cần cấu hình ZALO_WEBHOOK_SECRET phía server.');
      result = await createZaloPairing();
    } else if (input.action === 'save') {
      await saveZaloPreferences(input.preferences);
    } else if (input.action === 'test') {
      const settings = await readZaloSettings();
      if (!settings.chatId) throw new AccessError(409, 'Liên kết Zalo cá nhân trước khi gửi thử.');
      result = { messageId: await sendZaloMessage(settings.chatId, 'TOOLDESK · Tin kiểm tra\nKết nối thông báo Zalo cá nhân hoạt động. Gói sắp hết hạn, quá hạn và lịch chăm sóc sẽ được gửi theo cấu hình và lịch chạy của hệ thống.') };
    } else {
      const secret = process.env.ZALO_WEBHOOK_SECRET || '', appUrl = process.env.APP_URL || '';
      if (secret.length < 32 || secret.length > 256 || !appUrl.startsWith('https://')) throw new AccessError(409, 'Cần APP_URL HTTPS và ZALO_WEBHOOK_SECRET từ 32 đến 256 ký tự.');
      await callZalo('getMe');
      const previous = z.object({ url: z.string().optional() }).parse(await callZalo('getWebhookInfo'));
      const url = new URL('/api/zalo/webhook', appUrl).href;
      if (previous.url && previous.url !== url) throw new AccessError(409, 'Bot đang nối với webhook khác. Cần đối chiếu trước khi thay đổi.');
      const configured = z.object({ verification: z.object({ ok: z.boolean() }).optional() }).parse(await callZalo('setWebhook', { url, secret_token: secret }));
      result = { webhookVerified: configured.verification?.ok === true };
    }
    return NextResponse.json({ ...await status(), ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
function errorResponse(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZaloApiError) return NextResponse.json({ error: error.message }, { status: 502 });
  if (error instanceof ZodError) return NextResponse.json({ error: 'Dữ liệu hoặc phản hồi Zalo chưa hợp lệ.' }, { status: 400 });
  return NextResponse.json({ error: 'Chưa xử lý được cấu hình Zalo. Kiểm tra migration và biến môi trường phía server.' }, { status: 503 });
}
