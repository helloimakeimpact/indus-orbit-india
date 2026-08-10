-- I/O activation-grade operational core.
--
-- This migration adds the trusted reserve -> dispatch -> settle/release
-- boundary, durable request idempotency, a balanced integer-minor-unit ledger,
-- safe endpoint health/circuit evidence and capability-checked member/admin
-- projections. It stores no prompts, responses, provider credentials, endpoint
-- URLs, request headers or raw upstream error bodies.

create table public.io_budget_limits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete cascade,
  currency_code text not null,
  hard_limit_minor bigint not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null default 'active',
  reason text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_budget_limits_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_budget_limits_amount_check check (hard_limit_minor >= 0),
  constraint io_budget_limits_period_check check (period_end > period_start),
  constraint io_budget_limits_status_check check (status in ('active', 'paused', 'retired')),
  constraint io_budget_limits_reason_check check (
    char_length(btrim(reason)) between 8 and 500
  )
);

create unique index io_budget_limits_one_active_currency_idx
  on public.io_budget_limits (workspace_id, currency_code)
  where status = 'active';
create index io_budget_limits_workspace_period_idx
  on public.io_budget_limits (workspace_id, period_start desc, period_end desc);
create index io_budget_limits_created_by_idx on public.io_budget_limits (created_by);
create index io_budget_limits_updated_by_idx on public.io_budget_limits (updated_by);

create table public.io_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete restrict,
  budget_limit_id uuid not null references public.io_budget_limits(id) on delete restrict,
  request_id uuid not null unique,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  endpoint_id uuid not null references public.io_model_endpoints(id) on delete restrict,
  currency_code text not null,
  reserved_minor bigint not null,
  settled_minor bigint,
  state text not null default 'reserved',
  expires_at timestamptz not null,
  receipt_id uuid unique references public.io_route_receipts(id) on delete restrict,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  constraint io_usage_reservations_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_usage_reservations_reserved_check check (reserved_minor >= 0),
  constraint io_usage_reservations_settled_check check (
    settled_minor is null or settled_minor between 0 and reserved_minor
  ),
  constraint io_usage_reservations_state_check check (
    state in ('reserved', 'settled', 'released', 'expired')
  ),
  constraint io_usage_reservations_expiry_check check (expires_at > created_at),
  constraint io_usage_reservations_terminal_check check (
    (state = 'reserved' and settled_minor is null and settled_at is null and receipt_id is null)
    or (
      state = 'settled'
      and settled_minor is not null
      and settled_at is not null
      and receipt_id is not null
    )
    or (
      state in ('released', 'expired')
      and settled_minor = 0
      and settled_at is not null
      and (state = 'expired' or receipt_id is not null)
    )
  )
);

create index io_usage_reservations_workspace_state_idx
  on public.io_usage_reservations (workspace_id, state, expires_at);
create index io_usage_reservations_budget_state_idx
  on public.io_usage_reservations (budget_limit_id, state, expires_at);
create index io_usage_reservations_actor_time_idx
  on public.io_usage_reservations (actor_user_id, created_at desc);
create index io_usage_reservations_endpoint_time_idx
  on public.io_usage_reservations (endpoint_id, created_at desc);

create table public.io_usage_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete restrict,
  reservation_id uuid not null unique references public.io_usage_reservations(id) on delete restrict,
  receipt_id uuid not null unique references public.io_route_receipts(id) on delete restrict,
  request_id uuid not null unique,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  endpoint_id uuid not null references public.io_model_endpoints(id) on delete restrict,
  currency_code text not null,
  amount_minor bigint not null,
  input_tokens integer,
  output_tokens integer,
  recorded_at timestamptz not null default now(),
  constraint io_usage_records_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_usage_records_amount_check check (amount_minor >= 0),
  constraint io_usage_records_tokens_check check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
  )
);

create index io_usage_records_workspace_time_idx
  on public.io_usage_records (workspace_id, recorded_at desc, id desc);
create index io_usage_records_actor_time_idx
  on public.io_usage_records (actor_user_id, recorded_at desc);
create index io_usage_records_endpoint_time_idx
  on public.io_usage_records (endpoint_id, recorded_at desc);

create table private.io_idempotency_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null,
  request_fingerprint text not null,
  request_id uuid not null unique,
  reservation_id uuid references public.io_usage_reservations(id) on delete restrict,
  receipt_id uuid references public.io_route_receipts(id) on delete restrict,
  state text not null default 'reserved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  terminal_at timestamptz,
  constraint io_idempotency_records_key_check check (
    char_length(idempotency_key) between 8 and 128
    and idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]+$'
  ),
  constraint io_idempotency_records_fingerprint_check check (
    request_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  constraint io_idempotency_records_state_check check (
    state in ('reserved', 'completed', 'failed', 'expired')
  ),
  constraint io_idempotency_records_terminal_check check (
    (state = 'reserved' and terminal_at is null and receipt_id is null)
    or (state in ('completed', 'failed') and terminal_at is not null and receipt_id is not null)
    or (state = 'expired' and terminal_at is not null)
  ),
  constraint io_idempotency_records_actor_key unique (
    workspace_id,
    actor_user_id,
    idempotency_key
  )
);

