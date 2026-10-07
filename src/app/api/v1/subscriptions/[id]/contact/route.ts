import { NextResponse } from 'next/server';
import { authenticateAgent } from '@/lib/agent-auth';
import { executeAgentCommand } from '@/lib/agent-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = authenticateAgent(request);
  if (!auth.valid) return auth.errorResponse!;

  try {
    const subscriptionId = params.id;
    const result = await executeAgentCommand({
      type: 'mark_contacted',
      input: { subscriptionId }
    });

    const updatedSub = result.data.subscriptions.find(s => s.id === subscriptionId);

    return NextResponse.json({
      success: true,
      message: `Đã ghi nhận liên hệ khách hàng cho gói ${subscriptionId}.`,
      subscription: updatedSub
    });
  } catch (error) {
    console.error('Agent API mark contacted error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể ghi nhận liên hệ.' },
      { status: 400 }
    );
  }
}
