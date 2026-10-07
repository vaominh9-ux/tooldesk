'use client';

import React from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { formatMoney } from '@/domain/money';

export function PaymentConfirmDialog({
  orderId,
  onClose
}: {
  orderId: string;
  onClose: () => void;
}) {
  const { data, recordPayment, addToast } = useTooldesk();

  const order = data.orders.find(o => o.id === orderId);
  const customer = data.customers.find(c => c.id === order?.customerId);

  if (!order) {
    return (
      <div className="dialog-overlay center" onClick={onClose}>
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
    try { await recordPayment(order.id); onClose(); } catch (error) { addToast('Không thể thu tiền', error instanceof Error ? error.message : 'Lỗi lưu giao dịch.', 'error'); }
  };

  return (
    <div className="dialog-overlay center" onClick={onClose}>
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
              <p>{order.id} · {customer?.name}</p>
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
          </div>

          <footer className="dialog-footer">
            <button type="button" className="button" onClick={onClose}>
              Hủy
            </button>
            <button
              type="button"
              className="button primary"
              onClick={handleConfirm}
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
