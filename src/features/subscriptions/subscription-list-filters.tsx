'use client';

import { useEffect, useRef, useState } from 'react';
import { AppIcon } from '@/components/shared/app-icon';

export function SubscriptionListFilters({ search, productFilter, contactFilter, products, windowDays, onSearch, onProduct, onContact }: {
  search: string;
  productFilter: string;
  contactFilter: string;
  products: { id: string; name: string }[];
  windowDays: number;
  onSearch: (value: string) => void;
  onProduct: (value: string) => void;
  onContact: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const activeCount = Number(Boolean(productFilter)) + Number(Boolean(contactFilter));
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  // Share the order filter presentation; desktop wrappers use display:contents.
  return <div className="list-toolbar order-filter-toolbar subscription-filter-toolbar" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); toggle.current?.focus(); }
  }}>
    <label className="search-field">
      <AppIcon name="search" size={18} />
      <input id="list-search" type="search" value={search} onChange={event => onSearch(event.target.value)} placeholder="Tìm khách hàng, SĐT hoặc email..." aria-label="Tìm khách hàng, SĐT hoặc email..." autoComplete="off" />
      {search && <button type="button" className="search-clear" onClick={() => onSearch('')} aria-label="Xóa tìm kiếm">×</button>}
    </label>
    <button type="button" ref={toggle} className={`icon-button order-filter-toggle${activeCount ? ' has-filters' : ''}`} aria-label={`Bộ lọc gói dịch vụ${activeCount ? `, ${activeCount} điều kiện đang áp dụng` : ''}`} aria-controls="subscription-filter-fields" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <AppIcon name="filter" size={20} />{activeCount > 0 && <span className="order-filter-count" aria-hidden="true">{activeCount}</span>}
    </button>
    <div id="subscription-filter-fields" className={`order-filter-fields${open ? ' is-open' : ''}`}>
      <div className="order-filter-heading"><strong>Bộ lọc gói dịch vụ</strong><button type="button" className="text-button" disabled={!activeCount} onClick={() => { onProduct(''); onContact(''); }}>Xóa lọc</button></div>
      <label className="order-filter-field"><span className="order-filter-label">Sản phẩm</span><select className="select-filter" value={productFilter} onChange={event => onProduct(event.target.value)} aria-label="Lọc sản phẩm"><option value="">Tất cả sản phẩm</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <label className="order-filter-field"><span className="order-filter-label">Tình trạng liên hệ</span><select className="select-filter" value={contactFilter} onChange={event => onContact(event.target.value)} aria-label="Tình trạng liên hệ"><option value="">Tất cả liên hệ</option><option value="uncontacted">Chưa liên hệ</option><option value="contacted">Đã liên hệ</option></select></label>
    </div>
    <span className="toolbar-end">Nhắc trước {windowDays} ngày</span>
  </div>;
}
