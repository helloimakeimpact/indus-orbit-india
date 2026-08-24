-- Repair two member-facing read contracts discovered by authenticated browser
-- verification. Keep the browser on caller-bound RPCs without granting
-- direct browser access to the underlying credential table.

create or replace function public.list_my_io_usage_history(
  _workspace_id uuid,
  _limit integer default 25,
  _before_created_at timestamptz default null,
  _before_id uuid default null,
  _result_state text default null,
  _provider_key text default null,
  _model_key text default null,
  _from timestamptz default null,
  _to timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  result jsonb;
begin
  if caller_id is null or not private.io_workspace_has_role(_workspace_id, null) then
    raise exception 'Active workspace membership required' using errcode = '42501';
  end if;
  if _limit not between 1 and 100 then
    raise exception 'Usage history limit must be between 1 and 100';
  end if;
  if (_before_created_at is null) <> (_before_id is null) then
    raise exception 'Usage history cursor is incomplete';
  end if;
  if _result_state is not null and _result_state not in ('completed', 'failed') then
    raise exception 'Usage history state filter is invalid';
  end if;
  if _provider_key is not null and _provider_key !~ '^[a-z0-9][a-z0-9_.-]{0,79}$' then
    raise exception 'Usage history provider filter is invalid';
  end if;
  if _model_key is not null and _model_key !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$' then
    raise exception 'Usage history model filter is invalid';
  end if;
  if _from is not null and _to is not null and (_to <= _from or _to > _from + interval '366 days') then
    raise exception 'Usage history date range is invalid';
  end if;

  with matched as (
    select
      receipt.*,
      usage.provider_cost_nanos as usage_provider_cost_nanos,
      usage.service_fee_nanos as usage_service_fee_nanos,
      usage.customer_charge_nanos as usage_customer_charge_nanos,
      usage.credit_applied_nanos,
      usage.amount_due_nanos,
      coalesce((
        select count(*) from public.io_provider_attempts as attempt
        where attempt.receipt_id = receipt.id
      ), 0)::integer as attempt_count,
      coalesce((
        select count(*) from public.io_provider_attempts as attempt
        where attempt.receipt_id = receipt.id and attempt.attempt_state = 'failed'
      ), 0)::integer as failed_attempt_count
    from public.io_route_receipts as receipt
    left join public.io_usage_records as usage on usage.receipt_id = receipt.id
    where receipt.workspace_id = _workspace_id
      and (_result_state is null or receipt.result_state = _result_state)
      and (_provider_key is null or receipt.selected_provider_key = _provider_key)
      and (_model_key is null or receipt.selected_model_key = _model_key)
      and (_from is null or receipt.created_at >= _from)
      and (_to is null or receipt.created_at < _to)
      and (
        _before_created_at is null
        or (receipt.created_at, receipt.id) < (_before_created_at, _before_id)
      )
    order by receipt.created_at desc, receipt.id desc
    limit _limit + 1
  ), page as (
    select * from matched
    order by created_at desc, id desc
    limit _limit
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', row.id,
        'requestId', row.request_id,
        'resultState', row.result_state,
        'routeStrategy', row.route_strategy,
        'providerKey', row.selected_provider_key,
        'modelKey', row.selected_model_key,
        'capacityMode', row.selected_capacity_mode,
        'regionCode', row.selected_region_code,
        'residencyCountryCode', row.selected_residency_country_code,
        'retentionClass', row.selected_retention_class,
        'currencyCode', row.selected_currency_code,
        'candidateCount', row.candidate_count,
        'fallbackCount', row.fallback_count,
        'estimatedCostNanos', row.estimated_cost_nanos,
        'providerCostNanos', coalesce(row.usage_provider_cost_nanos, row.provider_cost_nanos)::text,
        'serviceFeeNanos', coalesce(row.usage_service_fee_nanos, row.service_fee_nanos)::text,
        'customerChargeNanos', coalesce(row.usage_customer_charge_nanos, row.customer_charge_nanos)::text,
        'creditAppliedNanos', coalesce(row.credit_applied_nanos, 0)::text,
        'amountDueNanos', coalesce(row.amount_due_nanos, row.usage_customer_charge_nanos, row.customer_charge_nanos, 0)::text,
        'serviceFeeBasisPoints', row.service_fee_basis_points,
        'inputTokens', row.input_tokens,
        'outputTokens', row.output_tokens,
        'createdAt', row.created_at,
        'completedAt', row.completed_at,
        'attemptCount', row.attempt_count,
        'failedAttemptCount', row.failed_attempt_count
      ) order by row.created_at desc, row.id desc) from page as row
    ), '[]'::jsonb),
    'hasMore', (select count(*) > _limit from matched),
    'nextCursor', case when (select count(*) > _limit from matched) then (
      select jsonb_build_object('createdAt', row.created_at, 'id', row.id)
      from page as row order by row.created_at, row.id limit 1
    ) else null end
  ) into result;
  return result;
end;
$function$;

revoke all on function public.list_my_io_usage_history(
  uuid, integer, timestamptz, uuid, text, text, text, timestamptz, timestamptz
) from public, anon;
grant execute on function public.list_my_io_usage_history(
  uuid, integer, timestamptz, uuid, text, text, text, timestamptz, timestamptz
) to authenticated, service_role;

create or replace function public.list_my_io_api_keys(_workspace_id uuid)
returns table (
  id uuid,
  name text,
  key_prefix text,
  last_four text,
  scopes text[],
  status text,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz,
  limit_policy_version integer,
  requests_per_minute integer,
  requests_per_day integer,
  requests_per_month integer,
  spend_currency_code text,
  spend_per_day_nanos bigint,
  spend_per_month_nanos bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or not private.io_workspace_has_role(_workspace_id, null) then
    raise exception 'Active workspace membership required' using errcode = '42501';
  end if;

  return query
  select
    key.id,
    key.name,
    key.key_prefix,
    key.last_four,
    key.scopes,
    key.status,
    key.expires_at,
    key.last_used_at,
    key.created_at,
    key.limit_policy_version,
    key.requests_per_minute,
    key.requests_per_day,
    key.requests_per_month,
    key.spend_currency_code,
    key.spend_per_day_nanos,
    key.spend_per_month_nanos
  from public.io_api_keys as key
  where key.workspace_id = _workspace_id
  order by key.created_at desc, key.id desc;
end;
$function$;

revoke all on function public.list_my_io_api_keys(uuid) from public, anon;
grant execute on function public.list_my_io_api_keys(uuid) to authenticated, service_role;

comment on function public.list_my_io_api_keys(uuid) is
  'Caller-bound browser-safe API-key metadata. Raw keys and key hashes are never returned.';
