'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { addDuration, formatDateLabel, DEFAULT_APP_TODAY } from '@/domain/dates';
import { formatMoney } from '@/domain/money';

export function CreateOrderDialog({
  onClose,
  defaultCustomerId,
  defaultProductId
}: {
  onClose: () => void;
  defaultCustomerId?: string;
  defaultProductId?: string;
}) {
  const { data, createOrder } = useTooldesk();

  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    defaultCustomerId || data.customers[0]?.id || ''
  );
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [selectedProductId, setSelectedProductId] = useState(defaultProductId || data.products[0]?.id || '');
  const currentProduct = data.products.find(p => p.id === selectedProductId) || data.products[0];

  const [selectedPlanId, setSelectedPlanId] = useState(currentProduct?.plans[0]?.id || '');
  const currentPlan =
    currentProduct?.plans.find(pl => pl.id === selectedPlanId) || currentProduct?.plans[0];

  const [startsAt, setStartsAt] = useState(DEFAULT_APP_TODAY);
  const [price, setPrice] = useState(currentPlan?.price || 0);
  const [cost, setCost] = useState(currentPlan?.cost || 0);
  const [payment, setPayment] = useState<'paid' | 'unpaid'>('paid');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = data.products.find(p => p.id === prodId);
    if (prod && prod.plans[0]) {
      setSelectedPlanId(prod.plans[0].id);
      setPrice(prod.plans[0].price);
      setCost(prod.plans[0].cost);
    }
  };

  const handlePlanChange = (pId: string) => {
    setSelectedPlanId(pId);
    const pl = currentProduct?.plans.find(p => p.id === pId);
    if (pl) {
      setPrice(pl.price);
      setCost(pl.cost);
    }
  };

  let expiresAt = '';
  try {
    expiresAt = currentPlan && startsAt ? addDuration(startsAt, currentPlan.duration, currentPlan.unit) : '';
  } catch {
    expiresAt = '';
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isNewCustomer && !newCustomerName.trim()) {
        throw new Error('Vui lòng nhập họ tên khách hàng mới.');
      }
      createOrder({
        customerId: isNewCustomer ? undefined : selectedCustomerId,
        newCustomer: isNewCustomer
          ? { name: newCustomerName, email: newCustomerEmail, phone: newCustomerPhone }
          : undefined,
        productId: selectedProductId,
        planId: selectedPlanId,
        startsAt,
        price: Number(price),
        cost: Number(cost),
        payment,
        note
      });
    } catch (err: any) {
      setError(err.message || 'Không thể tạo đơn hàng.');
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <dialog
        id="active-dialog"
        className="drawer"
        open
        onClick={e => e.stopPropagation()}
        aria-labelledby="dialog-title"
      >
        <form className="dialog-shell" id="order-form" onSubmit={handleSubmit}>
          {/* Header */}
          <header className="dialog-header">
            <div>
              <h2 id="dialog-title">Tạo đơn hàng</h2>
              <p>Khách hàng, gói dịch vụ và thanh toán — trong một bước.</p>
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
            {error && (
              <div className="dialog-error" role="alert">
                {error}
              </div>
            )}

            {/* Customer Section */}
            <div className="field-label-row">
              <span>Khách hàng</span>
              <button
                className="text-button"
                type="button"
                onClick={() => setIsNewCustomer(!isNewCustomer)}
              >
                <AppIcon name={isNewCustomer ? 'close' : 'plus'} size={12} />
                <span>{isNewCustomer ? 'Chọn khách có sẵn' : 'Thêm khách mới'}</span>
              </button>
            </div>

            {!isNewCustomer ? (
              <div className="customer-select-box" id="existing-customer-block">
                <label className="field">
                  <select
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    required
                  >
                    {data.customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.id.toUpperCase()} ({c.phone || c.email || 'Trực tiếp'})
                      </option>
                    ))}
                  </select>
                  <small>Chọn kết quả có mã khách để tránh trùng người.</small>
                </label>
              </div>
            ) : (
              <div className="new-customer-section" id="new-customer-block">
                <label className="field">
                  <span>Tên khách hàng</span>
                  <input
                    name="newCustomerName"
                    placeholder="Ví dụ: Nguyễn Minh Anh"
                    maxLength={80}
                    required
                    value={newCustomerName}
                    onChange={e => setNewCustomerName(e.target.value)}
                    autoFocus
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    name="newCustomerEmail"
                    type="email"
                    placeholder="khach@example.com"
                    maxLength={120}
                    value={newCustomerEmail}
                    onChange={e => setNewCustomerEmail(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Số điện thoại</span>
                  <input
                    name="newCustomerPhone"
                    type="tel"
                    placeholder="Số điện thoại liên hệ"
                    maxLength={25}
                    value={newCustomerPhone}
                    onChange={e => setNewCustomerPhone(e.target.value)}
                  />
                  <small>Nhập ít nhất email hoặc số điện thoại. Chưa mặc định đồng ý nhận ưu đãi.</small>
                </label>
              </div>
            )}

            {/* Package Info */}
            <div className="form-section-title">Thông tin gói dịch vụ</div>

            <div className="form-grid">
              <label className="field">
                <span>Sản phẩm</span>
                <select
                  name="productId"
                  id="order-product"
                  value={selectedProductId}
                  onChange={e => handleProductChange(e.target.value)}
                >
                  {data.products.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Gói sử dụng</span>
                <select
                  name="planId"
                  id="order-plan"
                  value={selectedPlanId}
                  onChange={e => handlePlanChange(e.target.value)}
                >
                  {currentProduct?.plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Ngày bắt đầu</span>
              <input
                type="date"
                name="startsAt"
                value={startsAt}
                required
                onChange={e => setStartsAt(e.target.value)}
              />
            </label>

            {/* Date summary */}
            <div className="date-summary">
              <span>THỜI HẠN DỊCH VỤ</span>
              <div className="date-flow">
                <strong id="order-start-label">{formatDateLabel(startsAt, true)}</strong>
                <AppIcon name="arrow" size={17} />
                <strong id="order-end-label">{formatDateLabel(expiresAt, true)}</strong>
              </div>
              <small>Gói tháng tính theo tháng lịch. Hết hạn lúc 00:00 ngày kết thúc, giờ Việt Nam.</small>
            </div>

            {/* Price & Payment */}
            <div className="form-grid">
              <label className="field">
                <span>Giá bán</span>
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

            {/* Cost & Note toggle */}
            <details className="details-toggle">
              <summary>Giá vốn & ghi chú</summary>
              <div>
                <label className="field">
                  <span>Giá vốn tại thời điểm bán</span>
                  <div className="input-prefix">
                    <input
                      name="cost"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={999999999}
                      step={1000}
                      required
                      value={cost}
                      onChange={e => setCost(Number(e.target.value))}
                    />
                    <span>₫</span>
                  </div>
                </label>
                <div style={{ height: 15 }}></div>
                <label className="field">
                  <span>Ghi chú đơn hàng</span>
                  <textarea
                    name="note"
                    maxLength={500}
                    placeholder="Thông tin cần lưu ý..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </label>
              </div>
            </details>

            {/* Profit preview */}
            <div className="stat-line">
              <span>Lợi nhuận gộp dự kiến</span>
              <strong id="order-profit" className={price - cost < 0 ? 'negative' : 'positive'}>
                {formatMoney(price - cost)}
              </strong>
            </div>

            <p className="dialog-note">
              Lưu đơn sẽ tạo gói dịch vụ tương ứng. Không gửi thông báo cho khách. Đơn chưa thanh toán không được tính vào doanh thu đã thu.
            </p>
          </div>

          {/* Footer */}
          <footer className="dialog-footer">
            <button
              type="button"
              className="button"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="button primary"
            >
              <AppIcon name="check" size={16} />
              <span>Lưu đơn hàng</span>
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
