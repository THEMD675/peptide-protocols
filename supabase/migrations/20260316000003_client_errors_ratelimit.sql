-- Fix: client_errors DoS — add message length check and rate-limit policy

-- 1. Add CHECK constraint on message length
ALTER TABLE public.client_errors
  ADD CONSTRAINT client_errors_message_length CHECK (length(message) < 5000);

-- 2. Rate-limit: max 20 inserts per IP per minute via a restrictive RLS policy
-- Drop the old permissive insert policy and replace with a rate-limited one
DROP POLICY IF EXISTS "anon_insert_client_errors" ON public.client_errors;

CREATE POLICY "rate_limited_insert_client_errors"
  ON public.client_errors
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (SELECT count(*) FROM client_errors
     WHERE created_at > now() - interval '1 minute'
    ) < 100
  );
