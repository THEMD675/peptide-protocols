-- Admin audit log table
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Index for fast recent-first queries
create index if not exists idx_admin_audit_log_created_at on admin_audit_log (created_at desc);

-- RLS: no public access, service_role only
alter table admin_audit_log enable row level security;

create policy "service_role can insert audit logs"
  on admin_audit_log for insert
  to service_role
  with check (true);

create policy "service_role can read audit logs"
  on admin_audit_log for select
  to service_role
  using (true);
