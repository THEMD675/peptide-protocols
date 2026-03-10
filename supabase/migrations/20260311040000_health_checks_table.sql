-- Health checks uptime tracking table
CREATE TABLE IF NOT EXISTS health_checks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  response_time_ms integer NOT NULL,
  checks jsonb,
  checked_at timestamptz DEFAULT now() NOT NULL
);

-- Index for time-range queries (uptime dashboard)
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON health_checks (checked_at DESC);

-- Auto-cleanup: keep only 30 days of history
-- Run via pg_cron or manual cleanup
COMMENT ON TABLE health_checks IS 'Uptime monitoring history — auto-pruned to 30 days';
