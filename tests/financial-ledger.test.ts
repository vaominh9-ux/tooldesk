import { describe, expect, it } from 'vitest';
import { cashSummary, calculateTotals, orderFinancials, totalPaid } from '../src/domain/money';
import { addDuration, dayInHoChiMinh, parseDay } from '../src/domain/dates';
import { audienceFor, searchFilter } from '../src/domain/orders';
import { createInitialData } from '../src/mocks/fixtures';

describe('Cash ledger and calendar edge cases', () => {
  const order = { id: 'test-sale', productId: 'product-a', date: '2026-12-31', paidAt: '2027-01-01', price: 450123, cost: 300001, payment: 'paid' as const, status: 'completed', kind: 'new' as const };
  const refund = { orderId: order.id, amount: 450123, costRecovered: 0, date: '2027-02-01' };
  const recovery = { orderId: order.id, amount: 0, costRecovered: 125123, date: '2027-03-01' };
  const data = { orders: [order], refunds: [refund, recovery] };

  it('records the payment in the receiving month instead of the order month', () => {
    expect(calculateTotals(data, '2026-12').received).toBe(0);
    const january = calculateTotals(data, '2027-01');
    expect(january.received).toBe(450123);
    expect(january.cost).toBe(300001);
    expect(january.gross).toBe(150122);
    expect(january.orders).toBe(0);
  });

  it('preserves a negative cash month and does not invent cost recovery', () => {
    const february = calculateTotals(data, '2027-02');
    expect(february.received).toBe(0);
    expect(february.revenue).toBe(-450123);
    expect(february.gross).toBe(-450123);
    expect(february.costRecovered).toBe(0);
    expect(february.refundCount).toBe(1);
    expect(calculateTotals(data, '2027-03').gross).toBe(125123);
    expect(calculateTotals(data, '2027-03').refundCount).toBe(0);
  });

  it('reconciles order lifetime values with the cash ledger and product totals', () => {
    const full = cashSummary(data, '2026-01-01', '2027-12-31');
    const lifetime = orderFinancials(order, data.refunds);
    expect(full.revenue).toBe(totalPaid(data.orders, data.refunds));
    expect(full.gross).toBe(lifetime.gross);
    expect(lifetime.gross).toBe(-174878);
    expect(cashSummary(data, '2026-01-01', '2027-12-31', 'product-a')).toEqual(full);
    expect(cashSummary(data, '2026-01-01', '2027-12-31', 'other-product').revenue).toBe(0);
  });

  it('excludes cancelled and unpaid orders from received money and booked cost', () => {
    expect(orderFinancials({ ...order, status: 'cancelled' }).gross).toBe(0);
    expect(orderFinancials({ ...order, payment: 'unpaid' }).gross).toBe(0);
    expect(cashSummary({ orders: [{ ...order, status: 'cancelled' }, { ...order, id: 'unpaid', payment: 'unpaid' }] }, '2026-01-01', '2027-12-31').received).toBe(0);
  });

  it('clamps leap years and distinguishes 30 days from a calendar month', () => {
    expect(addDuration('2028-01-31', 1, 'months')).toBe('2028-02-29');
    expect(addDuration('2028-02-29', 12, 'months')).toBe('2029-02-28');
    expect(addDuration('2026-01-31', 30, 'days')).toBe('2026-03-02');
    expect(() => parseDay('2026-02-29')).toThrow();
  });

  it('uses midnight in Vietnam regardless of the UTC day', () => {
    expect(dayInHoChiMinh(new Date('2026-10-07T16:59:59Z'))).toBe('2026-10-07');
    expect(dayInHoChiMinh(new Date('2026-10-07T17:00:00Z'))).toBe('2026-10-08');
  });

  it('searches Vietnamese names without accents and in any token order', () => {
    expect(searchFilter([{ name: 'Đặng Thị Ánh' }, { name: 'Nguyễn Minh Anh' }], 'anh dang', item => item.name)).toEqual([{ name: 'Đặng Thị Ánh' }]);
  });

  it('counts only valid, consenting, unique email recipients', () => {
    const fixture = createInitialData();
    fixture.customers = [
      { ...fixture.customers[0], email: 'First@Example.com', emailConsent: 'opted_in' },
      { ...fixture.customers[1], email: 'first@example.com', emailConsent: 'opted_in' },
      { ...fixture.customers[2], email: 'invalid-email', emailConsent: 'opted_in' },
      { ...fixture.customers[3], email: 'other@example.com', emailConsent: 'unknown' }
    ];
    const result = audienceFor(fixture, 'all', '2026-10-08');
    expect(result.eligible).toHaveLength(1);
    expect(result.excluded).toEqual({ duplicate: 1, invalidEmail: 1, noConsent: 1 });
  });
});
