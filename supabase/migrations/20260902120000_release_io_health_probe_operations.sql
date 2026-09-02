-- Scheduled, non-billable endpoint discovery probes. Provider credentials and
-- endpoint connection details remain service-role only; browser operators see
-- only redacted health/circuit evidence.

create or replace function public.io_get_probeable_endpoint_connections()
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
  supports_streaming boolean,
  supports_tools boolean,
  supports_structured_output boolean,
  supports_vision boolean,
  supports_audio boolean,
  supports_cancellation boolean,
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
    evidence.capability_version,
    price.version,
    price.currency_code,
    price.unit_quantity,
    price.input_price_nanos,
    price.output_price_nanos,
    capability.supports_streaming,
    capability.supports_tools,
    capability.supports_structured_output,
    capability.supports_vision,
    capability.supports_audio,
    capability.supports_cancellation,
    coalesce(health.health_state, 'unknown'),
    coalesce(circuit.circuit_state, 'closed')
  from public.io_model_endpoints as endpoint
  join public.io_providers as provider on provider.id = endpoint.provider_id
  join public.io_models as model
    on model.id = endpoint.model_id
    and model.provider_id = endpoint.provider_id
  join private.io_endpoint_connections as connection on connection.endpoint_id = endpoint.id
  join lateral private.io_endpoint_latest_evidence(endpoint.id) as evidence
    on evidence.eligible
  join public.io_endpoint_capability_versions as capability
    on capability.id = evidence.capability_version_id
    and capability.verification_state = 'verified'
  join lateral (
    select
      pricing.version,
      pricing.currency_code,
      pricing.unit_quantity,
      pricing.input_price_nanos,
      pricing.output_price_nanos
    from public.io_endpoint_pricing_versions as pricing
    where pricing.endpoint_id = endpoint.id
      and pricing.publication_state = 'published'
      and pricing.member_visible = true
      and pricing.billing_meter = 'tokens'
      and pricing.effective_from <= now()
      and (pricing.effective_until is null or pricing.effective_until > now())
    order by pricing.effective_from desc, pricing.version desc
    limit 1
  ) as price on true
  left join lateral (
    select sample.health_state
    from private.io_endpoint_health_samples as sample
    where sample.endpoint_id = endpoint.id
    order by sample.observed_at desc, sample.id desc
    limit 1
  ) as health on true
  left join private.io_endpoint_circuit_states as circuit on circuit.endpoint_id = endpoint.id
  where provider.lifecycle_state = 'active'
    and provider.catalogue_visibility = 'listed'
    and model.listing_state = 'listed'
    and endpoint.routing_state = 'active'
    and endpoint.member_visible = true
    and connection.connection_state = 'ready'
    and connection.endpoint_base_url is not null
    and connection.secret_reference is not null
  order by provider.provider_key, endpoint.endpoint_key;
$function$;

revoke all on function public.io_get_probeable_endpoint_connections()
  from public, anon, authenticated;
grant execute on function public.io_get_probeable_endpoint_connections() to service_role;

comment on function public.io_get_probeable_endpoint_connections() is
  'Service-only configured endpoints eligible for non-billable discovery health probes, including automatically open circuits.';

