-- Fix: update_subscription_by_stripe_id — allow explicitly clearing trial_ends_at
-- COALESCE prevents clearing trial_ends_at when a trial ends and p_trial_ends_at is NULL.
-- This means after a user converts from trial → active, trial_ends_at stays set in the DB.
-- While functionally harmless (status=active takes precedence), it's misleading.
--
-- Solution: use a sentinel value or overloaded approach.
-- We use a boolean p_clear_trial to explicitly null out trial_ends_at.

CREATE OR REPLACE FUNCTION public.update_subscription_by_stripe_id(
  p_stripe_subscription_id text,
  p_status text DEFAULT NULL,
  p_tier text DEFAULT NULL,
  p_current_period_end timestamptz DEFAULT NULL,
  p_trial_ends_at timestamptz DEFAULT NULL,
  p_stripe_customer_id text DEFAULT NULL,
  p_clear_trial boolean DEFAULT false
)
RETURNS TABLE(id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE subscriptions
  SET
    status = COALESCE(p_status, status),
    tier = COALESCE(p_tier, tier),
    current_period_end = COALESCE(p_current_period_end, current_period_end),
    -- If p_clear_trial is true, set trial_ends_at to NULL explicitly.
    -- Otherwise use COALESCE to keep existing value when p_trial_ends_at is NULL.
    trial_ends_at = CASE
      WHEN p_clear_trial = true THEN NULL
      ELSE COALESCE(p_trial_ends_at, trial_ends_at)
    END,
    stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
    updated_at = now()
  WHERE stripe_subscription_id = p_stripe_subscription_id
  RETURNING subscriptions.id INTO v_id;

  id := v_id;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_subscription_by_stripe_id(text, text, text, timestamptz, timestamptz, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_subscription_by_stripe_id(text, text, text, timestamptz, timestamptz, text, boolean) TO service_role;

-- Drop the old 6-param version now that we have the 7-param one with DEFAULT false
-- (DEFAULT false means existing callers that omit p_clear_trial still work)
DROP FUNCTION IF EXISTS public.update_subscription_by_stripe_id(text, text, text, timestamptz, timestamptz, text);

COMMENT ON FUNCTION public.update_subscription_by_stripe_id(text, text, text, timestamptz, timestamptz, text, boolean) IS 'Atomic subscription update with implicit row locking. p_clear_trial=true explicitly nulls trial_ends_at (for trial→active transitions). DEFAULT false = backward compatible.';
