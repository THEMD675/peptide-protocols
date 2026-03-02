-- Fix column mismatches between frontend code and database schema

-- 1. wellness_logs: add notes column + UPDATE policy
ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS notes text;

CREATE POLICY "Users update own wellness"
  ON wellness_logs FOR UPDATE USING (auth.uid() = user_id);

-- 2. lab_results: add notes column
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS notes text;

-- 3. side_effect_logs: add peptide_id column (text, not FK — users may not have a protocol)
ALTER TABLE side_effect_logs ADD COLUMN IF NOT EXISTS peptide_id text;
