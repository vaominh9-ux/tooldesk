import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { GET as healthGet } from '@/app/api/v1/health/route';
import { GET as openapiGet } from '@/app/api/v1/openapi.json/route';
import { DEFAULT_API_KEY, authenticateAgent } from '@/lib/agent-auth';

describe('Agent API Security & Discovery', () => {
  it('authenticates with valid Bearer token', () => {
    const req = new Request('http://localhost:3000/api/v1/products', {
      headers: { Authorization: `Bearer ${DEFAULT_API_KEY}` }
    });
    const result = authenticateAgent(req);
    expect(result.valid).toBe(true);
    expect(result.errorResponse).toBeUndefined();
  });

  it('authenticates with valid x-api-key header', () => {
    const req = new Request('http://localhost:3000/api/v1/products', {
      headers: { 'x-api-key': DEFAULT_API_KEY }
    });
    const result = authenticateAgent(req);
    expect(result.valid).toBe(true);
    expect(result.errorResponse).toBeUndefined();
  });

  it('rejects unauthorized requests missing API Key', () => {
    const req = new Request('http://localhost:3000/api/v1/products');
    const result = authenticateAgent(req);
    expect(result.valid).toBe(false);
    expect(result.errorResponse?.status).toBe(401);
  });

  it('rejects invalid API Key', () => {
    const req = new Request('http://localhost:3000/api/v1/products', {
      headers: { Authorization: 'Bearer wrong_key_123' }
    });
    const result = authenticateAgent(req);
    expect(result.valid).toBe(false);
    expect(result.errorResponse?.status).toBe(401);
  });

  it('returns health status and discovery endpoints', async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.app).toBe('Tooldesk Agent API');
    expect(data.version).toBe('1.0.0');
    expect(data.endpoints.products).toBe('/api/v1/products');
    expect(data.endpoints.openapi).toBe('/api/v1/openapi.json');
  });

  it('serves valid OpenAPI 3.0 specification for ChatGPT/Claude', async () => {
    const req = new Request('http://localhost:3000/api/v1/openapi.json');
    const res = await openapiGet(req);
    expect(res.status).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('Tooldesk AI Agent API');
    expect(spec.paths['/products']).toBeDefined();
    expect(spec.paths['/orders']).toBeDefined();
    expect(spec.paths['/customers']).toBeDefined();
    expect(spec.paths['/subscriptions']).toBeDefined();
    expect(spec.paths['/subscriptions/{id}/renew']).toBeDefined();
  });
});
