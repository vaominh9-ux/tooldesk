'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '@/components/shared/app-icon';
import { calculateTotals, formatMoney, cashSummary } from '@/domain/money';
import { formatDateLabel } from '@/domain/dates';

export default function ReportsPage() {
  const { data, today } = useTooldesk();
  const [month, setMonth] = useState(today.slice(0, 7));
  const months = Array.from(new Set([today.slice(0, 7), ...data.orders.flatMap(order => [order.date.slice(0, 7), (order.paidAt || order.date).slice(0, 7)]), ...data.refunds.map(refund => refund.date.slice(0, 7))])).filter(value => /^\d{4}-\d{2}$/.test(value)).sort().reverse();

  const stats = calculateTotals(data, month);

  const products = data.products
    .map(p => ({
      product: p,
      ...cashSummary(data, `${month}-01`, `${month}-31`, p.id)
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const maxVal = Math.max(1, ...products.map(p => Math.abs(p.revenue)));

  const monthlyRefunds = (data.refunds || []).filter(r => r.date.startsWith(month));

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
        <div className="page-actions">
          <select
            className="select-filter"
            value={month}
            onChange={e => setMonth(e.target.value)}
            aria-label="Tháng báo cáo"
          >
            {months.map(value => <option key={value} value={value}>Tháng {Number(value.slice(5))}, {value.slice(0, 4)}</option>)}
          </select>
        </div>
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
          <div className="metric-foot">{stats.refundCount} phiếu hoàn trong tháng</div>
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
          <div className="metric-foot">Đơn của tháng chưa thanh toán</div>
        </article>
      </div>

      {/* Reconciliation Panel */}
      <article className="panel reconciliation-panel">
        <div className="section-heading">
          <div>
            <h2>Đối chiếu trong tháng</h2>
            <p>Thu và hoàn khác tháng được ghi nhận vào đúng tháng phát sinh.</p>
          </div>
        </div>

        <div className="reconciliation-grid">
          <div>
            <span>Tiền thực tế đã nhận</span>
            <strong>{formatMoney(stats.received)}</strong>
            <small>Tổng các đơn ghi nhận thanh toán trong tháng</small>
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
            <small>Chi phí tương ứng các đơn đã ghi nhận bán</small>
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
              <p>Đã trừ các khoản hoàn của sản phẩm trong tháng.</p>
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
              <p>{monthlyRefunds.length} giao dịch phát sinh trong tháng</p>
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
                <p>Không có giao dịch hoàn trong tháng được chọn.</p>
              </div>
            )}
          </div>
        </article>
      </div>
    </>
  );
}
