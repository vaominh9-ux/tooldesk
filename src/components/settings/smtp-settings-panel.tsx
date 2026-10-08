'use client';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { AppIcon } from '@/components/shared/app-icon';
import { Feedback } from '@/components/shared/feedback';

const viewSchema = z.object({ host: z.string(), port: z.union([z.literal(465), z.literal(587)]), user: z.string(), fromEmail: z.string(), fromName: z.string(), enabled: z.boolean(), sendHour: z.number(), hasPassword: z.boolean(), source: z.string(), canEdit: z.boolean(), demo: z.boolean(), storageReady: z.boolean() });
type View = z.infer<typeof viewSchema>;
const empty: View = { host: '', port: 587, user: '', fromEmail: '', fromName: 'Tooldesk', enabled: false, sendHour: 9, hasPassword: false, source: 'empty', canEdit: false, demo: false, storageReady: false };
async function readResponse(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : 'Không xử lý được SMTP.');
  return body;
}
export function SmtpSettingsPanel() {
  const [view, setView] = useState(empty), [saved, setSaved] = useState<View | null>(null);
  const [tone, setTone] = useState<'info' | 'success' | 'error'>('info');
  const [password, setPassword] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { let mounted = true; fetch('/api/settings/email', { cache: 'no-store' }).then(readResponse).then(value => { if (mounted) { const parsed = viewSchema.parse(value); setView(parsed); setSaved(parsed); } }).catch(error => { if (mounted) { setTone('error'); setMessage(error instanceof Error ? error.message : 'Không tải được SMTP.'); } }); return () => { mounted = false; }; }, []);
  const change = <K extends keyof View>(key: K, value: View[K]) => setView(previous => ({ ...previous, [key]: value }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const { host, port, user, fromEmail, fromName, enabled, sendHour } = view;
      const response = await fetch('/api/settings/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, port, user, fromEmail, fromName, enabled, sendHour, password: password || undefined }) });
      const parsed = viewSchema.parse(await readResponse(response)); setSaved(parsed); setView(parsed); setPassword(''); setTone('success'); setMessage('Đã lưu cấu hình SMTP mã hóa phía server.');
    } catch (error) { setTone('error'); setMessage(error instanceof Error ? error.message : 'Không lưu được SMTP.'); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true); setTone('info'); setMessage('Đang kiểm tra TLS và tài khoản SMTP…');
    try { const result = z.object({ message: z.string() }).parse(await readResponse(await fetch('/api/settings/email/verify', { method: 'POST' }))); setTone('success'); setMessage(result.message); }
    catch (error) { setTone('error'); setMessage(error instanceof Error ? error.message : 'Kiểm tra SMTP thất bại.'); } finally { setBusy(false); }
  };
  return <article id="smtp-settings" className="panel smtp-settings-panel">
    <div className="section-heading"><div><h2>Cấu hình email SMTP</h2><p>Thiết lập máy chủ gửi email và thời gian nhắc gia hạn.</p></div><span className={saved?.enabled ? 'badge green' : 'badge neutral'}>{saved?.enabled ? 'Đang bật gửi' : 'Đang tắt gửi'}</span></div>
    <form className="settings-form" onSubmit={save}>
      {saved?.demo && <p className="hint-banner neutral">Bản demo: bạn có thể xem form. Lưu và kiểm tra SMTP cần đăng nhập quản trị ở chế độ Supabase.</p>}
      {saved && !saved.demo && !saved.storageReady && <p className="hint-banner neutral">Server cần khóa mã hóa SMTP trước khi lưu. Liên hệ quản trị máy chủ.</p>}
      <fieldset disabled={busy || !saved || (!saved.demo && !saved.canEdit)} className="smtp-fields">
        <div className="form-grid">
          <label className="field"><span>Máy chủ SMTP</span><input required value={view.host} onChange={event => change('host', event.target.value)} placeholder="smtp.gmail.com" maxLength={253} /></label>
          <label className="field"><span>Cổng và bảo mật</span><select value={view.port} onChange={event => change('port', Number(event.target.value) as 465 | 587)}><option value={587}>587 · STARTTLS</option><option value={465}>465 · TLS</option></select></label>
          <label className="field"><span>Tài khoản SMTP</span><input required value={view.user} onChange={event => change('user', event.target.value)} placeholder="email hoặc username" maxLength={200} autoComplete="off" /></label>
          <label className="field"><span>Mật khẩu / App password</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder={saved?.hasPassword ? 'Để trống để giữ mật khẩu đã lưu' : 'Nhập mật khẩu ứng dụng'} autoComplete="new-password" maxLength={500} required={!saved?.hasPassword} /><small>Mật khẩu không được trả lại về trình duyệt sau khi lưu.</small></label>
          <label className="field"><span>Email người gửi</span><input type="email" required value={view.fromEmail} onChange={event => change('fromEmail', event.target.value)} placeholder="no-reply@example.com" /></label>
          <label className="field"><span>Tên người gửi</span><input required value={view.fromName} onChange={event => change('fromName', event.target.value)} maxLength={80} /></label>
          <label className="field"><span>Giờ bắt đầu nhắc (giờ Việt Nam)</span><select value={view.sendHour} onChange={event => change('sendHour', Number(event.target.value))}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select><small>Scheduler phải được cài trên máy chủ để chạy tự động.</small></label>
        </div>
        <label className="confirm-check"><input type="checkbox" checked={view.enabled} onChange={event => change('enabled', event.target.checked)} /><span>Bật gửi email nhắc hạn. Các lần chạy lịch tiếp theo có thể gửi cho khách đủ điều kiện.</span></label>
      </fieldset>
      <div className="settings-actions"><button type="submit" className="button primary" disabled={busy || !saved?.canEdit || !saved.storageReady}><AppIcon name="check" />Lưu cấu hình SMTP</button><button type="button" className="button" disabled={busy || !saved?.canEdit || !saved.hasPassword} onClick={() => void verify()}><AppIcon name="shield" />Kiểm tra kết nối đã lưu</button></div>
      <p className="dialog-note">Kiểm tra kết nối chỉ xác thực SMTP, không gửi email. {busy ? 'Đang xử lý…' : ''}</p>
      {message && <Feedback tone={tone}>{message}</Feedback>}
    </form>
  </article>;
}
