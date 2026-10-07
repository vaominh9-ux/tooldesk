'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppIcon } from '../shared/app-icon';
import { useTooldesk } from '@/features/context/tooldesk-context';

interface MobileNavigationProps {
  mobileOpen?: boolean;
  onToggleMobile?: () => void;
}

export function MobileNavigation({ mobileOpen = false, onToggleMobile }: MobileNavigationProps) {
  const pathname = usePathname();
  const { openDialog } = useTooldesk();

  const isMoreActive = !['/', '/orders', '/subscriptions'].includes(pathname);

  return (
    <nav className="mobile-dock" aria-label="Điều hướng nhanh">
      <Link
        href="/"
        prefetch={true}
        className={`dock-item ${pathname === '/' ? 'active' : ''}`}
        aria-current={pathname === '/' ? 'page' : undefined}
      >
        <AppIcon name="grid" size={21} />
        <span>Tổng quan</span>
      </Link>

      <Link
        href="/orders"
        prefetch={true}
        className={`dock-item ${pathname.startsWith('/orders') ? 'active' : ''}`}
        aria-current={pathname.startsWith('/orders') ? 'page' : undefined}
      >
        <AppIcon name="orders" size={21} />
        <span>Đơn hàng</span>
      </Link>

      <button
        type="button"
        className="dock-item dock-create"
        onClick={() => openDialog('create-order')}
        aria-label="Tạo đơn hàng mới"
      >
        <span className="dock-plus">
          <AppIcon name="plus" size={22} />
        </span>
        <span>Tạo đơn</span>
      </button>

      <Link
        href="/subscriptions"
        prefetch={true}
        className={`dock-item ${pathname.startsWith('/subscriptions') ? 'active' : ''}`}
        aria-current={pathname.startsWith('/subscriptions') ? 'page' : undefined}
      >
        <AppIcon name="layers" size={21} />
        <span>Gói dịch vụ</span>
      </Link>

      <button
        type="button"
        className={`dock-item mobile-more ${isMoreActive || mobileOpen ? 'active' : ''}`}
        onClick={onToggleMobile}
        aria-label="Mở tất cả chức năng"
        aria-expanded={mobileOpen}
      >
        <AppIcon name="menu" size={21} />
        <span>Thêm</span>
      </button>
    </nav>
  );
}
