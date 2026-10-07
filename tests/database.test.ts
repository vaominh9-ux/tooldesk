import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { PoolClient } from 'pg';
import { createInitialData } from '../src/mocks/fixtures';
import { dataSchema } from '../src/domain/data-schema';
import { commandSchema, executeCommand } from '../src/domain/commands';
vi.mock('server-only', () => ({}));
vi.mock('../src/lib/db', () => ({ getDbPool: () => { throw new Error('External DB forbidden in tests'); }, transaction: () => { throw new Error('Use in-memory test transaction'); } }));
import { loadData, saveChanges } from '../src/lib/data-repository';

let db: PGlite;
let client: Pick<PoolClient, 'query'>;
beforeAll(async () => {
  db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await db.exec(readFileSync('supabase/schema.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261007_backend_foundation.sql', 'utf8'));
  client = { query: async (text: string, values?: unknown[]) => { const result = await db.query(text, values); return { ...result, rowCount: result.affectedRows ?? result.rows.length }; } } as unknown as Pick<PoolClient, 'query'>;
  const fixture = dataSchema.parse(createInitialData());
  const empty = { ...fixture, customers: [], products: [], subscriptions: [], orders: [], refunds: [], campaigns: [], activity: [] };
  await saveChanges(client, empty, fixture);
}, 60000);
afterAll(async () => { await db?.close(); });

describe('PostgreSQL migration and repository (isolated PGlite)', () => {
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
  });
  it('uniquely queues reminders by service cycle and protects anonymous table access', async () => {
    const sub = (await loadData(client)).subscriptions[0];
    await db.query("INSERT INTO email_outbox(id,subscription_id,cycle_key,status) VALUES ($1,$2,$3,'pending')", ['00000000-0000-4000-8000-000000000010', sub.id, 'test-cycle']);
    await expect(db.query("INSERT INTO email_outbox(id,subscription_id,cycle_key,status) VALUES ($1,$2,$3,'pending')", ['00000000-0000-4000-8000-000000000011', sub.id, 'test-cycle'])).rejects.toThrow();
    const permissions = await db.query<{ access: boolean }>("SELECT has_table_privilege('anon','public.customers','SELECT') AS access");
    expect(permissions.rows[0].access).toBe(false);
  });
});
