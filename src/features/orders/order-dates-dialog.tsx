'use client';

import { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { useBackdropDismiss } from '@/components/dialogs/use-backdrop-dismiss';
import { AppIcon } from '@/components/shared/app-icon';
import { formatOrderCode } from '@/domain/orders';
import { formatDateLabel } from '@/domain/dates';

export function OrderDatesDialog({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { data, today, updateOrder, role } = useTooldesk();
  const order = data.orders.find(item => item.id === orderId);
  const [date, setDate] = useState(order?.date || today);
  const [paidAt, setPaidAt] = useState(order?.paidAt || order?.date || today);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const backdrop = useBackdropDismiss(onClose);
  if (!order) return null;
  const customer = data.customers.find(item => item.id === order.customerId);
  return <div className="dialog-overlay center" {...backdrop}>
    <dialog id="active-dialog" className="modal small-modal" open onClick={event => event.stopPropagation()} aria-labelledby="dialog-title">
      <form className="dialog-shell" onSubmit={async event => {
        event.preventDefault(); setError(''); setPending(true);
        try { await updateOrder({ orderId, date, paidAt: order.payment === 'paid' ? paidAt : undefined }); onClose(); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'Không thể sửa ngày.'); }
        finally { setPending(false); }
      }}>
        <header className="dialog-header"><div><h2 id="dialog-title">Sửa ngày ghi nhận</h2><p>{formatOrderCode(orderId)} · {customer?.name}</p></div><button className="icon-button" type="button" disabled={pending} onClick={onClose} aria-label="Đóng"><AppIcon name="close" size={18} /></button></header>
        <div className="dialog-content">
          {error && <p className="dialog-error" role="alert">{error}</p>}
          <p className="hint-banner blue">Chọn ngày thực tế của đơn đã bán trước đây. Doanh thu sẽ chuyển vào tháng nhận tiền tương ứng sau khi lưu.</p>
          <label className="field"><span>Ngày bán</span><input name="orderDate" type="date" max={today} value={date} required onChange={event => setDate(event.target.value)} /></label>
          {order.payment === 'paid' && <label className="field"><span>Ngày nhận tiền</span><input name="paidAt" type="date" min={date} max={today} value={paidAt} required onChange={event => setPaidAt(event.target.value)} /></label>}
          <p className="muted">Bắt đầu dịch vụ: {formatDateLabel(order.startsAt, true)}. Giá bán, giá vốn, kỳ dịch vụ và các phiếu hoàn được giữ nguyên.</p>
        </div>
        <footer className="dialog-footer"><button className="button" type="button" disabled={pending} onClick={onClose}>Hủy</button><button className="button primary" type="submit" disabled={pending || role === 'viewer' || order.status === 'cancelled'}><AppIcon name="check" size={15} />{pending ? 'Đang lưu…' : 'Lưu ngày thực tế'}</button></footer>
      </form>
    </dialog>
  </div>;
}
