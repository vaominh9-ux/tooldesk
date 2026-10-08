import 'server-only';
import nodemailer from 'nodemailer';
import { readSmtpConfig } from './smtp-config-store';
import type { SmtpConfig } from '@/domain/smtp-config';

export function emailConfigured(): boolean {
  return process.env.EMAIL_SEND_ENABLED === 'true' && Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.EMAIL_FROM) && [465,587].includes(Number(process.env.SMTP_PORT || 587));
}
export async function emailReady(): Promise<boolean> {
  try { const { config } = await readSmtpConfig(); return Boolean(config?.enabled && config.password); } catch { return false; }
}

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }, configuration?: SmtpConfig): Promise<{ messageId: string; skipped: boolean }> {
  const config = configuration || (await readSmtpConfig()).config;
  if (!config?.enabled || !config.password) return { messageId: '', skipped: true };
  const port = config.port;
  const transporter = nodemailer.createTransport({ host: config.host, port, secure: port === 465, requireTLS: true, auth: { user: config.user, pass: config.password }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, tls: { rejectUnauthorized: true } });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { transporter.close(); reject(new Error('SMTP hết thời gian chờ; cần đối chiếu trước khi gửi lại.')); }, 15000);
    });
    const result = await Promise.race([transporter.sendMail({ from: config.fromName + ' <' + config.fromEmail + '>', to: input.to, subject: input.subject, text: input.text, html: input.html }), timeout]);
    if (!result.accepted?.includes(input.to) || result.rejected?.length) throw Object.assign(new Error('SMTP không chấp nhận địa chỉ người nhận.'), { responseCode: 550 });
    return { messageId: result.messageId, skipped: false };
  } finally { clearTimeout(timer); transporter.close(); }
}
