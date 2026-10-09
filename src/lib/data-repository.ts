import 'server-only';
import type { PoolClient } from 'pg';
import { getDbPool, transaction } from './db';
import { dataSchema, type AppData } from '@/domain/data-schema';
import { commandSchema, executeCommand, type Command } from '@/domain/commands';
import { dayInHoChiMinh } from '@/domain/dates';
import { createShortId } from '@/domain/orders';
import { todayInHoChiMinh } from './clock';
import { createHash, randomUUID } from 'node:crypto';

type Db = Pick<PoolClient, 'query'>;
type Row = Record<string, unknown>;
const camel = (name: string) => name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
function mapRow(row: Row): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [camel(key), value instanceof Date ? value.toISOString() : value]));
}
function money(value: unknown): number {
  if (value === null || value === undefined || (typeof value !== 'number' && typeof value !== 'string') || value === '') throw new Error('Dữ liệu tiền trong DB bị thiếu.');
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error('Dữ liệu tiền trong DB không hợp lệ.');
  return result;
}
function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error('Dữ liệu ngày giờ trong DB không hợp lệ.');
  return new Date(value).toISOString();
}
async function rows(db: Db, query: string): Promise<Row[]> { return (await db.query<Row>(query)).rows.map(mapRow); }

export async function loadData(db: Db = getDbPool()): Promise<AppData> {
  const res = await db.query<{ full_data: Record<string, unknown> }>(`
    SELECT json_build_object(
      'settings', (SELECT row_to_json(s) FROM (SELECT * FROM settings WHERE id='default') s),
      'products', COALESCE((SELECT json_agg(p) FROM (SELECT * FROM products ORDER BY name) p), '[]'::json),
      'plans', COALESCE((SELECT json_agg(pl) FROM (SELECT * FROM product_plans ORDER BY price) pl), '[]'::json),
      'customers', COALESCE((SELECT json_agg(c) FROM (SELECT *, joined_at::text AS joined_at, consent_updated_at::text AS consent_updated_at FROM customers ORDER BY name) c), '[]'::json),
      'subscriptions', COALESCE((SELECT json_agg(sub) FROM (SELECT s.*, s.starts_at::text AS starts_at, s.expires_at::text AS expires_at, s.reminded_at::text AS reminded_at FROM subscriptions s ORDER BY s.expires_at) sub), '[]'::json),
      'orders', COALESCE((SELECT json_agg(ord) FROM (SELECT o.*, o.date::text AS date, o.starts_at::text AS starts_at, o.expires_at::text AS expires_at, o.paid_at::text AS paid_at FROM orders o ORDER BY o.date DESC, o.id DESC) ord), '[]'::json),
      'refunds', COALESCE((SELECT json_agg(r) FROM (SELECT *, date::text AS date FROM refunds ORDER BY created_at DESC) r), '[]'::json),
      'care_appointments', COALESCE((SELECT json_agg(ca) FROM (SELECT * FROM care_appointments ORDER BY scheduled_at) ca), '[]'::json),
      'campaigns', COALESCE((SELECT json_agg(cmp) FROM (SELECT * FROM campaigns ORDER BY created_at DESC) cmp), '[]'::json),
      'activity', COALESCE((SELECT json_agg(act) FROM (SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100) act), '[]'::json)
    ) AS full_data;
  `);

  const raw = res.rows[0]?.full_data;
  if (!raw || !raw.settings) throw new Error('Thiếu cài đặt hệ thống. Chưa áp dụng schema?');

  const s = mapRow(raw.settings as Row);
  const products = (Array.isArray(raw.products) ? raw.products : []).map(r => mapRow(r as Row));
  const plans = (Array.isArray(raw.plans) ? raw.plans : []).map(r => mapRow(r as Row));
  const customers = (Array.isArray(raw.customers) ? raw.customers : []).map(r => mapRow(r as Row));
  const subscriptions = (Array.isArray(raw.subscriptions) ? raw.subscriptions : []).map(r => mapRow(r as Row));
  const orders = (Array.isArray(raw.orders) ? raw.orders : []).map(r => mapRow(r as Row));
  const refunds = (Array.isArray(raw.refunds) ? raw.refunds : []).map(r => mapRow(r as Row));
  const campaigns = (Array.isArray(raw.campaigns) ? raw.campaigns : []).map(r => mapRow(r as Row));
  const activity = (Array.isArray(raw.activity) ? raw.activity : []).map(r => mapRow(r as Row));

  return dataSchema.parse({
    schemaVersion: 3,
    settings: { ...s, reminderDays: Number(s.reminderDays) },
    products: products.map(product => ({
      ...product,
      description: product.description || '',
      color: product.color || 'mint',
      symbol: product.symbol || '◈',
      plans: plans
        .filter(plan => plan.productId === product.id)
        .map(plan => ({ ...plan, price: money(plan.price), cost: money(plan.cost) }))
    })),
    customers: customers.map(customer => ({
      ...customer,
      email: customer.email || '',
      phone: customer.phone || '',
      source: customer.source || '',
      notes: customer.notes || '',
      consentSource: customer.consentSource || '',
      emailConsent: customer.emailConsent || 'unknown',
      color: customer.color || 'sky'
    })),
    subscriptions: subscriptions.map(sub => ({
      ...sub,
      lastOrderId: sub.lastOrderId || undefined,
      price: money(sub.price),
      cost: money(sub.cost),
      note: sub.note || ''
    })),
    orders: orders.map(order => ({
      ...order,
      subscriptionId: order.subscriptionId || undefined,
      previousSubscription: order.previousSubscription || undefined,
      price: money(order.price),
      cost: money(order.cost),
      note: order.note || ''
    })),
    refunds: refunds.map(refund => ({
      ...refund,
      operationId: refund.operationId || '',
      amount: money(refund.amount),
      costRecovered: money(refund.costRecovered),
      reason: refund.reason || '',
      method: refund.method || 'other',
      reference: refund.reference || '',
      actor: refund.actor || '',
      serviceAction: refund.serviceAction || 'keep'
    })),
    careAppointments: (Array.isArray(raw.care_appointments) ? raw.care_appointments : []).map(row => {
      const item = mapRow(row as Row);
      return { ...item, scheduledAt: timestamp(item.scheduledAt), createdAt: timestamp(item.createdAt), updatedAt: timestamp(item.updatedAt), completedAt: item.completedAt ? timestamp(item.completedAt) : null };
    }),
    campaigns: campaigns.map(campaign => ({
      ...campaign,
      name: campaign.title,
      body: campaign.content || '',
      subject: campaign.subject || '',
      scheduledAt: campaign.scheduledAt ? timestamp(campaign.scheduledAt) : null,
      date: dayInHoChiMinh(new Date(String(campaign.createdAt)))
    })),
    activity: activity.map(entry => ({
      ...entry,
      at: entry.createdAt,
      description: entry.description || ''
    }))
  });
}

