-- Fix: delete_user_data missing tables (coach_conversations, abandoned_checkouts)
-- Audit found these tables have user_id but were never included in the deletion RPC.
-- GDPR compliance requires deleting all user data.

CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid, p_user_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- All deletes in single transaction; any failure rolls back
  DELETE FROM coach_conversations WHERE user_id = p_user_id;       -- WAS MISSING
  DELETE FROM abandoned_checkouts WHERE user_id = p_user_id;       -- WAS MISSING
  DELETE FROM community_replies WHERE user_id = p_user_id;
  DELETE FROM injection_logs WHERE user_id = p_user_id;
  DELETE FROM community_logs WHERE user_id = p_user_id;
  DELETE FROM reviews WHERE user_id = p_user_id;
  DELETE FROM reports WHERE user_id = p_user_id;
  DELETE FROM ai_coach_requests WHERE user_id = p_user_id;
  DELETE FROM sent_reminders WHERE user_id = p_user_id;
  DELETE FROM enquiries WHERE user_id = p_user_id;
  DELETE FROM rate_limits WHERE user_id = p_user_id;
  DELETE FROM email_logs WHERE user_id = p_user_id;
  DELETE FROM referrals WHERE referrer_id = p_user_id OR referred_id = p_user_id;
  DELETE FROM user_protocols WHERE user_id = p_user_id;
  DELETE FROM user_profiles WHERE user_id = p_user_id;
  DELETE FROM lab_results WHERE user_id = p_user_id;
  DELETE FROM side_effect_logs WHERE user_id = p_user_id;
  DELETE FROM wellness_logs WHERE user_id = p_user_id;
  DELETE FROM subscriptions WHERE user_id = p_user_id;

  IF p_user_email IS NOT NULL AND p_user_email <> '' THEN
    DELETE FROM email_list WHERE email = p_user_email;
  END IF;
END;
$$;

-- Permissions unchanged
REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid, text) TO service_role;

COMMENT ON FUNCTION public.delete_user_data IS 'Transactional delete of all user data. Tables: coach_conversations, abandoned_checkouts, community_replies, injection_logs, community_logs, reviews, reports, ai_coach_requests, sent_reminders, enquiries, rate_limits, email_logs, referrals, user_protocols, user_profiles, lab_results, side_effect_logs, wellness_logs, subscriptions, email_list. Auth user deletion done separately by edge function.';
