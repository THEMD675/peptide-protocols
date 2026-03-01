-- Referral system — fix columns on existing table
DO $$ BEGIN
  -- Add missing columns if table exists but columns don't
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_id uuid;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_id uuid;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_code text;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_email text;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_given boolean DEFAULT false;
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS converted_at timestamptz;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add unique constraint on referral_code if not exists
DO $$ BEGIN
  ALTER TABLE referrals ADD CONSTRAINT referrals_referral_code_key UNIQUE (referral_code);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- Subscription columns for referral tracking
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS referred_by text;

-- Add unique constraint on referral_code in subscriptions
DO $$ BEGIN
  ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_referral_code_key UNIQUE (referral_code);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own referrals" ON referrals
    FOR SELECT USING (referrer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert referrals" ON referrals
    FOR INSERT WITH CHECK (referrer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
