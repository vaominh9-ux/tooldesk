import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AccessError, requireSameOrigin, requireUser } from '@/lib/auth';
import { readSmtpConfig, saveSmtpConfig } from '@/lib/smtp-config-store';
import { publicSmtpConfig, smtpConfigSchema, smtpUpdateSchema } from '@/domain/smtp-config';
export const dynamic = 'force-dynamic';
export async function GET() {
  const isDbConfigured = process.env.APP_DATA_SOURCE === 'supabase' || Boolean(process.env.DATABASE_URL);
  if (!isDbConfigured) return NextResponse.json({ ...publicSmtpConfig(null, 'empty'), canEdit: false, demo: true, storageReady: false });
  try {
    let userRole: 'admin' | 'staff' | 'viewer' | null = null;
    try {
      const user = await requireUser();
      userRole = user.role;
    } catch {}

    const canEdit = userRole === 'admin';
    const { config, source } = await readSmtpConfig();
    return NextResponse.json(
      {
        ...publicSmtpConfig(config, source),
        canEdit,
        demo: false,
        storageReady: /^[a-fA-F0-9]{64}$/.test(process.env.SMTP_CONFIG_ENCRYPTION_KEY || '')
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Chưa đọc được SMTP. Kiểm tra migration SMTP và khóa mã hóa phía server.' }, { status: 503 });
  }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const isDbConfigured = process.env.APP_DATA_SOURCE === 'supabase' || Boolean(process.env.DATABASE_URL);
    if (!isDbConfigured) return NextResponse.json({ error: 'Bản demo không lưu cấu hình SMTP thật.' }, { status: 409 });
    const user = await requireUser();
    if (user.role !== 'admin') throw new AccessError(403, 'Chỉ quản trị viên được thay đổi SMTP.');
    const input = smtpUpdateSchema.parse(await request.json());
    const previous = await readSmtpConfig();
    const config = smtpConfigSchema.parse({ ...input, password: input.password || previous.config?.password || '' });
    await saveSmtpConfig(config, user.id);
    return NextResponse.json({ ...publicSmtpConfig(config, 'database'), canEdit: true, demo: false, storageReady: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues.map(issue => issue.message).join('; ') }, { status: 400 });
    return NextResponse.json({ error: 'Không lưu được SMTP. Kiểm tra migration và SMTP_CONFIG_ENCRYPTION_KEY phía server.' }, { status: 503 });
  }
}
