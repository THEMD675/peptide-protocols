-- Reports table (used by Community.tsx report button)
CREATE TABLE IF NOT EXISTS reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own reports" ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI Coach rate limiting table (used by ai-coach edge function)
CREATE TABLE IF NOT EXISTS ai_coach_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_coach_requests_user_time ON ai_coach_requests(user_id, created_at DESC);
ALTER TABLE ai_coach_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON ai_coach_requests FOR ALL USING (false);

-- Cleanup old rate limit entries (run periodically)
-- DELETE FROM ai_coach_requests WHERE created_at < now() - interval '1 hour';

-- Webhook event deduplication table (used by stripe-webhook edge function)
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz DEFAULT now()
);

ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON processed_webhook_events FOR ALL USING (false);

-- Cleanup old events (run periodically)
-- DELETE FROM processed_webhook_events WHERE processed_at < now() - interval '30 days';

-- Sent reminders deduplication table (used by trial-reminder edge function)
CREATE TABLE IF NOT EXISTS sent_reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  UNIQUE(user_id, reminder_type)
);

ALTER TABLE sent_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON sent_reminders FOR ALL USING (false);

-- Reviews: is_approved defaults to false, auto-approved at rating >= 4 via client code
ALTER TABLE reviews ALTER COLUMN is_approved SET DEFAULT false;
