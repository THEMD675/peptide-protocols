-- Atomic rate-limit check-and-insert RPC
-- Replaces the non-atomic count-then-insert pattern in _shared/rate-limit.ts
-- Uses advisory lock + single transaction to prevent race-condition bypass.
--
-- Returns TRUE if the request is allowed (recorded), FALSE if rate-limited.

CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
  p_endpoint   TEXT,
  p_user_id    UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_window_sec INT  DEFAULT 60,
  p_max_req    INT  DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count        INT;
  v_lock_key     BIGINT;
BEGIN
  -- Require exactly one identifier
  IF p_user_id IS NULL AND p_ip_address IS NULL THEN
    RAISE EXCEPTION 'check_and_record_rate_limit: must supply p_user_id or p_ip_address';
  END IF;

  v_window_start := NOW() - (p_window_sec || ' seconds')::INTERVAL;

  -- Derive a deterministic advisory lock key from (endpoint, identifier)
  -- so concurrent requests for the same (endpoint, user) queue up.
  v_lock_key := hashtext(
    p_endpoint ||
    COALESCE(p_user_id::TEXT, p_ip_address)
  )::BIGINT;

  -- Session-level advisory lock (auto-released at end of this function call
  -- because we use pg_advisory_xact_lock which is transaction-scoped).
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Count existing requests in window
  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.rate_limits
    WHERE endpoint   = p_endpoint
      AND user_id    = p_user_id
      AND created_at >= v_window_start;
  ELSE
    SELECT COUNT(*) INTO v_count
    FROM public.rate_limits
    WHERE endpoint    = p_endpoint
      AND ip_address  = p_ip_address
      AND created_at  >= v_window_start;
  END IF;

  IF v_count >= p_max_req THEN
    RETURN FALSE;  -- rate limited
  END IF;

  -- Record this request
  INSERT INTO public.rate_limits (endpoint, user_id, ip_address)
  VALUES (p_endpoint, p_user_id, p_ip_address);

  RETURN TRUE;  -- allowed
END;
$$;

-- Grant execute to the service role (used by edge functions)
GRANT EXECUTE ON FUNCTION public.check_and_record_rate_limit(TEXT, UUID, TEXT, INT, INT)
  TO service_role;

COMMENT ON FUNCTION public.check_and_record_rate_limit IS
  'Atomic rate-limit check and record. Uses transaction-scoped advisory lock to prevent concurrent request bypass. Returns TRUE if allowed.';
