import { describe, expect, it } from 'vitest';
import { commandSchema, executeCommand } from '../src/domain/commands';
import { dataSchema } from '../src/domain/data-schema';
import { createInitialData } from '../src/mocks/fixtures';
import { reminderCandidates } from '../src/domain/reminders';

function setup() {
  const data = dataSchema.parse(createInitialData());
  let sequence = 0;
  const operation = { today: '2026-10-07', now: '2026-10-07T02:00:00Z', actor: 'manager@example.com', newId: (prefix: string) => prefix + '-test-' + ++sequence };
  return { data, operation };
}
describe('Backend commands', () => {
  it('retries ID collisions without overwriting an existing customer or history', () => {
    const { data, operation } = setup();
    let calls = 0;
    const result = executeCommand(data, commandSchema.parse({ type: 'add_customer', input: { name: 'Khách mới', email: 'unique@example.com' } }), { ...operation, newId: prefix => ++calls === 1 ? data.customers[0].id : `${prefix}-unique-${calls}` });
    expect(result.resultId).not.toBe(data.customers[0].id);
    expect(result.data.customers.find(item => item.id === data.customers[0].id)).toEqual(data.customers[0]);
    expect(result.data.orders).toEqual(data.orders);
  });
  it('aborts repeated ID collisions without modifying the original data', () => {
    const { data, operation } = setup(), before = structuredClone(data);
    expect(() => executeCommand(data, commandSchema.parse({ type: 'add_customer', input: { name: 'Khách mới', email: 'unique@example.com' } }), { ...operation, newId: () => data.customers[0].id })).toThrow(/duy nhất/);
    expect(data).toEqual(before);
  });
  it('rejects fractional/negative money and unknown fields', () => {
    const command = { type: 'create_order', input: { customerId: 'kh', productId: 'p', planId: 'pl', startsAt: '2026-10-07', price: -1, cost: 0, payment: 'paid' } };
    expect(() => commandSchema.parse(command)).toThrow();
    expect(() => commandSchema.parse({ ...command, input: { ...command.input, price: 1.5 } })).toThrow();
    expect(() => commandSchema.parse({ type: 'record_payment', input: { orderId: 'DH', price: 1 } })).toThrow();
  });
  it('creates an order and matching subscription without mutating original input', () => {
    const { data, operation } = setup();
    const product = data.products[0], plan = product.plans[0];
    const result = executeCommand(data, commandSchema.parse({ type: 'create_order', input: { customerId: data.customers[0].id, productId: product.id, planId: plan.id, startsAt: '2026-10-31', price: 100000, cost: 200000, payment: 'unpaid' } }), operation);
    expect(result.data.orders[0].expiresAt).toBe('2026-11-30');
    expect(result.data.orders[0].paidAt).toBeNull();
    expect(result.data.subscriptions[0].lastOrderId).toBe(result.resultId);
    expect(data.orders.length + 1).toBe(result.data.orders.length);
  });
  it('preserves the current subscription start when renewing early and supports full rollback', () => {
    const { data, operation } = setup();
    const sub = data.subscriptions.find(sub => sub.expiresAt > operation.today && sub.startsAt <= operation.today)!;
    const old = structuredClone(sub);
    const result = executeCommand(data, commandSchema.parse({ type: 'renew_subscription', input: { subscriptionId: sub.id, planId: sub.planId, price: 400000, cost: 200000, payment: 'paid' } }), operation);
    const renewed = result.data.subscriptions.find(item => item.id === sub.id)!;
    const order = result.data.orders[0];
    expect(renewed.startsAt).toBe(old.startsAt);
    expect(order.startsAt).toBe(old.expiresAt);
    expect(renewed.remindedAt).toBeNull();
    const refunded = executeCommand(result.data, commandSchema.parse({ type: 'record_refund', input: { operationId: '00000000-0000-4000-8000-000000000001', orderId: order.id, amount: 400000, date: operation.today, reason: 'Rollback kỳ gia hạn', method: 'bank', serviceAction: 'end' } }), operation);
    expect(refunded.data.subscriptions.find(item => item.id === old.id)?.expiresAt).toBe(old.expiresAt);
    expect(refunded.data.orders.find(item => item.id === order.id)?.price).toBe(400000);
    expect(refunded.data.refunds[0].costRecovered).toBe(0);
  });
  it('retries a full refund without recording it twice and rejects different content', () => {
    const { data, operation } = setup();
    const order = data.orders.find(item => item.payment === 'paid' && !data.refunds.some(refund => refund.orderId === item.id))!;
    const command = commandSchema.parse({ type: 'record_refund', input: { operationId: '00000000-0000-4000-8000-000000000002', orderId: order.id, amount: order.price, date: operation.today, reason: 'Hoàn đầy đủ', method: 'bank' } });
    const first = executeCommand(data, command, operation);
    const second = executeCommand(first.data, command, operation);
    expect(second.resultId).toBe(first.resultId);
    expect(second.data.refunds.length).toBe(first.data.refunds.length);
    if (command.type !== 'record_refund') throw new Error('Wrong command');
    expect(() => executeCommand(first.data, { ...command, input: { ...command.input, reason: 'Nội dung thay đổi' } }, operation)).toThrow(/Mã yêu cầu/);
  });
  it('does not overwrite paidAt on repeated payment', () => {
    const { data, operation } = setup();
    const order = data.orders.find(item => item.payment === 'paid')!;
    const result = executeCommand(data, commandSchema.parse({ type: 'record_payment', input: { orderId: order.id } }), operation);
    expect(result.data.orders.find(item => item.id === order.id)?.paidAt).toBe(order.paidAt);
    expect(result.data.activity.length).toBe(data.activity.length);
  });
  it('validates contact and consent updates without changing identity/history', () => {
    const { data, operation } = setup();
    const customer = data.customers[0];
    const result = executeCommand(data, commandSchema.parse({ type: 'update_customer', input: { id: customer.id, updates: { name: 'Tên cập nhật', emailConsent: 'unknown', consentSource: '' } } }), operation);
    expect(result.data.customers.find(item => item.id === customer.id)?.joinedAt).toBe(customer.joinedAt);
    expect(() => executeCommand(data, commandSchema.parse({ type: 'update_customer', input: { id: customer.id, updates: { emailConsent: 'opted_in', consentSource: '' } } }), operation)).toThrow();
  });
  it('updates product details (name, category, description, symbol) accurately', () => {
    const { data, operation } = setup();
    const product = data.products[0];
    const result = executeCommand(data, commandSchema.parse({
      type: 'update_product',
      input: {
        productId: product.id,
        name: 'ChatGPT Plus & Team',
        category: 'Trợ lý AI Nâng cao',
        description: 'Bản nâng cao hỗ trợ đa người dùng.',
        symbol: '✦'
      }
    }), operation);
    const updated = result.data.products.find(item => item.id === product.id)!;
    expect(updated.name).toBe('ChatGPT Plus & Team');
    expect(updated.category).toBe('Trợ lý AI Nâng cao');
    expect(updated.description).toBe('Bản nâng cao hỗ trợ đa người dùng.');
    expect(updated.symbol).toBe('✦');
    // Plans should remain intact
    expect(updated.plans.length).toBe(product.plans.length);
  });
});
describe('Reminder eligibility', () => {
  it('excludes expired, cancelled, scheduled, invalid emails and non-consenting customers', () => {
    const { data, operation } = setup();
    for (const item of reminderCandidates(data, operation.today)) {
      const sub = data.subscriptions.find(sub => sub.id === item.subscriptionId)!;
      const customer = data.customers.find(customer => customer.id === sub.customerId)!;
      expect(sub.cancelled).toBe(false);
      expect(sub.expiresAt > operation.today).toBe(true);
      expect(sub.startsAt <= operation.today).toBe(true);
      expect(customer.emailConsent).toBe('opted_in');
      expect(item.cycleKey).toContain(sub.expiresAt);
    }
    data.customers.forEach(customer => { customer.emailConsent = 'opted_out'; });
    expect(reminderCandidates(data, operation.today)).toEqual([]);
  });
  it('changes the deduplication key on renewal', () => {
    const { data, operation } = setup();
    const item = reminderCandidates(data, operation.today)[0];
    expect(item).toBeDefined();
    const sub = data.subscriptions.find(sub => sub.id === item.subscriptionId)!;
    sub.lastOrderId = 'new-order';
    expect(reminderCandidates(data, operation.today).find(candidate => candidate.subscriptionId === sub.id)?.cycleKey).not.toBe(item.cycleKey);
  });
});
