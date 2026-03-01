-- Rate limiting table for all edge functions
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  ip_address text,
  endpoint text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(endpoint, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(endpoint, ip_address, created_at DESC);

-- Auto-cleanup: delete entries older than 1 hour
-- (run as a cron job or Supabase scheduled function)

-- RLS: service role only
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
