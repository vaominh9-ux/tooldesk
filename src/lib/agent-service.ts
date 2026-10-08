import 'server-only';
import { randomUUID } from 'node:crypto';
import { loadData, runCommand } from './data-repository';
import { type Command } from '@/domain/commands';
import { type AppData } from '@/domain/data-schema';
import { todayInHoChiMinh } from './clock';
import { isSubscriptionActive, subStatus } from '@/domain/subscriptions';
import { daysLeft } from '@/domain/dates';
import { calculateTotals, orderFinancials } from '@/domain/money';

const AGENT_ACTOR = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'ai-agent@tooldesk.ai'
};

export async function executeAgentCommand(command: Command, operationId?: string): Promise<{ data: AppData; resultId?: string }> {
  const opId = operationId || randomUUID();
  return runCommand(command, opId, AGENT_ACTOR);
}

export async function getAgentData(): Promise<AppData> {
  return loadData();
}

export async function getProductsService(category?: string) {
  const data = await getAgentData();
  let products = data.products;
  if (category) {
    products = products.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
  }
  return products.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    symbol: p.symbol,
    plans: p.plans.map(pl => ({
      id: pl.id,
      name: pl.name,
      duration: pl.duration,
      unit: pl.unit,
      priceVnd: pl.price,
      costVnd: pl.cost
    }))
  }));
}

export async function getCustomersService(query?: string) {
  const data = await getAgentData();
  const today = todayInHoChiMinh();
  let customers = data.customers;

  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    customers = customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.id.toLowerCase() === q
    );
  }

  return customers.map(c => {
    const customerSubs = data.subscriptions.filter(s => s.customerId === c.id);
    const customerOrders = data.orders.filter(o => o.customerId === c.id);

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      source: c.source,
      notes: c.notes,
      joinedAt: c.joinedAt,
      subscriptions: customerSubs.map(s => {
        const prod = data.products.find(p => p.id === s.productId);
        const plan = prod?.plans.find(pl => pl.id === s.planId);
        return {
          id: s.id,
          product: prod?.name || s.productId,
          plan: plan?.name || s.planId,
          startsAt: s.startsAt,
          expiresAt: s.expiresAt,
          status: subStatus(s, today, data.settings.reminderDays),
          remainingDays: daysLeft(s.expiresAt, today),
          priceVnd: s.price
        };
      }),
      totalOrders: customerOrders.length
    };
  });
}

export async function getSubscriptionsService(filter?: {
  status?: 'active' | 'expiring' | 'expired' | 'all';
  customerId?: string;
  productId?: string;
}) {
  const data = await getAgentData();
  const today = todayInHoChiMinh();
  let subs = data.subscriptions;

  if (filter?.customerId) {
    subs = subs.filter(s => s.customerId === filter.customerId);
  }

  if (filter?.productId) {
    subs = subs.filter(s => s.productId === filter.productId);
  }

  const mapped = subs.map(s => {
    const cust = data.customers.find(c => c.id === s.customerId);
    const prod = data.products.find(p => p.id === s.productId);
    const plan = prod?.plans.find(pl => pl.id === s.planId);
    const status = subStatus(s, today, data.settings.reminderDays);
    const left = daysLeft(s.expiresAt, today);

    return {
      id: s.id,
      customer: {
        id: s.customerId,
        name: cust?.name || 'Khách chưa xác định',
        phone: cust?.phone || '',
        email: cust?.email || ''
      },
      product: {
        id: s.productId,
        name: prod?.name || 'Sản phẩm',
        category: prod?.category || ''
      },
      plan: {
        id: s.planId,
        name: plan?.name || '',
        duration: plan?.duration || 1,
        unit: plan?.unit || 'months'
      },
      startsAt: s.startsAt,
      expiresAt: s.expiresAt,
      status,
      remainingDays: left,
      cancelled: s.cancelled,
      priceVnd: s.price,
      remindedAt: s.remindedAt || null,
      note: s.note || ''
    };
  });

  if (filter?.status && filter.status !== 'all') {
    return mapped.filter(s => s.status === filter.status);
  }

  return mapped;
}

export async function getOrdersService(filter?: {
  customerId?: string;
  payment?: 'paid' | 'unpaid';
  status?: string;
}) {
  const data = await getAgentData();
  let orders = data.orders;

  if (filter?.customerId) {
    orders = orders.filter(o => o.customerId === filter.customerId);
  }

  if (filter?.payment) {
    orders = orders.filter(o => o.payment === filter.payment);
  }

  return orders.map(o => {
    const cust = data.customers.find(c => c.id === o.customerId);
    const prod = data.products.find(p => p.id === o.productId);
    const plan = prod?.plans.find(pl => pl.id === o.planId);
    const financials = orderFinancials(o, data.refunds);

    return {
      id: o.id,
      customer: {
        id: o.customerId,
        name: cust?.name || '',
        phone: cust?.phone || '',
        email: cust?.email || ''
      },
      product: {
        id: o.productId,
        name: prod?.name || ''
      },
      plan: {
        id: o.planId,
        name: plan?.name || ''
      },
      date: o.date,
      startsAt: o.startsAt,
      expiresAt: o.expiresAt,
      priceVnd: o.price,
      costVnd: o.cost,
      payment: o.payment,
      paidAt: o.paidAt || null,
      status: o.status,
      kind: o.kind,
      note: o.note || '',
      financials: {
        receivedVnd: financials.collected,
        refundedVnd: financials.refunded,
        netVnd: financials.net
      }
    };
  });
}

export async function getOverviewService() {
  const data = await getAgentData();
  const today = todayInHoChiMinh();
  const currentMonth = today.slice(0, 7);
  const totals = calculateTotals(data, currentMonth);

  const expiringSubs = data.subscriptions.filter(
    s => subStatus(s, today, data.settings.reminderDays) === 'expiring'
  );
  const expiredSubs = data.subscriptions.filter(
    s => subStatus(s, today, data.settings.reminderDays) === 'expired'
  );
  const unpaidOrders = data.orders.filter(
    o => o.payment === 'unpaid' && o.status !== 'cancelled'
  );

  return {
    today,
    timezone: data.settings.timezone || 'Asia/Ho_Chi_Minh',
    shopName: data.settings.shopName,
    activeSubscriptionsCount: data.subscriptions.filter(s => isSubscriptionActive(s, today)).length,
    expiringSubscriptionsCount: expiringSubs.length,
    expiredSubscriptionsCount: expiredSubs.length,
    unpaidOrdersCount: unpaidOrders.length,
    totalCustomersCount: data.customers.length,
    monthMetrics: {
      month: currentMonth,
      revenueVnd: totals.revenue,
      grossProfitVnd: totals.gross,
      unpaidVnd: totals.unpaid,
      ordersCount: totals.orders
    }
  };
}
