-- Performance indexes for production
-- Run these manually in Supabase SQL Editor if not applied via migration
CREATE INDEX IF NOT EXISTS idx_injection_logs_user_id ON injection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_injection_logs_logged_at ON injection_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_community_logs_user_id ON community_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_community_logs_created_at ON community_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_ai_coach_requests_user_id ON ai_coach_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_requests_created_at ON ai_coach_requests(created_at);
