'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { AppIcon } from '@/components/shared/app-icon';
import { Feedback } from '@/components/shared/feedback';
import { zaloDefaultPreferences, zaloStatusSchema, type ZaloPreferences, type ZaloStatus } from '@/domain/zalo-notifications';
import { formatAppointment } from '@/domain/care-scheduling';

const replySchema = zaloStatusSchema.extend({ command: z.string().optional(), expiresAt: z.iso.datetime().optional(), webhookVerified: z.boolean().optional() });
export type ZaloConnectionState = { status: ZaloStatus | null; loading: boolean; error: boolean };

export function ZaloConnectionRow({ status, loading, error }: ZaloConnectionState) {
  let label = 'Chưa xác định', tone = 'neutral';
  let description = 'Nhắc hạn và lịch chăm sóc cá nhân';
  if (error) { label = 'Chưa xác định'; tone = 'amber'; }
  else if (loading) label = 'Đang kiểm tra';
  else if (status?.demo) label = 'Demo';
  else if (status) {
    if (!status.tokenConfigured) label = 'Chưa cấu hình';
    else if (!status.settings.chatId) label = 'Chưa liên kết';
    else if (!status.settings.enabled) { label = 'Đã liên kết'; tone = 'green'; description = 'Thông báo tự động đang tắt'; }
    else if (!status.webhookSecretConfigured || !status.cronSecretConfigured) { label = 'Thiếu cấu hình'; tone = 'amber'; }
    else { label = 'Đã bật'; tone = 'green'; }
  }
  return <a className="integration-row" href="#zalo-notifications" aria-label="Cấu hình Bot Zalo">
    <span className="integration-icon"><AppIcon name="bell" size={19} /></span>
    <div><strong>Bot Zalo</strong><p>{description}</p></div>
    <span className={`badge ${tone}`}>{label}</span>
  </a>;
}

