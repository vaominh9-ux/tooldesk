const { Client } = require('pg');
require('dotenv').config();

// Helper functions matching tooldesk-v2-preview.html domain
const DEMO_TODAY = '2026-10-06';

function parseDay(iso) {
  return new Date(`${iso}T00:00:00Z`);
}

function addDays(iso, days) {
  const date = parseDay(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getSeedData() {
  const products = [
    {id:'p-chatgpt', name:'ChatGPT', category:'Trợ lý AI', color:'mint', symbol:'◈', description:'Gói dịch vụ AI cho công việc hằng ngày.', plans:[
      {id:'pl-gpt-1', name:'Gói 1 tháng', duration:1, unit:'months', price:450000, cost:300000},
      {id:'pl-gpt-3', name:'Gói 3 tháng', duration:3, unit:'months', price:1250000, cost:850000}]},
    {id:'p-chatgpt-business', name:'ChatGPT Business', category:'Trợ lý AI', color:'emerald', symbol:'◈', description:'Gói dịch vụ ChatGPT Business cho doanh nghiệp và đội nhóm.', plans:[
      {id:'pl-gpt-biz-1', name:'Gói 1 tháng', duration:1, unit:'months', price:550000, cost:380000},
      {id:'pl-gpt-biz-3', name:'Gói 3 tháng', duration:3, unit:'months', price:1590000, cost:1140000},
      {id:'pl-gpt-biz-6', name:'Gói 6 tháng', duration:6, unit:'months', price:3000000, cost:2280000}]},
    {id:'p-claude', name:'Claude', category:'Trợ lý AI', color:'peach', symbol:'✳', description:'Viết, phân tích và làm việc với tài liệu.', plans:[
      {id:'pl-claude-1', name:'Gói 1 tháng', duration:1, unit:'months', price:490000, cost:350000},
      {id:'pl-claude-3', name:'Gói 3 tháng', duration:3, unit:'months', price:1390000, cost:990000}]},
    {id:'p-gemini', name:'Gemini', category:'Trợ lý AI', color:'blue', symbol:'✦', description:'Không gian làm việc cùng AI.', plans:[
      {id:'pl-gem-1', name:'Gói 1 tháng', duration:1, unit:'months', price:390000, cost:250000},
      {id:'pl-gem-3', name:'Gói 3 tháng', duration:3, unit:'months', price:1090000, cost:720000}]},
    {id:'p-perplexity', name:'Perplexity', category:'Nghiên cứu', color:'aqua', symbol:'⊞', description:'Tìm kiếm và tổng hợp thông tin.', plans:[
      {id:'pl-per-1', name:'Gói 1 tháng', duration:1, unit:'months', price:350000, cost:220000},
      {id:'pl-per-3', name:'Gói 3 tháng', duration:3, unit:'months', price:990000, cost:600000}]},
    {id:'p-canva', name:'Canva', category:'Thiết kế', color:'purple', symbol:'C', description:'Công cụ hỗ trợ thiết kế nội dung.', plans:[
      {id:'pl-can-1', name:'Gói 1 tháng', duration:1, unit:'months', price:150000, cost:90000},
      {id:'pl-can-12', name:'Gói 12 tháng', duration:12, unit:'months', price:1200000, cost:720000}]}
  ];

  const names = ['Nguyễn Minh Anh','Trần Hoàng Nam','Lê Thu Hà','Phạm Quốc Bảo','Võ Ngọc Linh','Đặng Hải Đăng','Bùi Thanh Trúc','Đỗ Đức Huy','Ngô Khánh Vy','Hoàng Tuấn Kiệt','Phan Bảo Ngọc','Vũ Quang Minh','Mai Thảo Nguyên','Lý Anh Khoa','Dương Phương Thảo','Trịnh Gia Hân','Đinh Minh Đức','Hồ Nhật Linh','Lâm Thành Đạt','Tạ Quỳnh Chi','Cao Hải Yến','Đoàn Hữu Phúc','Nguyễn Kim Ngân','Trần Hoài An','Lê Bảo Châu','Phạm Tiến Dũng','Võ Yến Nhi','Bùi Anh Tú','Đặng Mỹ Duyên','Ngô Gia Bảo','Hoàng Diệu Linh','Phan Anh Quân','Vũ Thanh Tâm','Mai Quốc Hưng','Hồ Thùy Dương','Lâm Đức Anh'];
  
  const customers = names.map((name, i) => ({
    id:`kh-${String(i+1).padStart(3,'0')}`, name, email:`khach${i+1}@example.com`,
    phone:`09•• ••• ${String(100+i)}`, source:['Messenger','Zalo','Website','Giới thiệu'][i%4],
    emailConsent:i%9 === 0 ? 'opted_out' : i%7 === 0 ? 'unknown' : 'opted_in',
    consentSource:'Dữ liệu minh họa', consentUpdatedAt:'2026-09-01',
    notes:i===0 ? 'Ưu tiên liên hệ sau 14:00. Quan tâm các gói dài hạn.' : '',
    joinedAt:addDays('2026-07-01',i*2), color:['lavender','rose','sky','mint','sand'][i%5]
  }));

  const subscriptions = [];
  const orders = [];
  const expiryOffsets = [1,2,3,4,6,7,0,-1,-3,-7,12,18,25,35,44,60,90,120];
  let sequence = 1020;
  
  customers.forEach((customer, i) => {
    const howMany = i%3===0 ? 2 : 1;
    for (let j=0; j<howMany; j++) {
      const product = products[(i+j)%products.length];
      const plan = product.plans[(i%6===0 && j===1) ? 1 : 0];
      const expiresAt = addDays(DEMO_TODAY, expiryOffsets[(i+j*4)%expiryOffsets.length]);
      const startsAt = addDays(expiresAt, -(plan.duration*30));
      const sub = {
        id:`sub-${i}-${j}`, customerId:customer.id, productId:product.id, planId:plan.id,
        startsAt, expiresAt, price:plan.price, cost:plan.cost, cancelled:false,
        remindedAt:(i%4===1 && expiryOffsets[(i+j*4)%expiryOffsets.length] <=7) ? DEMO_TODAY : null,
        note:''
      };
      subscriptions.push(sub);
      
      for (let k=0; k<(i%3)+1; k++) {
        const date = addDays(DEMO_TODAY, -(i*3+k*19)%64);
        orders.push({
          id:`DH-${++sequence}`, customerId:customer.id, productId:product.id, planId:plan.id, subscriptionId:sub.id,
          date, startsAt:k===0 ? startsAt : addDays(startsAt,-30*k), expiresAt:k===0 ? expiresAt : addDays(expiresAt,-30*k),
          price:plan.price, cost:plan.cost, payment:(i%8===0 && k===0) ? 'unpaid' : 'paid',
          status:'completed', kind:k===0 && i%3>0 ? 'renewal' : 'new', note:''
        });
      }
    }
  });

  for (let i=0; i<14; i++) {
    const sub = subscriptions[i+15], product=products.find(p=>p.id===sub.productId), plan=product.plans.find(p=>p.id===sub.planId);
    orders.push({
      id:`DH-${++sequence}`, customerId:sub.customerId, productId:sub.productId, planId:sub.planId,
      subscriptionId:sub.id, date:addDays(DEMO_TODAY,-(i%6)), startsAt:sub.startsAt, expiresAt:sub.expiresAt,
      price:plan.price, cost:plan.cost, payment:i===11 ? 'unpaid' : 'paid', status:'completed',
      kind:i%3===0 ? 'new' : 'renewal', note:''
    });
  }

  orders.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  const refundableExamples = orders.filter(o=>o.payment==='paid').slice(0,2);
  const refunds = refundableExamples.map((o,i)=>({
    id:`ht-demo-${i+1}`, operationId:`demo-refund-${i+1}`, orderId:o.id,
    amount:i===0?Math.min(100000,o.price):o.price, costRecovered:0,
    date:DEMO_TODAY, reason:i===0?'Hoàn một phần theo thỏa thuận (dữ liệu mẫu).':'Hoàn toàn bộ; chưa thu hồi giá vốn (dữ liệu mẫu).'
  }));

  const campaigns = [
    {id:'cp-1', title:'Tháng mới, ưu đãi mới', subject:'Ưu đãi dành riêng cho bạn trong tháng 10', segment:'active',
      content:'Chào bạn, tháng này chúng tôi có chương trình ưu đãi cho khách hàng hiện tại.', channel:'email', status:'draft'},
    {id:'cp-2', title:'Chào mừng bạn quay lại', subject:'Chúng tôi có một ưu đãi dành cho bạn', segment:'expired',
      content:'Chào bạn, bạn đang cần sử dụng lại công cụ AI? Hãy liên hệ nhận ưu đãi.', channel:'email', status:'draft'}
  ];

  const activity = [
    {id:'a1',type:'payment',title:'Đã ghi nhận thanh toán',description:`${customers[15].name} · 450.000 ₫`,at:'2026-10-06T08:42:00+07:00'},
    {id:'a2',type:'renewal',title:'Một gói đã được gia hạn',description:`${customers[16].name} · Claude`,at:'2026-10-06T08:30:00+07:00'},
    {id:'a3',type:'reminder',title:'Đã ghi nhận liên hệ',description:`${customers[1].name} · Gemini`,at:'2026-10-06T08:15:00+07:00'},
    {id:'a4',type:'created',title:'Đã tạo đơn hàng mới',description:`${customers[8].name} · ${orders[0].id}`,at:'2026-10-06T08:02:00+07:00'}
  ];

  return { products, customers, subscriptions, orders, refunds, campaigns, activity };
}

async function seedDatabase() {
  console.log('🔄 Đang kết nối tới Supabase PostgreSQL để nạp dữ liệu mẫu...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const data = getSeedData();

    // 1. Products & Plans
    console.log('📦 Đang nạp sản phẩm và gói...');
    for (const p of data.products) {
      await client.query(`
        INSERT INTO public.products (id, name, category, color, symbol, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category;
      `, [p.id, p.name, p.category, p.color, p.symbol, p.description]);

      for (const pl of p.plans) {
        await client.query(`
          INSERT INTO public.product_plans (id, product_id, name, duration, unit, price, cost)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, cost = EXCLUDED.cost;
        `, [pl.id, p.id, pl.name, pl.duration, pl.unit, pl.price, pl.cost]);
      }
    }

    // 2. Customers
    console.log(`👥 Đang nạp ${data.customers.length} khách hàng...`);
    for (const c of data.customers) {
      await client.query(`
        INSERT INTO public.customers (id, name, email, phone, source, email_consent, consent_source, consent_updated_at, notes, color, joined_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING;
      `, [c.id, c.name, c.email, c.phone, c.source, c.emailConsent, c.consentSource, c.consentUpdatedAt, c.notes, c.color, c.joinedAt]);
    }

    // 3. Subscriptions
    console.log(`📑 Đang nạp ${data.subscriptions.length} gói dịch vụ...`);
    for (const s of data.subscriptions) {
      await client.query(`
        INSERT INTO public.subscriptions (id, customer_id, product_id, plan_id, starts_at, expires_at, price, cost, cancelled, reminded_at, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING;
      `, [s.id, s.customerId, s.productId, s.planId, s.startsAt, s.expiresAt, s.price, s.cost, s.cancelled, s.remindedAt, s.note]);
    }

    // 4. Orders
    console.log(`🛒 Đang nạp ${data.orders.length} đơn hàng...`);
    for (const o of data.orders) {
      await client.query(`
        INSERT INTO public.orders (id, customer_id, product_id, plan_id, subscription_id, date, starts_at, expires_at, price, cost, payment, status, kind, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING;
      `, [o.id, o.customerId, o.productId, o.planId, o.subscriptionId, o.date, o.startsAt, o.expiresAt, o.price, o.cost, o.payment, o.status, o.kind, o.note]);
    }

    // 5. Refunds
    console.log(`💸 Đang nạp ${data.refunds.length} bản ghi hoàn tiền...`);
    for (const r of data.refunds) {
      await client.query(`
        INSERT INTO public.refunds (id, operation_id, order_id, amount, cost_recovered, date, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING;
      `, [r.id, r.operationId, r.orderId, r.amount, r.costRecovered, r.date, r.reason]);
    }

    // 6. Campaigns
    console.log(`📣 Đang nạp ${data.campaigns.length} chiến dịch...`);
    for (const cp of data.campaigns) {
      await client.query(`
        INSERT INTO public.campaigns (id, title, segment, subject, content, channel, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING;
      `, [cp.id, cp.title, cp.segment, cp.subject, cp.content, cp.channel, cp.status]);
    }

    // 7. Activity Logs
    console.log(`🔔 Đang nạp ${data.activity.length} nhật ký hoạt động...`);
    for (const a of data.activity) {
      await client.query(`
        INSERT INTO public.activity_logs (id, type, title, description, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING;
      `, [a.id, a.type, a.title, a.description, a.at]);
    }

    console.log('\n✨ Nạp toàn bộ dữ liệu mẫu vào Supabase thành công!');

    // In thống kê cuối cùng
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM public.products) as products,
        (SELECT COUNT(*) FROM public.product_plans) as plans,
        (SELECT COUNT(*) FROM public.customers) as customers,
        (SELECT COUNT(*) FROM public.subscriptions) as subscriptions,
        (SELECT COUNT(*) FROM public.orders) as orders,
        (SELECT COUNT(*) FROM public.refunds) as refunds,
        (SELECT COUNT(*) FROM public.campaigns) as campaigns,
        (SELECT COUNT(*) FROM public.activity_logs) as activity;
    `);
    console.log('📈 Thống kê dữ liệu hiện có trong Supabase:');
    console.table(summary.rows[0]);

    await client.end();
  } catch (err) {
    console.error('❌ Lỗi khi nạp dữ liệu:', err);
    try { await client.end(); } catch (_) {}
    process.exit(1);
  }
}

seedDatabase();
