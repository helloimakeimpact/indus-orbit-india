-- Private, participant-authorized delivery for the durable terminal metadata
-- timeline. Only the existing allow-listed metadata event row is broadcast;
-- prompts, responses, commands, output, paths and credentials never enter it.

create or replace function private.can_receive_io_terminal_broadcast(_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  session_id uuid;
begin
  if _topic !~ '^io-terminal:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  session_id := pg_catalog.split_part(_topic, ':', 2)::uuid;
  return private.io_terminal_has_session_role(session_id, null);
exception when invalid_text_representation then
  return false;
end;
$function$;

revoke all on function private.can_receive_io_terminal_broadcast(text)
  from public, anon, authenticated, service_role;
grant execute on function private.can_receive_io_terminal_broadcast(text)
  to authenticated, service_role;

create policy "Terminal members receive private metadata broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and private.can_receive_io_terminal_broadcast((select realtime.topic()))
);

create or replace function private.broadcast_io_terminal_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform realtime.broadcast_changes(
    'io-terminal:' || new.session_id::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    null
  );
  return null;
end;
$function$;

revoke all on function private.broadcast_io_terminal_event()
  from public, anon, authenticated, service_role;

create trigger broadcast_io_terminal_event
after insert on public.io_terminal_session_events
for each row execute function private.broadcast_io_terminal_event();

comment on function private.can_receive_io_terminal_broadcast(text) is
  'Authorizes exact private terminal metadata topics for current active session members only.';
comment on function private.broadcast_io_terminal_event() is
  'Broadcasts allow-listed durable terminal metadata rows to the exact private session topic.';
