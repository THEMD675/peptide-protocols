-- Onboarding drip email tracking table
-- Tracks which drip emails have been sent to each user to ensure idempotency
CREATE TABLE IF NOT EXISTS drip_emails_sent (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_key text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  UNIQUE(user_id, email_key)
);

ALTER TABLE drip_emails_sent ENABLE ROW LEVEL SECURITY;

-- Service role only — no client access
CREATE POLICY "Service role only" ON drip_emails_sent FOR ALL USING (false);

-- Index for efficient lookups by user
CREATE INDEX idx_drip_emails_sent_user_id ON drip_emails_sent(user_id);

-- Update delete_user_data to also clean drip_emails_sent
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid, p_user_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM injection_logs WHERE user_id = p_user_id;
  DELETE FROM community_logs WHERE user_id = p_user_id;
  DELETE FROM reviews WHERE user_id = p_user_id;
  DELETE FROM reports WHERE user_id = p_user_id;
  DELETE FROM ai_coach_requests WHERE user_id = p_user_id;
  DELETE FROM sent_reminders WHERE user_id = p_user_id;
  DELETE FROM drip_emails_sent WHERE user_id = p_user_id;
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
