'use client';

import { useBackdropDismiss } from './use-backdrop-dismiss';

import React from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { formatMoney } from '@/domain/money';
import { formatOrderCode } from '@/domain/orders';

export function PaymentConfirmDialog({
  orderId,
  onClose
}: {
  orderId: string;
  onClose: () => void;
}) {
  const { data, today, pending, recordPayment, addToast } = useTooldesk();
  const [paidAt, setPaidAt] = React.useState(today);
  const backdropDismiss = useBackdropDismiss(onClose);

  const order = data.orders.find(o => o.id === orderId);
  const customer = data.customers.find(c => c.id === order?.customerId);

  if (!order) {
    return (
      <div className="dialog-overlay center" {...backdropDismiss}>
        <dialog id="active-dialog" className="modal small-modal" open onClick={e => e.stopPropagation()}>
          <div className="dialog-shell">
            <header className="dialog-header">
              <div>
                <h2 id="dialog-title">Không tìm thấy đơn</h2>
              </div>
              <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
                <AppIcon name="close" size={19} />
              </button>
            </header>
            <div className="dialog-content">
              <div className="empty-state">
                <p>Đơn hàng không tồn tại trong hệ thống.</p>
              </div>
            </div>
            <footer className="dialog-footer">
              <button type="button" className="button" onClick={onClose}>Đóng</button>
            </footer>
          </div>
        </dialog>
      </div>
    );
  }

  const handleConfirm = async () => {
    try { await recordPayment(order.id, paidAt); onClose(); } catch (error) { addToast('Không thể thu tiền', error instanceof Error ? error.message : 'Lỗi lưu giao dịch.', 'error'); }
  };

  return (
    <div className="dialog-overlay center" {...backdropDismiss}>
      <dialog
        id="active-dialog"
        className="modal small-modal"
        open
        onClick={e => e.stopPropagation()}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-shell">
          <header className="dialog-header">
            <div>
              <h2 id="dialog-title">Xác nhận đã nhận đủ tiền</h2>
              <p>{formatOrderCode(order.id)} · {customer?.name}</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Đóng"
            >
              <AppIcon name="close" size={19} />
            </button>
          </header>

          <div className="dialog-content">
            <div className="amount-breakdown" style={{ marginBottom: '16px' }}>
              <div className="stat-line">
                <span>Giá trị đơn</span>
                <strong>{formatMoney(order.price)}</strong>
              </div>
              <div className="stat-line">
                <span>Giá vốn</span>
                <strong>{formatMoney(order.cost)}</strong>
              </div>
              <div className="divider"></div>
              <div className="stat-line">
                <span>Lợi nhuận gộp</span>
                <strong className={order.price - order.cost >= 0 ? 'positive' : 'negative'}>
                  {formatMoney(order.price - order.cost)}
                </strong>
              </div>
            </div>

            <div className="hint-banner amber">
              <AppIcon name="warning" size={18} />
              <span>
                Chỉ xác nhận khi bạn đã kiểm tra và nhận đủ tiền. Bản này không kết nối ngân hàng hay kiểm tra chuyển khoản.
              </span>
            </div>
            <label className="field">
              <span>Ngày nhận tiền</span>
              <input type="date" name="paidAt" value={paidAt} min={order.date} max={today} required onChange={e => setPaidAt(e.target.value)} />
              <small>Chọn ngày thực tế nhận tiền để báo cáo đúng tháng.</small>
            </label>
          </div>

          <footer className="dialog-footer">
            <button type="button" className="button" onClick={onClose}>
              Hủy
            </button>
            <button
              type="button"
              className="button primary"
              onClick={handleConfirm}
              disabled={pending || !paidAt || paidAt < order.date || paidAt > today}
            >
              <AppIcon name="check" size={15} />
              <span>Đã nhận {formatMoney(order.price)}</span>
            </button>
          </footer>
        </div>
      </dialog>
    </div>
  );
}
