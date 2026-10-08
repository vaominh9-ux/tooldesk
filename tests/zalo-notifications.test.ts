import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import { createInitialData } from '@/mocks/fixtures';
import { zaloDefaultPreferences, zaloNotificationCandidates, zaloPairingMessage } from '@/domain/zalo-notifications';
vi.mock('server-only', () => ({}));
let db: PGlite;
let client: Pick<Pool, 'query'>;
vi.mock('@/lib/db', () => ({ getDbPool: () => client, transaction: async (fn: (value: Pick<Pool, 'query'>) => Promise<unknown>) => {
  await db.exec('BEGIN'); try { const result = await fn(client); await db.exec('COMMIT'); return result; } catch (error) { await db.exec('ROLLBACK'); throw error; }
} }));
vi.mock('@/lib/data-repository', () => ({ loadData: vi.fn() }));
vi.mock('@/lib/clock', () => ({ todayInHoChiMinh: () => '2026-10-08' }));
vi.mock('@/lib/auth', () => ({
  AccessError: class AccessError extends Error { constructor(public status: number, message: string) { super(message); } },
  requireSameOrigin: vi.fn(), requireUser: vi.fn(),
}));
import { loadData } from '@/lib/data-repository';
import { requireUser } from '@/lib/auth';
import { readZaloSettings, createZaloPairing, consumeZaloPairing, saveZaloPreferences } from '@/lib/zalo-settings-store';
import { callZalo, sendZaloMessage, ZaloApiError } from '@/lib/zalo-bot';
import { runZaloNotificationWorker } from '@/features/communications/zalo-notification-worker';
import { GET as statusGet, POST as settingsPost } from '@/app/api/settings/zalo/route';
import { POST as webhookPost } from '@/app/api/zalo/webhook/route';
import { GET as cronGet } from '@/app/api/cron/zalo-notifications/route';

