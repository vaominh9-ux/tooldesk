/**
 * Domain: Order & Customer search, filtering and audience helpers
 */
import { isSubscriptionActive, subStatus } from './subscriptions';
import { totalPaid } from './money';
import { DEFAULT_APP_TODAY } from './dates';

export function normalizeText(value = ''): string {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

export function searchFilter<T>(rows: T[], query: string, project: (row: T) => string): T[] {
  if (!query.trim()) return rows;
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  return rows.filter(row => tokens.every(token => normalizeText(project(row)).includes(token)));
}

export function paginate<T>(rows: T[], page: number, pageSize = 8): {
  items: T[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
} {
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.max(1, Math.min(page, pages));
  return {
    items: rows.slice((current - 1) * pageSize, current * pageSize),
    total: rows.length,
    page: current,
    pages,
    pageSize
  };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

export interface CustomerStats {
  orders: any[];
  subscriptions: any[];
  spend: number;
  activeCount: number;
}

export function getCustomerStats(
  data: { orders: any[]; subscriptions: any[]; refunds?: any[] },
  customerId: string,
  today = DEFAULT_APP_TODAY
): CustomerStats {
  const orders = data.orders.filter(o => o.customerId === customerId && o.status !== 'cancelled');
  const subscriptions = data.subscriptions.filter(s => s.customerId === customerId);
  return {
    orders,
    subscriptions,
    spend: totalPaid(orders, data.refunds || []),
    activeCount: subscriptions.filter(s => isSubscriptionActive(s, today)).length
  };
}

export function audienceFor(
  data: { customers: any[]; orders: any[]; subscriptions: any[]; refunds?: any[]; settings?: any },
  segment = 'all',
  today = DEFAULT_APP_TODAY
) {
  const reminderDays = data.settings?.reminderDays || 7;
  const selected = data.customers.filter(c => {
    const stats = getCustomerStats(data, c.id, today);
    if (segment === 'active') return stats.activeCount > 0;
    if (segment === 'expiring') {
      return stats.subscriptions.some(s => subStatus(s, today, reminderDays) === 'expiring');
    }
    if (segment === 'expired') {
      return stats.activeCount === 0 && stats.subscriptions.some(s => subStatus(s, today) === 'expired');
    }
    if (segment === 'vip') return stats.spend >= 2_000_000;
    return true;
  });

  const unique = new Set<string>();
  const excluded = { noConsent: 0, invalidEmail: 0, duplicate: 0 };
  const eligible = selected.filter(c => {
    if (c.emailConsent !== 'opted_in') {
      excluded.noConsent++;
      return false;
    }
    if (!isValidEmail(c.email)) {
      excluded.invalidEmail++;
      return false;
    }
    const email = c.email.trim().toLowerCase();
    if (unique.has(email)) {
      excluded.duplicate++;
      return false;
    }
    unique.add(email);
    return true;
  });

  return {
    selected,
    eligible,
    excluded,
    excludedCount: selected.length - eligible.length
  };
}
