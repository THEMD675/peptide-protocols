-- Fix: handle_new_user trigger now creates both subscription AND user_profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

  INSERT INTO public.user_profiles (user_id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Fix: delete_user_data now includes abandoned_checkouts
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid, p_user_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  DELETE FROM coach_conversations WHERE user_id = p_user_id;
  DELETE FROM admin_user_notes WHERE user_id = p_user_id;
  DELETE FROM abandoned_checkouts WHERE user_id = p_user_id;
  DELETE FROM subscriptions WHERE user_id = p_user_id;
  IF p_user_email IS NOT NULL AND p_user_email <> '' THEN
    DELETE FROM email_list WHERE email = p_user_email;
  END IF;
END;
$$;
