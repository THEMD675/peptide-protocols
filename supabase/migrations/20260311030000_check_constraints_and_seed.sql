-- L16: Add CHECK constraints for data integrity
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_rating' AND table_name = 'community_logs') THEN
    ALTER TABLE community_logs ADD CONSTRAINT chk_rating CHECK (rating >= 1 AND rating <= 5);
  END IF;
END $$;

-- injection_log: only add constraint if table exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'injection_log' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_dose_positive' AND table_name = 'injection_log') THEN
      ALTER TABLE injection_log ADD CONSTRAINT chk_dose_positive CHECK (dose > 0);
    END IF;
  END IF;
END $$;
