-- Notification center table
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('blog', 'streak', 'trial', 'achievement')),
  title_ar text not null,
  body_ar text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_unread
  on notifications (user_id, read, created_at desc);

alter table notifications enable row level security;

create policy "Users can read own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on notifications for update
  using (auth.uid() = user_id);

-- Allow service role to insert (edge functions, crons)
-- RLS select/update restricted to owner

-- Also allow users to delete their own coach conversations (for Feature 3)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'coach_conversations' and policyname = 'Users can delete own conversation'
  ) then
    create policy "Users can delete own conversation"
      on coach_conversations for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- Allow users to read their own ai_coach_requests for history display
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'ai_coach_requests' and policyname = 'Users can read own requests'
  ) then
    create policy "Users can read own requests"
      on ai_coach_requests for select
      using (auth.uid() = user_id);
  end if;
end$$;
