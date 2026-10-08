import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateAgent } from '@/lib/agent-auth';
import { getOrdersService, getAgentData, executeAgentCommand } from '@/lib/agent-service';
import { todayInHoChiMinh } from '@/lib/clock';
import { customerEmailInputSchema, customersWithEmail } from '@/domain/customer-identity';
import { daySchema } from '@/domain/data-schema';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = authenticateAgent(request);
  if (!auth.valid) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId') || undefined;
    const payment = searchParams.get('payment') as 'paid' | 'unpaid' | null;

    const orders = await getOrdersService({
      customerId,
      payment: payment || undefined
    });

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('Agent API orders GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Lỗi lấy danh sách đơn hàng.' },
      { status: 500 }
    );
  }
}

const createOrderSchema = z.object({
  customerId: z.string().trim().optional(),
  customer: z.object({
    name: z.string().trim().min(1, 'Tên khách hàng không được để trống.'),
    phone: z.string().trim().default(''),
    email: customerEmailInputSchema.default(''),
    source: z.string().trim().default('AI Agent')
  }).optional(),
  productId: z.string().trim().min(1, 'Thiếu mã sản phẩm (productId).'),
  planId: z.string().trim().min(1, 'Thiếu mã gói bán (planId).'),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày bắt đầu phải theo định dạng YYYY-MM-DD.').optional(),
  payment: z.enum(['paid', 'unpaid']).default('paid'),
  date: daySchema.optional(),
  paidAt: daySchema.optional(),
  note: z.string().trim().max(500).default('Tạo qua AI Agent')
}).refine(data => data.customerId || (data.customer && (data.customer.phone || data.customer.email)), {
  message: 'Cần truyền customerId hoặc object customer (có ít nhất số điện thoại hoặc email).'
});

export async function POST(request: Request) {
  const auth = authenticateAgent(request);
  if (!auth.valid) return auth.errorResponse!;

  try {
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    const data = await getAgentData();
    const product = data.products.find(p => p.id === validated.productId);
    if (!product) {
      return NextResponse.json({ success: false, error: `Không tìm thấy sản phẩm mã ${validated.productId}.` }, { status: 404 });
    }

    const plan = product.plans.find(pl => pl.id === validated.planId);
    if (!plan) {
      return NextResponse.json({ success: false, error: `Không tìm thấy gói mã ${validated.planId} trong sản phẩm ${product.name}.` }, { status: 404 });
    }

    const today = todayInHoChiMinh();
    const startsAt = validated.startsAt || today;

    // Resolve or create customer
    let customerId = validated.customerId;
    let newCustomerInput = undefined;

    if (!customerId && validated.customer) {
      // Email identifies the customer; only use phone matching when no email is supplied.
      const matches = validated.customer.email
        ? customersWithEmail(data.customers, validated.customer.email)
        : data.customers.filter(customer => customer.phone && customer.phone.trim() === validated.customer?.phone);
      if (matches.length > 1) throw new Error('Thông tin liên hệ có nhiều hồ sơ. Hãy truyền customerId của khách cần tạo đơn.');
      const existing = matches[0];

      if (existing) {
        customerId = existing.id;
      } else {
        newCustomerInput = {
          name: validated.customer.name,
          phone: validated.customer.phone || '',
          email: validated.customer.email || '',
          source: validated.customer.source || 'AI Agent',
          notes: 'Khách hàng tạo tự động khi Agent đặt đơn.',
          emailConsent: 'unknown' as const,
          consentSource: ''
        };
      }
    }

    const result = await executeAgentCommand({
      type: 'create_order',
      input: {
        customerId,
        newCustomer: newCustomerInput,
        productId: product.id,
        planId: plan.id,
        startsAt,
        date: validated.date,
        paidAt: validated.paidAt,
        price: plan.price,
        cost: plan.cost,
        payment: validated.payment,
        note: validated.note
      }
    });

    const createdOrder = result.data.orders.find(o => o.id === result.resultId);
    const createdSub = result.data.subscriptions.find(s => s.lastOrderId === result.resultId);

    return NextResponse.json({
      success: true,
      message: 'Đã tạo đơn hàng và cấp gói dịch vụ thành công.',
      order: createdOrder,
      subscription: createdSub
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues.map(i => i.message).join('; ') },
        { status: 400 }
      );
    }
    console.error('Agent API orders POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể tạo đơn hàng.' },
      { status: 400 }
    );
  }
}
