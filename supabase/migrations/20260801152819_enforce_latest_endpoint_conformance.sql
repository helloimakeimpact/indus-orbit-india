-- I/O provider safety: make one endpoint's latest capability and latest
-- conformance result the canonical evidence used by the operator snapshot,
-- activation switch and runtime resolver.
--
-- Older verified capabilities and older passed runs must never keep an
-- endpoint routable after newer evidence supersedes them.

-- A conformance run records both an endpoint and a capability version. Bind
-- those columns together so evidence from one endpoint cannot be attached to
-- another endpoint, even through a privileged write.
alter table public.io_endpoint_capability_versions
  add constraint io_endpoint_capability_versions_endpoint_id_id_key
  unique (endpoint_id, id);

alter table private.io_provider_conformance_runs
  add constraint io_provider_conformance_runs_passed_capability_check
  check (run_state <> 'passed' or capability_version_id is not null)
  not valid;

alter table private.io_provider_conformance_runs
  validate constraint io_provider_conformance_runs_passed_capability_check;

alter table private.io_provider_conformance_runs
  add constraint io_provider_conformance_runs_endpoint_capability_fkey
  foreign key (endpoint_id, capability_version_id)
  references public.io_endpoint_capability_versions (endpoint_id, id)
  on delete set null (capability_version_id)
  not valid;

alter table private.io_provider_conformance_runs
  validate constraint io_provider_conformance_runs_endpoint_capability_fkey;

alter table private.io_provider_conformance_runs
  drop constraint io_provider_conformance_runs_capability_version_id_fkey;

-- The UUID tie-breaker makes simultaneous run timestamps deterministic.
drop index if exists private.io_provider_conformance_runs_endpoint_time_idx;

create index io_provider_conformance_runs_endpoint_time_idx
  on private.io_provider_conformance_runs (endpoint_id, started_at desc, id desc);

