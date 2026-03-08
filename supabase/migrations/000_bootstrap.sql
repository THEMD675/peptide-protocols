-- Bootstrap: Create base tables that later migrations ALTER
-- These were originally created via Supabase Dashboard, not migrations

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'none',
  tier text DEFAULT 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  grant_source text,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.injection_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peptide_name text NOT NULL,
  dose numeric,
  dose_unit text DEFAULT 'mcg',
  injection_site text,
  notes text,
  logged_at timestamptz DEFAULT now(),
  protocol_id uuid
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  rating integer NOT NULL,
  title text,
  body text,
  is_approved boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  category text,
  rating integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wellness_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  energy integer,
  sleep integer,
  pain integer,
  mood integer,
  appetite integer,
  notes text,
  logged_at timestamptz DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.side_effect_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptom text NOT NULL,
  severity integer DEFAULT 1 NOT NULL,
  peptide_id text,
  notes text,
  protocol_id uuid,
  logged_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goals jsonb,
  weight_kg numeric,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.email_list (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  source text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all base tables

-- Basic RLS policies

-- Referrals (needed by migration 20260301000002)
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid,
  referral_code text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  referred_email text,
  signed_up_at timestamptz,
  converted_at timestamptz,
  reward_granted boolean DEFAULT false NOT NULL,
  reward_days integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Lab results (needed before 20260228000004 tries to CREATE IF NOT EXISTS with different schema)
CREATE TABLE IF NOT EXISTS public.lab_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id text NOT NULL,
  value numeric,
  unit text,
  notes text,
  tested_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
