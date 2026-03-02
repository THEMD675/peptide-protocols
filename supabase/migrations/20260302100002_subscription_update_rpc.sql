-- update_subscription_with_lock: atomic subscription update with row locking
-- Prevents race conditions when concurrent Stripe webhooks target same subscription

CREATE OR REPLACE FUNCTION public.update_subscription_by_stripe_id(
  p_stripe_subscription_id text,
  p_status text DEFAULT NULL,
  p_tier text DEFAULT NULL,
  p_current_period_end timestamptz DEFAULT NULL,
  p_trial_ends_at timestamptz DEFAULT NULL,
  p_stripe_customer_id text DEFAULT NULL
)
RETURNS TABLE(id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Lock row, update, return id
  UPDATE subscriptions
  SET
    status = COALESCE(p_status, status),
    tier = COALESCE(p_tier, tier),
    current_period_end = COALESCE(p_current_period_end, current_period_end),
    trial_ends_at = COALESCE(p_trial_ends_at, trial_ends_at),
    stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
    updated_at = now()
  WHERE stripe_subscription_id = p_stripe_subscription_id
  RETURNING subscriptions.id INTO v_id;

  id := v_id;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_subscription_by_stripe_id(text, text, text, timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_subscription_by_stripe_id(text, text, text, timestamptz, timestamptz, text) TO service_role;

COMMENT ON FUNCTION public.update_subscription_by_stripe_id IS 'Atomic subscription update with implicit row locking. Use from stripe-webhook to prevent concurrent event races.';
