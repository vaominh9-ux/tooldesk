import { z } from 'zod';

export const smtpConfigSchema = z.object({
  host: z.string().trim().min(1, 'Nhập máy chủ SMTP.').max(253).regex(/^[a-zA-Z0-9.-]+$/, 'Host chỉ gồm tên miền hoặc địa chỉ IP.'),
  port: z.union([z.literal(465), z.literal(587)]),
  user: z.string().trim().min(1, 'Nhập tài khoản SMTP.').max(200),
  fromEmail: z.email('Email người gửi không hợp lệ.'),
  fromName: z.string().trim().min(1, 'Nhập tên người gửi.').max(80).refine(value => !/[\r\n]/.test(value)),
  password: z.string().min(1, 'Nhập mật khẩu SMTP.').max(500),
  enabled: z.boolean(),
  sendHour: z.number().int().min(0).max(23)
}).strict();
export const smtpUpdateSchema = smtpConfigSchema.omit({ password: true }).extend({ password: z.string().max(500).optional() }).strict();
export type SmtpConfig = z.infer<typeof smtpConfigSchema>;
export interface PublicSmtpConfig {
  host: string; port: 465 | 587; user: string; fromEmail: string; fromName: string;
  enabled: boolean; sendHour: number; hasPassword: boolean;
  source: 'database' | 'environment' | 'empty';
}
export function publicSmtpConfig(config: SmtpConfig | null, source: PublicSmtpConfig['source']): PublicSmtpConfig {
  return { host: config?.host || '', port: config?.port || 587, user: config?.user || '', fromEmail: config?.fromEmail || '', fromName: config?.fromName || 'Tooldesk', enabled: config?.enabled || false, sendHour: config?.sendHour ?? 9, hasPassword: Boolean(config?.password), source };
}
