-- Ensure RLS is enabled on saved_protocols and webhook_events tables

ALTER TABLE IF EXISTS saved_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhook_events ENABLE ROW LEVEL SECURITY;

-- saved_protocols: users can only read/write their own rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'saved_protocols' AND policyname = 'Users can view own saved_protocols'
  ) THEN
    CREATE POLICY "Users can view own saved_protocols"
      ON saved_protocols FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'saved_protocols' AND policyname = 'Users can insert own saved_protocols'
  ) THEN
    CREATE POLICY "Users can insert own saved_protocols"
      ON saved_protocols FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'saved_protocols' AND policyname = 'Users can update own saved_protocols'
  ) THEN
    CREATE POLICY "Users can update own saved_protocols"
      ON saved_protocols FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'saved_protocols' AND policyname = 'Users can delete own saved_protocols'
  ) THEN
    CREATE POLICY "Users can delete own saved_protocols"
      ON saved_protocols FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- webhook_events: skip if table doesn't exist (was never created)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_events') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'webhook_events' AND policyname = 'Deny all public access to webhook_events'
    ) THEN
      CREATE POLICY "Deny all public access to webhook_events"
        ON webhook_events FOR ALL
        USING (false);
    END IF;
  END IF;
END $$;
