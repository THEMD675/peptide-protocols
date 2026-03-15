-- Round 3: Missing indexes, GDPR delete_user_data fix, client_errors cleanup cron
-- 2026-03-14

----------------------------------------------------------------------
-- 1. Missing indexes
----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_email_logs_email_created ON email_logs(email, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_results') THEN
    CREATE INDEX IF NOT EXISTS idx_lab_results_user_date ON lab_results(user_id, test_date);
  END IF;
END $$;

----------------------------------------------------------------------
-- 2. delete_user_data() — add missing tables
--    Already included: coach_conversations, ai_coach_requests,
--    community_replies, side_effect_logs
--    Adding: side_effects, client_errors
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID, p_user_email TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Community
  DELETE FROM community_upvotes WHERE user_id = p_user_id;
  DELETE FROM community_replies WHERE user_id = p_user_id;
  DELETE FROM community_logs WHERE user_id = p_user_id;

  -- User activity
  DELETE FROM notifications WHERE user_id = p_user_id;
  DELETE FROM user_bookmarks WHERE user_id = p_user_id;
  DELETE FROM injection_logs WHERE user_id = p_user_id;
  DELETE FROM wellness_logs WHERE user_id = p_user_id;
  DELETE FROM side_effect_logs WHERE user_id = p_user_id;
  DELETE FROM lab_results WHERE user_id = p_user_id;
  DELETE FROM user_protocols WHERE user_id = p_user_id;
  DELETE FROM coach_conversations WHERE user_id = p_user_id;

  -- Content
  DELETE FROM reviews WHERE user_id = p_user_id;
  DELETE FROM reports WHERE user_id = p_user_id;
  DELETE FROM ai_coach_requests WHERE user_id = p_user_id;

  -- NEW: tables that were missing
  DELETE FROM side_effects WHERE user_id = p_user_id;
  DELETE FROM client_errors WHERE user_id = p_user_id;

  -- System / admin
  DELETE FROM sent_reminders WHERE user_id = p_user_id;
  DELETE FROM drip_emails_sent WHERE user_id = p_user_id;
  DELETE FROM enquiries WHERE user_id = p_user_id;
  DELETE FROM rate_limits WHERE user_id = p_user_id;
  DELETE FROM email_logs WHERE user_id = p_user_id;
  DELETE FROM admin_user_notes WHERE user_id = p_user_id;
  DELETE FROM abandoned_checkouts WHERE user_id = p_user_id;

  -- Referrals (both sides)
  DELETE FROM referrals WHERE referrer_id = p_user_id OR referred_id = p_user_id;

  -- analytics_events has ON DELETE SET NULL — no manual delete needed

  -- Core (order matters: subscriptions before user_profiles due to FK)
  DELETE FROM subscriptions WHERE user_id = p_user_id;
  DELETE FROM user_profiles WHERE user_id = p_user_id;

  -- Email list (by email, not user_id)
  IF p_user_email IS NOT NULL AND p_user_email <> '' THEN
    DELETE FROM email_list WHERE email = p_user_email;
  END IF;
END;
$$;

----------------------------------------------------------------------
-- 3. Cron: clean up client_errors older than 30 days (daily at 3 AM)
----------------------------------------------------------------------
SELECT cron.schedule(
  'cleanup-client-errors',
  '0 3 * * *',
  $$DELETE FROM client_errors WHERE created_at < now() - interval '30 days'$$
);
