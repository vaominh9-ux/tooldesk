'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createInitialData,
  TooldeskData,
  Order,
  Subscription,
  Refund,
  Customer,
  ShopSettings
} from '@/mocks/fixtures';
import { addDuration, DEFAULT_APP_TODAY } from '@/domain/dates';
import { validateRefundInput, RefundInput } from '@/domain/refunds';
import { orderFinancials } from '@/domain/money';
import { renewalDates } from '@/domain/subscriptions';
import type { Command } from '@/domain/commands';
import { todayInHoChiMinh } from '@/lib/clock';

interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface DialogState {
  type:
    | 'create-order'
    | 'renew'
    | 'renew-subscription'
    | 'refund'
    | 'recover-cost'
    | 'pay-confirm'
    | 'customer'
    | 'order-detail'
    | 'customer-detail'
    | 'subscription-detail'
    | 'product'
    | 'plan'
    | 'campaign'
    | 'search'
    | 'activity'
    | 'help'
    | 'reset'
    | null;
  payload?: any;
}

interface TooldeskContextType {
  data: TooldeskData;
  dataStatus: 'mock' | 'loading' | 'connected' | 'error';
  saveCampaign: (campaign: Omit<TooldeskData['campaigns'][number], 'id' | 'date' | 'status'> & { id?: string }) => void;
  updatePlan: (planId: string, updates: { name: string; price: number; cost: number }) => void;
  toasts: ToastItem[];
  dialog: DialogState;
  addToast: (title: string, message?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  openDialog: (type: DialogState['type'], payload?: any) => void;
  closeDialog: () => void;
  markContacted: (subscriptionId: string) => void;
  createOrder: (input: {
    customerId?: string;
    newCustomer?: { name: string; email?: string; phone?: string };
    productId: string;
    planId: string;
    startsAt: string;
    price: number;
    cost: number;
    payment: 'paid' | 'unpaid';
    note?: string;
  }) => Order;
  recordPayment: (orderId: string) => void;
  renewSubscription: (input: {
    subscriptionId: string;
    planId: string;
    startsAt: string;
    price: number;
    cost: number;
    payment?: 'paid' | 'unpaid';
  }) => Order;
  processRefund: (input: RefundInput) => void;
  addCustomer: (customer: {
    name: string;
    phone?: string;
    email?: string;
    source?: string;
    notes?: string;
    emailConsent?: Customer['emailConsent'];
    consentSource?: string;
  }) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  addProduct: (product: {
    name: string;
    symbol: string;
    category: string;
    description: string;
    plans: { name: string; duration: number; unit: 'months' | 'days'; price: number; cost: number }[];
  }) => void;
  importData: (importedData: TooldeskData) => void;
  updateSettings: (settings: Partial<ShopSettings>) => void;
  resetData: () => void;
  syncWithSupabase: () => Promise<void>;
}

const TooldeskContext = createContext<TooldeskContextType | null>(null);

export function TooldeskProvider({ children, dataSource = 'mock' }: { children: React.ReactNode; dataSource?: 'mock' | 'supabase' }) {
  const [data, setData] = useState<TooldeskData>(() => createInitialData());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<DialogState>({ type: null });
  const [dataStatus, setDataStatus] = useState<TooldeskContextType['dataStatus']>(dataSource === 'mock' ? 'mock' : 'loading');

  // Demo is isolated from live data; connection failures remain visible.
  useEffect(() => {
    if (dataSource === 'mock') return;
    let mounted = true;
    async function loadDataFromSupabase() {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && mounted) {
            setData(json.data);
            setDataStatus('connected');
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to load from Supabase API, falling back to local cache:', err);
      }

      if (mounted) setDataStatus('error');
    }

    loadDataFromSupabase();
    return () => {
      mounted = false;
    };
  }, [dataSource]);

  const persist = (newData: TooldeskData) => {
    setData(newData);
  };

