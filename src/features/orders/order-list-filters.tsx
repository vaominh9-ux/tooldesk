'use client';

import { useEffect, useRef, useState } from 'react';
import { AppIcon } from '@/components/shared/app-icon';

export function OrderListFilters({ search, productFilter, kindFilter, products, onSearch, onProduct, onKind, onReset }: {
  search: string;
  productFilter: string;
  kindFilter: string;
  products: { id: string; name: string }[];
  onSearch: (value: string) => void;
  onProduct: (value: string) => void;
  onKind: (value: string) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const activeCount = Number(Boolean(productFilter)) + Number(Boolean(kindFilter));
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  return <div className="list-toolbar order-filter-toolbar" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); toggle.current?.focus(); }
  }}>
    <label className="search-field">
      <AppIcon name="search" size={18} />
      <input id="list-search" type="search" value={search} onChange={event => onSearch(event.target.value)} placeholder="Tìm mã đơn, tên, SĐT hoặc email..." aria-label="Tìm mã đơn, tên, SĐT hoặc email..." autoComplete="off" />
      {search && <button type="button" className="search-clear" onClick={() => onSearch('')} aria-label="Xóa tìm kiếm">×</button>}
    </label>
    <button type="button" ref={toggle} className={`icon-button order-filter-toggle${activeCount ? ' has-filters' : ''}`} aria-label={`Bộ lọc đơn hàng${activeCount ? `, ${activeCount} điều kiện đang áp dụng` : ''}`} aria-controls="order-filter-fields" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <AppIcon name="filter" size={20} />{activeCount > 0 && <span className="order-filter-count" aria-hidden="true">{activeCount}</span>}
    </button>
    <div id="order-filter-fields" className={`order-filter-fields${open ? ' is-open' : ''}`}>
      <div className="order-filter-heading"><strong>Bộ lọc đơn hàng</strong><button type="button" className="text-button" disabled={!activeCount} onClick={() => { onProduct(''); onKind(''); }}>Xóa lọc</button></div>
      <label className="order-filter-field"><span className="order-filter-label">Sản phẩm</span><select className="select-filter" value={productFilter} onChange={event => onProduct(event.target.value)} aria-label="Lọc sản phẩm"><option value="">Tất cả sản phẩm</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <label className="order-filter-field"><span className="order-filter-label">Loại đơn</span><select className="select-filter" value={kindFilter} onChange={event => onKind(event.target.value)} aria-label="Loại đơn"><option value="">Tất cả loại đơn</option><option value="new">Mua mới</option><option value="renewal">Gia hạn</option></select></label>
    </div>
    <button type="button" className="button small ghost toolbar-end" onClick={onReset}><AppIcon name="refresh" size={13} /><span>Đặt lại bộ lọc</span></button>
  </div>;
}
