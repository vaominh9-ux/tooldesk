import { z } from 'zod';
import { daySchema, moneySchema, settingsSchema, type AppData } from './data-schema';
import { addDuration } from './dates';
import { updatedProductPlans } from './products';
import { careChannels, instantSchema, requireFutureAppointment } from './care-scheduling';
import { audienceFor } from './orders';
import { renewalDates } from './subscriptions';
import { validateRefundInput } from './refunds';
import { orderEditPolicy } from './order-edit-policy';
import { customerEmailInputSchema, customersWithEmail, normalizeCustomerEmail } from './customer-identity';

const id = z.string().min(1).max(100);
const customerFields = z.object({ name: z.string().trim().min(1).max(80), email: customerEmailInputSchema.default(''), phone: z.string().trim().max(25).default(''), source: z.string().trim().max(100).default('Nhập thủ công'), notes: z.string().trim().max(50000).default(''), emailConsent: z.enum(['unknown', 'opted_in', 'opted_out']).default('unknown'), consentSource: z.string().trim().max(200).default('') }).strict();
const customerInput = customerFields.refine(value => value.email || value.phone, 'Cần email hoặc số điện thoại.').refine(value => value.emailConsent !== 'opted_in' || value.consentSource.length > 0, 'Cần nguồn xác nhận đồng ý nhận email.');
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create_order'), input: z.object({ customerId: id.optional(), newCustomer: customerInput.optional(), productId: id, planId: id, startsAt: daySchema, price: moneySchema, cost: moneySchema, payment: z.enum(['paid', 'unpaid']), note: z.string().trim().max(5000).default('') }).strict() }).strict(),
  z.object({ type: z.literal('update_order'), input: z.object({ orderId: id, price: moneySchema.optional(), cost: moneySchema.optional(), startsAt: daySchema.optional(), expiresAt: daySchema.optional(), payment: z.enum(['paid', 'unpaid']).optional(), note: z.string().trim().max(5000).optional(), planId: id.optional() }).strict() }).strict(),
  z.object({ type: z.literal('record_payment'), input: z.object({ orderId: id }).strict() }).strict(),
  z.object({ type: z.literal('renew_subscription'), input: z.object({ subscriptionId: id, planId: id, price: moneySchema, cost: moneySchema, payment: z.enum(['paid', 'unpaid']).default('unpaid') }).strict() }).strict(),
  z.object({ type: z.literal('record_refund'), input: z.object({ operationId: z.uuid(), orderId: id, amount: moneySchema, costRecovered: moneySchema.default(0), date: daySchema, reason: z.string().trim().min(3).max(500), method: z.enum(['bank', 'cash', 'wallet', 'other']), reference: z.string().trim().max(120).default(''), serviceAction: z.enum(['keep', 'end']).default('keep') }).strict() }).strict(),
  z.object({ type: z.literal('add_customer'), input: customerInput }).strict(),
  z.object({ type: z.literal('update_customer'), input: z.object({ id, updates: z.object({ name: z.string().trim().min(1).max(80).optional(), email: customerEmailInputSchema.optional(), phone: z.string().trim().max(25).optional(), source: z.string().trim().max(100).optional(), notes: z.string().trim().max(50000).optional(), emailConsent: z.enum(['unknown','opted_in','opted_out']).optional(), consentSource: z.string().trim().max(200).optional() }).strict() }).strict() }).strict(),
  z.object({ type: z.literal('mark_contacted'), input: z.object({ subscriptionId: id }).strict() }).strict(),
  z.object({ type: z.literal('update_subscription_note'), input: z.object({ subscriptionId: id, note: z.string().trim().max(500) }).strict() }).strict(),
  z.object({ type: z.literal('update_settings'), input: settingsSchema.partial().strict() }).strict(),
  z.object({ type: z.literal('update_plan'), input: z.object({ planId: id, name: z.string().trim().min(1).max(80), price: moneySchema, cost: moneySchema }).strict() }).strict(),
  z.object({ type: z.literal('add_plan'), input: z.object({ productId: id, name: z.string().trim().min(1).max(80), duration: z.number().int().min(1).max(1200), unit: z.enum(['months', 'days']), price: moneySchema, cost: moneySchema }).strict() }).strict(),
  z.object({ type: z.literal('delete_plan'), input: z.object({ planId: id }).strict() }).strict(),
  z.object({ type: z.literal('add_product'), input: z.object({ name: z.string().trim().min(1).max(80), symbol: z.string().trim().max(4), category: z.string().trim().max(100), description: z.string().trim().max(1000), plans: z.array(z.object({ name: z.string().trim().min(1).max(80), duration: z.number().int().min(1).max(1200), unit: z.enum(['months', 'days']), price: moneySchema, cost: moneySchema }).strict()).min(1).max(20) }).strict() }).strict(),
  z.object({ type: z.literal('update_product'), input: z.object({ productId: id, name: z.string().trim().min(1).max(80), category: z.string().trim().max(100).optional(), description: z.string().trim().max(1000).optional(), color: z.string().trim().max(30).optional(), symbol: z.string().trim().max(4).optional(), plans: z.array(z.object({ id: id.optional(), name: z.string().trim().min(1).max(80), duration: z.number().int().min(1).max(1200), unit: z.enum(['months', 'days']), price: moneySchema, cost: moneySchema }).strict()).min(1).max(100).optional(), expectedPlanIds: z.array(id).max(100).optional() }).strict().refine(value => !value.plans || value.expectedPlanIds !== undefined, 'Cần danh sách gói trước khi chỉnh sửa.') }).strict(),
  z.object({ type: z.literal('delete_product'), input: z.object({ productId: id }).strict() }).strict(),
  z.object({ type: z.literal('save_campaign'), input: z.object({ id: id.optional(), name: z.string().trim().min(1).max(120), subject: z.string().trim().min(1).max(180), body: z.string().trim().min(1).max(5000), segment: z.enum(['all', 'active', 'expiring', 'expired', 'vip']), scheduledAt: instantSchema.optional() }).strict() }).strict(),
  z.object({ type: z.literal('cancel_campaign'), input: z.object({ id }).strict() }).strict(),
  z.object({ type: z.literal('save_care_appointment'), input: z.object({ id: id.optional(), customerId: id, title: z.string().trim().min(1).max(120), channel: z.enum(careChannels), scheduledAt: instantSchema, notes: z.string().trim().max(2000).default('') }).strict() }).strict(),
  z.object({ type: z.literal('finish_care_appointment'), input: z.object({ id, status: z.enum(['completed', 'cancelled']) }).strict() }).strict()
]);
export type Command = z.infer<typeof commandSchema>;
export interface Operation { today: string; now: string; actor: string; newId: (prefix: string) => string }

