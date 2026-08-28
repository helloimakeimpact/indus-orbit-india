-- Private Threads are intentionally small, explicit audiences. Membership changes
-- are atomic and may only be made by the Thread creator or a Space manager.

create or replace function public.get_my_conversation_thread_controls(
  _thread_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  _actor_id uuid := (select auth.uid());
  _thread public.conversation_threads%rowtype;
  _space_id uuid;
  _can_manage boolean;
begin
  select thread.*
  into _thread
  from public.conversation_threads as thread
  where thread.id = _thread_id
    and thread.archived_at is null;

  select room.space_id into _space_id
  from public.conversation_rooms as room
  where room.id = _thread.room_id;

  if _actor_id is null or _thread.id is null
    or not private.can_access_conversation_thread(_thread_id) then
    raise exception 'Thread access is required' using errcode = '42501';
  end if;

  _can_manage := _thread.visibility = 'private'
    and (
      _thread.created_by = _actor_id
      or private.can_manage_conversation_space(_space_id)
    );

  return pg_catalog.jsonb_build_object(
    'threadId', _thread.id,
    'roomId', _thread.room_id,
    'visibility', _thread.visibility,
    'createdBy', _thread.created_by,
    'memberUserIds', case
      when _thread.visibility = 'private' then coalesce((
        select pg_catalog.jsonb_agg(member.user_id order by member.added_at, member.user_id)
        from public.conversation_thread_members as member
        where member.thread_id = _thread.id and member.left_at is null
      ), '[]'::jsonb)
      else '[]'::jsonb
    end,
    'memberCount', case
      when _thread.visibility = 'private' then (
        select count(*)::integer
        from public.conversation_thread_members as member
        where member.thread_id = _thread.id and member.left_at is null
      )
      else 0
    end,
    'canManageMembers', _can_manage,
    'maxMembers', 30
  );
end;
$function$;

create or replace function public.replace_managed_conversation_thread_members(
  _thread_id uuid,
  _member_user_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  _actor_id uuid := (select auth.uid());
  _thread public.conversation_threads%rowtype;
  _space_id uuid;
  _normalized_member_ids uuid[];
begin
  select thread.*
  into _thread
  from public.conversation_threads as thread
  where thread.id = _thread_id
    and thread.archived_at is null
  for update;

  select room.space_id into _space_id
  from public.conversation_rooms as room
  where room.id = _thread.room_id;

  if _actor_id is null or _thread.id is null then
    raise exception 'Thread access is required' using errcode = '42501';
  end if;
  if _thread.visibility <> 'private' then
    raise exception 'Only private Threads have an explicit member list' using errcode = '22023';
  end if;
  if _thread.created_by <> _actor_id
    and not private.can_manage_conversation_space(_space_id) then
    raise exception 'Only the Thread creator or a Space manager can change membership'
      using errcode = '42501';
  end if;

  select coalesce(
    pg_catalog.array_agg(distinct candidate.user_id order by candidate.user_id),
    '{}'::uuid[]
  )
  into _normalized_member_ids
  from pg_catalog.unnest(coalesce(_member_user_ids, '{}'::uuid[])) as candidate(user_id);

  if pg_catalog.cardinality(_normalized_member_ids) > 30 then
    raise exception 'Private Threads are limited to 30 members' using errcode = '22023';
  end if;
  if not (_thread.created_by = any(_normalized_member_ids)) then
    raise exception 'The Thread creator must remain a member' using errcode = '22023';
  end if;
  if exists (
    select 1
    from pg_catalog.unnest(_normalized_member_ids) as candidate(user_id)
    where not private.can_conversation_member_access_room(candidate.user_id, _thread.room_id)
  ) then
    raise exception 'Every private Thread member must have access to its Room'
      using errcode = '42501';
  end if;

  insert into public.conversation_thread_members (
    thread_id,
    user_id,
    added_by,
    added_at,
    left_at
  )
  select
    _thread.id,
    candidate.user_id,
    _actor_id,
    statement_timestamp(),
    null
  from pg_catalog.unnest(_normalized_member_ids) as candidate(user_id)
  on conflict (thread_id, user_id) do update
    set added_by = excluded.added_by,
        added_at = excluded.added_at,
        left_at = null;

  update public.conversation_thread_members as member
  set left_at = statement_timestamp()
  where member.thread_id = _thread.id
    and member.left_at is null
    and not (member.user_id = any(_normalized_member_ids));

  return public.get_my_conversation_thread_controls(_thread.id);
end;
$function$;

revoke all on function public.get_my_conversation_thread_controls(uuid)
  from public, anon, authenticated;
revoke all on function public.replace_managed_conversation_thread_members(uuid, uuid[])
  from public, anon, authenticated;

grant execute on function public.get_my_conversation_thread_controls(uuid)
  to authenticated, service_role;
grant execute on function public.replace_managed_conversation_thread_members(uuid, uuid[])
  to authenticated, service_role;

comment on function public.get_my_conversation_thread_controls(uuid) is
  'Returns caller-bound Thread visibility and the explicit private audience without message content.';
comment on function public.replace_managed_conversation_thread_members(uuid, uuid[]) is
  'Atomically replaces a private Thread audience. Creator or Space-manager only; maximum 30 Room-eligible members.';
