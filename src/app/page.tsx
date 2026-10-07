'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '@/components/shared/app-icon';
import { calculateTotals, formatMoney, orderFinancials, cashSummary } from '@/domain/money';
import { formatDateLabel, remainingLabel, DEFAULT_APP_TODAY, addDays } from '@/domain/dates';
import { subStatus, isActive } from '@/domain/subscriptions';

export default function DashboardPage() {
  const { data, openDialog } = useTooldesk();

  const [dashTab, setDashTab] = useState<'renewal' | 'expired' | 'unpaid'>('renewal');
  const [chartDays, setChartDays] = useState<7 | 30>(7);

  const windowDays = data.settings.reminderDays || 7;
  const currentMonth = DEFAULT_APP_TODAY.slice(0, 7);
  const current = calculateTotals(data, currentMonth);

  const expiring = data.subscriptions
    .filter(s => subStatus(s, DEFAULT_APP_TODAY, windowDays) === 'expiring')
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

  const expired = data.subscriptions
    .filter(s => subStatus(s, DEFAULT_APP_TODAY, windowDays) === 'expired')
    .sort((a, b) => b.expiresAt.localeCompare(a.expiresAt));

  const unpaid = data.orders
    .filter(o => o.payment === 'unpaid' && o.status !== 'cancelled')
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeCount = data.subscriptions.filter(s => isActive(s, DEFAULT_APP_TODAY)).length;
  const taskCount = expiring.length + expired.length + unpaid.length;

  const potential = expiring.reduce((sum, s) => sum + s.price, 0);
  const contacted = expiring.filter(s => s.remindedAt).length;

  const findCustomer = (id: string) => data.customers.find(c => c.id === id);
  const findProduct = (id: string) => data.products.find(p => p.id === id);
  const findPlan = (pId: string, plId: string) => {
    const prod = data.products.find(p => p.id === pId);
    return prod?.plans.find(pl => pl.id === plId);
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(/\s+/).slice(-2).map(s => s[0]).join('').toUpperCase();
  };

  // Chart data
  const startDay = addDays(DEFAULT_APP_TODAY, -(chartDays - 1));
  const chartSeries = Array.from({ length: chartDays }, (_, i) => {
    const day = addDays(startDay, i);
    return { day, value: cashSummary(data, day, day).revenue };
  });

  const chartTotal = chartSeries.reduce((sum, s) => sum + s.value, 0);

  // SVG Chart Dimensions
  const chartW = 700;
  const chartH = 195;
  const chartLeft = 52;
  const chartRight = 18;
  const chartTop = 20;
  const chartBottom = 31;
  const maxVal = Math.max(1000000, ...chartSeries.map(s => s.value)) * 1.15;
  const minVal = Math.min(0, ...chartSeries.map(s => s.value)) * 1.15;
  const range = maxVal - minVal;

  const points = chartSeries.map((s, i) => ({
    x: chartLeft + (i * (chartW - chartLeft - chartRight)) / (chartDays - 1),
    y: chartTop + ((chartH - chartTop - chartBottom) * (maxVal - s.value)) / range,
    val: s.value,
    day: s.day
  }));

  let pathD = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const mx = (prev.x + curr.x) / 2;
    pathD += ` C${mx},${prev.y} ${mx},${curr.y} ${curr.x},${curr.y}`;
  }

  const floorY = chartTop + ((chartH - chartTop - chartBottom) * maxVal) / range;
  const lastX = points[points.length - 1].x;
  const firstX = chartLeft;
  const everyStep = chartDays === 7 ? 1 : 5;

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Tổng quan</h1>
          <p>
            Ngày vận hành mô phỏng: {formatDateLabel(DEFAULT_APP_TODAY, true)}
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => openDialog('create-order')}
          >
            <AppIcon name="plus" size={16} />
            <span>Tạo đơn hàng</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="metrics-grid">
        <article className="metric-card accent">
          <div className="metric-top">
            <span>Doanh thu tháng này</span>
            <span className="metric-icon">
              <AppIcon name="wallet" size={19} />
            </span>
          </div>
          <div className="metric-value">
            {formatMoney(current.revenue).replace(' ₫', '')}
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
            {formatMoney(current.gross).replace(' ₫', '')}
            <span className="unit">₫</span>
          </div>
          <div className="metric-foot">Đã trừ vốn và cộng vốn thu hồi</div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span>Gói đang hoạt động</span>
            <span className="metric-icon">
              <AppIcon name="layers" size={19} />
            </span>
          </div>
          <div className="metric-value">{activeCount}</div>
          <div className="metric-foot">
            {expiring.length} gói cần nhắc trong {windowDays} ngày
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span>Việc cần xử lý</span>
            <span className="metric-icon">
              <AppIcon name="clock" size={19} />
            </span>
          </div>
          <div className="metric-value">{taskCount}</div>
          <div className="metric-foot">
            {unpaid.length} đơn chưa thu · {expired.length} gói quá hạn
          </div>
        </article>
      </div>

      {/* Main Work Area: Action Table + Right Rail */}
      <section className="dashboard-work">
        <article className="panel">
          <div className="section-heading">
            <div>
              <h2>Việc cần xử lý hôm nay</h2>
            </div>
            <div className="segmented" role="group" aria-label="Loại việc cần xử lý">
              <button
                type="button"
                className={dashTab === 'renewal' ? 'active' : ''}
                onClick={() => setDashTab('renewal')}
              >
                Sắp hết hạn <span>{expiring.length}</span>
              </button>
              <button
                type="button"
                className={dashTab === 'expired' ? 'active' : ''}
                onClick={() => setDashTab('expired')}
              >
                Đã hết hạn <span>{expired.length}</span>
              </button>
              <button
                type="button"
                className={dashTab === 'unpaid' ? 'active' : ''}
                onClick={() => setDashTab('unpaid')}
              >
                Chưa thanh toán <span>{unpaid.length}</span>
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table className="work-table">
              <tbody>
                {dashTab === 'unpaid' ? (
                  unpaid.slice(0, 5).map(o => {
                    const cust = findCustomer(o.customerId);
                    const prod = findProduct(o.productId);
                    const plan = findPlan(o.productId, o.planId);
                    return (
                      <tr key={o.id}>
                        <td>
                          <div className="person-cell">
                            <span className={`avatar ${cust?.color || 'lavender'}`} aria-hidden="true">
                              {getInitials(cust?.name)}
                            </span>
                            <div>
                              <Link className="text-link strong" href={`/customers?id=${cust?.id}`}>
                                {cust?.name || 'Khách đã xóa'}
                              </Link>
                              <small>{o.id}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="product-cell">
                            <span className={`product-logo ${prod?.color || 'mint'}`} aria-hidden="true">
                              {prod?.symbol || '✦'}
                            </span>
                            <div>
                              <span className="strong">{prod?.name || 'Sản phẩm'}</span>
                              <small>{plan?.name || ''}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="remaining warning">
                            {formatMoney(o.price)}
                            <small>Chưa thanh toán</small>
                          </div>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="button small renew-button"
                              onClick={() => openDialog('order-detail', o.id)}
                            >
                              Thu tiền
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => openDialog('order-detail', o.id)}
                              aria-label={`Xem đơn ${o.id}`}
                            >
                              <AppIcon name="more" size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  (dashTab === 'expired' ? expired : expiring).slice(0, 5).map(s => {
                    const cust = findCustomer(s.customerId);
                    const prod = findProduct(s.productId);
                    const plan = findPlan(s.productId, s.planId);
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="person-cell">
                            <span className={`avatar ${cust?.color || 'lavender'}`} aria-hidden="true">
                              {getInitials(cust?.name)}
                            </span>
                            <div>
                              <Link className="text-link strong" href={`/customers?id=${cust?.id}`}>
                                {cust?.name || 'Khách đã xóa'}
                              </Link>
                              <small>
                                {s.remindedAt ? 'Đã ghi nhận liên hệ' : 'Chưa liên hệ'}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="product-cell">
                            <span className={`product-logo ${prod?.color || 'mint'}`} aria-hidden="true">
                              {prod?.symbol || '✦'}
                            </span>
                            <div>
                              <span className="strong">{prod?.name || 'Sản phẩm'}</span>
                              <small>{plan?.name || ''}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={`remaining ${dashTab === 'expired' ? 'danger' : 'warning'}`}>
                            {remainingLabel(s, DEFAULT_APP_TODAY)}
                            <small>{formatDateLabel(s.expiresAt, true)}</small>
                          </div>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="button small renew-button"
                              onClick={() => openDialog('renew-subscription', s.id)}
                            >
                              <AppIcon name="refresh" size={13} />
                              <span>Gia hạn</span>
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => openDialog('subscription-detail', s.id)}
                              aria-label="Chi tiết gói"
                            >
                              <AppIcon name="more" size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="work-footer">
            <span>
              <AppIcon name="shield" size={14} />
              Hết hạn lúc 00:00 ngày hiển thị, theo giờ Việt Nam.
            </span>
            <Link
              className="text-button"
              href={dashTab === 'unpaid' ? '/orders' : '/subscriptions'}
            >
              {dashTab === 'unpaid' ? 'Xem tất cả đơn chưa thanh toán' : 'Xem tất cả gói dịch vụ'}
              <AppIcon name="arrow" size={14} />
            </Link>
          </div>
        </article>

        {/* Right Rail */}
        <aside className="right-rail">
          <div className="opportunity">
            <span className="eyebrow">CƠ HỘI GIA HẠN THÁNG NÀY</span>
            <div className="opportunity-value">{formatMoney(potential)}</div>
            <p>Giá trị tham khảo từ {expiring.length} gói sắp hết hạn.</p>
            <div className="opportunity-meter">
              <span
                style={{
                  width: expiring.length ? `${(contacted / expiring.length) * 100}%` : '0%'
                }}
              />
            </div>
            <div className="opportunity-caption">
              <span>Đã liên hệ {contacted}/{expiring.length}</span>
              <span>
                {expiring.length ? Math.round((contacted / expiring.length) * 100) : 0}%
              </span>
            </div>
            <Link className="text-button" href="/subscriptions">
              Chăm sóc khách ngay <AppIcon name="arrow" size={14} />
            </Link>
          </div>

          <div className="care-card">
            <div className="care-top">
              <span className="care-symbol">
                <AppIcon name="mail" size={18} />
              </span>
              <h3>Đúng người. Đúng thời điểm.</h3>
            </div>
            <p>Biến danh sách khách hàng thành những kết nối có giá trị.</p>
            <Link className="text-button" href="/campaigns">
              Soạn chương trình ưu đãi <AppIcon name="arrow" size={14} />
            </Link>
          </div>
        </aside>
      </section>

      {/* Bottom Section: Revenue Chart + Recent Activity */}
      <section className="dashboard-bottom">
        <article className="panel">
          <div className="section-heading">
            <div>
              <h2>Nhịp kinh doanh</h2>
            </div>
            <div className="segmented" role="group" aria-label="Khoảng thời gian biểu đồ">
              <button
                type="button"
                className={chartDays === 7 ? 'active' : ''}
                onClick={() => setChartDays(7)}
              >
                7 ngày
              </button>
              <button
                type="button"
                className={chartDays === 30 ? 'active' : ''}
                onClick={() => setChartDays(30)}
              >
                30 ngày
              </button>
            </div>
          </div>

          <div className="chart-summary">
            <strong>{formatMoney(chartTotal)}</strong>
            <small>thực thu sau hoàn</small>
          </div>

          <div className="chart-wrap">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              role="img"
              aria-label={`Biểu đồ doanh thu trong ${chartDays} ngày`}
            >
              <defs>
                <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9ca5ef" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#9ca5ef" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.333, 0.666, 1].map((frac, idx) => {
                const y = chartTop + (chartH - chartTop - chartBottom) * frac;
                const label = Math.round((maxVal - range * frac) / 100000) / 10;
                return (
                  <g key={idx}>
                    <line
                      x1={chartLeft}
                      y1={y}
                      x2={chartW - chartRight}
                      y2={y}
                      stroke="#edf0f6"
                      strokeDasharray="3 4"
                    />
                    <text x={chartLeft - 12} y={y + 4} textAnchor="end">
                      {label ? `${label.toLocaleString('vi-VN')} tr` : '0'}
                    </text>
                  </g>
                );
              })}

              {/* Area fill */}
              <path
                d={`${pathD} L${lastX},${floorY} L${firstX},${floorY} Z`}
                fill="url(#revenue-fill)"
              />

              {/* Line path */}
              <path d={pathD} stroke="#939deb" strokeWidth="2.5" fill="none" />

              {/* Circles and Date labels */}
              {points.map((p, i) => (
                <g key={i}>
                  {(i % everyStep === 0 || i === points.length - 1) && (
                    <text x={p.x} y={chartH - 8} textAnchor="middle">
                      {formatDateLabel(p.day)}
                    </text>
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={chartDays === 7 ? 3 : 2}
                    fill="white"
                    stroke="#939deb"
                    strokeWidth="1.5"
                  >
                    <title>{`${formatDateLabel(p.day, true)}: ${formatMoney(p.val)}`}</title>
                  </circle>
                </g>
              ))}
            </svg>
          </div>

          <div className="chart-legend">
            <span>
              <i className="legend-dot"></i>
              Tiền nhận − tiền hoàn, theo ngày giao dịch
            </span>
            <Link className="text-button" href="/reports">
              Báo cáo chi tiết <AppIcon name="arrow" size={14} />
            </Link>
          </div>
        </article>

        {/* Activity Panel */}
        <article className="panel">
          <div className="section-heading">
            <div>
              <h2>Hoạt động gần đây</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => openDialog('activity')}
              aria-label="Xem lịch sử hoạt động"
            >
              <AppIcon name="more" size={18} />
            </button>
          </div>

          <div className="activity-list">
            {data.activity.slice(0, 4).map((a, i) => {
              const icons: Record<string, string> = {
                payment: 'wallet',
                renewal: 'refresh',
                reminder: 'mail',
                created: 'plus',
                campaign: 'megaphone',
                updated: 'edit',
                refund: 'refund',
                cost_recovery: 'wallet'
              };
              return (
                <div key={a.id} className="activity-row">
                  <span className={`activity-symbol ${i === 0 ? 'highlight' : ''}`}>
                    <AppIcon name={icons[a.type] || 'check'} size={16} />
                  </span>
                  <div>
                    <strong>{a.title}</strong>
                    <p>{a.description}</p>
                    <small>
                      {a.at
                        ? new Intl.DateTimeFormat('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                            timeZone: 'Asia/Ho_Chi_Minh'
                          }).format(new Date(a.at))
                        : 'Vừa xong'}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </>
  );
}