create index io_idempotency_records_actor_time_idx
  on private.io_idempotency_records (actor_user_id, created_at desc);
create index io_idempotency_records_reservation_idx
  on private.io_idempotency_records (reservation_id)
  where reservation_id is not null;
create index io_idempotency_records_receipt_idx
  on private.io_idempotency_records (receipt_id)
  where receipt_id is not null;

create table private.io_ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete restrict,
  request_id uuid not null,
  transaction_kind text not null,
  currency_code text not null,
  occurred_at timestamptz not null default now(),
  constraint io_ledger_transactions_kind_check check (
    transaction_kind in ('reserve', 'settle', 'release', 'expire', 'adjustment')
  ),
  constraint io_ledger_transactions_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_ledger_transactions_request_kind_key unique (request_id, transaction_kind)
);

create index io_ledger_transactions_workspace_time_idx
  on private.io_ledger_transactions (workspace_id, occurred_at desc, id desc);

create table private.io_ledger_entries (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references private.io_ledger_transactions(id) on delete restrict,
  account_code text not null,
  amount_minor bigint not null,
  constraint io_ledger_entries_account_check check (
    account_code in ('budget_available', 'budget_reserved', 'provider_cost', 'adjustment')
  ),
  constraint io_ledger_entries_transaction_account_key unique (transaction_id, account_code)
);

create index io_ledger_entries_transaction_idx
  on private.io_ledger_entries (transaction_id, id);

create table private.io_endpoint_health_samples (
  id bigint generated always as identity primary key,
  endpoint_id uuid not null references public.io_model_endpoints(id) on delete cascade,
  health_state text not null,
  latency_ms integer,
  error_code text,
  source text not null,
  observed_at timestamptz not null default now(),
  valid_until timestamptz not null,
  constraint io_endpoint_health_samples_state_check check (
    health_state in ('healthy', 'degraded', 'unavailable')
  ),
  constraint io_endpoint_health_samples_latency_check check (
    latency_ms is null or latency_ms between 0 and 600000
  ),
  constraint io_endpoint_health_samples_error_check check (
    error_code is null or error_code ~ '^[a-z][a-z0-9_.-]{1,99}$'
  ),
  constraint io_endpoint_health_samples_source_check check (
    source in ('route_attempt', 'synthetic', 'operator')
  ),
  constraint io_endpoint_health_samples_validity_check check (valid_until > observed_at)
);

create index io_endpoint_health_samples_endpoint_time_idx
  on private.io_endpoint_health_samples (endpoint_id, observed_at desc, id desc);
create index io_endpoint_health_samples_valid_until_idx
  on private.io_endpoint_health_samples (valid_until);

create table private.io_endpoint_circuit_states (
  endpoint_id uuid primary key references public.io_model_endpoints(id) on delete cascade,
  circuit_state text not null default 'closed',
  consecutive_failures integer not null default 0,
  opened_at timestamptz,
  retry_after timestamptz,
  reason_code text,
  updated_at timestamptz not null default now(),
  constraint io_endpoint_circuit_states_state_check check (
    circuit_state in ('closed', 'open', 'half_open')
  ),
  constraint io_endpoint_circuit_states_failures_check check (consecutive_failures >= 0),
  constraint io_endpoint_circuit_states_reason_check check (
    reason_code is null or reason_code ~ '^[a-z][a-z0-9_.-]{1,99}$'
  ),
  constraint io_endpoint_circuit_states_open_check check (
    (circuit_state = 'closed' and opened_at is null and retry_after is null)
    or (circuit_state in ('open', 'half_open') and opened_at is not null and retry_after is not null)
  )
);

create table private.io_endpoint_circuit_events (
  id bigint generated always as identity primary key,
  endpoint_id uuid not null references public.io_model_endpoints(id) on delete restrict,
  circuit_state text not null,
  reason text not null,
  actor_user_id uuid references auth.users(id) on delete restrict,
  source text not null,
  occurred_at timestamptz not null default now(),
  constraint io_endpoint_circuit_events_state_check check (
    circuit_state in ('closed', 'open', 'half_open')
  ),
  constraint io_endpoint_circuit_events_reason_check check (
    char_length(btrim(reason)) between 3 and 500
  ),
  constraint io_endpoint_circuit_events_source_check check (
    source in ('automatic', 'operator')
  )
);

create index io_endpoint_circuit_events_endpoint_time_idx
  on private.io_endpoint_circuit_events (endpoint_id, occurred_at desc, id desc);
create index io_endpoint_circuit_events_actor_idx
  on private.io_endpoint_circuit_events (actor_user_id)
  where actor_user_id is not null;

alter table public.io_budget_limits enable row level security;
alter table public.io_usage_reservations enable row level security;
alter table public.io_usage_records enable row level security;
alter table private.io_idempotency_records enable row level security;
alter table private.io_ledger_transactions enable row level security;
alter table private.io_ledger_entries enable row level security;
alter table private.io_endpoint_health_samples enable row level security;
alter table private.io_endpoint_circuit_states enable row level security;
alter table private.io_endpoint_circuit_events enable row level security;