const token = '123456:test_only_secret';
const secret = 'test-secret-that-is-longer-than-32-characters';
const prefs = { ...zaloDefaultPreferences, enabled: true, sendHour: 0 };
function fixture() {
  const data = createInitialData();
  data.subscriptions = [{ ...data.subscriptions[0], cancelled: false, startsAt: '2026-09-08', expiresAt: '2026-10-09' }];
  data.careAppointments = [];
  return data;
}
function message(code: string, type = 'PRIVATE', isBot = false) {
  return { ok: true, result: { event_name: 'message.text.received', message: { from: { id: 'owner', display_name: 'Chủ Tooldesk', is_bot: isBot }, chat: { id: 'owner', chat_type: type }, text: `/tooldesk ${code}` } } };
}
function post(action: unknown) {
  return settingsPost(new Request('https://example.com/api/settings/zalo', { method: 'POST', headers: { origin: 'https://example.com', 'Content-Type': 'application/json' }, body: JSON.stringify(action) }));
}
function webhook(input: unknown, header = secret) {
  return webhookPost(new Request('https://example.com/api/zalo/webhook', { method: 'POST', headers: { 'x-bot-api-secret-token': header }, body: JSON.stringify(input) }));
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await db.exec(readFileSync('supabase/migrations/20261008_zalo_notifications.sql', 'utf8'));
  client = { query: async (sql: string, values?: unknown[]) => { const result = await db.query(sql, values); return { ...result, rowCount: result.affectedRows ?? result.rows.length }; } } as unknown as Pick<Pool, 'query'>;
}, 60000);
afterAll(async () => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); await db?.close(); });
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv('APP_DATA_SOURCE', 'supabase'); vi.stubEnv('APP_URL', 'https://example.com');
  vi.stubEnv('ZALO_BOT_TOKEN', token); vi.stubEnv('ZALO_WEBHOOK_SECRET', secret); vi.stubEnv('CRON_SECRET', secret);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, result: { message_id: 'provider-message' } }), { status: 200 })));
  vi.mocked(requireUser).mockResolvedValue({ id: 'admin', email: 'admin@example.com', role: 'admin' });
  vi.mocked(loadData).mockReset().mockResolvedValue(fixture());
  await db.exec("TRUNCATE zalo_notification_jobs,zalo_notification_runs; UPDATE zalo_bot_settings SET enabled=TRUE,expiring=TRUE,expired=TRUE,care=TRUE,send_hour=0,chat_id='owner',recipient_name='Chủ Tooldesk',pairing_hash=NULL,pairing_expires_at=NULL;");
});
describe('Zalo candidates and private identity', () => {
  it('uses HCM send hour and excludes future/cancelled subscriptions', () => {
    const data = fixture(); data.subscriptions.push({ ...data.subscriptions[0], id: 'future', startsAt: '2026-10-10' }, { ...data.subscriptions[0], id: 'cancelled', cancelled: true });
    expect(zaloNotificationCandidates(data, '2026-10-08', '2026-10-08T01:59:00Z', 'https://example.com', { ...prefs, sendHour: 9 })).toHaveLength(0);
    const result = zaloNotificationCandidates(data, '2026-10-08', '2026-10-08T02:00:00Z', 'https://example.com', { ...prefs, sendHour: 9 });
    expect(result).toHaveLength(1); expect(result[0].text).toContain('Gói sắp hết hạn'); expect(result[0].text).toContain('00:00 giờ Việt Nam');
  });
  it('expires at the exclusive boundary and keys each daily/cycle event', () => {
    const data = fixture(); data.subscriptions[0].expiresAt = '2026-10-08';
    const first = zaloNotificationCandidates(data, '2026-10-08', '2026-10-08T02:00:00Z', 'https://example.com', prefs);
    expect(first[0].text).toContain('Gói đã hết hạn');
    expect(zaloNotificationCandidates(data, '2026-10-09', '2026-10-09T02:00:00Z', 'https://example.com', prefs)[0].eventKey).not.toBe(first[0].eventKey);
    data.subscriptions[0].expiresAt = '2026-11-08';
    expect(zaloNotificationCandidates(data, '2026-10-08', '2026-10-08T02:00:00Z', 'https://example.com', prefs)).toHaveLength(0);
  });
  it('care ignores send hour, includes only due pending tasks and changes key on reschedule', () => {
    const data = fixture(), at = '2026-10-08T01:00:00Z';
    const care = { id: 'care', customerId: data.customers[0].id, title: 'Hỏi thăm', channel: 'phone' as const, scheduledAt: at, notes: '', status: 'scheduled' as const, createdAt: at, updatedAt: at, completedAt: null };
    data.careAppointments = [care, { ...care, id: 'future', scheduledAt: '2026-10-09T02:00:00Z' }, { ...care, id: 'done', status: 'completed', completedAt: at }, { ...care, id: 'cancelled', status: 'cancelled' }];
    const result = zaloNotificationCandidates(data, '2026-10-08', at, 'https://example.com', { ...prefs, sendHour: 23 });
    expect(result).toHaveLength(1); expect(result[0].text).toContain('Đến giờ chăm sóc');
    care.scheduledAt = '2026-10-08T00:30:00Z';
    expect(zaloNotificationCandidates(data, '2026-10-08', at, 'https://example.com', { ...prefs, sendHour: 23 })[0].eventKey).not.toBe(result[0].eventKey);
  });
  it('respects disabled/category preferences and rejects insecure links', () => {
    expect(zaloNotificationCandidates(fixture(), '2026-10-08', '2026-10-08T02:00:00Z', 'https://example.com', zaloDefaultPreferences)).toEqual([]);
    expect(zaloNotificationCandidates(fixture(), '2026-10-08', '2026-10-08T02:00:00Z', 'https://example.com', { ...prefs, expiring: false })).toEqual([]);
    expect(() => zaloNotificationCandidates(fixture(), '2026-10-08', '2026-10-08T02:00:00Z', 'http://example.com', prefs)).toThrow('HTTPS');
  });
  it('accepts only exact private pairing command from a human', () => {
    const code = 'a'.repeat(24);
    expect(zaloPairingMessage(message(code))?.chatId).toBe('owner');
    expect(zaloPairingMessage(message(code, 'GROUP'))).toBeNull();
    expect(zaloPairingMessage(message(code, 'PRIVATE', true))).toBeNull();
    expect(zaloPairingMessage(message('guess'))).toBeNull();
    const distinctIds = message(code); distinctIds.result.message.from.id = 'other';
    expect(zaloPairingMessage(distinctIds)?.chatId).toBe('owner');
  });
  it('validates raw and wrapped events and requires explicit private human metadata', () => {
    const wrapped = message('a'.repeat(24)), raw = wrapped.result;
    expect(zaloPairingMessage(raw)?.chatId).toBe('owner');
    expect(zaloPairingMessage({ ...raw, message: { ...raw.message, chat: { id: 'owner' } } })).toBeNull();
    expect(zaloPairingMessage({ ...raw, message: { ...raw.message, from: { id: 'owner' } } })).toBeNull();
    expect(zaloPairingMessage(message('a'.repeat(24), 'GROUP').result)).toBeNull();
    expect(zaloPairingMessage(message('a'.repeat(24), 'PRIVATE', true).result)).toBeNull();
    expect(zaloPairingMessage({ ...wrapped, ok: false })).toBeNull();
  });
});
describe('Zalo pairing, permissions and safe transport', () => {
  it('hashes a single-use expiring code and relinking always disables sending', async () => {
    const paired = await createZaloPairing(), code = paired.command.split(' ')[1];
    const row = (await db.query<{ pairing_hash: string }>('SELECT pairing_hash FROM zalo_bot_settings')).rows[0];
    expect(row.pairing_hash).not.toBe(code); expect(row.pairing_hash).toHaveLength(64);
    expect(await consumeZaloPairing({ code, chatId: 'new-owner', name: 'Tôi' })).toBe(true);
    expect(await consumeZaloPairing({ code, chatId: 'attacker', name: 'Khác' })).toBe(false);
    expect(await readZaloSettings()).toMatchObject({ chatId: 'new-owner', enabled: false, pairingPending: false });
  });
  it('rejects expired pairing and enabling without a recipient', async () => {
    const pair = await createZaloPairing();
    await db.exec("UPDATE zalo_bot_settings SET pairing_expires_at=NOW()-INTERVAL '1 minute'");
    expect(await consumeZaloPairing({ code: pair.command.split(' ')[1], chatId: 'other', name: 'Khác' })).toBe(false);
    await db.exec('UPDATE zalo_bot_settings SET enabled=FALSE,chat_id=NULL');
    await expect(saveZaloPreferences(prefs)).rejects.toThrow('Liên kết');
  });
  it('webhook rejects forged secrets, ignores groups, and confirms only once', async () => {
    const pair = await createZaloPairing(), code = pair.command.split(' ')[1];
    expect((await webhook(message(code), 'forged')).status).toBe(401);
    expect((await webhook(message(code, 'GROUP'))).status).toBe(200); expect(fetch).not.toHaveBeenCalled();
    expect((await webhook(message(code))).status).toBe(200);
    expect((await webhook(message(code))).status).toBe(200); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('verification/unsupported updates do not access pairing or send a message', async () => {
    expect((await webhook({ ok: true, result: { event_name: 'verification' } })).status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('admin status never includes a token or pairing hash; staff is rejected', async () => {
    await createZaloPairing();
    const status = await (await statusGet()).text();
    expect(status).not.toContain(token); expect(status).not.toContain('pairing_hash');
    vi.mocked(requireUser).mockResolvedValue({ id: 'staff', email: 'staff@example.com', role: 'staff' });
    expect((await statusGet()).status).toBe(403); expect((await post({ action: 'pair' })).status).toBe(403);
  });
  it('demo blocks all real webhook/config/test/worker operations', async () => {
    vi.stubEnv('APP_DATA_SOURCE', 'mock');
    expect((await post({ action: 'test' })).status).toBe(409);
    expect((await webhook(message('a'.repeat(24)))).status).toBe(409);
    expect(await runZaloNotificationWorker()).toMatchObject({ enabled: false, reason: 'demo' });
    expect(fetch).not.toHaveBeenCalled(); expect((await db.query('SELECT id FROM zalo_notification_runs')).rows).toHaveLength(0);
  });
  it('allows turning off sending even if the token was removed', async () => {
    vi.stubEnv('ZALO_BOT_TOKEN', '');
    expect((await post({ action: 'save', preferences: zaloDefaultPreferences })).status).toBe(200);
    expect((await readZaloSettings()).enabled).toBe(false);
  });
  it('sanitizes token-bearing network errors and marks provider rejections definite', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error(`fetch failed https://bot-api.zaloplatforms.com/bot${token}/sendMessage`));
    await expect(sendZaloMessage('owner', 'Test')).rejects.toThrow('Chưa xác định');
    try { vi.mocked(fetch).mockRejectedValueOnce(new Error(token)); await callZalo('getMe'); } catch (error) { expect(String(error)).not.toContain(token); }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error_code: 403 }), { status: 200 }));
    await expect(sendZaloMessage('owner', 'Test')).rejects.toMatchObject({ definiteRejection: true });
    await expect(sendZaloMessage('owner', 'x'.repeat(2001))).rejects.toThrow();
  });
  it('refuses to overwrite a different bot webhook', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: { id: 'bot' } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: { url: 'https://different.example/webhook' } })));
    expect((await post({ action: 'webhook' })).status).toBe(409);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('cron requires a strong matching bearer key', async () => {
    expect((await cronGet(new Request('https://example.com/api/cron/zalo-notifications'))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
    vi.stubEnv('APP_DATA_SOURCE', 'mock');
    expect((await cronGet(new Request('https://example.com/api/cron/zalo-notifications', { headers: { authorization: `Bearer ${secret}` } }))).status).toBe(409);
  });
});
describe('Persisted Zalo dispatch', () => {
  it('a repeated cron sends only once and records a completed run', async () => {
    expect(await runZaloNotificationWorker()).toMatchObject({ sent: 1 });
    expect(await runZaloNotificationWorker()).toMatchObject({ sent: 0 });
    expect(fetch).toHaveBeenCalledTimes(1);
    const jobs = (await db.query<{ status: string; provider_message_id: string }>('SELECT status,provider_message_id FROM zalo_notification_jobs')).rows;
    expect(jobs).toEqual([{ status: 'sent', provider_message_id: 'provider-message' }]);
    expect((await db.query('SELECT id FROM zalo_notification_runs WHERE status=\'completed\'')).rows).toHaveLength(2);
  });
  it('rechecks renewal and cancels the queued stale reminder before sending', async () => {
    const renewed = fixture(); renewed.subscriptions[0].expiresAt = '2026-11-09';
    vi.mocked(loadData).mockResolvedValueOnce(fixture()).mockResolvedValue(renewed);
    expect(await runZaloNotificationWorker()).toMatchObject({ cancelled: 1, sent: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not retry ambiguous network delivery', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new ZaloApiError(false, 'Timeout'));
    expect(await runZaloNotificationWorker()).toMatchObject({ unknown: 1 });
    expect(await runZaloNotificationWorker()).toMatchObject({ sent: 0 });
    expect(fetch).toHaveBeenCalledTimes(1);
    const error = (await db.query<{ last_error: string }>('SELECT last_error FROM zalo_notification_jobs')).rows[0].last_error;
    expect(error).not.toContain(token);
  });
  it('persists explicit rejection and leaves it for review without resending', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error_code: 403 })));
    expect(await runZaloNotificationWorker()).toMatchObject({ failed: 1 });
    expect(await runZaloNotificationWorker()).toMatchObject({ sent: 0 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('disabled/unconfigured sending does not create jobs or runs', async () => {
    await saveZaloPreferences(zaloDefaultPreferences);
    expect(await runZaloNotificationWorker()).toMatchObject({ enabled: false });
    vi.stubEnv('ZALO_BOT_TOKEN', '');
    expect(await runZaloNotificationWorker()).toMatchObject({ reason: 'missing_token' });
    expect((await db.query('SELECT id FROM zalo_notification_jobs')).rows).toHaveLength(0);
    expect((await db.query('SELECT id FROM zalo_notification_runs')).rows).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('interrupted sends are marked unknown, never claimed again', async () => {
    const candidates = zaloNotificationCandidates(fixture(), '2026-10-08', new Date().toISOString(), 'https://example.com', prefs);
    await db.query("INSERT INTO zalo_notification_jobs(id,event_key,chat_id,status,attempted_at) VALUES ('00000000-0000-0000-0000-000000000001',$1,'owner','sending',NOW()-INTERVAL '20 minutes')", [candidates[0].eventKey]);
    await runZaloNotificationWorker();
    expect((await db.query<{ status: string }>('SELECT status FROM zalo_notification_jobs')).rows[0].status).toBe('unknown');
    expect(fetch).not.toHaveBeenCalled();
  });
});
