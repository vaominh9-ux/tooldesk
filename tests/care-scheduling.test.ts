import { describe, expect, it } from 'vitest';
import { appointmentState, fromHoChiMinhInput, toHoChiMinhInput } from '../src/domain/care-scheduling';
import { commandSchema, executeCommand } from '../src/domain/commands';
import { dataSchema } from '../src/domain/data-schema';
import { createInitialData } from '../src/mocks/fixtures';
import { audienceFor } from '../src/domain/orders';

function setup() {
  const data = dataSchema.parse(createInitialData());
  let sequence = 0;
  const operation = { today: '2026-10-07', now: '2026-10-07T03:00:00.000Z', actor: 'test', newId: (prefix: string) => `${prefix}-${++sequence}` };
  const input = { customerId: data.customers[0].id, title: 'Hỏi thăm sử dụng', channel: 'phone', notes: '', scheduledAt: '2026-10-08T02:00:00.000Z' };
  const run = (original: typeof data, type: string, value: unknown) => executeCommand(original, commandSchema.parse({ type, input: value }), operation);
  return { data, operation, input, run };
}

describe('Care appointments', () => {
  it('uses Vietnam time at the day boundary independently of browser timezone', () => {
    expect(fromHoChiMinhInput('2026-10-08T00:30')).toBe('2026-10-07T17:30:00.000Z');
    expect(toHoChiMinhInput('2026-10-07T17:30:00.000Z')).toBe('2026-10-08T00:30');
  });
  it.each(['2026-02-30T10:00', '2026-10-07T24:00', '2026-10-07T10:60', '', '2026-10-07'])('rejects malformed local appointment %s', value => {
    expect(() => fromHoChiMinhInput(value)).toThrow();
  });
  it('supports old backups without care appointments', () => {
    const legacy: Record<string, unknown> = { ...createInitialData() }; delete legacy.careAppointments;
    expect(dataSchema.parse(legacy).careAppointments).toEqual([]);
  });
  it('creates and reschedules without modifying original data or financial records', () => {
    const { data, input, run } = setup();
    const result = run(data, 'save_care_appointment', input);
    expect(data.careAppointments).toHaveLength(0);
    const edited = run(result.data, 'save_care_appointment', { ...input, id: result.resultId, scheduledAt: '2026-10-09T02:00:00.000Z' });
    expect(edited.data.careAppointments).toHaveLength(1);
    expect(edited.data.careAppointments[0].createdAt).toBe(result.data.careAppointments[0].createdAt);
    expect(edited.data.orders).toEqual(data.orders); expect(edited.data.refunds).toEqual(data.refunds);
  });
  it('rejects past appointments, missing customers and unknown fields', () => {
    const { data, input, run, operation } = setup();
    expect(() => run(data, 'save_care_appointment', { ...input, scheduledAt: operation.now })).toThrow('tương lai');
    expect(() => run(data, 'save_care_appointment', { ...input, customerId: 'missing' })).toThrow('không tồn tại');
    expect(() => run(data, 'save_care_appointment', { ...input, sent: true })).toThrow();
  });
  it.each(['completed', 'cancelled'])('prevents editing/repeating a terminal %s appointment', status => {
    const { data, input, run } = setup();
    const created = run(data, 'save_care_appointment', input);
    const finished = run(created.data, 'finish_care_appointment', { id: created.resultId, status });
    expect(finished.data.careAppointments[0].completedAt !== null).toBe(status === 'completed');
    expect(() => run(finished.data, 'save_care_appointment', { ...input, id: created.resultId })).toThrow();
    expect(() => run(finished.data, 'finish_care_appointment', { id: created.resultId, status })).toThrow();
  });
  it('changes from upcoming to due exactly at the appointment, excluding cancelled tasks', () => {
    const item = { status: 'scheduled' as const, scheduledAt: '2026-10-08T02:00:00.000Z' };
    expect(appointmentState(item, '2026-10-08T01:59:59.999Z')).toBe('scheduled');
    expect(appointmentState(item, item.scheduledAt)).toBe('due');
    expect(appointmentState({ ...item, status: 'cancelled' }, item.scheduledAt)).toBe('cancelled');
  });
});

describe('Campaign preparation schedule', () => {
  const campaign = { name: 'Ưu đãi', subject: 'Hỗ trợ gia hạn', body: 'Chào {ten_khach}', segment: 'all', scheduledAt: '2026-10-08T02:00:00.000Z' };
  it('saves, reschedules and cancels a schedule without marking it sent', () => {
    const { data, run } = setup();
    const created = run(data, 'save_campaign', campaign);
    expect(created.data.campaigns[0].status).toBe('scheduled');
    const rescheduled = run(created.data, 'save_campaign', { ...campaign, id: created.resultId, scheduledAt: '2026-10-09T02:00:00.000Z' });
    const cancelled = run(rescheduled.data, 'cancel_campaign', { id: created.resultId });
    expect(cancelled.data.campaigns[0].status).toBe('cancelled');
    expect(() => run(cancelled.data, 'cancel_campaign', { id: created.resultId })).toThrow();
    const draft = run(cancelled.data, 'save_campaign', { ...campaign, scheduledAt: undefined, id: created.resultId });
    expect(draft.data.campaigns[0]).toMatchObject({ status: 'draft', scheduledAt: null });
  });
  it('rechecks eligibility at save and rejects empty audiences or old times', () => {
    const { data, run, operation } = setup();
    expect(() => run(data, 'save_campaign', { ...campaign, scheduledAt: operation.now })).toThrow('tương lai');
    data.customers.forEach(customer => { customer.emailConsent = 'opted_out'; });
    expect(() => run(data, 'save_campaign', campaign)).toThrow('đủ điều kiện');
    expect(run(data, 'save_campaign', { ...campaign, scheduledAt: undefined }).data.campaigns[0].status).toBe('draft');
  });
  it('never stores a frozen audience or changes opt-out consent and protects sent history', () => {
    const { data, run } = setup();
    const created = run(data, 'save_campaign', campaign);
    created.data.customers.forEach(customer => { customer.emailConsent = 'opted_out'; });
    expect(audienceFor(created.data, 'all', '2026-10-08').eligible).toHaveLength(0);
    created.data.campaigns[0].status = 'sent';
    expect(() => run(created.data, 'save_campaign', { ...campaign, id: created.resultId })).toThrow('đã gửi');
  });
});
