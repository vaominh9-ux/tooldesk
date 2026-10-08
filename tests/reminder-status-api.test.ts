import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), query: vi.fn(), smtp: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../src/lib/auth', () => ({ AccessError: class extends Error { constructor(public status: number, message: string) { super(message); } }, requireUser: mocks.user }));
vi.mock('../src/lib/db', () => ({ getDbPool: () => ({ query: mocks.query }) }));
vi.mock('../src/lib/smtp-config-store', () => ({ readSmtpConfig: mocks.smtp }));
import { AccessError } from '../src/lib/auth';
import { GET } from '../src/app/api/reminders/status/route';
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('APP_DATA_SOURCE', 'supabase'); });
afterEach(() => vi.unstubAllEnvs());

describe('Reminder monitoring API', () => {
  it('keeps demo monitoring isolated from actual settings and database', async () => {
    vi.stubEnv('APP_DATA_SOURCE', 'mock');
    const response = await GET();
    expect(await response.json()).toMatchObject({ demo: true, emailEnabled: false, runs: [], jobs: [] });
    expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.smtp).not.toHaveBeenCalled();
  });
  it('requires authentication before returning recipients or scheduler history', async () => {
    mocks.user.mockRejectedValue(new AccessError(401, 'Cần đăng nhập.'));
    expect((await GET()).status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.smtp).not.toHaveBeenCalled();
  });
  it('returns real run evidence without exposing SMTP credentials', async () => {
    mocks.user.mockResolvedValue({ role: 'staff' });
    mocks.query.mockResolvedValue({ rows: [] });
    mocks.smtp.mockResolvedValue({ config: { enabled: true, sendHour: 10, password: 'never-return-this' } });
    const response = await GET(), value = await response.json();
    expect(value).toMatchObject({ emailEnabled: true, runs: [], sendHour: 10, demo: false });
    expect(JSON.stringify(value)).not.toContain('never-return-this');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(mocks.query.mock.calls.some(call => call[0].includes('FROM reminder_runs'))).toBe(true);
  });
  it('reports database failure rather than an empty queue', async () => {
    mocks.user.mockResolvedValue({ role: 'staff' });
    mocks.query.mockRejectedValue(new Error('Connection denied'));
    mocks.smtp.mockResolvedValue({ config: null });
    const response = await GET();
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: 'Không tải được lịch sử nhắc.' });
  });
});
