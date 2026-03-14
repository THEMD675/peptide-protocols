-- Secure RPC to get active subscriber count (prevents exposing subscription table to clients)
CREATE OR REPLACE FUNCTION public.get_active_subscriber_count()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::integer FROM subscriptions
  WHERE status IN ('active', 'trial') AND stripe_subscription_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_subscriber_count() TO anon, authenticated;
