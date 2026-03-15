-- Fix: anon role should not be able to read subscriptions table
REVOKE SELECT ON public.subscriptions FROM anon;
