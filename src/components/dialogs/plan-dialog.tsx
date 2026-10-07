'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { formatMoney } from '@/domain/money';

export function PlanDialog({
  planId,
  productId,
  onClose
}: {
  planId?: string;
  productId?: string;
  onClose: () => void;
}) {
  const { data, updatePlan, addPlan } = useTooldesk();

  // Find product and plan depending on which prop is passed
  const product = productId
    ? data.products.find(p => p.id === productId)
    : data.products.find(item => item.plans.some(plan => plan.id === planId));

  const plan = planId ? product?.plans.find(item => item.id === planId) : undefined;
  const isCreating = !planId && Boolean(product);

  const [name, setName] = useState(plan?.name || 'Gói 3 tháng');
  const [duration, setDuration] = useState(plan?.duration || 3);
  const [unit, setUnit] = useState<'months' | 'days'>(plan?.unit || 'months');
  const [price, setPrice] = useState(plan?.price || 1000000);
  const [cost, setCost] = useState(plan?.cost || 700000);
  const [error, setError] = useState('');

  if (!product) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()}>
          <div className="dialog-shell">
            <header className="dialog-header">
              <div>
                <h2 id="dialog-title">Không tìm thấy sản phẩm</h2>
              </div>
              <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
                <AppIcon name="close" size={19} />
              </button>
            </header>
            <div className="dialog-content">
              <div className="empty-state">
                <p>Sản phẩm không còn trong danh mục.</p>
              </div>
            </div>
            <footer className="dialog-footer">
              <button className="button" type="button" onClick={onClose}>Đóng</button>
            </footer>
          </div>
        </dialog>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên gói.');
      return;
    }
    if (duration <= 0) {
      setError('Thời hạn phải lớn hơn 0.');
      return;
    }

    try {
      if (isCreating && product) {
        await addPlan(product.id, {
          name: name.trim(),
          duration: Number(duration) || 1,
          unit,
          price: Number(price) || 0,
          cost: Number(cost) || 0
        });
      } else if (planId) {
        await updatePlan(planId, {
          name: name.trim(),
          price: Number(price) || 0,
          cost: Number(cost) || 0
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu gói dịch vụ.');
    }
  };

  const profit = price - cost;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <dialog
        id="active-dialog"
        className="drawer"
        open
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={e => e.stopPropagation()}
      >
        <form className="dialog-shell" id="plan-form" onSubmit={handleSubmit}>
          <header className="dialog-header">
            <div>
              <h2 id="dialog-title">{isCreating ? 'Thêm gói thời hạn mới' : 'Cập nhật giá gói'}</h2>
              <p>{product.name} {plan ? `· ${plan.name}` : ''}</p>
            </div>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
              <AppIcon name="close" size={19} />
            </button>
          </header>

          <div className="dialog-content">
            {error && <div className="dialog-error" role="alert">{error}</div>}

            <div className="customer-preview" style={{ marginBottom: '20px' }}>
              <div className="product-logo large" aria-hidden="true">
                {product.symbol || product.name[0]?.toUpperCase()}
              </div>
              <div>
                <strong>{product.name}</strong>
                <small>{product.category}</small>
              </div>
            </div>

            <label className="field">
              <span>Tên gói dịch vụ</span>
              <input
                name="name"
                value={name}
                required
                maxLength={70}
                placeholder="Ví dụ: Gói 3 tháng, Gói 6 tháng, Gói 1 năm..."
                onChange={e => setName(e.target.value)}
              />
            </label>

            {isCreating && (
              <div className="form-grid">
                <label className="field">
                  <span>Thời hạn</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    step={1}
                    required
                    value={duration}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setDuration(v);
                      if (name.startsWith('Gói ') || name === '') {
                        setName(v >= 12 && v % 12 === 0 && unit === 'months' ? `Gói ${v / 12} năm` : `Gói ${v} ${unit === 'months' ? 'tháng' : 'ngày'}`);
                      }
                    }}
                  />
                </label>

                <label className="field">
                  <span>Đơn vị</span>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as 'months' | 'days')}
                  >
                    <option value="months">Tháng lịch</option>
                    <option value="days">Ngày</option>
                  </select>
                </label>
              </div>
            )}

            <div className="form-grid">
              <label className="field">
                <span>Giá bán mặc định</span>
                <div className="input-prefix">
                  <input
                    type="number"
                    name="price"
                    required
                    min={0}
                    step={1000}
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                  />
                  <span>₫</span>
                </div>
              </label>

              <label className="field">
                <span>Giá vốn mặc định</span>
                <div className="input-prefix">
                  <input
                    type="number"
                    name="cost"
                    required
                    min={0}
                    step={1000}
                    value={cost}
                    onChange={e => setCost(Number(e.target.value))}
                  />
                  <span>₫</span>
                </div>
              </label>
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span>Lợi nhuận gộp dự tính:</span>
              <strong className={profit < 0 ? 'negative' : 'positive'}>
                {profit >= 0 ? `+${formatMoney(profit)}` : formatMoney(profit)}
              </strong>
            </div>

            <div className="hint-banner neutral" style={{ marginTop: '16px' }}>
              <AppIcon name="info" size={18} />
              <span>
                {isCreating
                  ? 'Gói mới sẽ xuất hiện ngay trong danh sách chọn gói khi tạo đơn hàng hoặc gia hạn dịch vụ.'
                  : 'Giá mới chỉ áp dụng cho lần tạo đơn hoặc gia hạn tiếp theo. Các đơn và gói hiện có giữ nguyên giá đã ghi nhận.'}
              </span>
            </div>
          </div>

          <footer className="dialog-footer">
            <button className="button" type="button" onClick={onClose}>
              Hủy
            </button>
            <button className="button primary" type="submit">
              {isCreating ? 'Thêm gói dịch vụ' : 'Lưu giá mới'}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
