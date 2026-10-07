import { NextResponse } from 'next/server';
import { authenticateAgent } from '@/lib/agent-auth';
import { getOverviewService } from '@/lib/agent-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = authenticateAgent(request);
  if (!auth.valid) return auth.errorResponse!;

  try {
    const overview = await getOverviewService();
    return NextResponse.json({
      success: true,
      overview
    });
  } catch (error) {
    console.error('Agent API overview error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Lỗi lấy thông tin tổng quan.' },
      { status: 500 }
    );
  }
}
