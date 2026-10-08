import { z } from 'zod';
import type { TooldeskData } from '@/mocks/fixtures';
import { formatDateLabel } from './dates';
import { subStatus } from './subscriptions';
import { appointmentState, careChannelLabels, formatAppointment } from './care-scheduling';

export const zaloPreferencesSchema = z.object({
  enabled: z.boolean(), expiring: z.boolean(), expired: z.boolean(), care: z.boolean(),
  sendHour: z.number().int().min(0).max(23),
});
export type ZaloPreferences = z.infer<typeof zaloPreferencesSchema>;
export const zaloDefaultPreferences: ZaloPreferences = { enabled: false, expiring: true, expired: true, care: true, sendHour: 9 };
export const zaloStatusSchema = z.object({
  settings: zaloPreferencesSchema.extend({ chatId: z.string().nullable(), recipientName: z.string().nullable(), pairingPending: z.boolean() }),
  tokenConfigured: z.boolean(), webhookSecretConfigured: z.boolean(), cronSecretConfigured: z.boolean(), demo: z.boolean(),
  lastRun: z.object({ startedAt: z.iso.datetime(), finishedAt: z.iso.datetime().nullable(), status: z.enum(['running','completed','attention','failed']), sent: z.number().int().min(0), failed: z.number().int().min(0), unknown: z.number().int().min(0) }).nullable(),
  jobs: z.object({ pending: z.number().int().min(0), failed: z.number().int().min(0), unknown: z.number().int().min(0) }),
});
export type ZaloStatus = z.infer<typeof zaloStatusSchema>;

export interface ZaloNotification { eventKey: string; text: string }
export function zaloNotificationCandidates(data: TooldeskData, today: string, now: string, appUrl: string, preferences: ZaloPreferences): ZaloNotification[] {
  if (!preferences.enabled) return [];
  const url = new URL(appUrl);
  if (url.protocol !== 'https:') throw new Error('APP_URL phải dùng HTTPS để gửi liên kết thông báo.');
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(new Date(now)));
  const items: ZaloNotification[] = [];
  if (hour >= preferences.sendHour) for (const sub of data.subscriptions) {
    const state = subStatus(sub, today, data.settings.reminderDays);
    if (!(state === 'expiring' && preferences.expiring || state === 'expired' && preferences.expired)) continue;
    const customer = data.customers.find(item => item.id === sub.customerId);
    const product = data.products.find(item => item.id === sub.productId);
    const link = new URL('/customers', url); link.searchParams.set('id', sub.customerId);
    items.push({
      eventKey: `subscription:${sub.id}:${sub.startsAt}:${sub.expiresAt}:${state}:${today}`,
      text: `TOOLDESK · ${state === 'expired' ? 'Gói đã hết hạn' : 'Gói sắp hết hạn'}\nKhách: ${customer?.name || 'Khách không còn tồn tại'}\nSản phẩm: ${product?.name || 'Sản phẩm'}\nHạn dịch vụ: ${formatDateLabel(sub.expiresAt, true)} (00:00 giờ Việt Nam)\n${link.href}`,
    });
  }
  if (preferences.care) for (const appointment of data.careAppointments) {
    if (appointmentState(appointment, now) !== 'due') continue;
    const customer = data.customers.find(item => item.id === appointment.customerId);
    const link = new URL('/customers', url); link.searchParams.set('id', appointment.customerId);
    items.push({
      eventKey: `care:${appointment.id}:${appointment.scheduledAt}`,
      text: `TOOLDESK · Đến giờ chăm sóc khách\nKhách: ${customer?.name || 'Khách không còn tồn tại'}\nViệc cần làm: ${appointment.title}\nHẹn lúc: ${formatAppointment(appointment.scheduledAt)}\nKênh: ${careChannelLabels[appointment.channel]}\n${link.href}`,
    });
  }
  return items;
}

const rawEventSchema = z.object({
  event_name: z.literal('message.text.received'),
  message: z.object({
    from: z.object({ id: z.string().min(1).max(200), display_name: z.string().max(200).optional(), is_bot: z.boolean().optional() }),
    chat: z.object({ id: z.string().min(1).max(200), chat_type: z.string().optional() }),
    text: z.string().max(2000)
  }),
});

const wrappedEventSchema = z.object({
  ok: z.literal(true),
  result: rawEventSchema
});

export function zaloPairingMessage(input: unknown) {
  const direct = rawEventSchema.safeParse(input);
  const event = direct.success ? direct.data : wrappedEventSchema.safeParse(input).data?.result;
  if (!event) return null;
  const message = event.message;
  if (message.from.is_bot === true) return null;
  if (message.chat.chat_type && message.chat.chat_type !== 'PRIVATE') return null;
  const match = message.text.trim().match(/^\/tooldesk\s+([a-f0-9]{24})$/i);
  if (!match) return null;
  return { code: match[1].toLowerCase(), chatId: message.chat.id, name: message.from.display_name || 'Người nhận Zalo' };
}

