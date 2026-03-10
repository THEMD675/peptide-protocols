-- =====================================================
-- STRESS TEST FIXES — 2026-03-10
-- Fixes: negative dose, future dates, XSS storage,
--        100KB posts, upvote duplication
-- =====================================================

-- 1. INJECTION LOGS: Prevent negative doses
ALTER TABLE public.injection_logs DROP CONSTRAINT IF EXISTS injection_logs_dose_positive;
ALTER TABLE public.injection_logs ADD CONSTRAINT injection_logs_dose_positive CHECK (dose > 0);

-- 2. INJECTION LOGS: Prevent far-future dates (allow up to 24h ahead for timezone tolerance)
ALTER TABLE public.injection_logs DROP CONSTRAINT IF EXISTS injection_logs_date_not_future;
ALTER TABLE public.injection_logs ADD CONSTRAINT injection_logs_date_not_future 
  CHECK (logged_at <= now() + interval '24 hours');

-- 3. COMMUNITY LOGS: Limit content/results/protocol to 5000 chars
ALTER TABLE public.community_logs DROP CONSTRAINT IF EXISTS community_logs_content_length;
ALTER TABLE public.community_logs ADD CONSTRAINT community_logs_content_length 
  CHECK (length(content) <= 5000);
ALTER TABLE public.community_logs DROP CONSTRAINT IF EXISTS community_logs_results_length;
ALTER TABLE public.community_logs ADD CONSTRAINT community_logs_results_length 
  CHECK (length(results) <= 5000);
ALTER TABLE public.community_logs DROP CONSTRAINT IF EXISTS community_logs_protocol_length;
ALTER TABLE public.community_logs ADD CONSTRAINT community_logs_protocol_length 
  CHECK (length(protocol) <= 5000);

-- 4. COMMUNITY REPLIES: Limit content to 2000 chars
ALTER TABLE public.community_replies DROP CONSTRAINT IF EXISTS community_replies_content_length;
ALTER TABLE public.community_replies ADD CONSTRAINT community_replies_content_length 
  CHECK (length(content) <= 2000);

-- 5. ENQUIRIES: Limit subject to 200 chars, message to 5000 chars
ALTER TABLE public.enquiries DROP CONSTRAINT IF EXISTS enquiries_subject_length;
ALTER TABLE public.enquiries ADD CONSTRAINT enquiries_subject_length 
  CHECK (length(subject) <= 200);
ALTER TABLE public.enquiries DROP CONSTRAINT IF EXISTS enquiries_message_length;
ALTER TABLE public.enquiries ADD CONSTRAINT enquiries_message_length 
  CHECK (length(message) <= 5000);

-- 6. UPVOTE DEDUP: Create upvotes tracking table + fix the RPC
CREATE TABLE IF NOT EXISTS public.community_upvotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES community_logs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.community_upvotes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read upvotes' AND tablename = 'community_upvotes') THEN
    CREATE POLICY "Users can read upvotes" ON public.community_upvotes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own upvotes' AND tablename = 'community_upvotes') THEN
    CREATE POLICY "Users can insert own upvotes" ON public.community_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own upvotes' AND tablename = 'community_upvotes') THEN
    CREATE POLICY "Users can delete own upvotes" ON public.community_upvotes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Replace increment_upvote with proper dedup version
CREATE OR REPLACE FUNCTION increment_upvote(p_post_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count integer;
BEGIN
  -- Try to insert upvote record; if duplicate, do nothing
  INSERT INTO community_upvotes (post_id, user_id)
  VALUES (p_post_id, p_user_id)
  ON CONFLICT (post_id, user_id) DO NOTHING;

  -- If no row was inserted (already upvoted), return current count
  IF NOT FOUND THEN
    SELECT upvotes INTO new_count FROM community_logs WHERE id = p_post_id;
    RETURN COALESCE(new_count, 0);
  END IF;

  -- Atomically increment
  UPDATE community_logs
  SET upvotes = COALESCE(upvotes, 0) + 1
  WHERE id = p_post_id
  RETURNING upvotes INTO new_count;

  IF new_count IS NULL THEN
    RAISE EXCEPTION 'Post not found: %', p_post_id;
  END IF;

  RETURN new_count;
END;
$$;

-- 7. CONTENT SANITIZATION: Strip HTML tags from community content at DB level
CREATE OR REPLACE FUNCTION strip_html_tags(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN regexp_replace(input, '<[^>]*>', '', 'g');
END;
$$;

-- Trigger to sanitize community_logs text fields on insert/update
CREATE OR REPLACE FUNCTION sanitize_community_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content IS NOT NULL THEN
    NEW.content = strip_html_tags(NEW.content);
  END IF;
  IF NEW.results IS NOT NULL THEN
    NEW.results = strip_html_tags(NEW.results);
  END IF;
  IF NEW.protocol IS NOT NULL THEN
    NEW.protocol = strip_html_tags(NEW.protocol);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_community_content ON community_logs;
CREATE TRIGGER trg_sanitize_community_content
  BEFORE INSERT OR UPDATE ON community_logs
  FOR EACH ROW EXECUTE FUNCTION sanitize_community_log();

-- Separate function for community_replies (only has content column)
CREATE OR REPLACE FUNCTION sanitize_community_reply()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content IS NOT NULL THEN
    NEW.content = strip_html_tags(NEW.content);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_community_reply ON community_replies;
CREATE TRIGGER trg_sanitize_community_reply
  BEFORE INSERT OR UPDATE ON community_replies
  FOR EACH ROW EXECUTE FUNCTION sanitize_community_reply();

-- Sanitize enquiries subject/message
CREATE OR REPLACE FUNCTION sanitize_enquiry_content()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.subject = strip_html_tags(NEW.subject);
  NEW.message = strip_html_tags(NEW.message);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_enquiry ON enquiries;
CREATE TRIGGER trg_sanitize_enquiry
  BEFORE INSERT OR UPDATE ON enquiries
  FOR EACH ROW EXECUTE FUNCTION sanitize_enquiry_content();

-- 8. Rate limit for community_logs inserts: max 5 per minute per user
-- (handled via RLS + trigger instead of application code)
CREATE OR REPLACE FUNCTION check_community_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT count(*) INTO recent_count
  FROM community_logs
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 minute';
  
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit: max 5 posts per minute' USING ERRCODE = 'P0001';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_rate_limit ON community_logs;
CREATE TRIGGER trg_community_rate_limit
  BEFORE INSERT ON community_logs
  FOR EACH ROW EXECUTE FUNCTION check_community_rate_limit();
