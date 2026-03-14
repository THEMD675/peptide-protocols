-- Drop orphaned trial_end column (renamed to trial_ends_at in later migrations)
ALTER TABLE subscriptions DROP COLUMN IF EXISTS trial_end;
