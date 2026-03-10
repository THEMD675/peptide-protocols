-- Migration: DB integrity fixes — trial expiry cron, indexes, RLS audit
-- Date: 2026-03-09
-- Description: 
--   1. Add 'expired' to subscriptions status check constraint
--   2. Expire overdue trial subscriptions
--   3. Enable pg_cron and schedule hourly trial expiry job
--   4. Fix blog_posts RLS — restrict write access to service_role only
--   5. Remove duplicate indexes

-- =============================================================
-- 1. Fix subscriptions status constraint to include 'expired'
-- =============================================================
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN (
    'active', 'canceled', 'cancelled', 'past_due', 'trialing', 
    'unpaid', 'incomplete', 'incomplete_expired', 'paused', 
    'trial', 'none', 'free', 'expired'
  ));

-- =============================================================
-- 2. Expire overdue trial subscriptions
-- =============================================================
UPDATE subscriptions 
SET status = 'expired', updated_at = NOW() 
WHERE status = 'trial' AND trial_ends_at < NOW();

-- =============================================================
-- 3. Enable pg_cron and schedule hourly trial expiry
-- =============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Remove existing job if any (idempotent)
SELECT cron.unschedule('expire-trials') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-trials');

SELECT cron.schedule(
  'expire-trials',
  '0 * * * *',  -- every hour at minute 0
  $$UPDATE public.subscriptions SET status = 'expired', updated_at = NOW() WHERE status = 'trial' AND trial_ends_at < NOW()$$
);

-- =============================================================
-- 4. Fix blog_posts RLS — service_role only for writes
-- =============================================================
-- The old policy allowed ALL operations for public role (security hole)
DROP POLICY IF EXISTS blog_posts_service_all ON blog_posts;
DROP POLICY IF EXISTS blog_posts_service_write ON blog_posts;
CREATE POLICY blog_posts_service_write ON blog_posts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Public can only read published posts (existing policy remains)
-- blog_posts_public_read: SELECT WHERE is_published = true

-- =============================================================
-- 5. Remove duplicate indexes
-- =============================================================
-- idx_subscriptions_stripe_sub_id duplicates idx_subscriptions_stripe_sub
DROP INDEX IF EXISTS idx_subscriptions_stripe_sub_id;
-- idx_blog_posts_slug duplicates the unique constraint blog_posts_slug_key
DROP INDEX IF EXISTS idx_blog_posts_slug;

-- =============================================================
-- Index verification (all required indexes already exist):
-- ✅ subscriptions(user_id) — subscriptions_user_id_key (unique)
-- ✅ subscriptions(stripe_subscription_id) — idx_subscriptions_stripe_sub
-- ✅ injection_logs(user_id, logged_at) — idx_injection_logs_user_logged
-- ✅ blog_posts(slug) unique — blog_posts_slug_key
-- ✅ blog_posts(is_published) — idx_blog_posts_published
-- ✅ reviews(is_approved) — idx_reviews_is_approved
-- =============================================================

-- =============================================================
-- RLS Audit Summary (all tables verified):
-- ✅ All 23 tables have RLS enabled
-- ✅ User tables enforce auth.uid() = user_id
-- ✅ blog_posts: public read (published only), service_role write
-- ✅ reviews: public read (approved only), user insert/update own
-- ✅ community_logs: public read, user write own
-- ✅ community_replies: public read, user insert/delete own
-- ✅ Admin tables (admin_audit_log, admin_user_notes, email_logs,
--    processed_webhook_events, sent_reminders, rate_limits): 
--    service_role only or deny-all
-- ✅ email_list: public insert (newsletter signup), service_role manage
-- ✅ No orphaned data found (all subscription user_ids exist in auth.users)
-- =============================================================

-- =============================================================
-- JWT/REST API Note:
-- PostgREST is configured with HS256 jwt_secret.
-- Legacy API keys (eyJ... format) work correctly.
-- New-format keys (sb_secret_..., sb_publishable_...) are NOT 
-- compatible with direct PostgREST REST API calls.
-- Edge functions use SUPABASE_SERVICE_ROLE_KEY (auto-injected legacy key).
-- No fix needed — use legacy keys for REST API access.
-- =============================================================
