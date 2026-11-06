-- LinguaDesk cloud sync schema
-- Run this once in Supabase Dashboard → SQL Editor.
-- The app uses the public anon/publishable key; RLS is the security boundary.

create table if not exists public.user_records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
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

-- Authenticated users may read/write only through RLS.
grant select, insert, update, delete on public.user_records to authenticated;
revoke all on public.user_records from anon;
