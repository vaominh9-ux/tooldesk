import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SmtpConfig } from '@/domain/smtp-config';
const mocks = vi.hoisted(() => ({ query: vi.fn(), pool: vi.fn(), send: vi.fn(), close: vi.fn(), transport: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ getDbPool: mocks.pool, transaction: async (fn: (client: { query: typeof mocks.query }) => Promise<unknown>) => fn({ query: mocks.query }) }));
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.transport } }));
import { encryptSmtpConfig, readSmtpConfig, saveSmtpConfig } from '@/lib/smtp-config-store';
import { sendEmail } from '@/lib/email';
const config: SmtpConfig = { host: 'smtp.example.com', port: 587, user: 'user', password: 'test-only', fromEmail: 'sender@example.com', fromName: 'Tooldesk', enabled: true, sendHour: 9 };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('APP_DATA_SOURCE', 'supabase'); vi.stubEnv('SMTP_CONFIG_ENCRYPTION_KEY', 'a'.repeat(64));
  vi.stubEnv('SMTP_HOST', config.host); vi.stubEnv('SMTP_USER', config.user); vi.stubEnv('SMTP_PASSWORD', config.password);
  vi.stubEnv('EMAIL_FROM', config.fromEmail); vi.stubEnv('EMAIL_SEND_ENABLED', 'true'); vi.stubEnv('SMTP_PORT', '587');
  mocks.pool.mockReturnValue({ query: mocks.query }); mocks.query.mockResolvedValue({ rows: [] });
  mocks.transport.mockReturnValue({ sendMail: mocks.send, close: mocks.close });
  mocks.send.mockResolvedValue({ accepted: ['recipient@example.com'], rejected: [], messageId: 'test-message' });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
describe('SMTP configuration and bounded transport', () => {
  it('propagates database failure rather than silently enabling environment credentials', async () => {
    mocks.query.mockRejectedValue(new Error('Database unavailable'));
    await expect(readSmtpConfig()).rejects.toThrow('Database unavailable');
  });
  it('rejects corrupt encrypted configuration without falling back to environment', async () => {
    mocks.query.mockResolvedValue({ rows: [{ encrypted_config: 'invalid' }] });
    await expect(readSmtpConfig()).rejects.toThrow(/mã hóa/);
  });
  it('honors disabled persisted configuration and uses an injected transaction connection', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ encrypted_config: encryptSmtpConfig({ ...config, enabled: false }) }] });
    expect(await readSmtpConfig({ query })).toMatchObject({ source: 'database', config: { enabled: false } });
    expect(mocks.pool).not.toHaveBeenCalled();
  });
  it('uses environment credentials only when no persisted configuration exists', async () => {
    expect(await readSmtpConfig()).toMatchObject({ source: 'environment', config: { enabled: true } });
  });
  it('serializes configuration changes with the final delivery check', async () => {
    await saveSmtpConfig(config, 'test-admin');
    expect(mocks.query.mock.calls[0][0]).toBe('SELECT pg_advisory_xact_lock(718326)');
    expect(mocks.query.mock.calls[1][1][0]).not.toContain(config.password);
  });
  it('sends with the already-validated transaction configuration without acquiring another connection', async () => {
    expect(await sendEmail({ to: 'recipient@example.com', subject: 'Test', text: 'Test' }, config)).toEqual({ messageId: 'test-message', skipped: false });
    expect(mocks.pool).not.toHaveBeenCalled(); expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalled();
  });
  it('closes transport after 15 seconds and leaves timeout delivery ambiguous', async () => {
    vi.useFakeTimers(); mocks.send.mockReturnValue(new Promise(() => {}));
    const pending = sendEmail({ to: 'recipient@example.com', subject: 'Test', text: 'Test' }, config);
    const rejection = expect(pending).rejects.toThrow(/đối chiếu/);
    await vi.advanceTimersByTimeAsync(15000); await rejection;
    expect(mocks.close).toHaveBeenCalled();
  });
  it('skips disabled sending without constructing a transport', async () => {
    expect(await sendEmail({ to: 'recipient@example.com', subject: 'Test', text: 'Test' }, { ...config, enabled: false })).toMatchObject({ skipped: true });
    expect(mocks.transport).not.toHaveBeenCalled();
  });
});
