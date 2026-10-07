import 'server-only';
import nodemailer from 'nodemailer';
import { readSmtpConfig } from './smtp-config-store';

export function emailConfigured(): boolean {
  return process.env.EMAIL_SEND_ENABLED === 'true' && Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.EMAIL_FROM) && [465,587].includes(Number(process.env.SMTP_PORT || 587));
}
export async function emailReady(): Promise<boolean> {
  try { const { config } = await readSmtpConfig(); return Boolean(config?.enabled && config.password); } catch { return false; }
}

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }): Promise<{ messageId: string; skipped: boolean }> {
  const stored = await readSmtpConfig();
  const config = stored.config;
  if (!config?.enabled || !config.password) return { messageId: '', skipped: true };
  const port = config.port;
  const transporter = nodemailer.createTransport({ host: config.host, port, secure: port === 465, requireTLS: true, auth: { user: config.user, pass: config.password }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, tls: { rejectUnauthorized: true } });
  const result = await transporter.sendMail({ from: config.fromName + ' <' + config.fromEmail + '>', to: input.to, subject: input.subject, text: input.text, html: input.html });
  if (!result.accepted?.includes(input.to) || result.rejected?.length) throw Object.assign(new Error('SMTP không chấp nhận địa chỉ người nhận.'), { responseCode: 550 });
  return { messageId: result.messageId, skipped: false };
}
