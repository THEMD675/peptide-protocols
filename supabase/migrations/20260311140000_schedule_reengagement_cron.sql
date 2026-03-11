-- Schedule reengagement-email to run daily at 11:00 UTC
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule if exists
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reengagement-email') THEN
      PERFORM cron.unschedule('reengagement-email');
    END IF;

    PERFORM cron.schedule(
      'reengagement-email',
      '0 11 * * *',
      $$
      SELECT net.http_post(
        url := 'https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/reengagement-email',
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
