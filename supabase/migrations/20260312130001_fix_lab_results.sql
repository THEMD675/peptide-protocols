-- Fix lab_results table - add missing columns
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS test_id text;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS value numeric;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS tested_at timestamptz DEFAULT now();
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS notes text;
