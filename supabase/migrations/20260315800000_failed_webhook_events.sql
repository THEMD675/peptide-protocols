-- F1: Dead-letter queue for failed webhook events
CREATE TABLE IF NOT EXISTS public.failed_webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL,
  event_type text NOT NULL,
  error_message text,
  payload jsonb,
  retry_count int DEFAULT 0,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.failed_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.failed_webhook_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_failed_webhook_events_resolved ON public.failed_webhook_events (resolved, created_at DESC);
