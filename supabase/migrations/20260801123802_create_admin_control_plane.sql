-- Dedicated Indus Orbit administration control plane.
--
-- Existing public.user_roles(role = 'admin') records remain the root
-- super-admin authority so this migration does not weaken or silently expand
-- any legacy RLS policy. Scoped admin-team assignments are additive and are
-- consumed through capability-checked RPCs. Provider credentials, prompts,
-- generated content and private conformance details are never returned.

create schema if not exists private;

create table private.admin_team_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  reason text not null,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete restrict,
  constraint admin_team_assignments_role_check check (
    role in (
      'trust_safety',
      'member_support',
      'content_operator',
      'program_operator',
      'io_operator',
      'audit_viewer'
    )
  ),
  constraint admin_team_assignments_reason_check check (
    char_length(btrim(reason)) between 8 and 500
  ),
  constraint admin_team_assignments_revoke_check check (
    (revoked_at is null and revoked_by is null)
    or (revoked_at is not null and revoked_by is not null)
  )
);

create unique index admin_team_assignments_active_role_key
  on private.admin_team_assignments (user_id, role)
  where revoked_at is null;
create index admin_team_assignments_user_history_idx
  on private.admin_team_assignments (user_id, assigned_at desc);

create table private.admin_team_role_capabilities (
  role text not null,
  capability text not null,
  primary key (role, capability),
  constraint admin_team_role_capabilities_role_check check (
    role in (
      'trust_safety',
      'member_support',
      'content_operator',
      'program_operator',
      'io_operator',
      'audit_viewer'
    )
  ),
  constraint admin_team_role_capabilities_key_check check (
    capability ~ '^[a-z][a-z0-9_.-]{2,79}$'
  )
);

insert into private.admin_team_role_capabilities (role, capability)
values
  ('trust_safety', 'admin.enter'),
  ('trust_safety', 'audit.read'),
  ('trust_safety', 'reports.manage'),
  ('trust_safety', 'trust.manage'),
  ('member_support', 'admin.enter'),
  ('member_support', 'members.read'),
  ('member_support', 'members.support'),
  ('content_operator', 'admin.enter'),
  ('content_operator', 'content.manage'),
  ('program_operator', 'admin.enter'),
  ('program_operator', 'programs.manage'),
  ('io_operator', 'admin.enter'),
  ('io_operator', 'audit.read'),
  ('io_operator', 'io.manage'),
  ('io_operator', 'io.read'),
  ('audit_viewer', 'admin.enter'),
  ('audit_viewer', 'audit.read')
on conflict do nothing;

create table private.admin_team_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid not null references auth.users(id) on delete restrict,
  role text not null,
  action text not null,
  reason text not null,
  occurred_at timestamptz not null default now(),
  constraint admin_team_events_action_check check (action in ('assigned', 'revoked')),
  constraint admin_team_events_role_check check (
    role in (
      'trust_safety',
      'member_support',
      'content_operator',
      'program_operator',
      'io_operator',
      'audit_viewer'
    )
  )
);

create index admin_team_events_time_idx
  on private.admin_team_events (occurred_at desc, id desc);
create index admin_team_events_target_time_idx
  on private.admin_team_events (target_user_id, occurred_at desc);

alter table private.admin_team_assignments enable row level security;
alter table private.admin_team_role_capabilities enable row level security;
alter table private.admin_team_events enable row level security;

revoke all on private.admin_team_assignments from public, anon, authenticated;
revoke all on private.admin_team_role_capabilities from public, anon, authenticated;
revoke all on private.admin_team_events from public, anon, authenticated;
grant select, insert, update, delete on private.admin_team_assignments to service_role;
grant select on private.admin_team_role_capabilities to service_role;
grant select, insert on private.admin_team_events to service_role;

create or replace function private.is_platform_super_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select _user_id is not null and exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = _user_id
      and user_role.role::text = 'admin'
  );
$function$;

revoke all on function private.is_platform_super_admin(uuid) from public, anon, authenticated;
grant execute on function private.is_platform_super_admin(uuid) to authenticated, service_role;

