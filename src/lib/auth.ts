import 'server-only';
import { cookies } from 'next/headers';
import { getDbPool } from './db';

interface CachedUser {
  id: string;
  email: string;
  role: 'admin' | 'staff' | 'viewer';
  expiresAt: number;
}
const userCache = new Map<string, CachedUser>();

export class AccessError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function requireUser(): Promise<{ id: string; email: string; role: 'admin' | 'staff' | 'viewer' }> {
  const cookieStore = cookies();
  const token = cookieStore.get('tooldesk-access')?.value;
  const refreshToken = cookieStore.get('tooldesk-refresh')?.value;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new AccessError(503, 'Chưa cấu hình Supabase Auth.');
  if (!token && !refreshToken) throw new AccessError(401, 'Vui lòng đăng nhập.');

  let currentToken = token;

  // Fast In-Memory Cache Check (<1ms)
  if (currentToken) {
    const cached = userCache.get(currentToken);
    if (cached && cached.expiresAt > Date.now()) {
      return { id: cached.id, email: cached.email, role: cached.role };
    }
  }

  let userResponse: Response | null = null;

  if (currentToken) {
    userResponse = await fetch(url + '/auth/v1/user', {
      headers: { apikey: key, Authorization: 'Bearer ' + currentToken },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
  }

  if ((!userResponse || !userResponse.ok) && refreshToken) {
    const refreshRes = await fetch(url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
    if (refreshRes.ok) {
      const refreshed: unknown = await refreshRes.json();
      if (refreshed && typeof refreshed === 'object' && 'access_token' in refreshed && typeof refreshed.access_token === 'string') {
        currentToken = refreshed.access_token;
        userResponse = await fetch(url + '/auth/v1/user', {
          headers: { apikey: key, Authorization: 'Bearer ' + currentToken },
          cache: 'no-store',
          signal: AbortSignal.timeout(10000)
        });
        try {
          cookieStore.set('tooldesk-access', currentToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 3600
          });
        } catch {}
      }
    }
  }

  if (!userResponse || !userResponse.ok) throw new AccessError(401, 'Phiên đăng nhập đã hết hạn.');
  const user: unknown = await userResponse.json();
  if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string' || !('email' in user) || typeof user.email !== 'string') throw new AccessError(401, 'Phiên không hợp lệ.');
  const member = await getDbPool().query<{ role: 'admin' | 'staff' | 'viewer' }>('SELECT role FROM app_users WHERE user_id=$1 AND active=true', [user.id]);
  if (!member.rows[0]) throw new AccessError(403, 'Tài khoản chưa được cấp quyền Tooldesk.');

  const role = member.rows[0].role;
  if (currentToken) {
    userCache.set(currentToken, {
      id: user.id,
      email: user.email,
      role,
      expiresAt: Date.now() + 60_000 // Cache for 60 seconds
    });
    if (userCache.size > 200) {
      const now = Date.now();
      for (const [k, v] of userCache.entries()) {
        if (v.expiresAt <= now) userCache.delete(k);
      }
    }
  }

  return { id: user.id, email: user.email, role };
}
export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const allowed = process.env.APP_URL;
  if (!allowed || origin !== new URL(allowed).origin) throw new AccessError(403, 'Nguồn yêu cầu không hợp lệ.');
}
