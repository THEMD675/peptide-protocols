-- Community replies + subscriber badges

-- 1. Replies table
CREATE TABLE IF NOT EXISTS community_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_logs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_subscriber boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_replies_post_id ON community_replies(post_id);

-- RLS
ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read replies"
  ON community_replies FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert own replies"
  ON community_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
  ON community_replies FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Subscriber badge column on community_logs
ALTER TABLE community_logs
  ADD COLUMN IF NOT EXISTS is_subscriber boolean NOT NULL DEFAULT false;

-- 3. Update delete_user_data to also clean up replies
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
  DELETE FROM subscriptions WHERE user_id = p_user_id;

  IF p_user_email IS NOT NULL AND p_user_email <> '' THEN
    DELETE FROM email_list WHERE email = p_user_email;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid, text) TO service_role;
