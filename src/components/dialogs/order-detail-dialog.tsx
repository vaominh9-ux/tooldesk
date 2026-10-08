'use client';

import { useBackdropDismiss } from './use-backdrop-dismiss';

import React, { useState, useEffect } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { orderFinancials, formatMoney } from '@/domain/money';
import { formatDateLabel, addDuration } from '@/domain/dates';
import { formatOrderCode } from '@/domain/orders';
import { orderEditPolicy } from '@/domain/order-edit-policy';

export function OrderDetailDialog({
  orderId,
  onClose
}: {
  orderId: string;
  onClose: () => void;
}) {
  const { data, openDialog, recordPayment, updateOrder, addToast } = useTooldesk();
  const backdropDismiss = useBackdropDismiss(onClose);
  const order = data.orders.find(o => o.id === orderId);

  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(order?.price || 0);
  const [editCost, setEditCost] = useState(order?.cost || 0);
  const [editStartsAt, setEditStartsAt] = useState(order?.startsAt || '');
  const [editExpiresAt, setEditExpiresAt] = useState(order?.expiresAt || '');
  const [editPayment, setEditPayment] = useState<'paid' | 'unpaid'>(order?.payment || 'paid');
  const [editPlanId, setEditPlanId] = useState(order?.planId || '');
  const [editNote, setEditNote] = useState(order?.note || '');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [orderNoteVal, setOrderNoteVal] = useState(order?.note || '');
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (order) {
      setEditPrice(order.price);
      setEditCost(order.cost);
      setEditStartsAt(order.startsAt);
      setEditExpiresAt(order.expiresAt);
      setEditPayment(order.payment);
      setEditPlanId(order.planId);
      setEditNote(order.note || '');
    }
  }, [order?.id, isEditing]);

  if (!order) {
    return (
      <div className="dialog-overlay" {...backdropDismiss}>
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
  const editPolicy = orderEditPolicy(data, order);
  const orderRefunds = (data.refunds || [])
    .filter(r => r.orderId === order.id)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(/\s+/).slice(-2).map(s => s[0]).join('').toUpperCase();
  };

  const handleEditPlanChange = (newPlanId: string) => {
    setEditPlanId(newPlanId);
    const pl = product?.plans.find(p => p.id === newPlanId);
    if (pl) {
      setEditPrice(pl.price);
      setEditCost(pl.cost);
      if (editStartsAt) {
        try {
          setEditExpiresAt(addDuration(editStartsAt, pl.duration, pl.unit));
        } catch (error) {
          setEditError(error instanceof Error ? error.message : 'Ngày bắt đầu không hợp lệ.');
        }
      }
    }
  };

  const handleEditStartsAtChange = (newStartsAt: string) => {
    setEditStartsAt(newStartsAt);
    const pl = product?.plans.find(p => p.id === editPlanId);
    if (pl && newStartsAt) {
      try {
        setEditExpiresAt(addDuration(newStartsAt, pl.duration, pl.unit));
      } catch (error) {
        setEditError(error instanceof Error ? error.message : 'Ngày bắt đầu không hợp lệ.');
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setEditError('');
    setSaving(true);
    try {
      await updateOrder({
        orderId: order.id,
        price: Number(editPrice),
        cost: Number(editCost),
        startsAt: editStartsAt,
        expiresAt: editExpiresAt,
        payment: editPayment,
        planId: editPlanId,
        note: editNote.trim()
      });
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Không thể lưu thay đổi.');
    } finally {
      setSaving(false);
    }
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
    <div className="dialog-overlay" {...backdropDismiss}>
      <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()} aria-labelledby="dialog-title">
        {isEditing ? (
          <form className="dialog-shell" onSubmit={handleSaveEdit}>
            <header className="dialog-header">
              <div>
                <h2 id="dialog-title">Sửa đơn {formatOrderCode(order.id)}</h2>
                <p>Chỉnh sửa giá tiền, hạn dịch vụ, thanh toán hoặc ghi chú đơn.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsEditing(false)}
                aria-label="Đóng chỉnh sửa"
              >
                <AppIcon name="close" size={18} />
              </button>
            </header>

            <div className="dialog-content">
              {editError && (
                <div className="dialog-error" role="alert">
                  {editError}
                </div>
              )}
              {editPolicy.reason && <p className="hint-banner neutral">{editPolicy.reason} Bạn vẫn có thể sửa ghi chú.</p>}

              {/* Customer preview (read-only) */}
              <div className="customer-preview" style={{ marginBottom: 16 }}>
                <span className={`avatar ${customer?.color || 'lavender'}`} aria-hidden="true">
                  {getInitials(customer?.name)}
                </span>
                <div>
                  <strong>{customer?.name || 'Khách đã xóa'}</strong>
                  <small>{customer?.email || customer?.phone || 'Chưa có liên hệ'}</small>
                </div>
              </div>

              {/* Plan selection */}
              <div className="form-grid">
                <label className="field">
                  <span>Sản phẩm</span>
                  <input
                    type="text"
                    value={product?.name || 'Sản phẩm'}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b' }}
                  />
                </label>

                <label className="field">
                  <span>Gói dịch vụ</span>
                  <select
                    value={editPlanId}
                    disabled={editPolicy.locked}
                    onChange={e => handleEditPlanChange(e.target.value)}
                    required
                  >
                    {product?.plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Dates */}
              <div className="form-grid">
                <label className="field">
                  <span>Ngày bắt đầu</span>
                  <input
                    type="date"
                    value={editStartsAt}
                    disabled={editPolicy.locked || editPolicy.continuousRenewal}
                    required
                    onChange={e => handleEditStartsAtChange(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Ngày hết hạn</span>
                  <input
                    type="date"
                    value={editExpiresAt}
                    disabled={editPolicy.locked}
                    required
                    onChange={e => setEditExpiresAt(e.target.value)}
                  />
                </label>
              </div>

              {/* Financials */}
              <div className="form-grid">
                <label className="field">
                  <span>Giá bán</span>
                  <div className="input-prefix">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      required
                      value={editPrice}
                      disabled={editPolicy.locked}
                      onChange={e => setEditPrice(Number(e.target.value))}
                    />
                    <span>₫</span>
                  </div>
                </label>

                <label className="field">
                  <span>Giá vốn</span>
                  <div className="input-prefix">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      required
                      value={editCost}
                      disabled={editPolicy.locked}
                      onChange={e => setEditCost(Number(e.target.value))}
                    />
                    <span>₫</span>
                  </div>
                </label>
              </div>

              <label className="field">
                <span>Trạng thái thanh toán</span>
                <select
                  value={editPayment}
                  disabled={editPolicy.locked}
                  onChange={e => setEditPayment(e.target.value as 'paid' | 'unpaid')}
                >
                  <option value="unpaid">Chưa thanh toán</option>
                  <option value="paid">Đã nhận đủ tiền</option>
                </select>
              </label>

              <label className="field">
                <span>Tài khoản nhận tool / Ghi chú đơn</span>
                <textarea
                  maxLength={500}
                  placeholder="Email/pass nhận tool hoặc thông tin lưu ý..."
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  rows={3}
                />
              </label>
            </div>

            <footer className="dialog-footer">
              <button
                type="button"
                className="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <AppIcon name="refresh" size={15} />
                    <span>Đang lưu…</span>
                  </>
                ) : (
                  <>
                    <AppIcon name="check" size={15} />
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </button>
            </footer>
          </form>
        ) : (
          <div className="dialog-shell">
            {/* Header */}
            <header className="dialog-header">
              <div>
                <h2 id="dialog-title">{formatOrderCode(order.id)}</h2>
                <p>
                  {order.kind === 'renewal' ? 'Đơn gia hạn' : 'Đơn mua mới'} · Tạo ngày {formatDateLabel(order.date, true)}
                </p>
              </div>
              <div className="order-detail-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="button small ghost"
                  onClick={() => setIsEditing(true)}
                  title="Chỉnh sửa đơn hàng"
                  style={{ height: 32, padding: '4px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <AppIcon name="edit" size={14} />
                  <span>Sửa đơn</span>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={onClose}
                  aria-label="Đóng"
                >
                  <AppIcon name="close" size={18} />
                </button>
              </div>
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

            {/* Tool account / Order note */}
            {order.note && (
              <div style={{ margin: '12px 0', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block', marginBottom: '2px', fontWeight: 600 }}>Tài khoản / Ghi chú đơn:</span>
                <strong style={{ color: '#1e293b' }}>{order.note}</strong>
              </div>
            )}

            {/* Product detail */}
            <div className="detail-product">
              <span className={`product-logo large ${product?.color || 'mint'}`} aria-hidden="true">
                {product?.symbol || '◈'}
              </span>
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

            {/* Note & History */}
            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '9px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <strong style={{ fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AppIcon name="clock" size={15} />
                  <span>Ghi chú đơn hàng</span>
                </strong>
                {!isEditingNote && (
                  <button
                    type="button"
                    className="text-button"
                    style={{ fontSize: '12px', fontWeight: 600, color: '#4f46e5' }}
                    onClick={() => { setIsEditingNote(true); setOrderNoteVal(order.note || ''); }}
                  >
                    {order.note ? 'Sửa' : '+ Thêm ghi chú'}
                  </button>
                )}
              </div>

              {!isEditingNote ? (
                order.note ? (
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {order.note}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Chưa có ghi chú cho đơn hàng này.
                  </p>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  <textarea
                    className="input"
                    rows={2}
                    value={orderNoteVal}
                    onChange={e => setOrderNoteVal(e.target.value)}
                    placeholder="Nhập ghi chú cho đơn này..."
                    style={{ fontSize: '12.5px', padding: '6px 8px', borderRadius: '6px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                      type="button"
                      className="button small"
                      onClick={() => setIsEditingNote(false)}
                      disabled={isSavingNote}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="button small primary"
                      disabled={isSavingNote}
                      onClick={async () => {
                        setIsSavingNote(true);
                        try {
                          await updateOrder({ orderId: order.id, note: orderNoteVal.trim() });
                          setIsEditingNote(false);
                          addToast('Đã lưu ghi chú đơn', undefined, 'success');
                        } catch (err) {
                          addToast('Lỗi lưu ghi chú', err instanceof Error ? err.message : 'Không thể lưu', 'error');
                        } finally {
                          setIsSavingNote(false);
                        }
                      }}
                    >
                      {isSavingNote ? 'Đang lưu...' : 'Lưu ghi chú'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="dialog-footer order-detail-footer">
            <button type="button" className="button" onClick={onClose}>
              Đóng
            </button>

            <button
              type="button"
              className="button ghost"
              aria-label="Sửa đơn hàng"
              onClick={() => setIsEditing(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <AppIcon name="edit" size={15} />
              <span className="order-edit-label">Sửa đơn hàng</span>
              <span className="order-edit-label-mobile">Sửa đơn</span>
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
                  className="button primary order-service-action"
                  onClick={() => openDialog('subscription-detail', order.subscriptionId)}
                >
                  <span>Xem gói dịch vụ</span>
                  <AppIcon name="chevron" size={15} />
                </button>
              )
            )}
          </footer>
        </div>
        )}
      </dialog>
    </div>
  );
}
