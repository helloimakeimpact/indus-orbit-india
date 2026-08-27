-- Expose a narrow manager-only Room override editor. Source-domain ownership
-- and role assignment remain authoritative; this edits only Room capabilities.

create or replace function public.list_managed_conversation_room_permissions(_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  _space_id uuid;
begin
  select room.space_id into _space_id
  from public.conversation_rooms as room
  where room.id = _room_id and room.archived_at is null;

  if (select auth.uid()) is null
     or _space_id is null
     or not private.can_manage_conversation_space(_space_id) then
    raise exception 'Space management access is required' using errcode = '42501';
  end if;

  return pg_catalog.jsonb_build_object(
    'roomId', _room_id,
    'items', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', override_row.id,
        'roleId', override_row.role_id,
        'userId', override_row.user_id,
        'capability', override_row.capability,
        'effect', override_row.effect,
        'createdAt', override_row.created_at
      ) order by override_row.capability, override_row.effect, override_row.created_at, override_row.id)
      from public.conversation_room_permission_overrides as override_row
      where override_row.room_id = _room_id
    ), '[]'::jsonb)
  );
end;
$function$;

create or replace function public.set_managed_conversation_room_permission_v2(
  _room_id uuid,
  _role_id uuid,
  _user_id uuid,
  _capability text,
  _effect text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  _actor_id uuid := (select auth.uid());
  _space_id uuid;
  _override_id uuid;
begin
  select room.space_id into _space_id
  from public.conversation_rooms as room
  where room.id = _room_id and room.archived_at is null;

  if _actor_id is null
     or _space_id is null
     or not private.can_manage_conversation_space(_space_id) then
    raise exception 'Space management access is required' using errcode = '42501';
  end if;
  if ((_role_id is not null)::integer + (_user_id is not null)::integer) <> 1
     or _capability not in (
       'room.view', 'message.create', 'thread.create', 'message.moderate', 'room.manage'
     )
     or _effect not in ('allow', 'deny', 'inherit') then
    raise exception 'Room permission is invalid' using errcode = '22023';
  end if;
  if _role_id is not null and not exists (
    select 1 from public.conversation_space_roles as role_row
    where role_row.id = _role_id and role_row.space_id = _space_id
  ) then
    raise exception 'Role does not belong to this Space' using errcode = '22023';
  end if;
  if _user_id is not null and not exists (
    select 1 from public.conversation_space_memberships as membership
    where membership.space_id = _space_id
      and membership.user_id = _user_id
      and membership.membership_state = 'active'
  ) then
    raise exception 'Member does not belong to this Space' using errcode = '22023';
  end if;
  if _capability = 'room.view' and _effect = 'deny' and (
    _user_id = _actor_id
    or exists (
      select 1 from public.conversation_space_role_members as role_member
      where role_member.role_id = _role_id and role_member.user_id = _actor_id
    )
  ) then
    raise exception 'You cannot deny your own Room visibility' using errcode = '22023';
  end if;

  delete from public.conversation_room_permission_overrides
  where room_id = _room_id
    and capability = _capability
    and role_id is not distinct from _role_id
    and user_id is not distinct from _user_id;

  if _effect <> 'inherit' then
    insert into public.conversation_room_permission_overrides (
      room_id, role_id, user_id, capability, effect, created_by
    ) values (
      _room_id, _role_id, _user_id, _capability, _effect, _actor_id
    ) returning id into _override_id;
  end if;

  return pg_catalog.jsonb_build_object(
    'roomId', _room_id,
    'roleId', _role_id,
    'userId', _user_id,
    'capability', _capability,
    'effect', _effect,
    'id', _override_id
  );
end;
$function$;

revoke all on function public.list_managed_conversation_room_permissions(uuid)
  from public, anon;
revoke all on function public.set_managed_conversation_room_permission_v2(
  uuid, uuid, uuid, text, text
) from public, anon;
grant execute on function public.list_managed_conversation_room_permissions(uuid)
  to authenticated, service_role;
grant execute on function public.set_managed_conversation_room_permission_v2(
  uuid, uuid, uuid, text, text
) to authenticated, service_role;

comment on function public.list_managed_conversation_room_permissions(uuid) is
  'Manager-only list of explicit Room role/member overrides; inherited policy is not materialized.';
comment on function public.set_managed_conversation_room_permission_v2(
  uuid, uuid, uuid, text, text
) is
  'Manager-only Room allow/deny/inherit editor with subject validation and caller visibility self-lockout prevention.';
