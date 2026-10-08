import { cashSummary, calculateTotals } from './money';
import type { MinimalOrder, MinimalRefund } from './money';

type ReportData = { orders: MinimalOrder[]; refunds: MinimalRefund[] };
export function reportMonths(data: ReportData, today: string): string[] {
  return [...new Set([today.slice(0, 7), ...data.orders.flatMap(order => [order.date.slice(0, 7), (order.paidAt || order.date).slice(0, 7)]), ...data.refunds.map(refund => refund.date?.slice(0, 7) || '')])]
    .filter(value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value)).sort().reverse();
}
export function reportSummary(data: ReportData, month: string | null, productId = '') {
  if (month !== null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Tháng báo cáo không hợp lệ.');
  const filtered = { orders: data.orders.filter(order => !productId || order.productId === productId), refunds: data.refunds };
  if (month) return calculateTotals(filtered, month);
  const cash = cashSummary(filtered, '0001-01-01', '9999-12-31', productId);
  const orders = filtered.orders.filter(order => order.status !== 'cancelled');
  return { ...cash, orders: orders.length, newOrders: orders.filter(order => order.kind === 'new').length, renewals: orders.filter(order => order.kind === 'renewal').length, unpaid: orders.filter(order => order.payment === 'unpaid').reduce((sum, order) => sum + order.price, 0) };
}
export function ordersInReport<T extends MinimalOrder>(data: { orders: T[]; refunds: MinimalRefund[] }, month: string | null): T[] {
  const refundedIds = new Set(data.refunds.filter(refund => !month || refund.date?.startsWith(month)).map(refund => refund.orderId));
  return data.orders.filter(order => order.status !== 'cancelled' && (!month || order.date.startsWith(month) || (order.payment === 'paid' && (order.paidAt || order.date).startsWith(month)) || refundedIds.has(order.id)));
}
