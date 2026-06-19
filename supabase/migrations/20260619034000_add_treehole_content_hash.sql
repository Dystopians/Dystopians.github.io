alter table public.treehole_messages
  add column if not exists content_hash text;

create index if not exists treehole_messages_content_hash_idx
  on public.treehole_messages (content_hash, created_at desc);
