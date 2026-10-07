'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppIcon, BrandLogoMark } from '../shared/app-icon';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { subStatus } from '@/domain/subscriptions';

interface DesktopSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function DesktopSidebar({ mobileOpen = false, onCloseMobile }: DesktopSidebarProps) {
  const pathname = usePathname();
  const { data, today, openDialog } = useTooldesk();

  const expiringCount = data.subscriptions.filter(
    s => subStatus(s, today, data.settings.reminderDays) === 'expiring'
  ).length;

  const ownerName = data.settings.ownerName || 'Minh';
  const initials = ownerName.split(/\s+/).slice(-2).map(s => s[0]).join('').toUpperCase() || 'M';

  const isNavActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Điều hướng chính">
      <Link className="brand" href="/" onClick={onCloseMobile} aria-label="Tooldesk — Tổng quan">
        <span className="brand-mark">
          <BrandLogoMark />
        </span>
        <span className="brand-name">
          tooldesk<span>.</span>
        </span>
      </Link>

      <div className="sidebar-caption">QUẢN LÝ KINH DOANH TOOL AI</div>

      <button
        type="button"
        className="icon-button sidebar-close"
        onClick={onCloseMobile}
        aria-label="Đóng menu"
      >
        <AppIcon name="close" size={20} />
      </button>

      <div className="nav-label">VẬN HÀNH</div>
      <nav className="nav-group">
        <Link
          className={`nav-item ${isNavActive('/') ? 'active' : ''}`}
          href="/"
          title="Tổng quan"
          prefetch={true}
          onClick={onCloseMobile}
        >
          <AppIcon name="grid" size={20} />
          <span>Tổng quan</span>
        </Link>
        <Link
          className={`nav-item ${isNavActive('/orders') ? 'active' : ''}`}
          href="/orders"
          title="Đơn hàng"
          prefetch={true}
          onClick={onCloseMobile}
        >
          <AppIcon name="orders" size={20} />
          <span>Đơn hàng</span>
        </Link>
        <Link
          className={`nav-item ${isNavActive('/customers') ? 'active' : ''}`}
          href="/customers"
          title="Khách hàng"
          prefetch={true}
          onClick={onCloseMobile}
        >
          <AppIcon name="users" size={20} />
          <span>Khách hàng</span>
        </Link>
        <Link
          className={`nav-item ${isNavActive('/subscriptions') ? 'active' : ''}`}
          href="/subscriptions"
          title="Gói dịch vụ"
          prefetch={true}
          onClick={onCloseMobile}
        >
          <AppIcon name="layers" size={20} />
          <span>Gói dịch vụ</span>
          {expiringCount > 0 && <span className="nav-count">{expiringCount}</span>}
        </Link>
        <Link
          className={`nav-item ${isNavActive('/products') ? 'active' : ''}`}
          href="/products"
          title="Sản phẩm"
          prefetch={true}
          onClick={onCloseMobile}
        >
          <AppIcon name="box" size={20} />
          <span>Sản phẩm</span>
        </Link>
      </nav>

      <div className="nav-label">TĂNG TRƯỞNG</div>
      <nav className="nav-group">
        <Link
          className={`nav-item ${isNavActive('/campaigns') ? 'active' : ''}`}
          href="/campaigns"
          title="Chăm sóc khách hàng"
          prefetch={true}
          onClick={onCloseMobile}
        >
          <AppIcon name="megaphone" size={20} />
          <span>Chăm sóc khách hàng</span>
        </Link>
        <Link
          className={`nav-item ${isNavActive('/reports') ? 'active' : ''}`}
          href="/reports"
          title="Báo cáo"
          prefetch={true}
          onClick={onCloseMobile}
        >
          <AppIcon name="chart" size={20} />
          <span>Báo cáo</span>
        </Link>
      </nav>

      <div className="sidebar-bottom">
        <nav className="nav-group" style={{ marginBottom: 19 }}>
          <Link
            className={`nav-item ${isNavActive('/settings') ? 'active' : ''}`}
            href="/settings"
            title="Cài đặt"
            prefetch={true}
            onClick={onCloseMobile}
          >
            <AppIcon name="settings" size={18} />
            <span>Cài đặt</span>
          </Link>
          <button
            type="button"
            className="nav-item"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              openDialog('help');
            }}
          >
            <AppIcon name="help" size={18} />
            <span>Hướng dẫn sử dụng</span>
          </button>
        </nav>

        <Link
          className="sidebar-user"
          href="/settings"
          onClick={onCloseMobile}
        >
          <span className="avatar lavender" aria-hidden="true">
            {initials}
          </span>
          <span>
            <strong>{ownerName}</strong>
            <small>Chủ cửa hàng · Tooldesk</small>
          </span>
          <AppIcon name="settings" size={15} />
        </Link>
      </div>
    </aside>
  );
}
