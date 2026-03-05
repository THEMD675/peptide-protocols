-- Add grant_source column to track admin-comped subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS grant_source text;
COMMENT ON COLUMN subscriptions.grant_source IS 'Tracks admin-granted (comped) subscriptions. Format: admin_comp:<admin_email>:<timestamp>';
