-- Add missing referral columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS referred_by text;

-- Add unique constraint on referral_code (ignore if exists)
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_referral_code ON subscriptions(referral_code) WHERE referral_code IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