create or replace function public.io_record_endpoint_probe(
  _endpoint_id uuid,
  _success boolean,
  _latency_ms integer,
  _error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_failures integer := 0;
  current_state text := 'closed';
  current_retry_after timestamptz;
  latest_event_source text;
  preserve_operator_open boolean := false;
  next_failures integer;
  next_state text;
  next_retry_after timestamptz;
  normalized_error text := nullif(btrim(coalesce(_error_code, '')), '');
begin
  if _endpoint_id is null or _success is null then
    raise exception 'Endpoint probe outcome is incomplete';
  end if;
  if not exists (select 1 from public.io_model_endpoints where id = _endpoint_id) then
    raise exception 'Endpoint does not exist';
  end if;
  if _latency_ms is not null and (_latency_ms < 0 or _latency_ms > 600000) then
    raise exception 'Endpoint latency is invalid';
  end if;
  if normalized_error is not null and normalized_error !~ '^[a-z][a-z0-9_.-]{1,99}$' then
    raise exception 'Endpoint error code is invalid';
  end if;

  select circuit.circuit_state, circuit.consecutive_failures, circuit.retry_after
  into current_state, current_failures, current_retry_after
  from private.io_endpoint_circuit_states as circuit
  where circuit.endpoint_id = _endpoint_id
  for update;
  current_state := coalesce(current_state, 'closed');
  current_failures := coalesce(current_failures, 0);

  select event.source
  into latest_event_source
  from private.io_endpoint_circuit_events as event
  where event.endpoint_id = _endpoint_id
  order by event.occurred_at desc, event.id desc
  limit 1;

  preserve_operator_open := current_state = 'open' and latest_event_source = 'operator';

  if preserve_operator_open then
    next_failures := current_failures;
    next_state := current_state;
    next_retry_after := current_retry_after;
  elsif _success then
    next_failures := 0;
    next_state := 'closed';
    next_retry_after := null;
  else
    next_failures := current_failures + 1;
    next_state := case when next_failures >= 3 then 'open' else 'closed' end;
    next_retry_after := case when next_state = 'open' then now() + interval '5 minutes' else null end;
  end if;

  insert into private.io_endpoint_health_samples (
    endpoint_id,
    health_state,
    latency_ms,
    error_code,
    source,
    valid_until
  ) values (
    _endpoint_id,
    case
      when _success then 'healthy'
      when next_state = 'open' then 'unavailable'
      else 'degraded'
    end,
    _latency_ms,
    normalized_error,
    'synthetic',
    now() + interval '10 minutes'
  );

  insert into private.io_endpoint_circuit_states (
    endpoint_id,
    circuit_state,
    consecutive_failures,
    opened_at,
    retry_after,
    reason_code,
    updated_at
  ) values (
    _endpoint_id,
    next_state,
    next_failures,
    case when next_state = 'open' then now() else null end,
    next_retry_after,
    case
      when preserve_operator_open then 'operator_open'
      when _success then null
      else coalesce(normalized_error, 'probe_failure')
    end,
    now()
  )
  on conflict (endpoint_id) do update set
    circuit_state = excluded.circuit_state,
    consecutive_failures = excluded.consecutive_failures,
    opened_at = case
      when excluded.circuit_state = 'open'
        then coalesce(private.io_endpoint_circuit_states.opened_at, excluded.opened_at)
      else null
    end,
    retry_after = excluded.retry_after,
    reason_code = excluded.reason_code,
    updated_at = excluded.updated_at;

  if not preserve_operator_open and next_state is distinct from current_state then
    insert into private.io_endpoint_circuit_events (
      endpoint_id,
      circuit_state,
      reason,
      source
    ) values (
      _endpoint_id,
      next_state,
      case
        when next_state = 'open' then 'Scheduled probe opened the circuit after three consecutive failures.'
        else 'Successful scheduled probe closed the automatic circuit.'
      end,
      'automatic'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'healthState', case
      when _success then 'healthy'
      when next_state = 'open' then 'unavailable'
      else 'degraded'
    end,
    'circuitState', next_state,
    'consecutiveFailures', next_failures,
    'retryAfter', next_retry_after,
    'operatorHold', preserve_operator_open
  );
end;
$function$;

revoke all on function public.io_record_endpoint_probe(uuid, boolean, integer, text)
  from public, anon, authenticated;
grant execute on function public.io_record_endpoint_probe(uuid, boolean, integer, text)
  to service_role;

create or replace function public.admin_io_endpoint_incident_queue(
  _limit integer default 50
)
returns table (
  event_id bigint,
  provider_key text,
  endpoint_id uuid,
  endpoint_key text,
  circuit_state text,
  reason text,
  source text,
  occurred_at timestamptz
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
  if _limit is null or _limit < 1 or _limit > 100 then
    raise exception 'Incident limit is invalid';
  end if;

  return query
  select
    event.id,
    provider.provider_key,
    endpoint.id,
    endpoint.endpoint_key,
    event.circuit_state,
    event.reason,
    event.source,
    event.occurred_at
  from private.io_endpoint_circuit_events as event
  join public.io_model_endpoints as endpoint on endpoint.id = event.endpoint_id
  join public.io_providers as provider on provider.id = endpoint.provider_id
  order by event.occurred_at desc, event.id desc
  limit _limit;
end;
$function$;

revoke all on function public.admin_io_endpoint_incident_queue(integer)
  from public, anon, authenticated;
grant execute on function public.admin_io_endpoint_incident_queue(integer)
  to authenticated, service_role;

comment on function public.admin_io_endpoint_incident_queue(integer) is
  'Capability-checked redacted circuit incident/recovery evidence. No provider endpoint URL, secret reference, prompt or output is returned.';
