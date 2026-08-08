-- Separate the always-available I/O product from the community product.
--
-- Community access is an explicit, server-owned onboarding state. Product
-- measurement is deliberately narrow: consent defaults off, surfaces and event
-- names are allowlisted, and event rows contain no free-form payload or request
-- metadata.

create schema if not exists private;

create table private.community_onboarding_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'not_started',
  current_step text not null default 'welcome',
  version integer not null default 0,
  started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint community_onboarding_state_status_check check (
    status in ('not_started', 'in_progress', 'paused', 'completed')
  ),
  constraint community_onboarding_state_step_check check (
    current_step in ('welcome', 'profile', 'interests', 'review', 'completed')
  ),
  constraint community_onboarding_state_version_check check (version >= 0),
  constraint community_onboarding_state_started_check check (
    status = 'not_started' or started_at is not null
  ),
  constraint community_onboarding_state_paused_check check (
    (status = 'paused' and paused_at is not null)
    or (status <> 'paused' and paused_at is null)
  ),
  constraint community_onboarding_state_completed_check check (
    (
      status = 'completed'
      and current_step = 'completed'
      and completed_at is not null
    )
    or (
      status <> 'completed'
      and current_step <> 'completed'
      and completed_at is null
    )
  )
);

comment on table private.community_onboarding_state is
  'Server-owned community onboarding state. I/O access does not depend on this row or on profile segmentation/location.';

create table private.product_measurement_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  consent_enabled boolean not null default false,
  consent_version integer not null default 1,
  consented_at timestamptz,
  revoked_at timestamptz default pg_catalog.now(),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint product_measurement_preferences_version_check check (
    consent_version > 0
  ),
  constraint product_measurement_preferences_timestamps_check check (
    (consent_enabled and consented_at is not null and revoked_at is null)
    or (not consent_enabled and consented_at is null and revoked_at is not null)
  )
);

comment on table private.product_measurement_preferences is
  'Explicit per-user product-measurement consent. A missing row is consent off.';

create table private.product_measurement_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  surface text not null,
  event_name text not null,
  client_operation_id uuid not null,
  occurred_at timestamptz not null default pg_catalog.now(),
  constraint product_measurement_events_surface_check check (
    surface in ('io', 'community')
  ),
  constraint product_measurement_events_name_check check (
    event_name in (
      'surface_opened',
      'onboarding_started',
      'onboarding_completed',
      'action_started',
      'action_completed',
      'action_failed'
    )
  ),
  constraint product_measurement_events_user_operation_key unique (
    user_id,
    client_operation_id
  )
);

comment on table private.product_measurement_events is
  'Consent-gated, allowlisted product events. There is intentionally no payload, location, prompt, email, IP, or user-agent field.';

create table private.product_client_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_operation_id uuid not null,
  operation_kind text not null,
  expected_version integer,
  consent_enabled boolean,
  surface text,
  event_name text,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, client_operation_id),
  constraint product_client_operations_kind_check check (
    operation_kind in (
      'community.start',
      'community.complete',
      'measurement.consent',
      'measurement.event'
    )
  ),
  constraint product_client_operations_version_check check (
    expected_version is null or expected_version >= 0
  ),
  constraint product_client_operations_surface_check check (
    surface is null or surface in ('io', 'community')
  ),
  constraint product_client_operations_event_name_check check (
    event_name is null
    or event_name in (
      'surface_opened',
      'onboarding_started',
      'onboarding_completed',
      'action_started',
      'action_completed',
      'action_failed'
    )
  ),
  constraint product_client_operations_shape_check check (
    (
      operation_kind in ('community.start', 'community.complete')
      and expected_version is not null
      and consent_enabled is null
      and surface is null
      and event_name is null
    )
    or (
      operation_kind = 'measurement.consent'
      and expected_version is null
      and consent_enabled is not null
      and surface is null
      and event_name is null
    )
    or (
      operation_kind = 'measurement.event'
      and expected_version is null
      and consent_enabled is null
      and surface is not null
      and event_name is not null
    )
  )
);

comment on table private.product_client_operations is
  'Safe scalar idempotency ledger for caller-supplied operation IDs; no free-form request data is retained.';

