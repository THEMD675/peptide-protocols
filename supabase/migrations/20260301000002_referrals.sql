-- Referral system
CREATE TABLE IF NOT EXISTS referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_id uuid,
  referral_code text NOT NULL UNIQUE,
  referred_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'subscribed')),
  reward_given boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  converted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);

-- Each user gets a referral code stored in their profile
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS referred_by text;

-- RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (referrer_id = auth.uid());

CREATE POLICY "Users can insert referrals" ON referrals
  FOR INSERT WITH CHECK (referrer_id = auth.uid());
