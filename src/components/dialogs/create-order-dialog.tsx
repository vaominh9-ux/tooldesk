'use client';

import { useBackdropDismiss } from './use-backdrop-dismiss';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { addDuration, formatDateLabel } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { formatCustomerCode, isValidEmail } from '@/domain/orders';
import { customersWithEmail } from '@/domain/customer-identity';
import { CustomerEmailMatches } from '@/features/customers/customer-email-matches';

export function CreateOrderDialog({
  onClose,
  defaultCustomerId,
  defaultProductId
}: {
  onClose: () => void;
  defaultCustomerId?: string;
  defaultProductId?: string;
}) {
  const { data, createOrder, today } = useTooldesk();
  const backdropDismiss = useBackdropDismiss(onClose);

  const [isNewCustomer, setIsNewCustomer] = useState(!defaultCustomerId && data.customers.length === 0);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    defaultCustomerId || data.customers[0]?.id || ''
  );
  const [newCustomerName, setNewCustomerName] = useState('');
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerSource, setNewCustomerSource] = useState('Zalo');

  const productPopularity = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of data.orders) {
      if (o.status !== 'cancelled') {
        counts.set(o.productId, (counts.get(o.productId) || 0) + 1);
      }
    }
    return counts;
  }, [data.orders]);

  const sortedProducts = React.useMemo(() => {
    return [...data.products].sort((a, b) => {
      const countA = productPopularity.get(a.id) || 0;
      const countB = productPopularity.get(b.id) || 0;
      if (countB !== countA) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  }, [data.products, productPopularity]);

  const topProducts = React.useMemo(() => {
    return sortedProducts.filter(p => (productPopularity.get(p.id) || 0) > 0).slice(0, 5);
  }, [sortedProducts, productPopularity]);

  const [selectedProductId, setSelectedProductId] = useState(
    defaultProductId || sortedProducts[0]?.id || data.products[0]?.id || ''
  );
  const currentProduct = data.products.find(p => p.id === selectedProductId) || sortedProducts[0] || data.products[0];

  const [selectedPlanId, setSelectedPlanId] = useState(currentProduct?.plans[0]?.id || '');
  const currentPlan =
    currentProduct?.plans.find(pl => pl.id === selectedPlanId) || currentProduct?.plans[0];

  const [startsAt, setStartsAt] = useState(today);
  const [price, setPrice] = useState(currentPlan?.price || 0);
  const [cost, setCost] = useState(currentPlan?.cost || 0);
  const [payment, setPayment] = useState<'paid' | 'unpaid'>('paid');
  const [orderDate, setOrderDate] = useState(today);
  const [paidAt, setPaidAt] = useState(today);
  const [datesTouched, setDatesTouched] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [pastedField, setPastedField] = useState<string | null>(null);
  const handlePaste = async (fieldKey: string, setter: (val: string) => void) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setter(text.trim());
          setPastedField(fieldKey);
          setTimeout(() => setPastedField(null), 1200);
        }
      }
    } catch {
      // ignore
    }
  };
  const emailInName = isNewCustomer && !newCustomerEmail.trim() && isValidEmail(newCustomerName)
    ? newCustomerName.trim() : '';
  const emailMatches = isNewCustomer ? customersWithEmail(data.customers, newCustomerEmail.trim() || emailInName) : [];
  const moveEmailFromName = () => {
    setNewCustomerEmail(emailInName);
    setNewCustomerName('');
    setError('');
    nameInputRef.current?.focus();
  };
  const useExistingCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setIsNewCustomer(false);
    setError('');
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isNewCustomer) {
        if (emailMatches.length) throw new Error('Email này đã có hồ sơ. Chọn “Dùng khách này” để tiếp tục tạo đơn.');
        if (emailInName) throw new Error('Email đang ở ô tên khách. Hãy chuyển sang ô Email và nhập tên khách hàng.');
        if (!newCustomerName.trim()) {
          throw new Error('Vui lòng nhập họ tên khách hàng mới.');
        }
        const trimmedEmail = newCustomerEmail.trim();
        const trimmedPhone = newCustomerPhone.trim();
        if (!trimmedEmail && !trimmedPhone) {
          throw new Error('Vui lòng nhập ít nhất Email hoặc Số điện thoại để lưu khách hàng.');
        }
        if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          throw new Error('Email khách hàng không đúng định dạng (ví dụ: khach@gmail.com).');
        }
      } else {
        if (!selectedCustomerId) {
          throw new Error('Vui lòng chọn một khách hàng trong danh sách.');
        }
      }

      if (!selectedProductId) {
        throw new Error('Vui lòng chọn sản phẩm.');
      }
      if (!selectedPlanId) {
        throw new Error('Vui lòng chọn gói dịch vụ.');
      }

      setPending(true);

      let finalNote = note.trim();
      if (accountEmail.trim()) {
        finalNote = finalNote
          ? `Tài khoản: ${accountEmail.trim()} | ${finalNote}`
          : `Tài khoản: ${accountEmail.trim()}`;
      }

      await createOrder({
        customerId: isNewCustomer ? undefined : selectedCustomerId,
        newCustomer: isNewCustomer
          ? {
              name: newCustomerName.trim(),
              email: newCustomerEmail.trim() || undefined,
              phone: newCustomerPhone.trim() || undefined,
              source: newCustomerSource
            }
          : undefined,
        productId: selectedProductId,
        planId: selectedPlanId,
        startsAt,
        date: orderDate,
        paidAt: payment === 'paid' ? paidAt : undefined,
        price: Number(price),
        cost: Number(cost),
        payment,
        note: finalNote
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo đơn hàng.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="dialog-overlay" {...backdropDismiss}>
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
                        {c.name} · {formatCustomerCode(c.id)} ({c.phone || c.email || 'Trực tiếp'})
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
                    ref={nameInputRef}
                    name="newCustomerName"
                    placeholder="Ví dụ: Nguyễn Minh Anh"
                    maxLength={80}
                    required
                    value={newCustomerName}
                    onChange={e => setNewCustomerName(e.target.value)}
                    aria-invalid={emailInName ? true : undefined}
                    aria-describedby={emailInName ? `order-email-placement${emailMatches.length ? ' customer-email-matches' : ''}` : undefined}
                    autoFocus
                  />
                </label>
                {emailInName && <>
                  <div className="customer-email-placement" id="order-email-placement">
                    <p>Bạn đang nhập email vào ô tên khách hàng.</p>
                    <button type="button" className="text-button" onClick={moveEmailFromName}>Chuyển sang ô Email</button>
                  </div>
                  <CustomerEmailMatches customers={emailMatches} onUse={useExistingCustomer} />
                </>}
                <label className="field">
                  <span>Email</span>
                  <div className="input-paste-box">
                    <input
                      name="newCustomerEmail"
                      type="email"
                      placeholder="khach@example.com"
                      maxLength={120}
                      value={newCustomerEmail}
                      onChange={e => setNewCustomerEmail(e.target.value)}
                      aria-invalid={!emailInName && emailMatches.length > 0 || undefined}
                      aria-describedby={!emailInName && emailMatches.length ? 'customer-email-matches' : undefined}
                    />
                    <button
                      type="button"
                      className={`input-paste-btn ${pastedField === 'newCustomerEmail' ? 'pasted' : ''}`}
                      title="Dán email từ bộ nhớ tạm"
                      aria-label="Dán email"
                      onClick={() => handlePaste('newCustomerEmail', setNewCustomerEmail)}
                    >
                      <AppIcon name={pastedField === 'newCustomerEmail' ? 'check' : 'paste'} size={15} />
                    </button>
                  </div>
                </label>
                {!emailInName && <CustomerEmailMatches customers={emailMatches} onUse={useExistingCustomer} />}
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
                  <small>Nhập ít nhất email hoặc số điện thoại.</small>
                </label>
                <label className="field">
                  <span>Nguồn khách hàng</span>
                  <select
                    name="newCustomerSource"
                    value={newCustomerSource}
                    onChange={e => setNewCustomerSource(e.target.value)}
                  >
                    <option value="Zalo">Zalo</option>
                    <option value="Messenger">Messenger</option>
                    <option value="Website">Website</option>
                    <option value="Giới thiệu">Giới thiệu</option>
                    <option value="Nhập thủ công">Nhập thủ công</option>
                  </select>
                </label>
              </div>
            )}

            {/* Package Info */}
            <div className="form-section-title">Thông tin gói dịch vụ</div>

            {topProducts.length > 0 && (
              <div className="popular-product-chips">
                <span className="chips-label">🔥 Mua nhiều:</span>
                <div className="chips-list">
                  {topProducts.map(p => {
                    const count = productPopularity.get(p.id) || 0;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`chip-button ${p.id === selectedProductId ? 'active' : ''}`}
                        onClick={() => handleProductChange(p.id)}
                        title={`${p.name} (${count} đơn đã bán)`}
                      >
                        {p.name} <small>({count})</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="form-grid">
              <label className="field">
                <span>Sản phẩm</span>
                <select
                  name="productId"
                  id="order-product"
                  value={selectedProductId}
                  onChange={e => handleProductChange(e.target.value)}
                >
                  {sortedProducts.map((item, idx) => {
                    const count = productPopularity.get(item.id) || 0;
                    const badge = idx === 0 && count > 0 ? `🔥 [Bán chạy nhất - ${count} đơn] ` : count > 0 ? `(${count} đơn) ` : '';
                    return (
                      <option key={item.id} value={item.id}>
                        {badge}{item.name}
                      </option>
                    );
                  })}
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
                {currentProduct && currentProduct.plans.length > 1 && (
                  <div className="popular-plan-chips">
                    {currentProduct.plans.map(plan => (
                      <button
                        key={plan.id}
                        type="button"
                        className={`chip-button ${plan.id === selectedPlanId ? 'active' : ''}`}
                        onClick={() => handlePlanChange(plan.id)}
                      >
                        {plan.name}
                      </button>
                    ))}
                  </div>
                )}
              </label>
            </div>

            <label className="field">
              <span>Email / Tài khoản nhận tool (nếu khác email khách)</span>
              <div className="input-paste-box">
                <input
                  type="text"
                  name="accountEmail"
                  placeholder="Ví dụ: taikhoan-nhan-tool@gmail.com"
                  value={accountEmail}
                  onChange={e => setAccountEmail(e.target.value)}
                />
                <button
                  type="button"
                  className={`input-paste-btn ${pastedField === 'accountEmail' ? 'pasted' : ''}`}
                  title="Dán tài khoản từ bộ nhớ tạm"
                  aria-label="Dán tài khoản nhận tool"
                  onClick={() => handlePaste('accountEmail', setAccountEmail)}
                >
                  <AppIcon name={pastedField === 'accountEmail' ? 'check' : 'paste'} size={15} />
                </button>
              </div>
              <small>Nhập email nhận gói để phân biệt khi khách mua nhiều đơn cho các email khác nhau (để trống nếu dùng email khách).</small>
            </label>

            <label className="field">
              <span>Ngày bắt đầu</span>
              <input
                type="date"
                name="startsAt"
                value={startsAt}
                required
                onChange={e => {
                  const val = e.target.value;
                  setStartsAt(val);
                  if (!datesTouched && val && val <= today) {
                    setOrderDate(val);
                    setPaidAt(val);
                  }
                }}
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
              <small>Gói tháng tính theo tháng lịch. Hết hạn lúc 00:00 ngày kết thúc, giờ Việt Nam. Ngày dịch vụ không quyết định tháng doanh thu.</small>
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
                    step={1}
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
            <div className="form-grid">
              <label className="field">
                <span>Ngày bán</span>
                <input
                  type="date"
                  name="orderDate"
                  value={orderDate}
                  max={today}
                  required
                  onChange={e => {
                    setDatesTouched(true);
                    if (paidAt === orderDate) setPaidAt(e.target.value);
                    setOrderDate(e.target.value);
                  }}
                />
                <small>Nhập đơn cũ: chọn ngày đã bán thực tế.</small>
              </label>
              {payment === 'paid' && <label className="field">
                <span>Ngày nhận tiền</span>
                <input
                  type="date"
                  name="paidAt"
                  value={paidAt}
                  min={orderDate}
                  max={today}
                  required
                  onChange={e => {
                    setDatesTouched(true);
                    setPaidAt(e.target.value);
                  }}
                />
                <small>Báo cáo theo tháng của ngày nhận tiền.</small>
              </label>}
            </div>
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
                      step={1}
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
              disabled={pending}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={pending || emailMatches.length > 0 || Boolean(emailInName)}
            >
              {pending ? (
                <>
                  <AppIcon name="refresh" size={16} />
                  <span>Đang lưu đơn…</span>
                </>
              ) : (
                <>
                  <AppIcon name="check" size={16} />
                  <span>Lưu đơn hàng</span>
                </>
              )}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
