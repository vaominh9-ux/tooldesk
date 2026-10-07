import { addDays, DEFAULT_APP_TODAY } from '../domain/dates';

export interface ProductPlan {
  id: string;
  name: string;
  duration: number;
  unit: 'months' | 'days';
  price: number;
  cost: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  color: string;
  symbol: string;
  description: string;
  plans: ProductPlan[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  emailConsent: 'opted_in' | 'opted_out' | 'unknown';
  consentSource: string;
  consentUpdatedAt: string;
  notes: string;
  joinedAt: string;
  color: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  productId: string;
  planId: string;
  startsAt: string;
  expiresAt: string;
  price: number;
  cost: number;
  cancelled: boolean;
  remindedAt?: string | null;
  note?: string;
  lastOrderId?: string;
}

export interface Order {
  id: string;
  customerId: string;
  productId: string;
  planId: string;
  subscriptionId?: string;
  date: string;
  startsAt: string;
  expiresAt: string;
  price: number;
  cost: number;
  payment: 'paid' | 'unpaid';
  status: 'completed' | 'cancelled';
  kind: 'new' | 'renewal';
  note?: string;
  paidAt?: string | null;
  paidAtEstimated?: boolean;
  previousSubscription?: Subscription;
}

export interface Refund {
  id: string;
  operationId: string;
  orderId: string;
  amount: number;
  costRecovered: number;
  date: string;
  reason: string;
  method?: string;
  reference?: string;
  serviceAction?: 'keep' | 'end';
  actor?: string;
  createdAt?: string;
  kind?: 'refund' | 'cost_recovery';
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  segment: string;
  body: string;
  status: 'draft' | 'scheduled' | 'sent';
  date: string;
}

export interface ActivityLog {
  id: string;
  type: 'payment' | 'renewal' | 'reminder' | 'created';
  title: string;
  description: string;
  at: string;
}

export interface ShopSettings {
  shopName: string;
  ownerName: string;
  reminderDays: number;
  currency: 'VND';
  timezone: 'Asia/Ho_Chi_Minh';
}

export interface TooldeskData {
  schemaVersion: number;
  customers: Customer[];
  products: Product[];
  subscriptions: Subscription[];
  orders: Order[];
  refunds: Refund[];
  campaigns: Campaign[];
  activity: ActivityLog[];
  settings: ShopSettings;
}

export function createInitialData(): TooldeskData {
  const products: Product[] = [
    {
      id: 'p-chatgpt',
      name: 'ChatGPT',
      category: 'Trợ lý AI',
      color: 'mint',
      symbol: '◈',
      description: 'Gói dịch vụ AI cho công việc hằng ngày.',
      plans: [
        { id: 'pl-gpt-1', name: 'Gói 1 tháng', duration: 1, unit: 'months', price: 450000, cost: 300000 },
        { id: 'pl-gpt-3', name: 'Gói 3 tháng', duration: 3, unit: 'months', price: 1250000, cost: 850000 }
      ]
    },
    {
      id: 'p-claude',
      name: 'Claude',
      category: 'Trợ lý AI',
      color: 'peach',
      symbol: '✳',
      description: 'Viết, phân tích và làm việc với tài liệu.',
      plans: [
        { id: 'pl-claude-1', name: 'Gói 1 tháng', duration: 1, unit: 'months', price: 490000, cost: 350000 },
        { id: 'pl-claude-3', name: 'Gói 3 tháng', duration: 3, unit: 'months', price: 1390000, cost: 990000 }
      ]
    },
    {
      id: 'p-gemini',
      name: 'Gemini',
      category: 'Trợ lý AI',
      color: 'blue',
      symbol: '✦',
      description: 'Không gian làm việc cùng AI.',
      plans: [
        { id: 'pl-gem-1', name: 'Gói 1 tháng', duration: 1, unit: 'months', price: 390000, cost: 250000 },
        { id: 'pl-gem-3', name: 'Gói 3 tháng', duration: 3, unit: 'months', price: 1090000, cost: 720000 }
      ]
    },
    {
      id: 'p-perplexity',
      name: 'Perplexity',
      category: 'Nghiên cứu',
      color: 'aqua',
      symbol: '⊞',
      description: 'Tìm kiếm và tổng hợp thông tin.',
      plans: [
        { id: 'pl-per-1', name: 'Gói 1 tháng', duration: 1, unit: 'months', price: 350000, cost: 220000 },
        { id: 'pl-per-3', name: 'Gói 3 tháng', duration: 3, unit: 'months', price: 990000, cost: 600000 }
      ]
    },
    {
      id: 'p-canva',
      name: 'Canva',
      category: 'Thiết kế',
      color: 'purple',
      symbol: 'C',
      description: 'Công cụ hỗ trợ thiết kế nội dung.',
      plans: [
        { id: 'pl-can-1', name: 'Gói 1 tháng', duration: 1, unit: 'months', price: 150000, cost: 90000 },
        { id: 'pl-can-12', name: 'Gói 12 tháng', duration: 12, unit: 'months', price: 1200000, cost: 720000 }
      ]
    }
  ];

  const names = [
    'Nguyễn Minh Anh', 'Trần Hoàng Nam', 'Lê Thu Hà', 'Phạm Quốc Bảo', 'Võ Ngọc Linh',
    'Đặng Hải Đăng', 'Bùi Thanh Trúc', 'Đỗ Đức Huy', 'Ngô Khánh Vy', 'Hoàng Tuấn Kiệt',
    'Phan Bảo Ngọc', 'Vũ Quang Minh', 'Mai Thảo Nguyên', 'Lý Anh Khoa', 'Dương Phương Thảo',
    'Trịnh Gia Hân', 'Đinh Minh Đức', 'Hồ Nhật Linh', 'Lâm Thành Đạt', 'Tạ Quỳnh Chi',
    'Cao Hải Yến', 'Đoàn Hữu Phúc', 'Nguyễn Kim Ngân', 'Trần Hoài An', 'Lê Bảo Châu',
    'Phạm Tiến Dũng', 'Võ Yến Nhi', 'Bùi Anh Tú', 'Đặng Mỹ Duyên', 'Ngô Gia Bảo',
    'Hoàng Diệu Linh', 'Phan Anh Quân', 'Vũ Thanh Tâm', 'Mai Quốc Hưng', 'Hồ Thùy Dương',
    'Lâm Đức Anh'
  ];

  const customers: Customer[] = names.map((name, i) => ({
    id: `kh-${String(i + 1).padStart(3, '0')}`,
    name,
    email: `khach${i + 1}@example.com`,
    phone: `09•• ••• ${String(100 + i)}`,
    source: ['Messenger', 'Zalo', 'Website', 'Giới thiệu'][i % 4],
    emailConsent: i % 9 === 0 ? 'opted_out' : i % 7 === 0 ? 'unknown' : 'opted_in',
    consentSource: 'Dữ liệu minh họa',
    consentUpdatedAt: '2026-09-01',
    notes: i === 0 ? 'Ưu tiên liên hệ sau 14:00. Quan tâm các gói dài hạn.' : '',
    joinedAt: addDays('2026-07-01', i * 2),
    color: ['lavender', 'rose', 'sky', 'mint', 'sand'][i % 5]
  }));

  customers[30].email = customers[1].email;
  customers[31].email = '';

  const subscriptions: Subscription[] = [];
  const orders: Order[] = [];
  const expiryOffsets = [1, 2, 3, 4, 6, 7, 0, -1, -3, -7, 12, 18, 25, 35, 44, 60, 90, 120];
  let sequence = 1020;

  customers.forEach((customer, i) => {
    const howMany = i % 3 === 0 ? 2 : 1;
    for (let j = 0; j < howMany; j++) {
      const product = products[(i + j) % products.length];
      const plan = product.plans[(i % 6 === 0 && j === 1) ? 1 : 0];
      const expiresAt = addDays(DEFAULT_APP_TODAY, expiryOffsets[(i + j * 4) % expiryOffsets.length]);
      const startsAt = addDays(expiresAt, -(plan.duration * 30));
      const subId = `sub-${i}-${j}`;

      const sub: Subscription = {
        id: subId,
        customerId: customer.id,
        productId: product.id,
        planId: plan.id,
        startsAt,
        expiresAt,
        price: plan.price,
        cost: plan.cost,
        cancelled: false,
        remindedAt: (i % 4 === 1 && expiryOffsets[(i + j * 4) % expiryOffsets.length] <= 7) ? DEFAULT_APP_TODAY : null,
        note: ''
      };
      subscriptions.push(sub);

      for (let k = 0; k < (i % 3) + 1; k++) {
        const orderId = `DH-${++sequence}`;
        const date = addDays(DEFAULT_APP_TODAY, -(i * 3 + k * 19) % 64);
        orders.push({
          id: orderId,
          customerId: customer.id,
          productId: product.id,
          planId: plan.id,
          subscriptionId: sub.id,
          date,
          startsAt: k === 0 ? startsAt : addDays(startsAt, -30 * k),
          expiresAt: k === 0 ? expiresAt : addDays(expiresAt, -30 * k),
          price: plan.price,
          cost: plan.cost,
          payment: (i % 8 === 0 && k === 0) ? 'unpaid' : 'paid',
          status: 'completed',
          kind: k === 0 && i % 3 > 0 ? 'renewal' : 'new',
          note: '',
          paidAt: date
        });
        sub.lastOrderId = orderId;
      }
    }
  });

  for (let i = 0; i < 14; i++) {
    const sub = subscriptions[i + 15];
    const product = products.find(p => p.id === sub.productId)!;
    const plan = product.plans.find(p => p.id === sub.planId)!;
    const orderId = `DH-${++sequence}`;
    const date = addDays(DEFAULT_APP_TODAY, -(i % 6));
    orders.push({
      id: orderId,
      customerId: sub.customerId,
      productId: sub.productId,
      planId: sub.planId,
      subscriptionId: sub.id,
      date,
      startsAt: sub.startsAt,
      expiresAt: sub.expiresAt,
      price: plan.price,
      cost: plan.cost,
      payment: i === 11 ? 'unpaid' : 'paid',
      status: 'completed',
      kind: i % 3 === 0 ? 'new' : 'renewal',
      note: '',
      paidAt: date
    });
    sub.lastOrderId = orderId;
  }

  orders.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  for (const subscription of subscriptions) {
    subscription.lastOrderId = orders.find(order => order.subscriptionId === subscription.id)?.id;
  }

  const refundableExamples = orders.filter(o => o.payment === 'paid').slice(0, 2);
  const refunds: Refund[] = refundableExamples.map((o, i) => ({
    id: `ht-demo-${i + 1}`,
    operationId: `demo-refund-${i + 1}`,
    orderId: o.id,
    amount: i === 0 ? Math.min(100000, o.price) : o.price,
    costRecovered: 0,
    date: DEFAULT_APP_TODAY,
    reason: i === 0 ? 'Hoàn một phần theo thỏa thuận (dữ liệu mẫu).' : 'Hoàn toàn bộ; chưa thu hồi giá vốn (dữ liệu mẫu).',
    method: 'bank',
    reference: 'DEMO-' + (i + 1),
    serviceAction: 'keep',
    actor: 'Minh',
    createdAt: `2026-10-06T09:0${i}:00+07:00`,
    kind: 'refund'
  }));

  const campaigns: Campaign[] = [
    {
      id: 'cp-1',
      name: 'Tháng mới, ưu đãi mới',
      subject: 'Ưu đãi dành riêng cho bạn trong tháng 10',
      segment: 'active',
      body: 'Chào {ten_khach},\n\nCảm ơn bạn đã đồng hành cùng {thuong_hieu}. Tháng này, chúng tôi có chương trình ưu đãi cho khách hàng hiện tại.\n\nPhản hồi email này để được tư vấn gói phù hợp.\n\nTrân trọng,\n{thuong_hieu}',
      status: 'draft',
      date: '2026-10-05'
    },
    {
      id: 'cp-2',
      name: 'Chào mừng bạn quay lại',
      subject: 'Chúng tôi có một ưu đãi dành cho bạn',
      segment: 'expired',
      body: 'Chào {ten_khach},\n\nBạn đang cần sử dụng lại công cụ AI? Hãy phản hồi để nhận tư vấn và thông tin ưu đãi hiện có.\n\n{thuong_hieu}',
      status: 'draft',
      date: '2026-10-03'
    }
  ];

  const activity: ActivityLog[] = [
    { id: 'a1', type: 'payment', title: 'Đã ghi nhận thanh toán', description: `${customers[15].name} · 450.000 ₫`, at: '2026-10-06T08:42:00+07:00' },
    { id: 'a2', type: 'renewal', title: 'Một gói đã được gia hạn', description: `${customers[16].name} · Claude`, at: '2026-10-06T08:30:00+07:00' },
    { id: 'a3', type: 'reminder', title: 'Đã ghi nhận liên hệ', description: `${customers[1].name} · Gemini`, at: '2026-10-06T08:15:00+07:00' },
    { id: 'a4', type: 'created', title: 'Đã tạo đơn hàng mới', description: `${customers[8].name} · ${orders[0].id}`, at: '2026-10-06T08:02:00+07:00' }
  ];

  const settings: ShopSettings = {
    shopName: 'Tooldesk',
    ownerName: 'Minh',
    reminderDays: 7,
    currency: 'VND',
    timezone: 'Asia/Ho_Chi_Minh'
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
