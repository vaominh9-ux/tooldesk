'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '@/components/shared/app-icon';
import { ProductLogo } from '@/components/shared/product-logo';
import { subStatus } from '@/domain/subscriptions';
import { formatDateLabel, remainingLabel } from '@/domain/dates';
import { paginate, searchFilter } from '@/domain/orders';
import { SubscriptionListFilters } from '@/features/subscriptions/subscription-list-filters';

export default function SubscriptionsPage() {
  const { data, today, openDialog, markContacted } = useTooldesk();

  const [tab, setTab] = useState<'all' | 'expiring' | 'expired' | 'active' | 'scheduled' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [contactFilter, setContactFilter] = useState('');
  const [page, setPage] = useState(1);

  const windowDays = data.settings?.reminderDays || 7;

  const countStatus = (key: string) =>
    data.subscriptions.filter(s => subStatus(s, today, windowDays) === key).length;

  let items = data.subscriptions.filter(s => {
    const status = subStatus(s, today, windowDays);
    if (tab === 'all') return true;
    return status === tab;
  });

  if (productFilter) {
    items = items.filter(s => s.productId === productFilter);
  }

  if (contactFilter === 'uncontacted') {
    items = items.filter(s => !s.remindedAt);
  } else if (contactFilter === 'contacted') {
    items = items.filter(s => s.remindedAt);
  }

  if (search.trim()) {
    items = searchFilter(items, search, s => {
      const cust = data.customers.find(c => c.id === s.customerId);
      const prod = data.products.find(p => p.id === s.productId);
      return `${cust?.name || ''} ${cust?.phone || ''} ${cust?.email || ''} ${prod?.name || ''}`;
    });
  }

  items.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

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

  const renderSubscriptionBadge = (sub: typeof data.subscriptions[0]) => {
    const status = subStatus(sub, today, windowDays);
    const badges: Record<string, { label: string; tone: string }> = {
      active: { label: 'Đang hoạt động', tone: 'green' },
      expiring: { label: 'Sắp hết hạn', tone: 'amber' },
      expired: { label: 'Đã hết hạn', tone: 'red' },
      cancelled: { label: 'Đã dừng', tone: 'neutral' },
      scheduled: { label: 'Chưa bắt đầu', tone: 'blue' }
    };
    const b = badges[status] || badges.active;
    return <span className={`badge ${b.tone}`}><i></i>{b.label}</span>;
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Gói dịch vụ</h1>
          <p>Nắm rõ thời hạn. Chăm sóc đúng lúc. Gia hạn liền mạch.</p>
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
            Tất cả <span>{data.subscriptions.length}</span>
          </button>
          <button
            type="button"
            className={`tab ${tab === 'expiring' ? 'selected' : ''}`}
            onClick={() => { setTab('expiring'); setPage(1); }}
            aria-pressed={tab === 'expiring'}
          >
            Sắp hết hạn <span>{countStatus('expiring')}</span>
          </button>
          <button
            type="button"
            className={`tab ${tab === 'expired' ? 'selected' : ''}`}
            onClick={() => { setTab('expired'); setPage(1); }}
            aria-pressed={tab === 'expired'}
          >
            Đã hết hạn <span>{countStatus('expired')}</span>
          </button>
          <button
            type="button"
            className={`tab ${tab === 'active' ? 'selected' : ''}`}
            onClick={() => { setTab('active'); setPage(1); }}
            aria-pressed={tab === 'active'}
          >
            Đang hoạt động <span>{countStatus('active')}</span>
          </button>
          <button
            type="button"
            className={`tab ${tab === 'scheduled' ? 'selected' : ''}`}
            onClick={() => { setTab('scheduled'); setPage(1); }}
            aria-pressed={tab === 'scheduled'}
          >
            Chưa bắt đầu <span>{countStatus('scheduled')}</span>
          </button>
          <button
            type="button"
            className={`tab ${tab === 'cancelled' ? 'selected' : ''}`}
            onClick={() => { setTab('cancelled'); setPage(1); }}
            aria-pressed={tab === 'cancelled'}
          >
            Đã dừng <span>{countStatus('cancelled')}</span>
          </button>
        </div>

        {/* Toolbar */}
        <SubscriptionListFilters
          search={search} productFilter={productFilter} contactFilter={contactFilter} products={data.products} windowDays={windowDays}
          onSearch={value => { setSearch(value); setPage(1); }}
          onProduct={value => { setProductFilter(value); setPage(1); }}
          onContact={value => { setContactFilter(value); setPage(1); }}
        />

        {/* Records */}
        {paged.items.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="table-scroll desktop-data">
              <table className="data-table subscriptions-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Gói dịch vụ</th>
                    <th>Ngày hết hạn</th>
                    <th>Trạng thái</th>
                    <th>Liên hệ</th>
                    <th><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.items.map(s => {
                    const cust = findCustomer(s.customerId);
                    const prod = findProduct(s.productId);
                    const plan = findPlan(s.productId, s.planId);

                    return (
                      <tr key={s.id}>
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
                            <ProductLogo name={prod?.name} color={prod?.color} />
                            <div>
                              <span className="strong">{prod?.name || 'Sản phẩm'}</span>
                              <small>{plan?.name || ''}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong className="strong nowrap">
                            {formatDateLabel(s.expiresAt, true)}
                          </strong>
                          <span className="sub-label">
                            {remainingLabel(s, today)}
                          </span>
                        </td>
                        <td>{renderSubscriptionBadge(s)}</td>
                        <td>
                          {s.remindedAt ? (
                            <span className="sub-label positive">
                              <AppIcon name="check" size={12} />
                              Đã liên hệ {formatDateLabel(s.remindedAt)}
                            </span>
                          ) : s.cancelled ? (
                            <span className="muted">Đã dừng</span>
                          ) : (
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => markContacted(s.id)}
                            >
                              <AppIcon name="mail" size={13} />
                              <span>Ghi nhận đã nhắc</span>
                            </button>
                          )}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="button small renew-button"
                              onClick={() => openDialog('renew-subscription', s.id)}
                            >
                              <AppIcon name="refresh" size={14} />
                              <span>{s.cancelled ? 'Mở lại' : 'Gia hạn'}</span>
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => openDialog('subscription-detail', s.id)}
                              aria-label="Xem chi tiết"
                            >
                              <AppIcon name="more" size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-records">
              {paged.items.map(sub => {
                const cust = findCustomer(sub.customerId);
                const prod = findProduct(sub.productId);
                const plan = findPlan(sub.productId, sub.planId);
                const status = subStatus(sub, today, windowDays);

                return (
                  <article key={sub.id} className="record-card">
                    <div className="record-top">
                      <div className="product-cell">
                        <ProductLogo name={prod?.name} color={prod?.color} />
                        <div>
                          <span className="strong">{prod?.name || 'Sản phẩm'}</span>
                          <small>{plan?.name || ''}</small>
                        </div>
                      </div>
                      {renderSubscriptionBadge(sub)}
                    </div>

                    <div className="person-cell">
                      <span className={`avatar ${cust?.color || 'lavender'}`} aria-hidden="true">
                        {getInitials(cust?.name)}
                      </span>
                      <div>
                        <Link
                          className="text-link subscription-customer-link"
                          href={`/customers?id=${cust?.id}`}
                        >
                          <span className="strong">{cust?.name || 'Khách đã xóa'}</span>
                          <small>{cust?.phone || cust?.email || ''}</small>
                        </Link>
                      </div>
                    </div>

                    <div className="record-expiry">
                      <span>
                        Hết hạn <strong>{formatDateLabel(sub.expiresAt, true)}</strong>
                      </span>
                      <strong className={status === 'expired' ? 'negative' : status === 'expiring' ? 'warning' : ''}>
                        {remainingLabel(sub, today)}
                      </strong>
                    </div>

                    <div className="record-bottom">
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => openDialog('subscription-detail', sub.id)}
                      >
                        Chi tiết <AppIcon name="chevron" size={14} />
                      </button>
                      <div className="record-actions">
                        {!sub.cancelled && (
                          sub.remindedAt ? (
                            <span className="contacted-note">
                              <AppIcon name="check" size={14} />
                              Đã nhắc
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="button small"
                              onClick={() => markContacted(sub.id)}
                              aria-label="Ghi nhận đã nhắc khách"
                            >
                              <AppIcon name="mail" size={15} />
                              <span>Đã nhắc</span>
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          className="button small primary"
                          onClick={() => openDialog('renew-subscription', sub.id)}
                        >
                          <AppIcon name="refresh" size={15} />
                          <span>{sub.cancelled ? 'Mở lại' : 'Gia hạn'}</span>
                        </button>
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
            <h3>{data.subscriptions.length === 0 ? 'Chưa có gói dịch vụ nào' : 'Không tìm thấy gói dịch vụ'}</h3>
            <p style={{ maxWidth: '400px', margin: '6px auto 0' }}>
              {data.subscriptions.length === 0
                ? 'Gói dịch vụ sẽ tự động được tạo và theo dõi hạn sử dụng khi bạn tạo đơn hàng mới.'
                : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
            </p>
            {data.subscriptions.length === 0 && (
              <button
                type="button"
                className="button primary"
                style={{ marginTop: 16 }}
                onClick={() => openDialog('create-order')}
              >
                <AppIcon name="plus" size={16} />
                <span>Tạo đơn hàng để cấp gói</span>
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

      <p className="report-note">
        “Ghi nhận đã nhắc” chỉ lưu việc bạn đã liên hệ khách. Khách không gia hạn: mở Chi tiết → Không gia hạn / Dừng theo dõi. Gói đã dừng vẫn có trong Tất cả và Đã dừng. Hết hạn lúc 00:00 ngày hiển thị, theo giờ Việt Nam.
      </p>
    </>
  );
}
