-- Referral rewards: add promotion code tracking and expand notification types
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_code text;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS stripe_promotion_code_id text;

-- Allow 'referral' as a notification type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('blog', 'streak', 'trial', 'achievement', 'referral'));
