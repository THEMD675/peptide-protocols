-- Add 'past_due' to the subscriptions status CHECK constraint
-- This is needed because invoice.payment_failed now sets status to 'past_due'

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trial', 'active', 'past_due', 'expired', 'cancelled'));

-- Add index for stripe_subscription_id lookups (used by webhook)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

-- Add index for stripe_customer_id lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust ON subscriptions(stripe_customer_id);
