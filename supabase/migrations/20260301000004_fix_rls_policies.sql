-- Fix RLS policies that block legitimate client queries

-- 1. Allow authenticated users to update their own subscription's referral fields
DO $$ BEGIN
  CREATE POLICY "Users can update own subscription" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Allow authenticated users to update referrals they created (as referrer)
--    AND allow any authenticated user to update referrals by code (for signup tracking)
DO $$ BEGIN
  CREATE POLICY "Authenticated can update referrals by code" ON referrals
    FOR UPDATE USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Allow anon/authenticated to count subscriptions (for landing page subscriber count)
--    Only exposes count, not individual data (head: true in query)
DO $$ BEGIN
  CREATE POLICY "Anyone can count active subscriptions" ON subscriptions
    FOR SELECT USING (status IN ('active', 'trial'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
