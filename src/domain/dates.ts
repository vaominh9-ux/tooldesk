/**
 * Domain: Date helpers for Tooldesk
 * Rule: expiresAt is EXCLUSIVE: a package expiring 2026-10-06 is expired at
 * 00:00 Asia/Ho_Chi_Minh on that date.
 * Calendar months clamp to month end (e.g. Jan 31 + 1 month = Feb 28).
 */

export const DEFAULT_APP_TODAY = '2026-10-06';
export function runtimeToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)?.value;
  return get('year') + '-' + get('month') + '-' + get('day');
}

export function parseDay(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) {
    throw new Error('Ngày không hợp lệ (định dạng YYYY-MM-DD).');
  }
  const date = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {
    throw new Error('Ngày không hợp lệ.');
  }
  return date;
}

export function addDays(iso: string, days: number): string {
  const date = parseDay(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addDuration(iso: string, count: number, unit: 'months' | 'days' = 'months'): string {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('Thời hạn phải là số nguyên dương.');
  }
  if (unit === 'days') return addDays(iso, count);
  if (unit !== 'months') throw new Error('Đơn vị thời hạn không hợp lệ.');

  const date = parseDay(iso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + count);

  const lastDayOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDayOfMonth));
  return date.toISOString().slice(0, 10);
}

export function daysLeft(expiresAt: string, today: string = DEFAULT_APP_TODAY): number {
  return Math.round((parseDay(expiresAt).getTime() - parseDay(today).getTime()) / 86400000);
}

export function formatDateLabel(value?: string | null, includeYear = false): string {
  if (!value) return '—';
  const parts = value.slice(0, 10).split('-');
  if (parts.length < 3) return value;
  return `${parts[2]}/${parts[1]}${includeYear ? '/' + parts[0] : ''}`;
}

export interface MinimalSubscription {
  startsAt: string;
  expiresAt: string;
  cancelled?: boolean;
}

export function remainingLabel(sub: MinimalSubscription, today: string = DEFAULT_APP_TODAY): string {
  if (sub.cancelled) return 'Đã dừng';
  if (sub.startsAt > today) return 'Chưa bắt đầu';
  const days = daysLeft(sub.expiresAt, today);
  if (days === 0) return 'Hết hạn hôm nay';
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 1) return 'Còn 1 ngày';
  return `Còn ${days} ngày`;
}
