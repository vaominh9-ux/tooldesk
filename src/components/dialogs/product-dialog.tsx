'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { ProductLogo } from '../shared/product-logo';
import { formatMoney } from '@/domain/money';

interface PlanDraft {
  id: string;
  name: string;
  duration: number;
  unit: 'months' | 'days';
  price: number;
  cost: number;
}

const DEFAULT_CATEGORIES = ['Trợ lý AI', 'Thiết kế', 'Nghiên cứu', 'Lập trình', 'Khác'];

export function ProductDialog({
  productId,
  onClose
}: {
  productId?: string;
  onClose: () => void;
}) {
  const { data, addProduct, updateProduct } = useTooldesk();
  const existingProduct = productId ? data.products.find(p => p.id === productId) : undefined;
  const isEditing = Boolean(existingProduct);

  const [name, setName] = useState(existingProduct?.name || '');
  const [category, setCategory] = useState(existingProduct?.category || 'Trợ lý AI');
  const [description, setDescription] = useState(existingProduct?.description || '');
  const [symbol, setSymbol] = useState(existingProduct?.symbol || '◈');
  const [color, setColor] = useState(existingProduct?.color || 'mint');

  const [plans, setPlans] = useState<PlanDraft[]>([
    {
      id: '1',
      name: 'Gói 1 tháng',
      duration: 1,
      unit: 'months',
      price: 350000,
      cost: 250000
    }
  ]);

  const [error, setError] = useState('');

  const handleAddPlan = (presetMonths?: number) => {
    const nextDuration = presetMonths || (plans.length === 1 ? 3 : plans.length === 2 ? 6 : 12);
    const nextName = nextDuration >= 12 && nextDuration % 12 === 0
      ? `Gói ${nextDuration / 12} năm`
      : `Gói ${nextDuration} tháng`;

    const basePrice = plans[0]?.price || 350000;
    const baseCost = plans[0]?.cost || 250000;
    const baseDuration = plans[0]?.duration || 1;
    const ratio = nextDuration / baseDuration;

    // Slight discount for longer plans
    const discount = nextDuration >= 12 ? 0.8 : nextDuration >= 6 ? 0.85 : nextDuration >= 3 ? 0.9 : 1;
    const nextPrice = Math.max(10000, Math.round((basePrice * ratio * discount) / 10000) * 10000);
    const nextCost = Math.max(10000, Math.round((baseCost * ratio * 0.95) / 10000) * 10000);

    setPlans(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: nextName,
        duration: nextDuration,
        unit: 'months',
        price: nextPrice,
        cost: nextCost
      }
    ]);
  };

  const handleRemovePlan = (id: string) => {
    if (plans.length <= 1) return;
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePlan = (id: string, field: keyof PlanDraft, value: string | number) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      if (field === 'duration' && typeof value === 'number') {
        const u = updated.unit === 'months' ? 'tháng' : 'ngày';
        if (updated.name.startsWith('Gói ') || updated.name === '') {
          updated.name = value >= 12 && value % 12 === 0 && updated.unit === 'months'
            ? `Gói ${value / 12} năm`
            : `Gói ${value} ${u}`;
        }
      }
      return updated;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên sản phẩm.');
      return;
    }

    if (isEditing && existingProduct) {
      try {
        await updateProduct(existingProduct.id, {
          name: name.trim(),
          category,
          description: description.trim() || `Tài khoản ${name.trim()} bản quyền chính hãng.`,
          symbol: symbol.trim() || name.trim()[0].toUpperCase(),
          color
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể cập nhật sản phẩm.');
      }
      return;
    }

    if (plans.length === 0) {
      setError('Sản phẩm cần ít nhất 1 gói dịch vụ.');
      return;
    }

    for (let i = 0; i < plans.length; i++) {
      if (!plans[i].name.trim()) {
        setError(`Vui lòng nhập tên cho gói #${i + 1}.`);
        return;
      }
      if (plans[i].duration <= 0) {
        setError(`Thời hạn gói #${i + 1} phải lớn hơn 0.`);
        return;
      }
    }

    try {
      await addProduct({
        name: name.trim(),
        symbol: symbol.trim() || name.trim()[0].toUpperCase(),
        category,
        description: description.trim() || `Tài khoản ${name.trim()} bản quyền chính hãng.`,
        plans: plans.map(p => ({
          name: p.name.trim(),
          duration: Number(p.duration) || 1,
          unit: p.unit,
          price: Number(p.price) || 0,
          cost: Number(p.cost) || 0
        }))
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu sản phẩm.');
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
        <form className="dialog-shell" id="product-form" onSubmit={handleSubmit}>
          {/* Header */}
          <header className="dialog-header">
            <div>
              <h2 id="dialog-title">{isEditing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
              <p>
                {isEditing
                  ? 'Cập nhật tên sản phẩm, danh mục và thông tin hiển thị.'
                  : 'Khởi tạo sản phẩm cùng các gói thời hạn dịch vụ.'}
              </p>
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

            {/* Live Vector Logo Preview */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 16px',
                background: '#f8fafc',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                marginBottom: 16
              }}
            >
              <ProductLogo name={name || 'Tool AI'} color={color} size="large" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '13.5px', color: 'var(--foreground)', display: 'block' }}>
                  {name.trim() || 'Tên sản phẩm'}
                </strong>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                  Logo hiển thị tự động chuẩn vector theo thương hiệu AI
                </span>
              </div>
            </div>

            <label className="field">
              <span>Tên sản phẩm</span>
              <input
                name="name"
                required
                maxLength={80}
                placeholder="Ví dụ: Midjourney, Cursor, Jasper..."
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </label>

            <div className="form-grid">
              <label className="field" style={{ margin: 0 }}>
                <span>Nhóm sản phẩm</span>
                <select
                  name="category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {!DEFAULT_CATEGORIES.includes(category) && <option value={category}>{category}</option>}
                  {DEFAULT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>

              <label className="field" style={{ margin: 0 }}>
                <span>Màu nhận diện</span>
                <select
                  name="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                >
                  <option value="mint">Xanh ngọc (Mint)</option>
                  <option value="emerald">Lục bảo (Emerald)</option>
                  <option value="blue">Xanh dương (Blue)</option>
                  <option value="peach">Cam san hô (Peach)</option>
                  <option value="purple">Tím thạch anh (Purple)</option>
                  <option value="aqua">Xanh biển (Aqua)</option>
                  <option value="indigo">Chàm (Indigo)</option>
                  <option value="rose">Hồng cánh sen (Rose)</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span>Mô tả ngắn</span>
              <input
                name="description"
                maxLength={200}
                placeholder="Một dòng mô tả về sản phẩm..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </label>

            {isEditing && existingProduct && (
              <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8fafc', border: '1px solid var(--line)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '13px', fontWeight: 650, color: 'var(--foreground)' }}>
                    Các gói dịch vụ ({existingProduct.plans.length})
                  </span>
                  <span className="badge neutral" style={{ fontSize: '11px' }}>Quản lý trên thẻ</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {existingProduct.plans.map(pl => (
                    <div key={pl.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                      <strong style={{ color: 'var(--foreground)' }}>{pl.name}</strong>
                      <span>Giá bán: {formatMoney(pl.price)} · Vốn: {formatMoney(pl.cost)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ margin: '10px 0 0', fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="info" size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span>Để sửa giá bán, giá vốn hoặc đổi tên từng gói, bạn có thể bấm trực tiếp vào tên gói hoặc nút sửa trên thẻ sản phẩm.</span>
                </div>
              </div>
            )}

            {!isEditing && (
              <>
                <div className="divider" style={{ margin: '20px 0 16px' }}></div>

                {/* Plans List Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div className="form-section-title" style={{ margin: 0, fontSize: '13px', fontWeight: 650 }}>
                      Gói dịch vụ &amp; Thời hạn ({plans.length})
                    </div>
                    <small style={{ color: 'var(--muted)', fontSize: '11.5px' }}>
                      Thiết lập các mốc thời gian bán (1 tháng, 3 tháng, 1 năm...)
                    </small>
                  </div>

                  <button
                    type="button"
                    className="button small soft"
                    onClick={() => handleAddPlan()}
                    style={{ gap: 4, height: 32, fontSize: 12 }}
                  >
                    <AppIcon name="plus" size={13} />
                    <span>Thêm gói</span>
                  </button>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>Thêm nhanh:</span>
                  <button
                    type="button"
                    className="badge neutral"
                    style={{ cursor: 'pointer', border: '1px solid var(--line)', background: '#fff' }}
                    onClick={() => handleAddPlan(1)}
                  >
                    + Gói 1 tháng
                  </button>
                  <button
                    type="button"
                    className="badge neutral"
                    style={{ cursor: 'pointer', border: '1px solid var(--line)', background: '#fff' }}
                    onClick={() => handleAddPlan(3)}
                  >
                    + Gói 3 tháng
                  </button>
                  <button
                    type="button"
                    className="badge neutral"
                    style={{ cursor: 'pointer', border: '1px solid var(--line)', background: '#fff' }}
                    onClick={() => handleAddPlan(6)}
                  >
                    + Gói 6 tháng
                  </button>
                  <button
                    type="button"
                    className="badge neutral"
                    style={{ cursor: 'pointer', border: '1px solid var(--line)', background: '#fff' }}
                    onClick={() => handleAddPlan(12)}
                  >
                    + Gói 1 năm
                  </button>
                </div>

                {/* Plan Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {plans.map((pl, idx) => {
                    const profit = pl.price - pl.cost;
                    return (
                      <div
                        key={pl.id}
                        style={{
                          border: '1px solid var(--line)',
                          borderRadius: '10px',
                          padding: '14px',
                          background: '#fcfcff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="badge blue" style={{ fontSize: 11, fontWeight: 600 }}>
                            Gói #{idx + 1}
                          </span>
                          {plans.length > 1 && (
                            <button
                              type="button"
                              className="text-button"
                              style={{ color: 'var(--red)', fontSize: 11.5, padding: 0 }}
                              onClick={() => handleRemovePlan(pl.id)}
                              aria-label={`Xóa gói ${idx + 1}`}
                            >
                              Xóa gói này
                            </button>
                          )}
                        </div>

                        <label className="field" style={{ margin: 0 }}>
                          <span>Tên gói dịch vụ</span>
                          <input
                            required
                            maxLength={70}
                            placeholder="Ví dụ: Gói 1 tháng, Gói 3 tháng..."
                            value={pl.name}
                            onChange={e => handleUpdatePlan(pl.id, 'name', e.target.value)}
                          />
                        </label>

                        <div className="form-grid">
                          <label className="field" style={{ margin: 0 }}>
                            <span>Thời hạn</span>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              step={1}
                              required
                              value={pl.duration}
                              onChange={e => handleUpdatePlan(pl.id, 'duration', Number(e.target.value))}
                            />
                          </label>

                          <label className="field" style={{ margin: 0 }}>
                            <span>Đơn vị</span>
                            <select
                              value={pl.unit}
                              onChange={e => handleUpdatePlan(pl.id, 'unit', e.target.value as 'months' | 'days')}
                            >
                              <option value="months">Tháng lịch</option>
                              <option value="days">Ngày</option>
                            </select>
                          </label>
                        </div>

                        <div className="form-grid">
                          <label className="field" style={{ margin: 0 }}>
                            <span>Giá bán mặc định</span>
                            <div className="input-prefix">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={999999999}
                                step={1000}
                                required
                                value={pl.price}
                                onChange={e => handleUpdatePlan(pl.id, 'price', Number(e.target.value))}
                              />
                              <span>₫</span>
                            </div>
                          </label>

                          <label className="field" style={{ margin: 0 }}>
                            <span>Giá vốn mặc định</span>
                            <div className="input-prefix">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={999999999}
                                step={1000}
                                required
                                value={pl.cost}
                                onChange={e => handleUpdatePlan(pl.id, 'cost', Number(e.target.value))}
                              />
                              <span>₫</span>
                            </div>
                          </label>
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', paddingTop: 2 }}>
                          <span>Dự tính mỗi gói:</span>
                          <strong className={profit < 0 ? 'negative' : 'positive'}>
                            Lãi {formatMoney(profit)}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add More Plan Button */}
                <button
                  type="button"
                  className="button full"
                  style={{
                    marginTop: 12,
                    border: '1px dashed #cfd5e6',
                    background: '#fff',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    fontSize: 12.5
                  }}
                  onClick={() => handleAddPlan()}
                >
                  <AppIcon name="plus" size={14} />
                  <span>Thêm gói dịch vụ / thời hạn khác</span>
                </button>
              </>
            )}
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
              {isEditing ? (
                <>
                  <AppIcon name="circleCheck" size={15} />
                  <span>Lưu thay đổi</span>
                </>
              ) : (
                <>
                  <AppIcon name="plus" size={15} />
                  <span>Tạo sản phẩm ({plans.length} gói)</span>
                </>
              )}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
