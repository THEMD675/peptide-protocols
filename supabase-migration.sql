-- ============================================================
-- Peptide Protocols – Supabase Migration
-- Run this file in the Supabase SQL Editor (Dashboard → SQL)
-- ============================================================

-- 1. Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'premium', 'essentials', 'elite')),
  trial_ends_at timestamptz DEFAULT (now() + interval '3 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- 2. Email list table
CREATE TABLE IF NOT EXISTS public.email_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  source text DEFAULT 'landing',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert email" ON public.email_list
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role reads emails" ON public.email_list
  FOR SELECT USING (auth.role() = 'service_role');

-- 3. Auto-create subscription row on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, tier, trial_ends_at)
  VALUES (NEW.id, 'trial', 'free', now() + interval '3 days');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. Referral system tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  referral_code text NOT NULL UNIQUE,
  referred_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referral" ON public.referrals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages referrals" ON public.referrals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can insert referral on signup" ON public.referrals
  FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code text NOT NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_type text NOT NULL DEFAULT 'free_month' CHECK (reward_type IN ('free_month', 'discount')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own rewards" ON public.referral_rewards
  FOR SELECT USING (
    referrer_code IN (SELECT referral_code FROM public.referrals WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role manages rewards" ON public.referral_rewards
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can insert reward on signup" ON public.referral_rewards
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- 5. Community logs table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.community_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  peptide_name text NOT NULL,
  goal text,
  protocol text,
  duration_weeks integer DEFAULT 4,
  results text NOT NULL,
  rating integer DEFAULT 4 CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.community_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community logs" ON public.community_logs
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users insert own logs" ON public.community_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own logs" ON public.community_logs
  FOR DELETE USING (auth.uid() = user_id);
