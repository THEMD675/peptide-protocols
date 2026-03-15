-- Fix: increment_upvote uses community_log_id but the community_upvotes table column is post_id
CREATE OR REPLACE FUNCTION public.increment_upvote(p_post_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_new_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO community_upvotes (user_id, post_id)
  VALUES (v_uid, p_post_id)
  ON CONFLICT (user_id, post_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN (SELECT upvotes FROM community_logs WHERE id = p_post_id);
  END IF;

  UPDATE community_logs SET upvotes = upvotes + 1 WHERE id = p_post_id
  RETURNING upvotes INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;
