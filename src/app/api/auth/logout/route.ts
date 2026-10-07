import { NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/auth';
export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch { return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 }); }
  const response = NextResponse.json({ ok: true });
  response.cookies.set('tooldesk-access', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
  return response;
}
