import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), query: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: () => ({ get: mocks.get, set: mocks.set }) }));
vi.mock('@/lib/db', () => ({ getDbPool: () => ({ query: mocks.query }) }));
import { requireUser } from '@/lib/auth';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('Session refresh', () => {
  it('persists both rotated tokens so the next expired session can refresh', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://auth.example.com'); vi.stubEnv('SUPABASE_ANON_KEY', 'test-public-key');
    const tokens = new Map([['tooldesk-access', 'expired-access'], ['tooldesk-refresh', 'old-refresh']]);
    mocks.get.mockImplementation((key: string) => ({ value: tokens.get(key) }));
    mocks.set.mockImplementation((key: string, value: string) => tokens.set(key, value));
    mocks.query.mockResolvedValue({ rows: [{ role: 'admin' }] });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'test-user', email: 'test@example.com' }))));
    expect(await requireUser()).toMatchObject({ id: 'test-user', role: 'admin' });
    expect(tokens.get('tooldesk-access')).toBe('new-access');
    expect(tokens.get('tooldesk-refresh')).toBe('new-refresh');
    expect(mocks.set).toHaveBeenCalledWith('tooldesk-refresh', 'new-refresh', expect.objectContaining({ httpOnly: true, sameSite: 'lax' }));
  });
});
