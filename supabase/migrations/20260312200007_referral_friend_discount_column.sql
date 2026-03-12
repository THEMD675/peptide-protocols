-- Add missing column for tracking referral friend discount application
-- stripe-webhook references this to avoid applying the 40% friend discount twice

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS referral_friend_discount_applied boolean DEFAULT false;

COMMENT ON COLUMN subscriptions.referral_friend_discount_applied
IS 'Set to true after the 40% referral friend discount is applied to the 2nd invoice, preventing duplicate application';
