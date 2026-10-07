import { NextResponse } from 'next/server';

export const DEFAULT_API_KEY = 'tdk_live_a89f3c7e2b104d5fa61e89c2';

export function getExpectedApiKey(): string {
  return process.env.TOOLDESK_API_KEY || DEFAULT_API_KEY;
}

export interface AgentAuthResult {
  valid: boolean;
  errorResponse?: NextResponse;
}

export function authenticateAgent(request: Request): AgentAuthResult {
  const expectedKey = getExpectedApiKey();
  
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
