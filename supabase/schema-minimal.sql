-- LinguaDesk minimal sync schema.
-- Use this if the full schema.sql fails because of auth.users ownership,
-- defaults, or role grants. The app always sends user_id itself; RLS still
-- guarantees a user can only read/write their own rows.

create table if not exists public.user_records (
  user_id uuid not null,
  table_name text not null,
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at bigint not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default now(),
  primary key (user_id, table_name, record_id)
);

alter table public.user_records enable row level security;

drop policy if exists "linguadesk_own_records" on public.user_records;
create policy "linguadesk_own_records"
  on public.user_records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_records_user_table_updated_idx
  on public.user_records (user_id, table_name, updated_at desc);

grant select, insert, update, delete on public.user_records to authenticated;
