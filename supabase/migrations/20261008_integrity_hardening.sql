BEGIN;
-- Repairs installations where the foundation columns exist but their safeguards
-- were not applied. Existing rows are preserved; checks enforce new writes.
DO $$
DECLARE rule RECORD;
BEGIN
  FOR rule IN SELECT * FROM (VALUES
    ('orders','orders_money_valid','price>=0 AND cost>=0 AND price<=9007199254740991 AND cost<=9007199254740991'),
    ('orders','orders_state_valid','payment IN (''paid'',''unpaid'') AND status IN (''completed'',''cancelled'') AND kind IN (''new'',''renewal'') AND expires_at>starts_at'),
    ('refunds','refunds_money_valid','amount>=0 AND cost_recovered>=0 AND (amount>0 OR cost_recovered>0) AND amount<=9007199254740991 AND cost_recovered<=9007199254740991'),
    ('refunds','refunds_action_valid','service_action IN (''keep'',''end'')'),
    ('product_plans','plans_valid','duration>0 AND unit IN (''months'',''days'') AND price>=0 AND cost>=0'),
    ('product_plans','plans_safe_money','price<=9007199254740991 AND cost<=9007199254740991'),
    ('subscriptions','subscriptions_valid','expires_at>starts_at AND price>=0 AND cost>=0'),
    ('subscriptions','subscriptions_safe_money','price<=9007199254740991 AND cost<=9007199254740991'),
    ('customers','consent_valid','email_consent IN (''unknown'',''opted_in'',''opted_out'')'),
    ('settings','settings_valid','reminder_days BETWEEN 1 AND 90 AND currency=''VND'' AND timezone=''Asia/Ho_Chi_Minh''')
  ) AS rules(table_name,constraint_name,expression)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=format('public.%I',rule.table_name)::regclass AND conname=rule.constraint_name) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID',rule.table_name,rule.constraint_name,rule.expression);
    END IF;
  END LOOP;
END $$;

-- Fail explicitly if legacy duplicates appear before deployment; never merge
-- or delete customer history automatically. Blank email remains permitted.
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_normalized_email
ON public.customers (lower(trim(email)))
WHERE trim(COALESCE(email,''))<>'';
CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_operation_id
ON public.refunds(operation_id) WHERE operation_id IS NOT NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY(customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;
ALTER TABLE public.refunds DROP CONSTRAINT IF EXISTS refunds_order_id_fkey;
ALTER TABLE public.refunds ADD CONSTRAINT refunds_order_id_fkey FOREIGN KEY(order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_customer_id_fkey;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_customer_id_fkey FOREIGN KEY(customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;

-- Application access is through authenticated server routes, not browser SDKs.
DO $$ DECLARE tbl TEXT; BEGIN
  FOREACH tbl IN ARRAY ARRAY['settings','products','product_plans','customers','subscriptions','orders','refunds','campaigns','activity_logs','app_users','command_idempotency','email_outbox'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access for anon" ON public.%I',tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',tbl);
  END LOOP;
END $$;
COMMIT;
