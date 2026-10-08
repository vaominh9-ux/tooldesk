import 'server-only';
import { NextResponse } from 'next/server';


export function getExpectedApiKey(): string {
  return process.env.TOOLDESK_API_KEY?.trim() || '';
}

export interface AgentAuthResult {
  valid: boolean;
  errorResponse?: NextResponse;
}

export function authenticateAgent(request: Request): AgentAuthResult {
  const expectedKey = getExpectedApiKey();
  if (!expectedKey) return { valid: false, errorResponse: NextResponse.json({ success: false, error: 'Chưa cấu hình khóa API trên máy chủ.' }, { status: 503 }) };
  
  // Check Authorization header: Bearer <key>
  const authHeader = request.headers.get('authorization') || '';
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // Also check x-api-key header
  if (!token) {
    token = (request.headers.get('x-api-key') || '').trim();
  }

  if (!token || token !== expectedKey) {
    return {
      valid: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: API Key không hợp lệ hoặc bị thiếu.',
          hint: 'Vui lòng truyền Header "Authorization: Bearer <API_KEY>" hoặc "x-api-key: <API_KEY>"'
        },
        { status: 401 }
      )
    };
  }

  return { valid: true };
}
