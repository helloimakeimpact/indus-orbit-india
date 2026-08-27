-- Release explicit person mentions for Orbit Rooms and Threads. The message,
-- mention rows, private delivery intent and in-app notification are one atomic
-- caller-bound transaction. Outbox payloads never contain message content.

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
  _preference text;
begin
  if _actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select coalesce(pg_catalog.array_agg(subject.user_id order by subject.user_id), '{}'::uuid[])
  into _normalized_mentions
  from (
    select distinct candidate.user_id
    from pg_catalog.unnest(coalesce(_mentioned_user_ids, '{}'::uuid[])) as candidate(user_id)
    where candidate.user_id is not null
      and candidate.user_id <> _actor_id
  ) as subject;

  if pg_catalog.cardinality(_normalized_mentions) > 10 then
    raise exception 'A message can mention at most 10 people' using errcode = '22023';
  end if;

  select room.space_id
  into _space_id
  from public.conversation_rooms as room
  where room.id = _room_id
    and room.archived_at is null;

  if _space_id is null then
    raise exception 'Room is unavailable' using errcode = '42501';
  end if;

  if exists (
    select 1
    from pg_catalog.unnest(_normalized_mentions) as subject(user_id)
    where not exists (
      select 1
      from public.conversation_space_memberships as membership
      where membership.space_id = _space_id
        and membership.user_id = subject.user_id
        and membership.membership_state = 'active'
    )
      or (
        _thread_id is not null
        and exists (
          select 1
          from public.conversation_threads as thread
          where thread.id = _thread_id
            and thread.room_id = _room_id
            and thread.visibility = 'private'
        )
        and not exists (
          select 1
          from public.conversation_thread_members as thread_member
          where thread_member.thread_id = _thread_id
            and thread_member.user_id = subject.user_id
            and thread_member.left_at is null
        )
      )
  ) then
    raise exception 'Every mentioned person must be able to access this conversation'
      using errcode = '42501';
  end if;

  select *
  into _message
  from public.send_my_conversation_message(
    _room_id,
    _thread_id,
    _content,
    _client_request_id
  );

  foreach _mentioned_user_id in array _normalized_mentions loop
    insert into public.conversation_mentions (message_id, mentioned_user_id)
    values (_message.id, _mentioned_user_id)
    on conflict (message_id, mentioned_user_id, mentioned_role_id) do nothing;

    if found then
      select preference.preference
      into _preference
      from public.conversation_notification_preferences as preference
      where preference.user_id = _mentioned_user_id
        and preference.space_id = _space_id
        and (preference.room_id = _room_id or preference.room_id is null)
      order by (preference.room_id is not null) desc
      limit 1;

      _preference := coalesce(_preference, 'default');

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

        insert into private.conversation_outbox (
          event_key,
          event_type,
          aggregate_type,
          aggregate_id,
          payload
        ) values (
          'conversation.mention:' || _message.id::text || ':' || _mentioned_user_id::text,
          case
            when _preference = 'digest' then 'conversation.mention_digest_pending'
            else 'conversation.mention_created'
          end,
          'conversation_message',
          _message.id,
          pg_catalog.jsonb_build_object(
            'user_id', _mentioned_user_id,
            'space_id', _space_id,
            'room_id', _room_id,
            'thread_id', _thread_id
          )
        ) on conflict (event_key) do nothing;
      end if;
    end if;
  end loop;

  return _message;
end;
$function$;

revoke all on function public.send_my_conversation_message_with_mentions(
  uuid, uuid, text, uuid, uuid[]
) from public, anon;
grant execute on function public.send_my_conversation_message_with_mentions(
  uuid, uuid, text, uuid, uuid[]
) to authenticated, service_role;

comment on function public.send_my_conversation_message_with_mentions(
  uuid, uuid, text, uuid, uuid[]
) is
  'Sends one caller-bound Room/Thread message with up to ten accessible person mentions and content-free preference-aware delivery evidence.';
