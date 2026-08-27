-- Role mentions are manager-only, bounded, and expanded only to members who can
-- read the Room. Private Threads deliberately reject role fan-out.

create or replace function private.can_conversation_member_access_room(
  _user_id uuid,
  _room_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.conversation_rooms as room
    join public.conversation_space_memberships as membership
      on membership.space_id = room.space_id
      and membership.user_id = _user_id
      and membership.membership_state = 'active'
    where room.id = _room_id
      and room.archived_at is null
      and not exists (
        select 1
        from public.conversation_room_permission_overrides as override_row
        left join public.conversation_space_role_members as role_member
          on role_member.role_id = override_row.role_id
          and role_member.user_id = _user_id
        where override_row.room_id = room.id
          and override_row.capability = 'room.view'
          and override_row.effect = 'deny'
          and (override_row.user_id = _user_id or role_member.user_id is not null)
      )
      and (
        room.visibility = 'members'
        or exists (
          select 1
          from public.conversation_room_permission_overrides as override_row
          left join public.conversation_space_role_members as role_member
            on role_member.role_id = override_row.role_id
            and role_member.user_id = _user_id
          where override_row.room_id = room.id
            and override_row.capability = 'room.view'
            and override_row.effect = 'allow'
            and (override_row.user_id = _user_id or role_member.user_id is not null)
        )
      )
  );
$function$;

create or replace function private.can_conversation_member_access_thread(
  _user_id uuid,
  _thread_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.conversation_threads as thread
    where thread.id = _thread_id
      and private.can_conversation_member_access_room(_user_id, thread.room_id)
      and (
        thread.visibility = 'room'
        or thread.created_by = _user_id
        or exists (
          select 1
          from public.conversation_thread_members as member
          where member.thread_id = thread.id
            and member.user_id = _user_id
            and member.left_at is null
        )
      )
  );
$function$;

