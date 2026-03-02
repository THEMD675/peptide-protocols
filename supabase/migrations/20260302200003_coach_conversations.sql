-- Coach conversation history (one per user, synced across devices)
create table if not exists coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint coach_conversations_user_id_key unique (user_id)
);

create index if not exists idx_coach_conversations_user_id on coach_conversations (user_id);

alter table coach_conversations enable row level security;

create policy "Users can read own conversation"
  on coach_conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversation"
  on coach_conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversation"
  on coach_conversations for update
  using (auth.uid() = user_id);