export function executeCommand(original: AppData, command: Command, operation: Operation): { data: AppData; resultId?: string } {
  const data = structuredClone(original);
  const { today, newId } = operation;
  let resultId: string | undefined;
  const addCustomer = (input: z.infer<typeof customerInput>) => {
    const email = normalizeCustomerEmail(input.email);
    const duplicate = customersWithEmail(data.customers, email)[0];
    if (duplicate) throw new Error(`Email đã thuộc khách ${duplicate.name}. Hãy dùng hồ sơ hiện có.`);
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
      data.subscriptions.unshift({ ...common, id: subscriptionId, cancelled: false, lastOrderId: orderId, note: input.note || '' });
      data.orders.unshift({ ...common, id: orderId, subscriptionId, date: today, payment: input.payment, paidAt: input.payment === 'paid' ? today : null, note: input.note, status: 'completed', kind: 'new' });
      resultId = orderId; break;
    }
    case 'update_order': {
      const input = command.input;
      const order = data.orders.find(o => o.id === input.orderId);
      if (!order) throw new Error('Đơn hàng không tồn tại.');
      const policy = orderEditPolicy(data, order);
      const protectedFields = ['price', 'cost', 'startsAt', 'expiresAt', 'payment', 'planId'] as const;
      if (policy.locked && protectedFields.some(field => input[field] !== undefined && input[field] !== order[field])) {
        throw new Error(policy.reason);
      }
      const product = data.products.find(item => item.id === order.productId);
      if (input.planId !== undefined && !product?.plans.some(plan => plan.id === input.planId)) {
        throw new Error('Gói bán không thuộc sản phẩm của đơn hàng.');
      }
      const startsAt = input.startsAt ?? order.startsAt;
      const expiresAt = input.expiresAt ?? order.expiresAt;
      if (expiresAt <= startsAt) throw new Error('Ngày hết hạn phải sau ngày bắt đầu.');
      if (policy.continuousRenewal && startsAt !== order.previousSubscription?.expiresAt) {
        throw new Error('Kỳ gia hạn còn hạn phải bắt đầu từ hạn kết thúc của kỳ trước.');
      }
      if (input.price !== undefined) order.price = input.price;
      if (input.cost !== undefined) order.cost = input.cost;
      if (input.startsAt !== undefined) order.startsAt = input.startsAt;
      if (input.expiresAt !== undefined) order.expiresAt = input.expiresAt;
      if (input.note !== undefined) order.note = input.note;
      if (input.planId !== undefined) order.planId = input.planId;
      if (input.payment !== undefined && input.payment !== order.payment) {
        order.payment = input.payment;
        if (input.payment === 'paid') {
          order.paidAt = today;
        } else {
          order.paidAt = null;
        }
      }
      if (order.subscriptionId) {
        const sub = data.subscriptions.find(s => s.id === order.subscriptionId);
        if (sub && sub.lastOrderId === order.id && !policy.locked) {
          if (input.startsAt !== undefined && !policy.continuousRenewal) sub.startsAt = input.startsAt;
          if (input.expiresAt !== undefined) sub.expiresAt = input.expiresAt;
          if (input.price !== undefined) sub.price = input.price;
          if (input.cost !== undefined) sub.cost = input.cost;
          if (input.note !== undefined) sub.note = input.note;
          if (input.planId !== undefined) sub.planId = input.planId;
        }
      }
      resultId = order.id;
      break;
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
      const oldNotes = customer.notes;
      const updates = customerInput.parse({ name: customer.name, email: customer.email, phone: customer.phone, source: customer.source, notes: customer.notes, emailConsent: customer.emailConsent, consentSource: customer.consentSource, ...command.input.updates });
      const email = normalizeCustomerEmail(updates.email);
      const duplicate = customersWithEmail(data.customers, email, customer.id)[0];
      if (duplicate && email !== normalizeCustomerEmail(customer.email)) throw new Error(`Email đã thuộc khách ${duplicate.name}. Hãy dùng hồ sơ hiện có.`);
      const consentChanged = command.input.updates.emailConsent !== undefined && command.input.updates.emailConsent !== customer.emailConsent;
      const consentUpdatedAt = consentChanged ? today : (customer.consentUpdatedAt || today);
      Object.assign(customer, updates, { email, consentUpdatedAt });
      resultId = customer.id;
      if (updates.notes !== undefined && updates.notes !== oldNotes) {
        data.activity.unshift({
          id: newId('act'),
          type: 'updated',
          title: `Ghi chú: ${customer.name}`,
          description: updates.notes.split('\n')[0]?.slice(0, 160) || 'Đã cập nhật ghi chú',
          at: operation.now
        });
      }
      break;
    }
    case 'mark_contacted': {
      const sub = data.subscriptions.find(sub => sub.id === command.input.subscriptionId);
      if (!sub) throw new Error('Không tìm thấy gói dịch vụ.');
      sub.remindedAt = today; resultId = sub.id; break;
    }
    case 'update_subscription_note': {
      const sub = data.subscriptions.find(sub => sub.id === command.input.subscriptionId);
      if (!sub) throw new Error('Không tìm thấy gói dịch vụ.');
      sub.note = command.input.note;
      resultId = sub.id; break;
    }
    case 'update_settings': data.settings = settingsSchema.parse({ ...data.settings, ...command.input }); break;
    case 'update_plan': {
      const plan = data.products.flatMap(product => product.plans).find(plan => plan.id === command.input.planId);
      if (!plan) throw new Error('Không tìm thấy gói bán.');
      Object.assign(plan, { name: command.input.name, price: command.input.price, cost: command.input.cost }); resultId = plan.id; break;
    }
    case 'add_plan': {
      const prod = data.products.find(product => product.id === command.input.productId);
      if (!prod) throw new Error('Không tìm thấy sản phẩm.');
      const planId = newId('pl');
      prod.plans.push({
        id: planId,
        name: command.input.name,
        duration: command.input.duration,
        unit: command.input.unit,
        price: command.input.price,
        cost: command.input.cost
      });
      resultId = planId;
      break;
    }
    case 'delete_plan': {
      const product = data.products.find(prod => prod.plans.some(pl => pl.id === command.input.planId));
      if (!product) throw new Error('Không tìm thấy gói bán.');
      if (product.plans.length <= 1) {
        throw new Error('Mỗi sản phẩm cần giữ lại ít nhất 1 gói bán. Nếu không kinh doanh sản phẩm này nữa, vui lòng xóa sản phẩm.');
      }
      const planInOrders = data.orders.some(o => o.planId === command.input.planId);
      const planInSubs = data.subscriptions.some(s => s.planId === command.input.planId);
      if (planInOrders || planInSubs) {
        throw new Error('Không thể xóa gói này vì đã có đơn hàng hoặc gói dịch vụ liên kết.');
      }
      product.plans = product.plans.filter(pl => pl.id !== command.input.planId);
      resultId = command.input.planId;
      break;
    }
    case 'add_product': {
      const productId = newId('p');
      data.products.push({ ...command.input, id: productId, color: 'indigo', plans: command.input.plans.map(plan => ({ ...plan, id: newId('pl') })) }); resultId = productId; break;
    }
    case 'update_product': {
      const prod = data.products.find(product => product.id === command.input.productId);
      if (!prod) throw new Error('Không tìm thấy sản phẩm.');
      if (command.input.plans) prod.plans = updatedProductPlans(data, prod, command.input.plans, command.input.expectedPlanIds || [], newId);
      prod.name = command.input.name;
      if (command.input.category !== undefined) prod.category = command.input.category;
      if (command.input.description !== undefined) prod.description = command.input.description;
      if (command.input.color !== undefined) prod.color = command.input.color;
      if (command.input.symbol !== undefined) prod.symbol = command.input.symbol;
      resultId = prod.id;
      break;
    }
    case 'delete_product': {
      const prodIndex = data.products.findIndex(prod => prod.id === command.input.productId);
      if (prodIndex === -1) throw new Error('Không tìm thấy sản phẩm.');
      const prod = data.products[prodIndex];
      const prodInOrders = data.orders.some(o => o.productId === command.input.productId);
      const prodInSubs = data.subscriptions.some(s => s.productId === command.input.productId);
      if (prodInOrders || prodInSubs) {
        throw new Error('Không thể xóa sản phẩm này vì đã có đơn hàng hoặc gói dịch vụ liên kết.');
      }
      data.products.splice(prodIndex, 1);
      resultId = command.input.productId;
      break;
    }
    case 'save_campaign': {
      const existing = data.campaigns.find(campaign => campaign.id === command.input.id);
      if (command.input.id && !existing) throw new Error('Không tìm thấy chiến dịch.');
      if (existing?.status === 'sent') throw new Error('Không thể sửa chiến dịch đã gửi.');
      if (command.input.scheduledAt) {
        requireFutureAppointment(command.input.scheduledAt, operation.now);
        if (!audienceFor(data, command.input.segment, today).eligible.length) throw new Error('Chưa có email đủ điều kiện trong nhóm khách này.');
      }
      const campaign = { ...command.input, scheduledAt: command.input.scheduledAt || null, id: existing?.id || newId('cp'), date: today, status: command.input.scheduledAt ? 'scheduled' as const : 'draft' as const };
      if (existing) Object.assign(existing, campaign); else data.campaigns.unshift(campaign);
      resultId = campaign.id; break;
    }
    case 'cancel_campaign': {
      const campaign = data.campaigns.find(item => item.id === command.input.id);
      if (!campaign || campaign.status !== 'scheduled') throw new Error('Chiến dịch không có lịch đang chờ.');
      campaign.status = 'cancelled'; resultId = campaign.id; break;
    }
    case 'save_care_appointment': {
      const input = command.input;
      if (!data.customers.some(customer => customer.id === input.customerId)) throw new Error('Khách hàng không tồn tại.');
      requireFutureAppointment(input.scheduledAt, operation.now);
      const existing = data.careAppointments.find(item => item.id === input.id);
      if (input.id && !existing) throw new Error('Không tìm thấy lịch hẹn.');
      if (existing && existing.status !== 'scheduled') throw new Error('Lịch đã hoàn tất hoặc hủy. Hãy tạo lịch mới.');
      const appointment = { ...input, id: existing?.id || newId('care'), status: 'scheduled' as const, createdAt: existing?.createdAt || operation.now, updatedAt: operation.now, completedAt: null };
      if (existing) Object.assign(existing, appointment); else data.careAppointments.unshift(appointment);
      resultId = appointment.id; break;
    }
    case 'finish_care_appointment': {
      const item = data.careAppointments.find(item => item.id === command.input.id);
      if (!item || item.status !== 'scheduled') throw new Error('Lịch này không còn chờ xử lý.');
      item.status = command.input.status; item.updatedAt = operation.now;
      item.completedAt = item.status === 'completed' ? operation.now : null;
      resultId = item.id; break;
    }
  }
  data.activity.unshift({ id: newId('act'), ...commandActivity(command, resultId, operation.actor), at: operation.now });
  return { data, resultId };
}

