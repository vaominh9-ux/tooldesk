'use client';

import React, { useState, useEffect } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '@/components/shared/app-icon';
import { ReminderStatusPanel } from '@/features/communications/reminder-status-panel';

export default function SettingsPage() {
  const { data, dataStatus, updateSettings, openDialog, addToast, syncWithSupabase, logout } = useTooldesk();
  const [emailStatus, setEmailStatus] = useState<{ emailConfigured: boolean; reminderSchedulerConfigured: boolean } | null>(null);
  useEffect(() => { fetch('/api/health').then(response => response.json()).then((value: unknown) => { if (value && typeof value === 'object' && 'emailConfigured' in value && 'reminderSchedulerConfigured' in value) setEmailStatus({ emailConfigured: value.emailConfigured === true, reminderSchedulerConfigured: value.reminderSchedulerConfigured === true }); }).catch(() => setEmailStatus(null)); }, []);

  const [shopName, setShopName] = useState(data.settings.shopName || 'Tooldesk');
  const [ownerName, setOwnerName] = useState(data.settings.ownerName || 'Minh');
  const [reminderDays, setReminderDays] = useState(data.settings.reminderDays || 7);
  useEffect(() => { setShopName(data.settings.shopName); setOwnerName(data.settings.ownerName); setReminderDays(data.settings.reminderDays); }, [data.settings.shopName, data.settings.ownerName, data.settings.reminderDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await updateSettings({
      shopName,
      ownerName,
      reminderDays: Number(reminderDays)
    }); } catch (error) { addToast('Không thể lưu cài đặt', error instanceof Error ? error.message : 'Lỗi lưu dữ liệu.', 'error'); }
  };

  const handleExportData = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tooldesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Đã xuất file dữ liệu', 'Tệp .json đã được tải xuống máy tính.');
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Cài đặt</h1>
          <p>Thiết lập cửa hàng, mốc nhắc gia hạn và kết nối dịch vụ.</p>
        </div>
      </div>

      <div className="settings-layout">
        {/* Shop Settings */}
        <article className="panel">
          <div className="section-heading">
            <div>
              <h2>Thông tin cửa hàng</h2>
              <p>Tên hiển thị và thời gian nhắc gia hạn cho khách.</p>
            </div>
          </div>

          <form className="settings-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>Tên thương hiệu</span>
                <input
                  name="shopName"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  required
                  maxLength={40}
                />
              </label>

              <label className="field">
                <span>Tên người quản lý</span>
                <input
                  name="ownerName"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  required
                  maxLength={50}
                />
              </label>

              <label className="field">
                <span>Mốc hiển thị sắp hết hạn</span>
                <select
                  name="reminderDays"
                  value={reminderDays}
                  onChange={e => setReminderDays(Number(e.target.value))}
                >
                  <option value={3}>Trước 3 ngày</option>
                  <option value={7}>Trước 7 ngày</option>
                  <option value={14}>Trước 14 ngày</option>
                  <option value={30}>Trước 30 ngày</option>
                </select>
                <small>Mốc lọc hiển thị và chọn gói để nhắc. Tác vụ gửi chạy khi scheduler/SMTP được bật.</small>
              </label>

              <label className="field">
                <span>Múi giờ</span>
                <input value="Asia/Ho_Chi_Minh (UTC+7)" readOnly />
                <small>Thời điểm hết hạn: 00:00 ngày được ghi.</small>
              </label>
            </div>

            <div className="settings-actions">
              <button type="submit" className="button primary">
                <AppIcon name="check" size={16} />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </form>
        </article>

        {/* Integration aside */}
        <aside className="panel">
          <div className="section-heading">
            <div>
              <h2>Kết nối dịch vụ</h2>
              <p>Trạng thái nguồn dữ liệu và các kênh liên hệ.</p>
            </div>
          </div>

          <div className="integration-list">
            <div className="integration-row">
              <span className="integration-icon">
                <AppIcon name="database" size={19} />
              </span>
              <div>
                <strong>Supabase</strong>
                <p>{dataStatus === 'mock' ? 'Bản trải nghiệm đang dùng dữ liệu mẫu' : 'Nguồn dữ liệu PostgreSQL'}</p>
              </div>
              <span className={`badge ${dataStatus === 'connected' ? 'green' : dataStatus === 'error' ? 'red' : 'neutral'}`}>{dataStatus === 'connected' ? 'Đã tải dữ liệu' : dataStatus === 'loading' ? 'Đang tải' : dataStatus === 'error' ? 'Lỗi kết nối' : 'Chưa kết nối'}</span>
            </div>

            <div className="integration-row">
              <span className="integration-icon">
                <AppIcon name="mail" size={19} />
              </span>
              <div>
                <strong>Email</strong>
                <p>Gửi ưu đãi và nhắc gia hạn</p>
              </div>
              <span className={emailStatus?.emailConfigured ? 'badge green' : 'badge neutral'}>{emailStatus?.emailConfigured ? 'Đã cấu hình SMTP' : 'Chưa bật SMTP'}</span>
            </div>

            <div className="integration-row">
              <span className="integration-icon">
                <AppIcon name="send" size={19} />
              </span>
              <div>
                <strong>Telegram</strong>
                <p>Thông báo nội bộ</p>
              </div>
              <span className="badge neutral">Chưa nối</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Danger Zone */}
      {dataStatus === 'connected' && <ReminderStatusPanel />}
      <div className="danger-zone">
        <h3>Dữ liệu hệ thống</h3>
        <p>
          {dataStatus === 'mock' ? 'Thay đổi mẫu được giữ trong phiên hiện tại. Xuất tệp JSON để giữ bản sao.' : 'Dữ liệu thật được lưu vào database. Khôi phục dữ liệu mẫu bị khóa trong chế độ này.'}
        </p>
        <div className="page-actions">
          {dataStatus === 'connected' && <button type="button" className="button" onClick={() => void logout().catch(error => addToast('Lỗi đăng xuất', error instanceof Error ? error.message : 'Lỗi chưa xác định.', 'error'))}>Đăng xuất</button>}
          <button
            type="button"
            className="button primary"
            onClick={syncWithSupabase}
          >
            <AppIcon name="refresh" size={15} />
            <span>{dataStatus === 'mock' ? 'Thông tin nguồn dữ liệu' : 'Tải lại từ Supabase'}</span>
          </button>
          <button
            type="button"
            className="button"
            onClick={handleExportData}
          >
            <AppIcon name="download" size={15} />
            <span>Xuất dữ liệu (.json)</span>
          </button>
          <button
            type="button"
            className="button danger"
            onClick={() => openDialog('reset')}
            disabled={dataStatus !== 'mock'}
          >
            <AppIcon name="refresh" size={15} />
            <span>Khôi phục mặc định</span>
          </button>
        </div>
      </div>
    </>
  );
}
