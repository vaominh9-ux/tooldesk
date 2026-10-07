'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '@/components/shared/app-icon';
import { ReminderStatusPanel } from '@/features/communications/reminder-status-panel';
import { SmtpSettingsPanel } from '@/components/settings/smtp-settings-panel';
import { ApiIntegrationPanel } from '@/features/api-integration/api-integration-panel';

export default function SettingsPage() {
  const { data, dataStatus, updateSettings, openDialog, addToast, syncWithSupabase, logout, importData, loadDemoData } = useTooldesk();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [systemHealth, setSystemHealth] = useState<{
    databaseConfigured: boolean;
    emailConfigured: boolean;
    reminderSchedulerConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(response => response.json())
      .then((value: any) => {
        if (value && typeof value === 'object') {
          setSystemHealth({
            databaseConfigured: value.databaseConfigured === true,
            emailConfigured: value.emailConfigured === true,
            reminderSchedulerConfigured: value.reminderSchedulerConfigured === true
          });
        }
      })
      .catch(() => setSystemHealth(null));
  }, []);

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

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        importData(parsed);
      } catch {
        addToast('Lỗi nhập dữ liệu', 'Tệp JSON không đúng định dạng Tooldesk.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
                <p>
                  {systemHealth?.databaseConfigured || dataStatus === 'connected'
                    ? 'Đã kết nối PostgreSQL (jqkezzjkcyulkrmtrwgj)'
                    : 'Chế độ lưu trữ trực tiếp / Ngoại tuyến'}
                </p>
              </div>
              <span
                className={`badge ${
                  systemHealth?.databaseConfigured || dataStatus === 'connected'
                    ? 'green'
                    : dataStatus === 'error'
                    ? 'red'
                    : 'neutral'
                }`}
              >
                {systemHealth?.databaseConfigured || dataStatus === 'connected'
                  ? 'Đã kết nối'
                  : dataStatus === 'loading'
                  ? 'Đang kiểm tra'
                  : 'Trực tiếp'}
              </span>
            </div>

            <div className="integration-row">
              <span className="integration-icon">
                <AppIcon name="mail" size={19} />
              </span>
              <div>
                <strong>Email</strong>
                <p>Gửi ưu đãi và nhắc gia hạn</p>
              </div>
              <span className={systemHealth?.emailConfigured ? 'badge green' : 'badge neutral'}>
                {systemHealth?.emailConfigured ? 'Đã cấu hình SMTP' : 'Chưa bật SMTP'}
              </span>
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

            <div className="integration-row">
              <span className="integration-icon">
                <AppIcon name="grid" size={19} />
              </span>
              <div>
                <strong>AI Agent & API</strong>
                <p>ChatGPT, Claude, Smax</p>
              </div>
              <span className="badge green">Sẵn sàng v1</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Integrations */}
      <ApiIntegrationPanel />
      <SmtpSettingsPanel />
      {dataStatus === 'connected' && <ReminderStatusPanel />}
      <div className="danger-zone">
        <h3>Quản lý dữ liệu hệ thống</h3>
        <p>
          Hệ thống lưu trữ đơn hàng, khách hàng, sản phẩm và gói dịch vụ. Bạn có thể xuất sao lưu dự phòng, nạp tệp sao lưu, làm sạch dữ liệu để bắt đầu bán thật, hoặc nạp lại dữ liệu demo mẫu để tham khảo.
        </p>
        <div className="page-actions" style={{ flexWrap: 'wrap', gap: '10px' }}>
          {dataStatus === 'connected' && (
            <button
              type="button"
              className="button"
              onClick={() => void logout().catch(error => addToast('Lỗi đăng xuất', error instanceof Error ? error.message : 'Lỗi chưa xác định.', 'error'))}
            >
              Đăng xuất
            </button>
          )}
          {dataStatus === 'connected' && (
            <button
              type="button"
              className="button primary"
              onClick={syncWithSupabase}
            >
              <AppIcon name="refresh" size={15} />
              <span>Tải lại từ Supabase</span>
            </button>
          )}
          <button
            type="button"
            className="button"
            onClick={handleExportData}
          >
            <AppIcon name="download" size={15} />
            <span>Xuất sao lưu (.json)</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <AppIcon name="upload" size={15} />
            <span>Nhập sao lưu (.json)</span>
          </button>
          <button
            type="button"
            className="button"
            onClick={loadDemoData}
            title="Nạp lại bộ dữ liệu 36 khách hàng và 98 đơn hàng demo"
          >
            <AppIcon name="database" size={15} />
            <span>Nạp dữ liệu mẫu (Demo)</span>
          </button>
          <button
            type="button"
            className="button danger"
            onClick={() => openDialog('reset')}
          >
            <AppIcon name="refresh" size={15} />
            <span>Làm sạch dữ liệu bán thật</span>
          </button>
        </div>
      </div>
    </>
  );
}
