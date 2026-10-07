'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { DesktopSidebar } from './desktop-sidebar';
import { Topbar } from './topbar';
import { MobileNavigation } from './mobile-navigation';
import { GlobalDialogs } from '../dialogs/global-dialogs';
import { useTooldesk } from '@/features/context/tooldesk-context';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { dataStatus } = useTooldesk();

  // Route identifier for CSS page scoping (.page-dashboard, .page-orders, etc.)
  const routeName = pathname === '/' ? 'dashboard' : pathname.replace(/^\//, '').split('/')[0];

  return (
    <>
      <a className="skip-link" href="#main">
        Bỏ qua đến nội dung
      </a>

      <div id="app">
        {/* Overlay when sidebar opens on mobile */}
        <div
          className={`sidebar-overlay ${mobileOpen ? 'show' : ''}`}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />

        {/* Sidebar (desktop fixed, mobile drawer) */}
        <DesktopSidebar
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Shell */}
        <div className="shell">
          <Topbar
            mobileOpen={mobileOpen}
            onToggleMobile={() => setMobileOpen(prev => !prev)}
          />

          <main id="main" className={`page-${routeName}`} tabIndex={-1}>
            <div className={`data-notice ${dataStatus === 'error' ? 'error' : ''}`} role="status">
              <span>{dataStatus === 'mock' ? <><strong>Bản trải nghiệm · Dữ liệu mẫu.</strong> Thao tác chỉ giữ trong phiên này; bạn có thể xuất tệp ở Cài đặt.</> : dataStatus === 'loading' ? 'Đang tải dữ liệu. Các số liệu mẫu tạm thời chưa phải dữ liệu vận hành.' : dataStatus === 'error' ? 'Không tải được dữ liệu Supabase. Số liệu đang hiển thị là dữ liệu mẫu; hãy kiểm tra kết nối ở Cài đặt.' : 'Đã tải dữ liệu từ Supabase. Các thay đổi giao diện hiện chỉ giữ trong phiên này.'}</span>
            </div>
            {children}
            <footer className="app-footer">
              <span>
                <i></i>{dataStatus === 'connected' ? 'Dữ liệu đã tải từ Supabase' : dataStatus === 'mock' ? 'Dữ liệu mẫu · Không gửi tin hoặc chuyển tiền' : dataStatus === 'error' ? 'Lỗi tải dữ liệu · Đang hiển thị mẫu' : 'Đang tải dữ liệu'}
              </span>
              <span>Tooldesk — Quản lý kinh doanh tool AI v0.2</span>
            </footer>
          </main>
        </div>

        {/* Mobile bottom dock */}
        <MobileNavigation
          mobileOpen={mobileOpen}
          onToggleMobile={() => setMobileOpen(prev => !prev)}
        />

        {/* Global Dialogs & Toast Notifications */}
        <GlobalDialogs />
      </div>
    </>
  );
}
