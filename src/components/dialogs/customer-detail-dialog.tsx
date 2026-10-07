'use client';

import React from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { getCustomerStats } from '@/domain/orders';
import { formatMoney } from '@/domain/money';
import { formatDateLabel, remainingLabel } from '@/domain/dates';
import { subStatus } from '@/domain/subscriptions';

export function CustomerDetailDialog({
  customerId,
  onClose
}: {
  customerId: string;
  onClose: () => void;
}) {
  const { data, openDialog, today } = useTooldesk();
  const customer = data.customers.find(c => c.id === customerId);

  if (!customer) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()}>
          <div className="dialog-shell">
            <header className="dialog-header">
              <div>
                <h2 id="dialog-title">Không tìm thấy khách hàng</h2>
              </div>
              <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
                <AppIcon name="close" size={18} />
              </button>
            </header>
            <div className="dialog-content">
              <div className="empty-state">
                <p>Khách hàng không tồn tại trong hệ thống.</p>
              </div>
            </div>
            <footer className="dialog-footer">
              <button type="button" className="button" onClick={onClose}>
                Đóng
              </button>
            </footer>
          </div>
        </dialog>
      </div>
    );
  }

  const stats = getCustomerStats(data, customer.id, today);
  const subs = data.subscriptions.filter(s => s.customerId === customer.id);
  const orders = data.orders.filter(o => o.customerId === customer.id);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(/\s+/).slice(-2).map(s => s[0]).join('').toUpperCase();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()} aria-labelledby="dialog-title">
        <div className="dialog-shell">
          {/* Header */}
          <header className="dialog-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 id="dialog-title">{customer.name}</h2>
                <span className="badge neutral" style={{ fontSize: '11px' }}>
                  {customer.source || 'Trực tiếp'}
                </span>
              </div>
              <p>
                Mã: {customer.id} · Gia nhập {formatDateLabel(customer.joinedAt, true)}
              </p>
            </div>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
              <AppIcon name="close" size={18} />
            </button>
          </header>

          {/* Content */}
          <div className="dialog-content">
            {/* Quick KPI stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ padding: '12px 8px', background: '#f8f9fc', border: '1px solid var(--line)', borderRadius: '10px' }}>
                <span style={{ fontSize: '11px', color: '#778197', display: 'block', fontWeight: 600 }}>Gói đang dùng</span>
                <strong style={{ fontSize: '18px', color: '#15775c', display: 'block', marginTop: '2px' }}>
                  {stats.activeCount}
                </strong>
              </div>
              <div style={{ padding: '12px 8px', background: '#f8f9fc', border: '1px solid var(--line)', borderRadius: '10px' }}>
                <span style={{ fontSize: '11px', color: '#778197', display: 'block', fontWeight: 600 }}>Tổng đơn hàng</span>
                <strong style={{ fontSize: '18px', color: '#202a43', display: 'block', marginTop: '2px' }}>
                  {orders.length}
                </strong>
              </div>
              <div style={{ padding: '12px 8px', background: '#f8f9fc', border: '1px solid var(--line)', borderRadius: '10px' }}>
                <span style={{ fontSize: '11px', color: '#778197', display: 'block', fontWeight: 600 }}>Tổng chi tiêu</span>
                <strong style={{ fontSize: '18px', color: '#505ad1', display: 'block', marginTop: '2px' }}>
                  {formatMoney(stats.spend)}
                </strong>
              </div>
            </div>

            {/* Contact details */}
            <div style={{ padding: '12px 14px', background: '#fcfcfe', border: '1px solid var(--line)', borderRadius: '9px', fontSize: '12.5px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#778197' }}>Số điện thoại:</span>
                <strong style={{ color: '#202a43' }}>{customer.phone || 'Chưa có'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#778197' }}>Email:</span>
                <span style={{ color: '#202a43' }}>{customer.email || 'Chưa có'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#778197' }}>Nhận email ưu đãi:</span>
                <span style={{ color: customer.emailConsent === 'opted_in' ? '#15775c' : '#778197' }}>
                  {customer.emailConsent === 'opted_in' ? 'Đã đồng ý nhận' : customer.emailConsent === 'opted_out' ? 'Từ chối' : 'Chưa xác nhận'}
                </span>
              </div>
              {customer.notes && (
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '6px', marginTop: '6px', color: '#525f78' }}>
                  <span style={{ color: '#778197', display: 'block', marginBottom: '2px' }}>Ghi chú:</span>
                  {customer.notes}
                </div>
              )}
            </div>

            {/* Active Subscriptions */}
            <div style={{ marginBottom: '22px' }}>
              <div className="form-section-title" style={{ fontSize: '13px', fontWeight: 650, marginBottom: '10px' }}>
                Các gói dịch vụ ({subs.length})
              </div>
              {subs.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#778197', fontStyle: 'italic' }}>Khách chưa đăng ký gói nào.</p>
              ) : (
                <div style={{ border: '1px solid var(--line)', borderRadius: '9px', overflow: 'hidden' }}>
                  {subs.map(sub => {
                    const product = data.products.find(p => p.id === sub.productId);
                    const plan = product?.plans.find(pl => pl.id === sub.planId);
                    const status = subStatus(sub, today, data.settings.reminderDays);

                    return (
                      <div
                        key={sub.id}
                        style={{
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid var(--line)',
                          fontSize: '12.5px',
                          background: '#fff'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#5963e8', fontWeight: 700 }}>{product?.symbol || '◈'}</span>
                            <strong style={{ color: '#202a43' }}>{product?.name}</strong>
                            <small style={{ color: '#778197' }}>({plan?.name})</small>
                          </div>
                          <span style={{ fontSize: '11.5px', color: '#778197', display: 'block', marginTop: '2px' }}>
                            Hạn dùng: {formatDateLabel(sub.expiresAt, true)} ({remainingLabel(sub, today)})
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="button small"
                            onClick={() => openDialog('subscription-detail', sub.id)}
                          >
                            <span>Chi tiết</span>
                          </button>
                          <button
                            type="button"
                            className="button small primary"
                            onClick={() => openDialog('renew-subscription', sub.id)}
                          >
                            <AppIcon name="refresh" size={12} />
                            <span>Gia hạn</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order History */}
            <div>
              <div className="form-section-title" style={{ fontSize: '13px', fontWeight: 650, marginBottom: '10px' }}>
                Lịch sử đơn hàng ({orders.length})
              </div>
              {orders.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#778197', fontStyle: 'italic' }}>Chưa có đơn hàng nào.</p>
              ) : (
                <div style={{ border: '1px solid var(--line)', borderRadius: '9px', overflow: 'hidden' }}>
                  {orders.map(order => {
                    const prod = data.products.find(p => p.id === order.productId);
                    return (
                      <div
                        key={order.id}
                        style={{
                          padding: '11px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid var(--line)',
                          fontSize: '12.5px',
                          background: '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className="text-button"
                            style={{ fontWeight: 650 }}
                            onClick={() => openDialog('order-detail', order.id)}
                            title="Xem chi tiết đơn này"
                          >
                            {order.id}
                            <AppIcon name="chevron" size={13} />
                          </button>
                          <span style={{ color: '#778197' }}>· {prod?.name}</span>
                          <span style={{ color: '#9fa6b6', fontSize: '11.5px' }}>({formatDateLabel(order.date, true)})</span>
                        </div>
                        <strong style={{ color: '#505ad1' }}>{formatMoney(order.price)}</strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="dialog-footer">
            <button type="button" className="button" onClick={onClose}>
              Đóng
            </button>
            <button
              type="button"
              className="button"
              onClick={() => openDialog('customer', customer.id)}
            >
              <AppIcon name="settings" size={14} />
              <span>Sửa thông tin</span>
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => openDialog('create-order', { customerId: customer.id })}
            >
              <AppIcon name="plus" size={14} />
              <span>Tạo đơn mới</span>
            </button>
          </footer>
        </div>
      </dialog>
    </div>
  );
}
