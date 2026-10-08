import React from 'react';
import type { Metadata } from 'next';
import '@/styles/tokens.css';
import './globals.css';
import '@/styles/tooldesk-v02.css';
import '@/styles/ui-polish.css';
import { TooldeskProvider } from '@/features/context/tooldesk-context';
import { AppShell } from '@/components/layout/app-shell';
import { runtimeToday } from '@/lib/app-clock';

export const metadata: Metadata = {
  title: 'Tooldesk — Quản lý kinh doanh tool AI',
  description: 'Hệ thống quản lý khách hàng, đơn hàng, gói dịch vụ, gia hạn và hoàn tiền tool AI.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%23253152'/%3E%3Cpath d='M16 6v20M6 16h20M9 9l14 14M23 9L9 23' stroke='%23afbcff' stroke-width='3'/%3E%3C/svg%3E"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <TooldeskProvider initialToday={runtimeToday()} dataSource={process.env.APP_DATA_SOURCE === 'supabase' ? 'supabase' : 'mock'}>
          <AppShell>{children}</AppShell>
        </TooldeskProvider>
      </body>
    </html>
  );
}
