import { NextResponse } from 'next/server';
import { emailConfigured } from '@/lib/email';
export const dynamic = 'force-dynamic';
export async function GET() { return NextResponse.json({ ok: true, dataSource: process.env.APP_DATA_SOURCE === 'supabase' ? 'supabase' : 'mock', emailConfigured: emailConfigured(), reminderSchedulerConfigured: (process.env.CRON_SECRET?.length || 0) >= 32 }); }