  const remoteCommand = async (command: Command, onSuccess: (result: Order | Customer | void) => void = () => {}) => {
    const operationId = crypto.randomUUID();
    const response = await fetch('/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operationId, command }) });
    const payload: unknown = await response.json();
    if (!response.ok || !payload || typeof payload !== 'object' || !('data' in payload)) throw new Error(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Không thể lưu dữ liệu.');
    const dataPayload = (payload as { data: TooldeskData }).data;
    setData(dataPayload); onSuccess();
  };

  const addToast = (title: string, message?: string, type: ToastItem['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const openDialog = (type: DialogState['type'], payload?: any) => {
    setDialog({ type, payload });
  };

  const closeDialog = () => {
    setDialog({ type: null });
  };

  const createOrder = (input: {
    customerId?: string;
    newCustomer?: { name: string; email?: string; phone?: string };
    productId: string;
    planId: string;
    startsAt: string;
    price: number;
    cost: number;
    payment: 'paid' | 'unpaid';
    note?: string;
  }): Order => {
    let customerId = input.customerId;
    let nextCustomers = [...data.customers];

    if (input.newCustomer && input.newCustomer.name) {
      const newCust: Customer = {
        id: `kh-${String(data.customers.length + 1).padStart(3, '0')}`,
        name: input.newCustomer.name.trim(),
        email: (input.newCustomer.email || '').trim(),
        phone: (input.newCustomer.phone || '').trim(),
        source: 'Website',
        emailConsent: 'unknown',
        consentSource: 'Tạo đơn mới',
        consentUpdatedAt: DEFAULT_APP_TODAY,
        notes: '',
        joinedAt: DEFAULT_APP_TODAY,
        color: 'sky'
      };
      nextCustomers.unshift(newCust);
      customerId = newCust.id;
    }

    if (!customerId || !nextCustomers.some(c => c.id === customerId)) throw new Error('Vui lòng chọn hoặc thêm khách hàng hợp lệ.');
    if (![input.price, input.cost].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Giá bán và giá vốn phải là số nguyên VND không âm.');

    const product = data.products.find(p => p.id === input.productId);
    const plan = product?.plans.find(pl => pl.id === input.planId);
    if (!product || !plan) throw new Error('Sản phẩm hoặc gói không hợp lệ.');

    const expiresAt = addDuration(input.startsAt, plan.duration, plan.unit);
    const orderId = nextOrderId(data.orders);
    const subId = `sub-${Date.now().toString(36)}`;

    const newSub: Subscription = {
      id: subId,
      customerId,
      productId: input.productId,
      planId: input.planId,
      startsAt: input.startsAt,
      expiresAt,
      price: input.price,
      cost: input.cost,
      cancelled: false,
      lastOrderId: orderId
    };

    const newOrder: Order = {
      id: orderId,
      customerId,
      productId: input.productId,
      planId: input.planId,
      subscriptionId: subId,
      date: DEFAULT_APP_TODAY,
      startsAt: input.startsAt,
      expiresAt,
      price: input.price,
      cost: input.cost,
      payment: input.payment,
      status: 'completed',
      kind: 'new',
      note: input.note || '',
      paidAt: input.payment === 'paid' ? DEFAULT_APP_TODAY : null
    };

    const newActivity = [
      {
        id: `act-${Date.now()}`,
        type: 'created' as const,
        title: 'Đã tạo đơn hàng mới',
        description: `${nextCustomers.find(c => c.id === customerId)?.name} · ${orderId}`,
        at: new Date().toISOString()
      },
      ...data.activity
    ];

    persist({
      ...data,
      customers: nextCustomers,
      subscriptions: [newSub, ...data.subscriptions],
      orders: [newOrder, ...data.orders],
      activity: newActivity
    });

    addToast('Tạo đơn thành công!', `Mã đơn hàng: ${orderId}`, 'success');
    closeDialog();
    return newOrder;
  };

  const recordPayment = (orderId: string) => {
    const order = data.orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.payment === 'paid' || order.status === 'cancelled') return;
    const nextOrders = data.orders.map(o =>
      o.id === orderId ? { ...o, payment: 'paid' as const, paidAt: DEFAULT_APP_TODAY } : o
    );

    const newActivity = [
      {
        id: `act-${Date.now()}`,
        type: 'payment' as const,
        title: 'Đã ghi nhận thanh toán',
        description: `${data.customers.find(c => c.id === order.customerId)?.name} · ${orderId}`,
        at: new Date().toISOString()
      },
      ...data.activity
    ];

    persist({
      ...data,
      orders: nextOrders,
      activity: newActivity
    });

    addToast('Đã ghi nhận thanh toán', `Đơn ${orderId} đã chuyển sang Đã thanh toán.`, 'success');
  };

  const renewSubscription = (input: {
    subscriptionId: string;
    planId: string;
    startsAt: string;
    price: number;
    cost: number;
    payment?: 'paid' | 'unpaid';
  }): Order => {
    const sub = data.subscriptions.find(s => s.id === input.subscriptionId);
    if (!sub) throw new Error('Không tìm thấy gói dịch vụ.');

    const product = data.products.find(p => p.id === sub.productId);
    const plan = product?.plans.find(pl => pl.id === input.planId);
    if (!product || !plan) throw new Error('Gói không hợp lệ.');

    if (![input.price, input.cost].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Giá bán và giá vốn phải là số nguyên VND không âm.');
    const dates = renewalDates(sub, plan, DEFAULT_APP_TODAY);
    const expiresAt = dates.expiresAt;
    const orderId = nextOrderId(data.orders);
    const payment = input.payment || 'paid';

    // Snapshot current subscription state for rollback support
    const previousSnapshot = { ...sub };

    const updatedSub: Subscription = {
      ...sub,
      planId: input.planId,
      startsAt: sub.cancelled || sub.expiresAt <= DEFAULT_APP_TODAY ? dates.startsAt : sub.startsAt,
      expiresAt,
      price: input.price,
      cost: input.cost,
      cancelled: false,
      remindedAt: null,
      lastOrderId: orderId
    };

    const newOrder: Order = {
      id: orderId,
      customerId: sub.customerId,
      productId: sub.productId,
      planId: input.planId,
      subscriptionId: sub.id,
      date: DEFAULT_APP_TODAY,
      startsAt: dates.startsAt,
      expiresAt,
      price: input.price,
      cost: input.cost,
      payment,
      status: 'completed',
      kind: 'renewal',
      paidAt: payment === 'paid' ? DEFAULT_APP_TODAY : undefined,
      previousSubscription: previousSnapshot
    };

    const nextSubs = data.subscriptions.map(s => (s.id === sub.id ? updatedSub : s));
    const nextOrders = [newOrder, ...data.orders];

    const newActivity = [
      {
        id: `act-${Date.now()}`,
        type: 'renewal' as const,
        title: 'Một gói đã được gia hạn',
        description: `${data.customers.find(c => c.id === sub.customerId)?.name} · ${product.name}`,
        at: new Date().toISOString()
      },
      ...data.activity
    ];

    persist({
      ...data,
      subscriptions: nextSubs,
      orders: nextOrders,
      activity: newActivity
    });

    addToast('Gia hạn thành công!', `Đã tạo đơn gia hạn ${orderId} đến ${expiresAt}`, 'success');
    closeDialog();
    return newOrder;
  };

  const processRefund = (input: RefundInput) => {
    const duplicate = data.refunds.find(record => input.operationId && record.operationId === input.operationId);
    if (duplicate && duplicate.orderId === input.orderId && duplicate.amount === input.amount && duplicate.costRecovered === (input.costRecovered || 0) && duplicate.date === input.date && (duplicate.serviceAction || 'keep') === (input.serviceAction || 'keep')) {
      addToast('Giao dịch đã được ghi nhận', duplicate.id, 'info');
      closeDialog();
      return;
    }
    const { order } = validateRefundInput(data, input, DEFAULT_APP_TODAY);
    const refundRecord: Refund = {
      id: `ht-${Date.now().toString(36)}`,
      operationId: input.operationId || `op-${Date.now().toString(36)}`,
      orderId: input.orderId,
      amount: Number(input.amount),
      costRecovered: Number(input.costRecovered || 0),
      date: input.date,
      reason: input.reason,
      method: input.method,
      reference: input.reference || '',
      serviceAction: input.serviceAction || 'keep',
      actor: input.actor || data.settings.ownerName,
      createdAt: new Date().toISOString(),
      kind: Number(input.amount) > 0 ? 'refund' : 'cost_recovery'
    };

    const nextSubs = data.subscriptions.map(sub => ({ ...sub }));
    if (input.serviceAction === 'end' && order.subscriptionId) {
      const sub = nextSubs.find(s => s.id === order.subscriptionId);
      if (sub) {
        if (order.kind === 'renewal' && order.previousSubscription) {
          const prev = order.previousSubscription;
          sub.startsAt = prev.startsAt;
          sub.expiresAt = prev.expiresAt;
          sub.planId = prev.planId;
          sub.price = prev.price;
          sub.cost = prev.cost;
          sub.cancelled = prev.cancelled;
          sub.lastOrderId = prev.lastOrderId;
        } else {
          sub.cancelled = true;
        }
        sub.remindedAt = null;
      }
    }

    persist({
      ...data,
      subscriptions: nextSubs,
      refunds: [refundRecord, ...(data.refunds || [])]
    });

    addToast('Ghi nhận hoàn tiền thành công', `Mã giao dịch: ${refundRecord.id}`, 'success');
    closeDialog();
  };

  const addCustomer = (input: {
    name: string;
    phone?: string;
    email?: string;
    source?: string;
    notes?: string;
    emailConsent?: Customer['emailConsent'];
    consentSource?: string;
  }): Customer => {
    const newCust: Customer = {
      id: `kh-${String(data.customers.length + 1).padStart(3, '0')}`,
      name: input.name.trim(),
      phone: (input.phone || '').trim(),
      email: (input.email || '').trim(),
      source: input.source || 'Trực tiếp',
      emailConsent: input.emailConsent || 'unknown',
      consentSource: input.consentSource || '',
      consentUpdatedAt: DEFAULT_APP_TODAY,
      notes: input.notes || '',
      joinedAt: DEFAULT_APP_TODAY,
      color: 'sky'
    };

    persist({
      ...data,
      customers: [newCust, ...data.customers]
    });

    addToast('Thêm khách hàng thành công', `${newCust.name} (${newCust.id})`, 'success');
    closeDialog();
    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    const nextCustomers = data.customers.map(c =>
      c.id === id ? { ...c, ...updates } : c
    );
    persist({
      ...data,
      customers: nextCustomers
    });
    addToast('Đã cập nhật thông tin khách hàng', '', 'success');
    closeDialog();
  };

  const addProduct = (input: {
    name: string;
    symbol: string;
    category: string;
    description: string;
    plans: { name: string; duration: number; unit: 'months' | 'days'; price: number; cost: number }[];
  }) => {
    const prodId = input.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const plansWithId = input.plans.map((pl, idx) => ({
      id: `${prodId}-plan-${idx + 1}`,
      name: pl.name,
      duration: pl.duration,
      unit: pl.unit,
      price: pl.price,
      cost: pl.cost
    }));

    const newProd = {
      id: prodId,
      name: input.name,
      symbol: input.symbol || input.name[0],
      category: input.category || 'AI Tool',
      color: 'indigo',
      description: input.description,
      plans: plansWithId
    };

    persist({
      ...data,
      products: [...data.products, newProd]
    });
    addToast('Đã thêm sản phẩm mới', newProd.name, 'success');
    closeDialog();
  };

  const importData = (importedData: TooldeskData) => {
    if (!importedData.customers || !importedData.orders || !importedData.products) {
      addToast('Lỗi định dạng dữ liệu', 'File .json không đúng cấu trúc Tooldesk.', 'error');
      return;
    }
    persist(importedData);
    addToast('Nhập dữ liệu thành công!', `Đã khôi phục ${importedData.orders.length} đơn và ${importedData.customers.length} khách.`, 'success');
    closeDialog();
  };

  const updateSettings = (newSettings: Partial<ShopSettings>) => {
    persist({
      ...data,
      settings: { ...data.settings, ...newSettings }
    });
    addToast('Đã lưu cài đặt', 'Thông tin hệ thống đã được cập nhật.', 'success');
  };

  const markContacted = (subscriptionId: string) => {
    const nextSubs = data.subscriptions.map(s =>
      s.id === subscriptionId ? { ...s, remindedAt: DEFAULT_APP_TODAY } : s
    );
    const sub = data.subscriptions.find(s => s.id === subscriptionId);
    const cust = sub ? data.customers.find(c => c.id === sub.customerId) : null;
    const newActivity = [
      {
        id: `act-${Date.now()}`,
        type: 'reminder' as const,
        title: 'Đã ghi nhận liên hệ',
        description: `${cust?.name || 'Khách'} · Gói ${subscriptionId}`,
        at: new Date().toISOString()
      },
      ...data.activity
    ];
    persist({
      ...data,
      subscriptions: nextSubs,
      activity: newActivity
    });
    addToast('Đã ghi nhận liên hệ', 'Trạng thái đã được cập nhật thành công.', 'success');
  };

  const syncWithSupabase = async () => {
    if (dataSource === 'mock') {
      addToast('Đang dùng dữ liệu mẫu', 'Bản giao diện này không kết nối dữ liệu thật. Thay đổi chỉ giữ trong phiên hiện tại.', 'info');
      return;
    }
    try {
      addToast('Đang kết nối Supabase...', 'Đang tải dữ liệu từ database PostgreSQL cloud.', 'info');
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          persist(json.data);
          setDataStatus('connected');
          addToast(
            'Đồng bộ Supabase thành công!',
            `Đã nạp ${json.data.orders.length} đơn, ${json.data.customers.length} khách, ${json.data.subscriptions.length} gói dịch vụ từ PostgreSQL.`,
            'success'
          );
          return;
        }
      }
      throw new Error('Máy chủ phản hồi lỗi khi đọc dữ liệu.');
    } catch (err: any) {
      setDataStatus('error');
      addToast('Lỗi kết nối Supabase', err.message || 'Không thể đồng bộ dữ liệu lúc này.', 'error');
    }
  };

  const resetData = () => {
    const fresh = createInitialData();
    persist(fresh);
    addToast('Đã khôi phục dữ liệu mẫu', 'Toàn bộ dữ liệu demo đã được làm mới.', 'info');
    closeDialog();
  };

  const saveCampaign: TooldeskContextType['saveCampaign'] = input => {
    const campaign = { ...input, id: input.id || `cp-${crypto.randomUUID()}`, date: DEFAULT_APP_TODAY, status: 'draft' as const };
    persist({ ...data, campaigns: input.id ? data.campaigns.map(item => item.id === input.id ? campaign : item) : [campaign, ...data.campaigns] });
    addToast('Đã lưu bản nháp', 'Chiến dịch chưa gửi tin cho khách hàng.', 'success');
    closeDialog();
  };

  const updatePlan: TooldeskContextType['updatePlan'] = (planId, updates) => {
    if (!updates.name.trim() || ![updates.price, updates.cost].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Nhập tên gói và giá trị nguyên VND không âm.');
    persist({ ...data, products: data.products.map(product => ({ ...product, plans: product.plans.map(plan => plan.id === planId ? { ...plan, ...updates, name: updates.name.trim() } : plan) })) });
    addToast('Đã cập nhật gói bán', 'Các đơn lịch sử giữ nguyên giá trị.', 'success');
    closeDialog();
  };

  return (
    <TooldeskContext.Provider
      value={{
        data,
        dataStatus,
        saveCampaign,
        updatePlan,
        toasts,
        dialog,
        addToast,
        removeToast,
        openDialog,
        closeDialog,
        createOrder,
        recordPayment,
        renewSubscription,
        processRefund,
        addCustomer,
        updateCustomer,
        addProduct,
        importData,
        updateSettings,
        resetData,
        syncWithSupabase,
        markContacted
      }}
    >
      {children}
    </TooldeskContext.Provider>
  );
}

function nextOrderId(orders: Order[]): string {
  return `DH-${Math.max(1100, ...orders.map(order => Number(order.id.replace(/^DH-/, '')) || 0)) + 1}`;
}

export function useTooldesk() {
  const ctx = useContext(TooldeskContext);
  if (!ctx) throw new Error('useTooldesk must be used within TooldeskProvider');
  return ctx;
}
