-- Add billing_interval column to subscriptions for accurate MRR calculation
-- Values: 'month' or 'year' (from Stripe price interval)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT 'month';

-- Update existing subscriptions based on the 60-day heuristic (best we can do retroactively)
-- Annual subs have period_end > 60 days from created_at
UPDATE subscriptions
SET billing_interval = 'year'
WHERE current_period_end IS NOT NULL
  AND created_at IS NOT NULL
  AND EXTRACT(EPOCH FROM (current_period_end - created_at)) > (60 * 86400);

-- Also update the RPC to accept billing_interval
CREATE OR REPLACE FUNCTION upsert_subscription(
  p_user_id uuid,
  p_status text DEFAULT NULL,
  p_tier text DEFAULT NULL,
  p_stripe_customer_id text DEFAULT NULL,
  p_stripe_subscription_id text DEFAULT NULL,
  p_current_period_end timestamptz DEFAULT NULL,
  p_trial_ends_at timestamptz DEFAULT NULL,
  p_grant_source text DEFAULT NULL,
  p_billing_interval text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO subscriptions (user_id, status, tier, stripe_customer_id, stripe_subscription_id, current_period_end, trial_ends_at, grant_source, billing_interval, created_at, updated_at)
  VALUES (
    p_user_id,
    COALESCE(p_status, 'none'),
    COALESCE(p_tier, 'free'),
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_current_period_end,
    p_trial_ends_at,
    p_grant_source,
    COALESCE(p_billing_interval, 'month'),
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = COALESCE(p_status, subscriptions.status),
    tier = COALESCE(p_tier, subscriptions.tier),
    stripe_customer_id = COALESCE(p_stripe_customer_id, subscriptions.stripe_customer_id),
    stripe_subscription_id = COALESCE(p_stripe_subscription_id, subscriptions.stripe_subscription_id),
    current_period_end = COALESCE(p_current_period_end, subscriptions.current_period_end),
    trial_ends_at = CASE
      WHEN p_trial_ends_at IS NULL THEN subscriptions.trial_ends_at
      ELSE p_trial_ends_at
    END,
    grant_source = COALESCE(p_grant_source, subscriptions.grant_source),
    billing_interval = COALESCE(p_billing_interval, subscriptions.billing_interval),
    updated_at = now();
END;
$$;
