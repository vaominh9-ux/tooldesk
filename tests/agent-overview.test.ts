import { describe, expect, it, vi } from 'vitest';
import { createInitialData } from '../src/mocks/fixtures';
import { isSubscriptionActive } from '../src/domain/subscriptions';
vi.mock('server-only', () => ({}));
vi.mock('../src/lib/data-repository', () => ({ loadData: vi.fn(), runCommand: vi.fn() }));
vi.mock('../src/lib/clock', () => ({ todayInHoChiMinh: () => '2026-10-08' }));
import { loadData } from '../src/lib/data-repository';
import { getOverviewService } from '../src/lib/agent-service';

describe('Overview uses the same service states as the UI', () => {
  it('excludes scheduled, expired and cancelled services from the active count', async () => {
    const data = createInitialData();
    data.subscriptions = [
      { ...data.subscriptions[0], startsAt: '2026-10-01', expiresAt: '2026-11-01', cancelled: false },
      { ...data.subscriptions[1], startsAt: '2026-10-09', expiresAt: '2026-11-09', cancelled: false },
      { ...data.subscriptions[2], startsAt: '2026-09-08', expiresAt: '2026-10-08', cancelled: false },
      { ...data.subscriptions[3], startsAt: '2026-10-01', expiresAt: '2026-11-01', cancelled: true }
    ];
    vi.mocked(loadData).mockResolvedValue(data);
    const overview = await getOverviewService();
    expect(overview.activeSubscriptionsCount).toBe(1);
    expect(overview.activeSubscriptionsCount).toBe(data.subscriptions.filter(item => isSubscriptionActive(item, overview.today)).length);
    expect(overview.expiredSubscriptionsCount).toBe(1);
  });
});
