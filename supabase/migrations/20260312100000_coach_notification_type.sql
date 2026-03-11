-- Add 'coach' type to notifications for proactive AI coach insights
-- Must alter the CHECK constraint to allow the new type

-- Drop and recreate the constraint
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('blog', 'streak', 'trial', 'achievement', 'coach'));
