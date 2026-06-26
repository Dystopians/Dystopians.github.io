create table if not exists public.bytefisher_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  message text not null,
  session_id text not null
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bytefisher_name_len'
      and conrelid = 'public.bytefisher_messages'::regclass
  ) then
    alter table public.bytefisher_messages
      add constraint bytefisher_name_len check (length(name) <= 12);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bytefisher_message_len'
      and conrelid = 'public.bytefisher_messages'::regclass
  ) then
    alter table public.bytefisher_messages
      add constraint bytefisher_message_len check (length(message) <= 50);
  end if;
end $$;

create index if not exists bytefisher_messages_created_at_idx
  on public.bytefisher_messages (created_at desc);

create index if not exists bytefisher_messages_session_idx
  on public.bytefisher_messages (session_id, created_at desc);

alter table public.bytefisher_messages enable row level security;

drop policy if exists "read messages" on public.bytefisher_messages;
drop policy if exists "insert messages" on public.bytefisher_messages;

create policy "read messages"
  on public.bytefisher_messages
  for select
  using (true);
