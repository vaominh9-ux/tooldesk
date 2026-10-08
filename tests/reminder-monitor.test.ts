import { describe, expect, it } from 'vitest';
import { reminderHealth, type ReminderRun } from '../src/domain/reminder-monitor';

const run: ReminderRun = { id: 'run', status: 'completed', started_at: '2026-10-07T03:00:00Z', finished_at: '2026-10-07T03:01:00Z', sent_count: 1, failed_count: 0, cancelled_count: 0, unknown_count: 0, error: null };
describe('Reminder scheduler evidence', () => {
  it('requires real run evidence, not just configured SMTP', () => {
    expect(reminderHealth(true, null, run.started_at).tone).toBe('warning');
    expect(reminderHealth(false, run, run.started_at).tone).toBe('info');
  });
  it('detects stale scheduler and prolonged interrupted jobs', () => {
    expect(reminderHealth(true, run, '2026-10-07T04:00:00Z').label).toContain('lâu chưa chạy');
    expect(reminderHealth(true, { ...run, status: 'running', finished_at: null }, '2026-10-07T03:11:00Z').tone).toBe('warning');
  });
  it.each(['failed', 'attention', 'waiting', 'running', 'completed'] as const)('reports %s truthfully', status => {
    expect(reminderHealth(true, { ...run, status }, '2026-10-07T03:02:00Z').tone).toBe(status === 'failed' ? 'error' : status === 'attention' ? 'warning' : status === 'completed' ? 'success' : 'info');
  });
});
