-- Redacted I/O evidence for the separate admin application. These functions
-- expose counts and route facts only: never prompts, generated content,
-- credentials, endpoint URLs, headers or raw provider errors.

create index if not exists io_route_receipts_global_time_idx
  on public.io_route_receipts (created_at desc, id desc);

alter table public.io_route_receipts
  add column if not exists selected_currency_code text;

update public.io_route_receipts as receipt
set selected_currency_code = price.currency_code
from public.io_endpoint_pricing_versions as price
where receipt.selected_currency_code is null
  and price.endpoint_id = receipt.selected_endpoint_id
  and price.version = receipt.price_version;

alter table public.io_route_receipts
  drop constraint if exists io_route_receipts_currency_code_check,
  add constraint io_route_receipts_currency_code_check check (
    selected_currency_code is null or selected_currency_code ~ '^[A-Z]{3}$'
  );

create or replace function public.admin_io_evidence_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  provider_total bigint := 0;
  endpoint_total bigint := 0;
  eligible_endpoint_total bigint := 0;
  routing_enabled_provider_total bigint := 0;
begin
  if not private.has_admin_capability(caller_id, 'io.read') then
    raise exception 'I/O operations access required' using errcode = '42501';
  end if;

  select
    count(distinct snapshot.provider_id),
    count(*) filter (where snapshot.endpoint_id is not null),
    count(*) filter (where snapshot.activation_eligible),
    count(distinct snapshot.provider_id) filter (where snapshot.routing_enabled)
  into
    provider_total,
    endpoint_total,
    eligible_endpoint_total,
    routing_enabled_provider_total
  from public.admin_io_operational_snapshot() as snapshot;

  return jsonb_build_object(
    'generatedAt', now(),
    'providerCount', provider_total,
    'endpointCount', endpoint_total,
    'eligibleEndpointCount', eligible_endpoint_total,
    'routingEnabledProviderCount', routing_enabled_provider_total,
    'capacitySourceCount', (select count(*) from public.io_capacity_sources),
    'activeCapacitySourceCount', (
      select count(*) from public.io_capacity_sources where status = 'active'
    ),
    'activeWorkspaceGrantCount', (
      select count(*) from public.io_workspace_capacity_grants where status = 'active'
    ),
    'routeReceiptCount', (select count(*) from public.io_route_receipts),
    'completedReceiptCount', (
      select count(*) from public.io_route_receipts where result_state = 'completed'
    ),
    'failedReceiptCount', (
      select count(*) from public.io_route_receipts where result_state = 'failed'
    ),
    'providerAttemptCount', (select count(*) from public.io_provider_attempts),
    'estimatedCostByCurrency', coalesce((
      select jsonb_object_agg(cost.currency_code, cost.total_nanos)
      from (
        select
          coalesce(receipt.selected_currency_code, 'UNSPECIFIED') as currency_code,
          sum(receipt.estimated_cost_nanos)::text as total_nanos
        from public.io_route_receipts as receipt
        where receipt.estimated_cost_nanos is not null
        group by coalesce(receipt.selected_currency_code, 'UNSPECIFIED')
      ) as cost
    ), '{}'::jsonb),
    'inputTokensTotal', coalesce((
      select sum(receipt.input_tokens)::text
      from public.io_route_receipts as receipt
    ), '0'),
    'outputTokensTotal', coalesce((
      select sum(receipt.output_tokens)::text
      from public.io_route_receipts as receipt
    ), '0'),
    'latestReceiptAt', (
      select max(receipt.created_at) from public.io_route_receipts as receipt
    )
  );
end;
$function$;

revoke all on function public.admin_io_evidence_summary()
  from public, anon, authenticated;
grant execute on function public.admin_io_evidence_summary()
  to authenticated, service_role;

create or replace function public.admin_io_recent_route_receipts(
  _before_created_at timestamptz default null,
  _before_id uuid default null,
  _limit integer default 25
)
returns table (
  receipt_id uuid,
  request_id uuid,
  result_state text,
  route_strategy text,
  provider_key text,
  model_key text,
  capacity_mode text,
  region_code text,
  residency_country_code text,
  retention_class text,
  currency_code text,
  candidate_count integer,
  fallback_count integer,
  estimated_cost_nanos text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz,
  completed_at timestamptz,
  attempt_count bigint,
  failed_attempt_count bigint
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
  if _limit < 1 or _limit > 100 then
    raise exception 'Receipt limit must be between 1 and 100';
  end if;
  if (_before_created_at is null) <> (_before_id is null) then
    raise exception 'Receipt cursor requires both created_at and id';
  end if;

  return query
  select
    receipt.id,
    receipt.request_id,
    receipt.result_state,
    receipt.route_strategy,
    receipt.selected_provider_key,
    receipt.selected_model_key,
    receipt.selected_capacity_mode,
    receipt.selected_region_code,
    receipt.selected_residency_country_code,
    receipt.selected_retention_class,
    receipt.selected_currency_code,
    receipt.candidate_count,
    receipt.fallback_count,
    receipt.estimated_cost_nanos::text,
    receipt.input_tokens,
    receipt.output_tokens,
    receipt.created_at,
    receipt.completed_at,
    coalesce(attempts.attempt_count, 0),
    coalesce(attempts.failed_attempt_count, 0)
  from public.io_route_receipts as receipt
  left join lateral (
    select
      count(*) as attempt_count,
      count(*) filter (where attempt.attempt_state = 'failed') as failed_attempt_count
    from public.io_provider_attempts as attempt
    where attempt.receipt_id = receipt.id
  ) as attempts on true
  where _before_created_at is null
    or (receipt.created_at, receipt.id) < (_before_created_at, _before_id)
  order by receipt.created_at desc, receipt.id desc
  limit _limit;
end;
$function$;

revoke all on function public.admin_io_recent_route_receipts(
  timestamptz,
  uuid,
  integer
) from public, anon, authenticated;
grant execute on function public.admin_io_recent_route_receipts(
  timestamptz,
  uuid,
  integer
) to authenticated, service_role;

comment on function public.admin_io_evidence_summary() is
  'Capability-checked aggregate I/O readiness, capacity, usage and route evidence for the separate admin application. Returns no content or secrets.';

comment on function public.admin_io_recent_route_receipts(timestamptz, uuid, integer) is
  'Capability-checked keyset page of redacted route receipts for operators. Returns no content, credentials, endpoint URLs or raw provider errors.';
