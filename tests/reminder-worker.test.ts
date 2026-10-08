import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialData } from '../src/mocks/fixtures';
import { dataSchema } from '../src/domain/data-schema';
const mocks = vi.hoisted(() => ({ query: vi.fn(), load: vi.fn(), send: vi.fn(), configured: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../src/lib/db', () => ({ getDbPool: () => ({ query: mocks.query }), transaction: (callback: (client: { query: typeof mocks.query }) => Promise<unknown>) => callback({ query: mocks.query }) }));
vi.mock('../src/lib/data-repository', () => ({ loadData: mocks.load }));
vi.mock('../src/lib/email', () => ({ emailConfigured: mocks.configured, sendEmail: mocks.send }));
vi.mock('../src/lib/smtp-config-store', () => ({ readSmtpConfig: async () => ({ config: { enabled: mocks.configured(), sendHour: 9 }, source: 'environment' }) }));
import { runReminderWorker } from '../src/features/communications/reminder-worker';
import { reminderCandidates } from '../src/domain/reminders';

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-07T03:00:00Z'));
  vi.clearAllMocks();
  const data = dataSchema.parse(createInitialData());
  const candidate = reminderCandidates(data, '2026-10-07')[0];
  let claimed = false;
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.startsWith('SELECT id,cycle_key')) { if (claimed) return { rows: [] }; claimed = true; return { rows: [{ id: 'job', cycle_key: candidate.cycleKey }] }; }
    if (sql.startsWith('SELECT status')) return { rows: [{ status: 'sending' }] };
    return { rows: [], rowCount: 1 };
  });
  mocks.load.mockResolvedValue(data); mocks.configured.mockReturnValue(true);
  mocks.send.mockResolvedValue({ skipped: false, messageId: 'smtp-test' });
});
afterEach(() => { vi.useRealTimers(); });
describe('Reminder worker safety', () => {
  it('records successful scheduler runs and explicit waiting before the send hour', async () => {
    vi.setSystemTime(new Date('2026-10-07T00:00:00Z'));
    expect(await runReminderWorker()).toMatchObject({ waitingForSendHour: true, sent: 0 });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.query.mock.calls.some(call => String(call[0]).startsWith('INSERT INTO reminder_runs'))).toBe(true);
    expect(mocks.query.mock.calls.some(call => Array.isArray(call[1]) && call[1][1] === 'waiting')).toBe(true);
  });
  it('records worker failure rather than reporting an empty successful run', async () => {
    mocks.load.mockRejectedValue(new Error('Database unavailable'));
    await expect(runReminderWorker()).rejects.toThrow('Database unavailable');
    expect(mocks.query.mock.calls.some(call => String(call[0]).includes("status='failed',error=$2"))).toBe(true);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('marks runs requiring reconciliation when SMTP times out', async () => {
    mocks.send.mockRejectedValue(new Error('Timeout'));
    await runReminderWorker();
    expect(mocks.query.mock.calls.some(call => Array.isArray(call[1]) && call[1][1] === 'attention' && call[1][5] === 1)).toBe(true);
  });
  it('does not touch database while email sending is disabled', async () => {
    mocks.configured.mockReturnValue(false);
    expect(await runReminderWorker()).toMatchObject({ enabled: false, sent: 0 });
    expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it('sends only one claimed eligible job and records SMTP acceptance', async () => {
    expect(await runReminderWorker()).toMatchObject({ sent: 1 });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.query.mock.calls.some(call => String(call[0]).includes("status='sent'"))).toBe(true);
  });
  it('rechecks consent before SMTP handoff', async () => {
    const data = dataSchema.parse(createInitialData()); data.customers.forEach(customer => { customer.emailConsent = 'opted_out'; });
    mocks.load.mockResolvedValueOnce(dataSchema.parse(createInitialData())).mockResolvedValue(data);
    expect(await runReminderWorker()).toMatchObject({ cancelled: 1, sent: 0 });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('does not automatically retry an ambiguous timeout', async () => {
    mocks.send.mockRejectedValue(Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT' }));
    expect(await runReminderWorker()).toMatchObject({ unknown: 1 });
    expect(mocks.query.mock.calls.some(call => Array.isArray(call[1]) && call[1][1] === 'unknown')).toBe(true);
  });
  it('retries explicit temporary SMTP rejection', async () => {
    mocks.send.mockRejectedValue(Object.assign(new Error('Temporarily rejected'), { responseCode: 450 }));
    expect(await runReminderWorker()).toMatchObject({ failed: 1 });
    expect(mocks.query.mock.calls.some(call => Array.isArray(call[1]) && call[1][1] === 'retry')).toBe(true);
  });
});
