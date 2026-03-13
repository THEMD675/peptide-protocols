-- Client-side error tracking table
-- Used by src/lib/logger.ts to POST errors from production browsers
CREATE TABLE IF NOT EXISTS public.client_errors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL,
  stack text,
  url text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (errors come from unauthenticated users too)
CREATE POLICY "anon_insert_client_errors"
  ON public.client_errors
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service_role can read (admin dashboard)
CREATE POLICY "service_role_select_client_errors"
  ON public.client_errors
  FOR SELECT
  TO service_role
  USING (true);

-- Auto-cleanup: keep only last 30 days
-- (run via pg_cron if available, otherwise manual)
COMMENT ON TABLE public.client_errors IS 'Client-side JS errors from production. Auto-inserted by logger.ts via REST API.';
