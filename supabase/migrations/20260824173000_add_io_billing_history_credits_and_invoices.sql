-- I/O member billing evidence: paged route history, non-cash credits and
-- immutable invoice snapshots. The existing hard workspace budget remains the
-- authorization boundary. Credits offset settled usage; they never authorize
-- a request or hide provider cost/the 5.5% service fee.

create table public.io_credit_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete restrict,
  currency_code text not null,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_credit_accounts_workspace_currency_key unique (workspace_id, currency_code),
  constraint io_credit_accounts_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_credit_accounts_status_check check (status in ('active', 'frozen', 'closed'))
);

create table public.io_credit_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.io_credit_accounts(id) on delete restrict,
  entry_kind text not null,
  amount_nanos bigint not null,
  usage_record_id uuid references public.io_usage_records(id) on delete restrict,
  external_reference text,
  reason text not null,
  posted_by uuid references auth.users(id) on delete set null,
  posted_at timestamptz not null default now(),
  constraint io_credit_entries_kind_check check (
    entry_kind in (
      'promotional_grant',
      'sponsored_grant',
      'manual_grant',
      'usage_application',
      'refund',
      'reversal'
    )
  ),
  constraint io_credit_entries_amount_check check (
    amount_nanos <> 0
    and (
      (entry_kind = 'usage_application' and amount_nanos < 0)
      or (entry_kind <> 'usage_application' and amount_nanos > 0)
    )
  ),
  constraint io_credit_entries_usage_shape_check check (
    (entry_kind = 'usage_application' and usage_record_id is not null)
    or (entry_kind <> 'usage_application' and usage_record_id is null)
  ),
  constraint io_credit_entries_reference_check check (
    external_reference is null
    or (
      char_length(external_reference) between 8 and 160
      and external_reference ~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]+$'
    )
  ),
  constraint io_credit_entries_reason_check check (char_length(btrim(reason)) between 8 and 500),
  constraint io_credit_entries_usage_key unique (usage_record_id),
  constraint io_credit_entries_external_key unique (account_id, external_reference)
);

create index io_credit_entries_account_time_idx
  on public.io_credit_entries (account_id, posted_at desc, id desc);
create index io_credit_entries_posted_by_idx
  on public.io_credit_entries (posted_by)
  where posted_by is not null;

alter table public.io_usage_records
  add column credit_applied_nanos bigint not null default 0,
  add column amount_due_nanos bigint not null default 0;

update public.io_usage_records
set amount_due_nanos = coalesce(customer_charge_nanos, 0);

alter table public.io_usage_records
  add constraint io_usage_records_credit_amounts_check check (
    credit_applied_nanos >= 0
    and amount_due_nanos >= 0
    and (
      (customer_charge_nanos is null and credit_applied_nanos = 0 and amount_due_nanos = 0)
      or (
        customer_charge_nanos is not null
        and credit_applied_nanos <= customer_charge_nanos
        and amount_due_nanos = customer_charge_nanos - credit_applied_nanos
      )
    )
  );

create table public.io_invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete restrict,
  invoice_number text not null unique,
  currency_code text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  state text not null default 'draft',
  provider_cost_nanos bigint not null,
  service_fee_nanos bigint not null,
  subtotal_nanos bigint not null,
  credit_applied_nanos bigint not null,
  tax_nanos bigint not null default 0,
  total_nanos bigint not null,
  amount_due_nanos bigint not null,
  tax_status text not null default 'not_assessed',
  buyer_snapshot jsonb not null default '{}'::jsonb,
  tax_evidence_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  issued_at timestamptz,
  due_at timestamptz,
  voided_at timestamptz,
  constraint io_invoices_number_check check (invoice_number ~ '^IO-[0-9]{6}-[0-9]{6}$'),
  constraint io_invoices_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_invoices_period_check check (period_end > period_start),
  constraint io_invoices_state_check check (state in ('draft', 'issued', 'paid', 'void')),
  constraint io_invoices_amounts_check check (
    provider_cost_nanos >= 0
    and service_fee_nanos >= 0
    and subtotal_nanos = provider_cost_nanos + service_fee_nanos
    and credit_applied_nanos between 0 and subtotal_nanos
    and tax_nanos >= 0
    and total_nanos = subtotal_nanos + tax_nanos
    and amount_due_nanos = total_nanos - credit_applied_nanos
  ),
  constraint io_invoices_tax_status_check check (
    tax_status in ('not_assessed', 'not_applicable', 'assessed')
  ),
  constraint io_invoices_buyer_snapshot_check check (jsonb_typeof(buyer_snapshot) = 'object'),
  constraint io_invoices_tax_evidence_check check (
    tax_evidence_url is null or tax_evidence_url ~ '^https://'
  ),
  constraint io_invoices_lifecycle_check check (
    (state = 'draft' and issued_at is null and due_at is null and voided_at is null)
    or (state in ('issued', 'paid') and issued_at is not null and due_at is not null and voided_at is null)
    or (state = 'void' and voided_at is not null)
  )
);

