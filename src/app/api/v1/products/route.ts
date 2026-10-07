import { NextResponse } from 'next/server';
import { authenticateAgent } from '@/lib/agent-auth';
import { getProductsService } from '@/lib/agent-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = authenticateAgent(request);
  if (!auth.valid) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const products = await getProductsService(category);

    return NextResponse.json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Agent API products error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Lỗi lấy danh sách sản phẩm.' },
      { status: 500 }
    );
  }
}
