'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '@/components/shared/app-icon';
import { ProductLogo } from '@/components/shared/product-logo';
import { formatMoney } from '@/domain/money';
import { isActive } from '@/domain/subscriptions';

export default function ProductsPage() {
  const { data, openDialog, today } = useTooldesk();
  const [search, setSearch] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  let filtered = data.products;
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(p => {
      const text = `${p.name} ${p.category} ${p.plans.map(pl => pl.name).join(' ')}`.toLowerCase();
      return text.includes(q);
    });
  }

  const totalPlans = data.products.flatMap(p => p.plans).length;

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Sản phẩm</h1>
          <p>Thiết lập một lần. Tạo đơn và gia hạn nhanh hơn mỗi ngày.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => openDialog('product')}
          >
            <AppIcon name="plus" size={16} />
            <span>Thêm sản phẩm</span>
          </button>
        </div>
      </div>


      <div className="list-toolbar" style={{ padding: '0 0 21px' }}>
        <label className="search-field">
          <AppIcon name="search" size={18} />
          <input
            id="product-search"
            type="search"
            value={search}
            onChange={e => { setSearch(e.target.value); setExpandedProducts({}); }}
            placeholder="Tìm sản phẩm hoặc gói dịch vụ..."
            aria-label="Tìm sản phẩm hoặc gói dịch vụ..."
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              className="search-clear"
              onClick={() => { setSearch(''); setExpandedProducts({}); }}
              aria-label="Xóa tìm kiếm"
            >
              ×
            </button>
          )}
        </label>
        <span className="toolbar-end">
          {data.products.length} sản phẩm · {totalPlans} gói
        </span>
      </div>

      <section className="products-grid">
        {filtered.map(p => {
          const plansMatchSearch = Boolean(search.trim() && p.plans.some(plan => plan.name.toLowerCase().includes(search.trim().toLowerCase())));
          const expanded = expandedProducts[p.id] ?? plansMatchSearch;
          const activeCount = data.subscriptions.filter(
            s => s.productId === p.id && isActive(s, today)
          ).length;

          return (
            <article key={p.id} className="product-card">
              <div className="product-card-head">
                <ProductLogo name={p?.name} color={p?.color} large />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <h2 style={{ margin: 0 }}>
                      <button
                        type="button"
                        className="text-button plan-name-button"
                        onClick={() => openDialog('edit-product', p.id)}
                        title="Chỉnh sửa tên và thông tin sản phẩm"
                        aria-label={'Chỉnh sửa sản phẩm ' + p.name}
                      >
                        {p.name}
                      </button>
                    </h2>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => openDialog('edit-product', p.id)}
                      aria-label={`Sửa sản phẩm ${p.name}`}
                      title="Chỉnh sửa tên và thông tin sản phẩm"
                    >
                      <AppIcon name="edit" size={14} />
                    </button>
                  </div>
                  <p>{p.category}</p>
                </div>
              </div>

              <p className="product-card-description">{p.description}</p>

              <button
                type="button"
                className="product-plans-toggle"
                aria-expanded={expanded}
                aria-controls={`product-plans-${p.id}`}
                onClick={() => setExpandedProducts(current => ({ ...current, [p.id]: !expanded }))}
              >
                <span><strong>{expanded ? 'Thu gọn các gói' : 'Xem các gói dịch vụ'}</strong><small>{p.plans.length} gói{p.plans.length > 0 && ` · Từ ${formatMoney(Math.min(...p.plans.map(plan => plan.price)))}`}</small></span>
                <AppIcon name="down" size={18} />
              </button>
              <div id={`product-plans-${p.id}`} className={`product-plans ${expanded ? 'is-expanded' : ''}`}>
                {p.plans.map(pl => (
                  <div key={pl.id} className="product-plan">
                    <div>
                      <h3><button type="button" className="text-button plan-name-button" onClick={() => openDialog('plan', pl.id)} title="Chỉnh sửa tên và giá gói" aria-label={'Chỉnh sửa gói ' + p.name + ' ' + pl.name}>{pl.name}</button></h3>
                      <p>
                        Giá vốn {formatMoney(pl.cost)} · Lãi {formatMoney(pl.price - pl.cost)}
                      </p>
                    </div>
                    <div className="row-actions">
                      <strong className="product-price">{formatMoney(pl.price)}</strong>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => openDialog('plan', pl.id)}
                        aria-label={`Sửa ${p.name} ${pl.name}`}
                      >
                        <AppIcon name="edit" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="add-plan-action-btn"
                  onClick={() => openDialog('add-plan', p.id)}
                >
                  <AppIcon name="plus" size={13} />
                  <span>Thêm gói thời hạn mới</span>
                </button>
              </div>

              <div className="product-card-footer">
                <span>{activeCount} gói đang hoạt động</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => openDialog('create-order', p.id)}
                >
                  Tạo đơn <AppIcon name="arrow" size={12} />
                </button>
              </div>
            </article>
          );
        })}

        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <AppIcon name="inbox" size={28} />
            </div>
            <h3>Không tìm thấy sản phẩm</h3>
            <p>Thử tìm với tên hoặc danh mục khác.</p>
          </div>
        )}
      </section>
    </>
  );
}
