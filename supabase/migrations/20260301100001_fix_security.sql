-- Security fix: tighten subscription SELECT policy
-- Anon users should not see individual subscription rows

DROP POLICY IF EXISTS "Anyone can count active subscriptions" ON subscriptions;

CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Referral UPDATE policy fix: drop overly permissive policy
-- The replacement policy depends on actual column names in the live DB
DROP POLICY IF EXISTS "Authenticated can update referrals by code" ON referrals;

-- Restrict referral updates to service role only (safest option)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'Service role updates referrals') THEN
    CREATE POLICY "Service role updates referrals" ON referrals
      FOR UPDATE USING (
        (current_setting('request.jwt.claims', true)::json ->> 'role') = 'service_role'
      );
  END IF;
END $$;
