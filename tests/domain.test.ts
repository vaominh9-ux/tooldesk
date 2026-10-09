import { describe, it, expect } from 'vitest';
import { orderFinancials, totalPaid, cashSummary, formatMoney } from '../src/domain/money';
import { addDuration, addDays, daysLeft, formatDateLabel } from '../src/domain/dates';
import { subStatus, renewalDates } from '../src/domain/subscriptions';
import { validateRefundInput, refundServiceOption } from '../src/domain/refunds';
import { createShortId, formatOrderCode, formatCustomerCode } from '../src/domain/orders';
import { executeCommand } from '../src/domain/commands';
import { createInitialData } from '../src/mocks/fixtures';

describe('Domain: Money calculations', () => {
  it('correctly calculates order financials without floating point errors', () => {
    const order = {
      id: 'DH-1001',
      price: 450000,
      cost: 300000,
      payment: 'paid' as const,
      status: 'completed',
      date: '2026-10-01'
    };

    const res = orderFinancials(order, []);
    expect(res.collected).toBe(450000);
    expect(res.refunded).toBe(0);
    expect(res.costRecovered).toBe(0);
    expect(res.net).toBe(450000);
    expect(res.gross).toBe(150000);
    expect(res.status).toBe('paid');
  });

  it('correctly handles partial and full refunds', () => {
    const order = {
      id: 'DH-1002',
      price: 1000000,
      cost: 600000,
      payment: 'paid' as const,
      status: 'completed',
      date: '2026-10-01'
    };

    const refund1 = { id: 'r1', orderId: 'DH-1002', amount: 300000, costRecovered: 0, date: '2026-10-02' };
    const res1 = orderFinancials(order, [refund1]);
    expect(res1.refunded).toBe(300000);
    expect(res1.net).toBe(700000);
    expect(res1.gross).toBe(100000); // 700000 - 600000
    expect(res1.status).toBe('partially_refunded');

    const refund2 = { id: 'r2', orderId: 'DH-1002', amount: 700000, costRecovered: 200000, date: '2026-10-03' };
    const res2 = orderFinancials(order, [refund1, refund2]);
    expect(res2.refunded).toBe(1000000);
    expect(res2.costRecovered).toBe(200000);
    expect(res2.net).toBe(0);
    expect(res2.gross).toBe(-400000); // 0 - 600000 + 200000
    expect(res2.status).toBe('refunded');
  });
});

describe('Domain: Date arithmetic and exclusivity', () => {
  it('correctly clamps month durations on month end', () => {
    // Jan 31 + 1 month -> Feb 28
    const jan31 = '2026-01-31';
    expect(addDuration(jan31, 1, 'months')).toBe('2026-02-28');

    // Mar 31 + 1 month -> Apr 30
    const mar31 = '2026-03-31';
    expect(addDuration(mar31, 1, 'months')).toBe('2026-04-30');
  });

  it('calculates days left accurately with exclusive expiresAt', () => {
    const today = '2026-10-06';
    expect(daysLeft('2026-10-06', today)).toBe(0);
    expect(daysLeft('2026-10-07', today)).toBe(1);
    expect(daysLeft('2026-10-05', today)).toBe(-1);
  });
});

describe('Domain: Subscriptions & Renewals', () => {
  it('identifies expiring and expired status accurately', () => {
    const today = '2026-10-06';
    expect(subStatus({ startsAt: '2026-09-01', expiresAt: '2026-10-06' }, today)).toBe('expired');
    expect(subStatus({ startsAt: '2026-09-01', expiresAt: '2026-10-10' }, today)).toBe('expiring');
    expect(subStatus({ startsAt: '2026-09-01', expiresAt: '2026-11-01' }, today)).toBe('active');
    expect(subStatus({ cancelled: true, startsAt: '2026-09-01', expiresAt: '2026-11-01' }, today)).toBe('cancelled');
  });

  it('extends from current expiration date if still active', () => {
    const today = '2026-10-06';
    const sub = { cancelled: false, expiresAt: '2026-10-15' };
    const renewal = renewalDates(sub, { duration: 1, unit: 'months' }, today);
    expect(renewal.startsAt).toBe('2026-10-15');
    expect(renewal.expiresAt).toBe('2026-11-15');
  });

  it('resets from operating date if expired', () => {
    const today = '2026-10-06';
    const sub = { cancelled: false, expiresAt: '2026-10-01' };
    const renewal = renewalDates(sub, { duration: 1, unit: 'months' }, today);
    expect(renewal.startsAt).toBe('2026-10-06');
    expect(renewal.expiresAt).toBe('2026-11-06');
  });
});

