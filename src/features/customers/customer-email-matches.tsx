'use client';

import type { AppData } from '@/domain/data-schema';
import { formatCustomerCode } from '@/domain/orders';
import { AppIcon } from '@/components/shared/app-icon';

export function CustomerEmailMatches({ customers, onUse }: {
  customers: AppData['customers'];
  onUse?: (customerId: string) => void;
}) {
  return (
    <div id="customer-email-matches" aria-live="polite" aria-atomic="true">
      {customers.length > 0 && <section className="customer-email-matches hint-banner amber">
        <div className="customer-email-match-heading">
          <AppIcon name="warning" size={18} />
          <div>
            <strong>{customers.length === 1 ? 'Email đã có hồ sơ khách hàng' : `Email này có ${customers.length} hồ sơ trùng`}</strong>
            <p>{customers.length === 1 ? 'Dùng hồ sơ có sẵn để giữ chung lịch sử.' : 'Chọn đúng khách để giữ chung lịch sử.'}</p>
          </div>
        </div>
        <ul>
          {customers.map(customer => <li key={customer.id} className={`customer-email-match${onUse ? ' has-use' : ''}`}>
            <div className="customer-email-match-info"><strong>{customer.name}</strong><small>{formatCustomerCode(customer.id)}{customer.phone ? ` · ${customer.phone}` : ''}</small></div>
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
