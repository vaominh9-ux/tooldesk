/**
 * Domain: Subscription state rules for Tooldesk
 */
import { addDuration, daysLeft, DEFAULT_APP_TODAY } from './dates';

export type SubscriptionStatus = 'cancelled' | 'scheduled' | 'expired' | 'expiring' | 'active';

export interface PlanDuration {
  duration: number;
  unit: 'months' | 'days';
}

export interface DomainSubscription {
  id: string;
  customerId: string;
  productId: string;
  planId: string;
  startsAt: string;
  expiresAt: string;
  price: number;
  cost: number;
  cancelled: boolean;
  remindedAt?: string | null;
  note?: string;
  lastOrderId?: string;
}

export function subStatus(
  sub: { cancelled?: boolean; startsAt: string; expiresAt: string },
  today = DEFAULT_APP_TODAY,
  windowDays = 7
): SubscriptionStatus {
  if (sub.cancelled) return 'cancelled';
  if (sub.startsAt > today) return 'scheduled';
  const left = daysLeft(sub.expiresAt, today);
  if (left <= 0) return 'expired';
  if (left <= windowDays) return 'expiring';
  return 'active';
}

export function isSubscriptionActive(
  sub: { cancelled?: boolean; startsAt: string; expiresAt: string },
  today = DEFAULT_APP_TODAY
): boolean {
  return !sub.cancelled && sub.startsAt <= today && sub.expiresAt > today;
}

export const isActive = isSubscriptionActive;

export function renewalDates(
  sub: { cancelled?: boolean; expiresAt: string },
  plan: PlanDuration,
  today = DEFAULT_APP_TODAY
): { startsAt: string; expiresAt: string } {
  const startsAt = !sub.cancelled && sub.expiresAt > today ? sub.expiresAt : today;
  return {
    startsAt,
    expiresAt: addDuration(startsAt, plan.duration, plan.unit)
  };
}
