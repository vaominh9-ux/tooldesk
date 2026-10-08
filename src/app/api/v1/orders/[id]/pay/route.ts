import { NextResponse } from 'next/server';
import { authenticateAgent } from '@/lib/agent-auth';
import { executeAgentCommand } from '@/lib/agent-service';
import { z } from 'zod';
import { daySchema } from '@/domain/data-schema';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = authenticateAgent(request);
  if (!auth.valid) return auth.errorResponse!;

  try {
    const orderId = params.id;
    const body = await request.text();
    const input = z.object({ paidAt: daySchema.optional() }).strict().parse(body ? JSON.parse(body) : {});
    const result = await executeAgentCommand({
      type: 'record_payment',
      input: { orderId, ...(input.paidAt ? { paidAt: input.paidAt } : {}) }
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
