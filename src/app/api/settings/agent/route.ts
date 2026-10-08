import { NextResponse } from 'next/server';
import { AccessError, requireUser } from '@/lib/auth';
import { getExpectedApiKey } from '@/lib/agent-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.APP_DATA_SOURCE !== 'supabase') {
    return NextResponse.json({ apiKey: '' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const user = await requireUser();
    if (user.role !== 'admin') throw new AccessError(403, 'Chỉ quản trị viên có thể xem khóa API.');
    return NextResponse.json({ apiKey: getExpectedApiKey() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Không tải được cấu hình API.' }, { status: 503 });
  }
}
