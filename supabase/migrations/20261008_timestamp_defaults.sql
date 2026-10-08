BEGIN;
-- TIMESTAMPTZ stores an instant. Converting NOW() to a local timestamp first
-- makes the session reinterpret it and can add seven hours on a UTC server.
-- Fix only defaults; historical timestamps are not rewritten without evidence.
ALTER TABLE public.settings ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE public.products ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.product_plans ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.customers ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.subscriptions ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.orders ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.refunds ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.campaigns ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.activity_logs ALTER COLUMN created_at SET DEFAULT NOW();
COMMIT;
