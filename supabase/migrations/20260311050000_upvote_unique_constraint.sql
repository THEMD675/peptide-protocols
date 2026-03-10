-- L9: Ensure server-side upvote deduplication
-- The UNIQUE(post_id, user_id) constraint was defined in the table creation migration
-- but may not exist on the live DB. This migration ensures it idempotently.

-- First, remove any existing duplicates (keep the earliest)
DELETE FROM community_upvotes
WHERE id NOT IN (
  SELECT DISTINCT ON (post_id, user_id) id
  FROM community_upvotes
  ORDER BY post_id, user_id, created_at ASC
);

-- Add the unique constraint if it doesn't already exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'community_upvotes'::regclass
      AND contype = 'u'
  ) THEN
    ALTER TABLE community_upvotes ADD CONSTRAINT community_upvotes_post_id_user_id_key UNIQUE (post_id, user_id);
  END IF;
END $$;