describe('Domain: Refund validation', () => {
  it('does not allow ending a subscription without proof of its latest order', () => {
    const order = { id: 'old-order', subscriptionId: 'subscription', kind: 'new' as const };
    expect(refundServiceOption({ subscriptions: [{ id: 'subscription' }] }, order).allowed).toBe(false);
    expect(refundServiceOption({ subscriptions: [{ id: 'subscription', lastOrderId: 'newer-order' }] }, order).allowed).toBe(false);
    expect(refundServiceOption({ subscriptions: [{ id: 'subscription', lastOrderId: 'old-order' }] }, order).allowed).toBe(true);
  });

  it('rejects service rollback for a partially refunded latest order', () => {
    const order = { id: 'order', price: 400000, cost: 200000, payment: 'paid' as const, status: 'completed', date: '2026-10-01', subscriptionId: 'subscription', kind: 'new' as const };
    const data = { orders: [order], refunds: [], subscriptions: [{ id: 'subscription', lastOrderId: 'order' }] };
    expect(() => validateRefundInput(data, { orderId: 'order', amount: 100000, date: '2026-10-02', reason: 'Partial refund', method: 'bank', serviceAction: 'end' })).toThrow(/Chỉ kết thúc kỳ/);
  });

  it('uses the latest dated order for every demo subscription', () => {
    const data = createInitialData();
    for (const subscription of data.subscriptions) {
      const latest = data.orders.filter(order => order.subscriptionId === subscription.id).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0];
      expect(subscription.lastOrderId).toBe(latest?.id);
    }
  });
  it('rejects refund exceeding remaining amount', () => {
    const order = { id: 'DH-1', price: 400000, cost: 200000, payment: 'paid' as const, status: 'completed', date: '2026-10-01' };
    const data = { orders: [order], refunds: [], subscriptions: [] };

    expect(() => {
      validateRefundInput(data, {
        orderId: 'DH-1',
        amount: 500000,
        date: '2026-10-02',
        reason: 'Khách không hài lòng',
        method: 'bank'
      });
    }).toThrow(/Chỉ còn có thể hoàn/);
  });
});