create policy "I/O members read usage reservations"
on public.io_usage_reservations for select
to authenticated
using ((select private.io_workspace_has_role(workspace_id, null)));

create policy "I/O members read usage records"
on public.io_usage_records for select
to authenticated
using ((select private.io_workspace_has_role(workspace_id, null)));

revoke all on public.io_budget_limits from public, anon, authenticated;
revoke all on public.io_usage_reservations, public.io_usage_records
  from public, anon, authenticated;
grant select on public.io_usage_reservations, public.io_usage_records to authenticated;
grant select, insert, update on public.io_budget_limits to service_role;
grant select, insert, update on public.io_usage_reservations to service_role;
grant select, insert on public.io_usage_records to service_role;

revoke all on private.io_idempotency_records,
  private.io_ledger_transactions,
  private.io_ledger_entries,
  private.io_endpoint_health_samples,
  private.io_endpoint_circuit_states,
  private.io_endpoint_circuit_events
from public, anon, authenticated;
grant select, insert, update on private.io_idempotency_records to service_role;
grant select, insert on private.io_ledger_transactions, private.io_ledger_entries to service_role;
grant select, insert on private.io_endpoint_health_samples to service_role;
grant select, insert, update on private.io_endpoint_circuit_states to service_role;
grant select, insert on private.io_endpoint_circuit_events to service_role;

create trigger io_budget_limits_set_updated_at
before update on public.io_budget_limits
for each row execute function public.update_updated_at_column();

create trigger io_idempotency_records_set_updated_at
before update on private.io_idempotency_records
for each row execute function public.update_updated_at_column();

