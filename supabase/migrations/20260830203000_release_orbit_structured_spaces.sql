-- Structured Orbit Spaces: manager-owned Room lifecycle, board topics,
-- inherited source roles and a caller-owned saved-work index.

alter table public.conversation_space_roles
  add column parent_role_id uuid,
  add column role_rank integer not null default 100 check (role_rank between 0 and 1000),
  add constraint conversation_space_roles_parent_fkey
    foreign key (space_id, parent_role_id)
    references public.conversation_space_roles(space_id, id)
    on delete set null,
  add constraint conversation_space_roles_not_own_parent_check
    check (parent_role_id is null or parent_role_id <> id);

update public.conversation_space_roles as role_row
set role_rank = case role_row.system_key
  when 'lead' then 10
  when 'steward' then 20
  when 'coordinator' then 20
  when 'member' then 30
  when 'observer' then 40
  else 100
end;

update public.conversation_space_roles as child
set parent_role_id = parent.id
from public.conversation_space_roles as parent
where child.space_id = parent.space_id
  and (
    (child.system_key = 'lead' and parent.system_key in ('steward', 'coordinator'))
    or (child.system_key in ('steward', 'coordinator') and parent.system_key = 'member')
    or (child.system_key = 'member' and parent.system_key = 'observer')
  );

create index conversation_space_roles_parent_idx
  on public.conversation_space_roles (parent_role_id)
  where parent_role_id is not null;