describe('Domain: Short ID generation & display formatting', () => {
  it('generates concise short IDs with 6-char hex suffix', () => {
    const orderId = createShortId('DH');
    expect(orderId).toMatch(/^DH-[0-9A-F]{6}$/);

    const customerId = createShortId('KH');
    expect(customerId).toMatch(/^KH-[0-9A-F]{6}$/);

    const subId = createShortId('sub');
    expect(subId).toMatch(/^sub-[0-9a-f]{6}$/);
  });

  it('formats legacy long UUID order codes to clean 6-char display codes', () => {
    const legacy = 'DH-22cb7a14-4e00-48ae-8ede-ff64c5728ee7';
    expect(formatOrderCode(legacy)).toBe('DH-22CB7A');

    // Leaves already short codes untouched
    expect(formatOrderCode('DH-8F64C5')).toBe('DH-8F64C5');
    expect(formatOrderCode('DH-1')).toBe('DH-1');
  });

  it('formats legacy long UUID customer codes to clean 6-char display codes', () => {
    const legacy = 'KH-b2698857-965c-4047-becb-1276522862d9';
    expect(formatCustomerCode(legacy)).toBe('KH-B26988');

    // Leaves already short codes untouched
    expect(formatCustomerCode('KH-01')).toBe('KH-01');
    expect(formatCustomerCode('KH-965C40')).toBe('KH-965C40');
  });

  it('propagates note to subscription when creating order and updates via update_subscription_note', () => {
    const data = createInitialData();
    let sequence = 0;
    const op = {
      today: '2026-10-07',
      now: new Date().toISOString(),
      actor: 'Tester',
      newId: (p: string) => `${p}-TEST-${++sequence}`
    };

    const created = executeCommand(data, {
      type: 'create_order',
      input: {
        customerId: data.customers[0].id,
        productId: data.products[0].id,
        planId: data.products[0].plans[0].id,
        startsAt: '2026-10-07',
        price: 200000,
        cost: 100000,
        payment: 'paid',
        note: 'Tài khoản: account2@gmail.com'
      }
    }, op);

    const sub = created.data.subscriptions[0];
    expect(sub.note).toBe('Tài khoản: account2@gmail.com');

    const updated = executeCommand(created.data, {
      type: 'update_subscription_note',
      input: {
        subscriptionId: sub.id,
        note: 'Tài khoản: account_updated@gmail.com'
      }
    }, op);

    const updatedSub = updated.data.subscriptions.find(s => s.id === sub.id);
    expect(updatedSub?.note).toBe('Tài khoản: account_updated@gmail.com');
  });

  it('safely handles delete_plan with integrity rules', () => {
    const data = createInitialData();
    let count = 0;
    const op = { today: '2026-10-07', now: new Date().toISOString(), actor: 'Tester', newId: (p: string) => `${p}-${++count}` };

    // Create an unused product with 2 plans
    const prodAdded = executeCommand(data, {
      type: 'add_product',
      input: {
        name: 'Test Tool AI',
        symbol: 'TT',
        category: 'Test',
        description: 'Test Description',
        plans: [
          { name: 'Gói 1 tháng', duration: 1, unit: 'months', price: 100000, cost: 50000 },
          { name: 'Gói 1 năm', duration: 12, unit: 'months', price: 1000000, cost: 500000 }
        ]
      }
    }, op);

    const testProd = prodAdded.data.products.find(p => p.name === 'Test Tool AI')!;
    expect(testProd.plans.length).toBe(2);
    const planToDelete = testProd.plans[1];

    // Deleting one plan succeeds
    const deletedPlan = executeCommand(prodAdded.data, {
      type: 'delete_plan',
      input: { planId: planToDelete.id }
    }, op);

    const updatedProd = deletedPlan.data.products.find(p => p.name === 'Test Tool AI')!;
    expect(updatedProd.plans.length).toBe(1);
    expect(updatedProd.plans[0].name).toBe('Gói 1 tháng');

    // Deleting the last remaining plan throws error
    expect(() => {
      executeCommand(deletedPlan.data, {
        type: 'delete_plan',
        input: { planId: updatedProd.plans[0].id }
      }, op);
    }).toThrow('Mỗi sản phẩm cần giữ lại ít nhất 1 gói bán');

    // Deleting a plan linked to existing orders throws error
    const linkedPlanId = data.orders[0].planId;
    expect(() => {
      executeCommand(data, {
        type: 'delete_plan',
        input: { planId: linkedPlanId }
      }, op);
    }).toThrow('Không thể xóa gói này vì đã có đơn hàng hoặc gói dịch vụ liên kết');
  });

  it('safely handles delete_product with integrity rules', () => {
    const data = createInitialData();
    let count = 0;
    const op = { today: '2026-10-07', now: new Date().toISOString(), actor: 'Tester', newId: (p: string) => `${p}-${++count}` };

    // Create an unused product
    const prodAdded = executeCommand(data, {
      type: 'add_product',
      input: {
        name: 'Disposable Tool',
        symbol: 'DT',
        category: 'Test',
        description: 'Unused tool',
        plans: [{ name: 'Gói 1 tháng', duration: 1, unit: 'months', price: 50000, cost: 20000 }]
      }
    }, op);

    const productId = prodAdded.resultId!;
    expect(prodAdded.data.products.some(p => p.id === productId)).toBe(true);

    // Deleting unused product succeeds
    const deleted = executeCommand(prodAdded.data, {
      type: 'delete_product',
      input: { productId }
    }, op);
    expect(deleted.data.products.some(p => p.id === productId)).toBe(false);

    // Deleting a product linked to existing orders throws error
    const linkedProductId = data.orders[0].productId;
    expect(() => {
      executeCommand(data, {
        type: 'delete_product',
        input: { productId: linkedProductId }
      }, op);
    }).toThrow('Không thể xóa sản phẩm này vì đã có đơn hàng hoặc gói dịch vụ liên kết');
  });

  it('safely handles delete_order for new order, renewal rollback, and blocks if refunds exist', () => {
    const data = createInitialData();
    let count = 0;
    const op = { today: '2026-10-07', now: new Date().toISOString(), actor: 'Tester', newId: (p: string) => `${p}-${++count}` };

    // 1. Create a new order by mistake
    const created = executeCommand(data, {
      type: 'create_order',
      input: {
        customerId: data.customers[0].id,
        productId: data.products[0].id,
        planId: data.products[0].plans[0].id,
        startsAt: '2026-10-07',
        price: 300000,
        cost: 150000,
        payment: 'paid',
        note: 'Đơn tạo nhầm'
      }
    }, op);

    const orderId = created.resultId!;
    const orderCreated = created.data.orders.find(o => o.id === orderId)!;
    const subId = orderCreated.subscriptionId!;
    expect(created.data.subscriptions.some(s => s.id === subId)).toBe(true);

    // Deleting this mistaken order should remove both order and its isolated subscription
    const deleted = executeCommand(created.data, {
      type: 'delete_order',
      input: { orderId }
    }, op);

    expect(deleted.data.orders.some(o => o.id === orderId)).toBe(false);
    expect(deleted.data.subscriptions.some(s => s.id === subId)).toBe(false);

    // 2. Renewal order rollback
    const sub = data.subscriptions[0];
    const originalSubExpires = sub.expiresAt;
    const originalLastOrder = sub.lastOrderId;

    const renewed = executeCommand(data, {
      type: 'renew_subscription',
      input: {
        subscriptionId: sub.id,
        planId: sub.planId,
        price: 200000,
        cost: 100000,
        payment: 'paid'
      }
    }, op);

    const renewalOrderId = renewed.resultId!;
    const renewedSub = renewed.data.subscriptions.find(s => s.id === sub.id)!;
    expect(renewedSub.expiresAt).not.toBe(originalSubExpires);

    // Deleting the renewal order should roll back the subscription
    const rolledBack = executeCommand(renewed.data, {
      type: 'delete_order',
      input: { orderId: renewalOrderId }
    }, op);

    const restoredSub = rolledBack.data.subscriptions.find(s => s.id === sub.id)!;
    expect(restoredSub.expiresAt).toBe(originalSubExpires);
    expect(restoredSub.lastOrderId).toBe(originalLastOrder);

    // 3. Block deleting order if refund exists
    const orderWithRefund = data.refunds[0]?.orderId;
    if (orderWithRefund) {
      expect(() => {
        executeCommand(data, {
          type: 'delete_order',
          input: { orderId: orderWithRefund }
        }, op);
      }).toThrow('Đơn hàng đã có giao dịch hoàn tiền hoặc thu hồi vốn');
    }
  });
});

