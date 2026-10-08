import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { PoolClient } from 'pg';
import { createInitialData } from '../src/mocks/fixtures';
import { dataSchema } from '../src/domain/data-schema';
import { commandSchema, executeCommand } from '../src/domain/commands';
vi.mock('server-only', () => ({}));
vi.mock('../src/lib/db', () => ({ getDbPool: () => { throw new Error('External DB forbidden in tests'); }, transaction: () => { throw new Error('Use in-memory test transaction'); } }));
import { loadData, saveChanges, runCommand } from '../src/lib/data-repository';

let db: PGlite;
let client: Pick<PoolClient, 'query'>;
beforeAll(async () => {
  db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await db.exec(readFileSync('supabase/schema.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261007_backend_foundation.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261008_care_scheduling.sql', 'utf8'));
  await db.exec("ALTER TABLE products ALTER COLUMN created_at SET DEFAULT TIMEZONE('Asia/Ho_Chi_Minh',NOW()); ALTER TABLE orders DROP CONSTRAINT orders_money_valid; ALTER TABLE orders DROP CONSTRAINT orders_state_valid; GRANT SELECT ON customers TO anon;");
  await db.exec(readFileSync('supabase/migrations/20261008_timestamp_defaults.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261008_integrity_hardening.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261008_integrity_hardening.sql', 'utf8'));
  client = { query: async (text: string, values?: unknown[]) => { const result = await db.query(text, values); return { ...result, rowCount: result.affectedRows ?? result.rows.length }; } } as unknown as Pick<PoolClient, 'query'>;
  const fixture = dataSchema.parse(createInitialData());
  // The shared demo includes an intentional legacy duplicate for audience tests.
  // This integration fixture represents a database after the uniqueness audit.
  fixture.customers[30].email = 'db-customer-31@example.com';
  const empty = { ...fixture, customers: [], products: [], subscriptions: [], orders: [], refunds: [], campaigns: [], activity: [] };
  await saveChanges(client, empty, fixture);
}, 60000);
afterAll(async () => { await db?.close(); });

