import { describe, expect, it } from 'vitest';
import { createInitialData } from '@/mocks/fixtures';
import { commandSchema, executeCommand } from '@/domain/commands';
import { expiredReminderMilestone, subStatus } from '@/domain/subscriptions';
import { zaloNotificationCandidates, zaloDefaultPreferences } from '@/domain/zalo-notifications';
import { reminderCandidates } from '@/domain/reminders';
import { reportSummary } from '@/domain/reporting-period';

function setup() {
  const data = createInitialData();
  const sub = data.subscriptions[0];
  Object.assign(sub, { startsAt: '2026-09-01', expiresAt: '2026-10-05', cancelled: false });
  let sequence = 0;
  const operation = { today: '2026-10-08', now: '2026-10-08T03:00:00Z', actor: 'staff@example.com', newId: (prefix: string) => `${prefix}-tracking-${++sequence}` };
  const command = commandSchema.parse({ type: 'stop_subscription_tracking', input: { subscriptionId: sub.id, expectedExpiresAt: sub.expiresAt, reason: 'Khách không gia hạn' } });
  return { data, sub, operation, command };
}

describe('Stop tracking without altering sales history', () => {
  it('removes an expired service from actionable states and reminders, preserving every financial record', () => {
    const { data, sub, operation, command } = setup();
    const result = executeCommand(data, command, operation);
    expect(sub.cancelled).toBe(false);
    expect(result.data.subscriptions[0]).toEqual({ ...sub, cancelled: true });
    expect(subStatus(result.data.subscriptions[0], operation.today)).toBe('cancelled');
    expect(result.data.orders).toEqual(data.orders);
    expect(result.data.refunds).toEqual(data.refunds);
    expect(result.data.customers).toEqual(data.customers);
    expect(result.data.careAppointments).toEqual(data.careAppointments);
    expect(reportSummary(result.data, null)).toEqual(reportSummary(data, null));
    expect(result.data.activity[0]).toMatchObject({ title: 'Dừng theo dõi gói · Không gia hạn', at: operation.now });
    expect(result.data.activity[0].description).toContain('staff@example.com');
    expect(result.data.activity[0].description).toContain('Khách không gia hạn');
    expect(zaloNotificationCandidates(result.data, operation.today, operation.now, 'https://example.com', { ...zaloDefaultPreferences, enabled: true, sendHour: 0 }).some(item => item.eventKey.startsWith(`subscription:${sub.id}:`))).toBe(false);
    expect(reminderCandidates(result.data, operation.today).some(item => item.subscriptionId === sub.id)).toBe(false);
  });
  it('retries without a duplicate log and rejects a stale cycle or unknown service', () => {
    const { data, sub, operation, command } = setup();
    const first = executeCommand(data, command, operation);
    expect(executeCommand(first.data, command, operation).data).toBe(first.data);
    const changed = structuredClone(data); changed.subscriptions[0].expiresAt = '2026-10-06';
    expect(() => executeCommand(changed, command, operation)).toThrow(/Kỳ dịch vụ đã thay đổi/);
    expect(() => executeCommand(data, commandSchema.parse({ type: command.type, input: { subscriptionId: 'missing', expectedExpiresAt: sub.expiresAt, reason: 'Không gia hạn' } }), operation)).toThrow(/Không tìm thấy/);
  });
  it('requires a reason and refuses to stop active or future services as non-renewals', () => {
    const { data, operation, command } = setup();
    expect(() => commandSchema.parse({ type: command.type, input: { subscriptionId: 'sub', expectedExpiresAt: '2026-10-05', reason: '  ' } })).toThrow();
    for (const startsAt of ['2026-09-01', '2026-10-10']) {
      data.subscriptions[0].startsAt = startsAt; data.subscriptions[0].expiresAt = '2026-11-01';
      const current = commandSchema.parse({ type: command.type, input: { subscriptionId: data.subscriptions[0].id, expectedExpiresAt: '2026-11-01', reason: 'Không gia hạn' } });
      expect(() => executeCommand(data, current, operation)).toThrow(/đã hết hạn/);
    }
  });
  it('reopens by creating a new paid service cycle from today, retaining old orders', () => {
    const { data, sub, operation, command } = setup();
    const stopped = executeCommand(data, command, operation);
    const renewed = executeCommand(stopped.data, commandSchema.parse({ type: 'renew_subscription', input: { subscriptionId: sub.id, planId: sub.planId, price: 400000, cost: 200000, payment: 'paid' } }), operation);
    expect(renewed.data.subscriptions[0]).toMatchObject({ cancelled: false, startsAt: operation.today, lastOrderId: renewed.resultId, remindedAt: null });
    expect(renewed.data.orders.slice(1)).toEqual(data.orders);
    expect(renewed.data.orders[0]).toMatchObject({ kind: 'renewal', startsAt: operation.today, date: operation.today });
  });
});

describe('Overdue follow-up windows', () => {
  it.each([
    ['2026-10-07', null], ['2026-10-08', 0], ['2026-10-10', 0],
    ['2026-10-11', 3], ['2026-10-14', 3], ['2026-10-15', 7],
    ['2026-10-21', 7], ['2026-10-22', null], ['2027-10-08', null]
  ])('selects a bounded milestone on %s', (today, expected) => {
    expect(expiredReminderMilestone('2026-10-08', today)).toBe(expected);
  });
  it('catches up only the current milestone and never sends for services older than 14 days', () => {
    const { data, sub, operation } = setup(); data.subscriptions = [sub]; data.careAppointments = [];
    const prefs = { ...zaloDefaultPreferences, enabled: true, sendHour: 0 };
    const items = (today: string) => zaloNotificationCandidates(data, today, operation.now, 'https://example.com', prefs);
    expect(items('2026-10-10')[0].eventKey).toBe(items('2026-10-08')[0].eventKey);
    expect(items('2026-10-10')[0].text).toContain('Quá hạn 5 ngày');
    expect(items('2026-10-12')[0].eventKey).not.toBe(items('2026-10-08')[0].eventKey);
    expect(items('2026-10-19')).toEqual([]);
    expect(subStatus(sub, '2026-10-19')).toBe('expired');
  });
});
