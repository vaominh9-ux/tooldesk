BEGIN;
-- Apply once in a controlled environment; no seeds or data deletion.
-- Adds persistent fields used by renewal rollback and reminder workers.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS previous_subscription JSONB;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS actor TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS service_action TEXT DEFAULT 'keep';
CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_operation_id ON public.refunds(operation_id) WHERE operation_id IS NOT NULL;
ALTER TABLE public.customers ALTER COLUMN email_consent SET DEFAULT 'unknown';

-- Existing installations must create the new tables without replaying schema/seed.
CREATE TABLE IF NOT EXISTS public.app_users (
  user_id UUID PRIMARY KEY, email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','staff','viewer')),
  active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.command_idempotency (
  operation_id UUID PRIMARY KEY, command_type TEXT NOT NULL, result_id TEXT,
  actor_user_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.command_idempotency ADD COLUMN IF NOT EXISTS request_hash TEXT;
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id UUID PRIMARY KEY, subscription_id TEXT NOT NULL REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
  cycle_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending','sending','sent','retry','failed','cancelled','unknown')),
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts>=0), recipient TEXT, provider_message_id TEXT, last_error TEXT,
  attempted_at TIMESTAMPTZ, sent_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_outbox_due ON public.email_outbox(status,next_attempt_at);

-- Existing invalid records are not silently modified. NOT VALID constraints
-- enforce new writes; audit legacy rows before VALIDATE CONSTRAINT.
ALTER TABLE public.orders ADD CONSTRAINT orders_money_valid CHECK (price>=0 AND cost>=0 AND price<=9007199254740991 AND cost<=9007199254740991) NOT VALID;
ALTER TABLE public.orders ADD CONSTRAINT orders_state_valid CHECK (payment IN ('paid','unpaid') AND status IN ('completed','cancelled') AND kind IN ('new','renewal') AND expires_at>starts_at) NOT VALID;
ALTER TABLE public.refunds ADD CONSTRAINT refunds_money_valid CHECK (amount>=0 AND cost_recovered>=0 AND (amount>0 OR cost_recovered>0) AND amount<=9007199254740991 AND cost_recovered<=9007199254740991) NOT VALID;
ALTER TABLE public.refunds ADD CONSTRAINT refunds_action_valid CHECK (service_action IN ('keep','end')) NOT VALID;
ALTER TABLE public.product_plans ADD CONSTRAINT plans_valid CHECK (duration>0 AND unit IN ('months','days') AND price>=0 AND cost>=0) NOT VALID;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_valid CHECK (expires_at>starts_at AND price>=0 AND cost>=0) NOT VALID;
ALTER TABLE public.customers ADD CONSTRAINT consent_valid CHECK (email_consent IN ('unknown','opted_in','opted_out')) NOT VALID;
ALTER TABLE public.settings ADD CONSTRAINT settings_valid CHECK (reminder_days BETWEEN 1 AND 90 AND currency='VND' AND timezone='Asia/Ho_Chi_Minh') NOT VALID;

-- Preserve financial history on delete rather than cascading it away.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;
ALTER TABLE public.refunds DROP CONSTRAINT IF EXISTS refunds_order_id_fkey;
ALTER TABLE public.refunds ADD CONSTRAINT refunds_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;

DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['settings','products','product_plans','customers','subscriptions','orders','refunds','campaigns','activity_logs','app_users','command_idempotency','email_outbox'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access for anon" ON public.%I',tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',tbl);
  END LOOP;
END $$;
COMMIT;
