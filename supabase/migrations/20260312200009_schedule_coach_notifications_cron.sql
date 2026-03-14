-- Schedule coach-notifications: proactive push notifications for active users
-- Dose reminders, cycle endings, side effect follow-ups, weekly insights, lab test reminders
-- This function was deployed but NEVER scheduled as a cron job

DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'coach-notifications') THEN
      PERFORM cron.unschedule('coach-notifications');
    END IF;

    PERFORM cron.schedule(
      'coach-notifications',
      '30 7 * * *',
      $$
      SELECT net.http_post(
        url := 'https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/coach-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
        ),
        body := '{}'::jsonb
      )
      $$
    );
  END IF;
END $block$;
