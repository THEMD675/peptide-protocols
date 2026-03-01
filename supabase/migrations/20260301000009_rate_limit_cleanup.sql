-- Auto-cleanup old rate limit entries (older than 1 hour)
-- This runs as part of the trial-reminder cron job
-- No separate cron needed — piggyback on existing scheduled function

-- For immediate cleanup, run this manually:
DELETE FROM rate_limits WHERE created_at < now() - interval '1 hour';
