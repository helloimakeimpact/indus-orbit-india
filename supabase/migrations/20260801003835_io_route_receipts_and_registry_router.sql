-- I/O Port: server-only registry resolver and immutable route evidence.
--
-- This migration is source-only until migration history is reconciled in a
-- resettable non-production database. It never stores provider credentials,
-- prompts, generated content, headers, or raw provider errors.

-- Endpoint destinations and secret-reference names are private metadata. Edge
-- Functions need a narrow server-only way to read already-approved connection
-- rows without exposing the private schema through the browser Data API.
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
  -- This public-schema RPC exists only because Edge Functions reach Postgres
  -- through the Supabase API. It is deliberately callable only with the
  -- service-role JWT and is separately revoked from browser-facing roles.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'I/O endpoint connection lookup is service-role only'
      using errcode = '42501';
  end if;

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

revoke all on function public.io_get_ready_endpoint_connections() from public, anon, authenticated;
grant execute on function public.io_get_ready_endpoint_connections() to service_role;

comment on function public.io_get_ready_endpoint_connections() is
  'Service-role-only registry resolver. It rejects non-service JWTs and returns approved endpoint destinations and secret-reference names, never credential values.';

create table public.io_route_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete restrict,
  request_id uuid not null unique,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  route_strategy text not null,
  result_state text not null,
  selected_provider_id uuid references public.io_providers(id) on delete restrict,
  selected_model_id uuid references public.io_models(id) on delete restrict,
  selected_endpoint_id uuid references public.io_model_endpoints(id) on delete restrict,
  selected_capacity_source_id uuid references public.io_capacity_sources(id) on delete restrict,
  selected_provider_key text,
  selected_model_key text,
  selected_capacity_mode text,
  selected_region_code text,
  selected_residency_country_code text,
  selected_retention_class text,
  capability_version integer,
  price_version integer,
  candidate_count integer not null default 0,
  fallback_count integer not null default 0,
  estimated_cost_nanos bigint,
  input_tokens integer,
  output_tokens integer,
  policy_snapshot jsonb not null default '{}'::jsonb,
  candidate_summary jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  constraint io_route_receipts_strategy_check check (
    route_strategy in ('latest_affordable', 'lowest_cost', 'explicit_model')
  ),
  constraint io_route_receipts_state_check check (result_state in ('completed', 'failed')),
  constraint io_route_receipts_candidate_count_check check (candidate_count >= 0),
  constraint io_route_receipts_fallback_count_check check (fallback_count >= 0),
  constraint io_route_receipts_cost_check check (
    estimated_cost_nanos is null or estimated_cost_nanos >= 0
  ),
  constraint io_route_receipts_usage_check check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
  ),
  constraint io_route_receipts_policy_object_check check (jsonb_typeof(policy_snapshot) = 'object'),
  constraint io_route_receipts_candidate_array_check check (jsonb_typeof(candidate_summary) = 'array'),
  constraint io_route_receipts_completed_selection_check check (
    result_state = 'failed'
    or (
      selected_provider_id is not null
      and selected_model_id is not null
      and selected_endpoint_id is not null
      and selected_provider_key is not null
      and selected_model_key is not null
      and selected_capacity_mode is not null
    )
  )
);

comment on table public.io_route_receipts is
  'Append-only final route evidence. It intentionally excludes prompts, generated content, credentials, headers and raw provider error bodies.';

create table public.io_provider_attempts (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.io_route_receipts(id) on delete cascade,
  attempt_index integer not null,
  provider_id uuid references public.io_providers(id) on delete restrict,
  model_id uuid references public.io_models(id) on delete restrict,
  endpoint_id uuid references public.io_model_endpoints(id) on delete restrict,
  attempt_state text not null,
  error_code text,
  upstream_status integer,
  provider_request_id text,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  input_tokens integer,
  output_tokens integer,
  constraint io_provider_attempts_index_check check (attempt_index >= 1),
  constraint io_provider_attempts_state_check check (attempt_state in ('completed', 'failed')),
  constraint io_provider_attempts_error_code_check check (
    error_code is null or error_code ~ '^[a-z][a-z0-9_.-]{1,99}$'
  ),
  constraint io_provider_attempts_upstream_status_check check (
    upstream_status is null or upstream_status between 100 and 599
  ),
  constraint io_provider_attempts_duration_check check (completed_at >= started_at),
  constraint io_provider_attempts_usage_check check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
  ),
  constraint io_provider_attempts_receipt_index_key unique (receipt_id, attempt_index)
);

comment on table public.io_provider_attempts is
  'Append-only provider-attempt facts linked to a route receipt. Raw provider errors, credentials, prompts and generated text are prohibited.';

create index io_route_receipts_workspace_time_idx
  on public.io_route_receipts (workspace_id, created_at desc, id desc);
create index io_route_receipts_actor_time_idx
  on public.io_route_receipts (actor_user_id, created_at desc);
create index io_provider_attempts_receipt_idx
  on public.io_provider_attempts (receipt_id, attempt_index);

alter table public.io_route_receipts enable row level security;
alter table public.io_provider_attempts enable row level security;

create policy "I/O members read route receipts"
on public.io_route_receipts for select
to authenticated
using ((select private.io_workspace_has_role(workspace_id, null)));

create policy "I/O members read provider attempts"
on public.io_provider_attempts for select
to authenticated
using (
  exists (
    select 1
    from public.io_route_receipts as receipt
    where receipt.id = io_provider_attempts.receipt_id
      and (select private.io_workspace_has_role(receipt.workspace_id, null))
  )
);

revoke all on public.io_route_receipts, public.io_provider_attempts from anon, authenticated;
grant select on public.io_route_receipts, public.io_provider_attempts to authenticated;
