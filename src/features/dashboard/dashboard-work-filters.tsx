'use client';

import { useState } from 'react';

type WorkTab = 'renewal' | 'expired' | 'unpaid';
type WorkCounts = Record<WorkTab, number>;

const filters: { value: WorkTab; label: string; mobileLabel: string }[] = [
  { value: 'renewal', label: 'Sắp hết hạn', mobileLabel: 'Sắp hạn' },
  { value: 'expired', label: 'Đã hết hạn', mobileLabel: 'Hết hạn' },
  { value: 'unpaid', label: 'Chưa thanh toán', mobileLabel: 'Chờ thu' },
];

export function useDashboardWorkTab(counts: WorkCounts) {
  // Derive the initial choice from loaded data; never replace a manual choice on refresh.
  const [selectedTab, selectTab] = useState<WorkTab | null>(null);
  const activeTab = selectedTab ?? filters.find(filter => counts[filter.value] > 0)?.value ?? 'renewal';
  return { activeTab, selectTab };
}

export function DashboardWorkFilters({ counts, activeTab, onSelect }: {
  counts: WorkCounts;
  activeTab: WorkTab;
  onSelect: (tab: WorkTab) => void;
}) {
  return (
    <div className="segmented dashboard-work-filters" role="group" aria-label="Loại việc cần xử lý">
      {filters.map(filter => (
        <button
          key={filter.value}
          type="button"
          className={activeTab === filter.value ? 'active' : ''}
          aria-label={`${filter.label}: ${counts[filter.value]}`}
          aria-pressed={activeTab === filter.value}
          onClick={() => onSelect(filter.value)}
        >
          <span className="dashboard-work-label-desktop">{filter.label}</span>
          <span className="dashboard-work-label-mobile">{filter.mobileLabel}</span>{' '}
          <span className="dashboard-work-count">{counts[filter.value]}</span>
        </button>
      ))}
    </div>
  );
}
