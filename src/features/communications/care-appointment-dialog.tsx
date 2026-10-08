'use client';

import { useState, type FormEvent } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { careChannelLabels, careChannels, fromHoChiMinhInput, toHoChiMinhInput, type CareAppointment } from '@/domain/care-scheduling';
import { AppIcon } from '@/components/shared/app-icon';
import { Feedback } from '@/components/shared/feedback';
import { useBackdropDismiss } from '@/components/dialogs/use-backdrop-dismiss';

export function CareAppointmentDialog({ id, customerId: initialCustomerId, onClose }: { id?: string; customerId?: string; onClose: () => void }) {
  const { data, saveCareAppointment, pending } = useTooldesk();
  const existing = data.careAppointments.find(item => item.id === id);
  const [customerId, setCustomerId] = useState(existing?.customerId || initialCustomerId || '');
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState(existing?.title || 'Hỏi thăm trải nghiệm sử dụng');
  const [channel, setChannel] = useState<CareAppointment['channel']>(existing?.channel || 'phone');
  const [when, setWhen] = useState(existing ? toHoChiMinhInput(existing.scheduledAt) : '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [error, setError] = useState('');
  const backdrop = useBackdropDismiss(onClose);
  const customers = data.customers.filter(customer => customer.id === customerId || `${customer.name} ${customer.email} ${customer.phone}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      await saveCareAppointment({ ...(id ? { id } : {}), customerId, title, channel, notes, scheduledAt: fromHoChiMinhInput(when) });
    } catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được lịch hẹn.'); }
  }
  return <div className="dialog-overlay center" {...backdrop}>
    <dialog open id="active-dialog" className="modal" aria-modal="true" aria-labelledby="dialog-title" onClick={event => event.stopPropagation()}>
      <form className="dialog-shell" onSubmit={submit}>
        <header className="dialog-header"><div><h2 id="dialog-title">{existing ? 'Sửa lịch chăm sóc' : 'Hẹn lịch chăm sóc'}</h2><p>Ghi lại việc cần làm và thời điểm liên hệ khách.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Đóng"><AppIcon name="close" size={18} /></button></header>
        <div className="dialog-content care-dialog">
          {error && <Feedback tone="error">{error}</Feedback>}
          <label className="field"><span>Tìm khách hàng</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tên, email hoặc số điện thoại" /></label>
          <label className="field"><span id="care-customer-label">Khách hàng</span><select aria-labelledby="care-customer-label" required value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">Chọn khách hàng</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.email || customer.phone}</option>)}</select></label>
          <label className="field"><span>Nội dung chăm sóc</span><input required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} /></label>
          <div className="care-field-grid"><label className="field"><span id="care-channel-label">Kênh liên hệ</span><select aria-labelledby="care-channel-label" value={channel} onChange={event => setChannel(event.target.value as CareAppointment['channel'])}>{careChannels.map(channel => <option key={channel} value={channel}>{careChannelLabels[channel]}</option>)}</select></label><label className="field"><span>Ngày giờ hẹn</span><input type="datetime-local" required value={when} onChange={event => setWhen(event.target.value)} /></label></div>
          <label className="field"><span>Ghi chú</span><textarea rows={3} maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} /></label>
          <Feedback>Giờ Việt Nam (UTC+7). Đây là lịch để bạn chủ động liên hệ; hệ thống chưa tự gửi tin qua các kênh.</Feedback>
        </div>
        <footer className="dialog-footer"><button type="button" className="button" onClick={onClose}>Hủy</button><button type="submit" className="button primary" disabled={pending}><AppIcon name="check" size={16} />Lưu lịch hẹn</button></footer>
      </form>
    </dialog>
  </div>;
}
