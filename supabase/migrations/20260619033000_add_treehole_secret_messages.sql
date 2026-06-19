alter table public.treehole_messages
  add column if not exists is_secret boolean not null default false,
  add column if not exists passcode_hash text,
  add column if not exists owner_reply text,
  add column if not exists owner_reply_at timestamptz;

do $$
begin
  alter table public.treehole_messages
    add constraint treehole_secret_passcode_required check (
      (is_secret = false and passcode_hash is null)
      or (is_secret = true and passcode_hash is not null)
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.treehole_messages
    add constraint treehole_owner_reply_length check (
      owner_reply is null or char_length(owner_reply) <= 2000
    );
exception
  when duplicate_object then null;
end $$;

create index if not exists treehole_messages_secret_lookup_idx
  on public.treehole_messages (passcode_hash, created_at desc)
  where is_secret = true;

drop policy if exists "read published treehole messages" on public.treehole_messages;
create policy "read published treehole messages"
  on public.treehole_messages
  for select
  to anon, authenticated
  using (status = 'published' and is_secret = false);

revoke select on public.treehole_messages from anon, authenticated;
grant select (id, nickname, content, created_at, status)
  on public.treehole_messages
  to anon, authenticated;

create table if not exists public.treehole_secret_lookups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  passcode_hash text not null,
  session_hash text,
  ip_hash text,
  success boolean not null default false,
  result_count integer not null default 0,
  client_ip text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists treehole_secret_lookups_ip_idx
  on public.treehole_secret_lookups (ip_hash, created_at desc);

create index if not exists treehole_secret_lookups_session_idx
  on public.treehole_secret_lookups (session_hash, created_at desc);

alter table public.treehole_secret_lookups enable row level security;

revoke all on public.treehole_secret_lookups from anon, authenticated;
