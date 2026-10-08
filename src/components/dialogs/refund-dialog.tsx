'use client';

import { useBackdropDismiss } from './use-backdrop-dismiss';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { orderFinancials, formatMoney } from '@/domain/money';
import { refundServiceOption } from '@/domain/refunds';
import { formatDateLabel } from '@/domain/dates';
import { formatOrderCode } from '@/domain/orders';

export function RefundDialog({
  orderId,
  isRecovery = false,
  onClose
}: {
  orderId: string;
  isRecovery?: boolean;
  onClose: () => void;
}) {
  const { data, processRefund, addToast, openDialog, today } = useTooldesk();
  const backdropDismiss = useBackdropDismiss(onClose);

  const order = data.orders.find(o => o.id === orderId);
  const customer = data.customers.find(c => c.id === order?.customerId);

  const f = order ? orderFinancials(order, data.refunds) : null;
  const serviceOpt = order ? refundServiceOption(data, order) : null;

  const [recoveryMode] = useState<boolean>(isRecovery);
  const [operationId] = useState(() => crypto.randomUUID());
  const [amount, setAmount] = useState<number>(f?.remainingRefund || 0);
  const [costRecovered, setCostRecovered] = useState<number>(0);
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState<'bank' | 'cash' | 'wallet' | 'other'>('bank');
  const [reference, setReference] = useState('');
  const [serviceAction, setServiceAction] = useState<'keep' | 'end'>('keep');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  if (!order || !f || !serviceOpt) {
    return (
      <div className="dialog-overlay" {...backdropDismiss}>
        <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()}>
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

  // Pre-condition validation matching Tooldesk v0.2
  const cannotRecord =
    order.payment !== 'paid' ||
    order.status === 'cancelled' ||
    (!recoveryMode && f.remainingRefund === 0) ||
    (recoveryMode && (!f.refunded || !f.remainingCost));

  if (cannotRecord) {
    return (
      <div className="dialog-overlay" {...backdropDismiss}>
        <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()}>
          <div className="dialog-shell">
            <header className="dialog-header">
              <div>
                <h2 id="dialog-title">Chưa thể ghi nhận</h2>
                <p>Kiểm tra trạng thái giao dịch.</p>
              </div>
              <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
                <AppIcon name="close" size={19} />
              </button>
            </header>
            <div className="dialog-content">
              <div className="hint-banner neutral">
                <AppIcon name="info" size={18} />
                <span>
                  {recoveryMode
                    ? 'Đơn chưa có hoàn tiền hoặc đã thu hồi hết giá vốn.'
                    : 'Đơn chưa thanh toán hoặc đã hoàn hết số tiền đã thu.'}
                </span>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setError('Vui lòng đánh dấu xác nhận trước khi tiếp tục.');
      return;
    }
    setError('');

    try {
      await processRefund({
        operationId,
        orderId: order.id,
        amount: recoveryMode ? 0 : Number(amount),
        costRecovered: Number(costRecovered),
        date,
        reason: reason.trim(),
        method,
        reference: reference.trim(),
        serviceAction: recoveryMode ? 'keep' : serviceAction
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xử lý giao dịch.');
    }
  };

  // Preview calculations matching Tooldesk v0.2
  const activeAmount = recoveryMode ? 0 : Number(amount) || 0;
  const activeCostRecovered = Number(costRecovered) || 0;
  const netAfter = f.net - activeAmount;
  const grossAfter = f.gross - activeAmount + activeCostRecovered;

  return (
    <div className="dialog-overlay" {...backdropDismiss}>
      <dialog
        id="active-dialog"
        className="drawer refund-drawer"
        open
        onClick={e => e.stopPropagation()}
        aria-labelledby="dialog-title"
      >
        <form className="dialog-shell" id="refund-form" onSubmit={handleSubmit}>
          {/* Header */}
          <header className="dialog-header">
            <div>
              <h2 id="dialog-title">
                {recoveryMode ? 'Thu hồi giá vốn' : 'Ghi nhận hoàn tiền'}
              </h2>
              <p>{formatOrderCode(order.id)} · {customer?.name || ''}</p>
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

          {/* Content */}
          <div className="dialog-content">
            {error && <div className="dialog-error" role="alert">{error}</div>}

            {/* Context Stats */}
            <div className="refund-context">
              <div className="stat-line">
                <span>Giá trị đơn gốc</span>
                <strong>{formatMoney(order.price)}</strong>
              </div>
              <div className="stat-line">
                <span>Đã hoàn cho khách</span>
                <strong>{formatMoney(f.refunded)}</strong>
              </div>
              <div className="stat-line">
                <span>{recoveryMode ? 'Giá vốn còn có thể thu hồi' : 'Còn có thể hoàn'}</span>
                <strong>{formatMoney(recoveryMode ? f.remainingCost : f.remainingRefund)}</strong>
              </div>
            </div>

            {/* Refund Amount input (only if refund mode) */}
            {!recoveryMode && (
              <div style={{ marginTop: '16px' }}>
                <div className="field-label-row">
                  <span>Số tiền hoàn cho khách</span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => { setAmount(f.remainingRefund); setServiceAction('keep'); }}
                  >
                    Hoàn hết phần còn lại
                  </button>
                </div>
                <label className="field">
                  <div className="input-prefix">
                    <input
                      name="amount"
                      id="refund-amount"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={f.remainingRefund}
                      step={1}
                      value={amount}
                      required
                      onChange={e => { setAmount(Number(e.target.value)); setServiceAction('keep'); }}
                      aria-label="Số tiền hoàn cho khách"
                    />
                    <span>₫</span>
                  </div>
                  <small>Có thể hoàn một phần. Tổng các lần hoàn không vượt số đã nhận.</small>
                </label>
              </div>
            )}

            {/* Cost Recovery */}
            <label className="field" style={{ marginTop: recoveryMode ? '16px' : '0' }}>
              <span>{recoveryMode ? 'Giá vốn đã thực tế thu hồi' : 'Giá vốn thu hồi cùng lần này'}</span>
              <div className="input-prefix">
                <input
                  name="costRecovered"
                  type="number"
                  inputMode="numeric"
                  min={recoveryMode ? 1 : 0}
                  max={f.remainingCost}
                  step={1}
                  value={costRecovered}
                  required
                  onChange={e => setCostRecovered(Number(e.target.value))}
                />
                <span>₫</span>
              </div>
              <small>Chỉ nhập khoản nhà cung cấp đã trả lại. Chưa thu hồi được thì để 0.</small>
            </label>

            {/* Date & Method */}
            <div className="form-grid">
              <label className="field">
                <span>Ngày giao dịch</span>
                <input
                  type="date"
                  name="date"
                  value={date}
                  min={(order.paidAt || order.date).slice(0, 10)}
                  max={today}
                  required
                  onChange={e => setDate(e.target.value)}
                />
                <small>
                  <span id="refund-date-label">{formatDateLabel(date, true)}</span> · ngày/tháng/năm
                </small>
              </label>

              <label className="field">
                <span>Phương thức</span>
                <select
                  name="method"
                  value={method}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === 'bank' || value === 'cash' || value === 'wallet' || value === 'other') setMethod(value);
                  }}
                >
                  <option value="bank">Chuyển khoản</option>
                  <option value="cash">Tiền mặt</option>
                  <option value="wallet">Ví điện tử</option>
                  <option value="other">Khác</option>
                </select>
              </label>
            </div>

            {/* Reason */}
            <label className="field">
              <span>Lý do</span>
              <textarea
                name="reason"
                required
                minLength={3}
                maxLength={500}
                placeholder={
                  recoveryMode
                    ? 'Ví dụ: Nhà cung cấp trả lại chi phí gói đã hủy.'
                    : 'Ví dụ: Khách đổi nhu cầu, hoàn lại phần chưa sử dụng.'
                }
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </label>

            {/* Reference */}
            <label className="field">
              <span>Mã giao dịch / đối soát</span>
              <input
                name="reference"
                maxLength={120}
                placeholder="Không bắt buộc"
                value={reference}
                onChange={e => setReference(e.target.value)}
              />
            </label>

            {/* Service Action (if refund mode) */}
            {!recoveryMode && (
              <label className="field">
                <span>Xử lý gói dịch vụ</span>
                <select
                  name="serviceAction"
                  value={serviceAction}
                  onChange={e => setServiceAction(e.target.value as 'keep' | 'end')}
                >
                  <option value="keep">Giữ nguyên gói và thời hạn</option>
                  <option value="end" disabled={!serviceOpt.allowed}>
                    {serviceOpt.label}
                  </option>
                </select>
                <small>
                  {serviceOpt.hint} Chỉ kết thúc kỳ khi hoàn hết phần tiền còn lại.
                </small>
              </label>
            )}

            {/* Live Financial Preview */}
            <div className="refund-preview" id="refund-preview" aria-live="polite">
              <div className="refund-preview-head">
                <AppIcon name="chart" size={16} />
                <span>Sau khi ghi nhận lần này</span>
              </div>
              <div className="stat-line">
                <span>Tổng đã hoàn</span>
                <strong>{formatMoney(f.refunded + activeAmount)}</strong>
              </div>
              <div className="stat-line">
                <span>Thực thu còn lại</span>
                <strong>{formatMoney(netAfter)}</strong>
              </div>
              <div className="stat-line">
                <span>Giá vốn chưa thu hồi</span>
                <strong>{formatMoney(f.remainingCost - activeCostRecovered)}</strong>
              </div>
              <div className="divider"></div>
              <div className="stat-line">
                <span>Lợi nhuận gộp của đơn</span>
                <strong className={grossAfter < 0 ? 'negative' : 'positive'}>
                  {formatMoney(grossAfter)}
                </strong>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <label className="confirm-check" style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <input
                type="checkbox"
                name="confirmed"
                required
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
              />
              <span style={{ fontSize: '13px', color: '#5a6882' }}>
                {recoveryMode
                  ? 'Tôi xác nhận đã nhận lại khoản giá vốn trên.'
                  : 'Tôi xác nhận đã thực tế hoàn khoản tiền trên cho khách.'}
              </span>
            </label>

            <p className="dialog-note">
              Đây là ghi nhận giao dịch, không phải lệnh chuyển tiền. Mỗi phiếu lưu riêng và cập nhật báo cáo theo ngày giao dịch.
            </p>
          </div>

          {/* Footer */}
          <footer className="dialog-footer">
            <button
              type="button"
              className="button"
              onClick={() => openDialog('order-detail', order.id)}
            >
              Quay lại
            </button>
            <button
              type="submit"
              className={`button ${recoveryMode ? 'primary' : 'refund-primary'}`}
            >
              <AppIcon name={recoveryMode ? 'wallet' : 'refund'} size={16} />
              <span>{recoveryMode ? 'Lưu thu hồi giá vốn' : 'Lưu phiếu hoàn tiền'}</span>
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
