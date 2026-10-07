import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateAgent } from '@/lib/agent-auth';
import { getAgentData, executeAgentCommand } from '@/lib/agent-service';

export const dynamic = 'force-dynamic';

const renewSchema = z.object({
  planId: z.string().trim().optional(),
  payment: z.enum(['paid', 'unpaid']).default('unpaid')
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = authenticateAgent(request);
  if (!auth.valid) return auth.errorResponse!;

  try {
    const subscriptionId = params.id;
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body allowed, will use defaults
    }
    const validated = renewSchema.parse(body);

    const data = await getAgentData();
    const sub = data.subscriptions.find(s => s.id === subscriptionId);
    if (!sub) {
      return NextResponse.json({ success: false, error: `Không tìm thấy gói dịch vụ mã ${subscriptionId}.` }, { status: 404 });
    }

    const product = data.products.find(p => p.id === sub.productId);
    const planId = validated.planId || sub.planId;
    const plan = product?.plans.find(pl => pl.id === planId);

    if (!plan) {
      return NextResponse.json({ success: false, error: `Không tìm thấy gói bán phù hợp để gia hạn.` }, { status: 400 });
    }

    const result = await executeAgentCommand({
      type: 'renew_subscription',
      input: {
        subscriptionId,
        planId: plan.id,
        price: plan.price,
        cost: plan.cost,
        payment: validated.payment
      }
    });

    const renewalOrder = result.data.orders.find(o => o.id === result.resultId);
    const updatedSub = result.data.subscriptions.find(s => s.id === subscriptionId);

    return NextResponse.json({
      success: true,
      message: `Đã gia hạn thành công gói dịch vụ ${subscriptionId}.`,
      order: renewalOrder,
      subscription: updatedSub
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues.map(i => i.message).join('; ') },
        { status: 400 }
      );
    }
    console.error('Agent API renew subscription error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể gia hạn gói dịch vụ.' },
      { status: 400 }
    );
  }
}
