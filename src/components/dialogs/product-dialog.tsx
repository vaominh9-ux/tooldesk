'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';

export function ProductDialog({
  onClose
}: {
  onClose: () => void;
}) {
  const { addProduct } = useTooldesk();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Trợ lý AI');
  const [description, setDescription] = useState('');
  const [planName, setPlanName] = useState('Gói 1 tháng');
  const [duration, setDuration] = useState(1);
  const [unit, setUnit] = useState<'months' | 'days'>('months');
  const [price, setPrice] = useState(350000);
  const [cost, setCost] = useState(250000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addProduct({
      name: name.trim(),
      symbol: name.trim()[0].toUpperCase(),
      category,
      description: description.trim() || `Tài khoản ${name} bản quyền chính hãng.`,
      plans: [
        {
          name: planName.trim() || 'Gói 1 tháng',
          duration: Number(duration) || 1,
          unit,
          price: Number(price) || 0,
          cost: Number(cost) || 0
        }
      ]
    });
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
              <h2 id="dialog-title">Thêm sản phẩm</h2>
              <p>Khởi tạo sản phẩm cùng gói dịch vụ đầu tiên.</p>
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
            <div id="form-error" role="alert"></div>

            <label className="field">
              <span>Tên sản phẩm</span>
              <input
                name="name"
                required
                maxLength={50}
                placeholder="Ví dụ: Công cụ AI mới"
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Nhóm sản phẩm</span>
              <select
                name="category"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="Trợ lý AI">Trợ lý AI</option>
                <option value="Thiết kế">Thiết kế</option>
                <option value="Nghiên cứu">Nghiên cứu</option>
                <option value="Lập trình">Lập trình</option>
                <option value="Khác">Khác</option>
              </select>
            </label>

            <label className="field">
              <span>Mô tả ngắn</span>
              <input
                name="description"
                maxLength={140}
                placeholder="Một dòng mô tả sản phẩm..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </label>

            <div className="divider"></div>
            <div className="form-section-title">Gói dịch vụ đầu tiên</div>

            <label className="field">
              <span>Tên gói</span>
              <input
                name="planName"
                required
                maxLength={70}
                placeholder="Ví dụ: Gói 1 tháng"
                value={planName}
                onChange={e => setPlanName(e.target.value)}
              />
            </label>

            <div className="form-grid">
              <label className="field">
                <span>Thời hạn</span>
                <input
                  name="duration"
                  type="number"
                  value={duration}
                  min={1}
                  max={365}
                  step={1}
                  required
                  onChange={e => setDuration(Number(e.target.value))}
                />
              </label>

              <label className="field">
                <span>Đơn vị</span>
                <select
                  name="unit"
                  value={unit}
                  onChange={e => setUnit(e.target.value as 'months' | 'days')}
                >
                  <option value="months">Tháng lịch</option>
                  <option value="days">Ngày</option>
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Giá bán mặc định</span>
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
                <span>Giá vốn mặc định</span>
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
            </div>
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
              <AppIcon name="plus" size={15} />
              <span>Thêm sản phẩm</span>
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