create or replace function private.has_admin_capability(
  _user_id uuid,
  _capability text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    private.is_platform_super_admin(_user_id)
    or exists (
      select 1
      from private.admin_team_assignments as assignment
      join private.admin_team_role_capabilities as role_capability
        on role_capability.role = assignment.role
      where assignment.user_id = _user_id
        and assignment.revoked_at is null
        and role_capability.capability = _capability
    );
$function$;

revoke all on function private.has_admin_capability(uuid, text) from public, anon, authenticated;
grant execute on function private.has_admin_capability(uuid, text) to authenticated, service_role;

create or replace function public.get_my_admin_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  is_super_admin boolean;
  scoped_roles text[];
  scoped_capabilities text[];
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  is_super_admin := private.is_platform_super_admin(caller_id);

  select coalesce(array_agg(distinct assignment.role order by assignment.role), array[]::text[])
  into scoped_roles
  from private.admin_team_assignments as assignment
  where assignment.user_id = caller_id
    and assignment.revoked_at is null;

  select coalesce(
    array_agg(distinct role_capability.capability order by role_capability.capability),
    array[]::text[]
  )
  into scoped_capabilities
  from private.admin_team_assignments as assignment
  join private.admin_team_role_capabilities as role_capability
    on role_capability.role = assignment.role
  where assignment.user_id = caller_id
    and assignment.revoked_at is null;

  return jsonb_build_object(
    'isAdminTeam', is_super_admin or cardinality(scoped_roles) > 0,
    'isSuperAdmin', is_super_admin,
    'roles', case
      when is_super_admin then array_prepend('super_admin', scoped_roles)
      else scoped_roles
    end,
    'capabilities', case
      when is_super_admin then array['*']::text[]
      else scoped_capabilities
    end
  );
end;
$function$;

revoke all on function public.get_my_admin_access() from public, anon;
grant execute on function public.get_my_admin_access() to authenticated, service_role;

create or replace function public.admin_list_team_members()
returns table (
  user_id uuid,
  display_name text,
  headline text,
  is_super_admin boolean,
  roles text[],
  capabilities text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if not private.is_platform_super_admin(caller_id) then
    raise exception 'Super-admin access required' using errcode = '42501';
  end if;

  return query
  with team_users as (
    select role_row.user_id
    from public.user_roles as role_row
    where role_row.role::text = 'admin'
    union
    select assignment.user_id
    from private.admin_team_assignments as assignment
    where assignment.revoked_at is null
  )
  select
    team_user.user_id,
    profile.display_name,
    profile.headline,
    private.is_platform_super_admin(team_user.user_id),
    case
      when private.is_platform_super_admin(team_user.user_id)
        then array_prepend('super_admin', coalesce(role_rows.roles, array[]::text[]))
      else coalesce(role_rows.roles, array[]::text[])
    end,
    case
      when private.is_platform_super_admin(team_user.user_id) then array['*']::text[]
      else coalesce(capability_rows.capabilities, array[]::text[])
    end
  from team_users as team_user
  left join public.profiles as profile on profile.user_id = team_user.user_id
  left join lateral (
    select array_agg(distinct assignment.role order by assignment.role) as roles
    from private.admin_team_assignments as assignment
    where assignment.user_id = team_user.user_id
      and assignment.revoked_at is null
  ) as role_rows on true
  left join lateral (
    select array_agg(distinct role_capability.capability order by role_capability.capability) as capabilities
    from private.admin_team_assignments as assignment
    join private.admin_team_role_capabilities as role_capability
      on role_capability.role = assignment.role
    where assignment.user_id = team_user.user_id
      and assignment.revoked_at is null
  ) as capability_rows on true
  order by private.is_platform_super_admin(team_user.user_id) desc,
    coalesce(profile.display_name, team_user.user_id::text);
end;
$function$;

revoke all on function public.admin_list_team_members() from public, anon, authenticated;
grant execute on function public.admin_list_team_members() to authenticated, service_role;

create or replace function public.admin_search_members(
  _query text,
  _limit integer default 12
)
returns table (
  user_id uuid,
  display_name text,
  headline text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_query text := btrim(coalesce(_query, ''));
begin
  if not private.is_platform_super_admin(caller_id) then
    raise exception 'Super-admin access required' using errcode = '42501';
  end if;
  if char_length(normalized_query) < 2 then
    return;
  end if;
  if _limit is null or _limit < 1 or _limit > 25 then
    raise exception 'Search limit must be between 1 and 25';
  end if;

  return query
  select profile.user_id, profile.display_name, profile.headline
  from public.profiles as profile
  where coalesce(profile.display_name, '') ilike '%' || normalized_query || '%'
    or coalesce(profile.headline, '') ilike '%' || normalized_query || '%'
  order by
    case when coalesce(profile.display_name, '') ilike normalized_query || '%' then 0 else 1 end,
    coalesce(profile.display_name, profile.user_id::text)
  limit _limit;
end;
$function$;

revoke all on function public.admin_search_members(text, integer) from public, anon, authenticated;
grant execute on function public.admin_search_members(text, integer) to authenticated, service_role;

create or replace function public.admin_set_team_role(
  _target_user_id uuid,
  _role text,
  _enabled boolean,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_reason text := btrim(coalesce(_reason, ''));
  changed_count integer := 0;
begin
  if not private.is_platform_super_admin(caller_id) then
    raise exception 'Super-admin access required' using errcode = '42501';
  end if;
  if _target_user_id is null or not exists (
    select 1 from auth.users as auth_user where auth_user.id = _target_user_id
  ) then
    raise exception 'Target user does not exist';
  end if;
  if _role not in (
    'trust_safety',
    'member_support',
    'content_operator',
    'program_operator',
    'io_operator',
    'audit_viewer'
  ) then
    raise exception 'Unsupported admin-team role';
  end if;
  if char_length(normalized_reason) < 8 or char_length(normalized_reason) > 500 then
    raise exception 'A reason between 8 and 500 characters is required';
  end if;

  if _enabled then
    insert into private.admin_team_assignments (
      user_id,
      role,
      assigned_by,
      reason
    )
    select _target_user_id, _role, caller_id, normalized_reason
    where not exists (
      select 1
      from private.admin_team_assignments as assignment
      where assignment.user_id = _target_user_id
        and assignment.role = _role
        and assignment.revoked_at is null
    );
    get diagnostics changed_count = row_count;
  else
    update private.admin_team_assignments as assignment
    set revoked_at = now(), revoked_by = caller_id
    where assignment.user_id = _target_user_id
      and assignment.role = _role
      and assignment.revoked_at is null;
    get diagnostics changed_count = row_count;
  end if;

  if changed_count > 0 then
    insert into private.admin_team_events (
      actor_user_id,
      target_user_id,
      role,
      action,
      reason
    ) values (
      caller_id,
      _target_user_id,
      _role,
      case when _enabled then 'assigned' else 'revoked' end,
      normalized_reason
    );
  end if;

  return jsonb_build_object('ok', true, 'changed', changed_count > 0);
end;
$function$;

revoke all on function public.admin_set_team_role(uuid, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.admin_set_team_role(uuid, text, boolean, text)
  to authenticated, service_role;

-- A separate, fail-closed provider switch. Catalogue state, conformance and a
-- configured secret are necessary but no longer sufficient for routing.
create table private.io_provider_runtime_controls (
  provider_id uuid primary key references public.io_providers(id) on delete cascade,
  routing_enabled boolean not null default false,
  disabled_reason text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_provider_runtime_controls_reason_check check (
    (routing_enabled and disabled_reason is null)
    or (
      not routing_enabled
      and disabled_reason is not null
      and char_length(btrim(disabled_reason)) between 8 and 500
    )
  )
);

create table private.io_provider_control_events (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.io_providers(id) on delete restrict,
  routing_enabled boolean not null,
  reason text not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  constraint io_provider_control_events_reason_check check (
    char_length(btrim(reason)) between 8 and 500
  )
);

create index io_provider_control_events_provider_time_idx
  on private.io_provider_control_events (provider_id, occurred_at desc, id desc);

alter table private.io_provider_runtime_controls enable row level security;
alter table private.io_provider_control_events enable row level security;
revoke all on private.io_provider_runtime_controls from public, anon, authenticated;
revoke all on private.io_provider_control_events from public, anon, authenticated;
grant select, insert, update on private.io_provider_runtime_controls to service_role;
grant select, insert on private.io_provider_control_events to service_role;

insert into private.io_provider_runtime_controls (
  provider_id,
  routing_enabled,
  disabled_reason
)
select
  provider.id,
  false,
  'Awaiting approved conformance, operations review and budget controls.'
from public.io_providers as provider
on conflict (provider_id) do nothing;

create or replace function public.admin_io_operational_snapshot()
returns table (
  provider_id uuid,
  provider_key text,
  provider_display_name text,
  provider_lifecycle_state text,
  integration_style text,
  endpoint_id uuid,
  endpoint_key text,
  endpoint_routing_state text,
  model_display_name text,
  capacity_mode text,
  connection_state text,
  capability_state text,
  supports_chat boolean,
  price_state text,
  currency_code text,
  latest_conformance_state text,
  routing_enabled boolean,
  disabled_reason text,
  activation_eligible boolean,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if not private.has_admin_capability(caller_id, 'io.read') then
    raise exception 'I/O operations access required' using errcode = '42501';
  end if;

  return query
  select
    provider.id,
    provider.provider_key,
    provider.display_name,
    provider.lifecycle_state,
    provider.integration_style,
    endpoint.id,
    endpoint.endpoint_key,
    endpoint.routing_state,
    model.display_name,
    endpoint.capacity_mode,
    coalesce(connection.connection_state, 'unconfigured'),
    coalesce(capability.verification_state, 'missing'),
    coalesce(capability.supports_chat, false),
    coalesce(price.publication_state, 'missing'),
    price.currency_code,
    coalesce(conformance.run_state, 'not_run'),
    coalesce(runtime_control.routing_enabled, false),
    coalesce(
      runtime_control.disabled_reason,
      'Provider runtime control has not been configured.'
    ),
    (
      provider.lifecycle_state = 'active'
      and provider.catalogue_visibility = 'listed'
      and model.listing_state = 'listed'
      and endpoint.routing_state = 'active'
      and endpoint.member_visible = true
      and connection.connection_state = 'ready'
      and capability.verification_state = 'verified'
      and capability.supports_chat = true
      and price.publication_state = 'published'
      and price.member_visible = true
      and conformance.run_state = 'passed'
    ),
    runtime_control.updated_at
  from public.io_providers as provider
  left join public.io_model_endpoints as endpoint on endpoint.provider_id = provider.id
  left join public.io_models as model on model.id = endpoint.model_id
  left join private.io_endpoint_connections as connection on connection.endpoint_id = endpoint.id
  left join private.io_provider_runtime_controls as runtime_control
    on runtime_control.provider_id = provider.id
  left join lateral (
    select capability_version.verification_state, capability_version.supports_chat
    from public.io_endpoint_capability_versions as capability_version
    where capability_version.endpoint_id = endpoint.id
    order by capability_version.version desc
    limit 1
  ) as capability on true
  left join lateral (
    select pricing_version.publication_state,
      pricing_version.member_visible,
      pricing_version.currency_code
    from public.io_endpoint_pricing_versions as pricing_version
    where pricing_version.endpoint_id = endpoint.id
      and pricing_version.effective_from <= now()
      and (pricing_version.effective_until is null or pricing_version.effective_until > now())
    order by pricing_version.version desc
    limit 1
  ) as price on true
  left join lateral (
    select conformance_run.run_state
    from private.io_provider_conformance_runs as conformance_run
    where conformance_run.endpoint_id = endpoint.id
    order by conformance_run.started_at desc
    limit 1
  ) as conformance on true
  order by provider.display_name, model.display_name nulls last;
end;
$function$;

revoke all on function public.admin_io_operational_snapshot()
  from public, anon, authenticated;
grant execute on function public.admin_io_operational_snapshot()
  to authenticated, service_role;

create or replace function public.admin_io_set_provider_routing(
  _provider_id uuid,
  _enabled boolean,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.has_admin_capability(caller_id, 'io.manage') then
    raise exception 'I/O operations management access required' using errcode = '42501';
  end if;
  if char_length(normalized_reason) < 8 or char_length(normalized_reason) > 500 then
    raise exception 'A reason between 8 and 500 characters is required';
  end if;
  if not exists (
    select 1 from public.io_providers as provider where provider.id = _provider_id
  ) then
    raise exception 'Provider does not exist';
  end if;

  if _enabled and not exists (
    select 1
    from public.io_providers as provider
    join public.io_model_endpoints as endpoint on endpoint.provider_id = provider.id
    join public.io_models as model on model.id = endpoint.model_id
    join private.io_endpoint_connections as connection on connection.endpoint_id = endpoint.id
    where provider.id = _provider_id
      and provider.lifecycle_state = 'active'
      and provider.catalogue_visibility = 'listed'
      and model.listing_state = 'listed'
      and endpoint.routing_state = 'active'
      and endpoint.member_visible = true
      and connection.connection_state = 'ready'
      and exists (
        select 1
        from public.io_endpoint_capability_versions as capability
        where capability.endpoint_id = endpoint.id
          and capability.verification_state = 'verified'
          and capability.supports_chat = true
      )
      and exists (
        select 1
        from public.io_endpoint_pricing_versions as price
        where price.endpoint_id = endpoint.id
          and price.publication_state = 'published'
          and price.member_visible = true
          and price.effective_from <= now()
          and (price.effective_until is null or price.effective_until > now())
      )
      and exists (
        select 1
        from private.io_provider_conformance_runs as conformance
        where conformance.endpoint_id = endpoint.id
          and conformance.run_state = 'passed'
          and conformance.finished_at is not null
      )
  ) then
    raise exception 'Provider has no endpoint eligible for activation';
  end if;

  insert into private.io_provider_runtime_controls (
    provider_id,
    routing_enabled,
    disabled_reason,
    updated_by,
    updated_at
  ) values (
    _provider_id,
    _enabled,
    case when _enabled then null else normalized_reason end,
    caller_id,
    now()
  )
  on conflict (provider_id) do update set
    routing_enabled = excluded.routing_enabled,
    disabled_reason = excluded.disabled_reason,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  insert into private.io_provider_control_events (
    provider_id,
    routing_enabled,
    reason,
    actor_user_id
  ) values (
    _provider_id,
    _enabled,
    normalized_reason,
    caller_id
  );

  return jsonb_build_object('ok', true, 'routingEnabled', _enabled);
end;
$function$;

revoke all on function public.admin_io_set_provider_routing(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.admin_io_set_provider_routing(uuid, boolean, text)
  to authenticated, service_role;

-- Add the new operations switch to the service-only router resolver. This is
-- the enforcement point: UI visibility never makes a provider routable.
create or replace function public.io_get_ready_endpoint_connections()
returns table (
  endpoint_id uuid,
  provider_id uuid,
  provider_key text,
  provider_display_name text,
  integration_style text,
  model_id uuid,
  provider_model_id text,
  model_display_name text,
  model_release_date date,
  model_deprecation_at timestamptz,
  auto_route_tier text,
  max_context_tokens integer,
  capacity_source_id uuid,
  endpoint_key text,
  capacity_mode text,
  region_code text,
  residency_country_code text,
  retention_class text,
  endpoint_base_url text,
  secret_reference text,
  capability_version integer,
  price_version integer,
  currency_code text,
  unit_quantity bigint,
  input_price_nanos bigint,
  output_price_nanos bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return query
  select
    endpoint.id,
    provider.id,
    provider.provider_key,
    provider.display_name,
    provider.integration_style,
    model.id,
    model.provider_model_id,
    model.display_name,
    model.released_at,
    model.deprecation_at,
    model.auto_route_tier,
    model.max_context_tokens,
    endpoint.capacity_source_id,
    endpoint.endpoint_key,
    endpoint.capacity_mode,
    endpoint.region_code,
    endpoint.residency_country_code,
    endpoint.retention_class,
    connection.endpoint_base_url,
    connection.secret_reference,
    capability.version,
    price.version,
    price.currency_code,
    price.unit_quantity,
    price.input_price_nanos,
    price.output_price_nanos
  from public.io_model_endpoints as endpoint
  join public.io_providers as provider on provider.id = endpoint.provider_id
  join public.io_models as model
    on model.id = endpoint.model_id
    and model.provider_id = endpoint.provider_id
  join private.io_endpoint_connections as connection on connection.endpoint_id = endpoint.id
  join private.io_provider_runtime_controls as runtime_control
    on runtime_control.provider_id = provider.id
    and runtime_control.routing_enabled = true
  join lateral (
    select capability_version.version
    from public.io_endpoint_capability_versions as capability_version
    where capability_version.endpoint_id = endpoint.id
      and capability_version.verification_state = 'verified'
      and capability_version.supports_chat = true
    order by capability_version.version desc
    limit 1
  ) as capability on true
  join lateral (
    select
      price_version.version,
      price_version.currency_code,
      price_version.unit_quantity,
      price_version.input_price_nanos,
      price_version.output_price_nanos
    from public.io_endpoint_pricing_versions as price_version
    where price_version.endpoint_id = endpoint.id
      and price_version.publication_state = 'published'
      and price_version.member_visible = true
      and price_version.billing_meter = 'tokens'
      and price_version.effective_from <= now()
      and (price_version.effective_until is null or price_version.effective_until > now())
    order by price_version.effective_from desc, price_version.version desc
    limit 1
  ) as price on true
  where provider.lifecycle_state = 'active'
    and provider.catalogue_visibility = 'listed'
    and model.listing_state = 'listed'
    and endpoint.routing_state = 'active'
    and endpoint.member_visible = true
    and connection.connection_state = 'ready'
    and connection.endpoint_base_url is not null
    and connection.secret_reference is not null;
end;
$function$;

revoke all on function public.io_get_ready_endpoint_connections()
  from public, anon, authenticated;
grant execute on function public.io_get_ready_endpoint_connections() to service_role;

comment on table private.admin_team_assignments is
  'Scoped, revocable admin-team assignments. Legacy app_role admin remains the platform super-admin authority.';
comment on function public.get_my_admin_access() is
  'Caller-bound admin control-plane access projection; never trusts JWT user metadata.';
comment on table private.io_provider_runtime_controls is
  'Fail-closed provider routing kill switch controlled through audited capability-checked RPCs.';
