import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { getDbPool } from './db';
import { smtpConfigSchema, type SmtpConfig } from '@/domain/smtp-config';

function encryptionKey(): Buffer {
  const value = process.env.SMTP_CONFIG_ENCRYPTION_KEY || '';
  if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new Error('Server chưa có SMTP_CONFIG_ENCRYPTION_KEY (64 ký tự hex).');
  return Buffer.from(value, 'hex');
}
export function encryptSmtpConfig(config: SmtpConfig): string {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from('tooldesk:smtp:v1'));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(smtpConfigSchema.parse(config)), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
}
export function decryptSmtpConfig(value: string): SmtpConfig {
  const [version, iv, tag, encrypted, extra] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !encrypted || extra) throw new Error('Cấu hình SMTP mã hóa không hợp lệ.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from('tooldesk:smtp:v1')); decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return smtpConfigSchema.parse(JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8')));
}
function environmentConfig(): SmtpConfig | null {
  const rawFrom = process.env.EMAIL_FROM || '';
  const match = rawFrom.match(/^(.*?)\s*<([^>]+)>$/);
  const parsed = smtpConfigSchema.safeParse({ host: process.env.SMTP_HOST || '', port: Number(process.env.SMTP_PORT || 587), user: process.env.SMTP_USER || '', password: process.env.SMTP_PASSWORD || '', fromEmail: match?.[2] || rawFrom, fromName: match?.[1]?.trim().replace(/^"|"$/g, '') || 'Tooldesk', enabled: process.env.EMAIL_SEND_ENABLED === 'true', sendHour: Number(process.env.REMINDER_SEND_HOUR || 9) });
  return parsed.success ? parsed.data : null;
}
export async function readSmtpConfig(): Promise<{ config: SmtpConfig | null; source: 'database' | 'environment' | 'empty' }> {
  if (process.env.APP_DATA_SOURCE === 'supabase' || process.env.DATABASE_URL) {
    try {
      const result = await getDbPool().query<{ encrypted_config: string }>("SELECT encrypted_config FROM smtp_configuration WHERE id='default'");
      if (result.rows[0]) return { config: decryptSmtpConfig(result.rows[0].encrypted_config), source: 'database' };
    } catch {}
  }
  const config = environmentConfig();
  return { config, source: config ? 'environment' : 'empty' };
}
export async function saveSmtpConfig(config: SmtpConfig, actorId: string): Promise<void> {
  const encrypted = encryptSmtpConfig(config);
  await getDbPool().query("INSERT INTO smtp_configuration(id,encrypted_config,updated_by,updated_at) VALUES ('default',$1,$2,NOW()) ON CONFLICT(id) DO UPDATE SET encrypted_config=EXCLUDED.encrypted_config,updated_by=EXCLUDED.updated_by,updated_at=NOW()", [encrypted, actorId]);
}
