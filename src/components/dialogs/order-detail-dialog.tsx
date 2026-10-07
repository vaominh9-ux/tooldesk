'use client';

import React from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { ProductLogo } from '../shared/product-logo';
import { orderFinancials, formatMoney } from '@/domain/money';
import { formatDateLabel } from '@/domain/dates';

export function OrderDetailDialog({
  orderId,
  onClose
}: {
  orderId: string;
  onClose: () => void;
}) {
  const { data, openDialog, recordPayment, addToast } = useTooldesk();
  const order = data.orders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()}>
          <div className="dialog-shell">
            <header className="dialog-header">
              <div>
                <h2 id="dialog-title">Không tìm thấy đơn</h2>
              </div>
              <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
                <AppIcon name="close" size={18} />
              </button>
            </header>
            <div className="dialog-content">
              <div className="empty-state">
                <p>Mã đơn hàng không tồn tại trong hệ thống.</p>
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

  const customer = data.customers.find(c => c.id === order.customerId);
  const product = data.products.find(p => p.id === order.productId);
  const plan = product?.plans.find(pl => pl.id === order.planId);
  const f = orderFinancials(order, data.refunds);
  const orderRefunds = (data.refunds || [])
    .filter(r => r.orderId === order.id)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(/\s+/).slice(-2).map(s => s[0]).join('').toUpperCase();
  };

  const renderPaymentBadge = () => {
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

  const grossProfit = order.payment === 'paid' ? f.gross : (order.price - order.cost);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()} aria-labelledby="dialog-title">
        <div className="dialog-shell">
          {/* Header */}
          <header className="dialog-header">
            <div>
              <h2 id="dialog-title">{order.id}</h2>
              <p>
                {order.kind === 'renewal' ? 'Đơn gia hạn' : 'Đơn mua mới'} · Tạo ngày {formatDateLabel(order.date, true)}
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Đóng"
            >
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

            {/* Product detail */}
            <div className="detail-product">
              <ProductLogo name={product?.name || ''} color={product?.color} size="large" />
              <div>
                <h3>{product?.name || 'Sản phẩm'}</h3>
                <p>{plan?.name || 'Gói dịch vụ'}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="detail-dates">
              <div>
                <span>Bắt đầu kỳ của đơn</span>
                <strong>{formatDateLabel(order.startsAt, true)}</strong>
              </div>
              <div>
                <span>Hết hạn kỳ của đơn</span>
                <strong>{formatDateLabel(order.expiresAt, true)}</strong>
              </div>
            </div>

            {/* Status */}
            <div className="detail-status">
              <span>Thanh toán</span>
              {renderPaymentBadge()}
            </div>

            {/* Amount Breakdown */}
            <div className="amount-breakdown">
              <div className="stat-line">
                <span>Giá trị đơn gốc</span>
                <strong>{formatMoney(order.price)}</strong>
              </div>
              <div className="stat-line">
                <span>Đã nhận từ khách</span>
                <strong>{formatMoney(f.collected)}</strong>
              </div>
              <div className="stat-line">
                <span>Đã hoàn cho khách</span>
                <span className={f.refunded > 0 ? 'negative' : ''}>
                  {f.refunded > 0 ? `− ${formatMoney(f.refunded)}` : '0 ₫'}
                </span>
              </div>
              <div className="divider"></div>
              <div className="stat-line">
                <span>Thực thu sau hoàn</span>
                <strong>{formatMoney(f.net)}</strong>
              </div>
              <div className="stat-line">
                <span>Giá vốn ban đầu</span>
                <strong>{formatMoney(order.cost)}</strong>
              </div>
              <div className="stat-line">
                <span>Giá vốn đã thu hồi</span>
                <span className={f.costRecovered > 0 ? 'positive' : ''}>
                  {f.costRecovered > 0 ? `+ ${formatMoney(f.costRecovered)}` : '0 ₫'}
                </span>
              </div>
              <div className="divider"></div>
              <div className="stat-line">
                <span>{order.payment === 'paid' ? 'Lợi nhuận gộp sau hoàn' : 'Lợi nhuận dự kiến'}</span>
                <span className={`strong ${grossProfit < 0 ? 'negative' : 'positive'}`}>
                  {formatMoney(grossProfit)}
                </span>
              </div>
            </div>

            {/* Payment note */}
            {order.payment === 'paid' && (
              <p className="dialog-note">
                Ngày nhận tiền: {formatDateLabel(order.paidAt || order.date, true)}
                {order.paidAtEstimated || !order.paidAt
                  ? ' · Tạm dùng ngày tạo đơn do dữ liệu cũ chưa lưu ngày thu.'
                  : ''}
              </p>
            )}

            {/* Refund Actions */}
            {order.payment === 'paid' && (f.remainingRefund > 0 || (f.refunded > 0 && f.remainingCost > 0)) && (
              <div className="refund-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                {f.remainingRefund > 0 && (
                  <button
                    type="button"
                    className="button danger"
                    onClick={() => openDialog('refund', { orderId: order.id, mode: 'refund' })}
                  >
                    <AppIcon name="refund" size={16} />
                    <span>Ghi nhận hoàn tiền</span>
                  </button>
                )}
                {f.refunded > 0 && f.remainingCost > 0 && (
                  <button
                    type="button"
                    className="button"
                    onClick={() => openDialog('refund', { orderId: order.id, mode: 'recovery' })}
                  >
                    <AppIcon name="wallet" size={16} />
                    <span>Thu hồi giá vốn</span>
                  </button>
                )}
              </div>
            )}

            {/* Refund history if any */}
            {orderRefunds.length > 0 && (
              <section className="refund-history" style={{ marginTop: '20px' }}>
                <div className="form-section-title" style={{ fontSize: '13px', fontWeight: 650, marginBottom: '10px' }}>
                  Lịch sử hoàn & thu hồi <span className="count-bubble" style={{ background: '#f0f2f8', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '4px' }}>{orderRefunds.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {orderRefunds.map(r => (
                    <article
                      key={r.id}
                      style={{
                        padding: '12px 14px',
                        border: '1px solid var(--line)',
                        borderRadius: '9px',
                        background: '#fcfcfe',
                        display: 'flex',
                        gap: '10px',
                        fontSize: '12px'
                      }}
                    >
                      <span style={{ color: r.amount > 0 ? '#af4141' : '#15775c', marginTop: '2px' }}>
                        <AppIcon name={r.amount > 0 ? 'refund' : 'wallet'} size={16} />
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>{r.amount > 0 ? `Hoàn ${formatMoney(r.amount)}` : 'Thu hồi giá vốn'}</span>
                          <span style={{ color: '#8894a9', fontWeight: 400 }}>{formatDateLabel(r.date, true)}</span>
                        </div>
                        <p style={{ margin: '3px 0 0', color: '#55637a' }}>{r.reason}</p>
                        {r.costRecovered > 0 && (
                          <small style={{ color: '#15775c', display: 'block', marginTop: '2px' }}>
                            Thu hồi giá vốn: {formatMoney(r.costRecovered)}
                          </small>
                        )}
                        <small style={{ color: '#8a95aa', display: 'block', marginTop: '3px' }}>
                          {r.actor} · {r.method === 'bank' ? 'Chuyển khoản' : r.method === 'cash' ? 'Tiền mặt' : r.method === 'wallet' ? 'Ví điện tử' : 'Khác'}
                          {r.reference ? ` · ${r.reference}` : ''}
                        </small>
                        {r.serviceAction === 'end' && (
                          <small style={{ color: '#b14949', display: 'block', marginTop: '2px' }}>
                            Kỳ dịch vụ đã được kết thúc / khôi phục kỳ trước.
                          </small>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <p className="dialog-note">
              Không sửa hoặc xóa giá trị giao dịch gốc. Hoàn tiền được ghi thành phiếu riêng; ghi nhận ở đây không tự chuyển tiền.
            </p>

            {/* Note */}
            {order.note && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Ghi chú</div>
                <p style={{ padding: '10px 12px', background: '#f8f9fc', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '12.5px', color: '#525f78' }}>
                  {order.note}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="dialog-footer">
            <button type="button" className="button" onClick={onClose}>
              Đóng
            </button>

            {order.payment === 'unpaid' ? (
              <button
                type="button"
                className="button primary"
                onClick={async () => {
                  try { await recordPayment(order.id); onClose(); } catch (error) { addToast('Không thể thu tiền', error instanceof Error ? error.message : 'Lỗi lưu dữ liệu.', 'error'); }
                }}
              >
                <AppIcon name="wallet" size={15} />
                <span>Ghi nhận đã nhận tiền</span>
              </button>
            ) : (
              order.subscriptionId && (
                <button
                  type="button"
                  className="button primary"
                  onClick={() => openDialog('subscription-detail', order.subscriptionId)}
                >
                  <span>Xem gói dịch vụ</span>
                  <AppIcon name="chevron" size={15} />
                </button>
              )
            )}
          </footer>
        </div>
      </dialog>
    </div>
  );
}
