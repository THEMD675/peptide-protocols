-- RPC to let authenticated users set their own referral code
-- SECURITY DEFINER ensures it runs with elevated privileges but only
-- updates the row belonging to auth.uid()

CREATE OR REPLACE FUNCTION set_referral_code(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_code !~ '^PP-[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'Invalid referral code format. Must be PP- followed by 6 uppercase alphanumeric characters.';
  END IF;

  UPDATE subscriptions
  SET referral_code = p_code,
      updated_at = now()
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription found for current user.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_referral_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_referral_code(text) TO authenticated;
