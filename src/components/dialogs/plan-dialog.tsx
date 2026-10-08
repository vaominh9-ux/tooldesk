'use client';

import { useBackdropDismiss } from './use-backdrop-dismiss';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { ProductLogo } from '@/components/shared/product-logo';
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
  const { data, pending, updatePlan, addPlan, deletePlan } = useTooldesk();
  const backdropDismiss = useBackdropDismiss(onClose);

  // Find product and plan depending on which prop is passed
  const product = productId
    ? data.products.find(p => p.id === productId)
    : data.products.find(item => item.plans.some(plan => plan.id === planId));

  const plan = planId ? product?.plans.find(item => item.id === planId) : undefined;
  const isCreating = !planId && Boolean(product);

  const initialPreset = React.useMemo(() => {
    if (!product || !isCreating) {
      return {
        name: plan?.name || 'Gói 1 tháng',
        duration: plan?.duration || 1,
        unit: plan?.unit || ('months' as const),
        price: plan?.price || 500000,
        cost: plan?.cost || 300000
      };
    }
    const hasDur = (d: number, u: string) =>
      product.plans.some(p => p.duration === d && (p.unit || 'months') === u);

    if (!hasDur(1, 'months')) {
      return { name: 'Gói 1 tháng', duration: 1, unit: 'months' as const, price: 450000, cost: 300000 };
    }
    if (!hasDur(3, 'months')) {
      return { name: 'Gói 3 tháng', duration: 3, unit: 'months' as const, price: 1250000, cost: 850000 };
    }
    if (!hasDur(6, 'months')) {
      return { name: 'Gói 6 tháng', duration: 6, unit: 'months' as const, price: 2350000, cost: 1600000 };
    }
    if (!hasDur(12, 'months')) {
      return { name: 'Gói 1 năm', duration: 12, unit: 'months' as const, price: 4200000, cost: 2900000 };
    }
    return { name: 'Gói 6 tháng', duration: 6, unit: 'months' as const, price: 2350000, cost: 1600000 };
  }, [product, isCreating, plan]);

  const [name, setName] = useState(initialPreset.name);
  const [duration, setDuration] = useState(initialPreset.duration);
  const [unit, setUnit] = useState<'months' | 'days'>(initialPreset.unit);
  const [price, setPrice] = useState(initialPreset.price);
  const [cost, setCost] = useState(initialPreset.cost);
  const [error, setError] = useState('');

  if (!product) {
    return (
      <div className="dialog-overlay" {...backdropDismiss}>
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

  const handleDelete = async () => {
    if (!planId || !plan || !product) return;
    if (product.plans.length <= 1) {
      setError('Mỗi sản phẩm cần giữ lại ít nhất 1 gói bán. Nếu không kinh doanh sản phẩm này nữa, vui lòng xóa sản phẩm.');
      return;
    }
    const hasOrders = data.orders.some(o => o.planId === planId);
    const hasSubs = data.subscriptions.some(s => s.planId === planId);
    if (hasOrders || hasSubs) {
      setError('Không thể xóa gói này vì đã có đơn hàng hoặc gói dịch vụ liên kết trong lịch sử.');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa gói "${plan.name}" khỏi sản phẩm "${product.name}"?`)) {
      return;
    }
    try {
      await deletePlan(planId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa gói dịch vụ.');
    }
  };

  const profit = price - cost;

  return (
    <div className="dialog-overlay" {...backdropDismiss}>
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
              <h2 id="dialog-title">{isCreating ? 'Thêm gói thời hạn mới' : 'Chỉnh sửa tên và giá gói'}</h2>
              <p>{product.name} {plan ? `· ${plan.name}` : ''}</p>
            </div>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
              <AppIcon name="close" size={19} />
            </button>
          </header>

          <div className="dialog-content">
            {error && <div className="dialog-error" role="alert">{error}</div>}

            {/* Enhanced Product Header Banner */}
            <div className="product-dialog-banner">
              <div className="product-banner-main">
                <ProductLogo name={product?.name} color={product?.color} large />
                <div className="product-banner-info">
                  <div className="product-banner-title">
                    <h3>{product.name}</h3>
                    <span className="badge neutral">{product.category}</span>
                  </div>
                  <p className="product-banner-sub">
                    {product.description || 'Dịch vụ phần mềm AI'}
                  </p>
                </div>
              </div>

              <div className="product-banner-side">
                {isCreating ? (
                  <>
                    <span className="badge blue">
                      {product.plans.length} gói hiện có
                    </span>
                    <small title={product.plans.map(p => p.name).join(' · ')}>
                      {product.plans.length > 0
                        ? product.plans.map(p => p.name).join(' · ')
                        : 'Chưa có gói nào'}
                    </small>
                  </>
                ) : (
                  <>
                    <span className="badge amber">Đang chỉnh sửa</span>
                    <small title={plan?.name}>{plan?.name}</small>
                  </>
                )}
              </div>
            </div>

            {/* Quick Presets when creating */}
            {isCreating && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                  flexWrap: 'wrap'
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                  Gợi ý thời hạn:
                </span>
                {[
                  { label: '1 tháng', dur: 1, u: 'months' as const, name: 'Gói 1 tháng', p: 450000, c: 300000 },
                  { label: '3 tháng', dur: 3, u: 'months' as const, name: 'Gói 3 tháng', p: 1250000, c: 850000 },
                  { label: '6 tháng', dur: 6, u: 'months' as const, name: 'Gói 6 tháng', p: 2350000, c: 1600000 },
                  { label: '1 năm', dur: 12, u: 'months' as const, name: 'Gói 1 năm', p: 4200000, c: 2900000 }
                ].map(preset => {
                  const alreadyExists = product.plans.some(
                    p => p.duration === preset.dur && (p.unit || 'months') === preset.u
                  );
                  const isSelected = duration === preset.dur && unit === preset.u;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className={`badge ${isSelected ? 'blue' : 'neutral'}`}
                      style={{
                        cursor: 'pointer',
                        border: '1px solid var(--line)',
                        background: isSelected ? 'var(--accent-soft)' : '#fff',
                        opacity: alreadyExists && !isSelected ? 0.7 : 1,
                        fontSize: 11.5,
                        padding: '4px 9px',
                        transition: 'all 0.15s'
                      }}
                      title={alreadyExists ? 'Đã có gói thời hạn này trong danh mục' : `Chọn ${preset.label}`}
                      onClick={() => {
                        setDuration(preset.dur);
                        setUnit(preset.u);
                        setName(preset.name);
                        if (!alreadyExists) {
                          setPrice(preset.p);
                          setCost(preset.c);
                        }
                      }}
                    >
                      {preset.label} {alreadyExists && '✓'}
                    </button>
                  );
                })}
              </div>
            )}

            <label className="field">
              <span>Tên gói dịch vụ</span>
              <input
                name="name"
                value={name}
                required
                maxLength={80}
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
                    step={1}
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
                    step={1}
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
            {!isCreating && (
              <button
                type="button"
                className="button danger"
                onClick={handleDelete}
                disabled={pending}
                style={{ marginRight: 'auto' }}
              >
                <AppIcon name="trash" size={15} />
                <span>Xóa gói này</span>
              </button>
            )}
            <button className="button" type="button" onClick={onClose}>
              Hủy
            </button>
            <button className="button primary" type="submit" disabled={pending}>
              {pending ? 'Đang lưu…' : isCreating ? 'Thêm gói dịch vụ' : 'Lưu thay đổi gói'}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
