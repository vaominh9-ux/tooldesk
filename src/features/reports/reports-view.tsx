'use client';

import React, { useEffect, useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '@/components/shared/app-icon';
import { formatMoney } from '@/domain/money';
import { ordersInReport, reportMonths, reportSummary } from '@/domain/reporting-period';
import { formatOrderCode } from '@/domain/orders';
import { formatDateLabel } from '@/domain/dates';

export function ReportsView() {
  const { data, today, openDialog, role } = useTooldesk();
  const [scope, setScope] = useState<'all' | 'month'>('all');
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [visibleCount, setVisibleCount] = useState(20);
  const month = scope === 'month' ? selectedMonth : null;
  const months = reportMonths(data, today);
  useEffect(() => { setVisibleCount(20); }, [scope, selectedMonth]);

  const stats = reportSummary(data, month);
  const reportOrders = ordersInReport(data, month).sort((a, b) => (b.paidAt || b.date).localeCompare(a.paidAt || a.date) || b.id.localeCompare(a.id));

  const products = data.products
    .map(p => ({
      product: p,
      ...reportSummary(data, month, p.id)
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const maxVal = Math.max(1, ...products.map(p => Math.abs(p.revenue)));

  const monthlyRefunds = data.refunds.filter(r => !month || r.date.startsWith(month));
  const periodLabel = month ? `Tháng ${Number(month.slice(5))}/${month.slice(0, 4)}` : 'Tất cả thời gian';
  const periodDescription = month ? 'trong tháng được chọn' : 'trong toàn bộ thời gian';

  const methodLabels: Record<string, string> = {
    bank: 'Chuyển khoản',
    cash: 'Tiền mặt',
    wallet: 'Ví điện tử',
    other: 'Khác'
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Báo cáo</h1>
          <p>Tiền nhận, tiền hoàn và lợi nhuận được đối chiếu rõ ràng.</p>
        </div>
        <div className="page-actions report-period-controls">
          <div className="segmented" role="group" aria-label="Phạm vi báo cáo">
            <button type="button" className={scope === 'all' ? 'active' : ''} aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Tất cả thời gian</button>
            <button type="button" className={scope === 'month' ? 'active' : ''} aria-pressed={scope === 'month'} onClick={() => setScope('month')}>Theo tháng</button>
          </div>
          {scope === 'month' && <input className="select-filter" type="month" aria-label="Tháng báo cáo" value={selectedMonth} max={today.slice(0, 7)} onChange={e => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) setSelectedMonth(e.target.value); }} />}
        </div>
      </div>
      <div className="hint-banner blue report-date-help">
        <AppIcon name="info" size={18} />
        <div><strong>{periodLabel}</strong><p>Doanh thu theo ngày nhận tiền, hoàn tiền theo ngày hoàn. Đơn cũ nhập lại cần ngày bán và nhận tiền thực tế; bạn có thể sửa ở mục “Đơn hàng & ngày ghi nhận” bên dưới.</p></div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <article className="metric-card accent">
          <div className="metric-top">
            <span>Thực thu sau hoàn</span>
            <span className="metric-icon">
              <AppIcon name="wallet" size={19} />
            </span>
          </div>
          <div className="metric-value">
            {formatMoney(stats.revenue).replace(' ₫', '')}
            <span className="unit">₫</span>
          </div>
          <div className="metric-foot">Tiền đã nhận − tiền đã hoàn</div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span>Lợi nhuận gộp</span>
            <span className="metric-icon">
              <AppIcon name="trend" size={19} />
            </span>
          </div>
          <div className="metric-value">
            {formatMoney(stats.gross).replace(' ₫', '')}
            <span className="unit">₫</span>
          </div>
          <div className="metric-foot">Đã tính hoàn tiền và thu hồi giá vốn</div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span>Đã hoàn cho khách</span>
            <span className="metric-icon">
              <AppIcon name="refund" size={19} />
            </span>
          </div>
          <div className="metric-value">
            {formatMoney(stats.refunded).replace(' ₫', '')}
            <span className="unit">₫</span>
          </div>
          <div className="metric-foot">{stats.refundCount} phiếu hoàn {periodDescription}</div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span>Cần thu thêm</span>
            <span className="metric-icon">
              <AppIcon name="clock" size={19} />
            </span>
          </div>
          <div className="metric-value">
            {formatMoney(stats.unpaid).replace(' ₫', '')}
            <span className="unit">₫</span>
          </div>
          <div className="metric-foot">{month ? 'Đơn bán trong tháng chưa thanh toán' : 'Tất cả đơn chưa thanh toán'}</div>
        </article>
      </div>

      {/* Reconciliation Panel */}
      <article className="panel reconciliation-panel">
        <div className="section-heading">
          <div>
            <h2>{month ? 'Đối chiếu trong tháng' : 'Đối chiếu toàn bộ thời gian'}</h2>
            <p>Thu và hoàn khác tháng được ghi nhận vào đúng tháng phát sinh.</p>
          </div>
        </div>

        <div className="reconciliation-grid">
          <div>
            <span>Tiền thực tế đã nhận</span>
            <strong>{formatMoney(stats.received)}</strong>
            <small>Tổng tiền ghi nhận thanh toán {periodDescription}</small>
          </div>
          <div>
            <span>Tiền thực tế đã hoàn</span>
            <strong className="negative">
              {stats.refunded > 0 ? `− ${formatMoney(stats.refunded)}` : '0 ₫'}
            </strong>
            <small>Gồm cả hoàn cho đơn phát sinh ở tháng trước</small>
          </div>
          <div>
            <span>Giá vốn ban đầu</span>
            <strong>{formatMoney(stats.cost)}</strong>
            <small>Giá vốn của các đơn nhận tiền trong kỳ</small>
          </div>
          <div>
            <span>Giá vốn đã thu hồi</span>
            <strong className="positive">
              {stats.costRecovered > 0 ? `+ ${formatMoney(stats.costRecovered)}` : '0 ₫'}
            </strong>
            <small>Khoản nhà cung cấp hoàn lại thực tế</small>
          </div>
        </div>
      </article>

      {/* 2-col report layout */}
      <div className="report-two-col">
        <article className="panel">
          <div className="section-heading">
            <div>
              <h2>Doanh thu theo sản phẩm</h2>
              <p>Đã trừ các khoản hoàn của sản phẩm {periodDescription}.</p>
            </div>
          </div>

          <div className="bar-list">
            {products.map(item => (
              <div key={item.product.id} className="bar-row">
                <div>
                  <strong>{item.product.name}</strong>
                  <span>{formatMoney(item.revenue)}</span>
                </div>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${item.revenue < 0 ? 'negative-bar' : item.product.color || 'mint'}`}
                    style={{
                      width: `${(Math.abs(item.revenue) / maxVal) * 100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <h2>Phiếu hoàn & thu hồi giá vốn</h2>
              <p>{monthlyRefunds.length} giao dịch phát sinh {periodDescription}</p>
            </div>
          </div>

          <div className="refund-report-list">
            {monthlyRefunds.length > 0 ? (
              monthlyRefunds.map(r => (
                <div key={r.id} className="refund-report-row">
                  <span className="activity-symbol highlight">
                    <AppIcon name={r.amount > 0 ? 'refund' : 'wallet'} size={16} />
                  </span>
                  <div className="refund-report-main">
                    <strong>{r.orderId} · {r.reason}</strong>
                    <p>
                      {formatDateLabel(r.date, true)} · {r.actor} · {(r.method && methodLabels[r.method]) || r.method || 'Khác'}
                    </p>
                  </div>
                  <div className="refund-report-amount">
                    <strong className="negative">
                      {r.amount > 0 ? `− ${formatMoney(r.amount)}` : '0 ₫'}
                    </strong>
                    {r.costRecovered > 0 && (
                      <small className="positive">
                        + {formatMoney(r.costRecovered)} vốn
                      </small>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: '26px 14px' }}>
                <p>Không có giao dịch hoàn {periodDescription}.</p>
              </div>
            )}
          </div>
        </article>
      </div>
      <article className="panel report-months-panel">
        <div className="section-heading"><div><h2>Tổng hợp theo tháng</h2><p>Bấm vào tháng để xem chi tiết. Thu tiền và hoàn tiền khác tháng được tính riêng.</p></div></div>
        <div className="report-month-list">
          {months.map(value => {
            const summary = reportSummary(data, value);
            return <button type="button" className="report-month-row" key={value} aria-label={`Xem tháng ${Number(value.slice(5))}/${value.slice(0, 4)}`} onClick={() => { setSelectedMonth(value); setScope('month'); }}>
              <strong>Tháng {Number(value.slice(5))}/{value.slice(0, 4)}</strong>
              <span><small>Thực thu</small><strong className={summary.revenue < 0 ? 'negative' : ''}>{formatMoney(summary.revenue)}</strong></span>
              <span><small>Lãi gộp</small><strong className={summary.gross < 0 ? 'negative' : ''}>{formatMoney(summary.gross)}</strong></span>
              <AppIcon name="chevron" size={16} />
            </button>;
          })}
        </div>
      </article>
      <details className="panel report-orders-panel">
        <summary><strong>Đơn hàng & ngày ghi nhận</strong><span>{reportOrders.length} đơn · {periodLabel}</span><AppIcon name="down" size={18} /></summary>
        <p className="report-orders-help">Ngày dịch vụ, ngày bán và ngày nhận tiền có thể khác nhau. Sửa ngày không thay đổi giá tiền hoặc kỳ dịch vụ. Tháng có thể gồm đơn bán ở tháng trước nhưng nhận tiền hoặc hoàn tiền trong tháng này.</p>
        <div className="report-order-list">
          {reportOrders.slice(0, visibleCount).map(order => <div className="report-order-row" key={order.id}>
            <div><button type="button" className="text-button" onClick={() => openDialog('order-detail', order.id)}>{formatOrderCode(order.id)}</button><strong>{data.customers.find(customer => customer.id === order.customerId)?.name || 'Khách hàng'}</strong><small>{data.products.find(product => product.id === order.productId)?.name} · Bắt đầu gói {formatDateLabel(order.startsAt, true)}</small></div>
            <div><small>Ngày bán</small><strong>{formatDateLabel(order.date, true)}</strong></div>
            <div><small>Ngày nhận tiền</small><strong>{order.payment === 'paid' ? formatDateLabel(order.paidAt || order.date, true) : 'Chưa nhận tiền'}</strong></div>
            {role !== 'viewer' && <button type="button" className="button" onClick={() => openDialog('order-dates', order.id)}><AppIcon name="edit" size={14} />Sửa ngày</button>}
          </div>)}
          {reportOrders.length === 0 && <p className="report-orders-help">Không có đơn hàng trong kỳ được chọn.</p>}
          {visibleCount < reportOrders.length && <button type="button" className="button report-more" onClick={() => setVisibleCount(count => count + 20)}>Xem thêm đơn hàng ({reportOrders.length - visibleCount} còn lại)</button>}
        </div>
      </details>
    </>
  );
}