create or replace function private.conversation_role_inherits(
  _subject_role_id uuid,
  _ancestor_role_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with recursive role_chain as (
    select role_row.id, role_row.parent_role_id, role_row.space_id, 0 as depth
    from public.conversation_space_roles as role_row
    where role_row.id = _subject_role_id
    union all
    select parent.id, parent.parent_role_id, parent.space_id, role_chain.depth + 1
    from role_chain
    join public.conversation_space_roles as parent
      on parent.id = role_chain.parent_role_id
      and parent.space_id = role_chain.space_id
    where role_chain.depth < 16
  )
  select exists (select 1 from role_chain where id = _ancestor_role_id);
$$;

create or replace function private.user_has_conversation_role(
  _role_id uuid,
  _user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select _user_id is not null and exists (
    select 1
    from public.conversation_space_role_members as membership
    where membership.user_id = _user_id
      and private.conversation_role_inherits(membership.role_id, _role_id)
  );
$$;

revoke all on function private.conversation_role_inherits(uuid, uuid) from public, anon, authenticated;
revoke all on function private.user_has_conversation_role(uuid, uuid) from public, anon, service_role;
grant execute on function private.conversation_role_inherits(uuid, uuid) to authenticated, service_role;
grant execute on function private.user_has_conversation_role(uuid, uuid) to authenticated;

create or replace function private.conversation_override_matches(
  _override_id uuid,
  _user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_room_permission_overrides as override_row
    where override_row.id = _override_id
      and (
        override_row.user_id = _user_id
        or (
          override_row.role_id is not null
          and private.user_has_conversation_role(override_row.role_id, _user_id)
        )
      )
  );
$$;

revoke all on function private.conversation_override_matches(uuid, uuid)
  from public, anon, service_role;
grant execute on function private.conversation_override_matches(uuid, uuid) to authenticated;

create or replace function private.can_access_conversation_room(_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_rooms as room
    where room.id = _room_id
      and room.archived_at is null
      and private.can_access_conversation_space(room.space_id)
      and not exists (
        select 1
        from public.conversation_room_permission_overrides as denied
        where denied.room_id = room.id
          and denied.capability = 'room.view'
          and denied.effect = 'deny'
          and private.conversation_override_matches(denied.id, auth.uid())
      )
      and (
        room.visibility = 'members'
        or exists (
          select 1
          from public.conversation_room_permission_overrides as allowed
          where allowed.room_id = room.id
            and allowed.capability = 'room.view'
            and allowed.effect = 'allow'
            and private.conversation_override_matches(allowed.id, auth.uid())
        )
      )
  );
$$;

create or replace function private.can_post_conversation_room(_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_rooms as room
    where room.id = _room_id
      and private.can_access_conversation_room(room.id)
      and not exists (
        select 1
        from public.conversation_room_permission_overrides as denied
        where denied.room_id = room.id
          and denied.capability = 'message.create'
          and denied.effect = 'deny'
          and private.conversation_override_matches(denied.id, auth.uid())
      )
      and (
        room.posting_policy = 'members'
        or (
          room.posting_policy in ('owners', 'stewards')
          and private.can_manage_conversation_space(room.space_id)
        )
        or exists (
          select 1
          from public.conversation_room_permission_overrides as allowed
          where allowed.room_id = room.id
            and allowed.capability = 'message.create'
            and allowed.effect = 'allow'
            and private.conversation_override_matches(allowed.id, auth.uid())
        )
      )
  );
$$;

create or replace function private.can_moderate_conversation_room(_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.conversation_rooms as room
    where room.id = _room_id
      and private.can_access_conversation_room(room.id)
      and not exists (
        select 1 from public.conversation_room_permission_overrides as denied
        where denied.room_id = room.id
          and denied.capability = 'message.moderate'
          and denied.effect = 'deny'
          and private.conversation_override_matches(denied.id, auth.uid())
      )
      and (
        private.can_manage_conversation_space(room.space_id)
        or exists (
          select 1 from public.conversation_room_permission_overrides as allowed
          where allowed.room_id = room.id
            and allowed.capability = 'message.moderate'
            and allowed.effect = 'allow'
            and private.conversation_override_matches(allowed.id, auth.uid())
        )
      )
  );
$$;

create or replace function private.can_create_conversation_thread(_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_post_conversation_room(_room_id)
    and not exists (
      select 1 from public.conversation_room_permission_overrides as denied
      where denied.room_id = _room_id
        and denied.capability = 'thread.create'
        and denied.effect = 'deny'
        and private.conversation_override_matches(denied.id, auth.uid())
    )
    and (
      not exists (
        select 1 from public.conversation_room_permission_overrides as scoped
        where scoped.room_id = _room_id and scoped.capability = 'thread.create'
      )
      or exists (
        select 1 from public.conversation_room_permission_overrides as allowed
        where allowed.room_id = _room_id
          and allowed.capability = 'thread.create'
          and allowed.effect = 'allow'
          and private.conversation_override_matches(allowed.id, auth.uid())
      )
      or exists (
        select 1 from public.conversation_rooms as room
        where room.id = _room_id and private.can_manage_conversation_space(room.space_id)
      )
    );
$$;

alter table public.conversation_rooms add column client_request_id uuid;
create unique index conversation_rooms_creator_request_key
  on public.conversation_rooms (created_by, client_request_id)
  where client_request_id is not null;

create table private.conversation_room_admin_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(user_id),
  space_id uuid not null references public.conversation_spaces(id) on delete cascade,
  room_id uuid references public.conversation_rooms(id) on delete set null,
  action text not null check (action in ('room.create', 'room.reorder', 'room.archive', 'room.restore')),
  client_request_id uuid not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (actor_id, client_request_id)
);

create or replace function public.create_managed_conversation_room(
  _space_id uuid,
  _context_group_id uuid,
  _display_name text,
  _description text,
  _room_type text,
  _visibility text,
  _posting_policy text,
  _client_request_id uuid
)
returns public.conversation_rooms
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  existing public.conversation_rooms%rowtype;
  created public.conversation_rooms%rowtype;
  next_position integer;
begin
  if actor_id is null or not private.can_manage_conversation_space(_space_id) then
    raise exception 'Space management access is required' using errcode = '42501';
  end if;
  if _client_request_id is null
    or char_length(btrim(coalesce(_display_name, ''))) not between 1 and 100
    or char_length(coalesce(_description, '')) > 1000
    or _room_type not in ('announcement', 'conversation', 'board', 'event_index', 'evidence', 'help')
    or _visibility not in ('members', 'role', 'private')
    or _posting_policy not in ('read_only', 'owners', 'stewards', 'members') then
    raise exception 'Room request is invalid' using errcode = '22023';
  end if;
  if _context_group_id is not null and not exists (
    select 1 from public.conversation_context_groups as context_group
    where context_group.id = _context_group_id and context_group.space_id = _space_id
  ) then
    raise exception 'Context group does not belong to this Space' using errcode = '22023';
  end if;

  select room.* into existing from public.conversation_rooms as room
  where room.created_by = actor_id and room.client_request_id = _client_request_id;
  if found then
    if existing.space_id <> _space_id then
      raise exception 'Client request ID was already used for another Room';
    end if;
    return existing;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(_space_id::text, 411));
  select coalesce(max(room.position), 0) + 10 into next_position
  from public.conversation_rooms as room where room.space_id = _space_id;
  insert into public.conversation_rooms (
    space_id, context_group_id, system_key, display_name, description,
    room_type, visibility, posting_policy, position, created_by, client_request_id
  ) values (
    _space_id, _context_group_id,
    'room_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    btrim(_display_name), btrim(coalesce(_description, '')), _room_type,
    _visibility, _posting_policy, next_position, actor_id, _client_request_id
  ) returning * into created;
  insert into private.conversation_room_admin_events (
    actor_id, space_id, room_id, action, client_request_id, detail
  ) values (
    actor_id, _space_id, created.id, 'room.create', _client_request_id,
    jsonb_build_object('roomType', _room_type, 'visibility', _visibility)
  );
  return created;
end;
$function$;

create or replace function public.reorder_managed_conversation_rooms(
  _space_id uuid,
  _ordered_room_ids uuid[],
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  existing_event private.conversation_room_admin_events%rowtype;
begin
  if actor_id is null or not private.can_manage_conversation_space(_space_id) then
    raise exception 'Space management access is required' using errcode = '42501';
  end if;
  if _client_request_id is null or coalesce(array_length(_ordered_room_ids, 1), 0) not between 1 and 100
    or (select count(*) from unnest(_ordered_room_ids) as room_id)
      <> (select count(distinct room_id) from unnest(_ordered_room_ids) as room_id) then
    raise exception 'Room order is invalid' using errcode = '22023';
  end if;
  select event.* into existing_event from private.conversation_room_admin_events as event
  where event.actor_id = actor_id and event.client_request_id = _client_request_id;
  if found then return jsonb_build_object('spaceId', _space_id, 'reordered', true); end if;
  if exists (
    select 1 from unnest(_ordered_room_ids) as ordered(room_id)
    left join public.conversation_rooms as room on room.id = ordered.room_id
    where room.id is null or room.space_id <> _space_id or room.archived_at is not null
  ) then
    raise exception 'Room order contains an inaccessible Room' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(_space_id::text, 412));
  update public.conversation_rooms as room
  set position = ordered.ordinality::integer * 10, updated_at = now()
  from unnest(_ordered_room_ids) with ordinality as ordered(room_id, ordinality)
  where room.id = ordered.room_id and room.space_id = _space_id;
  insert into private.conversation_room_admin_events (
    actor_id, space_id, action, client_request_id, detail
  ) values (
    actor_id, _space_id, 'room.reorder', _client_request_id,
    jsonb_build_object('roomIds', _ordered_room_ids)
  );
  return jsonb_build_object('spaceId', _space_id, 'reordered', true);
end;
$function$;

create or replace function public.set_managed_conversation_room_archive(
  _room_id uuid,
  _archived boolean,
  _reason text,
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  room_row public.conversation_rooms%rowtype;
  existing_event private.conversation_room_admin_events%rowtype;
begin
  select room.* into room_row from public.conversation_rooms as room where room.id = _room_id for update;
  if actor_id is null or not found or not private.can_manage_conversation_space(room_row.space_id) then
    raise exception 'Space management access is required' using errcode = '42501';
  end if;
  if _client_request_id is null or char_length(btrim(coalesce(_reason, ''))) not between 8 and 500 then
    raise exception 'A reason of 8 to 500 characters is required' using errcode = '22023';
  end if;
  select event.* into existing_event from private.conversation_room_admin_events as event
  where event.actor_id = actor_id and event.client_request_id = _client_request_id;
  if found then
    return jsonb_build_object('roomId', _room_id, 'archived', _archived);
  end if;
  update public.conversation_rooms
  set archived_at = case when _archived then now() else null end, updated_at = now()
  where id = _room_id;
  insert into private.conversation_room_admin_events (
    actor_id, space_id, room_id, action, client_request_id, detail
  ) values (
    actor_id, room_row.space_id, _room_id,
    case when _archived then 'room.archive' else 'room.restore' end,
    _client_request_id, jsonb_build_object('reason', btrim(_reason))
  );
  return jsonb_build_object('roomId', _room_id, 'archived', _archived);
end;
$function$;

alter table public.conversation_threads
  add column board_state text not null default 'open'
    check (board_state in ('open', 'answered', 'resolved', 'closed')),
  add column board_tags text[] not null default '{}';

create or replace function public.create_my_conversation_board_topic(
  _room_id uuid,
  _title text,
  _content text,
  _tags text[],
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  existing public.conversation_threads%rowtype;
  message_row public.conversation_messages%rowtype;
  thread_row public.conversation_threads%rowtype;
  clean_tags text[];
begin
  if actor_id is null or _client_request_id is null
    or not private.can_create_conversation_thread(_room_id)
    or not exists (
      select 1 from public.conversation_rooms as room
      where room.id = _room_id and room.room_type = 'board' and room.archived_at is null
    ) then
    raise exception 'Board topic creation is not allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(_title, ''))) not between 3 and 160
    or char_length(btrim(coalesce(_content, ''))) not between 1 and 4000 then
    raise exception 'Board topic title or body is invalid' using errcode = '22023';
  end if;
  select coalesce(array_agg(tag order by tag), '{}') into clean_tags
  from (
    select distinct lower(btrim(value)) as tag
    from unnest(coalesce(_tags, '{}')) as value
    where lower(btrim(value)) ~ '^[a-z0-9][a-z0-9_-]{0,31}$'
    limit 5
  ) as normalized;
  select thread.* into existing from public.conversation_threads as thread
  where thread.created_by = actor_id and thread.client_request_id = _client_request_id;
  if found then
    return jsonb_build_object('threadId', existing.id, 'messageId', existing.parent_message_id);
  end if;
  insert into public.conversation_messages (
    room_id, author_id, content, client_request_id
  ) values (
    _room_id, actor_id, btrim(_content), _client_request_id
  ) returning * into message_row;
  insert into public.conversation_threads (
    room_id, parent_message_id, title, visibility, created_by,
    client_request_id, board_state, board_tags
  ) values (
    _room_id, message_row.id, btrim(_title), 'room', actor_id,
    _client_request_id, 'open', clean_tags
  ) returning * into thread_row;
  return jsonb_build_object('threadId', thread_row.id, 'messageId', message_row.id);
end;
$function$;

create or replace function public.list_my_conversation_board_topics(_room_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when auth.uid() is null or not private.can_access_conversation_room(_room_id)
    then (select jsonb_build_object('error', 'forbidden'))
    else coalesce((
      select jsonb_agg(jsonb_build_object(
        'threadId', thread.id,
        'messageId', message.id,
        'title', thread.title,
        'body', case when message.deleted_at is null then message.content else null end,
        'state', thread.board_state,
        'tags', thread.board_tags,
        'authorId', thread.created_by,
        'authorDisplayName', coalesce(profile.display_name, 'Member'),
        'replyCount', (select count(*)::integer from public.conversation_messages as reply where reply.thread_id = thread.id),
        'createdAt', thread.created_at,
        'updatedAt', thread.updated_at
      ) order by thread.updated_at desc, thread.id desc)
      from public.conversation_threads as thread
      join public.conversation_messages as message on message.id = thread.parent_message_id
      left join public.profiles as profile on profile.user_id = thread.created_by
      where thread.room_id = _room_id
        and thread.archived_at is null
        and private.can_access_conversation_thread(thread.id)
    ), '[]'::jsonb)
  end;
$$;

create or replace function public.set_my_conversation_board_topic_state(
  _thread_id uuid,
  _state text,
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  thread_row public.conversation_threads%rowtype;
  room_space_id uuid;
begin
  select thread.* into thread_row from public.conversation_threads as thread where thread.id = _thread_id for update;
  select room.space_id into room_space_id from public.conversation_rooms as room where room.id = thread_row.room_id;
  if actor_id is null or _client_request_id is null or _state not in ('open', 'answered', 'resolved', 'closed')
    or not found
    or (thread_row.created_by <> actor_id and not private.can_manage_conversation_space(room_space_id)) then
    raise exception 'Board topic state change is not allowed' using errcode = '42501';
  end if;
  update public.conversation_threads set board_state = _state, updated_at = now() where id = _thread_id;
  return jsonb_build_object('threadId', _thread_id, 'state', _state);
end;
$function$;

create or replace function public.explain_managed_conversation_room_permission(
  _room_id uuid,
  _role_id uuid,
  _capability text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  room_row public.conversation_rooms%rowtype;
  role_row public.conversation_space_roles%rowtype;
  denied boolean;
  allowed boolean;
  default_allowed boolean;
  inherited_roles jsonb;
begin
  select room.* into room_row from public.conversation_rooms as room where room.id = _room_id;
  select role.* into role_row from public.conversation_space_roles as role where role.id = _role_id;
  if auth.uid() is null or not found or role_row.space_id <> room_row.space_id
    or not private.can_manage_conversation_space(room_row.space_id)
    or _capability not in ('room.view', 'message.create', 'thread.create', 'message.moderate', 'room.manage') then
    raise exception 'Permission explanation access is required' using errcode = '42501';
  end if;
  select exists (
    select 1 from public.conversation_room_permission_overrides as override_row
    where override_row.room_id = _room_id and override_row.capability = _capability
      and override_row.effect = 'deny' and override_row.role_id is not null
      and private.conversation_role_inherits(_role_id, override_row.role_id)
  ) into denied;
  select exists (
    select 1 from public.conversation_room_permission_overrides as override_row
    where override_row.room_id = _room_id and override_row.capability = _capability
      and override_row.effect = 'allow' and override_row.role_id is not null
      and private.conversation_role_inherits(_role_id, override_row.role_id)
  ) into allowed;
  default_allowed := case _capability
    when 'room.view' then room_row.visibility = 'members'
    when 'message.create' then room_row.posting_policy = 'members'
      or (room_row.posting_policy in ('owners', 'stewards') and 'room.manage' = any(role_row.capabilities))
    when 'thread.create' then 'thread.create' = any(role_row.capabilities)
    when 'message.moderate' then 'message.moderate' = any(role_row.capabilities)
    when 'room.manage' then 'room.manage' = any(role_row.capabilities)
    else false end;
  select jsonb_agg(jsonb_build_object('id', chain.id, 'name', chain.display_name) order by chain.depth)
  into inherited_roles
  from (
    with recursive role_chain as (
      select role.id, role.display_name, role.parent_role_id, 0 as depth
      from public.conversation_space_roles as role where role.id = _role_id
      union all
      select parent.id, parent.display_name, parent.parent_role_id, role_chain.depth + 1
      from role_chain join public.conversation_space_roles as parent on parent.id = role_chain.parent_role_id
      where role_chain.depth < 16
    ) select * from role_chain
  ) as chain;
  return jsonb_build_object(
    'roomId', _room_id, 'roleId', _role_id, 'capability', _capability,
    'effective', case when denied then 'deny' when allowed or default_allowed then 'allow' else 'deny' end,
    'reason', case when denied then 'explicit inherited deny'
      when allowed then 'explicit inherited allow'
      when default_allowed then 'role capability or Room default'
      else 'not granted by role or Room policy' end,
    'roleChain', coalesce(inherited_roles, '[]'::jsonb)
  );
end;
$function$;

create table public.orbit_saved_items (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  object_type text not null check (object_type in ('space', 'room', 'thread', 'message', 'chapter', 'mission')),
  object_id uuid not null,
  note text check (note is null or char_length(note) between 1 and 500),
  created_at timestamptz not null default now(),
  primary key (user_id, object_type, object_id)
);

alter table public.orbit_saved_items enable row level security;
revoke all on table public.orbit_saved_items from public, anon, authenticated;
grant all on table public.orbit_saved_items to service_role;

create or replace function private.can_save_orbit_object(_object_type text, _object_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case _object_type
    when 'space' then private.can_access_conversation_space(_object_id)
    when 'room' then private.can_access_conversation_room(_object_id)
    when 'thread' then private.can_access_conversation_thread(_object_id)
    when 'message' then exists (
      select 1 from public.conversation_messages as message
      where message.id = _object_id and private.can_access_conversation_room(message.room_id)
    )
    when 'chapter' then exists (
      select 1 from public.chapter_members as member
      where member.chapter_id = _object_id and member.user_id = auth.uid() and member.membership_state = 'active'
    )
    when 'mission' then exists (
      select 1 from public.mission_members as member
      where member.mission_id = _object_id and member.user_id = auth.uid() and member.membership_state = 'active'
    )
    else false end;
$$;

create or replace function public.set_my_orbit_saved_item(
  _object_type text,
  _object_id uuid,
  _saved boolean,
  _note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare actor_id uuid := (select auth.uid());
begin
  if actor_id is null or _object_id is null
    or _object_type not in ('space', 'room', 'thread', 'message', 'chapter', 'mission')
    or not private.can_save_orbit_object(_object_type, _object_id)
    or (_note is not null and char_length(btrim(_note)) not between 1 and 500) then
    raise exception 'Saved item request is not allowed' using errcode = '42501';
  end if;
  if _saved then
    insert into public.orbit_saved_items (user_id, object_type, object_id, note)
    values (actor_id, _object_type, _object_id, nullif(btrim(_note), ''))
    on conflict (user_id, object_type, object_id) do update
    set note = excluded.note;
  else
    delete from public.orbit_saved_items
    where user_id = actor_id and object_type = _object_type and object_id = _object_id;
  end if;
  return jsonb_build_object('objectType', _object_type, 'objectId', _object_id, 'saved', _saved);
end;
$function$;

create or replace function public.list_my_orbit_saved_items(
  _query text default '',
  _limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare actor_id uuid := (select auth.uid()); result jsonb;
begin
  if actor_id is null or _limit not between 1 and 250 or char_length(coalesce(_query, '')) > 100 then
    raise exception 'Saved item query is invalid' using errcode = '22023';
  end if;
  with saved as (
    select item.object_type, item.object_id, item.note, item.created_at
    from public.orbit_saved_items as item
    where item.user_id = actor_id
      and private.can_save_orbit_object(item.object_type, item.object_id)
    union all
    select 'message', bookmark.message_id, null::text, bookmark.created_at
    from public.conversation_bookmarks as bookmark
    join public.conversation_messages as message on message.id = bookmark.message_id
    where bookmark.user_id = actor_id
      and private.can_access_conversation_room(message.room_id)
      and not exists (
        select 1 from public.orbit_saved_items as duplicate
        where duplicate.user_id = actor_id and duplicate.object_type = 'message'
          and duplicate.object_id = bookmark.message_id
      )
  ), resolved as (
    select saved.*,
      case saved.object_type
        when 'space' then (select space.display_name from public.conversation_spaces as space where space.id = saved.object_id)
        when 'room' then (select room.display_name from public.conversation_rooms as room where room.id = saved.object_id)
        when 'thread' then (select coalesce(thread.title, 'Thread') from public.conversation_threads as thread where thread.id = saved.object_id)
        when 'message' then (select left(message.content, 160) from public.conversation_messages as message where message.id = saved.object_id)
        when 'chapter' then (select chapter.name from public.chapters as chapter where chapter.id = saved.object_id)
        when 'mission' then (select mission.title from public.missions as mission where mission.id = saved.object_id)
      end as title,
      case saved.object_type
        when 'space' then saved.object_id
        when 'room' then (select room.space_id from public.conversation_rooms as room where room.id = saved.object_id)
        when 'thread' then (
          select room.space_id from public.conversation_threads as thread
          join public.conversation_rooms as room on room.id = thread.room_id
          where thread.id = saved.object_id
        )
        when 'message' then (
          select room.space_id from public.conversation_messages as message
          join public.conversation_rooms as room on room.id = message.room_id
          where message.id = saved.object_id
        )
        else null
      end as space_id
    from saved
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'objectType', resolved.object_type,
    'objectId', resolved.object_id,
    'title', coalesce(resolved.title, 'Saved item'),
    'note', resolved.note,
    'spaceId', resolved.space_id,
    'createdAt', resolved.created_at
  ) order by resolved.created_at desc), '[]'::jsonb)
  into result
  from (select * from resolved
    where btrim(coalesce(_query, '')) = ''
      or coalesce(title, '') ilike '%' || btrim(_query) || '%'
      or coalesce(note, '') ilike '%' || btrim(_query) || '%'
    order by created_at desc limit _limit
  ) as resolved;
  return result;
end;
$function$;

revoke all on function public.create_managed_conversation_room(uuid, uuid, text, text, text, text, text, uuid) from public, anon;
revoke all on function public.reorder_managed_conversation_rooms(uuid, uuid[], uuid) from public, anon;
revoke all on function public.set_managed_conversation_room_archive(uuid, boolean, text, uuid) from public, anon;
revoke all on function public.create_my_conversation_board_topic(uuid, text, text, text[], uuid) from public, anon;
revoke all on function public.list_my_conversation_board_topics(uuid) from public, anon;
revoke all on function public.set_my_conversation_board_topic_state(uuid, text, uuid) from public, anon;
revoke all on function public.explain_managed_conversation_room_permission(uuid, uuid, text) from public, anon;
revoke all on function public.set_my_orbit_saved_item(text, uuid, boolean, text) from public, anon;
revoke all on function public.list_my_orbit_saved_items(text, integer) from public, anon;

grant execute on function public.create_managed_conversation_room(uuid, uuid, text, text, text, text, text, uuid) to authenticated, service_role;
grant execute on function public.reorder_managed_conversation_rooms(uuid, uuid[], uuid) to authenticated, service_role;
grant execute on function public.set_managed_conversation_room_archive(uuid, boolean, text, uuid) to authenticated, service_role;
grant execute on function public.create_my_conversation_board_topic(uuid, text, text, text[], uuid) to authenticated, service_role;
grant execute on function public.list_my_conversation_board_topics(uuid) to authenticated, service_role;
grant execute on function public.set_my_conversation_board_topic_state(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.explain_managed_conversation_room_permission(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.set_my_orbit_saved_item(text, uuid, boolean, text) to authenticated, service_role;
grant execute on function public.list_my_orbit_saved_items(text, integer) to authenticated, service_role;

comment on table public.orbit_saved_items is
  'Caller-owned Orbit saved-object index. Object access is rechecked on every list and mutation; no generic direct browser DML is exposed.';
comment on function public.explain_managed_conversation_room_permission(uuid, uuid, text) is
  'Manager-only role simulation that explains deny-first inherited Room permissions without impersonating a member session.';