revoke all on function private.can_conversation_member_access_room(uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.can_conversation_member_access_thread(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.can_conversation_member_access_room(uuid, uuid) to service_role;
grant execute on function private.can_conversation_member_access_thread(uuid, uuid) to service_role;

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
    where case
      when _thread_id is null
        then not private.can_conversation_member_access_room(subject.user_id, _room_id)
      else not private.can_conversation_member_access_thread(subject.user_id, _thread_id)
    end
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

create or replace function public.send_my_conversation_message_with_audience(
  _room_id uuid,
  _thread_id uuid,
  _content text,
  _client_request_id uuid,
  _mentioned_user_ids uuid[] default '{}'::uuid[],
  _mentioned_role_ids uuid[] default '{}'::uuid[]
)
returns public.conversation_messages
language plpgsql
security definer
set search_path = ''
as $function$
declare
  _actor_id uuid := (select auth.uid());
  _space_id uuid;
  _normalized_roles uuid[];
  _normalized_users uuid[];
  _role_recipients uuid[];
  _role_id uuid;
  _recipient_id uuid;
  _message public.conversation_messages%rowtype;
  _delivery jsonb;
  _preference text;
  _event_type text;
  _next_delivery_at timestamptz;
begin
  if _actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select coalesce(pg_catalog.array_agg(subject.user_id order by subject.user_id), '{}'::uuid[])
  into _normalized_users
  from (
    select distinct candidate.user_id
    from pg_catalog.unnest(coalesce(_mentioned_user_ids, '{}'::uuid[])) as candidate(user_id)
    where candidate.user_id is not null and candidate.user_id <> _actor_id
  ) as subject;

  select coalesce(pg_catalog.array_agg(subject.role_id order by subject.role_id), '{}'::uuid[])
  into _normalized_roles
  from (
    select distinct candidate.role_id
    from pg_catalog.unnest(coalesce(_mentioned_role_ids, '{}'::uuid[])) as candidate(role_id)
    where candidate.role_id is not null
  ) as subject;

  if pg_catalog.cardinality(_normalized_roles) > 3 then
    raise exception 'A message can mention at most 3 roles' using errcode = '22023';
  end if;

  select room.space_id into _space_id
  from public.conversation_rooms as room
  where room.id = _room_id and room.archived_at is null;

  if _space_id is null then
    raise exception 'Room is unavailable' using errcode = '42501';
  end if;

  if pg_catalog.cardinality(_normalized_roles) > 0 then
    if not private.can_manage_conversation_space(_space_id) then
      raise exception 'Only Space managers can mention roles' using errcode = '42501';
    end if;
    if _thread_id is not null and exists (
      select 1 from public.conversation_threads as thread
      where thread.id = _thread_id and thread.room_id = _room_id and thread.visibility = 'private'
    ) then
      raise exception 'Role mentions are unavailable in private Threads' using errcode = '42501';
    end if;
    if exists (
      select 1 from pg_catalog.unnest(_normalized_roles) as subject(role_id)
      where not exists (
        select 1 from public.conversation_space_roles as role_row
        where role_row.id = subject.role_id and role_row.space_id = _space_id
      )
    ) then
      raise exception 'Every mentioned role must belong to this Space' using errcode = '42501';
    end if;
  end if;

  select coalesce(pg_catalog.array_agg(recipient.user_id order by recipient.user_id), '{}'::uuid[])
  into _role_recipients
  from (
    select distinct role_member.user_id
    from public.conversation_space_role_members as role_member
    where role_member.role_id = any(_normalized_roles)
      and role_member.user_id <> _actor_id
      and not (role_member.user_id = any(_normalized_users))
      and case
        when _thread_id is null
          then private.can_conversation_member_access_room(role_member.user_id, _room_id)
        else private.can_conversation_member_access_thread(role_member.user_id, _thread_id)
      end
  ) as recipient;

  if pg_catalog.cardinality(_role_recipients) > 30 then
    raise exception 'Role mentions are limited to 30 recipients per message' using errcode = '22023';
  end if;

  select * into _message
  from public.send_my_conversation_message_with_mentions(
    _room_id, _thread_id, _content, _client_request_id, _normalized_users
  );

  foreach _role_id in array _normalized_roles loop
    insert into public.conversation_mentions (message_id, mentioned_role_id)
    values (_message.id, _role_id)
    on conflict (message_id, mentioned_user_id, mentioned_role_id) do nothing;
  end loop;

  foreach _recipient_id in array _role_recipients loop
    _delivery := private.resolve_conversation_notification_delivery(
      _recipient_id, _space_id, _room_id, statement_timestamp()
    );
    _preference := coalesce(_delivery ->> 'preference', 'default');
    _next_delivery_at := (_delivery ->> 'nextDeliveryAt')::timestamptz;

    if _preference <> 'mute' then
      if _preference <> 'digest' then
        insert into public.notifications (user_id, type, message, link)
        values (
          _recipient_id,
          'conversation_role_mention',
          'A role you belong to was mentioned in an Orbit Room.',
          '/app/spaces/' || _space_id::text
        );
      end if;

      _event_type := case
        when _preference = 'digest' then 'conversation.role_mention_digest_pending'
        when coalesce((_delivery ->> 'quietActive')::boolean, false)
          then 'conversation.role_mention_quiet_pending'
        else 'conversation.role_mention_created'
      end;

      insert into private.conversation_outbox (
        event_key, event_type, aggregate_type, aggregate_id, payload, next_attempt_at
      ) values (
        'conversation.role_mention:' || _message.id::text || ':' || _recipient_id::text,
        _event_type,
        'conversation_message',
        _message.id,
        pg_catalog.jsonb_build_object(
          'user_id', _recipient_id,
          'space_id', _space_id,
          'room_id', _room_id,
          'thread_id', _thread_id,
          'role_ids', _normalized_roles,
          'delivery_policy', case
            when _preference = 'digest' then 'digest'
            when coalesce((_delivery ->> 'quietActive')::boolean, false) then 'quiet'
            else 'immediate'
          end
        ),
        coalesce(_next_delivery_at, statement_timestamp())
      ) on conflict (event_key) do nothing;
    end if;
  end loop;

  return _message;
end;
$function$;

revoke all on function public.send_my_conversation_message_with_audience(
  uuid, uuid, text, uuid, uuid[], uuid[]
) from public, anon;
grant execute on function public.send_my_conversation_message_with_audience(
  uuid, uuid, text, uuid, uuid[], uuid[]
) to authenticated, service_role;

comment on function public.send_my_conversation_message_with_audience(
  uuid, uuid, text, uuid, uuid[], uuid[]
) is
  'Sends one message with up to ten person mentions and three manager-only roles, capped at thirty visible role recipients with quiet/digest-aware content-free delivery evidence.';
