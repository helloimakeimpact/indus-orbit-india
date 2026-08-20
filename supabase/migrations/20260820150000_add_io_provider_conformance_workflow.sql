-- Bounded provider-conformance workflow.
--
-- An io.manage operator explicitly authorizes a single run, a maximum upstream
-- cost and (for CN endpoints) external processing. The Edge Function performs
-- non-billable discovery before one tiny deterministic chat request. Only
-- allow-listed, redacted evidence is persisted.

create table private.io_provider_conformance_approvals (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.io_model_endpoints(id) on delete restrict,
  capability_version_id uuid not null references public.io_endpoint_capability_versions(id) on delete restrict,
  suite_version text not null,
  max_provider_cost_nanos bigint not null,
  acknowledges_external_processing boolean not null default false,
  residency_country_code text,
  reason text not null,
  state text not null default 'approved',
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint io_provider_conformance_approvals_suite_check check (
    suite_version ~ '^io-chat-v[0-9]+$'
  ),
  constraint io_provider_conformance_approvals_cost_check check (
    max_provider_cost_nanos between 1 and 10000000
  ),
  constraint io_provider_conformance_approvals_residency_check check (
    residency_country_code is null or residency_country_code ~ '^[A-Z]{2}$'
  ),
  constraint io_provider_conformance_approvals_reason_check check (
    char_length(btrim(reason)) between 8 and 500
  ),
  constraint io_provider_conformance_approvals_state_check check (
    state in ('approved', 'consumed', 'revoked', 'expired')
  ),
  constraint io_provider_conformance_approvals_expiry_check check (
    expires_at > approved_at and expires_at <= approved_at + interval '2 hours'
  ),
  constraint io_provider_conformance_approvals_consumed_check check (
    (state = 'approved' and consumed_at is null)
    or (state <> 'approved' and consumed_at is not null)
  ),
  constraint io_provider_conformance_approvals_cn_check check (
    residency_country_code <> 'CN' or acknowledges_external_processing
  )
);

create index io_provider_conformance_approvals_endpoint_time_idx
  on private.io_provider_conformance_approvals (endpoint_id, approved_at desc, id desc);
create index io_provider_conformance_approvals_approved_by_idx
  on private.io_provider_conformance_approvals (approved_by, approved_at desc);

alter table private.io_provider_conformance_runs
  add column approval_id uuid references private.io_provider_conformance_approvals(id) on delete restrict,
  add column suite_version text not null default 'io-chat-v0',
  add column provider_cost_nanos bigint,
  add column discovery_state text,
  add column evidence_sha256 text;

alter table private.io_provider_conformance_runs
  add constraint io_provider_conformance_runs_suite_check check (
    suite_version ~ '^io-chat-v[0-9]+$'
  ),
  add constraint io_provider_conformance_runs_cost_check check (
    provider_cost_nanos is null or provider_cost_nanos >= 0
  ),
  add constraint io_provider_conformance_runs_discovery_check check (
    discovery_state is null or discovery_state in ('passed', 'failed', 'unsupported')
  ),
  add constraint io_provider_conformance_runs_evidence_hash_check check (
    evidence_sha256 is null or evidence_sha256 ~ '^[a-f0-9]{64}$'
  );

create unique index io_provider_conformance_runs_approval_idx
  on private.io_provider_conformance_runs (approval_id)
  where approval_id is not null;
create unique index io_provider_conformance_runs_one_running_endpoint_idx
  on private.io_provider_conformance_runs (endpoint_id)
  where run_state = 'running';

create table private.io_provider_conformance_events (
  id bigint generated always as identity primary key,
  endpoint_id uuid not null references public.io_model_endpoints(id) on delete restrict,
  approval_id uuid not null references private.io_provider_conformance_approvals(id) on delete restrict,
  run_id uuid not null references private.io_provider_conformance_runs(id) on delete restrict,
  action text not null,
  actor_user_id uuid references auth.users(id) on delete restrict,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint io_provider_conformance_events_action_check check (
    action in ('approved', 'passed', 'failed', 'cancelled')
  ),
  constraint io_provider_conformance_events_payload_check check (
    jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 4000
  )
);

create index io_provider_conformance_events_run_time_idx
  on private.io_provider_conformance_events (run_id, occurred_at, id);

alter table private.io_provider_conformance_approvals enable row level security;
alter table private.io_provider_conformance_events enable row level security;
revoke all on private.io_provider_conformance_approvals from public, anon, authenticated;
revoke all on private.io_provider_conformance_events from public, anon, authenticated;
grant select, insert, update on private.io_provider_conformance_approvals to service_role;
grant select, insert on private.io_provider_conformance_events to service_role;

