import { z } from 'zod';

export const reminderRunSchema = z.object({
  id: z.string(), started_at: z.string(), finished_at: z.string().nullable(),
  status: z.enum(['running', 'completed', 'attention', 'failed', 'waiting']),
  sent_count: z.number().int().nonnegative(), failed_count: z.number().int().nonnegative(),
  cancelled_count: z.number().int().nonnegative(), unknown_count: z.number().int().nonnegative(),
  error: z.string().nullable()
});
export type ReminderRun = z.infer<typeof reminderRunSchema>;

export function reminderHealth(enabled: boolean, run: ReminderRun | null, now: string) {
  if (!enabled) return { tone: 'info' as const, label: 'Gửi nhắc hạn đang tắt' };
  if (!run) return { tone: 'warning' as const, label: 'Chưa ghi nhận lần chạy nào' };
  const elapsed = Date.parse(now) - Date.parse(run.started_at);
  if (!Number.isFinite(elapsed) || elapsed > 45 * 60 * 1000) return { tone: 'warning' as const, label: 'Lịch nhắc lâu chưa chạy · cần kiểm tra' };
  if (run.status === 'failed') return { tone: 'error' as const, label: 'Lần chạy gần nhất thất bại' };
  if (run.status === 'running') return elapsed > 10 * 60 * 1000
    ? { tone: 'warning' as const, label: 'Tác vụ đang chạy lâu · cần kiểm tra' }
    : { tone: 'info' as const, label: 'Tác vụ nhắc đang chạy' };
  if (run.status === 'attention') return { tone: 'warning' as const, label: 'Có email lỗi hoặc cần đối chiếu' };
  if (run.status === 'waiting') return { tone: 'info' as const, label: 'Lịch đang chạy · chờ giờ gửi' };
  return { tone: 'success' as const, label: 'Đã ghi nhận lần chạy gần đây' };
}