// Only changed rows are persisted. Table/column names are code constants, never user input.
async function upsert(db: Db, table: string, row: Row, existing: boolean): Promise<void> {
  const columns = Object.keys(row), values = Object.values(row);
  const updates = columns.filter(column => column !== 'id').map(column => column + '=EXCLUDED.' + column).join(',');
  await db.query('INSERT INTO ' + table + ' (' + columns.join(',') + ') VALUES (' + columns.map((_, index) => '$' + (index + 1)).join(',') + ')' + (existing ? ' ON CONFLICT (id) DO UPDATE SET ' + updates : ''), values);
}
function changed<T extends { id: string }>(before: T[], after: T[]): T[] {
  const old = new Map(before.map(item => [item.id, JSON.stringify(item)]));
  return after.filter(item => old.get(item.id) !== JSON.stringify(item));
}
export async function saveChanges(db: Db, before: AppData, after: AppData): Promise<void> {
  const existingIds = new Map<string, Set<string>>([
    ['settings', new Set(['default'])],
    ...Object.entries({ products: before.products, product_plans: before.products.flatMap(product => product.plans), customers: before.customers, subscriptions: before.subscriptions, orders: before.orders, refunds: before.refunds, campaigns: before.campaigns, care_appointments: before.careAppointments, activity_logs: before.activity }).map(([table, items]): [string, Set<string>] => [table, new Set(items.map(item => item.id))])
  ]);
  // New records must INSERT. A collision with a row outside the loaded snapshot
  // (such as an older activity log) must never overwrite that row.
  const persist = (table: string, row: Row) => upsert(db, table, row, existingIds.get(table)?.has(String(row.id)) === true);
  if (JSON.stringify(before.settings) !== JSON.stringify(after.settings)) await persist('settings', { id: 'default', shop_name: after.settings.shopName, owner_name: after.settings.ownerName, reminder_days: after.settings.reminderDays, currency: after.settings.currency, timezone: after.settings.timezone });
  const beforePlanIds = new Set(before.products.flatMap(p => p.plans.map(pl => pl.id)));
  const afterPlanIds = new Set(after.products.flatMap(p => p.plans.map(pl => pl.id)));
  for (const id of beforePlanIds) {
    if (!afterPlanIds.has(id)) await db.query('DELETE FROM product_plans WHERE id = $1', [id]);
  }
  const beforeProductIds = new Set(before.products.map(p => p.id));
  const afterProductIds = new Set(after.products.map(p => p.id));
  for (const id of beforeProductIds) {
    if (!afterProductIds.has(id)) await db.query('DELETE FROM products WHERE id = $1', [id]);
  }
  const beforeOrderIds = new Set(before.orders.map(o => o.id));
  const afterOrderIds = new Set(after.orders.map(o => o.id));
  for (const id of beforeOrderIds) {
    if (!afterOrderIds.has(id)) await db.query('DELETE FROM orders WHERE id = $1', [id]);
  }
  const beforeSubIds = new Set(before.subscriptions.map(s => s.id));
  const afterSubIds = new Set(after.subscriptions.map(s => s.id));
  for (const id of beforeSubIds) {
    if (!afterSubIds.has(id)) await db.query('DELETE FROM subscriptions WHERE id = $1', [id]);
  }
  for (const p of changed(before.products, after.products)) {
    await persist('products', { id: p.id, name: p.name, category: p.category, color: p.color, symbol: p.symbol, description: p.description });
    for (const plan of p.plans) await persist('product_plans', { id: plan.id, product_id: p.id, name: plan.name, duration: plan.duration, unit: plan.unit, price: plan.price, cost: plan.cost });
  }
  for (const c of changed(before.customers, after.customers)) await persist('customers', { id: c.id, name: c.name, email: c.email, phone: c.phone, source: c.source, notes: c.notes, color: c.color, joined_at: c.joinedAt, email_consent: c.emailConsent, consent_source: c.consentSource, consent_updated_at: c.consentUpdatedAt });
  for (const s of changed(before.subscriptions, after.subscriptions)) await persist('subscriptions', { id: s.id, customer_id: s.customerId, product_id: s.productId, plan_id: s.planId, starts_at: s.startsAt, expires_at: s.expiresAt, price: s.price, cost: s.cost, cancelled: s.cancelled, reminded_at: s.remindedAt || null, last_order_id: s.lastOrderId || null, note: s.note || '' });
  for (const o of changed(before.orders, after.orders)) await persist('orders', { id: o.id, customer_id: o.customerId, product_id: o.productId, plan_id: o.planId, subscription_id: o.subscriptionId || null, date: o.date, starts_at: o.startsAt, expires_at: o.expiresAt, price: o.price, cost: o.cost, payment: o.payment, paid_at: o.paidAt || null, status: o.status, kind: o.kind, note: o.note || '', previous_subscription: o.previousSubscription ? JSON.stringify(o.previousSubscription) : null });
  for (const r of changed(before.refunds, after.refunds)) await persist('refunds', { id: r.id, operation_id: r.operationId, order_id: r.orderId, amount: r.amount, cost_recovered: r.costRecovered, date: r.date, reason: r.reason, method: r.method || 'other', reference: r.reference || '', actor: r.actor || '', service_action: r.serviceAction || 'keep' });
  for (const c of changed(before.campaigns, after.campaigns)) await persist('campaigns', { id: c.id, title: c.name, subject: c.subject, content: c.body, segment: c.segment, status: c.status, scheduled_at: c.scheduledAt || null });
  for (const item of changed(before.careAppointments, after.careAppointments)) await persist('care_appointments', { id: item.id, customer_id: item.customerId, title: item.title, channel: item.channel, scheduled_at: item.scheduledAt, notes: item.notes, status: item.status, created_at: item.createdAt, updated_at: item.updatedAt, completed_at: item.completedAt });
  for (const a of after.activity.filter(item => !before.activity.some(old => old.id === item.id))) await persist('activity_logs', { id: a.id, type: a.type, title: a.title, description: a.description, created_at: a.at });
}

export async function runCommand(command: Command, operationId: string, actor: { id: string; email: string }): Promise<{ data: AppData; resultId?: string }> {
  command = commandSchema.parse(command);
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
    const result = executeCommand(before, command, { today: todayInHoChiMinh(), now: new Date().toISOString(), actor: actor.email, newId: prefix => createShortId(prefix) });
    await saveChanges(client, before, result.data);
    await client.query('INSERT INTO command_idempotency (operation_id,command_type,result_id,actor_user_id,request_hash) VALUES ($1,$2,$3,$4,$5)', [operationId, command.type, result.resultId || null, actor.id, hash]);
    return result;
  });
}
