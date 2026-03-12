-- Add missing onboarding_completed_at to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Check lab_results structure - the table might exist with different column names
-- from the bootstrap migration
