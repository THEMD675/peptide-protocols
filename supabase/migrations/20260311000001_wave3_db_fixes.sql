-- Wave 3: Critical Database Fixes
-- C9: Referrals table cleanup, C10: delete_user_data, C11: Duplicate triggers
-- M19: email_list rate limiting, M20: enquiries spoofing fix
-- Applied: 2026-03-11

-- ============================================================
-- C9: Fix referrals table — remove duplicate columns, add FKs
-- ============================================================

-- Drop duplicate columns (referrer_user_id → referrer_id, referred_user_id → referred_id)
ALTER TABLE public.referrals DROP COLUMN IF EXISTS referrer_user_id;
ALTER TABLE public.referrals DROP COLUMN IF EXISTS referred_user_id;

-- Ensure referrer_id is NOT NULL
ALTER TABLE public.referrals ALTER COLUMN referrer_id SET NOT NULL;

-- Fix index: old one was on dropped referred_user_id
DROP INDEX IF EXISTS idx_referrals_referred;
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);

-- Add foreign keys
ALTER TABLE public.referrals
  ADD CONSTRAINT fk_referrals_referrer FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.referrals
  ADD CONSTRAINT fk_referrals_referred FOREIGN KEY (referred_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- C10: Fix delete_user_data() — add missing tables
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID, p_user_email TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM community_upvotes WHERE user_id = p_user_id;
  DELETE FROM community_replies WHERE user_id = p_user_id;
  DELETE FROM community_logs WHERE user_id = p_user_id;
  DELETE FROM notifications WHERE user_id = p_user_id;
  DELETE FROM user_bookmarks WHERE user_id = p_user_id;
  DELETE FROM injection_logs WHERE user_id = p_user_id;
  DELETE FROM reviews WHERE user_id = p_user_id;
  DELETE FROM reports WHERE user_id = p_user_id;
  DELETE FROM ai_coach_requests WHERE user_id = p_user_id;
  DELETE FROM sent_reminders WHERE user_id = p_user_id;
  DELETE FROM enquiries WHERE user_id = p_user_id;
  DELETE FROM rate_limits WHERE user_id = p_user_id;
  DELETE FROM email_logs WHERE user_id = p_user_id;
  DELETE FROM referrals WHERE referrer_id = p_user_id OR referred_id = p_user_id;
  DELETE FROM user_protocols WHERE user_id = p_user_id;
  DELETE FROM lab_results WHERE user_id = p_user_id;
  DELETE FROM side_effect_logs WHERE user_id = p_user_id;
  DELETE FROM wellness_logs WHERE user_id = p_user_id;
  DELETE FROM coach_conversations WHERE user_id = p_user_id;
  DELETE FROM admin_user_notes WHERE user_id = p_user_id;
  DELETE FROM abandoned_checkouts WHERE user_id = p_user_id;
  DELETE FROM subscriptions WHERE user_id = p_user_id;
  DELETE FROM user_profiles WHERE user_id = p_user_id;
  IF p_user_email IS NOT NULL AND p_user_email <> '' THEN
    DELETE FROM email_list WHERE email = p_user_email;
  END IF;
END;
$$;

-- ============================================================
-- C11: Remove duplicate auth trigger
-- ============================================================

-- handle_new_user already creates both subscription + profile
-- handle_new_user_profile was redundant (profile only, no display_name)
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();

-- ============================================================
-- M19: email_list — add rate limiting + unique constraint
-- ============================================================

DROP POLICY IF EXISTS "Anyone can insert email" ON public.email_list;

CREATE OR REPLACE FUNCTION public.check_email_list_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM email_list
      WHERE email = NEW.email
      AND created_at > NOW() - INTERVAL '1 hour') >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded: max 3 submissions per email per hour';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_list_rate_limit ON public.email_list;
CREATE TRIGGER trg_email_list_rate_limit
  BEFORE INSERT ON public.email_list
  FOR EACH ROW
  EXECUTE FUNCTION public.check_email_list_rate_limit();

CREATE POLICY "Anon can insert email with rate limit"
  ON public.email_list
  FOR INSERT
  TO anon
  WITH CHECK (true);

ALTER TABLE public.email_list DROP CONSTRAINT IF EXISTS email_list_email_key;
ALTER TABLE public.email_list ADD CONSTRAINT email_list_email_key UNIQUE (email);

-- ============================================================
-- M20: enquiries — prevent user_id spoofing
-- ============================================================

DROP POLICY IF EXISTS "open_enquiry_insert" ON public.enquiries;

CREATE POLICY "Auth users insert own enquiries"
  ON public.enquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon insert enquiries without user_id"
  ON public.enquiries
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
