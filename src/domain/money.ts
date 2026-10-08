/**
 * Domain: Money and financial calculations for Tooldesk
 * Rule: Money is stored as integer VND. No floating-point errors.
 * Refunds never overwrite the original sale (append-only ledger).
 */

export interface OrderFinancialSummary {
  collected: number;
  refunded: number;
  costRecovered: number;
  bookedCost: number;
  net: number;
  remainingRefund: number;
  remainingCost: number;
  gross: number;
  status: 'unpaid' | 'paid' | 'partially_refunded' | 'refunded';
}

export interface MinimalOrder {
  id: string;
  price: number;
  cost: number;
  payment: 'paid' | 'unpaid';
  status?: string;
  paidAt?: string | null;
  date: string;
  productId?: string;
  kind?: 'new' | 'renewal';
}

export interface MinimalRefund {
  id?: string;
  orderId: string;
  amount: number;
  costRecovered?: number;
  date?: string;
  reason?: string;
  kind?: string;
}

export function formatMoney(value: number, compact = false): string {
  const rounded = Math.round(value || 0);
  if (compact && Math.abs(rounded) >= 1_000_000) {
    const formatted = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(rounded / 1_000_000);
    return `${formatted} tr`;
  }
  return new Intl.NumberFormat('vi-VN').format(rounded) + ' ₫';
}

export function orderFinancials(
  order: MinimalOrder,
  refunds: MinimalRefund[] = []
): OrderFinancialSummary {
  const entries = refunds.filter(r => r.orderId === order.id);
  const collected = order.payment === 'paid' && order.status !== 'cancelled' ? Math.round(order.price) : 0;
  const refunded = entries.reduce((sum, r) => sum + Math.round(r.amount || 0), 0);
  const costRecovered = entries.reduce((sum, r) => sum + Math.round(r.costRecovered || 0), 0);
  const bookedCost = order.status !== 'cancelled' && order.payment === 'paid' ? Math.round(order.cost) : 0;
  const net = collected - refunded;

  const remainingRefund = Math.max(0, collected - refunded);
  const remainingCost = Math.max(0, bookedCost - costRecovered);
  const gross = net - bookedCost + costRecovered;

  let status: 'unpaid' | 'paid' | 'partially_refunded' | 'refunded' = 'unpaid';
  if (order.payment !== 'paid') {
    status = 'unpaid';
  } else if (refunded === 0) {
    status = 'paid';
  } else if (refunded >= collected) {
    status = 'refunded';
  } else {
    status = 'partially_refunded';
  }

  return {
    collected,
    refunded,
    costRecovered,
    bookedCost,
    net,
    remainingRefund,
    remainingCost,
    gross,
    status
  };
}

export function totalPaid(orders: MinimalOrder[], refunds: MinimalRefund[] = []): number {
  return orders.reduce((sum, order) => sum + orderFinancials(order, refunds).net, 0);
}

export interface CashPeriodSummary {
  received: number;
  refunded: number;
  costRecovered: number;
  cost: number;
  revenue: number;
  gross: number;
  paidOrders: number;
  refundCount: number;
  events: MinimalRefund[];
}

export function cashSummary(
  data: { orders: MinimalOrder[]; refunds?: MinimalRefund[] },
  from: string,
  through: string,
  productId = ''
): CashPeriodSummary {
  const inPeriod = (date?: string | null) => !!date && date.slice(0, 10) >= from && date.slice(0, 10) <= through;
  const orders = data.orders.filter(o => !productId || o.productId === productId);
  const orderIds = new Set(orders.map(o => o.id));

  const paid = orders.filter(
    o => o.payment === 'paid' && o.status !== 'cancelled' && inPeriod(o.paidAt || o.date)
  );

  const events = (data.refunds || []).filter(r => orderIds.has(r.orderId) && inPeriod(r.date));

  const received = paid.reduce((sum, o) => sum + Math.round(o.price), 0);
  const cost = paid.reduce((sum, o) => sum + Math.round(o.cost), 0);
  const refunded = events.reduce((sum, r) => sum + Math.round(r.amount), 0);
  const costRecovered = events.reduce((sum, r) => sum + Math.round(r.costRecovered || 0), 0);

  const revenue = received - refunded;
  const gross = revenue - cost + costRecovered;

  return {
    received,
    refunded,
    costRecovered,
    cost,
    revenue,
    gross,
    paidOrders: paid.length,
    refundCount: events.filter(r => r.amount > 0).length,
    events
  };
}

export interface MonthlyTotals extends CashPeriodSummary {
  orders: number;
  newOrders: number;
  renewals: number;
  unpaid: number;
}

export function calculateTotals(
  data: { orders: MinimalOrder[]; refunds?: MinimalRefund[] },
  month: string
): MonthlyTotals {
  const ordersInMonth = data.orders.filter(o => o.date.startsWith(month) && o.status !== 'cancelled');
  const cash = cashSummary(data, `${month}-01`, `${month}-31`);

  const newOrders = ordersInMonth.filter(o => o.kind === 'new').length;
  const renewals = ordersInMonth.filter(o => o.kind === 'renewal').length;
  const unpaid = data.orders
    .filter(o => o.date.startsWith(month) && o.payment === 'unpaid' && o.status !== 'cancelled')
    .reduce((s, o) => s + Math.round(o.price), 0);

  return {
    ...cash,
    orders: ordersInMonth.length,
    newOrders,
    renewals,
    unpaid
  };
}
