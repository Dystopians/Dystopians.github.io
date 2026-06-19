alter table public.treehole_messages
  drop constraint if exists treehole_messages_content_length;

alter table public.treehole_messages
  add constraint treehole_messages_content_length check (
    char_length(content) between 2 and 100
  );
