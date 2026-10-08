/**
 * Domain: Order & Customer search, filtering and audience helpers
 */
import { isSubscriptionActive, subStatus } from './subscriptions';
import { totalPaid } from './money';
import { DEFAULT_APP_TODAY } from './dates';
import type { AppData } from './data-schema';
import { normalizeCustomerEmail } from './customer-identity';

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
  orders: AppData['orders'];
  subscriptions: AppData['subscriptions'];
  spend: number;
  activeCount: number;
}

export function getCustomerStats(
  data: Pick<AppData, 'orders' | 'subscriptions'> & { refunds?: AppData['refunds'] },
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
  data: Pick<AppData, 'customers' | 'orders' | 'subscriptions'> & { refunds?: AppData['refunds']; settings?: { reminderDays?: number } },
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
    const email = normalizeCustomerEmail(c.email);
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

/**
 * Generate a concise, user-friendly ID (e.g. DH-728EE7, KH-965C40, sub-a4e022)
 * 6-character hex provides 16.7+ million distinct IDs without long messy UUID strings.
 */
export function createShortId(prefix: string): string {
  let hex = '';
  if (typeof crypto !== 'undefined') {
    if (crypto.randomUUID) {
      hex = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
    } else if (crypto.getRandomValues) {
      const bytes = new Uint8Array(3);
      crypto.getRandomValues(bytes);
      hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }
  }
  if (!hex) {
    hex = Math.random().toString(36).slice(2, 8);
  }
  const isUpper = prefix === 'DH' || prefix === 'KH' || prefix === 'HT';
  return `${isUpper ? prefix.toUpperCase() : prefix.toLowerCase()}-${isUpper ? hex.toUpperCase() : hex.toLowerCase()}`;
}

/**
 * Format order ID to a clean, user-friendly short code for UI display.
 * If given a long UUID like DH-22cb7a14-4e00-48ae-8ede-ff64c5728ee7,
 * it returns a clean DH-22CB7A.
 */
export function formatOrderCode(orderId: string): string {
  if (!orderId) return '';
  if (orderId.startsWith('DH-') && orderId.length > 15) {
    const core = orderId.slice(3).replace(/-/g, '');
    return `DH-${core.slice(0, 6).toUpperCase()}`;
  }
  return orderId;
}

/**
 * Format customer ID to a clean, user-friendly short code for UI display.
 * If given KH-b2698857-965c-4047-becb-1276522862d9,
 * it returns KH-B26988.
 */
export function formatCustomerCode(customerId: string): string {
  if (!customerId) return '';
  if (customerId.toLowerCase().startsWith('kh-') && customerId.length > 15) {
    const core = customerId.slice(3).replace(/-/g, '');
    return `KH-${core.slice(0, 6).toUpperCase()}`;
  }
  return customerId;
}

