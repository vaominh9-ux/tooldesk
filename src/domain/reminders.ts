import { daysLeft, formatDateLabel } from './dates';
import type { AppData } from './data-schema';
import { isValidEmail } from './orders';

export function reminderCandidates(data: AppData, today: string) {
  return data.subscriptions.flatMap(subscription => {
    const left = daysLeft(subscription.expiresAt, today);
    const customer = data.customers.find(item => item.id === subscription.customerId);
    const product = data.products.find(item => item.id === subscription.productId);
    if (subscription.cancelled || subscription.startsAt > today || left <= 0 || left > data.settings.reminderDays || !customer || customer.emailConsent !== 'opted_in' || !isValidEmail(customer.email) || !product) return [];
    return [{ subscriptionId: subscription.id, cycleKey: subscription.id + ':' + subscription.expiresAt + ':' + (subscription.lastOrderId || 'legacy'), email: customer.email.trim().toLowerCase(), subject: data.settings.shopName + ' · Nhắc gia hạn ' + product.name, text: 'Chào ' + customer.name + ',\n\nGói ' + product.name + ' của bạn còn ' + left + ' ngày và hết hạn lúc 00:00 ngày ' + formatDateLabel(subscription.expiresAt, true) + ' (giờ Việt Nam).\nVui lòng liên hệ ' + data.settings.ownerName + ' để được hỗ trợ gia hạn.\n\n' + data.settings.shopName }];
  });
}
