'use client';

import { useBackdropDismiss } from './use-backdrop-dismiss';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { customersWithEmail, normalizeCustomerEmail } from '@/domain/customer-identity';
import { CustomerEmailMatches } from '@/features/customers/customer-email-matches';

export function CustomerDialog({
  customerId,
  onClose
}: {
  customerId?: string;
  onClose: () => void;
}) {
  const { data, addCustomer, updateCustomer, addToast } = useTooldesk();
  const backdropDismiss = useBackdropDismiss(onClose);
  const existing = customerId ? data.customers.find(c => c.id === customerId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [source, setSource] = useState(existing?.source || 'Nhập thủ công');
  const [emailConsent, setEmailConsent] = useState<'unknown' | 'opted_in' | 'opted_out'>(
    existing?.emailConsent || 'opted_in'
  );
  const [consentSource, setConsentSource] = useState(existing?.consentSource || 'Khách mua tool AI (xác nhận mặc định)');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const emailChanged = !existing || normalizeCustomerEmail(email) !== normalizeCustomerEmail(existing.email);
  const emailMatches = emailChanged ? customersWithEmail(data.customers, email, existing?.id) : [];

  const handleEmailConsentChange = (val: 'unknown' | 'opted_in' | 'opted_out') => {
    setEmailConsent(val);
    if (val === 'opted_in' && !consentSource.trim()) {
      setConsentSource(source ? `Xác nhận qua ${source}` : 'Xác nhận qua tin nhắn');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailMatches.length) {
      setError('Email này đã có hồ sơ. Hãy xem hồ sơ hiện có hoặc nhập email khác.');
      return;
    }
    if (!name.trim()) {
      setError('Vui lòng nhập tên khách hàng.');
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Cần ít nhất email hoặc số điện thoại.');
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    let finalConsentSource = consentSource.trim();
    if (emailConsent === 'opted_in' && !finalConsentSource) {
      finalConsentSource = source ? `Xác nhận qua ${source}` : 'Xác nhận qua tin nhắn';
      setConsentSource(finalConsentSource);
    }
    setError('');
    setIsSubmitting(true);

    try {
      if (existing) {
        await updateCustomer(existing.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          source,
          notes: notes.trim(),
          emailConsent,
          consentSource: finalConsentSource
        });
      } else {
        await addCustomer({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          source,
          notes: notes.trim(),
          emailConsent,
          consentSource: finalConsentSource
        });
      }
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể lưu khách hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dialog-overlay" {...backdropDismiss}>
      <dialog
        id="active-dialog"
        className="drawer"
        open
        onClick={e => e.stopPropagation()}
        aria-labelledby="dialog-title"
      >
        <form className="dialog-shell" id="customer-form" onSubmit={handleSubmit}>
          {/* Header */}
          <header className="dialog-header">
            <div>
              <h2 id="dialog-title">
                {existing ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'}
              </h2>
              <p>Lưu liên hệ và quyền nhận ưu đãi một cách rõ ràng.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Đóng"
            >
              <AppIcon name="close" size={19} />
            </button>
          </header>

          {/* Content */}
          <div className="dialog-content" ref={contentRef}>
            {error && <div className="dialog-error" role="alert">{error}</div>}

            <label className="field">
              <span>Tên khách hàng</span>
              <input
                name="name"
                value={name}
                maxLength={80}
                required
                placeholder="Họ và tên"
                autoFocus
                onChange={e => setName(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={email}
                maxLength={120}
                placeholder="khach@example.com"
                onChange={e => setEmail(e.target.value)}
                aria-invalid={emailMatches.length > 0 || undefined}
                aria-describedby={emailMatches.length ? 'customer-email-matches' : undefined}
              />
            </label>
            <CustomerEmailMatches customers={emailMatches} />

            <label className="field">
              <span>Số điện thoại</span>
              <input
                name="phone"
                type="tel"
                value={phone}
                maxLength={25}
                placeholder="Số điện thoại liên hệ"
                onChange={e => setPhone(e.target.value)}
              />
              <small>Cần ít nhất email hoặc số điện thoại.</small>
            </label>

            <label className="field">
              <span>Nguồn khách hàng</span>
              <select
                name="source"
                value={source}
                onChange={e => setSource(e.target.value)}
              >
                <option value="Nhập thủ công">Nhập thủ công</option>
                <option value="Messenger">Messenger</option>
                <option value="Zalo">Zalo</option>
                <option value="Website">Website</option>
                <option value="Giới thiệu">Giới thiệu</option>
              </select>
            </label>

            <div className="divider"></div>

            <label className="field">
              <span>Quyền nhận email ưu đãi</span>
              <select
                name="emailConsent"
                value={emailConsent}
                onChange={e => {
                  const value = e.target.value;
                  if (value === 'unknown' || value === 'opted_in' || value === 'opted_out') handleEmailConsentChange(value);
                }}
              >
                <option value="unknown">Chưa xác nhận</option>
                <option value="opted_in">Đã đồng ý nhận</option>
                <option value="opted_out">Đã từ chối nhận</option>
              </select>
              <small>Không mặc định đồng ý chỉ vì khách đã mua hàng.</small>
            </label>

            <label className="field">
              <span>Nguồn xác nhận sự đồng ý</span>
              <input
                name="consentSource"
                value={consentSource}
                maxLength={150}
                placeholder="Ví dụ: form đăng ký ngày 06/10/2026"
                onChange={e => setConsentSource(e.target.value)}
              />
              <small>Bắt buộc khi chọn “Đã đồng ý nhận”. Chỉ ghi nhận khi có bằng chứng thực tế.</small>
            </label>

            <label className="field">
              <span>Ghi chú chăm sóc</span>
              <textarea
                name="notes"
                maxLength={50000}
                placeholder="Điều cần lưu ý khi chăm sóc khách..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </label>
          </div>

          {/* Footer */}
          <footer className="dialog-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
            {error && (
              <div
                className="dialog-error"
                role="alert"
                style={{
                  margin: 0,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
              >
                {error}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
              <button type="button" className="button" onClick={onClose} disabled={isSubmitting}>
                Hủy
              </button>
              <button type="submit" className="button primary" disabled={isSubmitting || emailMatches.length > 0}>
                <AppIcon name="check" size={15} />
                <span>{isSubmitting ? 'Đang lưu…' : 'Lưu khách hàng'}</span>
              </button>
            </div>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
