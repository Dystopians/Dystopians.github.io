create extension if not exists "pgcrypto" with schema "extensions";

create table if not exists public.treehole_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nickname text not null default 'Anonymous',
  content text not null,
  mood text not null default 'whisper',
  status text not null default 'published',
  session_hash text not null,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  constraint treehole_messages_nickname_length check (
    char_length(nickname) between 1 and 24
  ),
  constraint treehole_messages_content_length check (
    char_length(content) between 2 and 800
  ),
  constraint treehole_messages_mood_allowed check (
    mood in ('whisper', 'spark', 'rain', 'memory', 'question')
  ),
  constraint treehole_messages_status_allowed check (
    status in ('published', 'hidden', 'flagged')
  )
);

create index if not exists treehole_messages_public_idx
  on public.treehole_messages (status, created_at desc);

create index if not exists treehole_messages_session_idx
  on public.treehole_messages (session_hash, created_at desc);

create index if not exists treehole_messages_ip_idx
  on public.treehole_messages (ip_hash, created_at desc);

alter table public.treehole_messages enable row level security;

revoke all on public.treehole_messages from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.treehole_messages to anon, authenticated;

drop policy if exists "read published treehole messages" on public.treehole_messages;
create policy "read published treehole messages"
  on public.treehole_messages
  for select
  to anon, authenticated
  using (status = 'published');

comment on table public.treehole_messages is
  'Anonymous treehole messages submitted through the treehole-submit Edge Function.';
