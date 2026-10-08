'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { reminderHealth, reminderRunSchema } from '@/domain/reminder-monitor';
import { formatAppointment } from '@/domain/care-scheduling';
import { EmptyState, Feedback } from '@/components/shared/feedback';
import { AppIcon } from '@/components/shared/app-icon';
const statusSchema = z.object({ counts: z.array(z.object({ status: z.string(), count: z.number().int().nonnegative() })), jobs: z.array(z.object({ id: z.string(), subscription_id: z.string(), recipient: z.string().nullable(), status: z.string(), attempts: z.number(), last_error: z.string().nullable(), sent_at: z.string().nullable(), created_at: z.string() })), runs: z.array(reminderRunSchema), emailEnabled: z.boolean(), sendHour: z.number().int().min(0).max(23), demo: z.boolean() });
const labels: Record<string, string> = { pending: 'Chờ gửi', sending: 'Đang gửi', sent: 'SMTP đã nhận', retry: 'Chờ thử lại', failed: 'Thất bại', cancelled: 'Đã bỏ qua', unknown: 'Cần đối chiếu' };
const runLabels = { running: 'Đang chạy', completed: 'Hoàn tất', attention: 'Cần kiểm tra', failed: 'Thất bại', waiting: 'Chờ giờ gửi' };
export function ReminderStatusPanel() {
  const [state, setState] = useState<z.infer<typeof statusSchema> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/reminders/status', { cache: 'no-store', signal: request.signal });
      if (!response.ok) throw new Error('Không tải được trạng thái nhắc hạn. Vui lòng thử lại.');
      const parsed = statusSchema.parse(await response.json());
      if (!request.signal.aborted) setState(parsed);
    } catch (error) { if (!request.signal.aborted) setError(error instanceof Error ? error.message : 'Lỗi tải trạng thái.'); }
    finally { if (!request.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); controller.current?.abort(); };
  }, [load]);
  const health = state ? reminderHealth(state.emailEnabled, state.runs[0] || null, new Date().toISOString()) : null;
  return <article className="panel reminder-panel" aria-busy={loading}>
    <div className="section-heading"><div><h2>Theo dõi nhắc gia hạn</h2><p>Tự cập nhật mỗi 30 giây. SMTP đã nhận chưa xác nhận email vào hộp thư.</p></div><button type="button" className="button" disabled={loading} onClick={() => void load()}><AppIcon name="refresh" size={16} />{loading ? 'Đang tải…' : 'Làm mới'}</button></div>
    <div className="reminder-panel-body">
      {error && <Feedback tone="error">{error}{state && ' Dữ liệu bên dưới là lần tải thành công trước đó.'}</Feedback>}
      {!state && loading && <Feedback>Đang tải trạng thái và lịch sử chạy…</Feedback>}
      {state && <>
        {state.demo ? <Feedback>Bản demo: gửi email đang tắt. Lịch sử bên dưới chỉ xuất hiện khi tác vụ chạy trên máy chủ.</Feedback> : health && <Feedback tone={health.tone}><strong>{health.label}</strong><p>Giờ bắt đầu gửi: {String(state.sendHour).padStart(2, '0')}:00 · Việt Nam. Cấu hình SMTP hoặc khóa lịch chưa chứng minh tác vụ đang chạy.</p></Feedback>}
        <h3>Lần chạy gần đây</h3>
        {state.runs.length ? <div className="reminder-run-list">{state.runs.map(run => <div key={run.id} className="reminder-run"><div><strong>{runLabels[run.status]}</strong><time dateTime={run.started_at}>{formatAppointment(run.started_at)}</time></div><p>SMTP nhận: {run.sent_count} · Lỗi: {run.failed_count} · Bỏ qua: {run.cancelled_count} · Đối chiếu: {run.unknown_count}</p>{run.error && <p className="negative">{run.error}</p>}</div>)}</div> : <p className="dialog-note">Chưa ghi nhận lần chạy. Cần cài lịch máy chủ trước khi bật gửi thật.</p>}
        <h3>Hàng đợi email</h3>
        <div className="reminder-counts">{state.counts.map(item => <span key={item.status} className="badge neutral">{labels[item.status] || item.status}: {item.count}</span>)}</div>
        {state.jobs.length ? <div className="recipient-list">{state.jobs.map(job => <div key={job.id} className="detail-list-row"><div><strong>{job.subscription_id}</strong><p>{job.recipient || 'Chưa gửi'} · {labels[job.status] || job.status} · {job.attempts} lần thử</p>{job.last_error && <small className="negative">{job.last_error}</small>}</div><time dateTime={job.created_at}>{formatAppointment(job.created_at)}</time></div>)}</div> : <EmptyState title="Chưa có email trong hàng đợi" description="Email đủ điều kiện được thêm khi tác vụ nhắc hạn chạy. Trạng thái cần đối chiếu không được tự gửi lại." />}
      </>}
    </div>
  </article>;
}
