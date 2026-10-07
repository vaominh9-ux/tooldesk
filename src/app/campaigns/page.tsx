'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '@/components/shared/app-icon';
import { formatDateLabel } from '@/domain/dates';
import { audienceFor } from '@/domain/orders';

export default function CampaignsPage() {
  const { data, openDialog, today } = useTooldesk();
  const [search, setSearch] = useState('');

  const segmentLabels: Record<string, string> = {
    all: 'Tất cả khách hàng',
    active: 'Khách đang sử dụng',
    expiring: 'Khách sắp hết hạn',
    expired: 'Khách không còn gói hoạt động',
    vip: 'Khách chi tiêu từ 2 triệu'
  };

  const totalEligible = audienceFor(data, 'all', today).eligible.length;

  let filtered = data.campaigns;
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(c => `${c.name} ${c.subject}`.toLowerCase().includes(q));
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Chăm sóc khách hàng</h1>
          <p>Gửi điều có ích, đến đúng người, vào đúng thời điểm.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => openDialog('campaign')}
          >
            <AppIcon name="plus" size={16} />
            <span>Tạo chiến dịch</span>
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="campaign-hero">
        <div>
          <div className="eyebrow" style={{ color: '#949acd', marginBottom: 10 }}>
            KHÁCH HÀNG CŨ. CƠ HỘI MỚI.
          </div>
          <h2>Giữ kết nối, không chỉ gửi tin.</h2>
          <p>
            Chọn nhóm khách phù hợp, cá nhân hóa ưu đãi và kiểm tra danh sách trước khi gửi. {totalEligible} email đủ điều kiện trong dữ liệu hiện tại.
          </p>
        </div>
        <div className="campaign-graphic">
          <AppIcon name="mail" size={43} />
        </div>
      </div>

      {/* Segments Grid */}
      <div className="segment-grid">
        {(['active', 'expiring', 'expired', 'vip'] as const).map(seg => {
          const a = audienceFor(data, seg, today);
          return (
            <button
              key={seg}
              type="button"
              className="segment-card"
              onClick={() => openDialog('campaign', seg)}
            >
              <span>{segmentLabels[seg]}</span>
              <strong>{a.selected.length}</strong>
              <small>
                {a.eligible.length} email đủ điều kiện <AppIcon name="arrow" size={12} />
              </small>
            </button>
          );
        })}
      </div>

      {/* Campaigns Panel */}
      <article className="panel">
        <div className="section-heading">
          <div>
            <h2>Chiến dịch của bạn</h2>
            <p>{data.campaigns.length} chiến dịch chăm sóc khách hàng</p>
          </div>
        </div>

        <div className="list-toolbar" style={{ paddingTop: 0 }}>
          <label className="search-field">
            <AppIcon name="search" size={18} />
            <input
              id="campaign-search"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm chiến dịch ưu đãi..."
              aria-label="Tìm chiến dịch ưu đãi..."
              autoComplete="off"
            />
            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch('')}
                aria-label="Xóa tìm kiếm"
              >
                ×
              </button>
            )}
          </label>
          <span className="toolbar-end">
            <span className="badge primary">Chăm sóc & Ưu đãi</span>
          </span>
        </div>

        {filtered.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="table-scroll desktop-data">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tên chiến dịch</th>
                    <th>Nhóm khách hàng</th>
                    <th>Kênh</th>
                    <th>Trạng thái</th>
                    <th>Cập nhật</th>
                    <th><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td>
                        <button
                          type="button"
                          className="text-link strong"
                          onClick={() => openDialog('campaign', c.id)}
                        >
                          {c.name}
                        </button>
                        <small style={{ display: 'block', fontSize: 12, marginTop: 6, maxWidth: 270 }}>
                          {c.subject}
                        </small>
                      </td>
                      <td>{segmentLabels[c.segment] || c.segment}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AppIcon name="mail" size={13} />
                          Email
                        </span>
                      </td>
                      <td>
                        <span className="badge blue">Bản nháp</span>
                      </td>
                      <td>{formatDateLabel(c.date, true)}</td>
                      <td>
                        <button
                          type="button"
                          className="button small"
                          onClick={() => openDialog('campaign', c.id)}
                        >
                          <AppIcon name="edit" size={13} />
                          <span>Chỉnh sửa</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Records */}
            <div className="mobile-records">
              {filtered.map(c => (
                <article key={c.id} className="record-card">
                  <div className="record-top">
                    <span className="badge blue">Bản nháp</span>
                    <span className="muted">{formatDateLabel(c.date, true)}</span>
                  </div>
                  <h3>{c.name}</h3>
                  <p className="record-description">{c.subject}</p>
                  <p className="record-description">{segmentLabels[c.segment] || c.segment}</p>
                  <div className="record-bottom">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AppIcon name="mail" size={15} />
                      Email
                    </span>
                    <button
                      type="button"
                      className="button small"
                      onClick={() => openDialog('campaign', c.id)}
                    >
                      <AppIcon name="edit" size={15} />
                      <span>Chỉnh sửa</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <AppIcon name="inbox" size={28} />
            </div>
            <h3>Chưa có chiến dịch phù hợp</h3>
            <p>Tạo chiến dịch đầu tiên để lưu nội dung ưu đãi.</p>
          </div>
        )}

        <p className="campaign-status-note">
          <AppIcon name="lock" size={12} />
          Bản giao diện chỉ lưu nháp và xem trước. Gửi thật, hẹn giờ và thống kê sẽ hoạt động sau khi kết nối dịch vụ gửi.
        </p>
      </article>
    </>
  );
}
