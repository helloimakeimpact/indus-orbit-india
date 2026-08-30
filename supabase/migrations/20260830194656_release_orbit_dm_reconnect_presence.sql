-- Private direct-message recovery and ephemeral active-conversation signals.
--
-- Durable message state remains in public.direct_messages. Typing is a
-- short-lived private Broadcast available only to the exact unblocked pair;
-- there is deliberately no last-seen or global-presence table.

drop policy if exists "Members send private direct-message signals"
on realtime.messages;

create policy "Members send private direct-message signals"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and realtime.messages.event = 'typing'
  and private.can_receive_dm_broadcast((select realtime.topic()))
);

comment on function private.can_receive_dm_broadcast(text) is
  'Authorizes an exact, unblocked direct-message pair for private message-change delivery and ephemeral active-conversation typing. No presence history is persisted.';
