'use client';

import { useId, type ReactNode } from 'react';
import { AppIcon } from '@/components/shared/app-icon';
import type { AppData } from '@/domain/data-schema';
import { formatDateLabel } from '@/domain/dates';
import { formatMoney, type OrderFinancialSummary } from '@/domain/money';
import { formatOrderCode } from '@/domain/orders';

interface OrderRecordCardProps {
  order: AppData['orders'][number];
  customer?: AppData['customers'][number];
  product?: AppData['products'][number];
  plan?: AppData['products'][number]['plans'][number];
  financials: OrderFinancialSummary;
  paymentBadge: ReactNode;
  onOpen: (orderId: string) => void;
}

export function OrderRecordCard({
  order, customer, product, plan, financials, paymentBadge, onOpen,
}: OrderRecordCardProps) {
  const customerName = customer?.name || 'Khách đã xóa';
  const orderCode = formatOrderCode(order.id);
  const descriptionId = useId();

  return (
    <article className="record-card order-record-card">
      <button
        type="button"
        className="order-card-open"
        onClick={() => onOpen(order.id)}
        aria-label={`Chi tiết đơn ${orderCode} của ${customerName}`}
        aria-describedby={`${descriptionId}-value ${descriptionId}-status${financials.refunded > 0 ? ` ${descriptionId}-refund` : ''}`}
      >
        <strong className="order-card-customer">{customerName}</strong>

        <span className="order-card-sale">
          <span className="order-card-product">
            <span className={`product-logo ${product?.color || 'mint'}`} aria-hidden="true">
              {product?.symbol || '✦'}
            </span>
            <span className="order-card-product-info">
              <strong>{product?.name || 'Sản phẩm'}</strong>
              {plan?.name && <span>{plan.name}</span>}
            </span>
          </span>
          <span className="order-card-value" id={`${descriptionId}-value`}>
            <span>Giá trị đơn</span>
            <strong>{formatMoney(order.price)}</strong>
          </span>
        </span>

        <span className="order-card-meta">
          <span className="order-card-code" title={`Mã đơn: ${order.id}`}>{orderCode}</span>
          <span className={`order-card-kind${order.kind === 'renewal' ? ' renewal' : ''}`}>
            {order.kind === 'renewal' ? 'Gia hạn' : 'Mua mới'}
          </span>
          <AppIcon name="chevron" size={16} />
        </span>

        {financials.refunded > 0 && (
          <span className="order-card-refund" id={`${descriptionId}-refund`}>
            <span><span>Đã hoàn</span><strong>{formatMoney(financials.refunded)}</strong></span>
            <span><span>Thực thu</span><strong>{formatMoney(financials.net)}</strong></span>
          </span>
        )}

        <span className="order-card-footer" id={`${descriptionId}-status`}>
          <span className="order-card-date">
            <AppIcon name="calendar" size={14} />
            <time dateTime={order.date}>{formatDateLabel(order.date, true)}</time>
          </span>
          {paymentBadge}
        </span>
      </button>
    </article>
  );
}
