import { describe, it, expect } from 'vitest';
import { parseCustomerNotes } from '@/components/shared/customer-notes';

describe('Customer Notes Parser', () => {
  it('handles empty and whitespace-only notes', () => {
    expect(parseCustomerNotes('')).toEqual([]);
    expect(parseCustomerNotes('   ')).toEqual([]);
    expect(parseCustomerNotes(undefined)).toEqual([]);
  });

  it('handles legacy unstructured note', () => {
    const raw = 'Ưu tiên liên hệ sau 14:00. Quan tâm các gói dài hạn.';
    const result = parseCustomerNotes(raw);
    expect(result.length).toBe(1);
    expect(result[0].time).toBeUndefined();
    expect(result[0].content).toBe(raw);
  });

  it('parses structured timestamped notes in chronological order', () => {
    const raw = `[07/10/2026 23:45] Khách cần nâng cấp gói Claude Pro 1 năm.
[05/10/2026 14:20] Khách hỏi cách đăng nhập Cookie trên Chrome di động.
[01/10/2026 09:00] Khách chuyển khoản VCB 390k.`;

    const result = parseCustomerNotes(raw);
    expect(result.length).toBe(3);

    expect(result[0].time).toBe('07/10/2026 23:45');
    expect(result[0].content).toBe('Khách cần nâng cấp gói Claude Pro 1 năm.');

    expect(result[1].time).toBe('05/10/2026 14:20');
    expect(result[1].content).toBe('Khách hỏi cách đăng nhập Cookie trên Chrome di động.');

    expect(result[2].time).toBe('01/10/2026 09:00');
    expect(result[2].content).toBe('Khách chuyển khoản VCB 390k.');
  });

  it('handles mixed legacy note with newer timestamped notes', () => {
    const raw = `[07/10/2026 23:45] Khách hẹn chuyển khoản chiều mai.

Ưu tiên liên hệ sau 14:00.`;

    const result = parseCustomerNotes(raw);
    expect(result.length).toBe(1);
    expect(result[0].time).toBe('07/10/2026 23:45');
    expect(result[0].content).toContain('Khách hẹn chuyển khoản chiều mai.');
  });
});
