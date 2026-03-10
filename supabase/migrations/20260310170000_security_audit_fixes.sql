-- ============================================================
-- Security Audit Fixes — 2026-03-10
-- Findings from deep database & RLS audit
-- ============================================================

-- ----------------------------------------------------------------
-- FIX 1: CRITICAL — Payment bypass via subscriptions table
-- Users could previously INSERT or UPDATE their own subscription,
-- allowing them to set status='active' and tier='pro' without paying.
-- Subscription management is ONLY done by service_role (Stripe webhooks).
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
-- Remaining policies: service_role INSERT + user SELECT only


-- ----------------------------------------------------------------
-- FIX 2: reviews INSERT — no ownership check allowed spoofing user_id
-- Previously any authenticated user could submit a review with any user_id.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "auth_review_insert" ON public.reviews;
CREATE POLICY "auth_review_insert" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- ----------------------------------------------------------------
-- FIX 3: handle_new_user trigger — now also creates user_profiles
-- Previously only created a subscription; profiles depended on app code.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Create trial subscription
  INSERT INTO public.subscriptions (user_id, status, tier, trial_ends_at, created_at, updated_at)
  VALUES (
    NEW.id,
    'trial',
    'essentials',
    NOW() + INTERVAL '3 days',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create empty user profile (user fills in details during onboarding)
  INSERT INTO public.user_profiles (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;


-- ----------------------------------------------------------------
-- FIX 4: Backfill subscriptions for users created before trigger existed
-- 12 users were registered before the trigger was deployed.
-- ----------------------------------------------------------------
INSERT INTO public.subscriptions (user_id, status, tier, trial_ends_at, created_at, updated_at)
SELECT
  u.id,
  'trial',
  'essentials',
  NOW() + INTERVAL '3 days',
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;


-- ----------------------------------------------------------------
-- FIX 5: referrals UPDATE — wrong service_role check pattern removed
-- The old policy used current_setting('request.jwt.claims') to detect
-- service_role, which is an anti-pattern. service_role bypasses RLS
-- entirely so no explicit UPDATE policy is needed for it.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Service role updates referrals" ON public.referrals;


-- ----------------------------------------------------------------
-- FIX 6: rate_limits — add created_at index + cleanup function
-- Rate limits had no cleanup; stale rows accumulate indefinitely.
-- cleanup_rate_limits() should be called periodically (e.g., every hour).
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at
  ON public.rate_limits (created_at);

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;


-- ----------------------------------------------------------------
-- FIX 7: delete_user_data — was missing abandoned_checkouts table
-- Added to ensure complete GDPR/deletion coverage.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_data(
  p_user_id uuid,
  p_user_email text DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM community_replies   WHERE user_id = p_user_id;
  DELETE FROM injection_logs      WHERE user_id = p_user_id;
  DELETE FROM community_logs      WHERE user_id = p_user_id;
  DELETE FROM reviews             WHERE user_id = p_user_id;
  DELETE FROM reports             WHERE user_id = p_user_id;
  DELETE FROM ai_coach_requests   WHERE user_id = p_user_id;
  DELETE FROM sent_reminders      WHERE user_id = p_user_id;
  DELETE FROM enquiries           WHERE user_id = p_user_id;
  DELETE FROM rate_limits         WHERE user_id = p_user_id;
  DELETE FROM email_logs          WHERE user_id = p_user_id;
  DELETE FROM referrals           WHERE referrer_id = p_user_id OR referred_id = p_user_id;
  DELETE FROM user_protocols      WHERE user_id = p_user_id;
  DELETE FROM user_profiles       WHERE user_id = p_user_id;
  DELETE FROM lab_results         WHERE user_id = p_user_id;
  DELETE FROM side_effect_logs    WHERE user_id = p_user_id;
  DELETE FROM wellness_logs       WHERE user_id = p_user_id;
  DELETE FROM coach_conversations WHERE user_id = p_user_id;
  DELETE FROM admin_user_notes    WHERE user_id = p_user_id;
  DELETE FROM subscriptions       WHERE user_id = p_user_id;
  DELETE FROM abandoned_checkouts WHERE user_id = p_user_id;  -- was missing!

  IF p_user_email IS NOT NULL AND p_user_email <> '' THEN
    DELETE FROM email_list WHERE email = p_user_email;
  END IF;
END;
$$;


-- ----------------------------------------------------------------
-- FIX 8: abandoned_checkouts — explicit service_role policy
-- Had RLS enabled but no policies (implicitly locked to all clients).
-- service_role bypasses RLS but adding explicit policy improves clarity.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "service_role_only_abandoned_checkouts" ON public.abandoned_checkouts;
CREATE POLICY "service_role_only_abandoned_checkouts"
  ON public.abandoned_checkouts
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
