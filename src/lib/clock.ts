import 'server-only';
import { runtimeToday } from './app-clock';
export function todayInHoChiMinh(): string {
  return runtimeToday();
}
