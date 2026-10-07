import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateAgent } from '@/lib/agent-auth';
import { getCustomersService, executeAgentCommand } from '@/lib/agent-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = authenticateAgent(request);
  if (!auth.valid) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || searchParams.get('q') || searchParams.get('phone') || searchParams.get('email') || undefined;
    const customers = await getCustomersService(query);

    return NextResponse.json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error) {
    console.error('Agent API customers GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Lỗi tra cứu khách hàng.' },
      { status: 500 }
    );
  }
}

const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Tên khách hàng không được để trống.').max(80),
  phone: z.string().trim().max(25).default(''),
  email: z.union([z.literal(''), z.string().trim().email()]).default(''),
  source: z.string().trim().max(100).default('AI Agent'),
  notes: z.string().trim().max(50000).default('')
}).refine(data => data.phone || data.email, {
  message: 'Cần cung cấp ít nhất số điện thoại hoặc email để liên hệ.'
});

export async function POST(request: Request) {
  const auth = authenticateAgent(request);
  if (!auth.valid) return auth.errorResponse!;

  try {
    const body = await request.json();
    const validated = createCustomerSchema.parse(body);

    const result = await executeAgentCommand({
      type: 'add_customer',
      input: {
        name: validated.name,
        phone: validated.phone,
        email: validated.email,
        source: validated.source,
        notes: validated.notes,
        emailConsent: 'unknown',
        consentSource: ''
      }
    });

    const newCustomer = result.data.customers.find(c => c.id === result.resultId);

    return NextResponse.json({
      success: true,
      message: 'Đã thêm khách hàng thành công.',
      customer: newCustomer || { id: result.resultId, ...validated }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues.map(i => i.message).join('; ') },
        { status: 400 }
      );
    }
    console.error('Agent API customers POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể tạo khách hàng.' },
      { status: 400 }
    );
  }
}
