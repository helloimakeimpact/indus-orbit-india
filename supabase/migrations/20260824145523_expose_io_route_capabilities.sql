-- Route advanced protocol requests only through capabilities that have been
-- explicitly verified for the exact endpoint evidence version.

drop function if exists public.io_get_routable_endpoint_connections_v2();

create function public.io_get_routable_endpoint_connections_v2()
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
  join private.io_provider_runtime_controls as runtime_control
    on runtime_control.provider_id = provider.id
    and runtime_control.routing_enabled = true
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
      and sample.valid_until > now()
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
    and coalesce(health.health_state, 'unknown') <> 'unavailable'
    and not (
      circuit.circuit_state = 'open'
      and circuit.retry_after > now()
    );
$function$;

revoke all on function public.io_get_routable_endpoint_connections_v2()
  from public, anon, authenticated;
grant execute on function public.io_get_routable_endpoint_connections_v2() to service_role;

comment on function public.io_get_routable_endpoint_connections_v2() is
  'Server-only routable endpoints with exact verified streaming, tool, structured-output, media and cancellation capability evidence.';
