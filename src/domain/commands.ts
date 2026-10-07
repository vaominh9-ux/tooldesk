import { z } from 'zod';
import { daySchema, moneySchema, settingsSchema, type AppData } from './data-schema';
import { addDuration } from './dates';
import { renewalDates } from './subscriptions';
import { validateRefundInput } from './refunds';

const id = z.string().min(1).max(100);
const customerFields = z.object({ name: z.string().trim().min(1).max(80), email: z.union([z.literal(''), z.email()]).default(''), phone: z.string().trim().max(25).default(''), source: z.string().trim().max(100).default('Nhập thủ công'), notes: z.string().trim().max(1000).default(''), emailConsent: z.enum(['unknown', 'opted_in', 'opted_out']).default('unknown'), consentSource: z.string().trim().max(200).default('') }).strict();
const customerInput = customerFields.refine(value => value.email || value.phone, 'Cần email hoặc số điện thoại.').refine(value => value.emailConsent !== 'opted_in' || value.consentSource.length > 0, 'Cần nguồn xác nhận đồng ý nhận email.');
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create_order'), input: z.object({ customerId: id.optional(), newCustomer: customerInput.optional(), productId: id, planId: id, startsAt: daySchema, price: moneySchema, cost: moneySchema, payment: z.enum(['paid', 'unpaid']), note: z.string().trim().max(500).default('') }).strict() }).strict(),
  z.object({ type: z.literal('record_payment'), input: z.object({ orderId: id }).strict() }).strict(),
  z.object({ type: z.literal('renew_subscription'), input: z.object({ subscriptionId: id, planId: id, price: moneySchema, cost: moneySchema, payment: z.enum(['paid', 'unpaid']).default('unpaid') }).strict() }).strict(),
  z.object({ type: z.literal('record_refund'), input: z.object({ operationId: z.uuid(), orderId: id, amount: moneySchema, costRecovered: moneySchema.default(0), date: daySchema, reason: z.string().trim().min(3).max(500), method: z.enum(['bank', 'cash', 'wallet', 'other']), reference: z.string().trim().max(120).default(''), serviceAction: z.enum(['keep', 'end']).default('keep') }).strict() }).strict(),
  z.object({ type: z.literal('add_customer'), input: customerInput }).strict(),
  z.object({ type: z.literal('update_customer'), input: z.object({ id, updates: customerFields.partial().strict() }).strict() }).strict(),
  z.object({ type: z.literal('mark_contacted'), input: z.object({ subscriptionId: id }).strict() }).strict(),
  z.object({ type: z.literal('update_settings'), input: settingsSchema.partial().strict() }).strict(),
  z.object({ type: z.literal('update_plan'), input: z.object({ planId: id, name: z.string().trim().min(1).max(80), price: moneySchema, cost: moneySchema }).strict() }).strict(),
  z.object({ type: z.literal('add_product'), input: z.object({ name: z.string().trim().min(1).max(80), symbol: z.string().trim().max(4), category: z.string().trim().max(100), description: z.string().trim().max(1000), plans: z.array(z.object({ name: z.string().trim().min(1).max(80), duration: z.number().int().min(1).max(1200), unit: z.enum(['months', 'days']), price: moneySchema, cost: moneySchema }).strict()).min(1).max(20) }).strict() }).strict(),
  z.object({ type: z.literal('save_campaign'), input: z.object({ id: id.optional(), name: z.string().trim().min(1).max(120), subject: z.string().trim().min(1).max(180), body: z.string().trim().min(1).max(5000), segment: z.enum(['all', 'active', 'expiring', 'expired', 'vip']) }).strict() }).strict()
]);
export type Command = z.infer<typeof commandSchema>;
export interface Operation { today: string; now: string; actor: string; newId: (prefix: string) => string }

