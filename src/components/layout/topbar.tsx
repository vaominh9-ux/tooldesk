'use client';

import React from 'react';
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
        <span className="demo-pill">
          <i></i>{dataStatus === 'connected' ? 'Đã tải Supabase' : dataStatus === 'loading' ? 'Đang tải dữ liệu' : dataStatus === 'error' ? 'Lỗi kết nối' : 'Dữ liệu mẫu'}
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
        >
          <AppIcon name="bell" size={19} />
        </button>
      </div>
    </header>
  );
}
