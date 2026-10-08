'use client';

import { useEffect, useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { appointmentState, careChannelLabels, formatAppointment, type CareAppointment } from '@/domain/care-scheduling';
import { AppIcon } from '@/components/shared/app-icon';
import { EmptyState, Feedback } from '@/components/shared/feedback';

const labels = { scheduled: 'Sắp tới', due: 'Đến hạn', completed: 'Hoàn tất', cancelled: 'Đã hủy' };
type Filter = 'pending' | keyof typeof labels | 'all';

export function CareSchedulePanel({ customerId, hideCreateAction = false }: { customerId?: string; hideCreateAction?: boolean }) {
  const { data, openDialog, finishCareAppointment, pending, role } = useTooldesk();
  const [now, setNow] = useState(() => new Date().toISOString());
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const update = () => setNow(new Date().toISOString());
    const timer = window.setInterval(update, 30000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  const all = data.careAppointments.filter(item => !customerId || item.customerId === customerId);
  const due = all.filter(item => appointmentState(item, now) === 'due').length;
  const filtered = all.filter(item => {
    const status = appointmentState(item, now), customer = data.customers.find(customer => customer.id === item.customerId);
    return (filter === 'all' || (filter === 'pending' ? item.status === 'scheduled' : status === filter)) && `${item.title} ${customer?.name} ${customer?.email} ${customer?.phone}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'));
  }).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  async function finish(item: CareAppointment, status: 'completed' | 'cancelled') {
    setError('');
    try { await finishCareAppointment(item.id, status); setCancelId(null); } catch (error) { setError(error instanceof Error ? error.message : 'Không cập nhật được lịch hẹn.'); }
  }
  const actions = (item: CareAppointment) => role !== 'viewer' && item.status === 'scheduled' && <div className="care-actions">
    {cancelId === item.id ? <><span>Hủy lịch hẹn này?</span><button className="button small" disabled={pending} onClick={() => void finish(item, 'cancelled')}>Hủy lịch</button><button className="button small" onClick={() => setCancelId(null)}>Giữ lịch</button></> : <>
      <button className="button small" disabled={pending} onClick={() => openDialog('care-appointment', { id: item.id })} aria-label={`Sửa lịch ${item.title}`}><AppIcon name="edit" size={15} />Sửa</button>
      <button className="button small" disabled={pending} onClick={() => setCancelId(item.id)}>Hủy lịch</button>
      <button className="button small primary" disabled={pending} onClick={() => void finish(item, 'completed')}><AppIcon name="check" size={15} />Hoàn tất</button>
    </>}
  </div>;
  return <article className={`panel care-panel${customerId ? ' customer-care-panel' : ''}`}>
    <div className="section-heading"><div><h2>Lịch chăm sóc {due > 0 && <span className="badge amber">{due} đến hạn</span>}</h2><p>Theo dõi việc cần liên hệ · giờ Việt Nam (UTC+7).</p></div>{!hideCreateAction && <button type="button" className="button primary" disabled={role === 'viewer'} onClick={() => openDialog('care-appointment', { customerId })}><AppIcon name="plus" size={16} />Hẹn lịch</button>}</div>
    <div className="list-toolbar"><label className="search-field"><AppIcon name="search" size={17} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={customerId ? 'Tìm nội dung hẹn...' : 'Tìm khách hoặc nội dung hẹn...'} aria-label="Tìm lịch chăm sóc" /></label><label className="care-filter"><span className="sr-only">Trạng thái lịch chăm sóc</span><select aria-label="Trạng thái lịch chăm sóc" value={filter} onChange={event => setFilter(event.target.value as Filter)}><option value="pending">Đang chờ</option><option value="due">Đến hạn</option><option value="scheduled">Sắp tới</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option><option value="all">Tất cả</option></select></label></div>
    {error && <Feedback tone="error">{error}</Feedback>}
    {!filtered.length ? <EmptyState title={all.length ? 'Không có lịch phù hợp' : 'Chưa có lịch chăm sóc'} description={all.length ? 'Thử đổi trạng thái hoặc từ khóa tìm kiếm.' : 'Hẹn một thời điểm để hỏi thăm và hỗ trợ khách hàng.'} /> : <>
      <div className="table-scroll desktop-data"><table className="data-table"><thead><tr><th>Khách hàng / Nội dung</th><th>Thời điểm / Kênh</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{filtered.map(item => {
        const customer = data.customers.find(customer => customer.id === item.customerId), state = appointmentState(item, now);
        return <tr key={item.id}><td><button className="text-link strong" onClick={() => openDialog('customer-detail', item.customerId)}>{customer?.name || 'Khách không còn tồn tại'}</button><p>{item.title}</p>{item.notes && <small>{item.notes}</small>}</td><td><time dateTime={item.scheduledAt}>{formatAppointment(item.scheduledAt)}</time><p>{careChannelLabels[item.channel]}</p></td><td><span className={`badge ${state === 'due' ? 'amber' : state === 'completed' ? 'green' : 'neutral'}`}>{labels[state]}</span></td><td>{actions(item)}</td></tr>;
      })}</tbody></table></div>
      <div className="mobile-records">{filtered.map(item => {
        const customer = data.customers.find(customer => customer.id === item.customerId), state = appointmentState(item, now);
        return <article className="record-card care-card" key={item.id}><div className="record-top"><button className="text-link strong" onClick={() => openDialog('customer-detail', item.customerId)}>{customer?.name || 'Khách không còn tồn tại'}</button><span className={`badge ${state === 'due' ? 'amber' : state === 'completed' ? 'green' : 'neutral'}`}>{labels[state]}</span></div><h3>{item.title}</h3><p className="record-description"><time dateTime={item.scheduledAt}>{formatAppointment(item.scheduledAt)}</time> · {careChannelLabels[item.channel]}</p>{item.notes && <p className="record-description">{item.notes}</p>}{item.completedAt && <p className="record-description">Hoàn tất: {formatAppointment(item.completedAt)}</p>}{actions(item)}</article>;
      })}</div>
    </>}
  </article>;
}
