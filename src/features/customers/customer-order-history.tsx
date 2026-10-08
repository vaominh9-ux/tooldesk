import type { ReactNode } from 'react';
import { AppIcon } from '@/components/shared/app-icon';
import { formatDateLabel } from '@/domain/dates';
import { formatMoney, orderFinancials } from '@/domain/money';
import { formatOrderCode } from '@/domain/orders';
import type { Order, Product, Refund } from '@/mocks/fixtures';

interface CustomerOrderHistoryProps {
  orders: Order[];
  products: Product[];
  refunds: Refund[];
  renderPaymentBadge: (order: Order) => ReactNode;
  onOpenOrder: (orderId: string) => void;
}

export function CustomerOrderHistory({ orders, products, refunds, renderPaymentBadge, onOpenOrder }: CustomerOrderHistoryProps) {
  return (
    <div className="mobile-records customer-order-history">
      {orders.map(order => {
        const product = products.find(item => item.id === order.productId);
        const plan = product?.plans.find(item => item.id === order.planId);
        const financials = orderFinancials(order, refunds);

        return (
          <article className="record-card" key={order.id}>
            <div className="record-top">
              <button
                type="button"
                className="text-link order-number"
                onClick={() => onOpenOrder(order.id)}
                aria-label={`Xem đơn ${formatOrderCode(order.id)}`}
                title={`Mã đơn: ${order.id}`}
              >
                {formatOrderCode(order.id)}
                <AppIcon name="chevron" size={16} />
              </button>
              {renderPaymentBadge(order)}
            </div>
            <div className="product-cell">
              <span className={`product-logo ${product?.color || 'mint'}`} aria-hidden="true">
                {product?.symbol || '◈'}
              </span>
              <div>
                <strong>{product?.name || 'Sản phẩm'}</strong>
                {plan && <small>{plan.name}</small>}
              </div>
            </div>
            <div className="record-bottom">
              <span><AppIcon name="calendar" size={14} />{formatDateLabel(order.date, true)}</span>
              <strong className="record-amount">{formatMoney(order.price)}</strong>
            </div>
            {financials.refunded > 0 && (
              <div className="record-refund">
                <span>Đã hoàn {formatMoney(financials.refunded)}</span>
                <strong>Thực thu {formatMoney(financials.net)}</strong>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
