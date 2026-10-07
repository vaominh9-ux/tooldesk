/**
 * Supabase & Database Configuration for Tooldesk
 * Tự động đồng bộ cấu hình giữa Web Client và Database Supabase
 */
const SUPABASE_CONFIG = {
  url: 'https://jqkezzjkcyulkrmtrwgj.supabase.co',
  anonKey: 'sb_publishable_mKZli7X_7ubSWIQrr2qk7w_ksf3anf6',
  email: 'vaominh9@gmail.com',
  projectId: 'jqkezzjkcyulkrmtrwgj',
  isConfigured: true
};

// Khởi tạo Supabase client nếu thư viện @supabase/supabase-js được nạp
function getSupabaseClient() {
  if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
    return window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }
  return null;
}

// Đồng bộ toàn bộ dữ liệu Tooldesk từ Supabase REST API về ứng dụng web
async function fetchTooldeskDataFromSupabase() {
  const base = `${SUPABASE_CONFIG.url}/rest/v1`;
  const headers = {
    'apikey': SUPABASE_CONFIG.anonKey,
    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
  };

  const [
    productsRaw,
    plansRaw,
    customersRaw,
    subscriptionsRaw,
    ordersRaw,
    refundsRaw,
    campaignsRaw,
    activityRaw,
    settingsRaw
  ] = await Promise.all([
    fetch(`${base}/products?select=*`, { headers }).then(r => r.json()),
    fetch(`${base}/product_plans?select=*`, { headers }).then(r => r.json()),
    fetch(`${base}/customers?select=*`, { headers }).then(r => r.json()),
    fetch(`${base}/subscriptions?select=*`, { headers }).then(r => r.json()),
    fetch(`${base}/orders?select=*`, { headers }).then(r => r.json()),
    fetch(`${base}/refunds?select=*`, { headers }).then(r => r.json()),
    fetch(`${base}/campaigns?select=*`, { headers }).then(r => r.json()),
    fetch(`${base}/activity_logs?select=*`, { headers }).then(r => r.json()),
    fetch(`${base}/settings?select=*`, { headers }).then(r => r.json())
  ]);

  // Gom các gói plans vào từng sản phẩm tương ứng
  const products = (productsRaw || []).map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    color: p.color || 'mint',
    symbol: p.symbol || '◈',
    description: p.description || '',
    plans: (plansRaw || [])
      .filter(pl => pl.product_id === p.id)
      .map(pl => ({
        id: pl.id,
        name: pl.name,
        duration: Number(pl.duration),
        unit: pl.unit || 'months',
        price: Number(pl.price),
        cost: Number(pl.cost)
      }))
  }));

  const customers = (customersRaw || []).map(c => ({
    id: c.id,
    name: c.name,
    email: c.email || '',
    phone: c.phone || '',
    source: c.source || 'Zalo',
    emailConsent: c.email_consent || 'opted_in',
    consentSource: c.consent_source || 'Đăng ký dịch vụ',
    consentUpdatedAt: c.consent_updated_at || '2026-09-01',
    notes: c.notes || '',
    color: c.color || 'sky',
    joinedAt: c.joined_at || '2026-07-01'
  }));

  const subscriptions = (subscriptionsRaw || []).map(s => ({
    id: s.id,
    customerId: s.customer_id,
    productId: s.product_id,
    planId: s.plan_id,
    startsAt: s.starts_at,
    expiresAt: s.expires_at,
    price: Number(s.price),
    cost: Number(s.cost),
    cancelled: Boolean(s.cancelled),
    remindedAt: s.reminded_at || null,
    note: s.note || ''
  }));

  const orders = (ordersRaw || []).map(o => ({
    id: o.id,
    customerId: o.customer_id,
    productId: o.product_id,
    planId: o.plan_id,
    subscriptionId: o.subscription_id || '',
    date: o.date,
    startsAt: o.starts_at,
    expiresAt: o.expires_at,
    price: Number(o.price),
    cost: Number(o.cost),
    payment: o.payment || 'paid',
    status: o.status || 'completed',
    kind: o.kind || 'new',
    note: o.note || '',
    paidAt: o.paid_at || null,
    paidAtEstimated: Boolean(o.paid_at_estimated)
  }));

  const refunds = (refundsRaw || []).map(r => ({
    id: r.id,
    operationId: r.operation_id || '',
    orderId: r.order_id,
    amount: Number(r.amount),
    costRecovered: Number(r.cost_recovered || 0),
    date: r.date,
    reason: r.reason || ''
  }));

  const campaigns = (campaignsRaw || []).map(cp => ({
    id: cp.id,
    name: cp.title,
    subject: cp.subject || '',
    segment: cp.segment || 'all',
    body: cp.content || '',
    status: cp.status || 'draft',
    date: cp.created_at ? cp.created_at.slice(0, 10) : '2026-10-06'
  }));

  const activity = (activityRaw || []).map(a => ({
    id: a.id,
    type: a.type || 'created',
    title: a.title,
    description: a.description || '',
    at: a.created_at || new Date().toISOString()
  }));

  const sRow = (settingsRaw && settingsRaw[0]) || {};
  const settings = {
    shopName: sRow.shop_name || 'Tooldesk',
    ownerName: sRow.owner_name || 'Minh',
    reminderDays: Number(sRow.reminder_days || 7),
    currency: sRow.currency || 'VND',
    timezone: sRow.timezone || 'Asia/Ho_Chi_Minh'
  };

  return {
    schemaVersion: 2,
    customers,
    products,
    subscriptions,
    orders,
    refunds,
    campaigns,
    activity,
    settings
  };
}

// Hỗ trợ cả môi trường Browser và Node.js
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
  window.getSupabaseClient = getSupabaseClient;
  window.fetchTooldeskDataFromSupabase = fetchTooldeskDataFromSupabase;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUPABASE_CONFIG, getSupabaseClient, fetchTooldeskDataFromSupabase };
}
