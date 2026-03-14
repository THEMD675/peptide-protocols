-- Schedule win-back-email: sends 20% discount to users who cancelled 3+ days ago
-- This function was deployed but NEVER scheduled as a cron job

DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'win-back-email') THEN
      PERFORM cron.unschedule('win-back-email');
    END IF;

    PERFORM cron.schedule(
      'win-back-email',
      '0 9 * * *',
      $$
      SELECT net.http_post(
        url := 'https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/win-back-email',
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