create index product_measurement_events_user_time_idx
  on private.product_measurement_events (user_id, occurred_at desc);

create index product_client_operations_user_time_idx
  on private.product_client_operations (user_id, created_at desc);

alter table private.community_onboarding_state enable row level security;
alter table private.product_measurement_preferences enable row level security;
alter table private.product_measurement_events enable row level security;
alter table private.product_client_operations enable row level security;

revoke all on table private.community_onboarding_state
  from public, anon, authenticated, service_role;
revoke all on table private.product_measurement_preferences
  from public, anon, authenticated, service_role;
revoke all on table private.product_measurement_events
  from public, anon, authenticated, service_role;
revoke all on table private.product_client_operations
  from public, anon, authenticated, service_role;

grant select, insert, update, delete
  on table private.community_onboarding_state to service_role;
grant select, insert, update, delete
  on table private.product_measurement_preferences to service_role;
grant select, insert, update, delete
  on table private.product_measurement_events to service_role;
grant select, insert, update, delete
  on table private.product_client_operations to service_role;

-- Existing community members are the only rows backfilled as completed. A
-- profile without a segment remains eligible for I/O and has not completed the
-- separate community journey.
insert into private.community_onboarding_state (
  user_id,
  status,
  current_step,
  version,
  started_at,
  completed_at,
  created_at,
  updated_at
)
select
  profile.user_id,
  'completed',
  'completed',
  1,
  profile.created_at,
  coalesce(profile.updated_at, profile.created_at),
  profile.created_at,
  coalesce(profile.updated_at, profile.created_at)
from public.profiles as profile
where profile.orbit_segment is not null
on conflict (user_id) do nothing;

create or replace function public.get_my_product_access()
returns table (
  io_access boolean,
  community_access boolean,
  community_status text,
  community_current_step text,
  community_version integer,
  measurement_consent boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Unauthorized';
  end if;

  return query
  select
    exists(
      select 1
      from public.profiles as profile
      where profile.user_id = actor_id
    ),
    coalesce(onboarding.status = 'completed', false),
    coalesce(onboarding.status, 'not_started'),
    coalesce(onboarding.current_step, 'welcome'),
    coalesce(onboarding.version, 0),
    coalesce(preference.consent_enabled, false)
  from (select 1) as singleton
  left join private.community_onboarding_state as onboarding
    on onboarding.user_id = actor_id
  left join private.product_measurement_preferences as preference
    on preference.user_id = actor_id;
end;
$function$;

create or replace function public.start_my_community_onboarding(
  _version integer,
  _client_operation_id uuid
)
returns table (
  io_access boolean,
  community_access boolean,
  community_status text,
  community_current_step text,
  community_version integer,
  measurement_consent boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  existing_operation private.product_client_operations%rowtype;
  onboarding private.community_onboarding_state%rowtype;
begin
  if actor_id is null then
    raise exception 'Unauthorized';
  end if;
  if _version is null or _version < 0 then
    raise exception 'Version must be zero or greater';
  end if;
  if _client_operation_id is null then
    raise exception 'Client operation ID is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'product-community-onboarding:' || actor_id::text,
      0
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'product-operation:' || actor_id::text || ':' || _client_operation_id::text,
      0
    )
  );

  select operation.*
  into existing_operation
  from private.product_client_operations as operation
  where operation.user_id = actor_id
    and operation.client_operation_id = _client_operation_id;

  if found then
    if existing_operation.operation_kind <> 'community.start'
      or existing_operation.expected_version is distinct from _version then
      raise exception 'Client operation ID was already used with different parameters';
    end if;

    return query
    select access.* from public.get_my_product_access() as access;
    return;
  end if;

  select state.*
  into onboarding
  from private.community_onboarding_state as state
  where state.user_id = actor_id
  for update;

  if not found then
    if not exists(
      select 1 from public.profiles as profile where profile.user_id = actor_id
    ) then
      raise exception 'Profile required';
    end if;
    if _version <> 0 then
      raise exception 'Community onboarding version conflict';
    end if;

    insert into private.community_onboarding_state (
      user_id,
      status,
      current_step,
      version,
      started_at,
      created_at,
      updated_at
    ) values (
      actor_id,
      'in_progress',
      'profile',
      1,
      pg_catalog.now(),
      pg_catalog.now(),
      pg_catalog.now()
    );
  else
    if onboarding.version <> _version then
      raise exception 'Community onboarding version conflict';
    end if;
    if onboarding.status = 'completed' then
      raise exception 'Community onboarding is already completed';
    end if;

    update private.community_onboarding_state as state
    set status = 'in_progress',
        current_step = case
          when state.current_step = 'welcome' then 'profile'
          else state.current_step
        end,
        version = state.version + 1,
        started_at = coalesce(state.started_at, pg_catalog.now()),
        paused_at = null,
        updated_at = pg_catalog.now()
    where state.user_id = actor_id;
  end if;

  insert into private.product_client_operations (
    user_id,
    client_operation_id,
    operation_kind,
    expected_version
  ) values (
    actor_id,
    _client_operation_id,
    'community.start',
    _version
  );

  return query
  select access.* from public.get_my_product_access() as access;
