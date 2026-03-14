-- Add pre_suspend_status column to subscriptions table
-- Used by admin suspend/unsuspend to remember the user's status before suspension
-- so it can be restored on unsuspend

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS pre_suspend_status text DEFAULT NULL;

COMMENT ON COLUMN subscriptions.pre_suspend_status IS 'Stores the subscription status before admin suspension, so unsuspend can restore it';
