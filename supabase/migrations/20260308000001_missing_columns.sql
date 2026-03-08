-- Add columns that exist in old DB but were missing from migrations
-- These were added via Supabase Dashboard on the old project

-- subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free';

-- user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weight_kg numeric;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS goals text[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS current_medications text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS medical_conditions text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS injection_preference text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name text;

-- wellness_logs
ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS appetite integer;
ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS pain integer;
ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS weight_kg numeric;
ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS logged_at timestamptz DEFAULT now();
ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
