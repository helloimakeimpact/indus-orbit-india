-- Idempotent Thread creation may return an existing row, but only when the
-- caller is allowed to open it. This prevents private Thread metadata leakage.

create or replace function public.create_my_conversation_thread(
  _room_id uuid,
  _parent_message_id uuid,
  _title text,
  _visibility text,
  _client_request_id uuid
)
returns public.conversation_threads
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  existing public.conversation_threads%rowtype;
  created public.conversation_threads%rowtype;
begin
  if actor_id is null or not private.can_create_conversation_thread(_room_id) then
    raise exception 'Thread creation is not allowed in this Room' using errcode = '42501';
  end if;
  if _client_request_id is null or _visibility not in ('room', 'private') then
    raise exception 'Thread request is invalid';
  end if;
  if _title is not null and char_length(btrim(_title)) not between 1 and 160 then
    raise exception 'Thread title must be 1 to 160 characters';
  end if;
  if _parent_message_id is not null and not exists (
    select 1 from public.conversation_messages as message
    where message.id = _parent_message_id
      and message.room_id = _room_id
      and message.thread_id is null
      and message.deleted_at is null
  ) then
    raise exception 'Parent message does not belong to this Room';
  end if;

  select thread.* into existing
  from public.conversation_threads as thread
  where thread.created_by = actor_id
    and thread.client_request_id = _client_request_id;
  if found then
    if not private.can_access_conversation_thread(existing.id) then
      raise exception 'Thread access is required' using errcode = '42501';
    end if;
    return existing;
  end if;

  if _parent_message_id is not null then
    select thread.* into existing
    from public.conversation_threads as thread
    where thread.room_id = _room_id
      and thread.parent_message_id = _parent_message_id;
    if found then
      if not private.can_access_conversation_thread(existing.id) then
        raise exception 'Thread access is required' using errcode = '42501';
      end if;
      return existing;
    end if;
  end if;

  insert into public.conversation_threads (
    room_id,
    parent_message_id,
    title,
    visibility,
    created_by,
    client_request_id
  ) values (
    _room_id,
    _parent_message_id,
    nullif(btrim(_title), ''),
    _visibility,
    actor_id,
    _client_request_id
  ) returning * into created;

  if _visibility = 'private' then
    insert into public.conversation_thread_members (thread_id, user_id, added_by)
    values (created.id, actor_id, actor_id);
  end if;
  return created;
end;
$function$;

revoke all on function public.create_my_conversation_thread(
  uuid, uuid, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.create_my_conversation_thread(
  uuid, uuid, text, text, uuid
) to authenticated, service_role;

comment on function public.create_my_conversation_thread(uuid, uuid, text, text, uuid) is
  'Creates a caller-authorized Thread or returns an existing parent Thread only when the caller can access it.';
