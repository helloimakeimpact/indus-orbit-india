-- Source-aware membership administration and conservative anti-spam controls.
-- These commands keep enforcement at the database boundary; the browser only
-- submits reviewed intent and never writes membership or moderation tables.

create index if not exists conversation_messages_author_created_idx
  on public.conversation_messages (author_id, created_at desc)
  where deleted_at is null;

create index if not exists conversation_moderation_active_timeout_idx
  on private.conversation_moderation_actions (space_id, target_user_id, expires_at desc)
  where action_type = 'timeout' and reversed_at is null;

create or replace function public.list_managed_conversation_space_members(
  _space_id uuid
)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  headline text,
  domain_role text,
  membership_state text,
  source_membership_version bigint,
  timeout_expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not private.can_manage_conversation_space(_space_id) then
    raise exception 'Space membership management access is required' using errcode = '42501';
  end if;

  return query
  select
    membership.user_id,
    profile.display_name,
    profile.avatar_url,
    profile.headline,
    membership.domain_role,
    membership.membership_state,
    membership.source_membership_version,
    timeout_state.expires_at
  from public.conversation_space_memberships as membership
  join public.profiles as profile on profile.user_id = membership.user_id
  left join lateral (
    select action.expires_at
    from private.conversation_moderation_actions as action
    where action.space_id = membership.space_id
      and action.target_user_id = membership.user_id
      and action.action_type = 'timeout'
      and action.reversed_at is null
      and action.expires_at > statement_timestamp()
    order by action.expires_at desc, action.created_at desc
    limit 1
  ) as timeout_state on true
  where membership.space_id = _space_id
  order by
    case membership.membership_state when 'active' then 0 else 1 end,
    pg_catalog.lower(profile.display_name),
    membership.user_id;
end;
$function$;

