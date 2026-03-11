-- ============================================================
-- Comprehensive Audit Fixes — 2026-03-12
-- Issues found during full RLS & migration audit:
--   1. analytics_events table missing entirely from migrations
--   2. delete_user_data regression — 20260311080203 removed 7 tables
--   3. cleanup_rate_limits() function exists but no cron scheduled
--   4. subscriptions "Anyone can count" policy exposes user_id rows
--   5. user-uploads storage bucket missing RLS policies
-- ============================================================


-- ============================================================
-- FIX 1: analytics_events — create table + RLS
-- Used by src/lib/analytics.ts but never defined in migrations.
-- Allows anon+auth INSERT only; reads restricted to service_role.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name   text NOT NULL,
  event_params jsonb DEFAULT '{}',
  page_path    text,
  referrer     text,
  session_id   text,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON public.analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id
  ON public.analytics_events (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name
  ON public.analytics_events (event_name, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anon + auth users can INSERT (fire-and-forget analytics)
DROP POLICY IF EXISTS "anon_insert_analytics"        ON public.analytics_events;
DROP POLICY IF EXISTS "auth_insert_analytics"        ON public.analytics_events;
DROP POLICY IF EXISTS "service_role_read_analytics"  ON public.analytics_events;

CREATE POLICY "anon_insert_analytics"
  ON public.analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);       -- anon must not spoof a user_id

CREATE POLICY "auth_insert_analytics"
  ON public.analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- No SELECT/UPDATE/DELETE for regular users — analytics is write-only from client
-- service_role bypasses RLS for dashboard/reporting access


-- ============================================================
-- FIX 2: delete_user_data — comprehensive version
-- 20260311080203 (drip_emails_sent migration) accidentally replaced
-- the full v4 (wave3) function with an older incomplete version,
-- dropping 7 tables: community_upvotes, community_replies,
-- notifications, user_bookmarks, coach_conversations,
-- admin_user_notes, abandoned_checkouts.
-- This restores the complete set + adds drip_emails_sent.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_user_data(
  p_user_id    uuid,
  p_user_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Order matters: delete children before parents where FKs exist.
  -- All deletes in a single transaction; failure rolls everything back.

  -- Community (upvotes before logs, replies before logs)
  DELETE FROM community_upvotes  WHERE user_id = p_user_id;
  DELETE FROM community_replies  WHERE user_id = p_user_id;
  DELETE FROM community_logs     WHERE user_id = p_user_id;

  -- Notifications & bookmarks
  DELETE FROM notifications   WHERE user_id = p_user_id;
  DELETE FROM user_bookmarks  WHERE user_id = p_user_id;

  -- Health tracking
  DELETE FROM injection_logs   WHERE user_id = p_user_id;
  DELETE FROM wellness_logs    WHERE user_id = p_user_id;
  DELETE FROM side_effect_logs WHERE user_id = p_user_id;
  DELETE FROM lab_results      WHERE user_id = p_user_id;
  DELETE FROM user_protocols   WHERE user_id = p_user_id;

  -- AI / coach
  DELETE FROM coach_conversations WHERE user_id = p_user_id;
  DELETE FROM ai_coach_requests   WHERE user_id = p_user_id;

  -- Social / reviews
  DELETE FROM reviews  WHERE user_id = p_user_id;
  DELETE FROM reports  WHERE user_id = p_user_id;

  -- Admin notes (service-side)
  DELETE FROM admin_user_notes WHERE user_id = p_user_id;

  -- Email / marketing
  DELETE FROM drip_emails_sent WHERE user_id = p_user_id;
  DELETE FROM sent_reminders   WHERE user_id = p_user_id;
  DELETE FROM enquiries        WHERE user_id = p_user_id;
  DELETE FROM email_logs       WHERE user_id = p_user_id;

  -- Rate limiting
  DELETE FROM rate_limits WHERE user_id = p_user_id;

  -- Referrals
  DELETE FROM referrals
    WHERE referrer_id = p_user_id OR referred_id = p_user_id;

  -- Checkout / billing (delete before subscription)
  DELETE FROM abandoned_checkouts WHERE user_id = p_user_id;
  DELETE FROM subscriptions       WHERE user_id = p_user_id;

  -- Analytics (anonymise rather than delete — keeps aggregates intact)
  UPDATE public.analytics_events
  SET user_id = NULL
  WHERE user_id = p_user_id;

  -- Profile — last, as it may be FK-referenced
  DELETE FROM user_profiles WHERE user_id = p_user_id;

  -- Email list (opt-in only, keyed by email address)
  IF p_user_email IS NOT NULL AND p_user_email <> '' THEN
    DELETE FROM email_list WHERE email = p_user_email;
  END IF;
END;
$$;

-- Restrict execution to service_role only
REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_user_data(uuid, text) TO service_role;

COMMENT ON FUNCTION public.delete_user_data IS
  'v5 — Full GDPR-compliant user data deletion. '
  'Tables: community_upvotes, community_replies, community_logs, '
  'notifications, user_bookmarks, injection_logs, wellness_logs, '
  'side_effect_logs, lab_results, user_protocols, coach_conversations, '
  'ai_coach_requests, reviews, reports, admin_user_notes, drip_emails_sent, '
  'sent_reminders, enquiries, email_logs, rate_limits, referrals, '
  'abandoned_checkouts, subscriptions, analytics_events (anonymised), '
  'user_profiles, email_list. Auth user deleted separately by edge function.';


-- ============================================================
-- FIX 3: Schedule cleanup_rate_limits() as a pg_cron job
-- The function was created in 20260310170000 but never scheduled.
-- Rate-limit rows accumulate indefinitely without this.
-- ============================================================

DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if any
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits') THEN
      PERFORM cron.unschedule('cleanup-rate-limits');
    END IF;

    PERFORM cron.schedule(
      'cleanup-rate-limits',
      '5 * * * *',   -- every hour at minute 5 (offset from other hourly jobs)
      $$ SELECT public.cleanup_rate_limits(); $$
    );
  END IF;
END $block$;


-- ============================================================
-- FIX 4: Tighten "Anyone can count active subscriptions" policy
-- Current policy exposes raw rows (user_id, tier, status) to
-- unauthenticated clients — they can enumerate subscriber details.
-- Replace with a restricted version that exposes only status/tier
-- (sufficient for the landing-page subscriber count query).
-- ============================================================

-- Drop the overly broad policy
DROP POLICY IF EXISTS "Anyone can count active subscriptions" ON public.subscriptions;

-- Re-create with column-level restriction: only allow head:true count queries
-- PostgREST respects column grants; limit columns visible to anon role.
CREATE POLICY "Anon can count subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO anon
  USING (status IN ('active', 'trial'));

-- Revoke column access to sensitive fields from anon
-- (anon can only see status + tier, not user_id / stripe details)
REVOKE SELECT ON public.subscriptions FROM anon;
GRANT  SELECT (status, tier) ON public.subscriptions TO anon;


-- ============================================================
-- FIX 5: user-uploads storage bucket — RLS policies
-- Storage RLS is enforced on storage.objects (not a policies table).
-- Policies are CREATE POLICY statements on storage.objects.
-- ============================================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can upload own files"   ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files"     ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files"   ON storage.objects;
DROP POLICY IF EXISTS "Service role full access"     ON storage.objects;

-- Authenticated users can upload into their own folder: user-uploads/<user_id>/...
CREATE POLICY "Users can upload own files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can read their own files
CREATE POLICY "Users can read own files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own files
CREATE POLICY "Users can delete own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role has full access to all files (for admin/deletion)
CREATE POLICY "Service role full access to user-uploads"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'user-uploads')
  WITH CHECK (bucket_id = 'user-uploads');


-- ============================================================
-- VERIFY: Ensure all required tables have RLS enabled
-- These ALTERs are idempotent — safe to re-run.
-- ============================================================

DO $check$
DECLARE
  t TEXT;
  missing TEXT[] := ARRAY[]::TEXT[];
  tables TEXT[] := ARRAY[
    'injection_logs','user_protocols','lab_results','wellness_logs',
    'side_effect_logs','coach_conversations','community_logs',
    'community_replies','reports','notifications','subscriptions',
    'user_profiles','user_bookmarks','analytics_events','blog_posts',
    'email_list','enquiries','referrals','reviews'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Enable RLS if not already enabled (idempotent)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $check$;
