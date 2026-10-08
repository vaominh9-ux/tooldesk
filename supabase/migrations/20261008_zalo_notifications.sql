BEGIN;
CREATE TABLE IF NOT EXISTS zalo_bot_settings (
  id TEXT PRIMARY KEY CHECK (id='default'),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  expiring BOOLEAN NOT NULL DEFAULT TRUE,
  expired BOOLEAN NOT NULL DEFAULT TRUE,
  care BOOLEAN NOT NULL DEFAULT TRUE,
  send_hour INTEGER NOT NULL DEFAULT 9 CHECK (send_hour BETWEEN 0 AND 23),
  chat_id TEXT,
  recipient_name TEXT,
  pairing_hash TEXT,
  pairing_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT enabled OR chat_id IS NOT NULL),
  CHECK ((pairing_hash IS NULL) = (pairing_expires_at IS NULL))
);
INSERT INTO zalo_bot_settings(id) VALUES ('default') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS zalo_notification_jobs (
  id UUID PRIMARY KEY,
  event_key TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','unknown','cancelled')),
  attempted_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  provider_message_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_key,chat_id)
);
CREATE INDEX IF NOT EXISTS zalo_notification_jobs_pending_idx ON zalo_notification_jobs(created_at) WHERE status='pending';
CREATE TABLE IF NOT EXISTS zalo_notification_runs (
  id UUID PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','attention','failed')),
  sent_count INTEGER NOT NULL DEFAULT 0,
  cancelled_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  unknown_count INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE zalo_bot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zalo_notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE zalo_notification_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON zalo_bot_settings,zalo_notification_jobs,zalo_notification_runs FROM anon,authenticated;
COMMIT;