end;
$function$;

create or replace function public.complete_my_community_onboarding(
  _version integer,
  _client_operation_id uuid
)
returns table (
  io_access boolean,
  community_access boolean,
  community_status text,
  community_current_step text,
  community_version integer,
  measurement_consent boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  existing_operation private.product_client_operations%rowtype;
  onboarding private.community_onboarding_state%rowtype;
begin
  if actor_id is null then
    raise exception 'Unauthorized';
  end if;
  if _version is null or _version < 0 then
    raise exception 'Version must be zero or greater';
  end if;
  if _client_operation_id is null then
    raise exception 'Client operation ID is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'product-community-onboarding:' || actor_id::text,
      0
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'product-operation:' || actor_id::text || ':' || _client_operation_id::text,
      0
    )
  );

  select operation.*
  into existing_operation
  from private.product_client_operations as operation
  where operation.user_id = actor_id
    and operation.client_operation_id = _client_operation_id;

  if found then
    if existing_operation.operation_kind <> 'community.complete'
      or existing_operation.expected_version is distinct from _version then
      raise exception 'Client operation ID was already used with different parameters';
    end if;

    return query
    select access.* from public.get_my_product_access() as access;
    return;
  end if;

  select state.*
  into onboarding
  from private.community_onboarding_state as state
  where state.user_id = actor_id
  for update;

  if not found or onboarding.status not in ('in_progress', 'paused') then
    raise exception 'Community onboarding must be in progress';
  end if;
  if onboarding.version <> _version then
    raise exception 'Community onboarding version conflict';
  end if;
  if not exists (
    select 1
    from public.profiles as profile
    where profile.user_id = actor_id
      and profile.orbit_segment is not null
  ) then
    raise exception 'Community identity is required before completion';
  end if;

  update private.community_onboarding_state as state
  set status = 'completed',
      current_step = 'completed',
      version = state.version + 1,
      paused_at = null,
      completed_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where state.user_id = actor_id;

  insert into private.product_client_operations (
    user_id,
    client_operation_id,
    operation_kind,
    expected_version
  ) values (
    actor_id,
    _client_operation_id,
    'community.complete',
    _version
  );

  return query
  select access.* from public.get_my_product_access() as access;
end;
$function$;

