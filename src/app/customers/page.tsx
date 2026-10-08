'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '@/components/shared/app-icon';
import { ProductLogo } from '@/components/shared/product-logo';
import { formatMoney, orderFinancials } from '@/domain/money';
import { audienceFor, getCustomerStats, paginate, formatOrderCode, searchFilter } from '@/domain/orders';
import { formatDateLabel, remainingLabel } from '@/domain/dates';
import { subStatus } from '@/domain/subscriptions';
import { CustomerNotes } from '@/components/shared/customer-notes';
import { CustomerOrderHistory } from '@/features/customers/customer-order-history';
import { CustomerDuplicateReview } from '@/features/customers/customer-duplicate-review';
import { duplicateCustomerGroups } from '@/domain/customer-identity';
import Link from 'next/link';
import { CareSchedulePanel } from '@/features/communications/care-schedule-panel';

export default function CustomersPage() {
  return <Suspense fallback={<div className="data-notice" role="status">Đang tải khách hàng…</div>}><CustomersContent /></Suspense>;
}

function CustomersContent() {
  const { data, openDialog, today } = useTooldesk();
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get('id');
  const selectCustomer = (customerId: string | null) => router.push(customerId ? `/customers?id=${encodeURIComponent(customerId)}` : '/customers');
  const [tab, setTab] = useState<'all' | 'active' | 'vip' | 'duplicates'>('all');
  const [search, setSearch] = useState('');
  const [consentFilter, setConsentFilter] = useState('');
  const [page, setPage] = useState(1);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(/\s+/).slice(-2).map(s => s[0]).join('').toUpperCase();
  };

  const renderConsentBadge = (consent: string) => {
    if (consent === 'opted_in') return <span className="badge green"><i></i>Đã đồng ý</span>;
    if (consent === 'opted_out') return <span className="badge neutral"><i></i>Đã từ chối</span>;
    return <span className="badge amber"><i></i>Chưa xác nhận</span>;
  };

  const renderPaymentBadge = (order: typeof data.orders[0]) => {
    const f = orderFinancials(order, data.refunds);
    if (f.status === 'unpaid') return <span className="badge amber"><i></i>Chưa thanh toán</span>;
    if (f.status === 'refunded') return <span className="badge red"><i></i>Đã hoàn toàn bộ</span>;
    if (f.status === 'partially_refunded') return <span className="badge amber"><i></i>Hoàn một phần</span>;
    return <span className="badge green"><i></i>Đã thanh toán</span>;
  };

  // If viewing a specific customer (matching customerDetailPage in Tooldesk v0.2)
  if (selectedId) {
    const c = data.customers.find(cust => cust.id === selectedId);
    if (!c) {
      return (
        <div className="empty-state">
          <h3>Không tìm thấy khách hàng</h3>
          <p>Mã khách hàng không tồn tại trong hệ thống.</p>
          <button type="button" className="button" onClick={() => selectCustomer(null)}>
            Quay lại danh sách
          </button>
        </div>
      );
    }

    const stats = getCustomerStats(data, c.id, today);
    const customerSubs = data.subscriptions.filter(s => s.customerId === c.id);
    const customerOrders = data.orders
      .filter(o => o.customerId === c.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <>
        <button
          type="button"
          className="back-link text-link"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px', color: '#5963e8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onClick={() => selectCustomer(null)}
        >
          <AppIcon name="left" size={14} />
          <span>Danh sách khách hàng</span>
        </button>

        {/* Customer Header Panel */}
        <div className="panel customer-summary" style={{ marginBottom: '24px' }}>
          <div className="customer-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '24px', flexWrap: 'wrap' }}>
            <div className="customer-identity" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span className={`avatar ${c.color || 'lavender'} large`} style={{ width: '48px', height: '48px', fontSize: '20px' }}>
                {getInitials(c.name)}
              </span>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>{c.name}</h1>
                <p style={{ color: '#778197', fontSize: '12.5px', marginTop: '3px' }}>
                  Khách hàng từ {formatDateLabel(c.joinedAt, true)} · {c.id.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="page-actions">
              <button
                type="button"
                className="button"
                onClick={() => openDialog('customer', c.id)}
              >
                <AppIcon name="edit" size={15} />
                <span>Chỉnh sửa</span>
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => openDialog('create-order', { customerId: c.id })}
              >
                <AppIcon name="plus" size={16} />
                <span>Tạo đơn hàng</span>
              </button>
            </div>
          </div>

          <div className="customer-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--line)', padding: '18px 24px', gap: '16px', textAlign: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#778197', display: 'block' }}>Chi tiêu sau hoàn</span>
              <strong style={{ fontSize: '20px', color: '#505ad1', display: 'block', marginTop: '4px' }}>
                {formatMoney(stats.spend)}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#778197', display: 'block' }}>Đơn hàng</span>
              <strong style={{ fontSize: '20px', color: '#202a43', display: 'block', marginTop: '4px' }}>
                {customerOrders.length}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#778197', display: 'block' }}>Gói đang sử dụng</span>
              <strong style={{ fontSize: '20px', color: '#15775c', display: 'block', marginTop: '4px' }}>
                {stats.activeCount}
              </strong>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="customer-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: '24px', alignItems: 'start' }}>
          <div className="customer-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Subscriptions Panel */}
            <article className="panel">
              <div className="section-heading">
                <div>
                  <h2>Gói dịch vụ</h2>
                  <p>{customerSubs.length} gói trong hồ sơ khách hàng</p>
                </div>
              </div>

              {customerSubs.length > 0 ? (
                <div className="customer-packages" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 24px 24px' }}>
                  {customerSubs.map(s => {
                    const prod = data.products.find(p => p.id === s.productId);
                    const plan = prod?.plans.find(pl => pl.id === s.planId);
                    const status = subStatus(s, today, data.settings.reminderDays);

                    return (
                      <div
                        key={s.id}
                        className="customer-package"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px',
                          border: '1px solid var(--line)',
                          borderRadius: '11px',
                          background: '#fff'
                        }}
                      >
                        <div className="customer-package-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                          <ProductLogo name={prod?.name} color={prod?.color} large />
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>
                              {prod?.name} <span className="muted" style={{ fontWeight: 400 }}>· {plan?.name}</span>
                            </h3>
                            <div className="customer-package-period" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                              {s.cancelled ? (
                                <span className="badge neutral"><i></i>Đã dừng</span>
                              ) : status === 'expired' ? (
                                <span className="badge red"><i></i>Đã hết hạn</span>
                              ) : status === 'expiring' ? (
                                <span className="badge amber"><i></i>Sắp hết hạn</span>
                              ) : status === 'scheduled' ? (
                                <span className="badge blue"><i></i>Chưa bắt đầu</span>
                              ) : (
                                <span className="badge green"><i></i>Đang chạy</span>
                              )}
                              <span style={{ fontSize: '12px', color: '#778197' }}>
                                {formatDateLabel(s.startsAt, true)} → {formatDateLabel(s.expiresAt, true)}
                              </span>
                            </div>
                            {s.note && (
                              <div className="customer-package-account" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', fontSize: '12px' }}>
                                <span style={{ color: '#4f46e5', fontWeight: 600 }}>Tài khoản:</span>
                                <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '1px 7px', borderRadius: '4px', fontWeight: 500 }}>
                                  {s.note.replace(/^Tài khoản:\s*/i, '')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="customer-package-actions" style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexShrink: 0, flex: 'none' }}>
                          <button
                            type="button"
                            className="button small"
                            onClick={() => openDialog('subscription-detail', s.id)}
                          >
                            <span>Chi tiết</span>
                          </button>
                          <button
                            type="button"
                            className="button small primary"
                            onClick={() => openDialog('renew-subscription', s.id)}
                          >
                            <AppIcon name="refresh" size={13} />
                            <span>Gia hạn</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '28px 16px' }}>
                  <p>Chưa có gói dịch vụ nào. Tạo đơn đầu tiên để bắt đầu theo dõi.</p>
                </div>
              )}
            </article>

            {/* Orders History Panel */}
            <article className="panel">
              <div className="section-heading">
                <div>
                  <h2>Lịch sử đơn hàng</h2>
                  <p>Chi tiêu = tiền đã nhận − tiền đã hoàn. Bấm vào mã đơn để xem chi tiết.</p>
                </div>
              </div>

              {customerOrders.length > 0 ? (
                <>
                <div className="table-scroll desktop-data">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Sản phẩm</th>
                        <th>Ngày tạo</th>
                        <th>Giá trị</th>
                        <th>Thanh toán</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerOrders.map(o => {
                        const prod = data.products.find(p => p.id === o.productId);
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
                            </td>
                            <td>{prod?.name || 'Sản phẩm'}</td>
                            <td>{formatDateLabel(o.date, true)}</td>
                            <td className="nowrap">{formatMoney(o.price)}</td>
                            <td>{renderPaymentBadge(o)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <CustomerOrderHistory
                  orders={customerOrders}
                  products={data.products}
                  refunds={data.refunds}
                  renderPaymentBadge={renderPaymentBadge}
                  onOpenOrder={orderId => openDialog('order-detail', orderId)}
                />
                </>
              ) : (
                <div className="empty-state" style={{ padding: '28px 16px' }}>
                  <p>Chưa có đơn hàng nào.</p>
                </div>
              )}
            </article>
            <CareSchedulePanel customerId={c.id} />
          </div>

          {/* Aside Information */}
          <aside className="panel customer-contact-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 650 }}>Thông tin liên hệ</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => openDialog('customer', c.id)}
                aria-label="Sửa thông tin khách hàng"
              >
                <AppIcon name="edit" size={15} />
              </button>
            </div>

            <div className="detail-info" style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px' }}>
              <div>
                <small style={{ color: '#778197', display: 'block', marginBottom: '2px' }}>Số điện thoại</small>
                <strong style={{ fontSize: '13.5px', color: '#202a43' }}>{c.phone || 'Chưa có'}</strong>
              </div>
              <div>
                <small style={{ color: '#778197', display: 'block', marginBottom: '2px' }}>Email</small>
                <strong style={{ fontSize: '13.5px', color: '#202a43' }}>{c.email || 'Chưa có'}</strong>
              </div>
              <div>
                <small style={{ color: '#778197', display: 'block', marginBottom: '2px' }}>Nguồn khách hàng</small>
                <strong style={{ fontSize: '13.5px', color: '#202a43' }}>{c.source || 'Chưa xác định'}</strong>
              </div>
              <div>
                <small style={{ color: '#778197', display: 'block', marginBottom: '4px' }}>Nhận email ưu đãi</small>
                {renderConsentBadge(c.emailConsent)}
                <p className="consent-note" style={{ color: '#8894a8', fontSize: '11px', marginTop: '6px', lineHeight: 1.6 }}>
                  Nguồn xác nhận: {c.consentSource || 'Chưa ghi nhận'}<br />
                  Cập nhật: {formatDateLabel(c.consentUpdatedAt, true)}
                </p>
              </div>
              <div style={{ marginTop: '8px' }}>
                <CustomerNotes customer={c} title="Lịch sử ghi chú" />
              </div>
            </div>
          </aside>
        </div>
      </>
    );
  }

  // General Customers List
  const activeCount = data.customers.filter(c => getCustomerStats(data, c.id, today).activeCount > 0).length;
  const eligibleEmails = audienceFor(data, 'all', today).eligible.length;
  const duplicateGroups = duplicateCustomerGroups(data.customers);

  let items = data.customers.filter(c => {
    const stats = getCustomerStats(data, c.id, today);
    if (tab === 'active') return stats.activeCount > 0;
    if (tab === 'vip') return stats.spend >= 2000000;
    return true;
  });

  if (consentFilter) {
    items = items.filter(c => c.emailConsent === consentFilter);
  }

  if (search.trim()) {
    items = searchFilter(items, search, c => `${c.name} ${c.phone} ${c.email}`);
  }

  const paged = paginate(items, page, 8);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Khách hàng</h1>
          <p>Một hồ sơ, toàn bộ hành trình. Không bỏ lỡ một kết nối.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => openDialog('customer')}
          >
            <AppIcon name="plus" size={16} />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </div>

      {/* Inline metrics */}
      <div className="inline-metrics">
        <div className="inline-metric">
          <strong>{data.customers.length}</strong>
          <span>khách hàng</span>
        </div>
        <div className="inline-metric">
          <strong>{activeCount}</strong>
          <span>đang sử dụng</span>
        </div>
        <div className="inline-metric">
          <strong>{eligibleEmails}</strong>
          <span>email đủ điều kiện</span>
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
            Tất cả khách hàng
          </button>
          <button
            type="button"
            className={`tab ${tab === 'active' ? 'selected' : ''}`}
            onClick={() => { setTab('active'); setPage(1); }}
            aria-pressed={tab === 'active'}
          >
            Đang sử dụng
          </button>
          <button
            type="button"
            className={`tab ${tab === 'vip' ? 'selected' : ''}`}
            onClick={() => { setTab('vip'); setPage(1); }}
            aria-pressed={tab === 'vip'}
          >
            Chi tiêu từ 2 triệu
          </button>
          <button type="button" className={`tab ${tab === 'duplicates' ? 'selected' : ''}`} onClick={() => { setTab('duplicates'); setPage(1); }} aria-pressed={tab === 'duplicates'}>
            Hồ sơ nghi trùng{duplicateGroups.length ? ` (${duplicateGroups.length})` : ''}
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
              placeholder="Tìm tên, số điện thoại hoặc email..."
              aria-label="Tìm tên, số điện thoại hoặc email..."
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

          {tab !== 'duplicates' && <select
            className="select-filter"
            value={consentFilter}
            onChange={e => { setConsentFilter(e.target.value); setPage(1); }}
            aria-label="Quyền nhận email"
          >
            <option value="">Tất cả quyền nhận email</option>
            <option value="opted_in">Đã đồng ý nhận</option>
            <option value="unknown">Chưa xác nhận</option>
            <option value="opted_out">Đã từ chối nhận</option>
          </select>}

          <span className="toolbar-end">
            <AppIcon name="shield" size={12} />
            Chỉ gửi ưu đãi khi có sự đồng ý
          </span>
        </div>

        {/* Records */}
        {tab === 'duplicates' ? <CustomerDuplicateReview data={data} today={today} search={search} onView={customerId => selectCustomer(customerId)} /> : paged.items.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="table-scroll desktop-data">
              <table className="data-table customers-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Liên hệ</th>
                    <th>Gói đang dùng</th>
                    <th>Tổng đơn</th>
                    <th>Chi tiêu ròng</th>
                    <th>Nhận email</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.items.map(c => {
                    const stats = getCustomerStats(data, c.id, today);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="person-cell">
                            <span className={`avatar ${c.color || 'lavender'}`} aria-hidden="true">
                              {getInitials(c.name)}
                            </span>
                            <div>
                              <button
                                type="button"
                                className="text-link strong"
                                onClick={() => selectCustomer(c.id)}
                              >
                                {c.name}
                              </button>
                              <small>{c.source || ''}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="nowrap">{c.phone || '—'}</span>
                          <small style={{ display: 'block', fontSize: 12, marginTop: 5 }}>
                            {c.email || 'Chưa có email'}
                          </small>
                        </td>
                        <td>
                          {stats.activeCount > 0 ? (
                            <span className="badge green">{stats.activeCount} gói</span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>{stats.orders.length}</td>
                        <td className="money">{formatMoney(stats.spend)}</td>
                        <td>{renderConsentBadge(c.emailConsent)}</td>
                        <td>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => selectCustomer(c.id)}
                            aria-label={`Xem ${c.name}`}
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

            {/* Mobile Cards */}
            <div className="mobile-records">
              {paged.items.map(customer => {
                const stats = getCustomerStats(data, customer.id, today);
                return (
                  <article key={customer.id} className="record-card">
                    <div className="record-top">
                      <div className="person-cell">
                        <span className={`avatar ${customer.color || 'lavender'}`} aria-hidden="true">
                          {getInitials(customer.name)}
                        </span>
                        <div>
                          <strong className="strong">{customer.name}</strong>
                          <small>{customer.source || ''}</small>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => selectCustomer(customer.id)}
                        aria-label={`Hồ sơ ${customer.name}`}
                      >
                        <AppIcon name="chevron" size={18} />
                      </button>
                    </div>

                    <div className="record-contact">
                      <span>
                        <AppIcon name="phone" size={14} />
                        {customer.phone || 'Chưa có số điện thoại'}
                      </span>
                      <span>
                        <AppIcon name="mail" size={14} />
                        {customer.email || 'Chưa có email'}
                      </span>
                    </div>

                    <div className="record-stats">
                      <div>
                        <span>Gói đang dùng</span>
                        <strong>{stats.activeCount}</strong>
                      </div>
                      <div>
                        <span>Đơn hàng</span>
                        <strong>{stats.orders.length}</strong>
                      </div>
                      <div>
                        <span>Chi tiêu ròng</span>
                        <strong>{formatMoney(stats.spend)}</strong>
                      </div>
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
            <h3>{data.customers.length === 0 ? 'Chưa có khách hàng nào' : 'Không tìm thấy khách hàng'}</h3>
            <p style={{ maxWidth: '400px', margin: '6px auto 0' }}>
              {data.customers.length === 0
                ? 'Thêm khách hàng đầu tiên để bắt đầu lưu thông tin và lịch sử dùng tool AI.'
                : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
            </p>
            {data.customers.length === 0 && (
              <button
                type="button"
                className="button primary"
                style={{ marginTop: 16 }}
                onClick={() => openDialog('customer')}
              >
                <AppIcon name="plus" size={16} />
                <span>Thêm khách hàng đầu tiên</span>
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {tab !== 'duplicates' && paged.total > 0 && (
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
