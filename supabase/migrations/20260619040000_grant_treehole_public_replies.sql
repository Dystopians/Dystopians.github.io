revoke select on public.treehole_messages from anon, authenticated;

grant select (id, nickname, content, created_at, status, owner_reply, owner_reply_at)
  on public.treehole_messages
  to anon, authenticated;
