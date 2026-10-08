import { NextResponse } from 'next/server';
import { emailReady } from '@/lib/email';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({
    ok: true,
    dataSource: process.env.APP_DATA_SOURCE === 'supabase' ? 'supabase' : 'mock',
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    storageKeyConfigured: /^[a-fA-F0-9]{64}$/.test(process.env.SMTP_CONFIG_ENCRYPTION_KEY || ''),
    emailConfigured: process.env.APP_DATA_SOURCE === 'supabase' && await emailReady(),
    reminderSchedulerConfigured: (process.env.CRON_SECRET?.length || 0) >= 32
  });
}
