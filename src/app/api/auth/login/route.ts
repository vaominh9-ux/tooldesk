import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AccessError, requireSameOrigin } from '@/lib/auth';
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const input = z.object({ email: z.email(), password: z.string().min(1).max(200) }).strict().parse(await request.json());
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return NextResponse.json({ error: 'Chưa cấu hình Supabase Auth.' }, { status: 503 });
    const result = await fetch(url + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(input), cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!result.ok) return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng; hoặc thử lại sau.' }, { status: 401 });
    const session = z.object({ access_token: z.string(), expires_in: z.number().positive() }).parse(await result.json());
    const response = NextResponse.json({ ok: true });
    response.cookies.set('tooldesk-access', session.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: session.expires_in });
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof AccessError ? error.message : 'Dữ liệu đăng nhập không hợp lệ.' }, { status: error instanceof AccessError ? error.status : 400 }); }
}
