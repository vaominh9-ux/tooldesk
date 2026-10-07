BEGIN;
CREATE TABLE IF NOT EXISTS public.smtp_configuration (
  id TEXT PRIMARY KEY CHECK (id='default'),
  encrypted_config TEXT NOT NULL,
  updated_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.smtp_configuration ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.smtp_configuration FROM anon, authenticated;
COMMIT;
