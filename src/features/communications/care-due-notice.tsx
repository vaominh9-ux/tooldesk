'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { appointmentState } from '@/domain/care-scheduling';
import { AppIcon } from '@/components/shared/app-icon';

export function CareDueNotice() {
  const { data } = useTooldesk();
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    const update = () => setNow(new Date().toISOString());
    const timer = window.setInterval(update, 30000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  const count = data.careAppointments.filter(item => appointmentState(item, now) === 'due').length;
  if (!count) return null;
  return <aside className="care-due-notice" aria-label="Lịch chăm sóc đến hạn"><AppIcon name="calendar" size={18} /><span><strong>{count} lịch chăm sóc đến hạn</strong><small>Mở lịch để liên hệ và ghi nhận kết quả.</small></span><Link className="button small" href="/campaigns">Xem lịch</Link></aside>;
}
