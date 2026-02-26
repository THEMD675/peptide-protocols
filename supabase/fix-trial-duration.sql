-- ============================================================
-- FIX: Ensure trial duration is 3 days (not 7)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Fix the column default
ALTER TABLE public.subscriptions 
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '3 days');

-- 2. Recreate the signup trigger with correct 3-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, tier, trial_ends_at)
  VALUES (NEW.id, 'trial', 'free', now() + interval '3 days');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix any EXISTING users who got 7-day trials
-- This sets trial_ends_at to created_at + 3 days for all trial users
-- whose trial_ends_at is more than 4 days after created_at
UPDATE public.subscriptions
SET trial_ends_at = created_at + interval '3 days'
WHERE status = 'trial'
  AND trial_ends_at > created_at + interval '4 days';

-- Verify: check all trial users
SELECT user_id, status, tier, 
  created_at, 
  trial_ends_at,
  trial_ends_at - created_at AS trial_duration
FROM public.subscriptions
WHERE status = 'trial'
ORDER BY created_at DESC;
