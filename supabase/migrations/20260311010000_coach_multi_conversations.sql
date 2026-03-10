-- Allow multiple conversations per user (drop unique constraint on user_id)
alter table coach_conversations drop constraint if exists coach_conversations_user_id_key;

-- Add a title column for conversation identification
alter table coach_conversations add column if not exists title text;
