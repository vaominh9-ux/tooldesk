import 'server-only';
import type { PoolClient } from 'pg';
import { getDbPool, transaction } from './db';
import { dataSchema, type AppData } from '@/domain/data-schema';
import { executeCommand, type Command } from '@/domain/commands';
import { todayInHoChiMinh } from './clock';
import { createHash, randomUUID } from 'node:crypto';

type Db = Pick<PoolClient, 'query'>;
type Row = Record<string, unknown>;
const camel = (name: string) => name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
function mapRow(row: Row): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [camel(key), value instanceof Date ? value.toISOString() : value]));
}
function money(value: unknown): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error('Dữ liệu tiền trong DB không hợp lệ.');
  return result;
}
async function rows(db: Db, query: string): Promise<Row[]> { return (await db.query<Row>(query)).rows.map(mapRow); }

export async function loadData(db: Db = getDbPool()): Promise<AppData> {
  const [settings, products, plans, customers, subscriptions, orders, refunds, campaigns, activity] = await Promise.all([
    rows(db, 'SELECT * FROM settings WHERE id=\'default\''), rows(db, 'SELECT * FROM products ORDER BY name'), rows(db, 'SELECT * FROM product_plans ORDER BY price'),
    rows(db, 'SELECT *, joined_at::text AS joined_at, consent_updated_at::text AS consent_updated_at FROM customers ORDER BY name'),
    rows(db, 'SELECT *, starts_at::text AS starts_at, expires_at::text AS expires_at, reminded_at::text AS reminded_at FROM subscriptions ORDER BY expires_at'),
    rows(db, 'SELECT *, date::text AS date, starts_at::text AS starts_at, expires_at::text AS expires_at, paid_at::text AS paid_at FROM orders ORDER BY date DESC,id DESC'),
    rows(db, 'SELECT *, date::text AS date FROM refunds ORDER BY created_at DESC'), rows(db, 'SELECT * FROM campaigns ORDER BY created_at DESC'), rows(db, 'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100')
  ]);
  if (!settings[0]) throw new Error('Thiếu cài đặt hệ thống. Chưa áp dụng schema?');
  const s = settings[0];
  return dataSchema.parse({
    schemaVersion: 3, settings: { ...s, reminderDays: Number(s.reminderDays) },
    products: products.map(product => ({ ...product, description: product.description || '', color: product.color || 'mint', symbol: product.symbol || '◈', plans: plans.filter(plan => plan.productId === product.id).map(plan => ({ ...plan, price: money(plan.price), cost: money(plan.cost) })) })),
    customers: customers.map(customer => ({ ...customer, email: customer.email || '', phone: customer.phone || '', source: customer.source || '', notes: customer.notes || '', consentSource: customer.consentSource || '', emailConsent: customer.emailConsent || 'unknown', color: customer.color || 'sky' })),
    subscriptions: subscriptions.map(sub => ({ ...sub, lastOrderId: sub.lastOrderId || undefined, price: money(sub.price), cost: money(sub.cost), note: sub.note || '' })),
    orders: orders.map(order => ({ ...order, subscriptionId: order.subscriptionId || undefined, previousSubscription: order.previousSubscription || undefined, price: money(order.price), cost: money(order.cost), note: order.note || '' })),
    refunds: refunds.map(refund => ({ ...refund, operationId: refund.operationId || '', amount: money(refund.amount), costRecovered: money(refund.costRecovered), reason: refund.reason || '', method: refund.method || 'other', reference: refund.reference || '', actor: refund.actor || '', serviceAction: refund.serviceAction || 'keep' })),
    campaigns: campaigns.map(campaign => ({ ...campaign, name: campaign.title, body: campaign.content || '', subject: campaign.subject || '', date: String(campaign.createdAt).slice(0, 10) })),
    activity: activity.map(entry => ({ ...entry, at: entry.createdAt, description: entry.description || '' }))
  });
}

