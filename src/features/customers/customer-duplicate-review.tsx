'use client';

import type { AppData } from '@/domain/data-schema';
import { duplicateCustomerGroups } from '@/domain/customer-identity';
import { formatCustomerCode, getCustomerStats, searchFilter } from '@/domain/orders';
import { formatMoney } from '@/domain/money';
import { AppIcon } from '@/components/shared/app-icon';

export function CustomerDuplicateReview({ data, today, search, onView }: {
  data: AppData; today: string; search: string; onView: (customerId: string) => void;
}) {
  const allGroups = duplicateCustomerGroups(data.customers);
  const groups = searchFilter(allGroups, search, group => `${group.email} ${group.customers.map(customer => `${customer.name} ${formatCustomerCode(customer.id)} ${customer.phone}`).join(' ')}`);
  return <section className="customer-duplicate-review" aria-label="Hồ sơ nghi trùng email">
    <p className="dialog-note">Nhóm theo email, không phân biệt chữ hoa/thường và khoảng trắng đầu/cuối. Xem từng hồ sơ trước khi xử lý; lịch sử đơn hàng và gói dịch vụ vẫn được giữ riêng.</p>
    {groups.length === 0 ? <div className="empty-state">
      <AppIcon name="shield" size={32} />
      <h3>{allGroups.length ? 'Không tìm thấy nhóm phù hợp' : 'Không có hồ sơ trùng email'}</h3>
      <p>{allGroups.length ? 'Thử tìm theo email, tên hoặc mã khách hàng.' : 'Chưa phát hiện nhiều hồ sơ sử dụng cùng một email. Khách chỉ có số điện thoại không được tính vào nhóm này.'}</p>
    </div> : <>
      <p className="dialog-note">{groups.length} nhóm · {groups.reduce((sum, group) => sum + group.customers.length, 0)} hồ sơ</p>
      {groups.map(group => <article key={group.email} className="customer-duplicate-group">
        <header><strong>{group.email}</strong><span className="badge amber">{group.customers.length} hồ sơ</span></header>
        <ul>{group.customers.map(customer => {
          const stats = getCustomerStats(data, customer.id, today);
          return <li key={customer.id}>
            <div><strong>{customer.name}</strong><small>{formatCustomerCode(customer.id)} · {customer.source || 'Chưa có nguồn'}{customer.phone ? ` · ${customer.phone}` : ''}</small>
              <p>{stats.orders.length} đơn · {stats.activeCount} gói đang dùng · Chi tiêu ròng {formatMoney(stats.spend)}</p>
            </div>
            <button type="button" className="button small" onClick={() => onView(customer.id)} aria-label={`Xem hồ sơ ${customer.name}`}>Xem hồ sơ</button>
          </li>;
        })}</ul>
      </article>)}
    </>}
  </section>;
}
