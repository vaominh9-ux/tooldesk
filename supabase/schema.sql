-- ========================================================
-- TOOLDESK SUPABASE DATABASE SCHEMA
-- Project: Quản lý kinh doanh tool AI
-- Owner: vaominh9@gmail.com
-- ========================================================

-- 1. Bảng Cài đặt hệ thống (Settings)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    shop_name TEXT NOT NULL DEFAULT 'Tooldesk',
    owner_name TEXT NOT NULL DEFAULT 'Minh',
    reminder_days INT NOT NULL DEFAULT 7,
    currency TEXT NOT NULL DEFAULT 'VND',
    timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 2. Bảng Sản phẩm (Products: ChatGPT, Claude, Gemini, Canva...)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Trợ lý AI',
    color TEXT DEFAULT 'mint',
    symbol TEXT DEFAULT '◈',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 3. Bảng Gói sản phẩm (Product Plans: 1 tháng, 3 tháng, 1 năm...)
CREATE TABLE IF NOT EXISTS public.product_plans (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration INT NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'months', -- 'months' hoặc 'days'
    price BIGINT NOT NULL DEFAULT 0,
    cost BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 4. Bảng Khách hàng (Customers)
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT DEFAULT 'Zalo',
    email_consent TEXT DEFAULT 'opted_in', -- 'opted_in', 'opted_out', 'unknown'
    consent_source TEXT DEFAULT 'Đăng ký dịch vụ',
    consent_updated_at DATE DEFAULT CURRENT_DATE,
    notes TEXT DEFAULT '',
    color TEXT DEFAULT 'sky',
    joined_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 5. Bảng Gói dịch vụ / Đăng ký gia hạn (Subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    plan_id TEXT NOT NULL REFERENCES public.product_plans(id) ON DELETE RESTRICT,
    starts_at DATE NOT NULL,
    expires_at DATE NOT NULL,
    price BIGINT NOT NULL DEFAULT 0,
    cost BIGINT NOT NULL DEFAULT 0,
    cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    reminded_at DATE,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 6. Bảng Đơn hàng (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    plan_id TEXT NOT NULL REFERENCES public.product_plans(id) ON DELETE RESTRICT,
    subscription_id TEXT REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    starts_at DATE NOT NULL,
    expires_at DATE NOT NULL,
    price BIGINT NOT NULL DEFAULT 0,
    cost BIGINT NOT NULL DEFAULT 0,
    payment TEXT NOT NULL DEFAULT 'paid', -- 'paid' hoặc 'unpaid'
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'cancelled'
    kind TEXT NOT NULL DEFAULT 'new', -- 'new' hoặc 'renewal'
    paid_at DATE,
    paid_at_estimated BOOLEAN DEFAULT FALSE,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 7. Bảng Hoàn tiền (Refunds)
CREATE TABLE IF NOT EXISTS public.refunds (
    id TEXT PRIMARY KEY,
    operation_id TEXT,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL DEFAULT 0,
    cost_recovered BIGINT NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 8. Bảng Chiến dịch chăm sóc / Email / Zalo (Campaigns)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    segment TEXT NOT NULL DEFAULT 'all',
    subject TEXT,
    content TEXT,
    channel TEXT NOT NULL DEFAULT 'email',
    status TEXT NOT NULL DEFAULT 'draft',
    sent_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 9. Bảng Nhật ký hoạt động (Activity Logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    description TEXT,
    actor TEXT DEFAULT 'Minh',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- Authentication, reminder delivery and transactional command idempotency.
CREATE TABLE IF NOT EXISTS public.app_users (
    user_id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff','viewer')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.reminder_deliveries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
    reminder_date DATE NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('claimed','sent','skipped','failed')),
    provider_message_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subscription_id, reminder_date)
);
CREATE TABLE IF NOT EXISTS public.command_idempotency (
    operation_id UUID PRIMARY KEY,
    command_type TEXT NOT NULL,
    result_id TEXT,
    actor_user_id UUID,
    request_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- INDEXES & PERFORMANCE OPTIMIZATIONS
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(date);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Cho phép truy cập dữ liệu thông qua anon/authenticated key
-- ========================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_idempotency ENABLE ROW LEVEL SECURITY;

-- Mẫu RLS Policy cho phép đọc/ghi công khai (có thể tùy chỉnh lại theo User ID khi tích hợp Auth)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow full access for anon" ON public.%I', tbl);
    END LOOP;
END $$;

-- API uses the server-side DB connection after Supabase Auth and app_users checks.
-- No anonymous table-wide policy is created.

-- Khởi tạo cài đặt ban đầu
INSERT INTO public.settings (id, shop_name, owner_name, reminder_days, currency, timezone)
VALUES ('default', 'Tooldesk', 'Minh', 7, 'VND', 'Asia/Ho_Chi_Minh')
ON CONFLICT (id) DO NOTHING;
