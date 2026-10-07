import 'server-only';
import { cookies } from 'next/headers';
import { getDbPool } from './db';

export class AccessError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function requireUser(): Promise<{ id: string; email: string; role: 'admin' | 'staff' | 'viewer' }> {
  const token = cookies().get('tooldesk-access')?.value;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  if (!token || !url || !key) throw new AccessError(401, 'Vui lòng đăng nhập.');
  const response = await fetch(url + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + token }, cache: 'no-store' });
  if (!response.ok) throw new AccessError(401, 'Phiên đăng nhập đã hết hạn.');
  const user: unknown = await response.json();
  if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string' || !('email' in user) || typeof user.email !== 'string') throw new AccessError(401, 'Phiên không hợp lệ.');
  const member = await getDbPool().query<{ role: 'admin' | 'staff' | 'viewer' }>('SELECT role FROM app_users WHERE user_id=$1 AND active=true', [user.id]);
  if (!member.rows[0]) throw new AccessError(403, 'Tài khoản chưa được cấp quyền Tooldesk.');
  return { id: user.id, email: user.email, role: member.rows[0].role };
}
export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const allowed = process.env.APP_URL;
  if (!allowed || origin !== new URL(allowed).origin) throw new AccessError(403, 'Nguồn yêu cầu không hợp lệ.');
}