describe('PostgreSQL migration and repository (isolated PGlite)', () => {
  it('persists non-renewal tracking and its reason without changing money or service dates', async () => {
    const before = await loadData(client), sub = before.subscriptions.find(item => !item.cancelled && item.expiresAt <= '2026-10-08')!;
    const result = executeCommand(before, commandSchema.parse({ type: 'stop_subscription_tracking', input: { subscriptionId: sub.id, expectedExpiresAt: sub.expiresAt, reason: 'Khách xác nhận không gia hạn' } }), { today: '2026-10-08', now: '2026-10-08T03:00:00Z', actor: 'staff@example.com', newId: prefix => `${prefix}-stop-tracking` });
    await db.exec('BEGIN');
    try {
      await saveChanges(client, before, result.data);
      const loaded = await loadData(client);
      expect(loaded.subscriptions.find(item => item.id === sub.id)).toEqual({ ...sub, cancelled: true });
      expect(loaded.orders).toEqual(before.orders);
      expect(loaded.refunds).toEqual(before.refunds);
      expect(loaded.activity.find(item => item.id === 'act-stop-tracking')?.description).toContain('Khách xác nhận không gia hạn');
    } finally { await db.exec('ROLLBACK'); }
  });
  it('persists corrected sale and receipt dates without rewriting insertion time or service period', async () => {
    const before = await loadData(client), order = before.orders.find(item => item.payment === 'paid' && !before.refunds.some(refund => refund.orderId === item.id))!;
    const createdAt = (await db.query<{ created_at: Date }>('SELECT created_at FROM orders WHERE id=$1', [order.id])).rows[0].created_at;
    const result = executeCommand(before, commandSchema.parse({ type: 'update_order', input: { orderId: order.id, date: '2026-08-15', paidAt: '2026-08-16' } }), { today: '2026-10-08', now: '2026-10-08T03:00:00Z', actor: 'test', newId: prefix => `${prefix}-correct-dates` });
    await db.exec('BEGIN'); await saveChanges(client, before, result.data);
    const loaded = await loadData(client);
    expect(loaded.orders.find(item => item.id === order.id)).toMatchObject({ date: '2026-08-15', paidAt: '2026-08-16', startsAt: order.startsAt, expiresAt: order.expiresAt, price: order.price, cost: order.cost });
    expect((await db.query<{ created_at: Date }>('SELECT created_at FROM orders WHERE id=$1', [order.id])).rows[0].created_at).toEqual(createdAt);
    await db.exec('ROLLBACK');
  });
  it('never overwrites a colliding row omitted from the loaded snapshot', async () => {
    const before = await loadData(client), original = { ...before.customers[0], id: 'unloaded-customer', email: 'collision-original@example.com' };
    await db.query('INSERT INTO customers(id,name,email) VALUES ($1,$2,$3)', [original.id, original.name, original.email]);
    const after = structuredClone(before);
    after.customers.unshift({ ...original, name: 'Must not overwrite', email: 'collision-new@example.com' });
    await db.exec('BEGIN');
    await expect(saveChanges(client, before, after)).rejects.toThrow(/duplicate key/);
    await db.exec('ROLLBACK');
    expect((await db.query<{ email: string }>('SELECT email FROM customers WHERE id=$1', [original.id])).rows[0].email).toBe(original.email);
    await db.query('DELETE FROM customers WHERE id=$1', [original.id]);
  });
  it('rejects invalid commands at the common persistence boundary before opening a transaction', async () => {
    await expect(runCommand({ type: 'update_order', input: { orderId: 'order', price: 1.5 } }, 'test', { id: 'test', email: 'test@example.com' })).rejects.toThrow(/expected int/);
    await expect(runCommand({ type: 'update_customer', input: { id: 'customer', updates: { name: 'x'.repeat(81) } } }, 'test', { id: 'test', email: 'test@example.com' })).rejects.toThrow(/80/);
  });
  it('stores the actual instant and renders campaign creation day in Vietnam across midnight', async () => {
    await db.exec("BEGIN; SET LOCAL TIME ZONE 'UTC'; INSERT INTO products(id,name) VALUES ('timestamp-test','Test');");
    const timestamps = await db.query<{ delta: number }>("SELECT EXTRACT(EPOCH FROM created_at-NOW())::int AS delta FROM products WHERE id='timestamp-test'");
    expect(timestamps.rows[0].delta).toBe(0);
    await db.exec('ROLLBACK');
    await db.query("INSERT INTO campaigns(id,title,subject,content,segment,status,created_at) VALUES ('midnight','Test','Subject','Body','all','draft','2026-10-07T17:30:00Z')");
    const before = await loadData(client), campaign = before.campaigns.find(item => item.id === 'midnight')!;
    expect(campaign.date).toBe('2026-10-08');
    const result = executeCommand(before, commandSchema.parse({ type: 'save_campaign', input: { id: campaign.id, name: 'Edited', subject: 'Subject', body: 'Body', segment: 'all' } }), { today: '2026-10-09', now: '2026-10-09T02:00:00Z', actor: 'test', newId: prefix => `${prefix}-midnight` });
    expect(result.data.campaigns.find(item => item.id === campaign.id)?.date).toBe('2026-10-08');
    await saveChanges(client, before, result.data);
    expect((await loadData(client)).campaigns.find(item => item.id === campaign.id)?.date).toBe('2026-10-08');
  });
  it('persists product and plans atomically and rolls back on a plan constraint failure', async () => {
    const before = await loadData(client), product = before.products[0];
    let sequence = 0;
    const result = executeCommand(before, commandSchema.parse({ type: 'update_product', input: { productId: product.id, name: product.name + ' mới', expectedPlanIds: product.plans.map(plan => plan.id), plans: [...product.plans.map((plan, index) => index === 0 ? { ...plan, price: 0, cost: 450001 } : plan), { name: 'Gói 15 ngày mới', duration: 15, unit: 'days', price: 123456, cost: 0 }] } }), { today: '2026-10-08', now: '2026-10-08T03:00:00Z', actor: 'test', newId: prefix => `${prefix}-catalog-${++sequence}` });
    await db.exec('BEGIN'); await saveChanges(client, before, result.data); await db.exec('COMMIT');
    const loaded = await loadData(client);
    const saved = loaded.products.find(item => item.id === product.id)!, expected = result.data.products.find(item => item.id === product.id)!;
    expect({ ...saved, plans: [...saved.plans].sort((a, b) => a.id.localeCompare(b.id)) }).toEqual({ ...expected, plans: [...expected.plans].sort((a, b) => a.id.localeCompare(b.id)) });
    expect(loaded.orders).toEqual(before.orders);
    const bad = structuredClone(loaded), changed = bad.products.find(item => item.id === product.id)!;
    changed.name = 'Không được lưu một phần'; changed.plans.at(-1)!.cost = -1;
    await db.exec('BEGIN');
    await expect(saveChanges(client, loaded, bad)).rejects.toThrow();
    await db.exec('ROLLBACK');
    expect((await loadData(client)).products).toEqual(loaded.products);
  });
  it('persists care appointments and campaign schedules with canonical UTC timestamps', async () => {
    const before = await loadData(client);
    let sequence = 0;
    const operation = { today: '2026-10-07', now: '2026-10-07T03:00:00.000Z', actor: 'test', newId: (prefix: string) => `${prefix}-schedule-${++sequence}` };
    const result = executeCommand(before, commandSchema.parse({ type: 'save_care_appointment', input: { customerId: before.customers[0].id, title: 'Theo dõi sử dụng', channel: 'zalo', notes: '', scheduledAt: '2026-10-07T17:30:00.000Z' } }), operation);
    const campaign = executeCommand(result.data, commandSchema.parse({ type: 'save_campaign', input: { name: 'Chuẩn bị ưu đãi', subject: 'Gia hạn', body: 'Xin chào', segment: 'all', scheduledAt: '2026-10-08T02:00:00.000Z' } }), operation);
    await db.exec('BEGIN'); await saveChanges(client, before, campaign.data); await db.exec('COMMIT');
    const loaded = await loadData(client);
    expect(loaded.careAppointments.find(item => item.id === result.resultId)).toMatchObject({ scheduledAt: '2026-10-07T17:30:00.000Z', completedAt: null });
    expect(loaded.campaigns.find(item => item.id === campaign.resultId)?.scheduledAt).toBe('2026-10-08T02:00:00.000Z');
    const completed = executeCommand(loaded, commandSchema.parse({ type: 'finish_care_appointment', input: { id: result.resultId, status: 'completed' } }), operation);
    await saveChanges(client, loaded, completed.data);
    expect((await loadData(client)).careAppointments.find(item => item.id === result.resultId)?.completedAt).toBe(operation.now);
  });
  it('restricts invalid care state and enables RLS on care and scheduler history', async () => {
    const data = await loadData(client);
    const item = data.careAppointments[0];
    await expect(db.query("UPDATE care_appointments SET status='completed',completed_at=NULL WHERE id=$1", [item.id])).rejects.toThrow();
    const rls = await db.query<{ relrowsecurity: boolean }>("SELECT relrowsecurity FROM pg_class WHERE relname IN ('care_appointments','reminder_runs')");
    expect(rls.rows).toHaveLength(2); expect(rls.rows.every(row => row.relrowsecurity)).toBe(true);
  });
  it('loads integer VND and date-only fields with no malformed DATE mapping', async () => {
    const data = await loadData(client);
    expect(data.orders.length).toBeGreaterThan(0);
    expect(data.orders[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isSafeInteger(data.orders[0].price)).toBe(true);
  });
  it('persists an order, linked subscription and ledger in one transaction', async () => {
    const before = await loadData(client), product = before.products[0], plan = product.plans[0];
    let sequence = 0;
    const result = executeCommand(before, commandSchema.parse({ type: 'create_order', input: { customerId: before.customers[0].id, productId: product.id, planId: plan.id, startsAt: '2026-10-31', price: 400000, cost: 500000, payment: 'paid' } }), { today: '2026-10-07', now: '2026-10-07T03:00:00Z', actor: 'test@example.com', newId: prefix => prefix + '-db-' + ++sequence });
    await db.exec('BEGIN'); await saveChanges(client, before, result.data); await db.exec('COMMIT');
    const loaded = await loadData(client), order = loaded.orders.find(item => item.id === result.resultId)!;
    expect(order.price).toBe(400000); expect(order.expiresAt).toBe('2026-11-30');
    expect(loaded.subscriptions.find(item => item.id === order.subscriptionId)?.lastOrderId).toBe(order.id);
  });
  it('enforces safe money and preserves financial history on delete', async () => {
    const data = await loadData(client), order = data.orders[0];
    await expect(db.query('UPDATE orders SET price=-1 WHERE id=$1', [order.id])).rejects.toThrow();
    await expect(db.query('DELETE FROM customers WHERE id=$1', [order.customerId])).rejects.toThrow();
    expect((await loadData(client)).orders.find(item => item.id === order.id)).toBeDefined();
    const customer = data.customers.find(item => item.email)!;
    await expect(db.query('UPDATE customers SET email=$1 WHERE id=$2', [` ${customer.email.toUpperCase()} `, data.customers.find(item => item.id !== customer.id)!.id])).rejects.toThrow();
  });
  it('uniquely queues reminders by service cycle and protects anonymous table access', async () => {
    const sub = (await loadData(client)).subscriptions[0];
    await db.query("INSERT INTO email_outbox(id,subscription_id,cycle_key,status) VALUES ($1,$2,$3,'pending')", ['00000000-0000-4000-8000-000000000010', sub.id, 'test-cycle']);
    await expect(db.query("INSERT INTO email_outbox(id,subscription_id,cycle_key,status) VALUES ($1,$2,$3,'pending')", ['00000000-0000-4000-8000-000000000011', sub.id, 'test-cycle'])).rejects.toThrow();
    const permissions = await db.query<{ access: boolean }>("SELECT has_table_privilege('anon','public.customers','SELECT') AS access");
    expect(permissions.rows[0].access).toBe(false);
  });
});
