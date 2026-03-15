-- Add saved_protocols to delete_user_data RPC
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID, p_user_email TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM saved_protocols WHERE user_id = p_user_id;
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
