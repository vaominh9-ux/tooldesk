import 'server-only';
import { NextResponse } from 'next/server';
import { requireUser, AccessError } from '@/lib/auth';
import { loadData } from '@/lib/data-repository';
import { transaction } from '@/lib/db';
export async function getDataResponse() {
  if (process.env.APP_DATA_SOURCE !== 'supabase') return NextResponse.json({ error: 'Đang ở chế độ dữ liệu mẫu.' }, { status: 409 });
  try {
    const user = await requireUser();
    const data = await transaction(async client => { await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'); return loadData(client); });
    return NextResponse.json({ success: true, source: 'supabase', role: user.role, data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Load data failed:', error);
    return NextResponse.json({ error: 'Không tải được dữ liệu. Kiểm tra schema và cấu hình server.' }, { status: 503 });
  }
}