create or replace function private.io_endpoint_latest_evidence(_endpoint_id uuid)
returns table (
  capability_version_id uuid,
  capability_version integer,
  capability_state text,
  supports_chat boolean,
  conformance_run_id uuid,
  conformance_capability_version_id uuid,
  conformance_state text,
  eligible boolean
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    capability.id,
    capability.version,
    coalesce(capability.verification_state, 'missing'),
    coalesce(capability.supports_chat, false),
    conformance.id,
    conformance.capability_version_id,
    coalesce(conformance.run_state, 'not_run'),
    coalesce(
      capability.verification_state = 'verified'
      and capability.supports_chat = true
      and conformance.run_state = 'passed'
      and conformance.finished_at is not null
      and conformance.capability_version_id = capability.id,
      false
    )
  from (values (_endpoint_id)) as requested(endpoint_id)
  left join lateral (
    select
      capability_version.id,
      capability_version.version,
      capability_version.verification_state,
      capability_version.supports_chat
    from public.io_endpoint_capability_versions as capability_version
    where capability_version.endpoint_id = requested.endpoint_id
    order by capability_version.version desc
    limit 1
  ) as capability on true
  left join lateral (
    select
      conformance_run.id,
      conformance_run.capability_version_id,
      conformance_run.run_state,
      conformance_run.finished_at
    from private.io_provider_conformance_runs as conformance_run
    where conformance_run.endpoint_id = requested.endpoint_id
    order by conformance_run.started_at desc, conformance_run.id desc
    limit 1
  ) as conformance on true;
$function$;

revoke all on function private.io_endpoint_latest_evidence(uuid)
  from public, anon, authenticated;

comment on function private.io_endpoint_latest_evidence(uuid) is
  'Internal fail-closed projection of the latest endpoint capability and latest endpoint conformance run. Historical evidence never satisfies current routing eligibility.';

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
    coalesce(evidence.capability_state, 'missing'),
    coalesce(evidence.supports_chat, false),
    coalesce(price.publication_state, 'missing'),
    price.currency_code,
    coalesce(evidence.conformance_state, 'not_run'),
    coalesce(runtime_control.routing_enabled, false),
    coalesce(
      runtime_control.disabled_reason,
      'Provider runtime control has not been configured.'
    ),
    coalesce(
      provider.lifecycle_state = 'active'
      and provider.catalogue_visibility = 'listed'
      and model.listing_state = 'listed'
      and endpoint.routing_state = 'active'
      and endpoint.member_visible = true
      and connection.connection_state = 'ready'
      and connection.endpoint_base_url is not null
      and connection.secret_reference is not null
      and price.version is not null
      and evidence.eligible,
      false
    ),
    runtime_control.updated_at
  from public.io_providers as provider
  left join public.io_model_endpoints as endpoint on endpoint.provider_id = provider.id
  left join public.io_models as model
    on model.id = endpoint.model_id
    and model.provider_id = endpoint.provider_id
  left join private.io_endpoint_connections as connection on connection.endpoint_id = endpoint.id
  left join private.io_provider_runtime_controls as runtime_control
    on runtime_control.provider_id = provider.id
  left join lateral private.io_endpoint_latest_evidence(endpoint.id) as evidence on true
  left join lateral (
    select
      pricing_version.version,
      pricing_version.publication_state,
      pricing_version.currency_code
    from public.io_endpoint_pricing_versions as pricing_version
    where pricing_version.endpoint_id = endpoint.id
      and pricing_version.publication_state = 'published'
      and pricing_version.member_visible = true
      and pricing_version.billing_meter = 'tokens'
      and pricing_version.effective_from <= now()
      and (pricing_version.effective_until is null or pricing_version.effective_until > now())
    order by pricing_version.effective_from desc, pricing_version.version desc
    limit 1
  ) as price on true
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
    join public.io_models as model
      on model.id = endpoint.model_id
      and model.provider_id = endpoint.provider_id
    join private.io_endpoint_connections as connection on connection.endpoint_id = endpoint.id
    join lateral private.io_endpoint_latest_evidence(endpoint.id) as evidence
      on evidence.eligible
    join lateral (
      select pricing_version.id
      from public.io_endpoint_pricing_versions as pricing_version
      where pricing_version.endpoint_id = endpoint.id
        and pricing_version.publication_state = 'published'
        and pricing_version.member_visible = true
        and pricing_version.billing_meter = 'tokens'
        and pricing_version.effective_from <= now()
        and (pricing_version.effective_until is null or pricing_version.effective_until > now())
      order by pricing_version.effective_from desc, pricing_version.version desc
      limit 1
    ) as price on true
    where provider.id = _provider_id
      and provider.lifecycle_state = 'active'
      and provider.catalogue_visibility = 'listed'
      and model.listing_state = 'listed'
      and endpoint.routing_state = 'active'
      and endpoint.member_visible = true
      and connection.connection_state = 'ready'
      and connection.endpoint_base_url is not null
      and connection.secret_reference is not null
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
    evidence.capability_version,
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
  join lateral private.io_endpoint_latest_evidence(endpoint.id) as evidence
    on evidence.eligible
  join lateral (
    select
      pricing_version.version,
      pricing_version.currency_code,
      pricing_version.unit_quantity,
      pricing_version.input_price_nanos,
      pricing_version.output_price_nanos
    from public.io_endpoint_pricing_versions as pricing_version
    where pricing_version.endpoint_id = endpoint.id
      and pricing_version.publication_state = 'published'
      and pricing_version.member_visible = true
      and pricing_version.billing_meter = 'tokens'
      and pricing_version.effective_from <= now()
      and (pricing_version.effective_until is null or pricing_version.effective_until > now())
    order by pricing_version.effective_from desc, pricing_version.version desc
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

comment on function public.io_get_ready_endpoint_connections() is
  'Service-role-only registry resolver. Every returned endpoint has a provider switch, latest verified chat capability, latest endpoint-bound passed conformance run, ready secret-backed connection and current published token price.';
