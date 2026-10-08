import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dataSchema } from '../src/domain/data-schema';
import { createInitialData } from '../src/mocks/fixtures';
import { commandSchema, executeCommand } from '../src/domain/commands';
const mocks = vi.hoisted(() => ({ data: vi.fn(), execute: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../src/lib/agent-service', () => ({ getAgentData: mocks.data, executeAgentCommand: mocks.execute, getOrdersService: vi.fn(), getCustomersService: vi.fn() }));
vi.mock('../src/lib/clock', () => ({ todayInHoChiMinh: () => '2026-10-08' }));
import { POST as createOrder } from '../src/app/api/v1/orders/route';
import { POST as createCustomer } from '../src/app/api/v1/customers/route';

let data = dataSchema.parse(createInitialData());
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('TOOLDESK_API_KEY', 'isolated-identity-test-key');
  data = dataSchema.parse(createInitialData()); mocks.data.mockResolvedValue(data);
  let sequence = 0;
  mocks.execute.mockImplementation(async raw => executeCommand(data, commandSchema.parse(raw), { today: '2026-10-08', now: '2026-10-08T03:00:00Z', actor: 'agent-test', newId: prefix => `${prefix}-agent-identity-${++sequence}` }));
});
afterEach(() => vi.unstubAllEnvs());
function request(body: unknown) { return new Request('http://localhost:3000/api/v1/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': 'isolated-identity-test-key' }, body: JSON.stringify(body) }); }
function order(customer: unknown) { return { customer, productId: data.products[0].id, planId: data.products[0].plans[0].id }; }

describe('Customer identity through agent API', () => {
  it('reuses the email owner even when another profile matches the supplied phone', async () => {
    const customer = data.customers[1];
    customer.email = 'email-owner-b@example.com';
    const response = await createOrder(request(order({ name: 'Tên từ bot', phone: data.customers[0].phone, email: ` ${customer.email.toUpperCase()} ` })));
    expect(response.status).toBe(201);
    expect(mocks.execute.mock.calls[0][0].input.customerId).toBe(customer.id);
    expect((await response.json()).order.customerId).toBe(customer.id);
    expect(data.customers[1].name).toBe(customer.name);
  });

  it('does not assign a new email to a different customer who shares the phone', async () => {
    const response = await createOrder(request(order({ name: 'Khách riêng', phone: data.customers[0].phone, email: ' New.Customer@Example.com ' })));
    expect(response.status).toBe(201);
    expect(mocks.execute.mock.calls[0][0].input.customerId).toBeUndefined();
    expect(mocks.execute.mock.calls[0][0].input.newCustomer.email).toBe('new.customer@example.com');
  });

  it('requires an explicit customerId when an old email has multiple profiles', async () => {
    data.customers[1].email = data.customers[0].email;
    const response = await createOrder(request(order({ name: 'Khách trùng', email: data.customers[0].email })));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/customerId/);
    expect(mocks.execute).not.toHaveBeenCalled();
    const explicit = await createOrder(request({ customerId: data.customers[1].id, productId: data.products[0].id, planId: data.products[0].plans[0].id }));
    expect(explicit.status).toBe(201);
  });

  it('blocks duplicate customer POST requests with normalized email', async () => {
    const response = await createCustomer(request({ name: 'Tên khác', email: ` ${data.customers[0].email.toUpperCase()} ` }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Email đã thuộc/);
    expect(mocks.execute.mock.calls[0][0].input.email).toBe(data.customers[0].email);
  });
});
