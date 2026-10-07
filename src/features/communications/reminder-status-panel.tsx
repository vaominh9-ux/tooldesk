'use client';
import { useEffect, useState } from 'react';
import { z } from 'zod';
const statusSchema = z.object({ counts: z.array(z.object({ status: z.string(), count: z.number() })), jobs: z.array(z.object({ id: z.string(), subscription_id: z.string(), recipient: z.string().nullable(), status: z.string(), attempts: z.number(), last_error: z.string().nullable(), sent_at: z.string().nullable(), created_at: z.string() })) });
const labels: Record<string, string> = { pending: 'Chờ gửi', sending: 'Đang gửi', sent: 'SMTP đã nhận', retry: 'Chờ thử lại', failed: 'Thất bại', cancelled: 'Đã bỏ qua', unknown: 'Cần đối chiếu' };
export function ReminderStatusPanel() {
  const [state, setState] = useState<z.infer<typeof statusSchema> | null>(null);
  const [error, setError] = useState('');
  const load = async () => { setError(''); try { const response = await fetch('/api/reminders/status', { cache: 'no-store' }); if (!response.ok) throw new Error('Không tải được lịch sử nhắc.'); setState(statusSchema.parse(await response.json())); } catch (error) { setError(error instanceof Error ? error.message : 'Lỗi tải lịch sử.'); } };
  useEffect(() => { void load(); }, []);
  return <article className="panel" style={{ marginTop: 22 }}><div className="section-heading"><div><h2>Nhật ký email nhắc hạn</h2><p>SMTP đã nhận không đồng nghĩa email đã vào hộp thư. Trạng thái cần đối chiếu không được tự gửi lại.</p></div><button className="button" onClick={() => void load()}>Làm mới</button></div>{error && <p className="dialog-error" role="alert">{error}</p>}<div className="dialog-content">{state?.counts.map(item => <span key={item.status} className="badge neutral" style={{ marginRight: 8, marginBottom: 8 }}>{labels[item.status] || item.status}: {item.count}</span>)}{state?.jobs.length ? <div className="recipient-list">{state.jobs.map(job => <div key={job.id} className="detail-list-row"><div><strong>{job.subscription_id}</strong><p>{job.recipient || 'Chưa gửi'} · {labels[job.status] || job.status} · {job.attempts} lần thử</p>{job.last_error && <small className="negative">{job.last_error}</small>}</div><small>{new Date(job.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small></div>)}</div> : <p>Chưa có email nhắc trong hàng đợi.</p>}</div></article>;
}
