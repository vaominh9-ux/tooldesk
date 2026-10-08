'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DesktopSidebar } from './desktop-sidebar';
import { Topbar } from './topbar';
import { MobileNavigation } from './mobile-navigation';
import { GlobalDialogs } from '../dialogs/global-dialogs';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { CareDueNotice } from '@/features/communications/care-due-notice';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { dataStatus, pending } = useTooldesk();
  useEffect(() => {
    if (!mobileOpen) return;
    const viewport = window.matchMedia('(max-width:1023px)');
    if (!viewport.matches) { setMobileOpen(false); return; }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false); };
    const closeOnDesktop = () => { if (!viewport.matches) setMobileOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    viewport.addEventListener('change', closeOnDesktop);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', closeOnEscape);
      viewport.removeEventListener('change', closeOnDesktop);
    };
  }, [mobileOpen]);

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
            {dataStatus !== 'loading' && dataStatus !== 'error' && <CareDueNotice />}
            {(pending || dataStatus === 'error') && (
              <div className={`data-notice ${dataStatus === 'error' ? 'error' : ''}`} role="status">
                <span>{pending ? 'Đang lưu dữ liệu… Vui lòng chờ.' : 'Mất kết nối máy chủ. Đang hiển thị dữ liệu đã tải; thao tác lưu tạm khóa đến khi kết nối lại.'}</span>
              </div>
            )}
            {children}
            <footer className="app-footer">
              <span>
                <i style={{ background: dataStatus === 'error' ? '#e74c3c' : '#38cb89' }}></i>
                {dataStatus === 'connected' ? 'Dữ liệu Supabase trực tuyến' : dataStatus === 'error' ? 'Mất kết nối · Đang thử kết nối lại' : dataStatus === 'mock' ? 'Dữ liệu mẫu · Chế độ demo' : 'Đang tải dữ liệu'}
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
