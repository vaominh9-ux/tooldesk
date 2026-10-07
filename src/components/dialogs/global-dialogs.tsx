'use client';

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
import { PlanDialog } from './plan-dialog';
import { PaymentConfirmDialog } from './payment-confirm-dialog';
import { SearchDialog } from './search-dialog';

export function GlobalDialogs() {
  const { data, dialog, closeDialog, toasts, removeToast, resetData, openDialog } = useTooldesk();
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

  const orderId =
    typeof dialog.payload === 'string'
      ? dialog.payload
      : dialog.payload?.orderId || dialog.payload?.id || '';

  const customerId =
    typeof dialog.payload === 'string'
      ? dialog.payload
      : dialog.payload?.customerId || dialog.payload?.id || '';

  const subscriptionId =
    typeof dialog.payload === 'string'
      ? dialog.payload
      : dialog.payload?.subscriptionId || dialog.payload?.id || '';

  const defaultCustomerId =
    typeof dialog.payload === 'string' && dialog.payload.startsWith('kh-')
      ? dialog.payload
      : dialog.payload?.customerId;
  const defaultProductId = typeof dialog.payload === 'string' && data.products.some(product => product.id === dialog.payload) ? dialog.payload : dialog.payload?.productId;

  return (
    <>
      {/* Toast Stack */}
      <div className="ui-toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto p-[12px_16px] rounded-[10px] shadow-lg border flex items-start gap-[10px] animate-slide-up bg-white text-[#202a43] ${
              t.type === 'success'
                ? 'border-[#c7eedd]'
                : t.type === 'error'
                ? 'border-[#fbd0d0]'
                : 'border-[#e8ebf2]'
            }`}
          >
            <div className="mt-[2px]">
              {t.type === 'success' && <AppIcon name="circleCheck" size={17} className="text-[#15775c]" />}
              {t.type === 'error' && <AppIcon name="close" size={17} className="text-[#af4141]" />}
              {(!t.type || t.type === 'info') && <AppIcon name="info" size={17} className="text-[#5963e8]" />}
            </div>
            <div className="flex-1 min-w-0">
              <strong className="text-[12.5px] block leading-tight">{t.title}</strong>
              {t.message && <p className="text-[11.5px] text-[#778197] mt-[2px] leading-snug">{t.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label="Đóng thông báo"
              className="text-[#9fa6b6] hover:text-[#202a43] p-[4px] -mr-[6px] -mt-[4px]"
            >
              <AppIcon name="close" size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Active Modal */}
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
          key={`${orderId}:refund`}
          orderId={orderId}
          isRecovery={dialog.payload?.mode === 'recovery'}
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
          orderId={orderId}
          onClose={closeDialog}
        />
      )}

      {dialog.type === 'customer-detail' && (
        <CustomerDetailDialog
          customerId={customerId}
          onClose={closeDialog}
        />
      )}

      {dialog.type === 'subscription-detail' && (
        <SubscriptionDetailDialog
          subscriptionId={subscriptionId}
          onClose={closeDialog}
        />
      )}

      {dialog.type === 'product' && (
        <ProductDialog
          onClose={closeDialog}
        />
      )}
      {dialog.type === 'search' && <SearchDialog onClose={closeDialog} />}
      {dialog.type === 'plan' && <PlanDialog key={typeof dialog.payload === 'string' ? dialog.payload : dialog.payload?.planId} planId={typeof dialog.payload === 'string' ? dialog.payload : dialog.payload?.planId || ''} onClose={closeDialog} />}
      {dialog.type === 'campaign' && (() => {
        const isCampaignId = typeof dialog.payload === 'string' && data.campaigns.some(c => c.id === dialog.payload);
        const campaignId = isCampaignId ? dialog.payload : dialog.payload?.id;
        const segment = !isCampaignId && typeof dialog.payload === 'string' ? dialog.payload : dialog.payload?.segment;
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
        <div className="dialog-overlay center" onClick={closeDialog}>
          <dialog id="active-dialog" className="modal small-modal" open onClick={e => e.stopPropagation()}>
            <div className="dialog-shell">
              <header className="dialog-header">
                <div>
                  <h2 id="dialog-title">Khôi phục dữ liệu mẫu?</h2>
                  <p>Các thay đổi trong trình duyệt này sẽ bị xóa.</p>
                </div>
                <button type="button" className="icon-button" onClick={closeDialog} aria-label="Đóng">
                  <AppIcon name="close" size={19} />
                </button>
              </header>
              <div className="dialog-content">
                <div className="hint-banner amber">
                  <AppIcon name="warning" size={18} />
                  <span>
                    Đơn mới, khách mới, lần gia hạn và bản nháp do bạn tạo trong phiên trải nghiệm sẽ được thay bằng bộ dữ liệu mẫu ban đầu.
                  </span>
                </div>
                <p className="dialog-note">
                  Bạn có thể xuất dữ liệu mẫu ở Cài đặt trước khi khôi phục. Không ảnh hưởng đến tài khoản hoặc dữ liệu ở dịch vụ bên ngoài.
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
                  Khôi phục bản mẫu
                </button>
              </footer>
            </div>
          </dialog>
        </div>
      )}

      {dialog.type === 'activity' && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <dialog id="active-dialog" className="drawer" open onClick={e => e.stopPropagation()}>
            <div className="dialog-shell">
              <header className="dialog-header">
                <div>
                  <h2 id="dialog-title">Nhật ký hoạt động</h2>
                  <p>Ghi nhận thao tác trong bản mẫu tại trình duyệt này.</p>
                </div>
                <button type="button" className="icon-button" onClick={closeDialog} aria-label="Đóng">
                  <AppIcon name="close" size={18} />
                </button>
              </header>
              <div className="dialog-content">
                <div className="activity-list">
                  {data.activity.slice(0, 30).map((a, i) => {
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
        <div className="dialog-overlay center" onClick={closeDialog}>
          <dialog id="active-dialog" className="modal" open onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="dialog-shell">
              <header className="dialog-header">
                <div>
                  <h2 id="dialog-title">Làm quen với Tooldesk</h2>
                  <p>Bản giao diện dành cho vận hành kinh doanh tool AI.</p>
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
                    ['Gia hạn không mất ngày còn lại', 'Gói còn hạn được nối từ hạn cũ. Gói đã hết hạn bắt đầu lại từ ngày đang mô phỏng.'],
                    ['Chăm sóc có sự đồng ý', 'Mục Chăm sóc khách hàng lọc email đủ điều kiện và lưu nội dung nháp. Bản này không gửi tin thật.'],
                    ['Chế độ dữ liệu mẫu', 'Ngày mô phỏng cố định 06/10/2026. Dữ liệu lưu trên trình duyệt; chưa có đăng nhập, Supabase hoặc nhắc lịch tự động.']
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