create or replace function public.admin_io_begin_provider_conformance(
  _endpoint_id uuid,
  _max_provider_cost_nanos bigint,
  _acknowledge_external_processing boolean,
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
  endpoint_record record;
  approval_id uuid;
  run_id uuid;
  suite_version constant text := 'io-chat-v1';
begin
  if not private.has_admin_capability(caller_id, 'io.manage') then
    raise exception 'I/O operations management access required' using errcode = '42501';
  end if;
  if char_length(normalized_reason) not between 8 and 500 then
    raise exception 'A conformance reason between 8 and 500 characters is required';
  end if;
  if _max_provider_cost_nanos is null
     or _max_provider_cost_nanos not between 1 and 10000000 then
    raise exception 'Conformance cost cap must be between 1 and 10000000 currency nanos';
  end if;

  select
    endpoint.id,
    endpoint.residency_country_code,
    provider.provider_key,
    provider.integration_style,
    connection.connection_state,
    capability.id as capability_version_id
  into endpoint_record
  from public.io_model_endpoints as endpoint
  join public.io_providers as provider on provider.id = endpoint.provider_id
  join public.io_models as model
    on model.id = endpoint.model_id and model.provider_id = provider.id
  join private.io_endpoint_connections as connection on connection.endpoint_id = endpoint.id
  join lateral (
    select capability_version.id, capability_version.verification_state,
      capability_version.supports_chat, capability_version.supports_model_listing
    from public.io_endpoint_capability_versions as capability_version
    where capability_version.endpoint_id = endpoint.id
    order by capability_version.version desc
    limit 1
  ) as capability on true
  where endpoint.id = _endpoint_id
    and provider.provider_key in ('openai', 'deepseek')
    and provider.integration_style = 'openai_compatible'
    and provider.lifecycle_state in ('conformance', 'active')
    and model.listing_state = 'listed'
    and endpoint.routing_state in ('candidate', 'conformance', 'active')
    and connection.connection_state in ('testing', 'ready')
    and connection.endpoint_base_url is not null
    and connection.secret_reference is not null
    and (
      capability.verification_state = 'draft'
      or (
        capability.verification_state = 'verified'
        and capability.supports_chat = true
        and capability.supports_model_listing = true
      )
    )
    and exists (
      select 1
      from public.io_endpoint_pricing_versions as price
      where price.endpoint_id = endpoint.id
        and price.publication_state = 'published'
        and price.billing_meter = 'tokens'
        and price.effective_from <= now()
        and (price.effective_until is null or price.effective_until > now())
    );

  if endpoint_record.id is null then
    raise exception 'Endpoint is not ready for the current conformance suite';
  end if;
  if endpoint_record.residency_country_code = 'CN'
     and not coalesce(_acknowledge_external_processing, false) then
    raise exception 'China-hosted conformance requires explicit external-processing acknowledgement';
  end if;
  if exists (
    select 1
    from private.io_provider_conformance_runs as running
    where running.endpoint_id = _endpoint_id and running.run_state = 'running'
  ) then
    raise exception 'A conformance run is already active for this endpoint';
  end if;

  insert into private.io_provider_conformance_approvals (
    endpoint_id,
    capability_version_id,
    suite_version,
    max_provider_cost_nanos,
    acknowledges_external_processing,
    residency_country_code,
    reason,
    state,
    approved_by,
    expires_at,
    consumed_at
  ) values (
    _endpoint_id,
    endpoint_record.capability_version_id,
    suite_version,
    _max_provider_cost_nanos,
    coalesce(_acknowledge_external_processing, false),
    endpoint_record.residency_country_code,
    normalized_reason,
    'consumed',
    caller_id,
    statement_timestamp() + interval '30 minutes',
    statement_timestamp()
  ) returning id into approval_id;

  insert into private.io_provider_conformance_runs (
    endpoint_id,
    capability_version_id,
    approval_id,
    suite_version,
    run_state,
    result_summary,
    run_by
  ) values (
    _endpoint_id,
    endpoint_record.capability_version_id,
    approval_id,
    suite_version,
    'running',
    '{}'::jsonb,
    caller_id
  ) returning id into run_id;

  insert into private.io_provider_conformance_events (
    endpoint_id, approval_id, run_id, action, actor_user_id, payload
  ) values (
    _endpoint_id,
    approval_id,
    run_id,
    'approved',
    caller_id,
    jsonb_build_object(
      'suite_version', suite_version,
      'max_provider_cost_nanos', _max_provider_cost_nanos::text,
      'residency_country_code', endpoint_record.residency_country_code,
      'external_processing_acknowledged', coalesce(_acknowledge_external_processing, false)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'runId', run_id,
    'approvalId', approval_id,
    'endpointId', _endpoint_id,
    'providerKey', endpoint_record.provider_key,
    'suiteVersion', suite_version,
    'maxProviderCostNanos', _max_provider_cost_nanos::text,
    'residencyCountryCode', endpoint_record.residency_country_code
  );
end;
$function$;

revoke all on function public.admin_io_begin_provider_conformance(uuid, bigint, boolean, text)
  from public, anon;
grant execute on function public.admin_io_begin_provider_conformance(uuid, bigint, boolean, text)
  to authenticated, service_role;

create or replace function public.io_get_provider_conformance_connection(_run_id uuid)
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
  output_price_nanos bigint,
  health_state text,
  circuit_state text
)
language sql
stable
security definer
set search_path = ''
as $function$
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
    price.output_price_nanos,
    'unknown'::text,
    'closed'::text
  from private.io_provider_conformance_runs as run
  join private.io_provider_conformance_approvals as approval on approval.id = run.approval_id
  join public.io_model_endpoints as endpoint on endpoint.id = run.endpoint_id
  join public.io_providers as provider on provider.id = endpoint.provider_id
  join public.io_models as model on model.id = endpoint.model_id
  join private.io_endpoint_connections as connection on connection.endpoint_id = endpoint.id
  join public.io_endpoint_capability_versions as capability
    on capability.id = run.capability_version_id
  join lateral (
    select pricing.version, pricing.currency_code, pricing.unit_quantity,
      pricing.input_price_nanos, pricing.output_price_nanos
    from public.io_endpoint_pricing_versions as pricing
    where pricing.endpoint_id = endpoint.id
      and pricing.publication_state = 'published'
      and pricing.billing_meter = 'tokens'
      and pricing.effective_from <= now()
      and (pricing.effective_until is null or pricing.effective_until > now())
    order by pricing.effective_from desc, pricing.version desc
    limit 1
  ) as price on true
  where run.id = _run_id
    and run.run_state = 'running'
    and approval.state = 'consumed'
    and approval.expires_at > now()
    and approval.capability_version_id = run.capability_version_id
    and connection.connection_state in ('testing', 'ready');
$function$;

revoke all on function public.io_get_provider_conformance_connection(uuid)
  from public, anon, authenticated;
grant execute on function public.io_get_provider_conformance_connection(uuid) to service_role;

create or replace function public.io_finish_provider_conformance(
  _run_id uuid,
  _run_state text,
  _provider_cost_nanos bigint,
  _discovery_state text,
  _result_summary jsonb,
  _evidence_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  run_record private.io_provider_conformance_runs%rowtype;
  approval private.io_provider_conformance_approvals%rowtype;
  final_state text := _run_state;
  summary jsonb := coalesce(_result_summary, '{}'::jsonb);
begin
  if _run_state not in ('passed', 'failed', 'cancelled') then
    raise exception 'Invalid terminal conformance state';
  end if;
  if _provider_cost_nanos is null or _provider_cost_nanos < 0 then
    raise exception 'Invalid conformance cost';
  end if;
  if _discovery_state not in ('passed', 'failed', 'unsupported') then
    raise exception 'Invalid conformance discovery state';
  end if;
  if jsonb_typeof(summary) <> 'object' or octet_length(summary::text) > 4000 then
    raise exception 'Invalid conformance result summary';
  end if;
  if exists (
    select 1
    from jsonb_object_keys(summary) as summary_key(key)
    where summary_key.key not in (
      'suiteVersion', 'discoveryPassed', 'chatPassed', 'responseShapePassed',
      'usageReported', 'providerRequestIdPresent', 'latencyMs', 'errorCode',
      'modelIdMatched', 'costWithinApproval'
    )
  ) then
    raise exception 'Conformance result summary contains an unsupported field';
  end if;
  if coalesce(_evidence_sha256, '') !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid conformance evidence hash';
  end if;

  select * into run_record
  from private.io_provider_conformance_runs as run
  where run.id = _run_id
  for update;
  if run_record.id is null or run_record.run_state <> 'running' or run_record.approval_id is null then
    raise exception 'Conformance run is not active';
  end if;
  select * into approval
  from private.io_provider_conformance_approvals as approval_row
  where approval_row.id = run_record.approval_id;
  if approval.id is null then
    raise exception 'Conformance approval is missing';
  end if;
  if approval.state <> 'consumed'
     or approval.capability_version_id <> run_record.capability_version_id then
    raise exception 'Conformance approval does not match the active run';
  end if;
  if _provider_cost_nanos > approval.max_provider_cost_nanos then
    final_state := 'failed';
    summary := summary || jsonb_build_object(
      'costWithinApproval', false,
      'errorCode', 'cost_cap_exceeded'
    );
  end if;
  if final_state = 'passed' and not (
    _discovery_state = 'passed'
    and coalesce((summary ->> 'discoveryPassed')::boolean, false)
    and coalesce((summary ->> 'chatPassed')::boolean, false)
    and coalesce((summary ->> 'responseShapePassed')::boolean, false)
    and coalesce((summary ->> 'usageReported')::boolean, false)
    and coalesce((summary ->> 'modelIdMatched')::boolean, false)
    and coalesce((summary ->> 'costWithinApproval')::boolean, false)
  ) then
    raise exception 'Passed conformance requires complete positive evidence';
  end if;

  -- A passed v1 suite seals the staged declaration that it actually tested.
  -- Verified versions remain immutable; changed capability claims require a
  -- new draft version and a new conformance run.
  if final_state = 'passed' then
    update public.io_endpoint_capability_versions
    set
      verification_state = 'verified',
      supports_model_listing = true,
      supports_chat = true,
      supports_usage_receipt = true,
      tested_at = statement_timestamp(),
      verified_by = run_record.run_by
    where id = run_record.capability_version_id
      and endpoint_id = run_record.endpoint_id
      and verification_state = 'draft';
  end if;

  update private.io_provider_conformance_runs
  set
    run_state = final_state,
    result_summary = summary,
    provider_cost_nanos = _provider_cost_nanos,
    discovery_state = _discovery_state,
    evidence_sha256 = _evidence_sha256,
    finished_at = statement_timestamp()
  where id = _run_id;

  insert into private.io_provider_conformance_events (
    endpoint_id, approval_id, run_id, action, actor_user_id, payload
  ) values (
    run_record.endpoint_id,
    approval.id,
    run_record.id,
    final_state,
    run_record.run_by,
    jsonb_build_object(
      'suite_version', run_record.suite_version,
      'provider_cost_nanos', _provider_cost_nanos::text,
      'discovery_state', _discovery_state,
      'evidence_sha256', _evidence_sha256
    )
  );

  return jsonb_build_object(
    'ok', true,
    'runId', _run_id,
    'state', final_state,
    'providerCostNanos', _provider_cost_nanos::text,
    'evidenceSha256', _evidence_sha256
  );
end;
$function$;

revoke all on function public.io_finish_provider_conformance(uuid, text, bigint, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.io_finish_provider_conformance(uuid, text, bigint, text, jsonb, text)
  to service_role;

create or replace function public.admin_io_provider_conformance_snapshot()
returns table (
  run_id uuid,
  endpoint_id uuid,
  provider_key text,
  model_name text,
  suite_version text,
  run_state text,
  discovery_state text,
  provider_cost_nanos bigint,
  residency_country_code text,
  started_at timestamptz,
  finished_at timestamptz
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
    run.id,
    run.endpoint_id,
    provider.provider_key,
    model.display_name,
    run.suite_version,
    run.run_state,
    run.discovery_state,
    run.provider_cost_nanos,
    endpoint.residency_country_code,
    run.started_at,
    run.finished_at
  from private.io_provider_conformance_runs as run
  join public.io_model_endpoints as endpoint on endpoint.id = run.endpoint_id
  join public.io_providers as provider on provider.id = endpoint.provider_id
  join public.io_models as model on model.id = endpoint.model_id
  order by run.started_at desc, run.id desc
  limit 100;
end;
$function$;

revoke all on function public.admin_io_provider_conformance_snapshot()
  from public, anon;
grant execute on function public.admin_io_provider_conformance_snapshot()
  to authenticated, service_role;

comment on table private.io_provider_conformance_approvals is
  'Single-use, operator-approved provider test authorization with a maximum upstream cost and explicit CN processing acknowledgement.';
comment on function public.admin_io_begin_provider_conformance(uuid, bigint, boolean, text) is
  'Creates one 30-minute conformance approval and running record. Current suite is limited to staged OpenAI and DeepSeek OpenAI-compatible endpoints.';
comment on function public.io_finish_provider_conformance(uuid, text, bigint, text, jsonb, text) is
  'Service-only conformance finalization. Stores allow-listed evidence only; never prompts, generated text, headers or credentials.';
