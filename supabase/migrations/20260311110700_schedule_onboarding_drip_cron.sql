-- Schedule onboarding-drip to run every hour at :15
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Only unschedule if exists
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'onboarding-drip') THEN
      PERFORM cron.unschedule('onboarding-drip');
    END IF;

    PERFORM cron.schedule(
      'onboarding-drip',
      '15 */1 * * *',
      $$
      SELECT net.http_post(
        url := 'https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/onboarding-drip',
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
