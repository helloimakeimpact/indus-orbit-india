create index conversation_thread_follows_last_read_message_idx
  on public.conversation_thread_follows (last_read_message_id)
  where last_read_message_id is not null;
