-- delete_account RPC: transactional user data deletion
-- Called by delete-account edge function to avoid partial state on failure

CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid, p_user_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- All deletes in single transaction; any failure rolls back
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

-- Only service role (edge functions) can call this
REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid, text) TO service_role;

COMMENT ON FUNCTION public.delete_user_data IS 'Transactional delete of all user data. Call from delete-account edge function after Stripe cleanup. Auth user deletion done separately by edge function.';
