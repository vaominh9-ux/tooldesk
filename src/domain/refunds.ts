/**
 * Domain: Refunds and Cost Recovery rules
 */
import { orderFinancials, formatMoney } from './money';
import { parseDay, formatDateLabel, DEFAULT_APP_TODAY } from './dates';
import type { MinimalOrder, MinimalRefund } from './money';
import type { DomainSubscription } from './subscriptions';

export interface RefundInput {
  operationId?: string;
  orderId: string;
  amount: number;
  costRecovered?: number;
  date: string;
  reason: string;
  method: 'bank' | 'cash' | 'wallet' | 'other';
  reference?: string;
  serviceAction?: 'keep' | 'end';
  actor?: string;
}

export interface DomainRefundRecord {
  id: string;
  operationId: string;
  orderId: string;
  amount: number;
  costRecovered: number;
  date: string;
  reason: string;
  method: string;
  reference: string;
  serviceAction: 'keep' | 'end';
  actor: string;
  createdAt: string;
  kind: 'refund' | 'cost_recovery';
}

export interface RefundServiceOptionResult {
  allowed: boolean;
  label: string;
  hint: string;
}

export function refundServiceOption(
  data: {
    subscriptions: Array<{
      id: string;
      cancelled?: boolean;
      lastOrderId?: string;
    }>;
  },
  order: {
    id: string;
    subscriptionId?: string;
    kind?: 'new' | 'renewal';
    previousSubscription?: { expiresAt: string };
  }
): RefundServiceOptionResult {
  const sub = data.subscriptions.find(s => s.id === order.subscriptionId);
  if (!sub || sub.cancelled || sub.lastOrderId !== order.id) {
    return {
      allowed: false,
      label: 'Giữ nguyên gói dịch vụ',
      hint: 'Đơn này không phải kỳ mới nhất hoặc gói đã dừng. Không tự thay đổi các kỳ khác.'
    };
  }

  if (order.kind === 'renewal' && !order.previousSubscription) {
    return {
      allowed: false,
      label: 'Giữ nguyên gói dịch vụ',
      hint: 'Đơn cũ chưa lưu ảnh chụp kỳ trước. Giữ nguyên gói để tránh mất thời hạn đã mua.'
    };
  }

  return {
    allowed: true,
    label: order.kind === 'renewal' ? 'Hủy kỳ gia hạn này, khôi phục kỳ trước' : 'Dừng gói của đơn này',
    hint: order.kind === 'renewal'
      ? `Khôi phục hạn trước gia hạn: ${formatDateLabel(order.previousSubscription?.expiresAt, true)}.`
      : 'Dừng theo dõi gói này trong ứng dụng. Không tự thu hồi quyền truy cập tại nhà cung cấp.'
  };
}

export function validateRefundInput(
  data: {
    orders: Array<MinimalOrder & { subscriptionId?: string; previousSubscription?: DomainSubscription }>;
    refunds?: Array<MinimalRefund & { operationId?: string; serviceAction?: string }>;
    subscriptions: Array<{ id: string; cancelled?: boolean; lastOrderId?: string }>;
  },
  input: RefundInput,
  today = DEFAULT_APP_TODAY
): { order: MinimalOrder & { subscriptionId?: string; previousSubscription?: DomainSubscription }; financials: ReturnType<typeof orderFinancials> } {
  const ledger = data.refunds || [];
  if (input.operationId) {
    const duplicate = ledger.find(r => r.operationId === input.operationId);
    if (duplicate) {
      if (
        duplicate.orderId !== input.orderId ||
        duplicate.amount !== Number(input.amount) ||
        duplicate.costRecovered !== Number(input.costRecovered || 0) ||
        duplicate.date !== input.date ||
        duplicate.serviceAction !== (input.serviceAction || 'keep')
      ) {
        throw new Error('Mã yêu cầu đã được dùng cho nội dung khác. Vui lòng mở lại phiếu để kiểm tra.');
      }
    }
  }

  const order = data.orders.find(o => o.id === input.orderId);
  if (!order || order.payment !== 'paid' || order.status === 'cancelled') {
    throw new Error('Chỉ ghi nhận hoàn tiền cho đơn đã nhận tiền và chưa hủy.');
  }

  const f = orderFinancials(order, data.refunds);
  const amount = Number(input.amount);
  const costRecovered = Number(input.costRecovered || 0);

  if (![amount, costRecovered].every(n => Number.isSafeInteger(n) && n >= 0)) {
    throw new Error('Số tiền phải là số nguyên không âm, tính bằng đồng.');
  }
  if (amount === 0 && costRecovered === 0) {
    throw new Error('Cần có khoản hoàn tiền hoặc giá vốn thực tế thu hồi.');
  }
  if (amount > f.remainingRefund) {
    throw new Error(`Chỉ còn có thể hoàn ${formatMoney(f.remainingRefund)} cho đơn này.`);
  }
  if (costRecovered > f.remainingCost) {
    throw new Error(`Giá vốn còn có thể thu hồi là ${formatMoney(f.remainingCost)}.`);
  }
  if (amount === 0 && f.refunded === 0) {
    throw new Error('Chỉ ghi nhận thu hồi giá vốn riêng sau khi đơn đã có hoàn tiền.');
  }

  const date = input.date;
  parseDay(date);
  if (date > today) {
    throw new Error('Không ghi nhận giao dịch hoàn tiền trong tương lai.');
  }
  const paidDate = (order.paidAt || order.date).slice(0, 10);
  if (date < paidDate) {
    throw new Error('Ngày ghi nhận không được trước ngày nhận tiền.');
  }

  const reason = String(input.reason || '').trim();
  if (reason.length < 3 || reason.length > 500) {
    throw new Error('Nhập lý do từ 3 đến 500 ký tự.');
  }
  if (!['bank', 'cash', 'wallet', 'other'].includes(input.method)) {
    throw new Error('Chọn phương thức giao dịch hợp lệ.');
  }

  const action = input.serviceAction || 'keep';
  if (!['keep', 'end'].includes(action)) {
    throw new Error('Cách xử lý gói không hợp lệ.');
  }
  if (action === 'end') {
    if (amount !== f.remainingRefund || amount === 0) {
      throw new Error('Chỉ kết thúc kỳ khi hoàn hết số tiền còn lại.');
    }
    if (!refundServiceOption(data, order).allowed) {
      throw new Error('Gói đã thay đổi. Vui lòng giữ nguyên gói và kiểm tra lại lịch sử.');
    }
  }

  return { order, financials: f };
}