export function ZaloSettingsPanel({ onConnectionChange }: { onConnectionChange?: (state: ZaloConnectionState) => void }) {
  const [status, setStatus] = useState<ZaloStatus | null>(null);
  const [preferences, setPreferences] = useState<ZaloPreferences>(zaloDefaultPreferences);
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [pairing, setPairing] = useState<{ command: string; expiresAt: string } | null>(null);
  useEffect(() => { onConnectionChange?.({ status, loading, error: Boolean(loadError) }); }, [status, loading, loadError, onConnectionChange]);
  const dirty = useRef(false), busy = useRef(false), active = useRef(true), controller = useRef<AbortController | null>(null);
  const recipient = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    controller.current?.abort(); const next = new AbortController(); controller.current = next;
    try {
      const response = await fetch('/api/settings/zalo', { cache: 'no-store', signal: next.signal });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const parsed = z.object({ error: z.string() }).safeParse(payload);
        throw new Error(parsed.success ? parsed.data.error : 'Không tải được cấu hình Zalo.');
      }
      const result = zaloStatusSchema.parse(payload);
      if (!active.current || next.signal.aborted) return;
      setStatus(result); setLoadError('');
      if (!dirty.current) setPreferences(result.settings);
      else if (recipient.current !== result.settings.chatId) setPreferences(previous => ({ ...previous, enabled: false }));
      recipient.current = result.settings.chatId;
      if (!result.settings.pairingPending) setPairing(null);
    } catch (error) {
      if (!next.signal.aborted && active.current) setLoadError(error instanceof Error && !(error instanceof z.ZodError) ? error.message : 'Phản hồi cấu hình Zalo chưa hợp lệ.');
    } finally { if (active.current && !next.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    active.current = true; void refresh();
    const onFocus = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(onFocus, 10000);
    window.addEventListener('focus', onFocus);
    return () => { active.current = false; controller.current?.abort(); window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refresh]);
  function change<K extends keyof ZaloPreferences>(key: K, value: ZaloPreferences[K]) {
    dirty.current = true; setPreferences(previous => ({ ...previous, [key]: value })); setFeedback(null);
  }
  async function act(action: 'save' | 'pair' | 'test' | 'webhook') {
    if (busy.current) return;
    busy.current = true; setPending(true); setFeedback(null); controller.current?.abort();
    try {
      const response = await fetch('/api/settings/zalo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'save' ? { action, preferences } : { action }), signal: AbortSignal.timeout(30000) });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const parsed = z.object({ error: z.string() }).safeParse(payload);
        throw new Error(parsed.success ? parsed.data.error : 'Không thực hiện được thao tác Zalo.');
      }
      const result = replySchema.parse(payload);
      if (!active.current) return;
      setStatus(result); setLoadError('');
      recipient.current = result.settings.chatId;
      if (action === 'save') { dirty.current = false; setPreferences(result.settings); }
      if (result.command && result.expiresAt) setPairing({ command: result.command, expiresAt: result.expiresAt });
      setFeedback(action === 'webhook' && !result.webhookVerified
        ? { tone: 'warning', text: 'Đã đăng ký webhook nhưng Zalo chưa xác minh thành công. Kiểm tra endpoint trên Vercel trước khi liên kết.' }
        : { tone: 'success', text: action === 'test' ? 'Zalo đã chấp nhận tin kiểm tra. Hãy kiểm tra cuộc trò chuyện riêng với bot.' : action === 'save' ? 'Đã lưu tùy chọn thông báo Zalo.' : action === 'webhook' ? 'Webhook đã được Zalo xác minh thành công.' : 'Đã tạo mã liên kết, có hiệu lực 10 phút.' });
    } catch (error) {
      if (active.current) setFeedback({ tone: 'error', text: error instanceof Error && !(error instanceof z.ZodError) ? error.message : 'Chưa xác định kết quả thao tác. Tải lại cấu hình trước khi thử lại.' });
    } finally { busy.current = false; if (active.current) setPending(false); }
  }
  const disabled = pending || loading || !status || status.demo || Boolean(loadError);
  const run = status?.lastRun;
  const lateRun = run && Date.now() - Date.parse(run.startedAt) > 15 * 60000;
  return <section className="panel zalo-settings-panel" id="zalo-notifications">
    <div className="section-heading"><div><h2>Thông báo Zalo</h2><p>Nhắc việc vào Zalo cá nhân của bạn.</p></div><AppIcon name="bell" size={20} /></div>
    <div className="zalo-settings-body">
      {loading && <p role="status">Đang tải cấu hình Zalo…</p>}
      {loadError && <Feedback tone="error">{loadError} <button type="button" className="text-button" disabled={pending} onClick={() => void refresh()}>Tải lại</button></Feedback>}
      {status?.demo && <Feedback>Bản demo chỉ xem giao diện. Liên kết và gửi Zalo thật được tắt.</Feedback>}
      {feedback && <Feedback tone={feedback.tone}>{feedback.text}</Feedback>}
      {status && !status.demo && <>
        {!status.tokenConfigured && <Feedback tone="warning">Chưa có Bot Token phía server. Cấu hình ZALO_BOT_TOKEN trên Vercel để kết nối.</Feedback>}
        {!status.webhookSecretConfigured && <Feedback tone="warning">Chưa cấu hình khóa xác thực webhook Zalo phía server.</Feedback>}
        <div className="zalo-recipient"><AppIcon name="users" size={20} /><div><strong>{status.settings.recipientName || 'Chưa liên kết Zalo cá nhân'}</strong><p>{status.settings.chatId ? 'Tin nhắn gửi vào cuộc trò chuyện riêng đã liên kết.' : 'Đăng ký webhook, tạo mã rồi gửi mã vào cuộc trò chuyện riêng với bot.'}</p></div></div>
      </>}
      <div className="zalo-settings-actions"><button type="button" className="button" disabled={disabled || !status?.tokenConfigured || !status.webhookSecretConfigured} onClick={() => void act('webhook')}><AppIcon name="external" size={16} />Đăng ký webhook</button><button type="button" className="button" disabled={disabled || !status?.tokenConfigured || !status.webhookSecretConfigured} onClick={() => void act('pair')}>Liên kết Zalo cá nhân</button><button type="button" className="button" disabled={disabled || !status?.tokenConfigured || !status.settings.chatId} onClick={() => void act('test')}><AppIcon name="send" size={16} />Gửi tin kiểm tra</button></div>
      {pairing && <div className="zalo-pairing"><strong>Gửi dòng này cho bot qua tin nhắn riêng:</strong><code>{pairing.command}</code><small>Mã hết hạn lúc {formatAppointment(pairing.expiresAt)}. Không chia sẻ mã; trang tự cập nhật sau khi liên kết.</small></div>}
      <fieldset className="zalo-preferences" disabled={disabled}>
        <legend>Thông báo bạn muốn nhận</legend>
        <label><input type="checkbox" checked={preferences.expiring} onChange={event => change('expiring', event.target.checked)} />Gói sắp hết hạn</label>
        <label><input type="checkbox" checked={preferences.expired} onChange={event => change('expired', event.target.checked)} />Gói đã quá hạn</label>
        <label><input type="checkbox" checked={preferences.care} onChange={event => change('care', event.target.checked)} />Lịch chăm sóc đến giờ</label>
        <label className="zalo-hour"><span>Giờ bắt đầu nhắc hạn hằng ngày</span><select aria-label="Giờ nhắc hạn Zalo" value={preferences.sendHour} onChange={event => change('sendHour', Number(event.target.value))}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></label>
        <label><input type="checkbox" checked={preferences.enabled} disabled={!status?.settings.chatId || !status.tokenConfigured} onChange={event => change('enabled', event.target.checked)} />Bật thông báo Zalo</label>
      </fieldset>
      <p className="zalo-explanation">Giờ Việt Nam (UTC+7). Nhắc hạn tối đa một lần mỗi gói mỗi ngày; lịch chăm sóc một lần mỗi thời điểm hẹn. Lịch chạy server quyết định độ trễ thông báo.</p>
      <div className="zalo-settings-actions"><button type="button" className="button primary" disabled={disabled} onClick={() => void act('save')}><AppIcon name="check" size={16} />{pending ? 'Đang xử lý…' : 'Lưu tùy chọn'}</button></div>
      {status && !status.demo && <div className="zalo-run-status">
        <strong>Trạng thái chạy</strong>
        <p>{!run ? 'Chưa có lần chạy nào được ghi nhận.' : `${run.status === 'running' ? lateRun ? 'Lần chạy đang kéo dài; cần kiểm tra' : 'Đang chạy' : run.status === 'failed' ? 'Lần chạy thất bại' : run.status === 'attention' ? 'Cần kiểm tra kết quả gửi' : 'Đã hoàn tất'} · ${formatAppointment(run.startedAt)}`}</p>
        {lateRun && preferences.enabled && <p>Lần chạy gần nhất đã quá 15 phút. Kiểm tra lịch cron trước khi coi nhắc hẹn đang hoạt động.</p>}
        {!status.cronSecretConfigured && <p>Chưa có CRON_SECRET hợp lệ cho tác vụ định kỳ.</p>}
        <div className="reminder-counts"><span className="badge neutral">Đang chờ {status.jobs.pending}</span><span className="badge red">Lỗi {status.jobs.failed}</span><span className="badge amber">Chưa rõ kết quả {status.jobs.unknown}</span>{run && <span className="badge green">Đã gửi ở lần gần nhất {run.sent}</span>}</div>
        {(status.jobs.failed > 0 || status.jobs.unknown > 0) && <p>Các lần lỗi hoặc chưa rõ kết quả được giữ lại để đối chiếu, không tự gửi lại.</p>}
      </div>}
    </div>
  </section>;
}
