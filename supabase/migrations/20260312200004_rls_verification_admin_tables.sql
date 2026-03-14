-- Add admin/system tables to RLS verification
-- Ensures RLS stays enabled on these tables

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'admin_audit_log',
    'admin_user_notes',
    'email_logs',
    'drip_emails_sent',
    'sent_reminders',
    'rate_limits',
    'abandoned_checkouts',
    'processed_webhook_events'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = t AND schemaname = 'public') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END;
$$;
