-- Fix column names to match application code
-- The base migration uses 'unit' and 'injected_at' but the app uses 'dose_unit' and 'logged_at'

-- Rename 'unit' to 'dose_unit' if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'injection_logs' AND column_name = 'unit') THEN
    ALTER TABLE injection_logs RENAME COLUMN unit TO dose_unit;
  END IF;
END $$;

-- Rename 'injected_at' to 'logged_at' if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'injection_logs' AND column_name = 'injected_at') THEN
    ALTER TABLE injection_logs RENAME COLUMN injected_at TO logged_at;
  END IF;
END $$;

-- Add dose_unit if neither 'unit' nor 'dose_unit' exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'injection_logs' AND column_name = 'dose_unit') THEN
    ALTER TABLE injection_logs ADD COLUMN dose_unit text NOT NULL DEFAULT 'mcg';
  END IF;
END $$;

-- Add logged_at if neither 'injected_at' nor 'logged_at' exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'injection_logs' AND column_name = 'logged_at') THEN
    ALTER TABLE injection_logs ADD COLUMN logged_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add index for common query pattern (user's recent logs)
CREATE INDEX IF NOT EXISTS idx_injection_logs_user_logged ON injection_logs(user_id, logged_at DESC);
