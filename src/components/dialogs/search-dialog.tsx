'use client';

import { useBackdropDismiss } from './use-backdrop-dismiss';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '../shared/app-icon';
import { formatMoney } from '@/domain/money';
import { formatOrderCode, formatCustomerCode, normalizeText } from '@/domain/orders';

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data, openDialog } = useTooldesk();
  const backdropDismiss = useBackdropDismiss(onClose);
  const [query, setQuery] = useState('');

  // Handle Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const q = normalizeText(query);

  const filteredCustomers = q
    ? data.customers
        .filter(c => normalizeText(`${c.name} ${c.id} ${formatCustomerCode(c.id)} ${c.email || ''} ${c.phone || ''}`).includes(q))
        .slice(0, 5)
    : [];

  const filteredOrders = q
    ? data.orders
        .filter(o => {
          const cust = data.customers.find(c => c.id === o.customerId);
          const prod = data.products.find(p => p.id === o.productId);
          return normalizeText(`${o.id} ${formatOrderCode(o.id)} ${cust?.name || ''} ${cust?.email || ''} ${cust?.phone || ''} ${prod?.name || ''}`).includes(q);
        })
        .slice(0, 4)
    : [];

  const handleGo = (route: string) => {
    router.push(`/${route === 'dashboard' ? '' : route}`);
    onClose();
  };

  const handleCustomer = (id: string) => {
    router.push(`/customers?id=${id}`);
    onClose();
  };

  const handleOrder = (id: string) => {
    onClose();
    openDialog('order-detail', id);
  };

  return (
    <div className="dialog-overlay center" {...backdropDismiss}>
      <dialog
        id="active-dialog"
        className="command-dialog"
        open
        aria-label="Tìm kiếm toàn hệ thống"
        onClick={e => e.stopPropagation()}
      >
        <div className="command-input">
          <AppIcon name="search" size={20} />
          <input
            id="global-query"
            aria-label="Tìm tên, email, số điện thoại hoặc mã đơn"
            placeholder="Tìm khách hàng, email hoặc mã đơn..."
            autoComplete="off"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng tìm kiếm"><AppIcon name="close" size={18} /></button>
        </div>

        <div className="command-results" id="command-results">
          {!q ? (
            <>
              <div className="command-label">ĐI NHANH ĐẾN</div>
              {[
                { route: 'subscriptions', icon: 'clock', title: 'Gói dịch vụ', desc: 'Xem hạn dùng và xử lý gia hạn' },
                { route: 'customers', icon: 'users', title: 'Khách hàng', desc: 'Tìm thông tin và lịch sử mua' },
                { route: 'orders', icon: 'orders', title: 'Đơn hàng', desc: 'Xem giao dịch và thanh toán' },
                { route: 'campaigns', icon: 'megaphone', title: 'Chăm sóc khách hàng', desc: 'Soạn chương trình ưu đãi' }
              ].map(item => (
                <button
                  key={item.route}
                  type="button"
                  className="command-result"
                  onClick={() => handleGo(item.route)}
                >
                  <AppIcon name={item.icon} size={20} />
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.desc}</small>
                  </div>
                  <AppIcon name="arrow" size={15} />
                </button>
              ))}
            </>
          ) : (
            <>
              {filteredCustomers.length > 0 && (
                <>
                  <div className="command-label">KHÁCH HÀNG</div>
                  {filteredCustomers.map(c => {
                    const initials = c.name.split(/\s+/).slice(-2).map(s => s[0]).join('').toUpperCase() || '?';
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className="command-result"
                        onClick={() => handleCustomer(c.id)}
                      >
                        <span className={`avatar ${c.color || 'lavender'}`} aria-hidden="true">
                          {initials}
                        </span>
                        <div>
                          <strong>{c.name}</strong>
                          <small>{c.email || c.phone || 'Chưa có liên hệ'} · {formatCustomerCode(c.id)}</small>
                        </div>
                        <AppIcon name="arrow" size={15} />
                      </button>
                    );
                  })}
                </>
              )}

              {filteredOrders.length > 0 && (
                <>
                  <div className="command-label">ĐƠN HÀNG</div>
                  {filteredOrders.map(o => {
                    const cust = data.customers.find(c => c.id === o.customerId);
                    const prod = data.products.find(p => p.id === o.productId);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className="command-result"
                        onClick={() => handleOrder(o.id)}
                      >
                        <AppIcon name="orders" size={20} />
                        <div>
                          <strong>{formatOrderCode(o.id)} · {prod?.name || 'Sản phẩm'}</strong>
                          <small>{cust?.name || 'Khách hàng'} · {formatMoney(o.price)}</small>
                        </div>
                        <AppIcon name="arrow" size={15} />
                      </button>
                    );
                  })}
                </>
              )}

              {filteredCustomers.length === 0 && filteredOrders.length === 0 && (
                <div className="empty-state" style={{ padding: '36px 16px' }}>
                  <h3>Chưa tìm thấy kết quả</h3>
                  <p>Thử tên, email, số điện thoại hoặc mã đơn.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="command-foot">
          ↑ ↓ Chọn kết quả · Enter Mở · Esc Đóng
        </div>
      </dialog>
    </div>
  );
}