// Only changed rows are persisted. Table/column names are code constants, never user input.
async function upsert(db: Db, table: string, row: Row): Promise<void> {
  const columns = Object.keys(row), values = Object.values(row);
  const updates = columns.filter(column => column !== 'id').map(column => column + '=EXCLUDED.' + column).join(',');
  await db.query('INSERT INTO ' + table + ' (' + columns.join(',') + ') VALUES (' + columns.map((_, index) => '$' + (index + 1)).join(',') + ') ON CONFLICT (id) DO UPDATE SET ' + updates, values);
}
function changed<T extends { id: string }>(before: T[], after: T[]): T[] {
  const old = new Map(before.map(item => [item.id, JSON.stringify(item)]));
  return after.filter(item => old.get(item.id) !== JSON.stringify(item));
}
export async function saveChanges(db: Db, before: AppData, after: AppData): Promise<void> {
  if (JSON.stringify(before.settings) !== JSON.stringify(after.settings)) await upsert(db, 'settings', { id: 'default', shop_name: after.settings.shopName, owner_name: after.settings.ownerName, reminder_days: after.settings.reminderDays, currency: after.settings.currency, timezone: after.settings.timezone });
  for (const p of changed(before.products, after.products)) {
    await upsert(db, 'products', { id: p.id, name: p.name, category: p.category, color: p.color, symbol: p.symbol, description: p.description });
    for (const plan of p.plans) await upsert(db, 'product_plans', { id: plan.id, product_id: p.id, name: plan.name, duration: plan.duration, unit: plan.unit, price: plan.price, cost: plan.cost });
  }
  for (const c of changed(before.customers, after.customers)) await upsert(db, 'customers', { id: c.id, name: c.name, email: c.email, phone: c.phone, source: c.source, notes: c.notes, color: c.color, joined_at: c.joinedAt, email_consent: c.emailConsent, consent_source: c.consentSource, consent_updated_at: c.consentUpdatedAt });
  for (const s of changed(before.subscriptions, after.subscriptions)) await upsert(db, 'subscriptions', { id: s.id, customer_id: s.customerId, product_id: s.productId, plan_id: s.planId, starts_at: s.startsAt, expires_at: s.expiresAt, price: s.price, cost: s.cost, cancelled: s.cancelled, reminded_at: s.remindedAt || null, last_order_id: s.lastOrderId || null, note: s.note || '' });
  for (const o of changed(before.orders, after.orders)) await upsert(db, 'orders', { id: o.id, customer_id: o.customerId, product_id: o.productId, plan_id: o.planId, subscription_id: o.subscriptionId || null, date: o.date, starts_at: o.startsAt, expires_at: o.expiresAt, price: o.price, cost: o.cost, payment: o.payment, paid_at: o.paidAt || null, status: o.status, kind: o.kind, note: o.note || '', previous_subscription: o.previousSubscription ? JSON.stringify(o.previousSubscription) : null });
  for (const r of changed(before.refunds, after.refunds)) await upsert(db, 'refunds', { id: r.id, operation_id: r.operationId, order_id: r.orderId, amount: r.amount, cost_recovered: r.costRecovered, date: r.date, reason: r.reason, method: r.method || 'other', reference: r.reference || '', actor: r.actor || '', service_action: r.serviceAction || 'keep' });
  for (const c of changed(before.campaigns, after.campaigns)) await upsert(db, 'campaigns', { id: c.id, title: c.name, subject: c.subject, content: c.body, segment: c.segment, status: c.status });
  for (const a of after.activity.filter(item => !before.activity.some(old => old.id === item.id))) await upsert(db, 'activity_logs', { id: a.id, type: a.type, title: a.title, description: a.description, created_at: a.at });
}

export async function runCommand(command: Command, operationId: string, actor: { id: string; email: string }): Promise<{ data: AppData; resultId?: string }> {
  return transaction(async client => {
    // Single-system MVP: serialize business commands to prevent lost updates/over-refunds.
    await client.query('SELECT pg_advisory_xact_lock(718326)');
    const hash = createHash('sha256').update(JSON.stringify(command)).digest('hex');
    const previous = await client.query<{ request_hash: string; result_id: string | null; actor_user_id: string }>('SELECT request_hash,result_id,actor_user_id FROM command_idempotency WHERE operation_id=$1', [operationId]);
    const before = await loadData(client);
    if (previous.rows[0]) {
      if (previous.rows[0].request_hash !== hash || previous.rows[0].actor_user_id !== actor.id) throw new Error('Mã yêu cầu đã được sử dụng cho nội dung khác.');
      return { data: before, resultId: previous.rows[0].result_id || undefined };
    }
    const result = executeCommand(before, command, { today: todayInHoChiMinh(), now: new Date().toISOString(), actor: actor.email, newId: prefix => prefix + '-' + randomUUID() });
    await saveChanges(client, before, result.data);
    await client.query('INSERT INTO command_idempotency (operation_id,command_type,result_id,actor_user_id,request_hash) VALUES ($1,$2,$3,$4,$5)', [operationId, command.type, result.resultId || null, actor.id, hash]);
    return result;
  });
}
