'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';

export function CustomerDialog({
  customerId,
  onClose
}: {
  customerId?: string;
  onClose: () => void;
}) {
  const { data, addCustomer, updateCustomer, addToast } = useTooldesk();
  const existing = customerId ? data.customers.find(c => c.id === customerId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [source, setSource] = useState(existing?.source || 'Nhập thủ công');
  const [emailConsent, setEmailConsent] = useState<'unknown' | 'opted_in' | 'opted_out'>(
    existing?.emailConsent || 'unknown'
  );
  const [consentSource, setConsentSource] = useState(existing?.consentSource || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên khách hàng.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Cần ít nhất email hoặc số điện thoại.');
      return;
    }
    if (emailConsent === 'opted_in' && !consentSource.trim()) {
      setError('Vui lòng nhập nguồn xác nhận sự đồng ý khi chọn "Đã đồng ý nhận".');
      return;
    }
    setError('');

    if (existing) {
      updateCustomer(existing.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        source,
        notes: notes.trim(),
        emailConsent,
        consentSource: consentSource.trim()
      });
    } else {
      addCustomer({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        source,
        notes: notes.trim(),
        emailConsent,
        consentSource: consentSource.trim()
      });
    }
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
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
          <div className="dialog-content">
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
              />
            </label>

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
                onChange={e => setEmailConsent(e.target.value as any)}
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
                maxLength={1000}
                placeholder="Điều cần lưu ý khi chăm sóc khách..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </label>
          </div>

          {/* Footer */}
          <footer className="dialog-footer">
            <button type="button" className="button" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="button primary">
              <AppIcon name="check" size={15} />
              <span>Lưu khách hàng</span>
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
