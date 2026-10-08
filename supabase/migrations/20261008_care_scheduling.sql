BEGIN;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS care_appointments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  channel TEXT NOT NULL CHECK (channel IN ('phone','zalo','email','other')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS care_appointments_due_idx ON care_appointments(scheduled_at) WHERE status='scheduled';
CREATE INDEX IF NOT EXISTS care_appointments_customer_idx ON care_appointments(customer_id);

CREATE TABLE IF NOT EXISTS reminder_runs (
  id UUID PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','attention','failed','waiting')),
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  cancelled_count INTEGER NOT NULL DEFAULT 0 CHECK (cancelled_count >= 0),
  unknown_count INTEGER NOT NULL DEFAULT 0 CHECK (unknown_count >= 0),
  error TEXT
);
CREATE INDEX IF NOT EXISTS reminder_runs_started_idx ON reminder_runs(started_at DESC);
ALTER TABLE care_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON care_appointments, reminder_runs FROM anon, authenticated;
COMMIT;
