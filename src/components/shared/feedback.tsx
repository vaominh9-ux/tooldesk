import type { ReactNode } from 'react';
import { AppIcon } from './app-icon';

export function Feedback({ tone = 'info', children }: { tone?: 'info' | 'success' | 'warning' | 'error'; children: ReactNode }) {
  return <div className={`feedback feedback-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <AppIcon name={tone === 'success' ? 'circleCheck' : tone === 'error' || tone === 'warning' ? 'warning' : 'info'} size={18} />
    <div>{children}</div>
  </div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><div className="empty-icon"><AppIcon name="calendar" size={26} /></div><h3>{title}</h3><p>{description}</p></div>;
}
