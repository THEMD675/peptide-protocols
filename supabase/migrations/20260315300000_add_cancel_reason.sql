-- Add cancel_reason column to subscriptions for cancellation feedback
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_reason text;