create or replace function private.io_assert_ledger_balanced(_transaction_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  balance bigint;
begin
  select coalesce(sum(entry.amount_minor), 0)
  into balance
  from private.io_ledger_entries as entry
  where entry.transaction_id = _transaction_id;

  if balance <> 0 then
    raise exception 'Ledger transaction is not balanced';
  end if;
end;
$function$;

create or replace function private.io_expire_stale_route_reservations(_workspace_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  stale public.io_usage_reservations%rowtype;
  transaction_id uuid;
  expired_count integer := 0;
begin
  for stale in
    select reservation.*
    from public.io_usage_reservations as reservation
    where reservation.workspace_id = _workspace_id
      and reservation.state = 'reserved'
      and reservation.expires_at <= now()
    for update skip locked
  loop
    update public.io_usage_reservations
    set state = 'expired', settled_minor = 0, settled_at = now()
    where id = stale.id;

    update private.io_idempotency_records
    set state = 'expired', terminal_at = now()
    where reservation_id = stale.id and state = 'reserved';

    insert into private.io_ledger_transactions (
      workspace_id,
      request_id,
      transaction_kind,
      currency_code
    ) values (
      stale.workspace_id,
      stale.request_id,
      'expire',
      stale.currency_code
    )
    on conflict (request_id, transaction_kind) do nothing
    returning id into transaction_id;

    if transaction_id is not null then
      insert into private.io_ledger_entries (transaction_id, account_code, amount_minor)
      values
        (transaction_id, 'budget_reserved', -stale.reserved_minor),
        (transaction_id, 'budget_available', stale.reserved_minor);
      perform private.io_assert_ledger_balanced(transaction_id);
    end if;
    transaction_id := null;
    expired_count := expired_count + 1;
  end loop;
  return expired_count;
end;
$function$;

revoke all on function private.io_expire_stale_route_reservations(uuid)
  from public, anon, authenticated, service_role;

revoke all on function private.io_assert_ledger_balanced(uuid)
  from public, anon, authenticated;

create or replace function public.io_begin_route_request(
  _workspace_id uuid,
  _actor_user_id uuid,
  _idempotency_key text,
  _request_fingerprint text,
  _request_id uuid,
  _endpoint_id uuid,
  _currency_code text,
  _reserve_minor bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  existing private.io_idempotency_records%rowtype;
  budget public.io_budget_limits%rowtype;
  reservation_id uuid;
  transaction_id uuid;
  spent_minor bigint := 0;
  held_minor bigint := 0;
  normalized_currency text := upper(btrim(coalesce(_currency_code, '')));
begin
  if _workspace_id is null or _actor_user_id is null or _request_id is null or _endpoint_id is null then
    raise exception 'Route request identifiers are required';
  end if;
  if char_length(coalesce(_idempotency_key, '')) < 8
    or char_length(_idempotency_key) > 128
    or _idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]+$' then
    raise exception 'Invalid idempotency key';
  end if;
  if coalesce(_request_fingerprint, '') !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid request fingerprint';
  end if;
  if normalized_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid route currency';
  end if;
  if _reserve_minor is null or _reserve_minor < 0 then
    raise exception 'Invalid reservation amount';
  end if;
  if not exists (
    select 1
    from public.io_workspace_members as member
    join public.io_workspaces as workspace on workspace.id = member.workspace_id
    where member.workspace_id = _workspace_id
      and member.user_id = _actor_user_id
      and member.status = 'active'
      and workspace.status = 'active'
  ) then
    raise exception 'Active workspace membership required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.io_model_endpoints as endpoint where endpoint.id = _endpoint_id
  ) then
    raise exception 'Selected endpoint does not exist';
  end if;

  perform private.io_expire_stale_route_reservations(_workspace_id);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      _workspace_id::text || ':' || _actor_user_id::text || ':' || _idempotency_key,
      0
    )
  );

  select *
  into existing
  from private.io_idempotency_records as record
  where record.workspace_id = _workspace_id
    and record.actor_user_id = _actor_user_id
    and record.idempotency_key = _idempotency_key;

  if found then
    if existing.request_fingerprint <> _request_fingerprint then
      raise exception 'Idempotency key was already used for a different request';
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'state', existing.state,
      'requestId', existing.request_id,
      'reservationId', existing.reservation_id,
      'receiptId', existing.receipt_id
    );
  end if;

  if exists (
    select 1
    from private.io_endpoint_circuit_states as circuit
    where circuit.endpoint_id = _endpoint_id
      and circuit.circuit_state = 'open'
      and circuit.retry_after > now()
  ) then
    raise exception 'Selected endpoint circuit is open';
  end if;

  select *
  into budget
  from public.io_budget_limits as limit_row
  where limit_row.workspace_id = _workspace_id
    and limit_row.currency_code = normalized_currency
    and limit_row.status = 'active'
    and limit_row.period_start <= now()
    and limit_row.period_end > now()
  for update;

  if not found then
    raise exception 'No active workspace budget is configured for this currency';
  end if;

  select coalesce(sum(usage.amount_minor), 0)
  into spent_minor
  from public.io_usage_records as usage
  where usage.workspace_id = _workspace_id
    and usage.currency_code = normalized_currency
    and usage.recorded_at >= budget.period_start
    and usage.recorded_at < budget.period_end;

  select coalesce(sum(reservation.reserved_minor), 0)
  into held_minor
  from public.io_usage_reservations as reservation
  where reservation.budget_limit_id = budget.id
    and reservation.state = 'reserved'
    and reservation.expires_at > now();

  if spent_minor + held_minor + _reserve_minor > budget.hard_limit_minor then
    raise exception 'Workspace budget would be exceeded';
  end if;

  insert into public.io_usage_reservations (
    workspace_id,
    budget_limit_id,
    request_id,
    actor_user_id,
    endpoint_id,
    currency_code,
    reserved_minor,
    expires_at
  ) values (
    _workspace_id,
    budget.id,
    _request_id,
    _actor_user_id,
    _endpoint_id,
    normalized_currency,
    _reserve_minor,
    now() + interval '10 minutes'
  ) returning id into reservation_id;

  insert into private.io_idempotency_records (
    workspace_id,
    actor_user_id,
    idempotency_key,
    request_fingerprint,
    request_id,
    reservation_id
  ) values (
    _workspace_id,
    _actor_user_id,
    _idempotency_key,
    _request_fingerprint,
    _request_id,
    reservation_id
  );

  insert into private.io_ledger_transactions (
    workspace_id,
    request_id,
    transaction_kind,
    currency_code
  ) values (
    _workspace_id,
    _request_id,
    'reserve',
    normalized_currency
  ) returning id into transaction_id;

  insert into private.io_ledger_entries (transaction_id, account_code, amount_minor)
  values
    (transaction_id, 'budget_available', -_reserve_minor),
    (transaction_id, 'budget_reserved', _reserve_minor);
  perform private.io_assert_ledger_balanced(transaction_id);

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'state', 'reserved',
    'requestId', _request_id,
    'reservationId', reservation_id,
    'reservedMinor', _reserve_minor,
    'currencyCode', normalized_currency
  );
end;
$function$;

revoke all on function public.io_begin_route_request(
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid,
  text,
  bigint
) from public, anon, authenticated;
grant execute on function public.io_begin_route_request(
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid,
  text,
  bigint
) to service_role;

