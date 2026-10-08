import 'server-only';
import { NextResponse } from 'next/server';
import { requireUser, AccessError } from '@/lib/auth';
import { loadData } from '@/lib/data-repository';
export async function getDataResponse() {
  if (process.env.APP_DATA_SOURCE !== 'supabase') return NextResponse.json({ error: 'Đang ở chế độ dữ liệu mẫu.' }, { status: 409 });
  try {
    const user = await requireUser();
    const data = await loadData();
    return NextResponse.json({ success: true, source: 'supabase', role: user.role, data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Load data failed:', error);
    const detail = error instanceof Error ? error.message : 'Lỗi không xác định';
    return NextResponse.json({ error: `Không tải được dữ liệu: ${detail}` }, { status: 503 });
  }
}
