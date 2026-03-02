-- Fix: COALESCE prevented setting fields to NULL (e.g., clearing trial_ends_at)
-- Now uses CASE to distinguish "not provided" (NULL default) from "explicitly set to NULL" via sentinel

CREATE OR REPLACE FUNCTION public.update_subscription_by_stripe_id(
  p_stripe_subscription_id text,
  p_status text DEFAULT '__KEEP__',
  p_tier text DEFAULT '__KEEP__',
  p_current_period_end timestamptz DEFAULT '1970-01-01'::timestamptz,
  p_trial_ends_at timestamptz DEFAULT '1970-01-01'::timestamptz,
  p_stripe_customer_id text DEFAULT '__KEEP__'
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
    status = CASE WHEN p_status = '__KEEP__' THEN status ELSE p_status END,
    tier = CASE WHEN p_tier = '__KEEP__' THEN tier ELSE p_tier END,
    current_period_end = CASE WHEN p_current_period_end = '1970-01-01'::timestamptz THEN current_period_end ELSE p_current_period_end END,
    trial_ends_at = CASE WHEN p_trial_ends_at = '1970-01-01'::timestamptz THEN trial_ends_at ELSE p_trial_ends_at END,
    stripe_customer_id = CASE WHEN p_stripe_customer_id = '__KEEP__' THEN stripe_customer_id ELSE p_stripe_customer_id END,
    updated_at = now()
  WHERE stripe_subscription_id = p_stripe_subscription_id
  RETURNING subscriptions.id INTO v_id;

  id := v_id;
  RETURN NEXT;
END;
$$;
