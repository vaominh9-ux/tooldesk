'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { formatDateLabel } from '@/domain/dates';
import { formatMoney } from '@/domain/money';

export function MobileRevenueChart({ series }: { series: { day: string; value: number }[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const gradient = useId().replaceAll(':', '') + '-revenue';
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const measured = Math.floor(entries[0].contentRect.width);
      if (measured > 0) setWidth(measured);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  if (!series.length) return null;
  const height = 184, top = 18, bottom = 32, right = 24;
  const maximum = Math.max(1000000, ...series.map(item => item.value)) * 1.15;
  const minimum = Math.min(0, ...series.map(item => item.value)) * 1.15;
  const range = maximum - minimum;
  const ticks = [0, 1 / 3, 2 / 3, 1].map(fraction => {
    const value = Math.round((maximum - range * fraction) / 100000) / 10;
    return { fraction, label: value ? `${value.toLocaleString('vi-VN')} tr` : '0' };
  });
  // Reserve space for the full signed label; labels use actual screen pixels.
  const left = Math.max(48, ...ticks.map(tick => tick.label.length * 7 + 12));
  const y = (value: number) => top + (height - top - bottom) * (maximum - value) / range;
  const points = series.map((item, index) => ({ ...item, x: left + index * (width - left - right) / Math.max(1, series.length - 1), y: y(item.value) }));
  let path = `M${points[0].x},${points[0].y}`;
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1], current = points[index], middle = (previous.x + current.x) / 2;
    path += ` C${middle},${previous.y} ${middle},${current.y} ${current.x},${current.y}`;
  }
  const labelCount = Math.min(series.length, series.length <= 7 ? width < 300 ? 4 : 7 : 5);
  const labelIndices = new Set(Array.from({ length: labelCount }, (_, index) => Math.round(index * (series.length - 1) / Math.max(1, labelCount - 1))));
  return <div ref={container} className="mobile-revenue-chart">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Biểu đồ thực thu trong ${series.length} ngày, đơn vị triệu đồng`}>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" /></linearGradient></defs>
      {ticks.map((tick, index) => {
        const position = top + (height - top - bottom) * tick.fraction;
        return <g key={index}><line x1={left} x2={width - right} y1={position} y2={position} stroke="var(--line)" strokeDasharray="3 4" /><text className="revenue-y-label" x={left - 10} y={position + 4} textAnchor="end">{tick.label}</text></g>;
      })}
      <path d={`${path} L${points.at(-1)!.x},${y(0)} L${points[0].x},${y(0)} Z`} fill={`url(#${gradient})`} />
      <path d={path} stroke="var(--accent)" strokeWidth="2" fill="none" />
      {points.map((point, index) => <g key={point.day}>
        {labelIndices.has(index) && <text className="revenue-date-label" x={point.x} y={height - 8} textAnchor="middle">{formatDateLabel(point.day)}</text>}
        <circle cx={point.x} cy={point.y} r={series.length <= 7 ? 2.5 : 1.5} fill="var(--surface)" stroke="var(--accent)" strokeWidth="1"><title>{`${formatDateLabel(point.day, true)}: ${formatMoney(point.value)}`}</title></circle>
      </g>)}
    </svg>
  </div>;
}
