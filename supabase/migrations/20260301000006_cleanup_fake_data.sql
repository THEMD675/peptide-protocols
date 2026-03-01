-- CLEANUP: Remove all fake/test data from the database
-- This migration removes data that was manually inserted during development
-- and does not represent real user activity

-- 1. Remove fake subscription rows (no Stripe subscription ID = not a real payment)
DELETE FROM subscriptions WHERE stripe_subscription_id IS NULL;

-- 2. Remove seeded community posts (all from one test user, created before real launch)
DELETE FROM community_logs WHERE user_id = '6210c102-d386-4705-830c-effc40e8195b';

-- 3. Remove test enquiry
DELETE FROM enquiries WHERE email = 'test-elite@pptides.com';