create index io_invoices_workspace_time_idx
  on public.io_invoices (workspace_id, created_at desc, id desc);
create index io_invoices_workspace_state_idx
  on public.io_invoices (workspace_id, state, period_end desc);

create table public.io_invoice_lines (
  id bigint generated always as identity primary key,
  invoice_id uuid not null references public.io_invoices(id) on delete restrict,
  usage_record_id uuid not null unique references public.io_usage_records(id) on delete restrict,
  receipt_id uuid not null unique references public.io_route_receipts(id) on delete restrict,
  provider_key text not null,
  model_key text not null,
  provider_cost_nanos bigint not null,
  service_fee_nanos bigint not null,
  customer_charge_nanos bigint not null,
  credit_applied_nanos bigint not null,
  amount_due_nanos bigint not null,
  input_tokens integer,
  output_tokens integer,
  usage_recorded_at timestamptz not null,
  constraint io_invoice_lines_amounts_check check (
    provider_cost_nanos >= 0
    and service_fee_nanos >= 0
    and customer_charge_nanos = provider_cost_nanos + service_fee_nanos
    and credit_applied_nanos between 0 and customer_charge_nanos
    and amount_due_nanos = customer_charge_nanos - credit_applied_nanos
  ),
  constraint io_invoice_lines_tokens_check check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
  )
);

create index io_invoice_lines_invoice_idx on public.io_invoice_lines (invoice_id, id);

create sequence private.io_invoice_number_sequence;
revoke all on sequence private.io_invoice_number_sequence from public, anon, authenticated;
grant usage, select on sequence private.io_invoice_number_sequence to service_role;

alter table public.io_credit_accounts enable row level security;
alter table public.io_credit_entries enable row level security;
alter table public.io_invoices enable row level security;
alter table public.io_invoice_lines enable row level security;

revoke all on public.io_credit_accounts, public.io_credit_entries,
  public.io_invoices, public.io_invoice_lines
from public, anon, authenticated;
grant select, insert, update on public.io_credit_accounts to service_role;
grant select, insert on public.io_credit_entries to service_role;
grant select, insert, update on public.io_invoices to service_role;
grant select, insert on public.io_invoice_lines to service_role;

create trigger io_credit_accounts_set_updated_at
before update on public.io_credit_accounts
for each row execute function public.update_updated_at_column();

create or replace function private.io_apply_available_credit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  account_row public.io_credit_accounts%rowtype;
  available_nanos bigint := 0;
  applied_nanos bigint := 0;
begin
  if new.customer_charge_nanos is null then
    new.credit_applied_nanos := 0;
    new.amount_due_nanos := 0;
    return new;
  end if;

  if old.customer_charge_nanos is not null then
    if new.customer_charge_nanos <> old.customer_charge_nanos then
      raise exception 'Settled customer charge is immutable';
    end if;
    new.credit_applied_nanos := old.credit_applied_nanos;
    new.amount_due_nanos := old.amount_due_nanos;
    return new;
  end if;

  select account.* into account_row
  from public.io_credit_accounts as account
  where account.workspace_id = new.workspace_id
    and account.currency_code = new.currency_code
    and account.status = 'active'
  for update;

  if found then
    select greatest(coalesce(sum(entry.amount_nanos), 0), 0)::bigint
    into available_nanos
    from public.io_credit_entries as entry
    where entry.account_id = account_row.id;
    applied_nanos := least(available_nanos, new.customer_charge_nanos);
  end if;

  new.credit_applied_nanos := applied_nanos;
  new.amount_due_nanos := new.customer_charge_nanos - applied_nanos;

  if applied_nanos > 0 then
    insert into public.io_credit_entries (
      account_id,
      entry_kind,
      amount_nanos,
      usage_record_id,
      external_reference,
      reason
    ) values (
      account_row.id,
      'usage_application',
      -applied_nanos,
      new.id,
      'usage:' || new.id::text,
      'Credit automatically applied to one settled I/O usage record.'
    );
  end if;

  return new;
