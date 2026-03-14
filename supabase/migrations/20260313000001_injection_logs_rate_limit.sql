-- Add rate limit for injection_logs: max 20 inserts per hour per user
-- Prevents spam/bot abuse via DevTools while allowing legitimate logging

-- Update the generic rate-limit function to include injection_logs
CREATE OR REPLACE FUNCTION check_insert_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
  max_per_window INT;
  window_interval INTERVAL;
BEGIN
  -- Per-table config
  IF TG_TABLE_NAME = 'enquiries' THEN
    max_per_window := 5;
    window_interval := INTERVAL '1 hour';
  ELSIF TG_TABLE_NAME = 'community_logs' THEN
    max_per_window := 3;
    window_interval := INTERVAL '1 hour';
  ELSIF TG_TABLE_NAME = 'community_replies' THEN
    max_per_window := 20;
    window_interval := INTERVAL '1 hour';
  ELSIF TG_TABLE_NAME = 'injection_logs' THEN
    max_per_window := 20;
    window_interval := INTERVAL '1 hour';
  ELSE
    RETURN NEW; -- no limit for unknown tables
  END IF;

  -- For enquiries, rate-limit by email (works for anon users too)
  IF TG_TABLE_NAME = 'enquiries' THEN
    SELECT COUNT(*) INTO recent_count
    FROM enquiries
    WHERE email = NEW.email
      AND created_at > NOW() - window_interval;
  ELSE
    -- For all other tables, rate-limit by user_id
    IF NEW.user_id IS NULL THEN
      RETURN NEW;
    END IF;

    EXECUTE format(
      'SELECT COUNT(*) FROM %I WHERE user_id = $1 AND created_at > NOW() - $2',
      TG_TABLE_NAME
    ) INTO recent_count USING NEW.user_id, window_interval;
  END IF;

  IF recent_count >= max_per_window THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum % per %', max_per_window, window_interval
      USING ERRCODE = 'P0429';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to injection_logs
DROP TRIGGER IF EXISTS trg_injection_logs_rate_limit ON injection_logs;
CREATE TRIGGER trg_injection_logs_rate_limit
  BEFORE INSERT ON injection_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_insert_rate_limit();
