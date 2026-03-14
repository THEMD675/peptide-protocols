-- Full Remediation Migration
-- Fixes: lab_results schema, injection_logs.photo_url, user_protocols.updated_at,
--         enquiries.user_id nullable, delete_user_data RPC, referrals unique constraint,
--         referral code auto-generation, disputed status constraint, security definer fixes,
--         health_checks RLS, community_logs.rating default, notification type constraint,
--         injection_logs.protocol_id FK, index on lab_results
-- 2026-03-15

BEGIN;

----------------------------------------------------------------------
-- 1. lab_results — add columns frontend expects
----------------------------------------------------------------------
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS test_date date;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS lab_name text;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS results jsonb;

ALTER TABLE lab_results ALTER COLUMN test_id DROP NOT NULL;

DROP INDEX IF EXISTS idx_lab_results_user_date;
CREATE INDEX IF NOT EXISTS idx_lab_results_user_date ON lab_results(user_id, test_date DESC);

CREATE POLICY "Users can update own labs"
  ON lab_results FOR UPDATE USING (auth.uid() = user_id);

----------------------------------------------------------------------
-- 2. injection_logs — add photo_url
----------------------------------------------------------------------
ALTER TABLE injection_logs ADD COLUMN IF NOT EXISTS photo_url text;

----------------------------------------------------------------------
-- 3. user_protocols — add updated_at
----------------------------------------------------------------------
ALTER TABLE user_protocols ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

----------------------------------------------------------------------
-- 4. enquiries — make user_id nullable + anon insert policy
----------------------------------------------------------------------
ALTER TABLE enquiries ALTER COLUMN user_id DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE enquiries DROP CONSTRAINT IF EXISTS enquiries_user_id_fkey;
  ALTER TABLE enquiries ADD CONSTRAINT enquiries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anon can submit enquiries"
    ON enquiries FOR INSERT TO anon
    WITH CHECK (user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Auth users can submit enquiries"
    ON enquiries FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

----------------------------------------------------------------------
-- 5. delete_user_data — fix side_effects → side_effect_logs,
--    remove client_errors (no user_id column)
----------------------------------------------------------------------
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
  DELETE FROM wellness_logs WHERE user_id = p_user_id;
  DELETE FROM side_effect_logs WHERE user_id = p_user_id;
  DELETE FROM lab_results WHERE user_id = p_user_id;
  DELETE FROM user_protocols WHERE user_id = p_user_id;
  DELETE FROM coach_conversations WHERE user_id = p_user_id;

  DELETE FROM reviews WHERE user_id = p_user_id;
  DELETE FROM reports WHERE user_id = p_user_id;
  DELETE FROM ai_coach_requests WHERE user_id = p_user_id;

  DELETE FROM sent_reminders WHERE user_id = p_user_id;
  DELETE FROM drip_emails_sent WHERE user_id = p_user_id;
  DELETE FROM enquiries WHERE user_id = p_user_id;
  DELETE FROM rate_limits WHERE user_id = p_user_id;
  DELETE FROM email_logs WHERE user_id = p_user_id;
  DELETE FROM admin_user_notes WHERE user_id = p_user_id;
  DELETE FROM abandoned_checkouts WHERE user_id = p_user_id;

  DELETE FROM referrals WHERE referrer_id = p_user_id OR referred_id = p_user_id;

  DELETE FROM subscriptions WHERE user_id = p_user_id;
  DELETE FROM user_profiles WHERE user_id = p_user_id;

  IF p_user_email IS NOT NULL AND p_user_email <> '' THEN
    DELETE FROM email_list WHERE email = p_user_email;
  END IF;
END;
$$;

----------------------------------------------------------------------
-- 6. referrals — fix UNIQUE constraint
----------------------------------------------------------------------
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referral_code_key;
DO $$ BEGIN
  ALTER TABLE referrals ADD CONSTRAINT referrals_code_referred_unique
    UNIQUE (referral_code, referred_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

----------------------------------------------------------------------
-- 7. handle_new_user — auto-generate referral code
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_i integer;
BEGIN
  v_code := 'PP-';
  FOR v_i IN 1..6 LOOP
    v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
  END LOOP;

  INSERT INTO public.subscriptions (user_id, status, tier, trial_ends_at, referral_code, created_at, updated_at)
  VALUES (NEW.id, 'trial', 'essentials', NOW() + INTERVAL '3 days', v_code, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_profiles (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

----------------------------------------------------------------------
-- 8. subscriptions status CHECK — add 'disputed'
----------------------------------------------------------------------
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'active', 'canceled', 'cancelled', 'past_due', 'trialing',
    'unpaid', 'incomplete', 'incomplete_expired', 'paused',
    'trial', 'none', 'free', 'expired', 'disputed'
  ));

----------------------------------------------------------------------
-- 9. increment_upvote — use auth.uid() instead of p_user_id
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_upvote(p_post_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_new_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO community_upvotes (user_id, community_log_id)
  VALUES (v_uid, p_post_id)
  ON CONFLICT (user_id, community_log_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN (SELECT upvotes FROM community_logs WHERE id = p_post_id);
  END IF;

  UPDATE community_logs SET upvotes = upvotes + 1 WHERE id = p_post_id
  RETURNING upvotes INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;

----------------------------------------------------------------------
-- 10. upsert_subscription — revoke from public, grant to service_role
----------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.upsert_subscription FROM PUBLIC;
DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.upsert_subscription TO service_role;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

----------------------------------------------------------------------
-- 11. SECURITY DEFINER functions — add SET search_path
----------------------------------------------------------------------
DO $$ BEGIN
  ALTER FUNCTION public.check_insert_rate_limit() SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.check_email_list_rate_limit() SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

----------------------------------------------------------------------
-- 12. health_checks — enable RLS
----------------------------------------------------------------------
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role full access on health_checks"
    ON health_checks FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

----------------------------------------------------------------------
-- 13. community_logs.rating — fix default that violates CHECK
----------------------------------------------------------------------
ALTER TABLE community_logs ALTER COLUMN rating SET DEFAULT NULL;

----------------------------------------------------------------------
-- 14. notification type — add back 'referral'
----------------------------------------------------------------------
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('blog', 'streak', 'trial', 'achievement', 'coach', 'referral'));

----------------------------------------------------------------------
-- 15. injection_logs.protocol_id — add FK if missing
----------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE injection_logs ADD CONSTRAINT injection_logs_protocol_id_fkey
    FOREIGN KEY (protocol_id) REFERENCES user_protocols(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

----------------------------------------------------------------------
-- 16. storage — restrict MIME types on user-uploads bucket
----------------------------------------------------------------------
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'user-uploads';

COMMIT;