function commandActivity(command: Command, resultId: string | undefined, actor: string): Pick<AppData['activity'][number], 'type' | 'title' | 'description'> {
  const labels: Record<Command['type'], string> = {
    create_order: 'Tạo đơn hàng', update_order: 'Sửa đơn hàng', record_payment: 'Ghi nhận thanh toán',
    renew_subscription: 'Gia hạn gói dịch vụ', record_refund: command.type === 'record_refund' && command.input.amount === 0 ? 'Ghi nhận thu hồi giá vốn' : 'Ghi nhận hoàn tiền',
    add_customer: 'Thêm khách hàng', update_customer: 'Cập nhật khách hàng', mark_contacted: 'Ghi nhận liên hệ',
    update_subscription_note: 'Cập nhật ghi chú gói', update_settings: 'Cập nhật cài đặt',
    update_plan: 'Cập nhật gói bán', add_plan: 'Thêm gói bán', delete_plan: 'Xóa gói bán',
    add_product: 'Thêm sản phẩm', update_product: 'Cập nhật sản phẩm', delete_product: 'Xóa sản phẩm',
    save_campaign: 'Lưu chiến dịch', cancel_campaign: 'Hủy lịch chiến dịch',
    save_care_appointment: 'Lưu lịch chăm sóc', finish_care_appointment: command.type === 'finish_care_appointment' && command.input.status === 'completed' ? 'Hoàn tất lịch chăm sóc' : 'Hủy lịch chăm sóc'
  };
  const type: AppData['activity'][number]['type'] = command.type === 'record_payment' ? 'payment' : command.type === 'renew_subscription' ? 'renewal' : command.type === 'record_refund' ? (command.input.amount === 0 ? 'cost_recovery' : 'refund') : command.type === 'mark_contacted' ? 'reminder' : command.type.startsWith('add_') || command.type === 'create_order' ? 'created' : 'updated';
  return { type, title: labels[command.type], description: actor + (resultId ? ' · ' + resultId : '') };
}
