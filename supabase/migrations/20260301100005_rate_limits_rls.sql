-- Explicit RLS policy for rate_limits table (default deny).
-- The table is used only by service role / edge functions;
-- no client access is intended. This makes the deny explicit.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_deny_all" ON rate_limits;
CREATE POLICY "rate_limits_deny_all"
  ON rate_limits
  FOR ALL
  USING (false)
  WITH CHECK (false);
