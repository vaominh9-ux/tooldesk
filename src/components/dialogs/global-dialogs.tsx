'use client';

import { useBackdropDismiss } from './use-backdrop-dismiss';

import React, { useEffect } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { CreateOrderDialog } from './create-order-dialog';
import { RenewDialog } from './renew-dialog';
import { RefundDialog } from './refund-dialog';
import { AppIcon } from '../shared/app-icon';

import { CustomerDialog } from './customer-dialog';
import { OrderDetailDialog } from './order-detail-dialog';
import { CustomerDetailDialog } from './customer-detail-dialog';
import { SubscriptionDetailDialog } from './subscription-detail-dialog';
import { ProductDialog } from './product-dialog';
import { CampaignDialog } from './campaign-dialog';
import { CareAppointmentDialog } from '@/features/communications/care-appointment-dialog';
import { EmptyState } from '@/components/shared/feedback';
import { PlanDialog } from './plan-dialog';
import { PaymentConfirmDialog } from './payment-confirm-dialog';
import { OrderDatesDialog } from '@/features/orders/order-dates-dialog';
import { SearchDialog } from './search-dialog';

export function GlobalDialogs() {
  const { data, pending, dialog, closeDialog, toasts, removeToast, resetData, openDialog } = useTooldesk();
  const backdropDismiss = useBackdropDismiss(closeDialog);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openDialog('search'); }
      if (event.key === 'Escape' && dialog.type) { event.preventDefault(); closeDialog(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [dialog.type, openDialog, closeDialog]);
  useEffect(() => {
    if (!dialog.type) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLDialogElement>('#active-dialog');
      panel?.setAttribute('aria-modal', 'true');
      panel?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea, button')?.focus();
    });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const panel = document.querySelector('#active-dialog');
      const controls = Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') || []).filter(control => control.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trapFocus);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', trapFocus); if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
  }, [dialog.type]);

  const payloadObj = typeof dialog.payload === 'object' && dialog.payload !== null ? dialog.payload : undefined;
  const payloadStr = typeof dialog.payload === 'string' ? dialog.payload : undefined;

  const orderId = payloadStr || payloadObj?.orderId || payloadObj?.id || '';
  const customerId = payloadStr || payloadObj?.customerId || payloadObj?.id || '';
  const subscriptionId = payloadStr || payloadObj?.subscriptionId || payloadObj?.id || '';

  const defaultCustomerId = payloadStr?.startsWith('kh-') ? payloadStr : payloadObj?.customerId;
  const defaultProductId =
    payloadStr && data.products.some(product => product.id === payloadStr)
      ? payloadStr
      : payloadObj?.productId;

  return (
    <>
      {pending && <div className="save-overlay" role="status" aria-live="polite">Đang lưu dữ liệu… Vui lòng chờ.</div>}
      {/* Toast Stack */}
      <div className="ui-toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`ui-toast ui-toast-${t.type || 'info'}`}
            role={t.type === 'error' ? 'alert' : undefined}
          >
            <AppIcon name={t.type === 'success' ? 'circleCheck' : t.type === 'warning' || t.type === 'error' ? 'warning' : 'info'} size={17} />
            <div className="ui-toast-copy">
              <strong>{t.title}</strong>
              {t.message && <p>{t.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label="Đóng thông báo"
              className="ui-toast-close"
            >
              <AppIcon name="close" size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Active Modal */}
      {dialog.type === 'order-dates' && <OrderDatesDialog key={orderId} orderId={orderId} onClose={closeDialog} />}
      {dialog.type === 'create-order' && (
        <CreateOrderDialog
          key={`${defaultCustomerId || ''}:${defaultProductId || ''}`}
          onClose={closeDialog}
          defaultCustomerId={defaultCustomerId}
          defaultProductId={defaultProductId}
        />
      )}

      {(dialog.type === 'renew' || dialog.type === 'renew-subscription') && (
        <RenewDialog
          key={subscriptionId}
          subscriptionId={subscriptionId}
          onClose={closeDialog}
        />
      )}

      {dialog.type === 'refund' && (
        <RefundDialog
          key={`${orderId}:${payloadObj?.mode === 'recovery' ? 'recovery' : 'refund'}`}
          orderId={orderId}
          isRecovery={payloadObj?.mode === 'recovery'}
          onClose={closeDialog}
        />
      )}

      {dialog.type === 'recover-cost' && (
        <RefundDialog
          key={`${orderId}:recovery`}
          orderId={orderId}
          isRecovery={true}
          onClose={closeDialog}
        />
      )}

      {dialog.type === 'pay-confirm' && (
        <PaymentConfirmDialog
          key={orderId}
          orderId={orderId}
          onClose={closeDialog}
        />
      )}

      {dialog.type === 'customer' && (
        <CustomerDialog
          key={customerId}
          customerId={customerId}
          onClose={closeDialog}
        />
      )}

      {dialog.type === 'order-detail' && (
        <OrderDetailDialog
          key={orderId}
          orderId={orderId}
          onClose={closeDialog}
        />
      )}

      {dialog.type === 'customer-detail' && (
        <CustomerDetailDialog
          key={customerId}
          customerId={customerId}
          onClose={closeDialog}
        />
      )}

      {dialog.type === 'subscription-detail' && (
        <SubscriptionDetailDialog
          key={subscriptionId}
          subscriptionId={subscriptionId}
          onClose={closeDialog}
        />
      )}

      {(dialog.type === 'product' || dialog.type === 'edit-product') && (
        <ProductDialog
          key={dialog.type === 'edit-product' ? (payloadStr || payloadObj?.productId || payloadObj?.id || 'edit') : 'new'}
          productId={dialog.type === 'edit-product' ? (payloadStr || payloadObj?.productId || payloadObj?.id) : undefined}
          onClose={closeDialog}
        />
      )}
      {dialog.type === 'care-appointment' && <CareAppointmentDialog key={payloadObj?.id || 'new'} id={payloadObj?.id} customerId={payloadObj?.customerId} onClose={closeDialog} />}
      {dialog.type === 'search' && <SearchDialog onClose={closeDialog} />}
      {dialog.type === 'plan' && <PlanDialog key={payloadStr || payloadObj?.planId || ''} planId={payloadStr || payloadObj?.planId || ''} onClose={closeDialog} />}
      {dialog.type === 'add-plan' && <PlanDialog key={payloadStr || payloadObj?.productId || ''} productId={payloadStr || payloadObj?.productId || ''} onClose={closeDialog} />}
      {dialog.type === 'campaign' && (() => {
        const isCampaignId = Boolean(payloadStr && data.campaigns.some(c => c.id === payloadStr));
        const campaignId = isCampaignId ? payloadStr : payloadObj?.id;
        const segment = !isCampaignId ? payloadStr : payloadObj?.segment;
        return (
          <CampaignDialog
            key={campaignId || segment || 'new'}
            campaignId={campaignId}
            segment={segment}
            onClose={closeDialog}
          />
        );
      })()}


      {dialog.type === 'reset' && (
        <div className="dialog-overlay center" {...backdropDismiss}>
          <dialog id="active-dialog" className="modal small-modal" open onClick={e => e.stopPropagation()}>
            <div className="dialog-shell">
              <header className="dialog-header">
                <div>
                  <h2 id="dialog-title">Làm sạch dữ liệu bán thật?</h2>
                  <p>Hệ thống sẽ làm mới về trạng thái sẵn sàng vận hành.</p>
                </div>
                <button type="button" className="icon-button" onClick={closeDialog} aria-label="Đóng">
                  <AppIcon name="close" size={19} />
                </button>
              </header>
              <div className="dialog-content">
                <div className="hint-banner amber">
                  <AppIcon name="warning" size={18} />
                  <span>
                    Toàn bộ đơn hàng, khách hàng, gói đăng ký và nhật ký sẽ được xóa sạch về 0. Danh mục 5 sản phẩm AI và bảng giá sẽ được giữ nguyên để bạn bắt đầu bán ngay.
                  </span>
                </div>
                <p className="dialog-note">
                  Bạn có thể bấm &ldquo;Xuất sao lưu (.json)&rdquo; ở mục Cài đặt trước khi làm sạch để lưu lại dữ liệu nếu cần.
                </p>
              </div>
              <footer className="dialog-footer">
                <button type="button" className="button" onClick={closeDialog}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="button danger"
                  onClick={() => {
                    resetData();
                    closeDialog();
                  }}
                >
                  Xác nhận làm sạch
                </button>
              </footer>
            </div>
          </dialog>
        </div>
      )}

      {dialog.type === 'activity' && (
        <div className="dialog-overlay" {...backdropDismiss}>
          <dialog id="active-dialog" className="drawer" open aria-modal="true" aria-labelledby="dialog-title" onClick={e => e.stopPropagation()}>
            <div className="dialog-shell">
              <header className="dialog-header">
                <div>
                  <h2 id="dialog-title">Nhật ký hoạt động</h2>
                  <p>Lịch sử giao dịch và biến động hệ thống.</p>
                </div>
                <button type="button" className="icon-button" onClick={closeDialog} aria-label="Đóng">
                  <AppIcon name="close" size={18} />
                </button>
              </header>
              <div className="dialog-content">
                <p className="dialog-note">{data.activity.length} hoạt động gần đây</p>
                <div className="activity-list">
                  {data.activity.length === 0 && <EmptyState title="Chưa có hoạt động" description="Các thao tác lưu thành công sẽ xuất hiện tại đây." />}
                  {data.activity.map((a, i) => {
                    const icons: Record<string, string> = {
                      payment: 'wallet',
                      renewal: 'refresh',
                      reminder: 'mail',
                      created: 'plus',
                      campaign: 'megaphone',
                      updated: 'edit',
                      refund: 'refund',
                      cost_recovery: 'wallet'
                    };
                    return (
                      <div key={a.id} className="activity-row">
                        <span className={`activity-symbol ${i === 0 ? 'highlight' : ''}`}>
                          <AppIcon name={icons[a.type] || 'check'} size={16} />
                        </span>
                        <div>
                          <strong>{a.title}</strong>
                          <p>{a.description}</p>
                          <small>
                            {a.at
                              ? new Intl.DateTimeFormat('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                  timeZone: 'Asia/Ho_Chi_Minh'
                                }).format(new Date(a.at))
                              : 'Vừa xong'}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <footer className="dialog-footer">
                <button type="button" className="button" onClick={closeDialog}>
                  Đóng
                </button>
              </footer>
            </div>
          </dialog>
        </div>
      )}

      {dialog.type === 'help' && (
        <div className="dialog-overlay center" {...backdropDismiss}>
          <dialog id="active-dialog" className="modal" open onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="dialog-shell">
              <header className="dialog-header">
                <div>
                  <h2 id="dialog-title">Làm quen với Tooldesk</h2>
                  <p>Hệ thống quản lý và vận hành kinh doanh tool AI.</p>
                </div>
                <button type="button" className="icon-button" onClick={closeDialog} aria-label="Đóng">
                  <AppIcon name="close" size={18} />
                </button>
              </header>
              <div className="dialog-content">
                <div className="help-list">
                  {[
                    ['Bắt đầu từ Tổng quan', 'Danh sách cần xử lý tập trung gói sắp hết hạn, gói quá hạn và các đơn chưa thanh toán.'],
                    ['Tạo đơn trong một khung', 'Chọn khách hoặc thêm mới ngay trong form, chọn gói, kiểm tra ngày và lưu.'],
                    ['Gia hạn không mất ngày còn lại', 'Gói còn hạn được nối từ hạn cũ. Gói đã hết hạn bắt đầu lại từ ngày hôm nay.'],
                    ['Chăm sóc có sự đồng ý', 'Mục Chăm sóc khách hàng tự động phân nhóm và tạo nội dung email ưu đãi chuẩn xác.'],
                    ['Vận hành trực tuyến', 'Dữ liệu được cập nhật theo thời gian thực tại múi giờ Việt Nam (UTC+7). Có thể sao lưu tệp JSON bất cứ lúc nào.']
                  ].map(([title, text], i) => (
                    <div key={i} className="help-item">
                      <span>{i + 1}</span>
                      <div>
                        <h3>{title}</h3>
                        <p>{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <footer className="dialog-footer">
                <button type="button" className="button" onClick={closeDialog}>
                  Đóng
                </button>
              </footer>
            </div>
          </dialog>
        </div>
      )}
    </>
  );
}
