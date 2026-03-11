-- Add email notification preference columns to user_profiles
-- These are checked server-side by edge functions before sending emails.
-- Defaults to true so existing users continue receiving emails.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS product_updates_enabled boolean NOT NULL DEFAULT true;

-- Allow users to update their own notification preferences
-- (RLS policies already allow users to update their own row via user_id match)
COMMENT ON COLUMN user_profiles.email_notifications_enabled IS 'User preference: receive transactional/reminder emails';
COMMENT ON COLUMN user_profiles.product_updates_enabled IS 'User preference: receive product update/marketing emails';