create or replace function public.io_finalize_route_request(
  _request_id uuid,
  _result_state text,
  _route_strategy text,
  _selection jsonb,
  _attempts jsonb,
  _candidate_count integer,
  _fallback_count integer,
  _estimated_cost_nanos bigint,
  _currency_code text,
  _input_tokens integer,
  _output_tokens integer,
  _actual_cost_minor bigint,
  _policy_snapshot jsonb,
  _candidate_summary jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  idempotency private.io_idempotency_records%rowtype;
  reservation public.io_usage_reservations%rowtype;
  created_receipt_id uuid;
  transaction_id uuid;
  release_minor bigint;
  attempt jsonb;
  attempt_index integer := 0;
  normalized_currency text := upper(btrim(coalesce(_currency_code, '')));
begin
  if _result_state not in ('completed', 'failed') then
    raise exception 'Unsupported route result state';
  end if;
  if _route_strategy not in ('latest_affordable', 'lowest_cost', 'explicit_model') then
    raise exception 'Unsupported route strategy';
  end if;
  if jsonb_typeof(_selection) <> 'object'
    or jsonb_typeof(_attempts) <> 'array'
    or jsonb_typeof(_policy_snapshot) <> 'object'
    or jsonb_typeof(_candidate_summary) <> 'array' then
    raise exception 'Invalid route finalization payload';
  end if;
  if jsonb_array_length(_attempts) > 3 then
    raise exception 'Too many provider attempts';
  end if;
  if _candidate_count is null or _candidate_count < 0
    or _fallback_count is null or _fallback_count < 0
    or _fallback_count > greatest(jsonb_array_length(_attempts) - 1, 0) then
    raise exception 'Invalid route counts';
  end if;
  if _estimated_cost_nanos is not null and _estimated_cost_nanos < 0 then
    raise exception 'Invalid estimated cost';
  end if;
  if normalized_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid route currency';
  end if;
  if _actual_cost_minor is null or _actual_cost_minor < 0 then
    raise exception 'Invalid settled cost';
  end if;
  if (_input_tokens is not null and _input_tokens < 0)
    or (_output_tokens is not null and _output_tokens < 0) then
    raise exception 'Invalid token usage';
  end if;

  select *
  into idempotency
  from private.io_idempotency_records as record
  where record.request_id = _request_id
  for update;

  if not found then
    raise exception 'Reserved route request does not exist';
  end if;
  if idempotency.state in ('completed', 'failed') then
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'receiptId', idempotency.receipt_id,
      'state', idempotency.state
    );
  end if;
  if idempotency.state <> 'reserved' or idempotency.reservation_id is null then
    raise exception 'Route request is not finalizable';
  end if;

  select *
  into reservation
  from public.io_usage_reservations as row_reservation
  where row_reservation.id = idempotency.reservation_id
  for update;

  if not found or reservation.state <> 'reserved' then
    raise exception 'Route reservation is not active';
  end if;
  if reservation.currency_code <> normalized_currency then
    raise exception 'Route settlement currency mismatch';
  end if;
  if _actual_cost_minor > reservation.reserved_minor then
    raise exception 'Route settlement exceeds its reservation';
  end if;
  if _result_state = 'failed' and _actual_cost_minor <> 0 then
    raise exception 'Failed routes cannot settle provider cost without reviewed usage';
  end if;

  insert into public.io_route_receipts (
    workspace_id,
    request_id,
    actor_user_id,
    route_strategy,
    result_state,
    selected_provider_id,
    selected_model_id,
    selected_endpoint_id,
    selected_capacity_source_id,
    selected_provider_key,
    selected_model_key,
    selected_capacity_mode,
    selected_region_code,
    selected_residency_country_code,
    selected_retention_class,
    selected_currency_code,
    capability_version,
    price_version,
    candidate_count,
    fallback_count,
    estimated_cost_nanos,
    input_tokens,
    output_tokens,
    policy_snapshot,
    candidate_summary
  ) values (
    idempotency.workspace_id,
    _request_id,
    idempotency.actor_user_id,
    _route_strategy,
    _result_state,
    (_selection ->> 'provider_id')::uuid,
    (_selection ->> 'model_id')::uuid,
    (_selection ->> 'endpoint_id')::uuid,
    (_selection ->> 'capacity_source_id')::uuid,
    _selection ->> 'provider_key',
    _selection ->> 'model_key',
    _selection ->> 'capacity_mode',
    _selection ->> 'region_code',
    _selection ->> 'residency_country_code',
    _selection ->> 'retention_class',
    normalized_currency,
    (_selection ->> 'capability_version')::integer,
    (_selection ->> 'price_version')::integer,
    _candidate_count,
    _fallback_count,
    _estimated_cost_nanos,
    _input_tokens,
    _output_tokens,
    _policy_snapshot,
    _candidate_summary
  ) returning id into created_receipt_id;

  for attempt in select value from jsonb_array_elements(_attempts)
  loop
    attempt_index := attempt_index + 1;
    if (attempt ->> 'state') not in ('completed', 'failed') then
      raise exception 'Invalid provider attempt state';
    end if;
    insert into public.io_provider_attempts (
      receipt_id,
      attempt_index,
      provider_id,
      model_id,
      endpoint_id,
      attempt_state,
      error_code,
      upstream_status,
      provider_request_id,
      started_at,
      completed_at,
      input_tokens,
      output_tokens
    ) values (
      created_receipt_id,
      attempt_index,
      (attempt ->> 'provider_id')::uuid,
      (attempt ->> 'model_id')::uuid,
      (attempt ->> 'endpoint_id')::uuid,
      attempt ->> 'state',
      nullif(attempt ->> 'error_code', ''),
      nullif(attempt ->> 'upstream_status', '')::integer,
      nullif(attempt ->> 'provider_request_id', ''),
      (attempt ->> 'started_at')::timestamptz,
      (attempt ->> 'completed_at')::timestamptz,
      nullif(attempt ->> 'input_tokens', '')::integer,
      nullif(attempt ->> 'output_tokens', '')::integer
    );
  end loop;

  release_minor := reservation.reserved_minor - _actual_cost_minor;

  update public.io_usage_reservations
  set
    state = case when _result_state = 'completed' then 'settled' else 'released' end,
    endpoint_id = (_selection ->> 'endpoint_id')::uuid,
    settled_minor = _actual_cost_minor,
    settled_at = now(),
    receipt_id = created_receipt_id
  where id = reservation.id;

  if _result_state = 'completed' then
    insert into public.io_usage_records (
      workspace_id,
      reservation_id,
      receipt_id,
      request_id,
      actor_user_id,
      endpoint_id,
      currency_code,
      amount_minor,
      input_tokens,
      output_tokens
    ) values (
      idempotency.workspace_id,
      reservation.id,
      created_receipt_id,
      _request_id,
      idempotency.actor_user_id,
      (_selection ->> 'endpoint_id')::uuid,
      normalized_currency,
      _actual_cost_minor,
      _input_tokens,
      _output_tokens
    );
  end if;

  insert into private.io_ledger_transactions (
    workspace_id,
    request_id,
    transaction_kind,
    currency_code
  ) values (
    idempotency.workspace_id,
    _request_id,
    case when _result_state = 'completed' then 'settle' else 'release' end,
    normalized_currency
  ) returning id into transaction_id;

  insert into private.io_ledger_entries (transaction_id, account_code, amount_minor)
  values
    (transaction_id, 'budget_reserved', -reservation.reserved_minor),
    (transaction_id, 'provider_cost', _actual_cost_minor),
    (transaction_id, 'budget_available', release_minor);
  perform private.io_assert_ledger_balanced(transaction_id);

  update private.io_idempotency_records
  set
    state = _result_state,
    receipt_id = created_receipt_id,
    terminal_at = now()
  where id = idempotency.id;

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'receiptId', created_receipt_id,
    'reservationId', reservation.id,
    'state', _result_state,
    'settledMinor', _actual_cost_minor,
    'releasedMinor', release_minor,
    'currencyCode', normalized_currency
  );
