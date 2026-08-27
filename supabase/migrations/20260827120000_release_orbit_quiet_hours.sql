-- Turn the existing quiet_hours JSON foundation into a validated caller-bound
-- policy and central delivery-window resolver. Message content never enters the
-- delivery policy or private outbox.

create or replace function private.resolve_conversation_notification_delivery(
  _user_id uuid,
  _space_id uuid,
  _room_id uuid,
  _at timestamptz default statement_timestamp()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  _preference text := 'default';
  _quiet jsonb := '{}'::jsonb;
  _timezone text := 'UTC';
  _quiet_enabled boolean := false;
  _quiet_start time;
  _quiet_end time;
  _digest_hour integer := 8;
  _local_now timestamp;
  _local_target timestamp;
  _quiet_active boolean := false;
  _next_delivery_at timestamptz;
  _digest_at timestamptz;
begin
  select preference.preference, preference.quiet_hours
  into _preference, _quiet
  from public.conversation_notification_preferences as preference
  where preference.user_id = _user_id
    and preference.space_id = _space_id
    and (preference.room_id = _room_id or preference.room_id is null)
  order by (preference.room_id is not null) desc, preference.updated_at desc
  limit 1;

  _preference := coalesce(_preference, 'default');
  _quiet := coalesce(_quiet, '{}'::jsonb);
  _timezone := coalesce(nullif(_quiet ->> 'timezone', ''), 'UTC');
  if not exists (
    select 1 from pg_catalog.pg_timezone_names as zone where zone.name = _timezone
  ) then
    _timezone := 'UTC';
  end if;
  _quiet_enabled := coalesce((_quiet ->> 'enabled')::boolean, false);
  _digest_hour := coalesce((_quiet ->> 'digestHour')::integer, 8);
  _local_now := _at at time zone _timezone;

  if _quiet_enabled
     and coalesce(_quiet ->> 'start', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     and coalesce(_quiet ->> 'end', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    _quiet_start := (_quiet ->> 'start')::time;
    _quiet_end := (_quiet ->> 'end')::time;
    if _quiet_start < _quiet_end then
      _quiet_active := _local_now::time >= _quiet_start and _local_now::time < _quiet_end;
      _local_target := _local_now::date + _quiet_end;
    else
      _quiet_active := _local_now::time >= _quiet_start or _local_now::time < _quiet_end;
      _local_target := _local_now::date + _quiet_end
        + case when _local_now::time >= _quiet_start then interval '1 day' else interval '0' end;
    end if;
    if _quiet_active then
      _next_delivery_at := _local_target at time zone _timezone;
    end if;
  end if;

  if _preference = 'digest' then
    _local_target := _local_now::date
      + pg_catalog.make_interval(hours => greatest(0, least(23, _digest_hour)));
    if _local_target <= _local_now then
      _local_target := _local_target + interval '1 day';
    end if;
    _digest_at := _local_target at time zone _timezone;
    _next_delivery_at := case
      when _next_delivery_at is null then _digest_at
      else greatest(_next_delivery_at, _digest_at)
    end;
  end if;

  return pg_catalog.jsonb_build_object(
    'preference', _preference,
    'quietHours', _quiet,
    'quietActive', _quiet_active,
    'nextDeliveryAt', _next_delivery_at
  );
end;
$function$;

revoke all on function private.resolve_conversation_notification_delivery(
  uuid, uuid, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function private.resolve_conversation_notification_delivery(
  uuid, uuid, uuid, timestamptz
) to service_role;

create or replace function public.set_my_conversation_attention_policy(
  _space_id uuid,
  _room_id uuid,
  _preference text,
  _timezone text,
  _quiet_enabled boolean,
  _quiet_start text,
  _quiet_end text,
  _digest_hour integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  _actor_id uuid := (select auth.uid());
  _quiet jsonb;
begin
  if _actor_id is null
     or _preference not in ('default', 'all', 'mentions', 'digest', 'mute')
     or _digest_hour not between 0 and 23
     or not exists (
       select 1 from pg_catalog.pg_timezone_names as zone where zone.name = _timezone
     )
     or (_quiet_enabled and (
       coalesce(_quiet_start, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(_quiet_end, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or _quiet_start = _quiet_end
     ))
     or not private.can_access_conversation_space(_space_id)
     or (
       _room_id is not null
       and not exists (
         select 1 from public.conversation_rooms as room
         where room.id = _room_id and room.space_id = _space_id and room.archived_at is null
       )
     ) then
    raise exception 'Invalid attention policy' using errcode = '42501';
  end if;

  _quiet := pg_catalog.jsonb_build_object(
    'policyVersion', 1,
    'timezone', _timezone,
    'enabled', _quiet_enabled,
    'start', case when _quiet_enabled then _quiet_start else null end,
    'end', case when _quiet_enabled then _quiet_end else null end,
    'digestHour', _digest_hour
  );

  insert into public.conversation_notification_preferences (
    user_id, space_id, room_id, preference, quiet_hours, updated_at
  ) values (
    _actor_id, _space_id, _room_id, _preference, _quiet, statement_timestamp()
  )
  on conflict (user_id, space_id, room_id) do update
  set preference = excluded.preference,
      quiet_hours = excluded.quiet_hours,
      updated_at = excluded.updated_at;

  return pg_catalog.jsonb_build_object(
    'spaceId', _space_id,
    'roomId', _room_id,
    'preference', _preference,
    'quietHours', _quiet
  );
end;
$function$;

revoke all on function public.set_my_conversation_attention_policy(
  uuid, uuid, text, text, boolean, text, text, integer
) from public, anon;
grant execute on function public.set_my_conversation_attention_policy(
  uuid, uuid, text, text, boolean, text, text, integer
) to authenticated, service_role;

create or replace function public.get_my_conversation_room_controls(_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  room_row public.conversation_rooms%rowtype;
  delivery_policy jsonb;
begin
  select room.* into room_row
  from public.conversation_rooms as room
  where room.id = _room_id;

  if actor_id is null
     or room_row.id is null
     or not private.can_access_conversation_room(_room_id) then
    raise exception 'Room not found' using errcode = '42501';
  end if;

  delivery_policy := private.resolve_conversation_notification_delivery(
    actor_id, room_row.space_id, _room_id, statement_timestamp()
  );

  return pg_catalog.jsonb_build_object(
    'roomId', _room_id,
    'preference', delivery_policy ->> 'preference',
    'quietHours', coalesce(delivery_policy -> 'quietHours', '{}'::jsonb),
    'quietActive', coalesce((delivery_policy ->> 'quietActive')::boolean, false),
    'nextDeliveryAt', delivery_policy ->> 'nextDeliveryAt',
    'bookmarkedMessageIds', coalesce((
      select pg_catalog.jsonb_agg(bookmark.message_id order by bookmark.created_at desc)
      from public.conversation_bookmarks as bookmark
      join public.conversation_messages as message on message.id = bookmark.message_id
      where bookmark.user_id = actor_id and message.room_id = _room_id
    ), '[]'::jsonb),
    'pinnedMessageIds', coalesce((
      select pg_catalog.jsonb_agg(pin.message_id order by pin.pinned_at desc)
      from public.conversation_pins as pin
      where pin.room_id = _room_id
    ), '[]'::jsonb),
    'followedThreadIds', coalesce((
      select pg_catalog.jsonb_agg(follow.thread_id order by follow.updated_at desc)
      from public.conversation_thread_follows as follow
      join public.conversation_threads as thread on thread.id = follow.thread_id
      where follow.user_id = actor_id and thread.room_id = _room_id
    ), '[]'::jsonb),
    'unreadThreadIds', coalesce((
      select pg_catalog.jsonb_agg(follow.thread_id order by follow.updated_at desc)
      from public.conversation_thread_follows as follow
      join public.conversation_threads as thread on thread.id = follow.thread_id
      where follow.user_id = actor_id
        and thread.room_id = _room_id
        and exists (
          select 1
          from public.conversation_messages as message
          where message.thread_id = follow.thread_id
            and message.deleted_at is null
            and message.author_id <> actor_id
            and message.created_at > coalesce(follow.last_read_at, follow.followed_at)
        )
    ), '[]'::jsonb),
    'canManagePins', private.can_manage_conversation_space(room_row.space_id)
  );
end;
$function$;

create or replace function public.send_my_conversation_message_with_mentions(
  _room_id uuid,
  _thread_id uuid,
  _content text,
  _client_request_id uuid,
  _mentioned_user_ids uuid[] default '{}'::uuid[]
)
returns public.conversation_messages
language plpgsql
security definer
set search_path = ''
as $function$
declare
  _actor_id uuid := (select auth.uid());
  _space_id uuid;
  _message public.conversation_messages%rowtype;
  _normalized_mentions uuid[];
  _mentioned_user_id uuid;
  _delivery jsonb;
  _preference text;
  _event_type text;
  _next_delivery_at timestamptz;
begin
  if _actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select coalesce(pg_catalog.array_agg(subject.user_id order by subject.user_id), '{}'::uuid[])
  into _normalized_mentions
  from (
    select distinct candidate.user_id
    from pg_catalog.unnest(coalesce(_mentioned_user_ids, '{}'::uuid[])) as candidate(user_id)
    where candidate.user_id is not null and candidate.user_id <> _actor_id
  ) as subject;

  if pg_catalog.cardinality(_normalized_mentions) > 10 then
    raise exception 'A message can mention at most 10 people' using errcode = '22023';
  end if;

  select room.space_id into _space_id
  from public.conversation_rooms as room
  where room.id = _room_id and room.archived_at is null;

  if _space_id is null then
    raise exception 'Room is unavailable' using errcode = '42501';
  end if;

  if exists (
    select 1
    from pg_catalog.unnest(_normalized_mentions) as subject(user_id)
    where not exists (
      select 1 from public.conversation_space_memberships as membership
      where membership.space_id = _space_id
        and membership.user_id = subject.user_id
        and membership.membership_state = 'active'
    )
    or (
      _thread_id is not null
      and exists (
        select 1 from public.conversation_threads as thread
        where thread.id = _thread_id and thread.room_id = _room_id and thread.visibility = 'private'
      )
      and not exists (
        select 1 from public.conversation_thread_members as thread_member
        where thread_member.thread_id = _thread_id
          and thread_member.user_id = subject.user_id
          and thread_member.left_at is null
      )
    )
  ) then
    raise exception 'Every mentioned person must be able to access this conversation'
      using errcode = '42501';
  end if;

  select * into _message
  from public.send_my_conversation_message(_room_id, _thread_id, _content, _client_request_id);

  foreach _mentioned_user_id in array _normalized_mentions loop
    insert into public.conversation_mentions (message_id, mentioned_user_id)
    values (_message.id, _mentioned_user_id)
    on conflict (message_id, mentioned_user_id, mentioned_role_id) do nothing;

    if found then
      _delivery := private.resolve_conversation_notification_delivery(
        _mentioned_user_id, _space_id, _room_id, statement_timestamp()
      );
      _preference := coalesce(_delivery ->> 'preference', 'default');
      _next_delivery_at := (_delivery ->> 'nextDeliveryAt')::timestamptz;

      if _preference <> 'mute' then
        if _preference <> 'digest' then
          insert into public.notifications (user_id, type, message, link)
          values (
            _mentioned_user_id,
            'conversation_mention',
            'You were mentioned in an Orbit Room.',
            '/app/spaces/' || _space_id::text
          );
        end if;

        _event_type := case
          when _preference = 'digest' then 'conversation.mention_digest_pending'
          when coalesce((_delivery ->> 'quietActive')::boolean, false)
            then 'conversation.mention_quiet_pending'
          else 'conversation.mention_created'
        end;

        insert into private.conversation_outbox (
          event_key, event_type, aggregate_type, aggregate_id, payload, next_attempt_at
        ) values (
          'conversation.mention:' || _message.id::text || ':' || _mentioned_user_id::text,
          _event_type,
          'conversation_message',
          _message.id,
          pg_catalog.jsonb_build_object(
            'user_id', _mentioned_user_id,
            'space_id', _space_id,
            'room_id', _room_id,
            'thread_id', _thread_id,
            'delivery_policy', case
              when _preference = 'digest' then 'digest'
              when coalesce((_delivery ->> 'quietActive')::boolean, false) then 'quiet'
              else 'immediate'
            end
          ),
          coalesce(_next_delivery_at, statement_timestamp())
        ) on conflict (event_key) do nothing;
      end if;
    end if;
  end loop;

  return _message;
end;
$function$;

comment on function public.set_my_conversation_attention_policy(
  uuid, uuid, text, text, boolean, text, text, integer
) is
  'Stores a caller-bound Room/Space preference with validated IANA timezone, quiet window and digest hour.';
