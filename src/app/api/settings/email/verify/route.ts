import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { AccessError, requireSameOrigin, requireUser } from '@/lib/auth';
import { readSmtpConfig } from '@/lib/smtp-config-store';
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const isDbConfigured = process.env.APP_DATA_SOURCE === 'supabase' || Boolean(process.env.DATABASE_URL);
    if (!isDbConfigured) return NextResponse.json({ error: 'Bản demo không kết nối SMTP thật.' }, { status: 409 });
    const user = await requireUser();
    if (user.role !== 'admin') throw new AccessError(403, 'Chỉ quản trị viên được kiểm tra SMTP.');
    const { config } = await readSmtpConfig();
    if (!config) return NextResponse.json({ error: 'Lưu cấu hình SMTP trước khi kiểm tra.' }, { status: 409 });
    const transporter = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465, requireTLS: true, auth: { user: config.user, pass: config.password }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, tls: { rejectUnauthorized: true } });
    try { await transporter.verify(); } finally { transporter.close(); }
    return NextResponse.json({ ok: true, message: 'Kết nối TLS và xác thực SMTP thành công. Chưa gửi email nào.' });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Kiểm tra SMTP thất bại. Kiểm tra host, cổng, TLS và tài khoản/app password.' }, { status: 502 });
  }
}
