insert into public.bytefisher_messages (name, message, session_id, created_at)
values
  ('Neo', 'Wake up...', 'seed', now() - interval '100 seconds'),
  ('Morpheus', 'Free your mind.', 'seed', now() - interval '200 seconds'),
  ('Trinity', 'Dodge this.', 'seed', now() - interval '300 seconds'),
  ('CrashOverride', 'HACK THE PLANET!', 'seed', now() - interval '400 seconds');
