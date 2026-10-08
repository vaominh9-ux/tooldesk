'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '@/components/shared/app-icon';
import { orderFinancials, formatMoney } from '@/domain/money';
import { formatDateLabel } from '@/domain/dates';
import { paginate, formatOrderCode, searchFilter } from '@/domain/orders';
import Link from 'next/link';

export default function OrdersPage() {
  const { data, openDialog } = useTooldesk();

  const [tab, setTab] = useState<'all' | 'unpaid' | 'paid' | 'refunded'>('all');
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [page, setPage] = useState(1);

  const allOrders = data.orders.filter(o => o.status !== 'cancelled');

  const countStatus = (status: string) =>
    allOrders.filter(o => orderFinancials(o, data.refunds).status === status).length;

  const refundedCount = allOrders.filter(
    o => orderFinancials(o, data.refunds).refunded > 0
  ).length;

  // Filter orders
  let items = allOrders.filter(o => {
    const f = orderFinancials(o, data.refunds);
    if (tab === 'all') return true;
    if (tab === 'refunded') return f.refunded > 0;
    return f.status === tab;
  });

  if (productFilter) {
    items = items.filter(o => o.productId === productFilter);
  }

  if (kindFilter) {
    items = items.filter(o => o.kind === kindFilter);
  }

  if (search.trim()) {
    items = searchFilter(items, search, o => {
      const cust = data.customers.find(c => c.id === o.customerId);
      const prod = data.products.find(p => p.id === o.productId);
      return `${o.id} ${formatOrderCode(o.id)} ${cust?.name || ''} ${cust?.email || ''} ${cust?.phone || ''} ${prod?.name || ''}`;
    });
  }

  items.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id, undefined, { numeric: true }));

  const paged = paginate(items, page, 8);

  const findCustomer = (id: string) => data.customers.find(c => c.id === id);
  const findProduct = (id: string) => data.products.find(p => p.id === id);
  const findPlan = (pId: string, plId: string) => {
    const prod = data.products.find(p => p.id === pId);
    return prod?.plans.find(pl => pl.id === plId);
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(/\s+/).slice(-2).map(s => s[0]).join('').toUpperCase();
  };

  const renderPaymentBadge = (order: typeof data.orders[0]) => {
    const f = orderFinancials(order, data.refunds);
    if (f.status === 'unpaid') {
      return <span className="badge amber"><i></i>Chưa thanh toán</span>;
    }
    if (f.status === 'refunded') {
      return <span className="badge red"><i></i>Đã hoàn toàn bộ</span>;
    }
    if (f.status === 'partially_refunded') {
      return <span className="badge amber"><i></i>Hoàn một phần</span>;
    }
    return <span className="badge green"><i></i>Đã thanh toán</span>;
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Đơn hàng</h1>
          <p>Theo dõi giao dịch, thanh toán và hoàn tiền tại một nơi.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => openDialog('create-order')}
          >
            <AppIcon name="plus" size={16} />
            <span>Tạo đơn hàng</span>
          </button>
        </div>
      </div>

      <div className="panel records-panel">
        {/* Tabs */}
        <div className="tabs" role="group" aria-label="Lọc danh sách">
          <button
            type="button"
            className={`tab ${tab === 'all' ? 'selected' : ''}`}
            onClick={() => { setTab('all'); setPage(1); }}
            aria-pressed={tab === 'all'}
          >
            Tất cả <span>{allOrders.length}</span>
          </button>
          <button
            type="button"
            className={`tab ${tab === 'unpaid' ? 'selected' : ''}`}
            onClick={() => { setTab('unpaid'); setPage(1); }}
            aria-pressed={tab === 'unpaid'}
          >
            Chờ thu <span>{countStatus('unpaid')}</span>
          </button>
          <button
            type="button"
            className={`tab ${tab === 'paid' ? 'selected' : ''}`}
            onClick={() => { setTab('paid'); setPage(1); }}
            aria-pressed={tab === 'paid'}
          >
            Đã thu <span>{countStatus('paid')}</span>
          </button>
          <button
            type="button"
            className={`tab ${tab === 'refunded' ? 'selected' : ''}`}
            onClick={() => { setTab('refunded'); setPage(1); }}
            aria-pressed={tab === 'refunded'}
          >
            Hoàn tiền <span>{refundedCount}</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="list-toolbar">
          <label className="search-field">
            <AppIcon name="search" size={18} />
            <input
              id="list-search"
              type="search"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm mã đơn, tên, SĐT hoặc email..."
              aria-label="Tìm mã đơn, tên, SĐT hoặc email..."
              autoComplete="off"
            />
            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch('')}
                aria-label="Xóa tìm kiếm"
              >
                ×
              </button>
            )}
          </label>

          <select
            className="select-filter"
            value={productFilter}
            onChange={e => { setProductFilter(e.target.value); setPage(1); }}
            aria-label="Lọc sản phẩm"
          >
            <option value="">Tất cả sản phẩm</option>
            {data.products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            className="select-filter"
            value={kindFilter}
            onChange={e => { setKindFilter(e.target.value); setPage(1); }}
            aria-label="Loại đơn"
          >
            <option value="">Tất cả loại đơn</option>
            <option value="new">Mua mới</option>
            <option value="renewal">Gia hạn</option>
          </select>

          <button
            type="button"
            className="button small ghost toolbar-end"
            onClick={() => {
              setSearch('');
              setProductFilter('');
              setKindFilter('');
              setTab('all');
              setPage(1);
            }}
          >
            <AppIcon name="refresh" size={13} />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>

        {/* Records */}
        {paged.items.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="table-scroll desktop-data">
              <table className="data-table orders-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Sản phẩm</th>
                    <th className="align-right">Giá trị / thực thu</th>
                    <th>Thanh toán</th>
                    <th className="optional-column">Ngày tạo</th>
                    <th>
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.items.map(o => {
                    const cust = findCustomer(o.customerId);
                    const prod = findProduct(o.productId);
                    const plan = findPlan(o.productId, o.planId);
                    const financials = orderFinancials(o, data.refunds);

                    return (
                      <tr key={o.id}>
                        <td>
                          <button
                            type="button"
                            className="text-link order-number"
                            onClick={() => openDialog('order-detail', o.id)}
                            title={`Mã đơn: ${o.id}`}
                          >
                            {formatOrderCode(o.id)}
                          </button>
                          <span className="order-kind">
                            {o.kind === 'renewal' ? 'Gia hạn' : 'Mua mới'}
                          </span>
                        </td>
                        <td>
                          <div className="person-cell">
                            <span className={`avatar ${cust?.color || 'lavender'}`} aria-hidden="true">
                              {getInitials(cust?.name)}
                            </span>
                            <div>
                              <Link
                                className="text-link strong"
                                href={`/customers?id=${cust?.id}`}
                              >
                                {cust?.name || 'Khách đã xóa'}
                              </Link>
                              <small>{cust?.phone || cust?.email || ''}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="product-cell">
                            <span className={`product-logo ${prod?.color || 'mint'}`} aria-hidden="true">
                              {prod?.symbol || '✦'}
                            </span>
                            <div>
                              <span className="strong">{prod?.name || 'Sản phẩm'}</span>
                              <small>{plan?.name || ''}</small>
                            </div>
                          </div>
                        </td>
                        <td className="money align-right">
                          {formatMoney(o.price)}
                          {financials.refunded > 0 && (
                            <span className="sub-label refund-net">
                              Còn {formatMoney(financials.net)}
                            </span>
                          )}
                        </td>
                        <td>{renderPaymentBadge(o)}</td>
                        <td className="nowrap optional-column">
                          {formatDateLabel(o.date, true)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => openDialog('order-detail', o.id)}
                            aria-label={`Chi tiết ${o.id}`}
                          >
                            <AppIcon name="chevron" size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Record Cards */}
            <div className="mobile-records">
              {paged.items.map(o => {
                const cust = findCustomer(o.customerId);
                const prod = findProduct(o.productId);
                const plan = findPlan(o.productId, o.planId);
                const financials = orderFinancials(o, data.refunds);

                return (
                  <article key={o.id} className="record-card order-record">
                    <div className="record-top">
                      <button
                        type="button"
                        className="text-button order-number"
                        onClick={() => openDialog('order-detail', o.id)}
                        title={`Mã đơn: ${o.id}`}
                      >
                        {formatOrderCode(o.id)}
                        <AppIcon name="chevron" size={14} />
                      </button>
                      {renderPaymentBadge(o)}
                    </div>

                    <div className="person-cell">
                      <span className={`avatar ${cust?.color || 'lavender'}`} aria-hidden="true">
                        {getInitials(cust?.name)}
                      </span>
                      <div>
                        <Link
                          className="text-link strong"
                          href={`/customers?id=${cust?.id}`}
                        >
                          {cust?.name || 'Khách đã xóa'}
                        </Link>
                        <small>
                          {o.kind === 'renewal' ? 'Đơn gia hạn' : 'Đơn mua mới'}
                        </small>
                      </div>
                    </div>

                    <div className="record-product">
                      <div className="product-cell">
                        <span className={`product-logo ${prod?.color || 'mint'}`} aria-hidden="true">
                          {prod?.symbol || '✦'}
                        </span>
                        <div>
                          <span className="strong">{prod?.name || 'Sản phẩm'}</span>
                          <small>{plan?.name || ''}</small>
                        </div>
                      </div>
                      <strong className="record-amount">
                        {formatMoney(o.price)}
                      </strong>
                    </div>

                    {financials.refunded > 0 && (
                      <div className="record-refund">
                        <span>Đã hoàn {formatMoney(financials.refunded)}</span>
                        <strong>Còn thu {formatMoney(financials.net)}</strong>
                      </div>
                    )}

                    <div className="record-bottom">
                      <span>
                        <AppIcon name="calendar" size={14} />
                        {formatDateLabel(o.date, true)}
                      </span>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => openDialog('order-detail', o.id)}
                      >
                        Chi tiết đơn <AppIcon name="arrow" size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div className="empty-icon" style={{ margin: '0 auto 12px' }}>
              <AppIcon name="inbox" size={32} />
            </div>
            <h3>{allOrders.length === 0 ? 'Chưa có đơn hàng nào' : 'Không tìm thấy kết quả'}</h3>
            <p style={{ maxWidth: '400px', margin: '6px auto 0' }}>
              {allOrders.length === 0
                ? 'Bắt đầu bằng việc tạo đơn hàng đầu tiên cho khách hàng của bạn.'
                : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
            </p>
            {allOrders.length === 0 && (
              <button
                type="button"
                className="button primary"
                style={{ marginTop: 16 }}
                onClick={() => openDialog('create-order')}
              >
                <AppIcon name="plus" size={16} />
                <span>Tạo đơn hàng đầu tiên</span>
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {paged.total > 0 && (
          <div className="table-footer">
            <span>
              Hiển thị <strong>{(paged.page - 1) * paged.pageSize + 1}–{Math.min(paged.page * paged.pageSize, paged.total)}</strong> trong {paged.total} kết quả
            </span>
            <div className="pagination">
              <button
                type="button"
                className="icon-button"
                onClick={() => setPage(Math.max(1, paged.page - 1))}
                disabled={paged.page <= 1}
                aria-label="Trang trước"
              >
                <AppIcon name="left" size={17} />
              </button>
              <span>Trang {paged.page} / {paged.pages}</span>
              <button
                type="button"
                className="icon-button"
                onClick={() => setPage(Math.min(paged.pages, paged.page + 1))}
                disabled={paged.page >= paged.pages}
                aria-label="Trang sau"
              >
                <AppIcon name="chevron" size={17} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