end;
$function$;

revoke all on function public.io_finalize_route_request(
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  integer,
  integer,
  bigint,
  text,
  integer,
  integer,
  bigint,
  jsonb,
  jsonb
) from public, anon, authenticated;
grant execute on function public.io_finalize_route_request(
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  integer,
  integer,
  bigint,
  text,
  integer,
  integer,
  bigint,
  jsonb,
  jsonb
) to service_role;

create or replace function public.io_record_endpoint_outcome(
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
  next_failures integer;
  next_state text;
  next_retry_after timestamptz;
  normalized_error text := nullif(btrim(coalesce(_error_code, '')), '');
begin
  if _endpoint_id is null or _success is null then
    raise exception 'Endpoint outcome is incomplete';
  end if;
  if _latency_ms is not null and (_latency_ms < 0 or _latency_ms > 600000) then
    raise exception 'Endpoint latency is invalid';
  end if;
  if normalized_error is not null and normalized_error !~ '^[a-z][a-z0-9_.-]{1,99}$' then
    raise exception 'Endpoint error code is invalid';
  end if;

  select circuit.consecutive_failures
  into current_failures
  from private.io_endpoint_circuit_states as circuit
  where circuit.endpoint_id = _endpoint_id
  for update;
  current_failures := coalesce(current_failures, 0);

  if _success then
    next_failures := 0;
    next_state := 'closed';
    next_retry_after := null;
  else
    next_failures := current_failures + 1;
    next_state := case when next_failures >= 5 then 'open' else 'closed' end;
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
    'route_attempt',
    now() + interval '5 minutes'
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
    case when _success then null else coalesce(normalized_error, 'upstream_failure') end,
    now()
  )
  on conflict (endpoint_id) do update set
    circuit_state = excluded.circuit_state,
    consecutive_failures = excluded.consecutive_failures,
    opened_at = excluded.opened_at,
    retry_after = excluded.retry_after,
    reason_code = excluded.reason_code,
    updated_at = excluded.updated_at;

  if next_state = 'open' or (_success and current_failures > 0) then
    insert into private.io_endpoint_circuit_events (
      endpoint_id,
      circuit_state,
      reason,
      source
    ) values (
      _endpoint_id,
      next_state,
      case
        when next_state = 'open' then 'Automatic circuit opened after five consecutive failures.'
        else 'Successful provider outcome closed the automatic circuit.'
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
    'retryAfter', next_retry_after
  );
end;
$function$;

revoke all on function public.io_record_endpoint_outcome(uuid, boolean, integer, text)
  from public, anon, authenticated;
grant execute on function public.io_record_endpoint_outcome(uuid, boolean, integer, text)
  to service_role;

create or replace function public.io_get_routable_endpoint_connections_v2()
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
    evidence.capability_version,
    price.version,
    price.currency_code,
    price.unit_quantity,
    price.input_price_nanos,
    price.output_price_nanos,
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

