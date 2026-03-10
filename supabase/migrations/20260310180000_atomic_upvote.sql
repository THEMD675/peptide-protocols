-- Atomic upvote function to prevent race conditions on concurrent clicks
CREATE OR REPLACE FUNCTION increment_upvote(p_post_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count integer;
BEGIN
  -- Atomically increment the upvote counter
  UPDATE community_logs
  SET upvotes = COALESCE(upvotes, 0) + 1
  WHERE id = p_post_id
  RETURNING upvotes INTO new_count;

  IF new_count IS NULL THEN
    RAISE EXCEPTION 'Post not found: %', p_post_id;
  END IF;

  RETURN new_count;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_upvote(uuid, uuid) TO authenticated;
