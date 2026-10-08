import { z } from 'zod';
import { parseDay } from './dates';

export const instantSchema = z.iso.datetime();
export const careChannels = ['phone', 'zalo', 'email', 'other'] as const;
export const careChannelLabels: Record<typeof careChannels[number], string> = {
  phone: 'Gọi điện', zalo: 'Zalo', email: 'Email', other: 'Khác'
};
export const careAppointmentSchema = z.object({
  id: z.string().min(1).max(100), customerId: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(120), channel: z.enum(careChannels),
  scheduledAt: instantSchema, notes: z.string().max(2000),
  status: z.enum(['scheduled', 'completed', 'cancelled']),
  createdAt: instantSchema, updatedAt: instantSchema, completedAt: instantSchema.nullable()
});
export type CareAppointment = z.infer<typeof careAppointmentSchema>;

// datetime-local represents the shop's time, independently of the browser timezone.
export function fromHoChiMinhInput(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Chọn ngày và giờ hợp lệ.');
  parseDay(value.slice(0, 10));
  const hour = Number(value.slice(11, 13)), minute = Number(value.slice(14, 16));
  if (hour > 23 || minute > 59) throw new Error('Giờ hẹn không hợp lệ.');
  return new Date(`${value}:00+07:00`).toISOString();
}
export function toHoChiMinhInput(instant: string): string {
  instantSchema.parse(instant);
  return new Date(Date.parse(instant) + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
}
export function requireFutureAppointment(instant: string, now: string): void {
  instantSchema.parse(instant); instantSchema.parse(now);
  if (Date.parse(instant) <= Date.parse(now)) throw new Error('Giờ hẹn phải ở tương lai. Vui lòng chọn lại.');
}
export function appointmentState(item: Pick<CareAppointment, 'status' | 'scheduledAt'>, now: string) {
  if (item.status !== 'scheduled') return item.status;
  return Date.parse(item.scheduledAt) <= Date.parse(now) ? 'due' : 'scheduled';
}
export function formatAppointment(instant: string): string {
  return new Date(instant).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
  });
}