create or replace function public.set_my_measurement_consent(
  _enabled boolean,
  _client_operation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  existing_operation private.product_client_operations%rowtype;
begin
  if actor_id is null then
    raise exception 'Unauthorized';
  end if;
  if _enabled is null then
    raise exception 'Consent choice is required';
  end if;
  if _client_operation_id is null then
    raise exception 'Client operation ID is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'product-measurement-consent:' || actor_id::text,
      0
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'product-operation:' || actor_id::text || ':' || _client_operation_id::text,
      0
    )
  );

  select operation.*
  into existing_operation
  from private.product_client_operations as operation
  where operation.user_id = actor_id
    and operation.client_operation_id = _client_operation_id;

  if found then
    if existing_operation.operation_kind <> 'measurement.consent'
      or existing_operation.consent_enabled is distinct from _enabled then
      raise exception 'Client operation ID was already used with different parameters';
    end if;
    return existing_operation.consent_enabled;
  end if;

  insert into private.product_measurement_preferences as preference (
    user_id,
    consent_enabled,
    consent_version,
    consented_at,
    revoked_at,
    created_at,
    updated_at
  ) values (
    actor_id,
    _enabled,
    1,
    case when _enabled then pg_catalog.now() end,
    case when not _enabled then pg_catalog.now() end,
    pg_catalog.now(),
    pg_catalog.now()
  )
  on conflict (user_id) do update
  set consent_enabled = excluded.consent_enabled,
      consent_version = preference.consent_version + 1,
      consented_at = excluded.consented_at,
      revoked_at = excluded.revoked_at,
      updated_at = pg_catalog.now();

  insert into private.product_client_operations (
    user_id,
    client_operation_id,
    operation_kind,
    consent_enabled
  ) values (
    actor_id,
    _client_operation_id,
    'measurement.consent',
    _enabled
  );

  return _enabled;
end;
$function$;

create or replace function public.record_my_product_event(
  _surface text,
  _event_name text,
  _client_operation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  existing_operation private.product_client_operations%rowtype;
  has_consent boolean;
begin
  if actor_id is null then
    raise exception 'Unauthorized';
  end if;
  if _client_operation_id is null then
    raise exception 'Client operation ID is required';
  end if;
  if _surface is null or _surface not in ('io', 'community') then
    raise exception 'Unsupported product surface';
  end if;
  if _event_name is null or _event_name not in (
    'surface_opened',
    'onboarding_started',
    'onboarding_completed',
    'action_started',
    'action_completed',
    'action_failed'
  ) then
    raise exception 'Unsupported product event';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'product-measurement-consent:' || actor_id::text,
      0
    )
  );

  select coalesce(preference.consent_enabled, false)
  into has_consent
  from (select 1) as singleton
  left join private.product_measurement_preferences as preference
    on preference.user_id = actor_id;

  -- Consent-off calls leave no event or idempotency trace.
  if not has_consent then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'product-operation:' || actor_id::text || ':' || _client_operation_id::text,
      0
    )
  );

  select operation.*
  into existing_operation
  from private.product_client_operations as operation
  where operation.user_id = actor_id
    and operation.client_operation_id = _client_operation_id;

  if found then
    if existing_operation.operation_kind <> 'measurement.event'
      or existing_operation.surface is distinct from _surface
      or existing_operation.event_name is distinct from _event_name then
      raise exception 'Client operation ID was already used with different parameters';
    end if;
    return true;
  end if;

  insert into private.product_measurement_events (
    user_id,
    surface,
    event_name,
    client_operation_id
  ) values (
    actor_id,
    _surface,
    _event_name,
    _client_operation_id
  );

  insert into private.product_client_operations (
    user_id,
    client_operation_id,
    operation_kind,
    surface,
    event_name
  ) values (
    actor_id,
    _client_operation_id,
    'measurement.event',
    _surface,
    _event_name
  );

  return true;
end;
$function$;

revoke all on function public.get_my_product_access()
  from public, anon, authenticated, service_role;
revoke all on function public.start_my_community_onboarding(integer, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.complete_my_community_onboarding(integer, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.set_my_measurement_consent(boolean, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.record_my_product_event(text, text, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.get_my_product_access()
  to authenticated, service_role;
grant execute on function public.start_my_community_onboarding(integer, uuid)
  to authenticated, service_role;
grant execute on function public.complete_my_community_onboarding(integer, uuid)
  to authenticated, service_role;
grant execute on function public.set_my_measurement_consent(boolean, uuid)
  to authenticated, service_role;
grant execute on function public.record_my_product_event(text, text, uuid)
  to authenticated, service_role;

comment on function public.get_my_product_access() is
  'Caller-bound product boundary: I/O is available to any authenticated profile; community requires completed community onboarding.';
comment on function public.record_my_product_event(text, text, uuid) is
  'Records only consented, allowlisted surface events and stores no free-form payload or request metadata.';
