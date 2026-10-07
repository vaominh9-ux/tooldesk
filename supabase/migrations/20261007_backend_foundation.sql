-- Apply after supabase/schema.sql in a controlled environment.
-- Adds persistent fields used by renewal rollback and reminder workers.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS previous_subscription JSONB;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS actor TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS service_action TEXT DEFAULT 'keep';
CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_operation_id ON public.refunds(operation_id) WHERE operation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminder_deliveries_status ON public.reminder_deliveries(status, created_at);
ALTER TABLE public.command_idempotency ADD COLUMN IF NOT EXISTS request_hash TEXT;
