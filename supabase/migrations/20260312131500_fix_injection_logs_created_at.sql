ALTER TABLE injection_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
