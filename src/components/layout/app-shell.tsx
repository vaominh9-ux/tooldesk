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
  const { dataStatus, pending } = useTooldesk();

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
            {(pending || dataStatus === 'error') && (
              <div className={`data-notice ${dataStatus === 'error' ? 'error' : ''}`} role="status">
                <span>{pending ? 'Đang lưu dữ liệu… Vui lòng chờ.' : 'Lỗi đồng bộ dữ liệu với máy chủ · Đang hoạt động ở chế độ ngoại tuyến.'}</span>
              </div>
            )}
            {children}
            <footer className="app-footer">
              <span>
                <i style={{ background: dataStatus === 'error' ? '#e74c3c' : '#38cb89' }}></i>
                {dataStatus === 'connected' ? 'Dữ liệu Supabase trực tuyến' : dataStatus === 'error' ? 'Ngoại tuyến · Tự động đồng bộ lại khi có mạng' : 'Hệ thống Tooldesk trực tuyến'}
              </span>
              <span>Tooldesk — Quản lý kinh doanh tool AI</span>
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
