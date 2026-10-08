'use client';

import type { AppData } from '@/domain/data-schema';
import { formatCustomerCode } from '@/domain/orders';

export function CustomerEmailMatches({ customers, onUse }: {
  customers: AppData['customers'];
  onUse?: (customerId: string) => void;
}) {
  return (
    <div id="customer-email-matches" aria-live="polite" aria-atomic="true">
      {customers.length > 0 && <section className="customer-email-matches hint-banner amber">
        <strong>{customers.length === 1 ? 'Email này đã có hồ sơ khách hàng.' : `Email này đang có ${customers.length} hồ sơ. Chọn đúng khách trước khi tiếp tục.`}</strong>
        <p>Dùng hồ sơ hiện có để giữ chung lịch sử mua hàng.</p>
        <ul>
          {customers.map(customer => <li key={customer.id}>
            <div><strong>{customer.name}</strong><small>{formatCustomerCode(customer.id)}{customer.phone ? ` · ${customer.phone}` : ''}</small></div>
            <div className="customer-email-match-actions">
              <a className="button small" href={`/customers?id=${encodeURIComponent(customer.id)}`} target="_blank" rel="noreferrer" aria-label={`Xem hồ sơ ${customer.name} (tab mới)`}>Xem hồ sơ</a>
              {onUse && <button type="button" className="button small primary" onClick={() => onUse(customer.id)} aria-label={`Dùng khách ${customer.name}`}>Dùng khách này</button>}
            </div>
          </li>)}
        </ul>
      </section>}
    </div>
  );
}
