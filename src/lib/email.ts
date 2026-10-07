import 'server-only';
import nodemailer from 'nodemailer';

export function emailConfigured(): boolean {
  return process.env.EMAIL_SEND_ENABLED === 'true' && Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.EMAIL_FROM);
}

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }): Promise<{ messageId: string; skipped: boolean }> {
  if (!emailConfigured()) return { messageId: '', skipped: true };
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE === 'true' || port === 465, requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
  const result = await transporter.sendMail({ from: process.env.EMAIL_FROM, to: input.to, subject: input.subject, text: input.text, html: input.html });
  return { messageId: result.messageId, skipped: false };
}
