import { describe, expect, it } from 'vitest';
import { commandSchema, executeCommand } from '../src/domain/commands';
import { dataSchema } from '../src/domain/data-schema';
import { createInitialData } from '../src/mocks/fixtures';

function setup() {
  const data = dataSchema.parse(createInitialData());
  let sequence = 0;
  const operation = { today: '2026-10-08', now: '2026-10-08T03:00:00Z', actor: 'test@example.com', newId: (prefix: string) => `${prefix}-audit-${++sequence}` };
  const product = data.products[0];
  const result = executeCommand(data, commandSchema.parse({ type: 'create_order', input: { customerId: data.customers[0].id, productId: product.id, planId: product.plans[0].id, startsAt: operation.today, price: 400001, cost: 200001, payment: 'paid' } }), operation);
  return { data: result.data, operation, order: result.data.orders[0] };
}

describe('Order edits preserve money and service history', () => {
  it('rejects invalid date ranges and plans from another product', () => {
    const { data, operation, order } = setup();
    for (const expiresAt of [order.startsAt, '2026-10-01']) {
      expect(() => executeCommand(data, commandSchema.parse({ type: 'update_order', input: { orderId: order.id, expiresAt } }), operation)).toThrow(/Ngày hết hạn/);
    }
    expect(() => executeCommand(data, commandSchema.parse({ type: 'update_order', input: { orderId: order.id, planId: data.products[1].plans[0].id } }), operation)).toThrow(/không thuộc/);
    expect(data.orders[0]).toEqual(order);
  });

  it('updates the latest order and subscription using integer VND', () => {
    const { data, operation, order } = setup();
    const result = executeCommand(data, commandSchema.parse({ type: 'update_order', input: { orderId: order.id, price: 450123, cost: 210321, note: 'Tài khoản mới' } }), operation);
    const subscription = result.data.subscriptions.find(item => item.id === order.subscriptionId)!;
    expect(subscription.price).toBe(450123);
    expect(subscription.cost).toBe(210321);
    expect(subscription.note).toBe('Tài khoản mới');
  });

  it('locks financial and service fields after a refund while allowing notes', () => {
    const { data, operation, order } = setup();
    const refunded = executeCommand(data, commandSchema.parse({ type: 'record_refund', input: { operationId: '00000000-0000-4000-8000-000000000098', orderId: order.id, amount: 100001, date: operation.today, reason: 'Hoàn một phần', method: 'bank' } }), operation).data;
    for (const update of [{ price: 50000 }, { cost: 0 }, { payment: 'unpaid' }, { expiresAt: '2026-12-01' }]) {
      expect(() => executeCommand(refunded, commandSchema.parse({ type: 'update_order', input: { orderId: order.id, ...update } }), operation)).toThrow(/bảo toàn lịch sử/);
    }
    const noteUpdate = executeCommand(refunded, commandSchema.parse({ type: 'update_order', input: { orderId: order.id, note: 'Khách đã nhận hoàn' } }), operation);
    expect(noteUpdate.data.refunds).toEqual(refunded.refunds);
    expect(noteUpdate.data.orders[0].price).toBe(400001);
  });

  it('editing an old order cannot overwrite a later renewal or its account', () => {
    const { data, operation, order } = setup();
    const renewed = executeCommand(data, commandSchema.parse({ type: 'renew_subscription', input: { subscriptionId: order.subscriptionId, planId: order.planId, price: 500001, cost: 300001, payment: 'paid' } }), operation).data;
    const current = renewed.subscriptions.find(item => item.id === order.subscriptionId)!;
    expect(() => executeCommand(renewed, commandSchema.parse({ type: 'update_order', input: { orderId: order.id, expiresAt: '2026-10-10' } }), operation)).toThrow(/kỳ trước/);
    const result = executeCommand(renewed, commandSchema.parse({ type: 'update_order', input: { orderId: order.id, note: 'Ghi chú lịch sử' } }), operation);
    expect(result.data.subscriptions.find(item => item.id === current.id)).toEqual(current);
  });

  it('editing a continuous renewal preserves the original service start and rollback snapshot', () => {
    const { data, operation, order } = setup();
    const renewed = executeCommand(data, commandSchema.parse({ type: 'renew_subscription', input: { subscriptionId: order.subscriptionId, planId: order.planId, price: 500001, cost: 300001, payment: 'paid' } }), operation).data;
    const renewal = renewed.orders[0];
    const result = executeCommand(renewed, commandSchema.parse({ type: 'update_order', input: { orderId: renewal.id, startsAt: renewal.startsAt, expiresAt: '2027-01-08', price: 500123 } }), operation);
    expect(result.data.subscriptions.find(item => item.id === order.subscriptionId)?.startsAt).toBe(order.startsAt);
    expect(result.data.orders[0].previousSubscription).toEqual(renewal.previousSubscription);
    expect(() => executeCommand(renewed, commandSchema.parse({ type: 'update_order', input: { orderId: renewal.id, startsAt: '2026-11-09' } }), operation)).toThrow(/kỳ trước/);
  });
});
