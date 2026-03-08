-- Fix subscription status constraint to match actual data
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'canceled', 'cancelled', 'past_due', 'trialing', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', 'trial', 'none', 'free'));
