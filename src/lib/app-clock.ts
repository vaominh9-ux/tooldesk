import { dayInHoChiMinh } from '@/domain/dates';
export function runtimeToday(): string { return dayInHoChiMinh(new Date()); }
