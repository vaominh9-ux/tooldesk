import { parseDay } from './dates';

export function validateOrderDates(date: string, paidAt: string | null, today: string): void {
  parseDay(date);
  if (date > today) throw new Error('Ngày bán không được ở tương lai.');
  if (paidAt !== null) {
    parseDay(paidAt);
    if (paidAt < date) throw new Error('Ngày nhận tiền không được trước ngày bán.');
    if (paidAt > today) throw new Error('Ngày nhận tiền không được ở tương lai.');
  }
}