create or replace function public.get_my_io_budget_status(_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null
    or not private.io_workspace_has_role(_workspace_id, null) then
    raise exception 'Active workspace membership required' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'budgetLimitId', budget.id,
        'currencyCode', budget.currency_code,
        'hardLimitMinor', budget.hard_limit_minor::text,
        'reservedMinor', coalesce(held.amount_minor, 0)::text,
        'spentMinor', coalesce(spent.amount_minor, 0)::text,
        'remainingMinor', greatest(
          budget.hard_limit_minor
          - coalesce(held.amount_minor, 0)
          - coalesce(spent.amount_minor, 0),
          0
        )::text,
        'periodStart', budget.period_start,
        'periodEnd', budget.period_end
      )
      order by budget.currency_code
    )
    from public.io_budget_limits as budget
    left join lateral (
      select sum(reservation.reserved_minor)::bigint as amount_minor
      from public.io_usage_reservations as reservation
      where reservation.budget_limit_id = budget.id
        and reservation.state = 'reserved'
        and reservation.expires_at > now()
    ) as held on true
    left join lateral (
      select sum(usage.amount_minor)::bigint as amount_minor
      from public.io_usage_records as usage
      where usage.workspace_id = budget.workspace_id
        and usage.currency_code = budget.currency_code
        and usage.recorded_at >= budget.period_start
        and usage.recorded_at < budget.period_end
    ) as spent on true
    where budget.workspace_id = _workspace_id
      and budget.status = 'active'
      and budget.period_start <= now()
      and budget.period_end > now()
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.get_my_io_budget_status(uuid) from public, anon;
grant execute on function public.get_my_io_budget_status(uuid) to authenticated, service_role;

