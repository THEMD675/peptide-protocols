-- Cron schedules — requires pg_cron extension
-- If pg_cron is not available, set up crons manually via Supabase Dashboard > Database > Extensions
-- CRON_SECRET must exist in Supabase Vault (name: CRON_SECRET) for auth

DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'trial-reminder',
      '0 */6 * * *',
      $$
      SELECT net.http_post(
        url := 'https://hexnuldwerzwbljorokw.supabase.co/functions/v1/trial-reminder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
        ),
        body := '{}'::jsonb
      )
      $$
    );
    PERFORM cron.schedule(
      'health-check',
      '*/5 * * * *',
      $$
      SELECT net.http_post(
        url := 'https://hexnuldwerzwbljorokw.supabase.co/functions/v1/health-check',
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
