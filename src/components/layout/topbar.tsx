'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppIcon } from '../shared/app-icon';
import { useTooldesk } from '@/features/context/tooldesk-context';

const routeLabels: Record<string, string> = {
  '/': 'Tổng quan',
  '/orders': 'Đơn hàng',
  '/customers': 'Khách hàng',
  '/subscriptions': 'Gói dịch vụ',
  '/products': 'Sản phẩm',
  '/campaigns': 'Chăm sóc khách hàng',
  '/reports': 'Báo cáo',
  '/settings': 'Cài đặt'
};

interface TopbarProps {
  mobileOpen?: boolean;
  onToggleMobile?: () => void;
}

export function Topbar({ mobileOpen = false, onToggleMobile }: TopbarProps) {
  const pathname = usePathname();
  const { data, dataStatus, openDialog } = useTooldesk();

  const currentTitle = routeLabels[pathname] || 'Tooldesk';
  const ownerName = data.settings.ownerName || 'Minh';
  const initials = ownerName.split(/\s+/).slice(-2).map(s => s[0]).join('').toUpperCase() || 'M';

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-button mobile-toggle"
        onClick={onToggleMobile}
        aria-label="Mở menu điều hướng"
        aria-expanded={mobileOpen}
      >
        <AppIcon name="menu" size={20} />
      </button>

      <div className="breadcrumb">
        <AppIcon name="grid" size={15} />
        <span>{data.settings.shopName || 'Tooldesk'}</span>
        <AppIcon name="chevron" size={11} />
        <span>{currentTitle}</span>
      </div>

      <div className="topbar-actions">
        <span className="demo-pill" title="Trạng thái hệ thống">
          <i style={{ background: dataStatus === 'error' ? '#e74c3c' : '#38cb89' }}></i>
          {dataStatus === 'connected' ? 'Supabase trực tuyến' : dataStatus === 'loading' ? 'Đang kết nối' : dataStatus === 'error' ? 'Ngoại tuyến' : 'Hệ thống trực tuyến'}
        </span>

        <button
          type="button"
          className="global-search"
          onClick={() => openDialog('search')}
          aria-label="Tìm kiếm toàn hệ thống"
        >
          <AppIcon name="search" size={16} />
          <span>Tìm kiếm nhanh...</span>
          <kbd>Ctrl K</kbd>
        </button>

        <span className="topbar-divider"></span>

        <button
          type="button"
          className="icon-button notification-button"
          onClick={() => openDialog('activity')}
          aria-label="Xem lịch sử hoạt động"
          title="Thông báo & Hoạt động"
        >
          <AppIcon name="bell" size={19} />
        </button>

        <span className="topbar-divider"></span>

        <Link
          href="/settings"
          className="topbar-user"
          title="Tài khoản & Cài đặt"
          aria-label="Cài đặt tài khoản"
        >
          <span className="avatar lavender" aria-hidden="true">
            {initials}
          </span>
        </Link>
      </div>
    </header>
  );
}
