import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), command: vi.fn(), smtp: vi.fn(), email: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../src/lib/auth', () => ({
  AccessError: class extends Error { constructor(public status: number, message: string) { super(message); } },
  requireUser: mocks.user,
  requireSameOrigin: vi.fn()
}));
vi.mock('../src/lib/data-repository', () => ({ runCommand: mocks.command }));
vi.mock('../src/lib/smtp-config-store', () => ({ readSmtpConfig: mocks.smtp, saveSmtpConfig: vi.fn() }));
vi.mock('../src/lib/email', () => ({ emailReady: mocks.email }));
import { AccessError } from '../src/lib/auth';
import { GET as readAgentSettings } from '../src/app/api/settings/agent/route';
import { GET as readEmailSettings } from '../src/app/api/settings/email/route';
import { GET as readHealth } from '../src/app/api/health/route';
import { POST as postCommand } from '../src/app/api/commands/route';

beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('APP_DATA_SOURCE', 'supabase'); vi.stubEnv('TOOLDESK_API_KEY', 'isolated-admin-test-key'); });
afterEach(() => vi.unstubAllEnvs());

describe('Configuration access and demo isolation', () => {
  it('allows staff to stop tracking with server validation, while viewers cannot write', async () => {
    const command = { type: 'stop_subscription_tracking', input: { subscriptionId: 'sub', expectedExpiresAt: '2026-10-05', reason: 'Khách không gia hạn' } };
    const request = () => new Request('http://localhost:3000/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operationId: '00000000-0000-4000-8000-000000000078', command }) });
    mocks.user.mockResolvedValue({ id: 'viewer', email: 'viewer@example.com', role: 'viewer' });
    expect((await postCommand(request())).status).toBe(403);
    expect(mocks.command).not.toHaveBeenCalled();
    mocks.user.mockResolvedValue({ id: 'staff', email: 'staff@example.com', role: 'staff' });
    mocks.command.mockResolvedValue({ data: {}, resultId: 'sub' });
    expect((await postCommand(request())).status).toBe(200);
    expect(mocks.command).toHaveBeenCalledWith(command, '00000000-0000-4000-8000-000000000078', expect.objectContaining({ role: 'staff' }));
  });
  it('does not read server email settings or return a key in demo mode', async () => {
    vi.stubEnv('APP_DATA_SOURCE', 'mock');
    expect(await (await readAgentSettings()).json()).toEqual({ apiKey: '' });
    expect((await (await readEmailSettings()).json()).demo).toBe(true);
    expect((await (await readHealth()).json()).emailConfigured).toBe(false);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.smtp).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
  });

  it('requires login before returning SMTP configuration', async () => {
    mocks.user.mockRejectedValue(new AccessError(401, 'Cần đăng nhập.'));
    expect((await readEmailSettings()).status).toBe(401);
    expect(mocks.smtp).not.toHaveBeenCalled();
  });

  it('returns the configured API key only to an admin and disables caching', async () => {
    mocks.user.mockResolvedValue({ role: 'staff' });
    expect((await readAgentSettings()).status).toBe(403);
    mocks.user.mockResolvedValue({ role: 'admin' });
    const response = await readAgentSettings();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ apiKey: 'isolated-admin-test-key' });
  });

  it.each([
    { type: 'update_product', input: { productId: 'p-1', name: 'Tên mới' } },
    { type: 'delete_product', input: { productId: 'p-1' } },
    { type: 'delete_plan', input: { planId: 'pl-1' } }
  ])('keeps catalog administration restricted: $type', async command => {
    mocks.user.mockResolvedValue({ id: 'staff', email: 'staff@example.com', role: 'staff' });
    const response = await postCommand(new Request('http://localhost:3000/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operationId: '00000000-0000-4000-8000-000000000077', command }) }));
    expect(response.status).toBe(403);
    expect(mocks.command).not.toHaveBeenCalled();
  });
});
