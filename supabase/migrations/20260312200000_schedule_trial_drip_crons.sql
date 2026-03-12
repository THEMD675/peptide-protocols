-- Schedule trial nurturing cron jobs (trial-day1, trial-day2, trial-winback)
-- These edge functions are deployed but were never scheduled

SELECT cron.unschedule('trial-day1-email') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trial-day1-email');
SELECT cron.unschedule('trial-day2-email') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trial-day2-email');
SELECT cron.unschedule('trial-winback-email') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trial-winback-email');

SELECT cron.schedule(
  'trial-day1-email',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/trial-day1',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'trial-day2-email',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/trial-day2',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'trial-winback-email',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/trial-winback',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
