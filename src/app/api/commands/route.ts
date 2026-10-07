import { NextResponse } from 'next/server';
import { z } from 'zod';
import { commandSchema } from '@/domain/commands';
import { AccessError, requireSameOrigin, requireUser } from '@/lib/auth';
import { runCommand } from '@/lib/data-repository';
export async function POST(request: Request) {
  try {
    if (process.env.APP_DATA_SOURCE !== 'supabase') return NextResponse.json({ error: 'Chỉ dùng API này trong chế độ Supabase.' }, { status: 409 });
    requireSameOrigin(request);
    const user = await requireUser();
    if (user.role === 'viewer') throw new AccessError(403, 'Tài khoản chỉ có quyền xem.');
    const input = z.object({ operationId: z.uuid(), command: commandSchema }).strict().parse(await request.json());
    if (['update_settings','add_product','update_plan','add_plan'].includes(input.command.type) && user.role !== 'admin') throw new AccessError(403, 'Thao tác này cần quyền quản trị.');
    const result = await runCommand(input.command, input.operationId, user);
    return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues.map(issue => issue.message).join('; ') }, { status: 400 });
    console.error('Command failed:', error);
    return NextResponse.json({ error: error instanceof Error && !('code' in error) ? error.message : 'Không thể lưu giao dịch. Vui lòng kiểm tra cấu hình database.' }, { status: 400 });
  }
}
