import { describe, expect, it } from 'vitest';
import { customerEmailInputSchema, customersWithEmail, duplicateCustomerGroups, normalizeCustomerEmail } from '../src/domain/customer-identity';
import { commandSchema, executeCommand } from '../src/domain/commands';
import { dataSchema } from '../src/domain/data-schema';
import { createInitialData } from '../src/mocks/fixtures';

function setup() {
  const data = dataSchema.parse(createInitialData());
  let sequence = 0;
  const operation = { today: '2026-10-08', now: '2026-10-08T03:00:00Z', actor: 'identity-test', newId: (prefix: string) => `${prefix}-identity-${++sequence}` };
  return { data, operation };
}

describe('Customer email identity', () => {
  it('normalizes surrounding whitespace and letter case without merging email aliases', () => {
    expect(customerEmailInputSchema.parse('  A.B+sale@GMAIL.com  ')).toBe('a.b+sale@gmail.com');
    expect(normalizeCustomerEmail(' A.B+sale@GMAIL.com ')).not.toBe(normalizeCustomerEmail('ab@gmail.com'));
    expect(customerEmailInputSchema.parse('   ')).toBe('');
    expect(() => customerEmailInputSchema.parse('a b@example.com')).toThrow();
  });

  it('finds all matching profiles, ignores blank email and excludes the edited customer', () => {
    const customers = [{ id: 'a', email: ' Email@Example.com ' }, { id: 'b', email: 'email@example.com' }, { id: 'c', email: '' }, { id: 'd', email: ' ' }];
    expect(customersWithEmail(customers, ' EMAIL@example.com ')).toEqual(customers.slice(0, 2));
    expect(customersWithEmail(customers, 'email@example.com', 'a')).toEqual([customers[1]]);
    expect(customersWithEmail(customers, ' ')).toEqual([]);
    expect(duplicateCustomerGroups(customers)).toEqual([{ email: 'email@example.com', customers: customers.slice(0, 2) }]);
  });

  it('rejects duplicate create requests even if the client bypasses the warning', () => {
    const { data, operation } = setup();
    const before = structuredClone(data);
    const command = commandSchema.parse({ type: 'add_customer', input: { name: 'Tên khác', email: ` ${data.customers[0].email.toUpperCase()} ` } });
    expect(() => executeCommand(data, command, operation)).toThrow(/Email đã thuộc/);
    expect(data).toEqual(before);
  });

  it('creates a normalized address and rejects a second stale-client request', () => {
    const { data, operation } = setup();
    const command = commandSchema.parse({ type: 'add_customer', input: { name: 'Khách mới', email: '  NEW+Sale@Example.COM ' } });
    const first = executeCommand(data, command, operation);
    expect(first.data.customers[0].email).toBe('new+sale@example.com');
    expect(() => executeCommand(first.data, command, operation)).toThrow(/Email đã thuộc/);
    expect(first.data.customers.length).toBe(data.customers.length + 1);
  });

  it('blocks duplicate customer creation inside an order without creating a partial order', () => {
    const { data, operation } = setup();
    const product = data.products[0];
    const before = structuredClone(data);
    const command = commandSchema.parse({ type: 'create_order', input: { newCustomer: { name: 'Khách trùng', email: data.customers[0].email.toUpperCase() }, productId: product.id, planId: product.plans[0].id, startsAt: operation.today, price: 450123, cost: 210321, payment: 'paid' } });
    expect(() => executeCommand(data, command, operation)).toThrow(/Email đã thuộc/);
    expect(data).toEqual(before);
  });

  it('checks edits with the same normalization and allows saving the same profile', () => {
    const { data, operation } = setup();
    data.customers[0].email = ` ${data.customers[0].email.toUpperCase()} `;
    const change = commandSchema.parse({ type: 'update_customer', input: { id: data.customers[1].id, updates: { email: data.customers[0].email } } });
    expect(() => executeCommand(data, change, operation)).toThrow(/Email đã thuộc/);
    const same = commandSchema.parse({ type: 'update_customer', input: { id: data.customers[0].id, updates: { email: data.customers[0].email, name: 'Tên đã sửa' } } });
    const result = executeCommand(data, same, operation);
    expect(result.data.customers[0].name).toBe('Tên đã sửa');
    expect(result.data.customers[0].email).toBe(normalizeCustomerEmail(data.customers[0].email));
  });

  it('reviews legacy duplicates without mutation and lets staff edit notes on an existing profile', () => {
    const { data, operation } = setup();
    data.customers[1].email = data.customers[0].email;
    const before = structuredClone(data);
    expect(duplicateCustomerGroups(data.customers)[0].customers.map(customer => customer.id)).toEqual([data.customers[0].id, data.customers[1].id]);
    expect(data).toEqual(before);
    const result = executeCommand(data, commandSchema.parse({ type: 'update_customer', input: { id: data.customers[0].id, updates: { notes: 'Ghi chú mới' } } }), operation);
    expect(result.data.customers[0].notes).toBe('Ghi chú mới');
    expect(result.data.orders).toEqual(data.orders);
    expect(result.data.subscriptions).toEqual(data.subscriptions);
    expect(result.data.refunds).toEqual(data.refunds);
    expect(result.data.customers[1]).toEqual(data.customers[1]);
  });
});
