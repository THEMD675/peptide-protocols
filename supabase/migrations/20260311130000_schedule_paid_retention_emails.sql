-- Schedule paid subscriber retention email sequence via pg_cron
-- paid-week1 (7d), paid-week2 (14d), paid-week4 (28d), paid-month3 (90d)
-- Functions have built-in dedup — safe to run frequently

DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    -- Paid Week 1: runs daily at 10:00 UTC (1:00 PM Riyadh)
    PERFORM cron.schedule(
      'paid-week1',
      '0 10 * * *',
      $$
      SELECT net.http_post(
        url := 'https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/paid-week1',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
        ),
        body := '{}'::jsonb
      )
      $$
    );

    -- Paid Week 2: runs daily at 10:15 UTC
    PERFORM cron.schedule(
      'paid-week2',
      '15 10 * * *',
      $$
      SELECT net.http_post(
        url := 'https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/paid-week2',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
        ),
        body := '{}'::jsonb
      )
      $$
    );

    -- Paid Week 4: runs daily at 10:30 UTC
    PERFORM cron.schedule(
      'paid-week4',
      '30 10 * * *',
      $$
      SELECT net.http_post(
        url := 'https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/paid-week4',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
        ),
        body := '{}'::jsonb
      )
      $$
    );

    -- Paid Month 3: runs daily at 10:45 UTC
    PERFORM cron.schedule(
      'paid-month3',
      '45 10 * * *',
      $$
      SELECT net.http_post(
        url := 'https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/paid-month3',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
        ),
        body := '{}'::jsonb
      )
      $$
    );

    -- Also schedule daily-digest if not already scheduled
    PERFORM cron.schedule(
      'daily-digest',
      '0 7 * * *',
      $$
      SELECT net.http_post(
        url := 'https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/daily-digest',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
        ),
        body := '{}'::jsonb
      )
      $$
    );

    -- Also schedule abandoned-checkout-recovery if not already scheduled
    PERFORM cron.schedule(
      'abandoned-checkout-recovery',
      '0 */3 * * *',
      $$
      SELECT net.http_post(
        url := 'https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/abandoned-checkout-recovery',
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