create or replace function public.admin_io_budget_snapshot()
returns table (
  workspace_id uuid,
  workspace_name text,
  currency_code text,
  hard_limit_minor text,
  reserved_minor text,
  spent_minor text,
  remaining_minor text,
  period_start timestamptz,
  period_end timestamptz,
  budget_status text
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
    workspace.id,
    workspace.name,
    budget.currency_code,
    budget.hard_limit_minor::text,
    coalesce(held.amount_minor, 0)::text,
    coalesce(spent.amount_minor, 0)::text,
    greatest(
      budget.hard_limit_minor
      - coalesce(held.amount_minor, 0)
      - coalesce(spent.amount_minor, 0),
      0
    )::text,
    budget.period_start,
    budget.period_end,
    budget.status
  from public.io_workspaces as workspace
  left join public.io_budget_limits as budget
    on budget.workspace_id = workspace.id
    and budget.status = 'active'
    and budget.period_start <= now()
    and budget.period_end > now()
  left join lateral (
    select sum(reservation.reserved_minor)::bigint as amount_minor
    from public.io_usage_reservations as reservation
    where reservation.budget_limit_id = budget.id
      and reservation.state = 'reserved'
      and reservation.expires_at > now()
  ) as held on true
  left join lateral (
    select sum(usage.amount_minor)::bigint as amount_minor
    from public.io_usage_records as usage
    where usage.workspace_id = workspace.id
      and usage.currency_code = budget.currency_code
      and usage.recorded_at >= budget.period_start
      and usage.recorded_at < budget.period_end
  ) as spent on true
  where workspace.status = 'active'
  order by workspace.name, budget.currency_code nulls last;
end;
$function$;

revoke all on function public.admin_io_budget_snapshot()
  from public, anon, authenticated;
grant execute on function public.admin_io_budget_snapshot()
  to authenticated, service_role;

create or replace function public.admin_io_set_workspace_budget(
  _workspace_id uuid,
  _currency_code text,
  _hard_limit_minor bigint,
  _period_start timestamptz,
  _period_end timestamptz,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_currency text := upper(btrim(coalesce(_currency_code, '')));
  normalized_reason text := btrim(coalesce(_reason, ''));
  budget_id uuid;
begin
  if not private.has_admin_capability(caller_id, 'io.manage') then
    raise exception 'I/O operations management access required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.io_workspaces as workspace
    where workspace.id = _workspace_id and workspace.status = 'active'
  ) then
    raise exception 'Active I/O workspace does not exist';
  end if;
  if normalized_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a three-letter ISO code';
  end if;
  if _hard_limit_minor is null or _hard_limit_minor < 0 then
    raise exception 'Budget must be a non-negative integer minor-unit amount';
  end if;
  if _period_start is null or _period_end is null or _period_end <= _period_start then
    raise exception 'Budget period is invalid';
  end if;
  if char_length(normalized_reason) < 8 or char_length(normalized_reason) > 500 then
    raise exception 'A reason between 8 and 500 characters is required';
  end if;

  update public.io_budget_limits
  set status = 'retired', updated_by = caller_id
  where workspace_id = _workspace_id
    and currency_code = normalized_currency
    and status = 'active';

  insert into public.io_budget_limits (
    workspace_id,
    currency_code,
    hard_limit_minor,
    period_start,
    period_end,
    reason,
    created_by,
    updated_by
  ) values (
    _workspace_id,
    normalized_currency,
    _hard_limit_minor,
    _period_start,
    _period_end,
    normalized_reason,
    caller_id,
    caller_id
  ) returning id into budget_id;

  return jsonb_build_object('ok', true, 'budgetLimitId', budget_id);
end;
$function$;

revoke all on function public.admin_io_set_workspace_budget(
  uuid,
  text,
  bigint,
  timestamptz,
  timestamptz,
  text
) from public, anon, authenticated;
grant execute on function public.admin_io_set_workspace_budget(
  uuid,
  text,
  bigint,
  timestamptz,
  timestamptz,
  text
) to authenticated, service_role;

create or replace function public.admin_io_endpoint_health_snapshot()
returns table (
  provider_id uuid,
  provider_key text,
  endpoint_id uuid,
  endpoint_key text,
  health_state text,
  circuit_state text,
  consecutive_failures integer,
  latency_ms integer,
  observed_at timestamptz,
  retry_after timestamptz
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
    endpoint.id,
    endpoint.endpoint_key,
    coalesce(health.health_state, 'unknown'),
    coalesce(circuit.circuit_state, 'closed'),
    coalesce(circuit.consecutive_failures, 0),
    health.latency_ms,
    health.observed_at,
    circuit.retry_after
  from public.io_model_endpoints as endpoint
  join public.io_providers as provider on provider.id = endpoint.provider_id
  left join lateral (
    select sample.health_state, sample.latency_ms, sample.observed_at
    from private.io_endpoint_health_samples as sample
    where sample.endpoint_id = endpoint.id
    order by sample.observed_at desc, sample.id desc
    limit 1
  ) as health on true
  left join private.io_endpoint_circuit_states as circuit on circuit.endpoint_id = endpoint.id
  order by provider.display_name, endpoint.endpoint_key;
end;
$function$;

revoke all on function public.admin_io_endpoint_health_snapshot()
  from public, anon, authenticated;
grant execute on function public.admin_io_endpoint_health_snapshot()
  to authenticated, service_role;

create or replace function public.admin_io_set_endpoint_circuit(
  _endpoint_id uuid,
  _circuit_state text,
  _reason text,
  _retry_after timestamptz default null
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
  if _circuit_state not in ('closed', 'open') then
    raise exception 'Operator circuit state must be closed or open';
  end if;
  if char_length(normalized_reason) < 8 or char_length(normalized_reason) > 500 then
    raise exception 'A reason between 8 and 500 characters is required';
  end if;
  if not exists (
    select 1 from public.io_model_endpoints as endpoint where endpoint.id = _endpoint_id
  ) then
    raise exception 'Endpoint does not exist';
  end if;
  if _circuit_state = 'open' and (_retry_after is null or _retry_after <= now()) then
    raise exception 'An open circuit requires a future retry time';
  end if;

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
    _circuit_state,
    case when _circuit_state = 'closed' then 0 else 5 end,
    case when _circuit_state = 'open' then now() else null end,
    case when _circuit_state = 'open' then _retry_after else null end,
    case when _circuit_state = 'open' then 'operator_open' else null end,
    now()
  )
  on conflict (endpoint_id) do update set
    circuit_state = excluded.circuit_state,
    consecutive_failures = excluded.consecutive_failures,
    opened_at = excluded.opened_at,
    retry_after = excluded.retry_after,
    reason_code = excluded.reason_code,
    updated_at = excluded.updated_at;

  insert into private.io_endpoint_circuit_events (
    endpoint_id,
    circuit_state,
    reason,
    actor_user_id,
    source
  ) values (
    _endpoint_id,
    _circuit_state,
    normalized_reason,
    caller_id,
    'operator'
  );

  return jsonb_build_object('ok', true, 'circuitState', _circuit_state);
end;
$function$;

revoke all on function public.admin_io_set_endpoint_circuit(uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_io_set_endpoint_circuit(uuid, text, text, timestamptz)
  to authenticated, service_role;

comment on table public.io_budget_limits is
  'Versioned hard workspace budget authority in integer minor units. Browser writes are prohibited.';
comment on table public.io_usage_reservations is
  'Durable per-request budget holds. They contain no prompt or response content.';
comment on table public.io_usage_records is
  'Settled provider usage linked one-to-one with an immutable route receipt.';
comment on table private.io_idempotency_records is
  'Server-only request fingerprints that prevent duplicate provider dispatch without storing request content.';
comment on table private.io_ledger_transactions is
  'Append-only transaction headers for reserve, settle and release accounting.';
comment on table private.io_ledger_entries is
  'Balanced signed integer-minor-unit ledger entries. Every transaction is asserted to sum to zero.';
comment on function public.io_begin_route_request(uuid, uuid, text, text, uuid, uuid, text, bigint) is
  'Service-role-only atomic idempotency and hard-budget reservation boundary.';
comment on function public.io_finalize_route_request(uuid, text, text, jsonb, jsonb, integer, integer, bigint, text, integer, integer, bigint, jsonb, jsonb) is
  'Service-role-only atomic receipt, attempt, settlement/release and idempotency finalization boundary.';
