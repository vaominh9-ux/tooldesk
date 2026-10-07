'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';

export function PlanDialog({ planId, onClose }: { planId: string; onClose: () => void }) {
  const { data, updatePlan, addToast } = useTooldesk();
  const product = data.products.find(item => item.plans.some(plan => plan.id === planId));
  const plan = product?.plans.find(item => item.id === planId);

  const [name, setName] = useState(plan?.name || '');
  const [price, setPrice] = useState(plan?.price || 0);
  const [cost, setCost] = useState(plan?.cost || 0);
  const [error, setError] = useState('');

  if (!plan || !product) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()}>
          <div className="dialog-shell">
            <header className="dialog-header">
              <div>
                <h2 id="dialog-title">Không tìm thấy gói</h2>
              </div>
              <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
                <AppIcon name="close" size={19} />
              </button>
            </header>
            <div className="dialog-content">
              <div className="empty-state">
                <p>Gói dịch vụ không còn trong danh mục.</p>
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
    try {
      await updatePlan(planId, { name: name.trim(), price: Number(price), cost: Number(cost) });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật gói.');
    }
  };

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
              <h2 id="dialog-title">Cập nhật giá gói</h2>
              <p>{product.name} · {plan.name}</p>
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
                <small>{plan.name}</small>
              </div>
            </div>

            <label className="field">
              <span>Tên gói</span>
              <input
                name="name"
                value={name}
                required
                maxLength={70}
                onChange={e => setName(e.target.value)}
              />
            </label>

            <div className="form-grid">
              <label className="field">
                <span>Giá bán mặc định</span>
                <input
                  type="number"
                  name="price"
                  required
                  min={0}
                  step={1000}
                  value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                />
              </label>

              <label className="field">
                <span>Giá vốn mặc định</span>
                <input
                  type="number"
                  name="cost"
                  required
                  min={0}
                  step={1000}
                  value={cost}
                  onChange={e => setCost(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="hint-banner neutral" style={{ marginTop: '20px' }}>
              <AppIcon name="info" size={18} />
              <span>
                Giá mới chỉ áp dụng cho lần tạo đơn hoặc gia hạn tiếp theo. Các đơn và gói hiện có giữ nguyên giá đã ghi nhận.
              </span>
            </div>
          </div>

          <footer className="dialog-footer">
            <button className="button" type="button" onClick={onClose}>
              Hủy
            </button>
            <button className="button primary" type="submit">
              Lưu giá mới
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