end;
$function$;

revoke all on function private.io_apply_available_credit()
  from public, anon, authenticated;

create trigger io_usage_records_apply_available_credit
before update of customer_charge_nanos on public.io_usage_records
for each row execute function private.io_apply_available_credit();

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
      usage.provider_cost_nanos,
      usage.service_fee_nanos,
      usage.customer_charge_nanos,
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
        'providerCostNanos', row.provider_cost_nanos::text,
        'serviceFeeNanos', row.service_fee_nanos::text,
        'customerChargeNanos', row.customer_charge_nanos::text,
        'creditAppliedNanos', coalesce(row.credit_applied_nanos, 0)::text,
        'amountDueNanos', coalesce(row.amount_due_nanos, row.customer_charge_nanos, 0)::text,
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

create or replace function public.get_my_io_billing_summary(_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not private.io_workspace_has_role(_workspace_id, null) then
    raise exception 'Active workspace membership required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'credits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'accountId', account.id,
        'currencyCode', account.currency_code,
        'status', account.status,
        'balanceNanos', coalesce(balance.amount_nanos, 0)::text
      ) order by account.currency_code)
      from public.io_credit_accounts as account
      left join lateral (
        select sum(entry.amount_nanos)::bigint as amount_nanos
        from public.io_credit_entries as entry where entry.account_id = account.id
      ) as balance on true
      where account.workspace_id = _workspace_id
    ), '[]'::jsonb),
    'unbilled', coalesce((
      select jsonb_agg(jsonb_build_object(
        'currencyCode', totals.currency_code,
        'customerChargeNanos', totals.customer_charge_nanos::text,
        'creditAppliedNanos', totals.credit_applied_nanos::text,
        'amountDueNanos', totals.amount_due_nanos::text,
        'usageCount', totals.usage_count
      ) order by totals.currency_code)
      from (
        select
          usage.currency_code,
          sum(coalesce(usage.customer_charge_nanos, 0))::bigint as customer_charge_nanos,
          sum(usage.credit_applied_nanos)::bigint as credit_applied_nanos,
          sum(usage.amount_due_nanos)::bigint as amount_due_nanos,
          count(*)::integer as usage_count
        from public.io_usage_records as usage
        left join public.io_invoice_lines as line on line.usage_record_id = usage.id
        where usage.workspace_id = _workspace_id and line.id is null
        group by usage.currency_code
      ) as totals
    ), '[]'::jsonb),
    'invoiceCounts', jsonb_build_object(
      'draft', (select count(*) from public.io_invoices where workspace_id = _workspace_id and state = 'draft'),
      'issued', (select count(*) from public.io_invoices where workspace_id = _workspace_id and state = 'issued'),
      'paid', (select count(*) from public.io_invoices where workspace_id = _workspace_id and state = 'paid')
    )
  );
end;
$function$;

revoke all on function public.get_my_io_billing_summary(uuid) from public, anon;
grant execute on function public.get_my_io_billing_summary(uuid) to authenticated, service_role;

create or replace function public.list_my_io_credit_entries(
  _workspace_id uuid,
  _limit integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not private.io_workspace_has_role(_workspace_id, null) then
    raise exception 'Active workspace membership required' using errcode = '42501';
  end if;
  if _limit not between 1 and 100 then raise exception 'Credit history limit is invalid'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', entry.id,
      'currencyCode', account.currency_code,
      'kind', entry.entry_kind,
      'amountNanos', entry.amount_nanos::text,
      'reason', entry.reason,
      'postedAt', entry.posted_at
    ) order by entry.posted_at desc, entry.id desc)
    from (
      select source.* from public.io_credit_entries as source
      join public.io_credit_accounts as account_filter on account_filter.id = source.account_id
      where account_filter.workspace_id = _workspace_id
      order by source.posted_at desc, source.id desc limit _limit
    ) as entry
    join public.io_credit_accounts as account on account.id = entry.account_id
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.list_my_io_credit_entries(uuid, integer) from public, anon;
grant execute on function public.list_my_io_credit_entries(uuid, integer)
  to authenticated, service_role;