create or replace function public.set_managed_conversation_member_timeout(
  _space_id uuid,
  _target_user_id uuid,
  _duration_seconds integer,
  _reason text,
  _expected_membership_version bigint,
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  clean_reason text := pg_catalog.btrim(coalesce(_reason, ''));
  membership_row public.conversation_space_memberships%rowtype;
  existing_action private.conversation_moderation_actions%rowtype;
  created_action private.conversation_moderation_actions%rowtype;
  expires_at_value timestamptz;
  action_name text := case when _duration_seconds = 0 then 'restore' else 'timeout' end;
begin
  if caller_id is null or not private.can_manage_conversation_space(_space_id) then
    raise exception 'Space moderation access is required' using errcode = '42501';
  end if;
  if _target_user_id is null or _target_user_id = caller_id
    or _duration_seconds not in (0, 300, 1800, 3600, 86400, 604800)
    or _expected_membership_version is null or _expected_membership_version < 1
    or _client_request_id is null
    or pg_catalog.char_length(clean_reason) not between 8 and 500 then
    raise exception 'Member timeout command is invalid' using errcode = '22023';
  end if;

  select action.* into existing_action
  from private.conversation_moderation_actions as action
  where action.actor_id = caller_id
    and action.client_request_id = _client_request_id;
  if found then
    if existing_action.space_id <> _space_id
      or existing_action.target_user_id is distinct from _target_user_id
      or existing_action.action_type <> action_name then
      raise exception 'Client request ID was already used for another moderation command'
        using errcode = '22023';
    end if;
    return pg_catalog.jsonb_build_object(
      'spaceId', existing_action.space_id,
      'userId', existing_action.target_user_id,
      'timeoutExpiresAt', existing_action.expires_at,
      'replayed', true
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('space-member-control:' || _space_id::text || ':' || _target_user_id::text, 0)
  );

  select membership.* into membership_row
  from public.conversation_space_memberships as membership
  where membership.space_id = _space_id and membership.user_id = _target_user_id
  for update;

  if not found or membership_row.membership_state <> 'active' then
    raise exception 'Only an active Space member can be timed out' using errcode = '22023';
  end if;
  if membership_row.source_membership_version <> _expected_membership_version then
    raise exception 'Membership changed; refresh and try again' using errcode = '40001';
  end if;
  if membership_row.domain_role in ('lead', 'steward', 'coordinator') then
    raise exception 'Remove elevated source authority before applying a timeout'
      using errcode = '42501';
  end if;

  update private.conversation_moderation_actions as action
  set reversed_at = statement_timestamp(),
      reversed_by = caller_id
  where action.space_id = _space_id
    and action.target_user_id = _target_user_id
    and action.action_type = 'timeout'
    and action.reversed_at is null
    and action.expires_at > statement_timestamp();

  expires_at_value := case
    when _duration_seconds = 0 then null
    else statement_timestamp() + (_duration_seconds * interval '1 second')
  end;

  insert into private.conversation_moderation_actions (
    space_id,
    target_user_id,
    action_type,
    reason,
    actor_id,
    expires_at,
    client_request_id
  ) values (
    _space_id,
    _target_user_id,
    action_name,
    clean_reason,
    caller_id,
    expires_at_value,
    _client_request_id
  ) returning * into created_action;

  insert into public.audit_log (actor_id, action, target_type, target_id, reason, metadata)
  values (
    caller_id,
    case when _duration_seconds = 0 then 'space.member_timeout_lifted' else 'space.member_timed_out' end,
    'conversation_space',
    _space_id,
    clean_reason,
    pg_catalog.jsonb_build_object(
      'target_user_id', _target_user_id,
      'duration_seconds', _duration_seconds,
      'expires_at', expires_at_value,
      'membership_version', membership_row.source_membership_version
    )
  );

  return pg_catalog.jsonb_build_object(
    'spaceId', _space_id,
    'userId', _target_user_id,
    'timeoutExpiresAt', expires_at_value,
    'replayed', false
  );
end;
$function$;

create or replace function public.decide_space_membership(
  _space_id uuid,
  _target_user_id uuid,
  _decision text,
  _role text,
  _reason text,
  _expected_version bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  _actor_id uuid := (select auth.uid());
  _space public.conversation_spaces%rowtype;
  _target_membership public.conversation_space_memberships%rowtype;
  _next_state text;
  _safe_role text;
begin
  if _actor_id is null or not private.can_manage_conversation_space(_space_id) then
    raise exception using errcode = '42501', message = 'Space membership management requires a lead or steward role';
  end if;
  if _target_user_id is null or _target_user_id = _actor_id then
    raise exception using errcode = '22023', message = 'Choose another member';
  end if;
  if _decision not in ('approve', 'reject', 'remove', 'restore') then
    raise exception using errcode = '22023', message = 'Choose a valid membership decision';
  end if;
  if _decision in ('reject', 'remove')
    and (nullif(pg_catalog.btrim(_reason), '') is null or pg_catalog.char_length(pg_catalog.btrim(_reason)) > 1000) then
    raise exception using errcode = '22023', message = 'A concise decision reason is required';
  end if;

  select space.* into _space
  from public.conversation_spaces as space
  where space.id = _space_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Space not found';
  end if;

  select membership.* into _target_membership
  from public.conversation_space_memberships as membership
  where membership.space_id = _space_id and membership.user_id = _target_user_id;
  if _decision = 'remove'
    and _target_membership.domain_role in ('lead', 'steward', 'coordinator') then
    raise exception using errcode = '42501',
      message = 'Remove elevated source authority before removing this member';
  end if;

  _next_state := case
    when _decision in ('approve', 'restore') then 'active'
    else 'removed'
  end;

  if _space.source_type = 'chapter' then
    _safe_role := case when _role in ('member', 'steward') then _role else 'member' end;
    update public.chapter_members as member
    set membership_state = _next_state,
        role = case when _next_state = 'active' then _safe_role else member.role end,
        decided_by = _actor_id,
        decided_at = now(),
        removal_reason = case when _next_state = 'removed' then pg_catalog.btrim(_reason) else null end,
        left_at = case when _next_state = 'removed' then now() else null end,
        state_version = member.state_version + 1,
        updated_at = now()
    where member.chapter_id = _space.chapter_id
      and member.user_id = _target_user_id
      and member.state_version = _expected_version;
  else
    _safe_role := case
      when _role in ('member', 'contributor', 'founder', 'observer', 'coordinator') then _role
      else 'member'
    end;
    update public.mission_members as member
    set membership_state = _next_state,
        role = case when _next_state = 'active' then _safe_role else member.role end,
        decided_by = _actor_id,
        decided_at = now(),
        removal_reason = case when _next_state = 'removed' then pg_catalog.btrim(_reason) else null end,
        left_at = case when _next_state = 'removed' then now() else null end,
        state_version = member.state_version + 1,
        updated_at = now()
    where member.mission_id = _space.mission_id
      and member.user_id = _target_user_id
      and member.state_version = _expected_version;
  end if;

  if not found then
    raise exception using errcode = '40001', message = 'Membership changed; refresh and try again';
  end if;

  insert into public.audit_log (actor_id, action, target_type, target_id, reason, metadata)
  values (
    _actor_id,
    'space.membership_' || _decision,
    'conversation_space',
    _space_id,
    nullif(pg_catalog.btrim(_reason), ''),
    pg_catalog.jsonb_build_object('target_user_id', _target_user_id, 'role', _safe_role)
  );

  return pg_catalog.jsonb_build_object(
    'space_id', _space_id,
    'user_id', _target_user_id,
    'membership_state', _next_state,
    'role', _safe_role
  );
end;
$function$;

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
  _timeout_expires_at timestamptz;
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

  select max(action.expires_at) into _timeout_expires_at
  from private.conversation_moderation_actions as action
  where action.space_id = _room_space_id
    and action.target_user_id = _actor_id
    and action.action_type = 'timeout'
    and action.reversed_at is null
    and action.expires_at > statement_timestamp();
  if _timeout_expires_at is not null then
    _retry_after_seconds := greatest(
      1,
      pg_catalog.ceil(extract(epoch from (_timeout_expires_at - statement_timestamp())))::integer
    );
    raise exception using
      errcode = 'P0001',
      message = 'Space timeout is active',
      detail = pg_catalog.jsonb_build_object('retryAfterSeconds', _retry_after_seconds)::text,
      hint = 'A Space manager must lift the timeout or it must expire';
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
        pg_catalog.ceil(extract(epoch from (
          _last_message_at + (_slow_mode_seconds * interval '1 second') - statement_timestamp()
        )))::integer
      );
      raise exception using
        errcode = 'P0001',
        message = 'Room slow mode is active',
        detail = pg_catalog.jsonb_build_object('retryAfterSeconds', _retry_after_seconds)::text,
        hint = 'Wait before sending another message in this Room';
    end if;
  end if;

  if (
    select count(*) from public.conversation_messages as message
    where message.author_id = _actor_id
      and message.created_at >= statement_timestamp() - interval '10 seconds'
  ) >= 6 then
    raise exception using errcode = 'P0001', message = 'Message burst limit exceeded; try again shortly';
  end if;
  if (
    select count(*) from public.conversation_messages as message
    where message.author_id = _actor_id
      and message.created_at >= statement_timestamp() - interval '1 minute'
  ) >= 30 then
    raise exception using errcode = 'P0001', message = 'Message rate limit exceeded; try again shortly';
  end if;
  if (
    select count(*) from public.conversation_messages as message
    where message.author_id = _actor_id
      and message.created_at >= statement_timestamp() - interval '1 hour'
  ) >= 120 then
    raise exception using errcode = 'P0001', message = 'Hourly message limit exceeded; try again later';
  end if;
  if pg_catalog.char_length(_clean_content) >= 4 and (
    select count(*) from public.conversation_messages as message
    where message.room_id = _room_id
      and message.thread_id is not distinct from _thread_id
      and message.author_id = _actor_id
      and message.content = _clean_content
      and message.deleted_at is null
      and message.created_at >= statement_timestamp() - interval '10 minutes'
  ) >= 3 then
    raise exception using errcode = 'P0001',
      message = 'Repeated-message limit exceeded; change the message before retrying';
  end if;

  insert into public.conversation_messages (
    room_id, thread_id, author_id, content, client_request_id
  ) values (
    _room_id, _thread_id, _actor_id, _clean_content, _client_request_id
  ) returning * into _created;

  if _thread_id is not null then
    update public.conversation_threads set updated_at = now() where id = _thread_id;
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

revoke all on function public.list_managed_conversation_space_members(uuid)
  from public, anon;
revoke all on function public.set_managed_conversation_member_timeout(
  uuid, uuid, integer, text, bigint, uuid
) from public, anon;

grant execute on function public.list_managed_conversation_space_members(uuid)
  to authenticated, service_role;
grant execute on function public.set_managed_conversation_member_timeout(
  uuid, uuid, integer, text, bigint, uuid
) to authenticated, service_role;

comment on function public.list_managed_conversation_space_members(uuid) is
  'Manager-only, privacy-minimised active/removed member roster with active timeout expiry.';
comment on function public.set_managed_conversation_member_timeout(uuid, uuid, integer, text, bigint, uuid) is
  'Applies or lifts a bounded Space timeout with hierarchy, optimistic version, replay and audit enforcement.';
comment on function public.send_my_conversation_message(uuid, uuid, text, uuid) is
  'Sends one idempotent Room/Thread message with access, timeout, slow-mode, burst, rate and repeated-content enforcement.';
