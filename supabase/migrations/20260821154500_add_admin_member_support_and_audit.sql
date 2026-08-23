-- Transactional member-support commands and a redacted cross-domain audit
-- reader for the standalone admin control plane.

revoke insert, update, delete on public.member_suspensions from authenticated;

create or replace function public.admin_member_search(
  _query text,
  _limit integer default 25
)
returns table (
  user_id uuid,
  display_name text,
  headline text,
  orbit_segment text,
  is_verified boolean,
  is_public boolean,
  is_suspended boolean,
  suspended_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_query text := pg_catalog.btrim(coalesce(_query, ''));
  bounded_limit integer := coalesce(_limit, 25);
begin
  if not private.has_admin_capability(caller_id, 'members.read') then
    raise exception 'Member support access required' using errcode = '42501';
  end if;
  if pg_catalog.char_length(normalized_query) < 2
    or pg_catalog.char_length(normalized_query) > 80 then
    raise exception 'Member search must be between 2 and 80 characters';
  end if;
  if bounded_limit < 1 or bounded_limit > 50 then
    raise exception 'Member search limit must be between 1 and 50';
  end if;

  return query
  select
    profile.user_id,
    coalesce(profile.display_name, 'Member'),
    profile.headline,
    profile.orbit_segment::text,
    profile.is_verified,
    profile.is_public,
    active_suspension.id is not null,
    active_suspension.suspended_at
  from public.profiles as profile
  left join lateral (
    select suspension.id, suspension.suspended_at
    from public.member_suspensions as suspension
    where suspension.user_id = profile.user_id
      and suspension.lifted_at is null
    order by suspension.suspended_at desc, suspension.id desc
    limit 1
  ) as active_suspension on true
  where coalesce(profile.display_name, '') ilike '%' || normalized_query || '%'
    or coalesce(profile.headline, '') ilike '%' || normalized_query || '%'
  order by
    case
      when coalesce(profile.display_name, '') ilike normalized_query || '%' then 0
      else 1
    end,
    coalesce(profile.display_name, profile.user_id::text),
    profile.user_id
  limit bounded_limit;
end;
$function$;

revoke all on function public.admin_member_search(text, integer)
  from public, anon;
grant execute on function public.admin_member_search(text, integer)
  to authenticated, service_role;

create or replace function public.admin_set_member_suspension(
  _target_user_id uuid,
  _suspended boolean,
  _reason text,
  _expected_suspended boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_reason text := pg_catalog.btrim(coalesce(_reason, ''));
  active_suspension public.member_suspensions%rowtype;
  currently_suspended boolean;
begin
  if not private.has_admin_capability(caller_id, 'members.support') then
    raise exception 'Member support mutation access required' using errcode = '42501';
  end if;
  if _target_user_id is null or not exists (
    select 1 from auth.users as target_user where target_user.id = _target_user_id
  ) then
    raise exception 'Target member does not exist';
  end if;
  if _target_user_id = caller_id then
    raise exception 'Self-suspension is not available through admin support';
  end if;
  if private.is_platform_super_admin(_target_user_id) or exists (
    select 1
    from private.admin_team_assignments as assignment
    where assignment.user_id = _target_user_id
      and assignment.revoked_at is null
  ) then
    raise exception 'Remove admin-team authority before suspending this member';
  end if;
  if pg_catalog.char_length(normalized_reason) < 8
    or pg_catalog.char_length(normalized_reason) > 500 then
    raise exception 'Suspension reason must be between 8 and 500 characters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('admin-member-suspension:' || _target_user_id::text, 0)
  );

  select suspension.* into active_suspension
  from public.member_suspensions as suspension
  where suspension.user_id = _target_user_id
    and suspension.lifted_at is null
  order by suspension.suspended_at desc, suspension.id desc
  limit 1
  for update;
  currently_suspended := found;

  if currently_suspended <> _expected_suspended then
    raise exception 'Member suspension state changed; refresh before continuing';
  end if;
  if currently_suspended = _suspended then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'changed', false,
      'userId', _target_user_id,
      'suspended', currently_suspended
    );
  end if;

  if _suspended then
    insert into public.member_suspensions (user_id, actor_id, reason)
    values (_target_user_id, caller_id, normalized_reason)
    returning * into active_suspension;
  else
    update public.member_suspensions
    set lifted_at = pg_catalog.now(), lifted_by = caller_id
    where id = active_suspension.id;
  end if;

  insert into private.admin_operation_events (
    actor_user_id,
    capability,
    domain,
    action,
    target_type,
    target_id,
    reason,
    metadata
  ) values (
    caller_id,
    'members.support',
    'members',
    case when _suspended then 'member.suspended' else 'member.suspension_lifted' end,
    'member',
    _target_user_id,
    normalized_reason,
    pg_catalog.jsonb_build_object(
      'fromSuspended', currently_suspended,
      'toSuspended', _suspended
    )
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'changed', true,
    'userId', _target_user_id,
    'suspended', _suspended
  );
end;
$function$;

revoke all on function public.admin_set_member_suspension(uuid, boolean, text, boolean)
  from public, anon;
grant execute on function public.admin_set_member_suspension(uuid, boolean, text, boolean)
  to authenticated, service_role;