create or replace function public.list_my_io_invoices(
  _workspace_id uuid,
  _limit integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not private.io_workspace_has_role(_workspace_id, null) then
    raise exception 'Active workspace membership required' using errcode = '42501';
  end if;
  if _limit not between 1 and 100 then raise exception 'Invoice history limit is invalid'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', invoice.id,
      'invoiceNumber', invoice.invoice_number,
      'currencyCode', invoice.currency_code,
      'periodStart', invoice.period_start,
      'periodEnd', invoice.period_end,
      'state', invoice.state,
      'providerCostNanos', invoice.provider_cost_nanos::text,
      'serviceFeeNanos', invoice.service_fee_nanos::text,
      'subtotalNanos', invoice.subtotal_nanos::text,
      'creditAppliedNanos', invoice.credit_applied_nanos::text,
      'taxNanos', invoice.tax_nanos::text,
      'totalNanos', invoice.total_nanos::text,
      'amountDueNanos', invoice.amount_due_nanos::text,
      'taxStatus', invoice.tax_status,
      'createdAt', invoice.created_at,
      'issuedAt', invoice.issued_at,
      'dueAt', invoice.due_at,
      'lineCount', (select count(*) from public.io_invoice_lines as line where line.invoice_id = invoice.id)
    ) order by invoice.created_at desc, invoice.id desc)
    from (
      select source.* from public.io_invoices as source
      where source.workspace_id = _workspace_id
        and (
          source.state <> 'draft'
          or private.io_workspace_has_role(_workspace_id, array['owner', 'admin'])
        )
      order by source.created_at desc, source.id desc limit _limit
    ) as invoice
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.list_my_io_invoices(uuid, integer) from public, anon;
grant execute on function public.list_my_io_invoices(uuid, integer)
  to authenticated, service_role;

create or replace function public.admin_io_post_credit(
  _workspace_id uuid,
  _currency_code text,
  _amount_nanos bigint,
  _entry_kind text,
  _external_reference text,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  account_row public.io_credit_accounts%rowtype;
  entry_row public.io_credit_entries%rowtype;
  normalized_currency text := upper(btrim(coalesce(_currency_code, '')));
begin
  if not private.has_admin_capability(caller_id, 'io.manage') then
    raise exception 'I/O management access required' using errcode = '42501';
  end if;
  if normalized_currency !~ '^[A-Z]{3}$' or _amount_nanos is null or _amount_nanos <= 0 then
    raise exception 'Credit currency or amount is invalid';
  end if;
  if _entry_kind not in ('promotional_grant', 'sponsored_grant', 'manual_grant', 'refund', 'reversal') then
    raise exception 'Credit entry kind is invalid';
  end if;
  if _external_reference is null
    or char_length(_external_reference) not between 8 and 160
    or _external_reference !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]+$' then
    raise exception 'Credit external reference is invalid';
  end if;
  if char_length(btrim(coalesce(_reason, ''))) not between 8 and 500 then
    raise exception 'Credit reason is invalid';
  end if;

  insert into public.io_credit_accounts (workspace_id, currency_code, created_by)
  values (_workspace_id, normalized_currency, caller_id)
  on conflict (workspace_id, currency_code) do update set updated_at = now()
  returning * into account_row;
  if account_row.status <> 'active' then raise exception 'Credit account is not active'; end if;

  insert into public.io_credit_entries (
    account_id, entry_kind, amount_nanos, external_reference, reason, posted_by
  ) values (
    account_row.id, _entry_kind, _amount_nanos, _external_reference, btrim(_reason), caller_id
  )
  on conflict (account_id, external_reference) do nothing
  returning * into entry_row;

  if entry_row.id is null then
    select * into entry_row from public.io_credit_entries
    where account_id = account_row.id and external_reference = _external_reference;
    if entry_row.amount_nanos <> _amount_nanos or entry_row.entry_kind <> _entry_kind then
      raise exception 'Credit reference was already used differently';
    end if;
  end if;

  insert into public.io_audit_events (
    workspace_id, actor_kind, actor_user_id, event_type, payload
  )
  values (
    _workspace_id,
    'user',
    caller_id,
    'io.credit.posted',
    jsonb_build_object('currencyCode', normalized_currency, 'kind', _entry_kind)
  );

  return jsonb_build_object('ok', true, 'entryId', entry_row.id, 'accountId', account_row.id);
end;
$function$;

