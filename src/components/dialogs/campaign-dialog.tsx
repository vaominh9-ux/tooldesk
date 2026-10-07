'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { audienceFor } from '@/domain/orders';

const segmentLabels: Record<string, string> = {
  all: 'Tất cả khách hàng',
  active: 'Khách đang sử dụng',
  expiring: 'Khách sắp hết hạn',
  expired: 'Khách không còn gói hoạt động',
  vip: 'Khách chi tiêu từ 2 triệu'
};

export function CampaignDialog({
  campaignId,
  segment,
  onClose
}: {
  campaignId?: string;
  segment?: string;
  onClose: () => void;
}) {
  const { data, saveCampaign, addToast } = useTooldesk();

  const existing = campaignId ? data.campaigns.find(item => item.id === campaignId) : null;

  const [step, setStep] = useState<number>(1);
  const [selectedSegment, setSelectedSegment] = useState<string>(
    existing?.segment || (segment && segmentLabels[segment] ? segment : 'all')
  );
  const [name, setName] = useState<string>(existing?.name || '');
  const [subject, setSubject] = useState<string>(existing?.subject || '');
  const [body, setBody] = useState<string>(
    existing?.body ||
      'Chào {ten_khach},\n\nGói dịch vụ của bạn tại {thuong_hieu} sắp đến hạn. Chúng tôi gửi bạn ưu đãi gia hạn sớm với mức giá tốt nhất.\n\nLiên hệ lại để được hỗ trợ kích hoạt ngay nhé!'
  );
  const [error, setError] = useState<string>('');

  const audience = audienceFor(data, selectedSegment);
  const firstEligible = audience.eligible[0];

  const previewBody = body
    .replaceAll('{ten_khach}', firstEligible?.name || 'Minh Anh')
    .replaceAll('{thuong_hieu}', data.settings.shopName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setError('Vui lòng nhập đầy đủ tên chiến dịch, tiêu đề và nội dung.');
      return;
    }
    try {
    await saveCampaign({
      ...(existing ? { id: existing.id } : {}),
      name: name.trim(),
      segment: selectedSegment,
      subject: subject.trim(),
      body: body.trim()
    });

    onClose();
    } catch (error) { setError(error instanceof Error ? error.message : 'Không thể lưu chiến dịch.'); }
  };

  return (
    <div className="dialog-overlay center" onClick={onClose}>
      <dialog
        id="active-dialog"
        className="modal wide"
        open
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={e => e.stopPropagation()}
      >
        <form className="dialog-shell" id="campaign-form" onSubmit={handleSubmit}>
          {/* Header */}
          <header className="dialog-header">
            <div>
              <h2 id="dialog-title">
                {existing ? 'Chỉnh sửa chiến dịch' : 'Tạo chiến dịch ưu đãi'}
              </h2>
              <p>Chọn đúng nhóm. Soạn một lần. Kiểm tra trước khi gửi.</p>
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

          {/* Campaign Steps */}
          <div className="campaign-steps">
            {[
              { num: 1, label: 'Người nhận' },
              { num: 2, label: 'Nội dung' },
              { num: 3, label: 'Kiểm tra' }
            ].map(s => (
              <div
                key={s.num}
                className={`campaign-step ${step === s.num ? 'active' : step > s.num ? 'done' : ''}`}
              >
                <span>
                  {step > s.num ? <AppIcon name="check" size={11} /> : s.num}
                </span>
                {s.label}
              </div>
            ))}
          </div>

          {/* Dialog Content */}
          <div className="dialog-content">
            {error && (
              <div className="dialog-error" role="alert" style={{ marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="campaign-builder">
                <div>
                  <label className="field">
                    <span>Nhóm khách hàng</span>
                    <select
                      name="segment"
                      id="campaign-segment"
                      value={selectedSegment}
                      onChange={e => setSelectedSegment(e.target.value)}
                    >
                      {Object.entries(segmentLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Kênh gửi</span>
                    <select disabled aria-label="Kênh email">
                      <option>Email — bản xem trước</option>
                    </select>
                    <small>Zalo, SMS hoặc Messenger cần tích hợp riêng; chưa bật trong bản này.</small>
                  </label>

                  <div className="hint-banner neutral" style={{ marginTop: '20px' }}>
                    <AppIcon name="lock" size={18} />
                    <span>
                      Bạn đang thiết kế chiến dịch, chưa gửi bất kỳ email nào. Dữ liệu hiện tại chỉ để thử giao diện.
                    </span>
                  </div>
                </div>

                <div id="campaign-audience">
                  <div className="audience-box">
                    <span>EMAIL ĐỦ ĐIỀU KIỆN</span>
                    <div className="audience-number">
                      {audience.eligible.length}
                      <small>người nhận</small>
                    </div>
                    <div className="divider"></div>
                    <div className="stat-line">
                      <span>Khách trong nhóm</span>
                      <strong>{audience.selected.length}</strong>
                    </div>
                    <div className="stat-line">
                      <span>Chưa đồng ý / đã từ chối</span>
                      <strong>{audience.excluded.noConsent}</strong>
                    </div>
                    <div className="stat-line">
                      <span>Email thiếu / không hợp lệ</span>
                      <strong>{audience.excluded.invalidEmail}</strong>
                    </div>
                    <div className="stat-line">
                      <span>Địa chỉ email trùng</span>
                      <strong>{audience.excluded.duplicate}</strong>
                    </div>
                    <p>
                      Chỉ tính email hợp lệ, đã đồng ý nhận ưu đãi và không trùng địa chỉ. Danh sách sẽ cần kiểm tra lại khi gửi thật.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="campaign-builder">
                <div>
                  <label className="field">
                    <span>Tên chiến dịch nội bộ</span>
                    <input
                      name="name"
                      value={name}
                      maxLength={100}
                      required
                      placeholder="Ví dụ: Ưu đãi khách hàng tháng 10"
                      onChange={e => setName(e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Tiêu đề email</span>
                    <input
                      name="subject"
                      value={subject}
                      maxLength={150}
                      required
                      placeholder="Một ưu đãi dành riêng cho bạn"
                      onChange={e => setSubject(e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Nội dung email</span>
                    <textarea
                      name="body"
                      required
                      maxLength={10000}
                      rows={7}
                      value={body}
                      onChange={e => setBody(e.target.value)}
                    />
                    <small>Dùng {'{ten_khach}'} và {'{thuong_hieu}'} để cá nhân hóa.</small>
                  </label>

                  <p className="dialog-note">
                    Không có giảm giá hoặc cam kết nào được tự thêm. Bạn chịu trách nhiệm xác nhận nội dung và điều kiện ưu đãi.
                  </p>
                </div>

                <div id="campaign-email-preview">
                  <div className="email-preview">
                    <div className="preview-label">
                      <AppIcon name="eye" size={13} />
                      <span>BẢN XEM TRƯỚC</span>
                    </div>
                    <div className="email-card">
                      <div className="email-card-header">
                        <strong>{subject || 'Tiêu đề email của bạn'}</strong>
                        <small>
                          Từ: {data.settings.shopName} · Chưa cấu hình người gửi
                          <br />
                          Đến: {firstEligible?.email || 'khach@example.com'}
                        </small>
                      </div>
                      <div className="email-body">{previewBody}</div>
                      <div className="email-footer">
                        Bạn nhận ưu đãi vì đã đồng ý đăng ký.
                        <br />
                        <u>Hủy đăng ký nhận email</u> · Liên kết minh họa, chưa hoạt động.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <>
                <div className="hint-banner amber" style={{ marginBottom: '20px' }}>
                  <AppIcon name="lock" size={18} />
                  <span>
                    Chưa kết nối dịch vụ gửi. Bạn có thể lưu bản nháp, nhưng không thể gửi thật hoặc hẹn giờ.
                  </span>
                </div>

                <div className="review-grid">
                  <div>
                    <div className="review-card">
                      <h3>{name || 'Chiến dịch ưu đãi'}</h3>
                      <div className="stat-line">
                        <span>Kênh</span>
                        <strong>Email</strong>
                      </div>
                      <div className="stat-line">
                        <span>Nhóm khách</span>
                        <strong>{segmentLabels[selectedSegment] || selectedSegment}</strong>
                      </div>
                      <div className="stat-line">
                        <span>Email đủ điều kiện</span>
                        <strong>{audience.eligible.length}</strong>
                      </div>
                      <div className="stat-line">
                        <span>Bị loại khỏi nhóm</span>
                        <strong>{audience.excludedCount}</strong>
                      </div>

                      <div className="review-recipient-list">
                        {audience.eligible.length > 0 ? (
                          audience.eligible.slice(0, 6).map(c => (
                            <div key={c.id} className="review-recipient">
                              <div className="avatar small" aria-hidden="true">
                                {c.name[0]?.toUpperCase()}
                              </div>
                              <span>
                                {c.name}
                                <br />
                                {c.email}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="dialog-note">Không có người nhận đủ điều kiện.</p>
                        )}
                      </div>
                    </div>

                    <p className="dialog-note">
                      Bản nháp lưu điều kiện nhóm. Danh sách đủ điều kiện sẽ được tính lại khi mở, không mặc định gửi cho toàn bộ khách hàng.
                    </p>
                  </div>

                  <div className="email-preview">
                    <div className="preview-label">
                      <AppIcon name="eye" size={13} />
                      <span>BẢN XEM TRƯỚC</span>
                    </div>
                    <div className="email-card">
                      <div className="email-card-header">
                        <strong>{subject || 'Tiêu đề email của bạn'}</strong>
                        <small>
                          Từ: {data.settings.shopName} · Chưa cấu hình người gửi
                          <br />
                          Đến: {firstEligible?.email || 'khach@example.com'}
                        </small>
                      </div>
                      <div className="email-body">{previewBody}</div>
                      <div className="email-footer">
                        Bạn nhận ưu đãi vì đã đồng ý đăng ký.
                        <br />
                        <u>Hủy đăng ký nhận email</u> · Liên kết minh họa, chưa hoạt động.
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <footer className="dialog-footer">
            {step === 1 && (
              <>
                <button type="button" className="button" onClick={onClose}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => setStep(2)}
                >
                  <span>Soạn nội dung</span>
                  <AppIcon name="arrow" size={15} />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  className="button footer-left"
                  onClick={() => setStep(1)}
                >
                  <AppIcon name="left" size={14} />
                  <span>Quay lại</span>
                </button>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    if (!name.trim()) {
                      setError('Vui lòng nhập tên chiến dịch nội bộ.');
                      return;
                    }
                    if (!subject.trim()) {
                      setError('Vui lòng nhập tiêu đề email.');
                      return;
                    }
                    if (!body.trim()) {
                      setError('Vui lòng nhập nội dung email.');
                      return;
                    }
                    setError('');
                    setStep(3);
                  }}
                >
                  <span>Kiểm tra chiến dịch</span>
                  <AppIcon name="arrow" size={15} />
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button
                  type="button"
                  className="button footer-left"
                  onClick={() => setStep(2)}
                >
                  <AppIcon name="left" size={14} />
                  <span>Quay lại</span>
                </button>
                <button
                  type="button"
                  className="button"
                  disabled
                  title="Chưa kết nối dịch vụ gửi"
                >
                  Gửi chiến dịch
                </button>
                <button type="submit" className="button primary">
                  <AppIcon name="check" size={15} />
                  <span>Lưu bản nháp</span>
                </button>
              </>
            )}
          </footer>
        </form>
      </dialog>
    </div>
  );
}
