alter table public.treehole_messages
  add column if not exists email text,
  add column if not exists client_ip text,
  add column if not exists user_agent text,
  add column if not exists accept_language text,
  add column if not exists referer text,
  add column if not exists origin text,
  add column if not exists cf_country text,
  add column if not exists client_timezone text,
  add column if not exists client_language text,
  add column if not exists client_platform text,
  add column if not exists client_screen text,
  add column if not exists client_viewport text;

do $$
begin
  alter table public.treehole_messages
    add constraint treehole_email_length check (
      email is null or char_length(email) <= 254
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.treehole_messages
    add constraint treehole_email_format check (
      email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    );
exception
  when duplicate_object then null;
end $$;

revoke select on public.treehole_messages from anon, authenticated;
grant select (id, nickname, content, created_at, status)
  on public.treehole_messages
  to anon, authenticated;
