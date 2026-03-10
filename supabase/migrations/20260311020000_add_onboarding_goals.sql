-- C13: Add onboarding_goals column to user_profiles table
-- Stores user goals from quiz/onboarding so they persist across devices
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_goals jsonb;
