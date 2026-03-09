-- Fix missing columns that frontend code expects

-- community_logs: code selects peptide_name, goal, protocol, duration_weeks, results
ALTER TABLE community_logs ADD COLUMN IF NOT EXISTS peptide_name text;
ALTER TABLE community_logs ADD COLUMN IF NOT EXISTS goal text;
ALTER TABLE community_logs ADD COLUMN IF NOT EXISTS protocol text;
ALTER TABLE community_logs ADD COLUMN IF NOT EXISTS duration_weeks integer;
ALTER TABLE community_logs ADD COLUMN IF NOT EXISTS results text;

-- side_effect_logs: code selects 'status' column
ALTER TABLE side_effect_logs ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
