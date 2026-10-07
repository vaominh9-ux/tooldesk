'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createEmptyProductionData, createInitialData, type Customer, type Order, type ShopSettings, type TooldeskData } from '@/mocks/fixtures';
import { DEFAULT_APP_TODAY } from '@/domain/dates';
import { runtimeToday } from '@/lib/app-clock';
import { commandSchema, executeCommand } from '@/domain/commands';
import { dataSchema } from '@/domain/data-schema';
import { createShortId } from '@/domain/orders';
import type { RefundInput } from '@/domain/refunds';
import { LoginPanel } from '@/features/auth/login-panel';
import { BrandLogoMark } from '@/components/shared/app-icon';

interface ToastItem { id: string; title: string; message?: string; type?: 'info' | 'success' | 'warning' | 'error' }
interface DialogState {
  type: 'create-order' | 'renew' | 'renew-subscription' | 'refund' | 'recover-cost' | 'pay-confirm' | 'customer' | 'order-detail' | 'customer-detail' | 'subscription-detail' | 'product' | 'edit-product' | 'plan' | 'add-plan' | 'campaign' | 'search' | 'activity' | 'help' | 'reset' | null;
  payload?: string | { id?: string; orderId?: string; customerId?: string; subscriptionId?: string; productId?: string; planId?: string; mode?: string; segment?: string };
}
interface CustomerInput { name: string; email?: string; phone?: string; source?: string; notes?: string; emailConsent?: Customer['emailConsent']; consentSource?: string }
interface CreateOrderInput { customerId?: string; newCustomer?: { name: string; email?: string; phone?: string }; productId: string; planId: string; startsAt: string; price: number; cost: number; payment: 'paid' | 'unpaid'; note?: string }
interface RenewalInput { subscriptionId: string; planId: string; startsAt: string; price: number; cost: number; payment?: 'paid' | 'unpaid' }
interface ProductInput { name: string; symbol: string; category: string; description: string; plans: { name: string; duration: number; unit: 'months' | 'days'; price: number; cost: number }[] }
interface UpdateProductInput { name: string; category?: string; description?: string; color?: string; symbol?: string }
interface CampaignInput { id?: string; name: string; subject: string; body: string; segment: string }
interface TooldeskContextType {
  data: TooldeskData;
  today: string;
  dataStatus: 'mock' | 'loading' | 'connected' | 'error';
  isSyncing: boolean;
  pending: boolean;
  role: 'admin' | 'staff' | 'viewer';
  toasts: ToastItem[];
  dialog: DialogState;
  addToast: (title: string, message?: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;
  openDialog: (type: DialogState['type'], payload?: DialogState['payload']) => void;
  closeDialog: () => void;
  createOrder: (input: CreateOrderInput) => Promise<Order>;
  renewSubscription: (input: RenewalInput) => Promise<Order>;
  recordPayment: (orderId: string) => Promise<void>;
  processRefund: (input: RefundInput) => Promise<void>;
  addCustomer: (input: CustomerInput) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  addProduct: (input: ProductInput) => Promise<void>;
  updateProduct: (productId: string, updates: UpdateProductInput) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  updatePlan: (planId: string, updates: { name: string; price: number; cost: number }) => Promise<void>;
  addPlan: (productId: string, plan: { name: string; duration: number; unit: 'months' | 'days'; price: number; cost: number }) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  saveCampaign: (input: CampaignInput) => Promise<void>;
  updateSettings: (input: Partial<ShopSettings>) => Promise<void>;
  markContacted: (subscriptionId: string) => Promise<void>;
  updateSubscriptionNote: (subscriptionId: string, note: string) => Promise<void>;
  importData: (input: TooldeskData) => void;
  resetData: () => void;
  loadDemoData: () => void;
  syncWithSupabase: () => Promise<void>;
  logout: () => Promise<void>;
}
const TooldeskContext = createContext<TooldeskContextType | null>(null);

export function TooldeskProvider({ children, dataSource = 'mock' }: { children: React.ReactNode; dataSource?: 'mock' | 'supabase' }) {
  const [data, setData] = useState<TooldeskData>(() =>
    dataSource === 'mock' ? createInitialData() : createEmptyProductionData()
  );
  const currentData = useRef(data);
  const [dataStatus, setDataStatus] = useState<TooldeskContextType['dataStatus']>(dataSource === 'mock' ? 'mock' : 'loading');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [role, setRole] = useState<TooldeskContextType['role']>('admin');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const isFetching = useRef(false);
  const retryRequest = useRef<{ body: string; operationId: string } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<DialogState>({ type: null });
  const [today, setToday] = useState(() => runtimeToday());
  const STORAGE_KEY = 'tooldesk_workspace_data';
  const updateData = (value: TooldeskData) => {
    currentData.current = value;
    setData(value);
    if (dataSource === 'mock' && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch (err) {
        console.warn('LocalStorage save failed:', err);
      }
    }
  };
  const addToast: TooldeskContextType['addToast'] = (title, message, type = 'info') => {
    const id = crypto.randomUUID(); setToasts(previous => [...previous, { id, title, message, type }]);
    setTimeout(() => setToasts(previous => previous.filter(item => item.id !== id)), 6000);
  };
  const closeDialog = () => { if (!busy.current) setDialog({ type: null }); };
  const load = async (silent = false) => {
    if (dataSource === 'mock') { return; }
    if (isFetching.current) return;
    isFetching.current = true;
    if (!silent) setDataStatus('loading');
    setIsSyncing(true);
    try {
      const response = await fetch('/api/data', { cache: 'no-store' });
      if (response.status === 401) { setNeedsLogin(true); setDataStatus('error'); return; }
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== 'object' || !('data' in payload)) throw new Error('Không tải được dữ liệu. Kiểm tra quyền và cấu hình backend.');
      const parsed = dataSchema.parse((payload as { data: unknown }).data);
      if (JSON.stringify(currentData.current) !== JSON.stringify(parsed)) {
        updateData(parsed);
      }
      if ('role' in payload && ['admin','staff','viewer'].includes(String(payload.role))) setRole(payload.role as TooldeskContextType['role']);
      setNeedsLogin(false); setDataStatus('connected');
    } catch (error) {
      if (!silent) {
        setDataStatus('error');
        addToast('Lỗi tải dữ liệu', error instanceof Error ? error.message : 'Dữ liệu không hợp lệ.', 'error');
      }
    } finally {
      isFetching.current = false;
      setIsSyncing(false);
    }
  };
  useEffect(() => {
    if (dataSource === 'mock' && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const valid = dataSchema.safeParse(parsed);
          if (valid.success && valid.data.customers && valid.data.customers.length > 0) {
            currentData.current = valid.data;
            setData(valid.data);
            return;
          }
        }
        const initial = createInitialData();
        currentData.current = initial;
        setData(initial);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      } catch (err) {
        console.warn('LocalStorage load failed:', err);
      }
    }
  }, [dataSource]);
  // REALTIME BACKGROUND SYNC (6 seconds + instant on window focus/tab change)
  useEffect(() => {
    if (dataSource !== 'supabase') return;
    void load();

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden && !busy.current) {
        void load(true);
      }
    }, 6000);

    const handleFocus = () => {
      if (typeof document !== 'undefined' && !document.hidden && !busy.current) {
        void load(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [dataSource]);
  useEffect(() => {
    const timer = setInterval(() => setToday(runtimeToday()), 60000);
    return () => clearInterval(timer);
  }, []);

  async function run(raw: unknown, title: string, close = true): Promise<{ data: TooldeskData; resultId?: string }> {
    if (busy.current) throw new Error('Đang lưu thao tác trước. Vui lòng chờ.');
    busy.current = true; setPending(true);
    try {
      const command = commandSchema.parse(raw);
      if (dataSource === 'supabase' && (role === 'viewer' || dataStatus !== 'connected')) throw new Error('Chưa có quyền hoặc chưa tải dữ liệu.');
      let result: { data: TooldeskData; resultId?: string };
      if (dataSource === 'mock') {
        result = executeCommand(dataSchema.parse(currentData.current), command, { today: runtimeToday(), now: new Date().toISOString(), actor: currentData.current.settings.ownerName, newId: prefix => createShortId(prefix) });
      } else {
        const body = JSON.stringify(command);
        const operationId = retryRequest.current?.body === body ? retryRequest.current.operationId : crypto.randomUUID();
        retryRequest.current = { body, operationId };
        const response = await fetch('/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command, operationId }) });
        const payload: unknown = await response.json();
        if (!response.ok) {
          if (response.status === 401) setNeedsLogin(true);
          throw new Error(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Không thể lưu giao dịch.');
        }
        if (!payload || typeof payload !== 'object' || !('data' in payload)) throw new Error('Phản hồi máy chủ không hợp lệ.');
        result = { data: dataSchema.parse(payload.data), resultId: 'resultId' in payload && typeof payload.resultId === 'string' ? payload.resultId : undefined };
        retryRequest.current = null;
      }
      updateData(result.data); addToast(title, result.resultId, 'success'); if (close) setDialog({ type: null }); return result;
    } catch (error) { addToast('Không thể lưu', error instanceof Error ? error.message : 'Lỗi chưa xác định.', 'error'); throw error; }
    finally { busy.current = false; setPending(false); }
  }
  const value: TooldeskContextType = {
    data, today, dataStatus, isSyncing, pending, role, toasts, dialog, addToast,
    removeToast: id => setToasts(previous => previous.filter(item => item.id !== id)),
    openDialog: (type, payload) => { if (!busy.current) setDialog({ type, payload }); }, closeDialog,
    createOrder: async input => { const result = await run({ type: 'create_order', input }, 'Đã tạo đơn'); const order = result.data.orders.find(item => item.id === result.resultId); if (!order) throw new Error('Thiếu đơn trong phản hồi.'); return order; },
    renewSubscription: async ({ startsAt: _startsAt, ...input }) => { const result = await run({ type: 'renew_subscription', input }, 'Đã gia hạn'); const order = result.data.orders.find(item => item.id === result.resultId); if (!order) throw new Error('Thiếu đơn gia hạn.'); return order; },
    recordPayment: async orderId => { await run({ type: 'record_payment', input: { orderId } }, 'Đã ghi nhận thanh toán'); },
    processRefund: async ({ actor: _actor, ...input }) => { await run({ type: 'record_refund', input: { ...input, operationId: input.operationId || crypto.randomUUID() } }, 'Đã ghi nhận hoàn/thu hồi vốn'); },
    addCustomer: async input => { const result = await run({ type: 'add_customer', input }, 'Đã thêm khách'); const customer = result.data.customers.find(item => item.id === result.resultId); if (!customer) throw new Error('Thiếu khách trong phản hồi.'); return customer; },
    updateCustomer: async (id, updates) => { await run({ type: 'update_customer', input: { id, updates } }, 'Đã cập nhật khách'); },
    addProduct: async input => { await run({ type: 'add_product', input }, 'Đã thêm sản phẩm'); },
    updateProduct: async (productId, updates) => { await run({ type: 'update_product', input: { productId, ...updates } }, 'Đã cập nhật sản phẩm'); },
    deleteProduct: async productId => { await run({ type: 'delete_product', input: { productId } }, 'Đã xóa sản phẩm'); },
    updatePlan: async (planId, updates) => { await run({ type: 'update_plan', input: { planId, ...updates } }, 'Đã cập nhật gói bán'); },
    addPlan: async (productId, plan) => { await run({ type: 'add_plan', input: { productId, ...plan } }, 'Đã thêm gói dịch vụ'); },
    deletePlan: async planId => { await run({ type: 'delete_plan', input: { planId } }, 'Đã xóa gói dịch vụ'); },
    saveCampaign: async input => { await run({ type: 'save_campaign', input }, 'Đã lưu bản nháp'); },
    updateSettings: async input => { await run({ type: 'update_settings', input }, 'Đã lưu cài đặt', false); },
    markContacted: async subscriptionId => { try { await run({ type: 'mark_contacted', input: { subscriptionId } }, 'Đã ghi nhận liên hệ', false); } catch { /* Error already shown to the user by run(). */ } },
    updateSubscriptionNote: async (subscriptionId, note) => { await run({ type: 'update_subscription_note', input: { subscriptionId, note } }, 'Đã lưu tài khoản gói', false); },
    importData: input => { updateData(dataSchema.parse(input)); closeDialog(); addToast('Đã nhập dữ liệu thành công', undefined, 'success'); },
    resetData: () => { updateData(createEmptyProductionData()); closeDialog(); addToast('Đã làm sạch dữ liệu', 'Hệ thống đã sẵn sàng cho vận hành thực tế.', 'success'); },
    loadDemoData: () => { updateData(createInitialData()); closeDialog(); addToast('Đã nạp dữ liệu mẫu', 'Đã tải 36 khách hàng và 98 đơn hàng demo.', 'info'); },
    syncWithSupabase: async () => {
      if (!busy.current) {
        addToast('Đang làm mới Realtime…', undefined, 'info');
        await load();
        addToast('Đã đồng bộ Realtime', 'Dữ liệu mới nhất từ Supabase Cloud.', 'success');
      }
    },
    logout: async () => { const response = await fetch('/api/auth/logout', { method: 'POST' }); if (!response.ok) throw new Error('Không thể đăng xuất.'); setNeedsLogin(true); setDataStatus('error'); }
  };
  return (
    <TooldeskContext.Provider value={value}>
      {dataSource === 'supabase' && needsLogin ? (
        <LoginPanel onSuccess={() => void load()} />
      ) : dataSource === 'supabase' && dataStatus !== 'connected' ? (
        <div className="app-splash-wrap">
          <div className="app-splash-card">
            <div className="login-logo-box" style={{ width: 56, height: 56, margin: '0 auto 16px' }}>
              <BrandLogoMark size={28} />
            </div>
            {dataStatus === 'loading' ? (
              <>
                <div className="app-splash-spinner"></div>
                <h2 className="app-splash-title">Đang đồng bộ Realtime Tooldesk…</h2>
                <p className="app-splash-subtitle">Đang kết nối cơ sở dữ liệu Supabase Cloud thời gian thực.</p>
              </>
            ) : (
              <>
                <div className="login-error-banner" style={{ marginBottom: 16 }}>
                  Không thể kết nối máy chủ Supabase. Vui lòng kiểm tra đường truyền và thử lại.
                </div>
                <button
                  type="button"
                  className="login-submit"
                  onClick={() => void load()}
                >
                  Thử kết nối lại
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        children
      )}
    </TooldeskContext.Provider>
  );
}
export function useTooldesk() { const value = useContext(TooldeskContext); if (!value) throw new Error('Thiếu TooldeskProvider.'); return value; }
