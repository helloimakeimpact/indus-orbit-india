-- Release caller-bound attention controls for the existing Orbit Space schema.
-- Browser clients retain SELECT-only table access; all writes pass through
-- narrowly scoped, membership-rechecking RPCs.

create table public.conversation_thread_follows (
  thread_id uuid not null references public.conversation_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  followed_at timestamptz not null default now(),
  last_read_message_id uuid references public.conversation_messages(id) on delete set null,
  last_read_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create index conversation_thread_follows_user_updated_idx
  on public.conversation_thread_follows (user_id, updated_at desc);

alter table public.conversation_thread_follows enable row level security;
create policy conversation_thread_follows_owner_select
on public.conversation_thread_follows
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all privileges on table public.conversation_thread_follows
  from public, anon, authenticated;
grant select on table public.conversation_thread_follows to authenticated;
grant all privileges on table public.conversation_thread_follows to service_role;

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
  effective_preference text := 'default';
begin
  select room.* into room_row
  from public.conversation_rooms as room
  where room.id = _room_id;

  if actor_id is null
     or room_row.id is null
     or not private.can_access_conversation_room(_room_id) then
    raise exception 'Room not found' using errcode = '42501';
  end if;

  select preference.preference into effective_preference
  from public.conversation_notification_preferences as preference
  where preference.user_id = actor_id
    and preference.space_id = room_row.space_id
    and (preference.room_id = _room_id or preference.room_id is null)
  order by preference.room_id is null, preference.updated_at desc
  limit 1;

  return jsonb_build_object(
    'roomId', _room_id,
    'preference', coalesce(effective_preference, 'default'),
    'bookmarkedMessageIds', coalesce((
      select jsonb_agg(bookmark.message_id order by bookmark.created_at desc)
      from public.conversation_bookmarks as bookmark
      join public.conversation_messages as message on message.id = bookmark.message_id
      where bookmark.user_id = actor_id and message.room_id = _room_id
    ), '[]'::jsonb),
    'pinnedMessageIds', coalesce((
      select jsonb_agg(pin.message_id order by pin.pinned_at desc)
      from public.conversation_pins as pin
      where pin.room_id = _room_id
    ), '[]'::jsonb),
    'followedThreadIds', coalesce((
      select jsonb_agg(follow.thread_id order by follow.updated_at desc)
      from public.conversation_thread_follows as follow
      join public.conversation_threads as thread on thread.id = follow.thread_id
      where follow.user_id = actor_id and thread.room_id = _room_id
    ), '[]'::jsonb),
    'unreadThreadIds', coalesce((
      select jsonb_agg(follow.thread_id order by follow.updated_at desc)
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

create or replace function public.toggle_my_conversation_bookmark(_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  message_row public.conversation_messages%rowtype;
begin
  select message.* into message_row
  from public.conversation_messages as message
  where message.id = _message_id;

  if actor_id is null
     or message_row.id is null
     or not private.can_access_conversation_room(message_row.room_id)
     or (
       message_row.thread_id is not null
       and not private.can_access_conversation_thread(message_row.thread_id)
     ) then
    raise exception 'Message not found' using errcode = '42501';
  end if;

  delete from public.conversation_bookmarks
  where user_id = actor_id and message_id = _message_id;
  if found then
    return jsonb_build_object('messageId', _message_id, 'bookmarked', false);
  end if;

  insert into public.conversation_bookmarks (user_id, message_id)
  values (actor_id, _message_id);
  return jsonb_build_object('messageId', _message_id, 'bookmarked', true);
end;
$function$;

create or replace function public.toggle_managed_conversation_pin(_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  message_row public.conversation_messages%rowtype;
  space_id uuid;
begin
  select message.* into message_row
  from public.conversation_messages as message
  where message.id = _message_id;

  if message_row.id is not null then
    select room.space_id into space_id
    from public.conversation_rooms as room
    where room.id = message_row.room_id;
  end if;

  if actor_id is null
     or message_row.id is null
     or not private.can_manage_conversation_space(space_id) then
    raise exception 'Message not found' using errcode = '42501';
  end if;

  delete from public.conversation_pins
  where room_id = message_row.room_id and message_id = _message_id;
  if found then
    return jsonb_build_object('messageId', _message_id, 'pinned', false);
  end if;

  insert into public.conversation_pins (room_id, message_id, pinned_by)
  values (message_row.room_id, _message_id, actor_id);
  return jsonb_build_object('messageId', _message_id, 'pinned', true);
end;
$function$;

create or replace function public.set_my_conversation_thread_follow(
  _thread_id uuid,
  _follow boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null or not private.can_access_conversation_thread(_thread_id) then
    raise exception 'Thread not found' using errcode = '42501';
  end if;

  if _follow then
    insert into public.conversation_thread_follows (thread_id, user_id)
    values (_thread_id, actor_id)
    on conflict (thread_id, user_id) do update
    set followed_at = statement_timestamp(),
        updated_at = statement_timestamp();
  else
    delete from public.conversation_thread_follows
    where thread_id = _thread_id and user_id = actor_id;
  end if;

  return jsonb_build_object('threadId', _thread_id, 'following', _follow);
end;
$function$;

create or replace function public.mark_my_conversation_thread_read(
  _thread_id uuid,
  _message_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null
     or not private.can_access_conversation_thread(_thread_id)
     or not exists (
       select 1 from public.conversation_messages as message
       where message.id = _message_id and message.thread_id = _thread_id
     ) then
    raise exception 'Thread message not found' using errcode = '42501';
  end if;

  insert into public.conversation_thread_follows (
    thread_id, user_id, last_read_message_id, last_read_at, updated_at
  ) values (
    _thread_id, actor_id, _message_id, statement_timestamp(), statement_timestamp()
  )
  on conflict (thread_id, user_id) do update
  set last_read_message_id = excluded.last_read_message_id,
      last_read_at = excluded.last_read_at,
      updated_at = excluded.updated_at;
end;
$function$;

create or replace function public.set_my_conversation_notification_preference(
  _space_id uuid,
  _room_id uuid,
  _preference text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null
     or _preference not in ('default', 'all', 'mentions', 'digest', 'mute')
     or not private.can_access_conversation_space(_space_id)
     or (
       _room_id is not null
       and not exists (
         select 1 from public.conversation_rooms as room
         where room.id = _room_id and room.space_id = _space_id
       )
     ) then
    raise exception 'Invalid notification preference' using errcode = '42501';
  end if;

  insert into public.conversation_notification_preferences (
    user_id, space_id, room_id, preference, updated_at
  ) values (
    actor_id, _space_id, _room_id, _preference, statement_timestamp()
  )
  on conflict (user_id, space_id, room_id) do update
  set preference = excluded.preference,
      updated_at = excluded.updated_at;

  return jsonb_build_object(
    'spaceId', _space_id,
    'roomId', _room_id,
    'preference', _preference
  );
end;
$function$;

revoke all on function public.get_my_conversation_room_controls(uuid)
  from public, anon;
revoke all on function public.toggle_my_conversation_bookmark(uuid)
  from public, anon;
revoke all on function public.toggle_managed_conversation_pin(uuid)
  from public, anon;
revoke all on function public.set_my_conversation_thread_follow(uuid, boolean)
  from public, anon;
revoke all on function public.mark_my_conversation_thread_read(uuid, uuid)
  from public, anon;
revoke all on function public.set_my_conversation_notification_preference(uuid, uuid, text)
  from public, anon;

grant execute on function public.get_my_conversation_room_controls(uuid)
  to authenticated, service_role;
grant execute on function public.toggle_my_conversation_bookmark(uuid)
  to authenticated, service_role;
grant execute on function public.toggle_managed_conversation_pin(uuid)
  to authenticated, service_role;
grant execute on function public.set_my_conversation_thread_follow(uuid, boolean)
  to authenticated, service_role;
grant execute on function public.mark_my_conversation_thread_read(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.set_my_conversation_notification_preference(uuid, uuid, text)
  to authenticated, service_role;

comment on function public.get_my_conversation_room_controls(uuid) is
  'Caller-bound Room attention state: bookmarks, pins, followed/unread Threads and effective notification preference.';
