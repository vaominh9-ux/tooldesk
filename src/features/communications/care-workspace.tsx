'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '@/components/shared/app-icon';
import { formatDateLabel } from '@/domain/dates';
import { audienceFor, searchFilter } from '@/domain/orders';
import { formatAppointment } from '@/domain/care-scheduling';
import { CareSchedulePanel } from './care-schedule-panel';
import { Feedback } from '@/components/shared/feedback';

export function CareWorkspace() {
  const { data, openDialog, cancelCampaign, pending, role, today } = useTooldesk();
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<'care' | 'campaigns'>('care');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const statusLabels = { draft: 'Bản nháp', scheduled: 'Đã hẹn · chưa gửi', sent: 'Đã gửi', cancelled: 'Đã hủy lịch' };
  async function cancel(id: string) {
    setError('');
    try { await cancelCampaign(id); setCancelId(null); }
    catch (error) { setError(error instanceof Error ? error.message : 'Không hủy được lịch chiến dịch.'); }
  }
  const campaignActions = (id: string, status: typeof data.campaigns[number]['status']) => <div className="care-actions">
    <button type="button" className="button small" onClick={() => openDialog('campaign', id)}><AppIcon name={status === 'sent' ? 'eye' : 'edit'} size={15} />{status === 'sent' ? 'Xem' : 'Chỉnh sửa'}</button>
    {status === 'scheduled' && role !== 'viewer' && (cancelId === id ? <><span>Hủy lịch này?</span><button className="button small" disabled={pending} onClick={() => void cancel(id)}>Xác nhận hủy</button><button className="button small" onClick={() => setCancelId(null)}>Giữ lịch</button></> : <button className="button small" onClick={() => setCancelId(id)}>Hủy lịch</button>)}
  </div>;

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
    filtered = searchFilter(filtered, search, c => `${c.name} ${c.subject}`);
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
            disabled={role === 'viewer'}
            onClick={() => openDialog(section === 'care' ? 'care-appointment' : 'campaign')}
          >
            <AppIcon name="plus" size={16} />
            <span>{section === 'care' ? 'Hẹn lịch chăm sóc' : 'Tạo chiến dịch'}</span>
          </button>
        </div>
      </div>

      <nav className="care-tabs" aria-label="Phần chăm sóc khách hàng"><button type="button" aria-pressed={section === 'care'} onClick={() => setSection('care')}>Lịch chăm sóc <span className="badge neutral">{data.careAppointments.filter(item => item.status === 'scheduled').length}</span></button><button type="button" aria-pressed={section === 'campaigns'} onClick={() => setSection('campaigns')}>Chiến dịch <span className="badge neutral">{data.campaigns.length}</span></button></nav>
      {error && <Feedback tone="error">{error}</Feedback>}
      {section === 'care' ? <CareSchedulePanel hideCreateAction /> : <>
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
                    <th>Lịch hẹn / Cập nhật</th>
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
                        <span className={`badge ${c.status === 'scheduled' ? 'amber' : c.status === 'sent' ? 'green' : 'neutral'}`}>{statusLabels[c.status]}</span>
                      </td>
                      <td>{c.scheduledAt ? formatAppointment(c.scheduledAt) : formatDateLabel(c.date, true)}</td>
                      <td>
                        {campaignActions(c.id, c.status)}
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
                    <span className={`badge ${c.status === 'scheduled' ? 'amber' : c.status === 'sent' ? 'green' : 'neutral'}`}>{statusLabels[c.status]}</span>
                    <span className="muted">{c.scheduledAt ? formatAppointment(c.scheduledAt) : formatDateLabel(c.date, true)}</span>
                  </div>
                  <h3>{c.name}</h3>
                  <p className="record-description">{c.subject}</p>
                  <p className="record-description">{segmentLabels[c.segment] || c.segment}</p>
                  <div className="record-bottom">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AppIcon name="mail" size={15} />
                      Email
                    </span>
                    {campaignActions(c.id, c.status)}
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
          Lịch chiến dịch đã được lưu để chuẩn bị nội dung. Gửi tự động chưa bật; đến giờ hẹn hệ thống không tự gửi email.
        </p>
      </article>
      </>}
    </>
  );
}
