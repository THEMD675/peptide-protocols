-- Schema fixes: reviews columns alignment

-- 1. Reviews table — add columns expected by frontend
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- Rename 'text' to 'content' if it exists (may already be 'content' in production)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='text') THEN
    ALTER TABLE reviews RENAME COLUMN text TO content;
  END IF;
END $$;

-- 2. Referrals — document dead column only if it exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrals' AND column_name='user_id') THEN
    COMMENT ON COLUMN referrals.user_id IS 'DEPRECATED — replaced by referrer_id / referred_id';
  END IF;
END $$;
