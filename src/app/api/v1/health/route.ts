import { NextResponse } from 'next/server';
import { todayInHoChiMinh } from '@/lib/clock';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'Tooldesk Agent API',
    version: '1.0.0',
    today: todayInHoChiMinh(),
    timezone: 'Asia/Ho_Chi_Minh',
    timestamp: new Date().toISOString(),
    endpoints: {
      products: '/api/v1/products',
      customers: '/api/v1/customers',
      subscriptions: '/api/v1/subscriptions',
      orders: '/api/v1/orders',
      overview: '/api/v1/overview',
      openapi: '/api/v1/openapi.json'
    }
  });
}