export function executeCommand(original: AppData, command: Command, operation: Operation): { data: AppData; resultId?: string } {
  const data = structuredClone(original);
  const { today, newId } = operation;
  let resultId: string | undefined;
  const addCustomer = (input: z.infer<typeof customerInput>) => {
    const email = input.email.trim().toLowerCase();
    if (email && data.customers.some(customer => customer.email.trim().toLowerCase() === email)) throw new Error('Email đã thuộc khách khác.');
    const customer = { ...input, email, id: newId('kh'), color: 'sky', joinedAt: today, consentUpdatedAt: today };
    data.customers.unshift(customer); return customer;
  };
  switch (command.type) {
    case 'create_order': {
      const input = command.input;
      if (Boolean(input.customerId) === Boolean(input.newCustomer)) throw new Error('Chọn một khách có sẵn hoặc tạo khách mới.');
      const customer = input.newCustomer ? addCustomer(input.newCustomer) : data.customers.find(customer => customer.id === input.customerId);
      const product = data.products.find(product => product.id === input.productId);
      const plan = product?.plans.find(plan => plan.id === input.planId);
      if (!customer || !product || !plan) throw new Error('Khách hàng hoặc gói bán không hợp lệ.');
      const orderId = newId('DH'), subscriptionId = newId('sub');
      const expiresAt = addDuration(input.startsAt, plan.duration, plan.unit);
      const common = { customerId: customer.id, productId: product.id, planId: plan.id, startsAt: input.startsAt, expiresAt, price: input.price, cost: input.cost };
      data.subscriptions.unshift({ ...common, id: subscriptionId, cancelled: false, lastOrderId: orderId });
      data.orders.unshift({ ...common, id: orderId, subscriptionId, date: today, payment: input.payment, paidAt: input.payment === 'paid' ? today : null, note: input.note, status: 'completed', kind: 'new' });
      resultId = orderId; break;
    }
    case 'record_payment': {
      const order = data.orders.find(order => order.id === command.input.orderId);
      if (!order || order.status === 'cancelled') throw new Error('Đơn không tồn tại hoặc đã hủy.');
      if (order.payment === 'paid') return { data: original, resultId: order.id };
      order.payment = 'paid'; order.paidAt = today; resultId = order.id; break;
    }
    case 'renew_subscription': {
      const input = command.input;
      const sub = data.subscriptions.find(sub => sub.id === input.subscriptionId);
      const product = data.products.find(product => product.id === sub?.productId);
      const plan = product?.plans.find(plan => plan.id === input.planId);
      if (!sub || !plan) throw new Error('Không tìm thấy gói dịch vụ/gói gia hạn.');
      const previousSubscription = structuredClone(sub);
      const dates = renewalDates(sub, plan, today), orderId = newId('DH');
      if (sub.cancelled || sub.expiresAt <= today) sub.startsAt = dates.startsAt;
      Object.assign(sub, { expiresAt: dates.expiresAt, planId: plan.id, price: input.price, cost: input.cost, cancelled: false, remindedAt: null, lastOrderId: orderId });
      data.orders.unshift({ id: orderId, customerId: sub.customerId, productId: sub.productId, planId: plan.id, subscriptionId: sub.id, date: today, ...dates, price: input.price, cost: input.cost, payment: input.payment, paidAt: input.payment === 'paid' ? today : null, kind: 'renewal', status: 'completed', previousSubscription });
      resultId = orderId; break;
    }
    case 'record_refund': {
      const input = command.input;
      const duplicate = data.refunds.find(refund => refund.operationId === input.operationId);
      if (duplicate) {
        if (duplicate.orderId !== input.orderId || duplicate.amount !== input.amount || duplicate.costRecovered !== input.costRecovered || duplicate.date !== input.date || duplicate.serviceAction !== input.serviceAction || duplicate.reason !== input.reason || duplicate.method !== input.method || duplicate.reference !== input.reference) throw new Error('Mã yêu cầu đã dùng cho giao dịch khác.');
        return { data: original, resultId: duplicate.id };
      }
      const { order } = validateRefundInput(data, input, today);
      const sub = data.subscriptions.find(sub => sub.id === order.subscriptionId);
      if (input.serviceAction === 'end' && sub) {
        if (order.kind === 'renewal' && order.previousSubscription) Object.assign(sub, order.previousSubscription);
        else sub.cancelled = true;
        sub.remindedAt = null;
      }
      resultId = newId('ht');
      data.refunds.unshift({ ...input, id: resultId, actor: operation.actor, createdAt: operation.now, kind: input.amount > 0 ? 'refund' : 'cost_recovery' }); break;
    }
    case 'add_customer': resultId = addCustomer(command.input).id; break;
    case 'update_customer': {
      const customer = data.customers.find(customer => customer.id === command.input.id);
      if (!customer) throw new Error('Không tìm thấy khách hàng.');
      const updates = customerInput.parse({ name: customer.name, email: customer.email, phone: customer.phone, source: customer.source, notes: customer.notes, emailConsent: customer.emailConsent, consentSource: customer.consentSource, ...command.input.updates });
      const email = updates.email.toLowerCase();
      if (email && data.customers.some(other => other.id !== customer.id && other.email.toLowerCase() === email)) throw new Error('Email đã thuộc khách khác.');
      Object.assign(customer, updates, { email, consentUpdatedAt: today }); resultId = customer.id; break;
    }
    case 'mark_contacted': {
      const sub = data.subscriptions.find(sub => sub.id === command.input.subscriptionId);
      if (!sub) throw new Error('Không tìm thấy gói dịch vụ.');
      sub.remindedAt = today; resultId = sub.id; break;
    }
    case 'update_settings': data.settings = settingsSchema.parse({ ...data.settings, ...command.input }); break;
    case 'update_plan': {
      const plan = data.products.flatMap(product => product.plans).find(plan => plan.id === command.input.planId);
      if (!plan) throw new Error('Không tìm thấy gói bán.');
      Object.assign(plan, { name: command.input.name, price: command.input.price, cost: command.input.cost }); resultId = plan.id; break;
    }
    case 'add_product': {
      const productId = newId('p');
      data.products.push({ ...command.input, id: productId, color: 'indigo', plans: command.input.plans.map(plan => ({ ...plan, id: newId('pl') })) }); resultId = productId; break;
    }
    case 'save_campaign': {
      const existing = data.campaigns.find(campaign => campaign.id === command.input.id);
      if (command.input.id && !existing) throw new Error('Không tìm thấy chiến dịch.');
      if (existing && existing.status !== 'draft') throw new Error('Chỉ sửa chiến dịch nháp.');
      const campaign = { ...command.input, id: existing?.id || newId('cp'), date: today, status: 'draft' as const };
      if (existing) Object.assign(existing, campaign); else data.campaigns.unshift(campaign);
      resultId = campaign.id; break;
    }
  }
  data.activity.unshift({ id: newId('act'), type: command.type === 'record_payment' ? 'payment' : command.type === 'renew_subscription' ? 'renewal' : command.type === 'mark_contacted' ? 'reminder' : 'created', title: 'Đã cập nhật dữ liệu', description: operation.actor + ' · ' + command.type + ' · ' + (resultId || ''), at: operation.now });
  return { data, resultId };
}
