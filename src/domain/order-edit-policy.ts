import type { AppData } from './data-schema';

export function orderEditPolicy(data: Pick<AppData, 'subscriptions' | 'refunds'>, order: AppData['orders'][number]) {
  const subscription = data.subscriptions.find(item => item.id === order.subscriptionId);
  const hasLedger = data.refunds.some(item => item.orderId === order.id);
  const historical = Boolean(subscription && subscription.lastOrderId !== order.id);
  const locked = order.status === 'cancelled' || hasLedger || historical;
  const continuousRenewal = order.kind === 'renewal' && Boolean(
    order.previousSubscription && !order.previousSubscription.cancelled && order.previousSubscription.expiresAt > order.date
  );
  const reason = hasLedger
    ? 'Đơn đã có hoàn tiền hoặc thu hồi giá vốn. Giữ nguyên số tiền, thanh toán và kỳ dịch vụ để bảo toàn lịch sử.'
    : historical
      ? 'Đây là đơn của kỳ trước. Giữ nguyên kỳ lịch sử; ghi nhận thanh toán qua nút Thu tiền nếu cần.'
      : order.status === 'cancelled'
        ? 'Đơn đã hủy. Chỉ có thể cập nhật ghi chú.'
        : '';
  return { locked, continuousRenewal, reason };
}