revoke all on function public.admin_io_post_credit(uuid, text, bigint, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_io_post_credit(uuid, text, bigint, text, text, text)
  to authenticated, service_role;

create or replace function public.admin_io_create_draft_invoice(
  _workspace_id uuid,
  _currency_code text,
  _period_start timestamptz,
  _period_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_currency text := upper(btrim(coalesce(_currency_code, '')));
  invoice_row public.io_invoices%rowtype;
  provider_total bigint;
  fee_total bigint;
  charge_total bigint;
  credit_total bigint;
  due_total bigint;
begin
  if not private.has_admin_capability(caller_id, 'io.manage') then
    raise exception 'I/O management access required' using errcode = '42501';
  end if;
  if normalized_currency !~ '^[A-Z]{3}$'
    or _period_start is null or _period_end is null
    or _period_end <= _period_start or _period_end > _period_start + interval '366 days' then
    raise exception 'Invoice period or currency is invalid';
  end if;

  select
    sum(usage.provider_cost_nanos)::bigint,
    sum(usage.service_fee_nanos)::bigint,
    sum(usage.customer_charge_nanos)::bigint,
    sum(usage.credit_applied_nanos)::bigint,
    sum(usage.amount_due_nanos)::bigint
  into provider_total, fee_total, charge_total, credit_total, due_total
  from public.io_usage_records as usage
  left join public.io_invoice_lines as existing on existing.usage_record_id = usage.id
  where usage.workspace_id = _workspace_id
    and usage.currency_code = normalized_currency
    and usage.recorded_at >= _period_start and usage.recorded_at < _period_end
    and usage.customer_charge_nanos is not null
    and existing.id is null;

  if charge_total is null then raise exception 'No uninvoiced usage exists for this period'; end if;

  insert into public.io_invoices (
    workspace_id, invoice_number, currency_code, period_start, period_end,
    provider_cost_nanos, service_fee_nanos, subtotal_nanos, credit_applied_nanos,
    total_nanos, amount_due_nanos, created_by
  ) values (
    _workspace_id,
    'IO-' || to_char(statement_timestamp(), 'YYYYMM') || '-' ||
      lpad(nextval('private.io_invoice_number_sequence')::text, 6, '0'),
    normalized_currency, _period_start, _period_end,
    provider_total, fee_total, charge_total, credit_total, charge_total, due_total, caller_id
  ) returning * into invoice_row;

  insert into public.io_invoice_lines (
    invoice_id, usage_record_id, receipt_id, provider_key, model_key,
    provider_cost_nanos, service_fee_nanos, customer_charge_nanos,
    credit_applied_nanos, amount_due_nanos, input_tokens, output_tokens, usage_recorded_at
  )
  select
    invoice_row.id, usage.id, usage.receipt_id,
    receipt.selected_provider_key, receipt.selected_model_key,
    usage.provider_cost_nanos, usage.service_fee_nanos, usage.customer_charge_nanos,
    usage.credit_applied_nanos, usage.amount_due_nanos,
    usage.input_tokens, usage.output_tokens, usage.recorded_at
  from public.io_usage_records as usage
  join public.io_route_receipts as receipt on receipt.id = usage.receipt_id
  left join public.io_invoice_lines as existing on existing.usage_record_id = usage.id
  where usage.workspace_id = _workspace_id
    and usage.currency_code = normalized_currency
    and usage.recorded_at >= _period_start and usage.recorded_at < _period_end
    and usage.customer_charge_nanos is not null
    and existing.id is null;

  insert into public.io_audit_events (
    workspace_id, actor_kind, actor_user_id, event_type, payload
  )
  values (
    _workspace_id,
    'user',
    caller_id,
    'io.invoice.draft_created',
    jsonb_build_object('invoiceId', invoice_row.id, 'currencyCode', normalized_currency)
  );

  return jsonb_build_object('ok', true, 'invoiceId', invoice_row.id, 'invoiceNumber', invoice_row.invoice_number, 'state', invoice_row.state);
end;
$function$;

revoke all on function public.admin_io_create_draft_invoice(uuid, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_io_create_draft_invoice(uuid, text, timestamptz, timestamptz)
  to authenticated, service_role;

comment on table public.io_credit_accounts is
  'Currency-specific workspace credit accounts. Credits offset settled usage and never authorize provider dispatch.';
comment on table public.io_credit_entries is
  'Append-only exact-nano credit ledger. Browser roles have no direct table access.';
comment on table public.io_invoices is
  'Immutable-by-convention invoice snapshots. Drafts are not tax documents and require operator issuance.';
comment on function public.list_my_io_usage_history(uuid, integer, timestamptz, uuid, text, text, text, timestamptz, timestamptz) is
  'Caller-bound, keyset-paged and filterable route/usage history with exact fee and credit evidence.';