create or replace function public.admin_set_member_verification(
  _target_user_id uuid,
  _verified boolean,
  _reason text,
  _expected_verified boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_reason text := pg_catalog.btrim(coalesce(_reason, ''));
  original_request_role text;
  profile_row public.profiles%rowtype;
begin
  if not private.has_admin_capability(caller_id, 'members.support') then
    raise exception 'Member support mutation access required' using errcode = '42501';
  end if;
  if _target_user_id is null then
    raise exception 'Target member does not exist';
  end if;
  if _target_user_id = caller_id then
    raise exception 'Self-verification is not available through admin support';
  end if;
  if private.is_platform_super_admin(_target_user_id) or exists (
    select 1
    from private.admin_team_assignments as assignment
    where assignment.user_id = _target_user_id
      and assignment.revoked_at is null
  ) then
    raise exception 'Remove admin-team authority before changing verification';
  end if;
  if pg_catalog.char_length(normalized_reason) < 8
    or pg_catalog.char_length(normalized_reason) > 500 then
    raise exception 'Verification reason must be between 8 and 500 characters';
  end if;

  select profile.* into profile_row
  from public.profiles as profile
  where profile.user_id = _target_user_id
  for update;
  if not found then
    raise exception 'Target member profile does not exist';
  end if;
  if profile_row.is_verified <> _expected_verified then
    raise exception 'Member verification state changed; refresh before continuing';
  end if;
  if profile_row.is_verified = _verified then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'changed', false,
      'userId', _target_user_id,
      'verified', _verified
    );
  end if;

  -- The legacy profile trigger permits this protected field change only for
  -- an admin or the narrowly scoped service-role path. Preserve the original
  -- JWT role and elevate that setting only for this one trigger-guarded write;
  -- capability authorization above remains the source of authority.
  original_request_role := pg_catalog.current_setting(
    'request.jwt.claim.role',
    true
  );
  perform pg_catalog.set_config(
    'request.jwt.claim.role',
    'service_role',
    true
  );
  begin
    update public.profiles
    set
      is_verified = _verified,
      verified_at = case when _verified then pg_catalog.now() else null end,
      verified_by = case when _verified then caller_id else null end,
      updated_at = pg_catalog.now()
    where id = profile_row.id;
  exception
    when others then
      perform pg_catalog.set_config(
        'request.jwt.claim.role',
        coalesce(original_request_role, ''),
        true
      );
      raise;
  end;
  perform pg_catalog.set_config(
    'request.jwt.claim.role',
    coalesce(original_request_role, ''),
    true
  );

  insert into public.verification_decisions (
    profile_id,
    actor_id,
    decision,
    reason
  ) values (
    profile_row.id,
    caller_id,
    case when _verified then 'approved' else 'declined' end,
    normalized_reason
  );

  insert into private.admin_operation_events (
    actor_user_id,
    capability,
    domain,
    action,
    target_type,
    target_id,
    reason,
    metadata
  ) values (
    caller_id,
    'members.support',
    'members',
    case when _verified then 'member.verified' else 'member.verification_removed' end,
    'member',
    _target_user_id,
    normalized_reason,
    pg_catalog.jsonb_build_object(
      'fromVerified', profile_row.is_verified,
      'toVerified', _verified
    )
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'changed', true,
    'userId', _target_user_id,
    'verified', _verified
  );
end;
$function$;

revoke all on function public.admin_set_member_verification(uuid, boolean, text, boolean)
  from public, anon;
grant execute on function public.admin_set_member_verification(uuid, boolean, text, boolean)
  to authenticated, service_role;

create or replace function public.admin_operation_event_queue(
  _domains text[] default null,
  _before_occurred_at timestamptz default null,
  _before_id bigint default null,
  _limit integer default 25
)
returns table (
  event_id bigint,
  actor_display_name text,
  capability text,
  domain text,
  action text,
  target_type text,
  target_id uuid,
  reason text,
  metadata jsonb,
  occurred_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  bounded_limit integer := coalesce(_limit, 25);
begin
  if not private.has_admin_capability(caller_id, 'audit.read') then
    raise exception 'Audit access required' using errcode = '42501';
  end if;
  if bounded_limit < 1 or bounded_limit > 100 then
    raise exception 'Audit queue limit must be between 1 and 100';
  end if;
  if (_before_occurred_at is null) <> (_before_id is null) then
    raise exception 'Audit queue cursor is incomplete';
  end if;
  if _domains is not null and (
    pg_catalog.cardinality(_domains) < 1
    or pg_catalog.cardinality(_domains) > 6
    or exists (
      select 1
      from pg_catalog.unnest(_domains) as selected_domain
      where selected_domain is null
        or selected_domain not in ('trust', 'members', 'content', 'programs', 'io', 'team')
    )
  ) then
    raise exception 'Audit domain filter is invalid';
  end if;

  return query
  select
    event.id,
    coalesce(profile.display_name, 'Administrator'),
    event.capability,
    event.domain,
    event.action,
    event.target_type,
    event.target_id,
    event.reason,
    event.metadata,
    event.occurred_at
  from private.admin_operation_events as event
  left join public.profiles as profile on profile.user_id = event.actor_user_id
  where (_domains is null or event.domain = any (_domains))
    and (
      _before_occurred_at is null
      or (event.occurred_at, event.id) < (_before_occurred_at, _before_id)
    )
  order by event.occurred_at desc, event.id desc
  limit bounded_limit;
end;
$function$;

revoke all on function public.admin_operation_event_queue(text[], timestamptz, bigint, integer)
  from public, anon;
grant execute on function public.admin_operation_event_queue(text[], timestamptz, bigint, integer)
  to authenticated, service_role;

comment on function public.admin_member_search(text, integer) is
  'Privacy-minimised member search for scoped support operators; excludes email and private location.';
comment on function public.admin_set_member_suspension(uuid, boolean, text, boolean) is
  'Concurrency-safe, reasoned member suspension/lift command with protected admin targets and private evidence.';
comment on function public.admin_set_member_verification(uuid, boolean, text, boolean) is
  'Concurrency-safe, reasoned member verification command with immutable decision and private evidence.';
comment on function public.admin_operation_event_queue(text[], timestamptz, bigint, integer) is
  'Capability-checked, redacted and keyset-paginated cross-domain admin operation evidence.';
