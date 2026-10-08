import { describe, expect, it } from 'vitest';
import { commandSchema, executeCommand } from '../src/domain/commands';
import { dataSchema } from '../src/domain/data-schema';
import { createInitialData } from '../src/mocks/fixtures';

function setup() {
  const data = dataSchema.parse(createInitialData()), product = data.products[0];
  let sequence = 0;
  const operation = { today: '2026-10-08', now: '2026-10-08T03:00:00Z', actor: 'admin', newId: (prefix: string) => `${prefix}-product-${++sequence}` };
  const input = { productId: product.id, name: 'Tên sản phẩm mới', expectedPlanIds: product.plans.map(plan => plan.id), plans: structuredClone(product.plans) };
  const run = (value: unknown) => executeCommand(data, commandSchema.parse({ type: 'update_product', input: value }), operation);
  return { data, product, input, run };
}
describe('Atomic product and plan edits', () => {
  it('updates all defaults together, preserves IDs, zero values and financial history', () => {
    const { data, product, input, run } = setup();
    input.plans[0] = { ...input.plans[0], name: 'Gói mới', price: 0, cost: 500001 };
    const result = run(input);
    expect(result.data.products[0]).toMatchObject({ name: input.name, plans: input.plans });
    expect(data.products[0]).toEqual(product);
    expect(result.data.orders).toEqual(data.orders); expect(result.data.subscriptions).toEqual(data.subscriptions); expect(result.data.refunds).toEqual(data.refunds);
    expect(result.data.products[0].plans[0].price - result.data.products[0].plans[0].cost).toBe(-500001);
  });
  it('adds a new plan and edits an unused duration without replacing existing IDs', () => {
    const { data, input, run } = setup(); data.orders = []; data.subscriptions = [];
    const newPlan = { name: 'Gói 15 ngày', duration: 15, unit: 'days', price: 200000, cost: 0 };
    const result = run({ ...input, plans: [{ ...input.plans[0], duration: 7, unit: 'days' }, ...input.plans.slice(1), newPlan] });
    expect(result.data.products[0].plans[0].id).toBe(input.plans[0].id);
    expect(result.data.products[0].plans.at(-1)).toMatchObject({ ...newPlan, id: expect.stringContaining('pl-product') });
  });
  it('rejects foreign and repeated plan IDs', () => {
    const { data, input, run } = setup();
    expect(() => run({ ...input, plans: [...input.plans, data.products[1].plans[0]] })).toThrow('không thuộc');
    expect(() => run({ ...input, plans: [...input.plans, input.plans[0]] })).toThrow('bị lặp');
  });
  it('locks used durations and deletion, with no partially updated product', () => {
    const { data, input, product, run } = setup();
    const used = input.plans.find(plan => data.orders.some(order => order.planId === plan.id))!;
    expect(used).toBeDefined();
    expect(() => run({ ...input, plans: input.plans.map(plan => plan.id === used.id ? { ...plan, duration: 99 } : plan) })).toThrow('lịch sử');
    expect(() => run({ ...input, plans: input.plans.filter(plan => plan.id !== used.id) })).toThrow('Không thể xóa');
    expect(data.products[0]).toEqual(product);
  });
  it('allows removal of an unused plan while preserving one plan', () => {
    const { data, input, run } = setup(); data.orders = []; data.subscriptions = [];
    expect(run({ ...input, plans: [input.plans[0]] }).data.products[0].plans).toHaveLength(1);
    expect(() => run({ ...input, plans: [] })).toThrow();
  });
  it('rejects stale plan lists rather than deleting a concurrently added plan', () => {
    const { data, input, run } = setup();
    data.products[0].plans.push({ ...input.plans[0], id: 'concurrently-added' });
    expect(() => run(input)).toThrow('vừa thay đổi');
    expect(data.products[0].name).not.toBe(input.name);
    expect(() => run({ ...input, expectedPlanIds: [...input.expectedPlanIds, input.expectedPlanIds[0]] })).toThrow();
  });
  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid VND %s before any changes', value => {
    const { input, run } = setup();
    expect(() => run({ ...input, plans: [{ ...input.plans[0], price: value }, ...input.plans.slice(1)] })).toThrow();
  });
  it('requires a source plan list and leaves legacy product-only edits compatible', () => {
    const { product, input, run } = setup();
    expect(() => run({ ...input, expectedPlanIds: undefined })).toThrow();
    expect(run({ productId: product.id, name: 'Chỉ đổi tên' }).data.products[0].plans).toEqual(product.plans);
  });
});
