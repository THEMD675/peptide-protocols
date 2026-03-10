-- Abandoned checkout tracking for recovery emails
create table if not exists public.abandoned_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  email text not null,
  tier text,
  stripe_session_id text unique,
  created_at timestamptz default now(),
  recovery_email_sent_at timestamptz,
  recovered boolean default false
);

-- RLS: only service_role can access
alter table public.abandoned_checkouts enable row level security;
-- No RLS policies = only service_role (bypasses RLS) can read/write

-- Index for the cron recovery query
create index if not exists idx_abandoned_checkouts_recovery
  on public.abandoned_checkouts (recovery_email_sent_at, recovered)
  where recovery_email_sent_at is null and recovered = false;
