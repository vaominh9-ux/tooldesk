'use client';

import { useBackdropDismiss } from './use-backdrop-dismiss';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { ProductLogo } from '@/components/shared/product-logo';
import { formatMoney } from '@/domain/money';
import { formatDateLabel, remainingLabel } from '@/domain/dates';
import { subStatus } from '@/domain/subscriptions';
import { formatOrderCode } from '@/domain/orders';
import { SubscriptionTrackingActions } from '@/features/subscriptions/subscription-tracking-actions';

export function SubscriptionDetailDialog({
  subscriptionId,
  onClose
}: {
  subscriptionId: string;
  onClose: () => void;
}) {
  const { data, openDialog, markContacted, updateSubscriptionNote, today } = useTooldesk();
  const backdropDismiss = useBackdropDismiss(onClose);
  const sub = data.subscriptions.find(s => s.id === subscriptionId);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteVal, setNoteVal] = useState(sub?.note || '');
  const [isSavingNote, setIsSavingNote] = useState(false);

  if (!sub) {
    return (
      <div className="dialog-overlay" {...backdropDismiss}>
        <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()}>
          <div className="dialog-shell">
            <header className="dialog-header">
              <div>
                <h2 id="dialog-title">Không tìm thấy gói</h2>
              </div>
              <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
                <AppIcon name="close" size={18} />
              </button>
            </header>
            <div className="dialog-content">
              <div className="empty-state">
                <p>Gói dịch vụ không tồn tại trong hệ thống.</p>
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

  const customer = data.customers.find(c => c.id === sub.customerId);
  const product = data.products.find(p => p.id === sub.productId);
  const plan = product?.plans.find(pl => pl.id === sub.planId);
  const status = subStatus(sub, today, data.settings.reminderDays);

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      await updateSubscriptionNote(sub.id, noteVal.trim());
      setIsEditingNote(false);
    } catch (error) {
      // The command already displays an error toast; keep the draft available for retry.
      console.error('Không thể lưu ghi chú gói:', error);
    } finally {
      setIsSavingNote(false);
    }
  };

  const relatedOrders = data.orders
    .filter(o => o.subscriptionId === sub.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(/\s+/).slice(-2).map(s => s[0]).join('').toUpperCase();
  };

  const renderBadge = () => {
    if (sub.cancelled) return <span className="badge neutral"><i></i>Đã dừng</span>;
    if (status === 'expired') return <span className="badge red"><i></i>Đã hết hạn</span>;
    if (status === 'expiring') return <span className="badge amber"><i></i>Sắp hết hạn</span>;
    if (status === 'scheduled') return <span className="badge blue"><i></i>Chưa bắt đầu</span>;
    return <span className="badge green"><i></i>Đang chạy</span>;
  };

  return (
    <div className="dialog-overlay" {...backdropDismiss}>
      <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()} aria-labelledby="dialog-title">
        <div className="dialog-shell">
          {/* Header */}
          <header className="dialog-header">
            <div>
              <h2 id="dialog-title">Chi tiết gói dịch vụ</h2>
              <p>{product?.name || 'Sản phẩm'} · {plan?.name || ''}</p>
            </div>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
              <AppIcon name="close" size={18} />
            </button>
          </header>

          {/* Content */}
          <div className="dialog-content">
            {/* Customer preview */}
            <div className="customer-preview">
              <span className={`avatar ${customer?.color || 'lavender'}`} aria-hidden="true">
                {getInitials(customer?.name)}
              </span>
              <div>
                <strong>{customer?.name || 'Khách đã xóa'}</strong>
                <small>{customer?.email || customer?.phone || 'Chưa có liên hệ'}</small>
              </div>
              {customer && (
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => openDialog('customer-detail', customer.id)}
                  aria-label="Mở hồ sơ khách"
                  title="Mở hồ sơ khách"
                >
                  <AppIcon name="external" size={16} />
                </button>
              )}
            </div>

            {/* Account / Email for this subscription */}
            <div style={{
              margin: '14px 0',
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AppIcon name="email" size={16} />
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>Tài khoản nhận tool:</strong>
                </div>
                {!isEditingNote && (
                  <button
                    type="button"
                    className="text-button"
                    style={{ fontSize: '12px', fontWeight: 600, color: '#4f46e5' }}
                    onClick={() => { setIsEditingNote(true); setNoteVal(sub.note || ''); }}
                  >
                    {sub.note ? 'Sửa' : '+ Thêm email riêng'}
                  </button>
                )}
              </div>

              {!isEditingNote ? (
                <div style={{ marginTop: '6px', fontSize: '13px' }}>
                  {sub.note ? (
                    <span style={{ fontWeight: 600, background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '5px', display: 'inline-block' }}>
                      {sub.note}
                    </span>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '12.5px' }}>
                      Đang dùng chung email khách: <strong>{customer?.email || 'Chưa có email'}</strong>
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    className="input"
                    style={{ flex: 1, fontSize: '13px', padding: '6px 10px', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    placeholder="Ví dụ: taikhoan-dung-tool@gmail.com"
                    value={noteVal}
                    onChange={e => setNoteVal(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="button small primary"
                    onClick={handleSaveNote}
                    disabled={isSavingNote}
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    className="button small"
                    onClick={() => setIsEditingNote(false)}
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>

            {/* Product detail */}
            <div className="detail-product">
              <ProductLogo name={product?.name} color={product?.color} large />
              <div>
                <h3>{product?.name || 'Sản phẩm'}</h3>
                <p>{plan?.name || ''}</p>
              </div>
            </div>

            {/* Status */}
            <div className="detail-status">
              <span>Trạng thái</span>
              {renderBadge()}
            </div>

            {/* Dates */}
            <div className="detail-dates">
              <div>
                <span>Ngày bắt đầu</span>
                <strong>{formatDateLabel(sub.startsAt, true)}</strong>
              </div>
              <div>
                <span>Ngày hết hạn</span>
                <strong>{formatDateLabel(sub.expiresAt, true)}</strong>
              </div>
            </div>

            {/* Hint banner */}
            <div className="date-summary">
              <div className="date-flow">
                <strong>{remainingLabel(sub, today)}</strong>
                <small>{formatDateLabel(sub.expiresAt, true)}</small>
              </div>
              <small>Hết hạn tại 00:00 ngày hiển thị, giờ Việt Nam (UTC+7).</small>
            </div>

            {/* Amount & contact info */}
            <div className="amount-breakdown">
              <div className="stat-line">
                <span>Giá kỳ hiện tại</span>
                <strong>{formatMoney(sub.price)}</strong>
              </div>
              <div className="stat-line">
                <span>Đã ghi nhận liên hệ</span>
                <strong>{sub.remindedAt ? formatDateLabel(sub.remindedAt, true) : 'Chưa liên hệ'}</strong>
              </div>
            </div>

            {/* Related Orders */}
            <div style={{ marginTop: '22px' }}>
              <div className="form-section-title" style={{ fontSize: '13px', fontWeight: 650, marginBottom: '10px' }}>
                Đơn hàng liên quan ({relatedOrders.length})
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: '9px', background: '#fff', overflow: 'hidden' }}>
                {relatedOrders.map(o => (
                  <div
                    key={o.id}
                    style={{
                      padding: '11px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--line)',
                      fontSize: '12.5px'
                    }}
                  >
                    <button
                      type="button"
                      className="text-button"
                      style={{ fontWeight: 600 }}
                      onClick={() => openDialog('order-detail', o.id)}
                    >
                      {formatOrderCode(o.id)}
                      <AppIcon name="chevron" size={14} />
                    </button>
                    <span style={{ color: '#778197' }}>
                      {formatDateLabel(o.date, true)} · <strong style={{ color: '#202a43' }}>{formatMoney(o.price)}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <SubscriptionTrackingActions subscriptionId={sub.id} />
          </div>

          {/* Footer */}
          <footer className="dialog-footer">
            <button type="button" className="button" onClick={onClose}>
              Đóng
            </button>
            {!sub.remindedAt && !sub.cancelled && (
              <button
                type="button"
                className="button"
                onClick={() => markContacted(sub.id)}
              >
                <AppIcon name="mail" size={14} />
                <span>Ghi nhận đã nhắc</span>
              </button>
            )}
            <button
              type="button"
              className="button primary"
              onClick={() => openDialog('renew-subscription', sub.id)}
            >
              <AppIcon name="refresh" size={15} />
              <span>{sub.cancelled ? 'Mở lại' : 'Gia hạn'}</span>
            </button>
          </footer>
        </div>
      </dialog>
    </div>
  );
}
