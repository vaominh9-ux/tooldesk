import { describe, expect, it } from 'vitest';
import { reportSummary, reportMonths, ordersInReport } from '@/domain/reporting-period';
import { commandSchema, executeCommand } from '@/domain/commands';
import { createInitialData } from '@/mocks/fixtures';

const order = { id: 'old', productId: 'p', date: '2026-09-15', paidAt: '2026-09-16', price: 400000, cost: 200000, payment: 'paid' as const, status: 'completed', kind: 'new' as const };
const data = {
  orders: [order, { ...order, id: 'late', date: '2026-09-20', paidAt: '2026-10-02', price: 300000, cost: 100000 }, { ...order, id: 'unpaid', paidAt: null, price: 500000, payment: 'unpaid' as const }, { ...order, id: 'cancelled', date: '2026-10-01', paidAt: '2026-10-01', status: 'cancelled' }],
  refunds: [{ orderId: 'old', date: '2026-10-03', amount: 100000, costRecovered: 0 }, { orderId: 'old', date: '2026-11-04', amount: 0, costRecovered: 50000 }]
};
function setup() {
  let sequence = 0;
  const fixture = createInitialData();
  const operation = { today: '2026-10-08', now: '2026-10-08T03:00:00Z', actor: 'test', newId: (prefix: string) => `${prefix}-dates-${++sequence}` };
  const input = { customerId: fixture.customers[0].id, productId: fixture.products[0].id, planId: fixture.products[0].plans[0].id, startsAt: '2026-08-15', date: '2026-09-15', paidAt: '2026-09-16', price: 400000, cost: 200000, payment: 'paid' as const };
  return { fixture, operation, input };
}
describe('Reports across accounting periods', () => {
  it('reconciles all time with the sum of months, including negative refunds and later recovery', () => {
    const all = reportSummary(data, null);
    expect(all).toMatchObject({ received: 700000, refunded: 100000, cost: 300000, costRecovered: 50000, revenue: 600000, gross: 350000, unpaid: 500000, orders: 3 });
    const months = ['2026-09', '2026-10', '2026-11'].map(month => reportSummary(data, month));
    expect(months.reduce((sum, item) => sum + item.revenue, 0)).toBe(all.revenue);
    expect(months.reduce((sum, item) => sum + item.gross, 0)).toBe(all.gross);
    expect(reportSummary(data, '2026-09').received).toBe(400000);
    expect(reportSummary(data, '2026-10').received).toBe(300000);
    expect(reportSummary(data, '2026-11').gross).toBe(50000);
  });
  it('keeps product charts aligned with the selected scope', () => {
    expect(reportSummary(data, null, 'p')).toEqual(reportSummary(data, null));
    expect(reportSummary(data, '2026-10', 'missing')).toMatchObject({ revenue: 0, refunded: 0, gross: 0 });
  });
  it('lists orders with sales, receipts or refunds in the month and exposes every event month', () => {
    expect(ordersInReport(data, '2026-10').map(item => item.id)).toEqual(['old', 'late']);
    expect(reportMonths(data, '2026-10-08')).toEqual(['2026-11', '2026-10', '2026-09']);
    expect(reportSummary(data, '2026-08').revenue).toBe(0);
    expect(() => reportSummary(data, '2026-13')).toThrow(/Tháng/);
  });
});
describe('Entering and correcting historical order dates', () => {
  it('records old sales and receipts separately from the service start and import date', () => {
    const { fixture, operation, input } = setup();
    const result = executeCommand(fixture, commandSchema.parse({ type: 'create_order', input }), operation);
    const saved = result.data.orders.find(item => item.id === result.resultId)!;
    expect(saved).toMatchObject({ date: '2026-09-15', paidAt: '2026-09-16', startsAt: '2026-08-15' });
    const only = { orders: [saved], refunds: [] };
    expect(reportSummary(only, '2026-08').received).toBe(0);
    expect(reportSummary(only, '2026-09').received).toBe(400000);
    expect(reportSummary(only, '2026-10').received).toBe(0);
  });
  it('uses the explicit historical sales day as receipt default, and preserves existing defaults when omitted', () => {
    const { fixture, operation, input } = setup();
    const historical = executeCommand(fixture, commandSchema.parse({ type: 'create_order', input: { ...input, paidAt: undefined } }), operation);
    expect(historical.data.orders[0].paidAt).toBe('2026-09-15');
    const current = executeCommand(fixture, commandSchema.parse({ type: 'create_order', input: { ...input, date: undefined, paidAt: undefined } }), operation);
    expect(current.data.orders[0]).toMatchObject({ date: operation.today, paidAt: operation.today });
  });
  it('rejects future dates, receipt before sale and receipts on unpaid orders', () => {
    const { fixture, operation, input } = setup();
    for (const changes of [{ date: '2026-10-09' }, { paidAt: '2026-10-09' }, { paidAt: '2026-09-14' }, { payment: 'unpaid' }]) {
      expect(() => executeCommand(fixture, commandSchema.parse({ type: 'create_order', input: { ...input, ...changes } }), operation)).toThrow();
    }
    expect(() => commandSchema.parse({ type: 'create_order', input: { ...input, date: '2026-02-30' } })).toThrow();
  });
  it('moves an imported receipt to the right month without changing money, service or ledger', () => {
    const { fixture, operation, input } = setup();
    const created = executeCommand(fixture, commandSchema.parse({ type: 'create_order', input: { ...input, date: operation.today, paidAt: operation.today } }), operation);
    const saved = created.data.orders[0], previousSubscription = structuredClone(created.data.subscriptions);
    const corrected = executeCommand(created.data, commandSchema.parse({ type: 'update_order', input: { orderId: saved.id, date: '2026-09-15', paidAt: '2026-09-16' } }), operation);
    expect(corrected.data.subscriptions).toEqual(previousSubscription);
    expect(corrected.data.refunds).toEqual(created.data.refunds);
    expect(corrected.data.activity[0].description).toContain('2026-10-08 → 2026-09-15');
    expect(corrected.data.activity[0].description).toContain('2026-10-08 → 2026-09-16');
    expect(corrected.data.orders.find(item => item.id === saved.id)).toMatchObject({ price: saved.price, cost: saved.cost, startsAt: saved.startsAt, expiresAt: saved.expiresAt, date: '2026-09-15', paidAt: '2026-09-16' });
    expect(reportSummary({ orders: [corrected.data.orders.find(item => item.id === saved.id)!], refunds: [] }, '2026-10').received).toBe(0);
  });
  it('allows correcting a historical order but keeps payment before existing refund events', () => {
    const { fixture, operation, input } = setup();
    const created = executeCommand(fixture, commandSchema.parse({ type: 'create_order', input }), operation);
    const saved = created.data.orders[0];
    created.data.subscriptions.find(item => item.id === saved.subscriptionId)!.lastOrderId = 'later-order';
    created.data.refunds.push({ id: 'test-refund', operationId: 'test-op', orderId: saved.id, date: '2026-09-20', amount: 10000, costRecovered: 0, reason: 'Test' });
    expect(() => executeCommand(created.data, commandSchema.parse({ type: 'update_order', input: { orderId: saved.id, date: '2026-09-10', paidAt: '2026-09-11' } }), operation)).not.toThrow();
    expect(() => executeCommand(created.data, commandSchema.parse({ type: 'update_order', input: { orderId: saved.id, paidAt: '2026-09-21' } }), operation)).toThrow(/sau ngày hoàn/);
    expect(() => executeCommand(created.data, commandSchema.parse({ type: 'update_order', input: { orderId: saved.id, price: 1 } }), operation)).toThrow();
  });
  it('records a historical receipt and refuses to silently change it on a retry', () => {
    const { fixture, operation, input } = setup();
    const created = executeCommand(fixture, commandSchema.parse({ type: 'create_order', input: { ...input, payment: 'unpaid', paidAt: undefined } }), operation);
    const paid = executeCommand(created.data, commandSchema.parse({ type: 'record_payment', input: { orderId: created.resultId, paidAt: '2026-09-25' } }), operation);
    expect(paid.data.orders[0].paidAt).toBe('2026-09-25');
    expect(() => executeCommand(paid.data, commandSchema.parse({ type: 'record_payment', input: { orderId: created.resultId, paidAt: '2026-10-08' } }), operation)).toThrow(/Đơn đã thu/);
  });
});
