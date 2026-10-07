import { NextResponse } from 'next/server';
import { authenticateAgent } from '@/lib/agent-auth';
import { getSubscriptionsService } from '@/lib/agent-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = authenticateAgent(request);
  if (!auth.valid) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'active' | 'expiring' | 'expired' | 'all' | null;
    const customerId = searchParams.get('customerId') || undefined;
    const productId = searchParams.get('productId') || undefined;

    const subscriptions = await getSubscriptionsService({
      status: status || undefined,
      customerId,
      productId
    });

    return NextResponse.json({
      success: true,
      count: subscriptions.length,
      subscriptions
    });
  } catch (error) {
    console.error('Agent API subscriptions GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Lỗi tra cứu gói dịch vụ.' },
      { status: 500 }
    );
  }
}
