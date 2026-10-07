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
    const orderId = params.id;
    const result = await executeAgentCommand({
      type: 'record_payment',
      input: { orderId }
    });

    const updatedOrder = result.data.orders.find(o => o.id === orderId);

    return NextResponse.json({
      success: true,
      message: `Đã xác nhận thanh toán thành công cho đơn ${orderId}.`,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Agent API mark order paid error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể cập nhật thanh toán đơn hàng.' },
      { status: 400 }
    );
  }
}
