-- Room slow mode is an anti-flood boundary, not a browser timer. The database
-- serializes each author's sends, preserves idempotent retries and gives Space
-- managers an explicit moderation bypass.

alter table public.conversation_rooms
  add column slow_mode_seconds integer not null default 0
  constraint conversation_rooms_slow_mode_seconds_check
  check (slow_mode_seconds in (0, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600));

create index conversation_messages_room_author_created_idx
  on public.conversation_messages (room_id, author_id, created_at desc);

create or replace function public.update_managed_conversation_room_v2(
  _room_id uuid,
  _display_name text,
  _description text,
  _posting_policy text,
  _slow_mode_seconds integer
)
returns public.conversation_rooms
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  room_row public.conversation_rooms%rowtype;
begin
  select room.* into room_row
  from public.conversation_rooms as room
  where room.id = _room_id
  for update;

  if caller_id is null or not found
    or not private.can_manage_conversation_space(room_row.space_id) then
    raise exception 'Space management access is required' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(_display_name, ''))) not between 1 and 100
    or char_length(coalesce(_description, '')) > 1000
    or _posting_policy not in ('read_only', 'owners', 'stewards', 'members')
    or _slow_mode_seconds not in (0, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600) then
    raise exception 'Room settings are invalid' using errcode = '22023';
  end if;

  update public.conversation_rooms
  set display_name = btrim(_display_name),
      description = btrim(coalesce(_description, '')),
      posting_policy = _posting_policy,
      slow_mode_seconds = _slow_mode_seconds,
      updated_at = now()
  where id = _room_id
  returning * into room_row;

  return room_row;
end;
$function$;

revoke all on function public.update_managed_conversation_room_v2(
  uuid, text, text, text, integer
) from public, anon;
grant execute on function public.update_managed_conversation_room_v2(
  uuid, text, text, text, integer
) to authenticated, service_role;

comment on function public.update_managed_conversation_room_v2(
  uuid, text, text, text, integer
) is
  'Updates manager-controlled Room identity, posting policy and the bounded database-enforced slow-mode interval.';

create or replace function public.send_my_conversation_message(
  _room_id uuid,
  _thread_id uuid,
  _content text,
  _client_request_id uuid
)
returns public.conversation_messages
language plpgsql
security definer
set search_path = ''
as $function$
declare
  _actor_id uuid := (select auth.uid());
  _clean_content text := nullif(pg_catalog.btrim(_content), '');
  _existing public.conversation_messages%rowtype;
  _created public.conversation_messages%rowtype;
  _room_space_id uuid;
  _slow_mode_seconds integer := 0;
  _last_message_at timestamptz;
  _retry_after_seconds integer;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if _client_request_id is null then
    raise exception using errcode = '22004', message = 'Client request ID is required';
  end if;

  select room.space_id, room.slow_mode_seconds
  into _room_space_id, _slow_mode_seconds
  from public.conversation_rooms as room
  where room.id = _room_id and room.archived_at is null;

  if _room_space_id is null
    or public.is_suspended(_actor_id)
    or not private.can_post_conversation_room(_room_id) then
    raise exception using errcode = '42501', message = 'Posting is not allowed in this Room';
  end if;
  if _clean_content is null or pg_catalog.char_length(_clean_content) > 4000 then
    raise exception using errcode = '22023', message = 'Message must be 1 to 4,000 characters';
  end if;
  if _thread_id is not null and not exists (
    select 1
    from public.conversation_threads as thread
    where thread.id = _thread_id
      and thread.room_id = _room_id
      and thread.archived_at is null
      and thread.locked_at is null
      and private.can_access_conversation_thread(thread.id)
  ) then
    raise exception using errcode = '42501', message = 'Thread is unavailable for posting';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('space-message:' || _actor_id::text, 0)
  );

  select message.* into _existing
  from public.conversation_messages as message
  where message.author_id = _actor_id
    and message.client_request_id = _client_request_id;

  if found then
    if _existing.room_id <> _room_id
      or _existing.thread_id is distinct from _thread_id
      or _existing.content <> _clean_content then
      raise exception using errcode = '22023',
        message = 'Client request ID was already used for another message';
    end if;
    return _existing;
  end if;

  if _slow_mode_seconds > 0
    and not private.can_manage_conversation_space(_room_space_id) then
    select message.created_at into _last_message_at
    from public.conversation_messages as message
    where message.room_id = _room_id
      and message.author_id = _actor_id
    order by message.created_at desc
    limit 1;

    if _last_message_at is not null
      and _last_message_at + (_slow_mode_seconds * interval '1 second') > statement_timestamp() then
      _retry_after_seconds := greatest(
        1,
        pg_catalog.ceil(
          extract(
            epoch from (
              _last_message_at
              + (_slow_mode_seconds * interval '1 second')
              - statement_timestamp()
            )
          )
        )::integer
      );
      raise exception using
        errcode = 'P0001',
        message = 'Room slow mode is active',
        detail = pg_catalog.jsonb_build_object(
          'retryAfterSeconds', _retry_after_seconds
        )::text,
        hint = 'Wait before sending another message in this Room';
    end if;
  end if;

  if (
    select count(*)
    from public.conversation_messages as message
    where message.author_id = _actor_id
      and message.created_at >= now() - interval '1 minute'
  ) >= 30 then
    raise exception using errcode = 'P0001', message = 'Message rate limit exceeded; try again shortly';
  end if;

  insert into public.conversation_messages (
    room_id, thread_id, author_id, content, client_request_id
  ) values (
    _room_id, _thread_id, _actor_id, _clean_content, _client_request_id
  ) returning * into _created;

  if _thread_id is not null then
    update public.conversation_threads
    set updated_at = now()
    where id = _thread_id;
  end if;

  insert into private.conversation_outbox (
    event_key, event_type, aggregate_type, aggregate_id, payload
  ) values (
    'conversation.message_created:' || _created.id::text,
    'conversation.message_created',
    'conversation_message',
    _created.id,
    pg_catalog.jsonb_build_object(
      'room_id', _room_id,
      'thread_id', _thread_id,
      'author_id', _actor_id
    )
  ) on conflict (event_key) do nothing;

  return _created;
end;
$function$;

comment on function public.send_my_conversation_message(uuid, uuid, text, uuid) is
  'Sends one idempotent Room/Thread message with caller access, global burst and database-enforced per-Room slow-mode checks.';
