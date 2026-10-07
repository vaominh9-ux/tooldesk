'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { renewalDates } from '@/domain/subscriptions';
import { formatDateLabel } from '@/domain/dates';
import { formatMoney } from '@/domain/money';

export function RenewDialog({
  subscriptionId,
  onClose
}: {
  subscriptionId: string;
  onClose: () => void;
}) {
  const { data, renewSubscription, addToast, today } = useTooldesk();

  const sub = data.subscriptions.find(s => s.id === subscriptionId);
  const customer = data.customers.find(c => c.id === sub?.customerId);
  const product = data.products.find(p => p.id === sub?.productId);

  const [selectedPlanId, setSelectedPlanId] = useState(sub?.planId || product?.plans[0]?.id || '');
  const plan = product?.plans.find(p => p.id === selectedPlanId) || product?.plans[0];

  const dates = sub && plan ? renewalDates(sub, plan, today) : { startsAt: today, expiresAt: today };

  const [price, setPrice] = useState(plan?.price || 0);
  const [cost, setCost] = useState(plan?.cost || 0);
  const [payment, setPayment] = useState<'paid' | 'unpaid'>('unpaid');
  const [error, setError] = useState('');

  if (!sub || !product || !plan || !customer) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()}>
          <div className="dialog-shell">
            <header className="dialog-header">
              <div>
                <h2 id="dialog-title">Không tìm thấy gói</h2>
              </div>
              <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
                <AppIcon name="close" size={19} />
              </button>
            </header>
            <div className="dialog-content">
              <div className="empty-state">
                <p>Gói dịch vụ không tồn tại trong hệ thống.</p>
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

  const handlePlanChange = (pId: string) => {
    setSelectedPlanId(pId);
    const pl = product.plans.find(p => p.id === pId);
    if (pl) {
      setPrice(pl.price);
      setCost(pl.cost);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await renewSubscription({
        subscriptionId: sub.id,
        planId: selectedPlanId,
        startsAt: dates.startsAt,
        price: Number(price),
        cost: Number(cost),
        payment
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể gia hạn.');
    }
  };

  const isStillActive = !sub.cancelled && sub.expiresAt > today;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <dialog
        id="active-dialog"
        className="drawer"
        open
        onClick={e => e.stopPropagation()}
        aria-labelledby="dialog-title"
      >
        <form className="dialog-shell" id="renew-form" onSubmit={handleSubmit}>
          {/* Header */}
          <header className="dialog-header">
            <div>
              <h2 id="dialog-title">Gia hạn dịch vụ</h2>
              <p>{product.name} · Không cần nhập lại thông tin khách hàng.</p>
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

            {/* Customer preview */}
            <div className="customer-preview">
              <div className="avatar" aria-hidden="true">
                {customer.name[0]?.toUpperCase() || 'K'}
              </div>
              <div>
                <strong>{customer.name}</strong>
                <small>{customer.email || customer.phone}</small>
              </div>
            </div>

            {/* Current expiration */}
            <div className="detail-status">
              <span>Hạn hiện tại</span>
              <strong>{formatDateLabel(sub.expiresAt, true)}</strong>
            </div>

            {/* Plan selector */}
            <label className="field">
              <span>Gia hạn thêm</span>
              <select
                name="planId"
                id="renew-plan"
                value={selectedPlanId}
                onChange={e => handlePlanChange(e.target.value)}
              >
                {product.plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Renewal date flow banner */}
            <div className="date-summary">
              <span>THỜI HẠN GIA HẠN</span>
              <div className="date-flow">
                <strong id="renew-start-label">{formatDateLabel(dates.startsAt, true)}</strong>
                <AppIcon name="arrow" size={17} />
                <strong id="renew-end-label">{formatDateLabel(dates.expiresAt, true)}</strong>
              </div>
              <small>
                {isStillActive
                  ? 'Gia hạn từ hạn hiện tại, bảo toàn số ngày chưa sử dụng.'
                  : `Gói đã hết hạn. Kỳ mới bắt đầu từ ngày vận hành: ${formatDateLabel(today, true)}.`}
              </small>
            </div>

            {/* Price & Payment */}
            <div className="form-grid">
              <label className="field">
                <span>Giá gia hạn</span>
                <div className="input-prefix">
                  <input
                    name="price"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={999999999}
                    step={1000}
                    required
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                  />
                  <span>₫</span>
                </div>
              </label>

              <label className="field">
                <span>Thanh toán</span>
                <select
                  name="payment"
                  id="form-payment"
                  value={payment}
                  onChange={e => setPayment(e.target.value as 'paid' | 'unpaid')}
                >
                  <option value="unpaid">Chưa thanh toán</option>
                  <option value="paid">Đã nhận đủ tiền</option>
                </select>
              </label>
            </div>

            {/* Amount Breakdown */}
            <div className="amount-breakdown" style={{ marginTop: '16px' }}>
              <div className="stat-line">
                <span>Giá bán</span>
                <strong>{formatMoney(price)}</strong>
              </div>
              <div className="stat-line">
                <span>Giá vốn</span>
                <strong>{formatMoney(cost)}</strong>
              </div>
              <div className="divider"></div>
              <div className="stat-line">
                <span>Lợi nhuận gộp</span>
                <strong className={price - cost >= 0 ? 'positive' : 'negative'}>
                  {formatMoney(price - cost)}
                </strong>
              </div>
            </div>

            <div className="hint-banner neutral" style={{ marginTop: '16px' }}>
              <AppIcon name="info" size={18} />
              <span>
                Thao tác này tạo một đơn gia hạn mới và cập nhật thời hạn gói. Lịch sử đơn cũ được giữ nguyên.
              </span>
            </div>

            {payment === 'unpaid' && (
              <p className="dialog-note" id="renew-unpaid-warning">
                Bạn đang gia hạn trước khi ghi nhận thanh toán. Gói vẫn được kéo dài; đơn mới sẽ ở trạng thái chưa thanh toán.
              </p>
            )}
          </div>

          {/* Footer */}
          <footer className="dialog-footer">
            <button type="button" className="button" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="button primary">
              <AppIcon name="refresh" size={15} />
              <span>Xác nhận gia hạn</span>
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
