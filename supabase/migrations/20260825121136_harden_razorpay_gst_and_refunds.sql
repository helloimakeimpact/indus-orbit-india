-- Razorpay, Indian GST and FX settlement hardening.
-- Financial authority remains fail-closed: this migration does not approve a
-- tax policy, FX rate or payment processor and does not create live money data.

alter table public.io_payment_intents
  add column provider_receipt text,
  add column checkout_payment_id text,
  add column checkout_signature_sha256 text,
  add column checkout_verified_at timestamptz,
  add constraint io_payment_intents_receipt_check check (
    provider_receipt is null or char_length(provider_receipt) between 4 and 40
  ),
  add constraint io_payment_intents_checkout_check check (
    (checkout_payment_id is null and checkout_signature_sha256 is null and checkout_verified_at is null)
    or (
      char_length(checkout_payment_id) between 4 and 160
      and checkout_signature_sha256 ~ '^[a-f0-9]{64}$'
      and checkout_verified_at is not null
    )
  );

create unique index io_payment_intents_provider_receipt_key
  on public.io_payment_intents (provider_key, environment, provider_receipt)
  where provider_receipt is not null;

create unique index io_payment_intents_one_open_per_invoice
  on public.io_payment_intents (invoice_id)
  where state in ('created', 'order_created');

alter table private.io_payment_events
  add column environment text not null default 'live',
  add constraint io_payment_events_environment_check check (environment in ('test', 'live'));

alter table private.io_payment_events alter column environment drop default;

create unique index io_payment_events_one_capture_per_payment
  on private.io_payment_events (provider_key, environment, external_payment_id)
  where event_type = 'payment.captured' and external_payment_id is not null;

create unique index io_payment_events_one_processed_per_refund
  on private.io_payment_events (provider_key, environment, external_refund_id)
  where event_type = 'refund.processed' and external_refund_id is not null;

alter table public.io_invoices
  drop constraint io_invoices_tax_status_check,
  add constraint io_invoices_tax_status_check check (
    tax_status in ('not_assessed', 'not_applicable', 'assessed', 'zero_rated', 'exempt')
  ),
  add column source_currency_code text,
  add column fx_rate_version_id uuid references public.io_fx_rate_versions(id) on delete restrict,
  add column fx_rate_numerator bigint,
  add column fx_rate_denominator bigint,
  add column fx_evidence_url text,
  add column source_provider_cost_nanos bigint,
  add column source_service_fee_nanos bigint,
  add column source_subtotal_nanos bigint,
  add column source_credit_applied_nanos bigint,
  add column source_amount_due_nanos bigint,
  add constraint io_invoices_fx_snapshot_check check (
    (
      source_currency_code is null and fx_rate_version_id is null
      and fx_rate_numerator is null and fx_rate_denominator is null
      and fx_evidence_url is null and source_provider_cost_nanos is null
      and source_service_fee_nanos is null and source_subtotal_nanos is null
      and source_credit_applied_nanos is null and source_amount_due_nanos is null
    )
    or (
      source_currency_code ~ '^[A-Z]{3}$' and source_currency_code <> currency_code
      and fx_rate_version_id is not null and fx_rate_numerator > 0 and fx_rate_denominator > 0
      and fx_evidence_url ~ '^https://'
      and source_provider_cost_nanos >= 0 and source_service_fee_nanos >= 0
      and source_subtotal_nanos = source_provider_cost_nanos + source_service_fee_nanos
      and source_credit_applied_nanos between 0 and source_subtotal_nanos
      and source_amount_due_nanos = source_subtotal_nanos - source_credit_applied_nanos
    )
  );

create index io_invoices_fx_rate_version_idx
  on public.io_invoices (fx_rate_version_id)
  where fx_rate_version_id is not null;

alter table public.io_invoice_lines
  add column source_currency_code text,
  add column source_provider_cost_nanos bigint,
  add column source_service_fee_nanos bigint,
  add column source_customer_charge_nanos bigint,
  add column source_credit_applied_nanos bigint,
  add column source_amount_due_nanos bigint,
  add constraint io_invoice_lines_fx_snapshot_check check (
    (
      source_currency_code is null and source_provider_cost_nanos is null
      and source_service_fee_nanos is null and source_customer_charge_nanos is null
      and source_credit_applied_nanos is null and source_amount_due_nanos is null
    )
    or (
      source_currency_code ~ '^[A-Z]{3}$'
      and source_provider_cost_nanos >= 0 and source_service_fee_nanos >= 0
      and source_customer_charge_nanos = source_provider_cost_nanos + source_service_fee_nanos
      and source_credit_applied_nanos between 0 and source_customer_charge_nanos
      and source_amount_due_nanos = source_customer_charge_nanos - source_credit_applied_nanos
    )
  );

create or replace function private.io_convert_nanos(
  _amount_nanos bigint,
  _rate_numerator bigint,
  _rate_denominator bigint
)
returns bigint
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $function$
begin
  if _amount_nanos < 0 or _rate_numerator <= 0 or _rate_denominator <= 0 then
    raise exception 'FX conversion inputs are invalid';
  end if;
  return floor(
    (_amount_nanos::numeric * _rate_numerator::numeric + _rate_denominator::numeric / 2)
    / _rate_denominator::numeric
  )::bigint;
end;
$function$;

revoke all on function private.io_convert_nanos(bigint, bigint, bigint)
  from public, anon, authenticated;
grant execute on function private.io_convert_nanos(bigint, bigint, bigint)
  to service_role;

create or replace function public.admin_io_create_fx_draft_invoice(
  _workspace_id uuid,
  _source_currency_code text,
  _settlement_currency_code text,
  _fx_rate_version_id uuid,
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
  source_currency text := upper(btrim(coalesce(_source_currency_code, '')));
  settlement_currency text := upper(btrim(coalesce(_settlement_currency_code, '')));
  normalized_reason text := btrim(coalesce(_reason, ''));
  rate_row public.io_fx_rate_versions%rowtype;
  invoice_row public.io_invoices%rowtype;
  provider_total bigint;
  fee_total bigint;
  charge_total bigint;
  credit_total bigint;
  due_total bigint;
  source_provider_total bigint;
  source_fee_total bigint;
  source_charge_total bigint;
  source_credit_total bigint;
  source_due_total bigint;
begin
  if not private.has_admin_capability(caller_id, 'billing.manage') then
    raise exception 'Billing management access required' using errcode = '42501';
  end if;
  if source_currency !~ '^[A-Z]{3}$' or settlement_currency !~ '^[A-Z]{3}$'
    or source_currency = settlement_currency
    or _period_start is null or _period_end is null or _period_end <= _period_start
    or _period_end > _period_start + interval '366 days'
    or char_length(normalized_reason) not between 8 and 500 then
    raise exception 'FX invoice request is invalid';
  end if;

  select * into rate_row
  from public.io_fx_rate_versions
  where id = _fx_rate_version_id
  for update;
  if not found or rate_row.status <> 'approved'
    or rate_row.base_currency_code <> source_currency
    or rate_row.quote_currency_code <> settlement_currency
    or rate_row.effective_from > statement_timestamp()
    or rate_row.effective_until <= statement_timestamp() then
    raise exception 'An active approved FX rate matching both currencies is required';
  end if;

  select
    sum(private.io_convert_nanos(usage.provider_cost_nanos, rate_row.rate_numerator, rate_row.rate_denominator))::bigint,
    sum(private.io_convert_nanos(usage.service_fee_nanos, rate_row.rate_numerator, rate_row.rate_denominator))::bigint,
    sum(private.io_convert_nanos(usage.provider_cost_nanos, rate_row.rate_numerator, rate_row.rate_denominator)
      + private.io_convert_nanos(usage.service_fee_nanos, rate_row.rate_numerator, rate_row.rate_denominator))::bigint,
    sum(least(
      private.io_convert_nanos(usage.credit_applied_nanos, rate_row.rate_numerator, rate_row.rate_denominator),
      private.io_convert_nanos(usage.provider_cost_nanos, rate_row.rate_numerator, rate_row.rate_denominator)
        + private.io_convert_nanos(usage.service_fee_nanos, rate_row.rate_numerator, rate_row.rate_denominator)
    ))::bigint,
    sum((private.io_convert_nanos(usage.provider_cost_nanos, rate_row.rate_numerator, rate_row.rate_denominator)
      + private.io_convert_nanos(usage.service_fee_nanos, rate_row.rate_numerator, rate_row.rate_denominator))
      - least(
        private.io_convert_nanos(usage.credit_applied_nanos, rate_row.rate_numerator, rate_row.rate_denominator),
        private.io_convert_nanos(usage.provider_cost_nanos, rate_row.rate_numerator, rate_row.rate_denominator)
          + private.io_convert_nanos(usage.service_fee_nanos, rate_row.rate_numerator, rate_row.rate_denominator)
      ))::bigint,
    sum(usage.provider_cost_nanos)::bigint,
    sum(usage.service_fee_nanos)::bigint,
    sum(usage.customer_charge_nanos)::bigint,
    sum(usage.credit_applied_nanos)::bigint,
    sum(usage.amount_due_nanos)::bigint
  into provider_total, fee_total, charge_total, credit_total, due_total,
    source_provider_total, source_fee_total, source_charge_total, source_credit_total, source_due_total
  from public.io_usage_records as usage
  left join public.io_invoice_lines as existing on existing.usage_record_id = usage.id
  where usage.workspace_id = _workspace_id
    and usage.currency_code = source_currency
    and usage.recorded_at >= _period_start and usage.recorded_at < _period_end
    and usage.customer_charge_nanos is not null
    and existing.id is null;

  if charge_total is null then
    raise exception 'No uninvoiced usage exists for this period and source currency';
  end if;

  insert into public.io_invoices (
    workspace_id, invoice_number, currency_code, period_start, period_end,
    provider_cost_nanos, service_fee_nanos, subtotal_nanos, credit_applied_nanos,
    total_nanos, amount_due_nanos, created_by,
    source_currency_code, fx_rate_version_id, fx_rate_numerator, fx_rate_denominator,
    fx_evidence_url, source_provider_cost_nanos, source_service_fee_nanos,
    source_subtotal_nanos, source_credit_applied_nanos, source_amount_due_nanos
  ) values (
    _workspace_id,
    'IO-' || to_char(statement_timestamp(), 'YYYYMM') || '-'
      || lpad(nextval('private.io_invoice_number_sequence')::text, 6, '0'),
    settlement_currency, _period_start, _period_end,
    provider_total, fee_total, charge_total, credit_total, charge_total, due_total, caller_id,
    source_currency, rate_row.id, rate_row.rate_numerator, rate_row.rate_denominator,
    rate_row.evidence_url, source_provider_total, source_fee_total,
    source_charge_total, source_credit_total, source_due_total
  ) returning * into invoice_row;

  insert into public.io_invoice_lines (
    invoice_id, usage_record_id, receipt_id, provider_key, model_key,
    provider_cost_nanos, service_fee_nanos, customer_charge_nanos,
    credit_applied_nanos, amount_due_nanos, input_tokens, output_tokens, usage_recorded_at,
    source_currency_code, source_provider_cost_nanos, source_service_fee_nanos,
    source_customer_charge_nanos, source_credit_applied_nanos, source_amount_due_nanos
  )
  select
    invoice_row.id, usage.id, usage.receipt_id,
    receipt.selected_provider_key, receipt.selected_model_key,
    private.io_convert_nanos(usage.provider_cost_nanos, rate_row.rate_numerator, rate_row.rate_denominator),
    private.io_convert_nanos(usage.service_fee_nanos, rate_row.rate_numerator, rate_row.rate_denominator),
    private.io_convert_nanos(usage.provider_cost_nanos, rate_row.rate_numerator, rate_row.rate_denominator)
      + private.io_convert_nanos(usage.service_fee_nanos, rate_row.rate_numerator, rate_row.rate_denominator),
    least(
      private.io_convert_nanos(usage.credit_applied_nanos, rate_row.rate_numerator, rate_row.rate_denominator),
      private.io_convert_nanos(usage.provider_cost_nanos, rate_row.rate_numerator, rate_row.rate_denominator)
        + private.io_convert_nanos(usage.service_fee_nanos, rate_row.rate_numerator, rate_row.rate_denominator)
    ),
    (private.io_convert_nanos(usage.provider_cost_nanos, rate_row.rate_numerator, rate_row.rate_denominator)
      + private.io_convert_nanos(usage.service_fee_nanos, rate_row.rate_numerator, rate_row.rate_denominator))
      - least(
        private.io_convert_nanos(usage.credit_applied_nanos, rate_row.rate_numerator, rate_row.rate_denominator),
        private.io_convert_nanos(usage.provider_cost_nanos, rate_row.rate_numerator, rate_row.rate_denominator)
          + private.io_convert_nanos(usage.service_fee_nanos, rate_row.rate_numerator, rate_row.rate_denominator)
      ),
    usage.input_tokens, usage.output_tokens, usage.recorded_at,
    source_currency, usage.provider_cost_nanos, usage.service_fee_nanos,
    usage.customer_charge_nanos, usage.credit_applied_nanos, usage.amount_due_nanos
  from public.io_usage_records as usage
  join public.io_route_receipts as receipt on receipt.id = usage.receipt_id
  left join public.io_invoice_lines as existing on existing.usage_record_id = usage.id
  where usage.workspace_id = _workspace_id
    and usage.currency_code = source_currency
    and usage.recorded_at >= _period_start and usage.recorded_at < _period_end
    and usage.customer_charge_nanos is not null
    and existing.id is null;

  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.manage', 'billing', 'invoice.fx_draft_created',
    'invoice', invoice_row.id, normalized_reason,
    jsonb_build_object(
      'sourceCurrency', source_currency,
      'settlementCurrency', settlement_currency,
      'fxRateVersionId', rate_row.id,
      'rateNumerator', rate_row.rate_numerator::text,
      'rateDenominator', rate_row.rate_denominator::text
    )
  );

  return jsonb_build_object(
    'ok', true,
    'invoiceId', invoice_row.id,
    'invoiceNumber', invoice_row.invoice_number,
    'state', invoice_row.state,
    'sourceCurrency', source_currency,
    'settlementCurrency', settlement_currency,
    'fxRateVersionId', rate_row.id
  );
end;
$function$;

revoke all on function public.admin_io_create_fx_draft_invoice(
  uuid, text, text, uuid, timestamptz, timestamptz, text
) from public, anon;
grant execute on function public.admin_io_create_fx_draft_invoice(
  uuid, text, text, uuid, timestamptz, timestamptz, text
) to authenticated, service_role;

create or replace function public.create_my_io_payment_intent(
  _invoice_id uuid,
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  invoice_row public.io_invoices%rowtype;
  config_row private.io_payment_processor_configs%rowtype;
  existing public.io_payment_intents%rowtype;
  intent_row public.io_payment_intents%rowtype;
  nanos_per_minor bigint;
  outstanding_nanos bigint;
begin
  if caller_id is null or _client_request_id is null then
    raise exception 'Authentication and client request ID are required' using errcode = '42501';
  end if;
  select * into invoice_row from public.io_invoices where id = _invoice_id for update;
  if not found or not private.io_workspace_has_role(invoice_row.workspace_id, null) then
    raise exception 'Invoice access required' using errcode = '42501';
  end if;
  if invoice_row.state not in ('issued', 'paid')
    or invoice_row.payment_state not in ('due', 'partially_paid') then
    raise exception 'Invoice is not payable';
  end if;
  select * into existing from public.io_payment_intents
  where workspace_id = invoice_row.workspace_id
    and created_by = caller_id and client_request_id = _client_request_id;
  if found then
    if existing.invoice_id <> invoice_row.id then
      raise exception 'Client request ID was already used for another invoice';
    end if;
    return jsonb_build_object(
      'ok', true, 'replayed', true, 'paymentIntentId', existing.id,
      'state', existing.state, 'provider', existing.provider_key,
      'environment', existing.environment, 'amountMinor', existing.amount_minor,
      'currencyCode', existing.currency_code
    );
  end if;

  update public.io_payment_intents
  set state = 'cancelled', failure_code = 'checkout_expired', updated_at = now()
  where invoice_id = invoice_row.id
    and state in ('created', 'order_created') and expires_at <= now();

  if exists (
    select 1 from public.io_payment_intents
    where invoice_id = invoice_row.id and state in ('created', 'order_created')
  ) then
    raise exception 'This invoice already has an active checkout';
  end if;

  select * into config_row from private.io_payment_processor_configs
  where status = 'approved' and environment = 'live'
    and invoice_row.currency_code = any(currency_codes)
  order by approved_at desc limit 1;
  if not found then
    raise exception 'No approved live payment processor supports this currency';
  end if;
  nanos_per_minor := private.io_currency_nanos_per_minor(invoice_row.currency_code);
  outstanding_nanos := invoice_row.amount_due_nanos - invoice_row.paid_nanos;
  if nanos_per_minor is null or outstanding_nanos <= 0
    or outstanding_nanos % nanos_per_minor <> 0 then
    raise exception 'Invoice amount is not payable in exact minor units';
  end if;
  insert into public.io_payment_intents (
    workspace_id, invoice_id, processor_config_id, provider_key, environment,
    currency_code, amount_nanos, amount_minor, client_request_id, created_by, expires_at
  ) values (
    invoice_row.workspace_id, invoice_row.id, config_row.id, config_row.provider_key,
    config_row.environment, invoice_row.currency_code, outstanding_nanos,
    outstanding_nanos / nanos_per_minor, _client_request_id, caller_id, now() + interval '30 minutes'
  ) returning * into intent_row;
  return jsonb_build_object(
    'ok', true, 'replayed', false, 'paymentIntentId', intent_row.id,
    'state', intent_row.state, 'provider', intent_row.provider_key,
    'environment', intent_row.environment, 'amountMinor', intent_row.amount_minor,
    'currencyCode', intent_row.currency_code, 'invoiceNumber', invoice_row.invoice_number
  );
end;
$function$;

create or replace function public.record_io_payment_order(
  _payment_intent_id uuid,
  _external_order_id text,
  _provider_receipt text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare intent_row public.io_payment_intents%rowtype;
begin
  if current_user <> 'service_role' then
    raise exception 'Payment service role required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(_external_order_id, ''))) not between 4 and 160
    or char_length(btrim(coalesce(_provider_receipt, ''))) not between 4 and 40 then
    raise exception 'Payment order evidence is invalid';
  end if;
  select * into intent_row from public.io_payment_intents where id = _payment_intent_id for update;
  if not found then raise exception 'Payment intent does not exist'; end if;
  if intent_row.external_order_id is not null then
    if intent_row.external_order_id <> _external_order_id
      or intent_row.provider_receipt <> _provider_receipt then
      raise exception 'Payment order was already recorded differently';
    end if;
    return jsonb_build_object('ok', true, 'replayed', true, 'state', intent_row.state);
  end if;
  if intent_row.state <> 'created' or intent_row.expires_at <= now() then
    raise exception 'Payment intent is no longer orderable';
  end if;
  update public.io_payment_intents
  set external_order_id = btrim(_external_order_id), provider_receipt = btrim(_provider_receipt),
      state = 'order_created', updated_at = now()
  where id = _payment_intent_id returning * into intent_row;
  return jsonb_build_object('ok', true, 'replayed', false, 'state', intent_row.state);
end;
$function$;

drop function if exists public.record_io_payment_order(uuid, text);
revoke all on function public.record_io_payment_order(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_io_payment_order(uuid, text, text) to service_role;

create or replace function public.get_my_io_payment_verification_context(_payment_intent_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  intent_row public.io_payment_intents%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into intent_row from public.io_payment_intents where id = _payment_intent_id;
  if not found or intent_row.created_by <> caller_id
    or not private.io_workspace_has_role(intent_row.workspace_id, null) then
    raise exception 'Payment verification access required' using errcode = '42501';
  end if;
  if intent_row.external_order_id is null or intent_row.state not in ('order_created', 'captured') then
    raise exception 'Payment order is not verifiable';
  end if;
  return jsonb_build_object(
    'paymentIntentId', intent_row.id,
    'provider', intent_row.provider_key,
    'environment', intent_row.environment,
    'orderId', intent_row.external_order_id,
    'state', intent_row.state,
    'checkoutPaymentId', intent_row.checkout_payment_id,
    'checkoutVerifiedAt', intent_row.checkout_verified_at
  );
end;
$function$;

revoke all on function public.get_my_io_payment_verification_context(uuid) from public, anon;
grant execute on function public.get_my_io_payment_verification_context(uuid)
  to authenticated, service_role;

create or replace function public.record_io_checkout_verification(
  _payment_intent_id uuid,
  _external_order_id text,
  _checkout_payment_id text,
  _signature_sha256 text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare intent_row public.io_payment_intents%rowtype;
begin
  if current_user <> 'service_role' then
    raise exception 'Payment service role required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(_checkout_payment_id, ''))) not between 4 and 160
    or _signature_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'Checkout verification evidence is invalid';
  end if;
  select * into intent_row from public.io_payment_intents where id = _payment_intent_id for update;
  if not found or intent_row.external_order_id <> _external_order_id
    or intent_row.state not in ('order_created', 'captured') then
    raise exception 'Checkout does not match an active payment order';
  end if;
  if intent_row.checkout_payment_id is not null then
    if intent_row.checkout_payment_id <> _checkout_payment_id
      or intent_row.checkout_signature_sha256 <> _signature_sha256 then
      raise exception 'Checkout was already verified differently';
    end if;
    return jsonb_build_object('ok', true, 'replayed', true, 'state', intent_row.state);
  end if;
  if intent_row.external_payment_id is not null
    and intent_row.external_payment_id <> _checkout_payment_id then
    raise exception 'Checkout payment does not match the captured payment';
  end if;
  update public.io_payment_intents
  set checkout_payment_id = btrim(_checkout_payment_id),
      checkout_signature_sha256 = _signature_sha256,
      checkout_verified_at = now(), updated_at = now()
  where id = intent_row.id;
  return jsonb_build_object('ok', true, 'replayed', false, 'state', intent_row.state);
end;
$function$;

revoke all on function public.record_io_checkout_verification(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_io_checkout_verification(uuid, text, text, text)
  to service_role;

drop function if exists public.record_io_payment_provider_event(
  text, text, text, text, text, text, bigint, text, text, timestamptz
);

create or replace function public.record_io_payment_provider_event(
  _provider_key text,
  _environment text,
  _provider_event_id text,
  _event_type text,
  _external_order_id text,
  _external_payment_id text,
  _external_refund_id text,
  _amount_minor bigint,
  _currency_code text,
  _payload_sha256 text,
  _occurred_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  intent_row public.io_payment_intents%rowtype;
  invoice_row public.io_invoices%rowtype;
  refund_row public.io_refunds%rowtype;
  inserted_event_id bigint;
  nanos_per_minor bigint;
  event_nanos bigint;
begin
  if current_user <> 'service_role' then
    raise exception 'Payment service role required' using errcode = '42501';
  end if;
  if _environment not in ('test', 'live') then
    raise exception 'Payment event environment is invalid';
  end if;
  if _occurred_at < now() - interval '7 days' or _occurred_at > now() + interval '5 minutes' then
    raise exception 'Payment event timestamp is invalid';
  end if;

  if nullif(btrim(coalesce(_external_order_id, '')), '') is not null then
    select * into intent_row from public.io_payment_intents
    where provider_key = _provider_key and environment = _environment
      and external_order_id = _external_order_id for update;
  elsif nullif(btrim(coalesce(_external_payment_id, '')), '') is not null then
    select * into intent_row from public.io_payment_intents
    where provider_key = _provider_key and environment = _environment
      and external_payment_id = _external_payment_id for update;
  else
    raise exception 'Payment event has no resolvable order or payment';
  end if;
  if not found then raise exception 'Payment order is unknown'; end if;
  if nullif(btrim(coalesce(_external_order_id, '')), '') is not null
    and intent_row.external_order_id <> _external_order_id then
    raise exception 'Payment event order does not match the payment';
  end if;

  insert into private.io_payment_events (
    provider_key, environment, provider_event_id, event_type, payment_intent_id,
    external_order_id, external_payment_id, external_refund_id,
    amount_minor, currency_code, payload_sha256, occurred_at
  ) values (
    _provider_key, _environment, _provider_event_id, _event_type, intent_row.id,
    nullif(_external_order_id, ''), nullif(_external_payment_id, ''),
    nullif(_external_refund_id, ''), _amount_minor, nullif(upper(_currency_code), ''),
    _payload_sha256, _occurred_at
  ) on conflict do nothing returning id into inserted_event_id;
  if inserted_event_id is null then
    return jsonb_build_object('ok', true, 'replayed', true);
  end if;

  nanos_per_minor := private.io_currency_nanos_per_minor(intent_row.currency_code);
  event_nanos := coalesce(_amount_minor, 0) * nanos_per_minor;
  if _event_type = 'payment.captured' then
    if upper(_currency_code) <> intent_row.currency_code
      or _amount_minor <> intent_row.amount_minor
      or nullif(_external_payment_id, '') is null then
      raise exception 'Captured payment does not match the intent';
    end if;
    if intent_row.checkout_payment_id is not null
      and intent_row.checkout_payment_id <> _external_payment_id then
      raise exception 'Captured payment does not match the verified checkout';
    end if;
    update public.io_payment_intents
    set state = 'captured', external_payment_id = _external_payment_id,
        captured_at = _occurred_at, updated_at = now()
    where id = intent_row.id and state <> 'captured';
    select * into invoice_row from public.io_invoices where id = intent_row.invoice_id for update;
    if invoice_row.paid_nanos + event_nanos > invoice_row.amount_due_nanos then
      raise exception 'Captured payment would overpay the invoice';
    end if;
    update public.io_invoices
    set paid_nanos = paid_nanos + event_nanos,
        payment_state = case
          when paid_nanos + event_nanos >= amount_due_nanos then 'paid'
          else 'partially_paid'
        end,
        state = case
          when paid_nanos + event_nanos >= amount_due_nanos then 'paid'
          else state
        end
    where id = invoice_row.id;
  elsif _event_type = 'payment.failed' then
    update public.io_payment_intents
    set state = 'failed', failure_code = 'provider_reported_failure', updated_at = now()
    where id = intent_row.id and state <> 'captured';
  elsif _event_type in ('refund.processed', 'refund.failed')
    and nullif(_external_refund_id, '') is not null then
    select * into refund_row from public.io_refunds
    where external_refund_id = _external_refund_id for update;
    if found then
      if refund_row.payment_intent_id <> intent_row.id
        or upper(_currency_code) <> refund_row.currency_code
        or _amount_minor <> refund_row.amount_minor then
        raise exception 'Refund event does not match the refund request';
      end if;
      if _event_type = 'refund.processed' and refund_row.state <> 'processed' then
        update public.io_refunds
        set state = 'processed', completed_at = _occurred_at, failure_code = null
        where id = refund_row.id;
        update public.io_invoices
        set refunded_nanos = refunded_nanos + refund_row.amount_nanos,
            payment_state = case
              when refunded_nanos + refund_row.amount_nanos >= paid_nanos then 'refunded'
              else 'partially_refunded'
            end
        where id = refund_row.invoice_id;
      elsif _event_type = 'refund.failed' and refund_row.state <> 'processed' then
        update public.io_refunds
        set state = 'failed', failure_code = 'provider_reported_failure', completed_at = null
        where id = refund_row.id;
      end if;
    end if;
  elsif _event_type = 'payment.dispute.created' then
    update public.io_invoices set payment_state = 'disputed' where id = intent_row.invoice_id;
  end if;
  return jsonb_build_object('ok', true, 'replayed', false);
end;
$function$;

revoke all on function public.record_io_payment_provider_event(
  text, text, text, text, text, text, text, bigint, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.record_io_payment_provider_event(
  text, text, text, text, text, text, text, bigint, text, text, timestamptz
) to service_role;

create or replace function public.record_io_refund_submission(
  _refund_id uuid,
  _external_refund_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  refund_row public.io_refunds%rowtype;
  event_row private.io_payment_events%rowtype;
begin
  if current_user <> 'service_role' then
    raise exception 'Payment service role required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(_external_refund_id, ''))) not between 4 and 160 then
    raise exception 'Refund provider identifier is invalid';
  end if;
  select * into refund_row from public.io_refunds where id = _refund_id for update;
  if not found then raise exception 'Refund does not exist'; end if;
  if refund_row.external_refund_id is not null then
    if refund_row.external_refund_id <> _external_refund_id then
      raise exception 'Refund was submitted differently';
    end if;
    return jsonb_build_object('ok', true, 'replayed', true, 'state', refund_row.state);
  end if;

  update public.io_refunds
  set external_refund_id = btrim(_external_refund_id), state = 'submitted', submitted_at = now()
  where id = _refund_id returning * into refund_row;

  select event.* into event_row
  from private.io_payment_events as event
  where event.external_refund_id = _external_refund_id
    and event.payment_intent_id = refund_row.payment_intent_id
    and event.event_type in ('refund.processed', 'refund.failed')
  order by event.occurred_at desc, event.id desc
  limit 1;
  if found then
    if event_row.currency_code <> refund_row.currency_code
      or event_row.amount_minor <> refund_row.amount_minor then
      raise exception 'Early refund event does not match the refund request';
    end if;
    if event_row.event_type = 'refund.processed' then
      update public.io_refunds
      set state = 'processed', completed_at = event_row.occurred_at, failure_code = null
      where id = refund_row.id returning * into refund_row;
      update public.io_invoices
      set refunded_nanos = refunded_nanos + refund_row.amount_nanos,
          payment_state = case
            when refunded_nanos + refund_row.amount_nanos >= paid_nanos then 'refunded'
            else 'partially_refunded'
          end
      where id = refund_row.invoice_id;
    else
      update public.io_refunds
      set state = 'failed', failure_code = 'provider_reported_failure'
      where id = refund_row.id returning * into refund_row;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'replayed', false, 'state', refund_row.state);
end;
$function$;

create or replace function public.admin_io_request_refund(
  _payment_intent_id uuid,
  _amount_nanos bigint,
  _reason text,
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  intent_row public.io_payment_intents%rowtype;
  invoice_row public.io_invoices%rowtype;
  refund_row public.io_refunds%rowtype;
  nanos_per_minor bigint;
  already_requested bigint;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.has_admin_capability(caller_id, 'billing.manage') then
    raise exception 'Billing management access required' using errcode = '42501';
  end if;
  if _client_request_id is null or char_length(normalized_reason) not between 8 and 500 then
    raise exception 'Refund request is invalid';
  end if;
  select * into refund_row from public.io_refunds
  where requested_by = caller_id and client_request_id = _client_request_id;
  if found then
    return jsonb_build_object(
      'ok', true, 'replayed', true, 'refundId', refund_row.id,
      'state', refund_row.state, 'amountMinor', refund_row.amount_minor,
      'externalPaymentId', (
        select external_payment_id from public.io_payment_intents where id = refund_row.payment_intent_id
      ),
      'environment', (
        select environment from public.io_payment_intents where id = refund_row.payment_intent_id
      )
    );
  end if;
  select * into intent_row from public.io_payment_intents where id = _payment_intent_id for update;
  if not found or intent_row.state <> 'captured' or intent_row.external_payment_id is null then
    raise exception 'Only a captured payment can be refunded';
  end if;
  select * into invoice_row from public.io_invoices where id = intent_row.invoice_id for update;
  select coalesce(sum(amount_nanos), 0) into already_requested from public.io_refunds
  where payment_intent_id = intent_row.id and state in ('requested', 'submitted', 'processed');
  if _amount_nanos <= 0 or _amount_nanos > intent_row.amount_nanos - already_requested then
    raise exception 'Refund amount exceeds the refundable balance';
  end if;
  nanos_per_minor := private.io_currency_nanos_per_minor(intent_row.currency_code);
  if _amount_nanos % nanos_per_minor <> 0 then
    raise exception 'Refund amount is not an exact minor-unit value';
  end if;
  insert into public.io_refunds (
    workspace_id, invoice_id, payment_intent_id, currency_code, amount_nanos,
    amount_minor, reason, client_request_id, requested_by
  ) values (
    intent_row.workspace_id, intent_row.invoice_id, intent_row.id, intent_row.currency_code,
    _amount_nanos, _amount_nanos / nanos_per_minor, normalized_reason, _client_request_id, caller_id
  ) returning * into refund_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.manage', 'billing', 'refund.requested', 'refund', refund_row.id,
    normalized_reason, jsonb_build_object('invoiceId', invoice_row.id, 'amountNanos', _amount_nanos::text)
  );
  return jsonb_build_object(
    'ok', true, 'replayed', false, 'refundId', refund_row.id,
    'state', refund_row.state, 'amountMinor', refund_row.amount_minor,
    'currencyCode', refund_row.currency_code, 'provider', intent_row.provider_key,
    'environment', intent_row.environment, 'externalPaymentId', intent_row.external_payment_id
  );
end;
$function$;

-- Preserve export zero-rating and exemption as distinct tax evidence.
create or replace function public.admin_io_issue_invoice(
  _invoice_id uuid,
  _tax_policy_id uuid,
  _due_days integer,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  invoice_row public.io_invoices%rowtype;
  billing_row public.io_billing_profiles%rowtype;
  policy_row public.io_tax_policy_versions%rowtype;
  nanos_per_minor bigint;
  taxable_nanos bigint;
  cgst_nanos bigint;
  sgst_nanos bigint;
  igst_nanos bigint;
  raw_due_nanos bigint;
  rounded_due_nanos bigint;
  rounding_delta bigint;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.has_admin_capability(caller_id, 'billing.manage') then
    raise exception 'Billing management access required' using errcode = '42501';
  end if;
  if _due_days not between 1 and 90 or char_length(normalized_reason) not between 8 and 500 then
    raise exception 'Invoice issuance request is invalid';
  end if;
  select * into invoice_row from public.io_invoices where id = _invoice_id for update;
  if not found or invoice_row.state <> 'draft' then
    raise exception 'Only a draft invoice can be issued';
  end if;
  select * into billing_row from public.io_billing_profiles
  where workspace_id = invoice_row.workspace_id for update;
  if not found or billing_row.verified_at is null then
    raise exception 'A verified workspace billing profile is required';
  end if;
  select * into policy_row from public.io_tax_policy_versions where id = _tax_policy_id for update;
  if not found or policy_row.status <> 'approved'
    or policy_row.currency_code <> invoice_row.currency_code
    or policy_row.buyer_country_code <> billing_row.country_code
    or policy_row.buyer_state_code is distinct from billing_row.state_code
    or policy_row.effective_from > now()
    or (policy_row.effective_until is not null and policy_row.effective_until <= now()) then
    raise exception 'No approved tax policy matches this invoice and buyer';
  end if;
  if policy_row.supply_kind = 'domestic_intra_state'
    and policy_row.seller_state_code is distinct from billing_row.state_code then
    raise exception 'Intra-state policy does not match buyer state';
  end if;
  if policy_row.supply_kind = 'domestic_inter_state'
    and policy_row.seller_state_code is not distinct from billing_row.state_code then
    raise exception 'Inter-state policy does not match buyer state';
  end if;
  nanos_per_minor := private.io_currency_nanos_per_minor(invoice_row.currency_code);
  if nanos_per_minor is null then raise exception 'Currency minor-unit rule is not active'; end if;
  taxable_nanos := case policy_row.taxable_base
    when 'subtotal' then invoice_row.subtotal_nanos
    else greatest(invoice_row.subtotal_nanos - invoice_row.credit_applied_nanos, 0)
  end;
  cgst_nanos := ((taxable_nanos::numeric * policy_row.cgst_basis_points + 5000) / 10000)::bigint;
  sgst_nanos := ((taxable_nanos::numeric * policy_row.sgst_basis_points + 5000) / 10000)::bigint;
  igst_nanos := ((taxable_nanos::numeric * policy_row.igst_basis_points + 5000) / 10000)::bigint;
  raw_due_nanos := invoice_row.subtotal_nanos + cgst_nanos + sgst_nanos
    + igst_nanos - invoice_row.credit_applied_nanos;
  rounded_due_nanos := floor(
    (raw_due_nanos::numeric + nanos_per_minor::numeric / 2) / nanos_per_minor::numeric
  )::bigint * nanos_per_minor;
  rounding_delta := rounded_due_nanos - raw_due_nanos;
  update public.io_invoices
  set state = 'issued',
      tax_status = case policy_row.supply_kind
        when 'export' then 'zero_rated'
        when 'exempt' then 'exempt'
        else 'assessed'
      end,
      tax_nanos = cgst_nanos + sgst_nanos + igst_nanos,
      rounding_nanos = rounding_delta,
      total_nanos = subtotal_nanos + cgst_nanos + sgst_nanos + igst_nanos + rounding_delta,
      amount_due_nanos = rounded_due_nanos,
      collection_amount_nanos = rounded_due_nanos,
      buyer_snapshot = jsonb_build_object(
        'legalName', billing_row.legal_name, 'billingEmail', billing_row.billing_email,
        'customerType', billing_row.customer_type, 'countryCode', billing_row.country_code,
        'stateCode', billing_row.state_code, 'postalCode', billing_row.postal_code,
        'addressLines', billing_row.address_lines, 'gstin', billing_row.gstin,
        'taxRegistrationName', billing_row.tax_registration_name,
        'billingProfileVersion', billing_row.version
      ),
      seller_snapshot = jsonb_build_object(
        'legalName', policy_row.seller_legal_name, 'countryCode', policy_row.seller_country_code,
        'stateCode', policy_row.seller_state_code, 'address', policy_row.seller_address,
        'gstin', policy_row.seller_gstin, 'serviceAccountingCode', policy_row.service_accounting_code,
        'serviceDescription', policy_row.service_description,
        'tax', jsonb_build_object(
          'cgstBasisPoints', policy_row.cgst_basis_points,
          'sgstBasisPoints', policy_row.sgst_basis_points,
          'igstBasisPoints', policy_row.igst_basis_points,
          'cgstNanos', cgst_nanos::text, 'sgstNanos', sgst_nanos::text,
          'igstNanos', igst_nanos::text
        )
      ),
      tax_policy_version_id = policy_row.id,
      supply_kind = policy_row.supply_kind,
      tax_evidence_url = policy_row.evidence_url,
      payment_state = case when rounded_due_nanos = 0 then 'paid' else 'due' end,
      issued_at = now(), due_at = now() + make_interval(days => _due_days),
      issued_by = caller_id
  where id = _invoice_id returning * into invoice_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.manage', 'billing', 'invoice.issued', 'invoice', _invoice_id,
    normalized_reason,
    jsonb_build_object('invoiceNumber', invoice_row.invoice_number, 'taxPolicyId', policy_row.id)
  );
  return jsonb_build_object(
    'ok', true, 'state', invoice_row.state,
    'amountDueNanos', invoice_row.amount_due_nanos::text
  );
end;
$function$;

create or replace function public.get_my_io_invoice_document(_invoice_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  invoice_row public.io_invoices%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into invoice_row from public.io_invoices where id = _invoice_id;
  if not found or not private.io_workspace_has_role(invoice_row.workspace_id, null)
    or invoice_row.state = 'draft' then
    raise exception 'Issued invoice access required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'id', invoice_row.id, 'invoiceNumber', invoice_row.invoice_number,
    'currencyCode', invoice_row.currency_code,
    'sourceCurrencyCode', invoice_row.source_currency_code,
    'fx', case when invoice_row.fx_rate_version_id is null then null else jsonb_build_object(
      'rateVersionId', invoice_row.fx_rate_version_id,
      'numerator', invoice_row.fx_rate_numerator::text,
      'denominator', invoice_row.fx_rate_denominator::text,
      'evidenceUrl', invoice_row.fx_evidence_url,
      'sourceProviderCostNanos', invoice_row.source_provider_cost_nanos::text,
      'sourceServiceFeeNanos', invoice_row.source_service_fee_nanos::text,
      'sourceSubtotalNanos', invoice_row.source_subtotal_nanos::text,
      'sourceCreditAppliedNanos', invoice_row.source_credit_applied_nanos::text,
      'sourceAmountDueNanos', invoice_row.source_amount_due_nanos::text
    ) end,
    'periodStart', invoice_row.period_start, 'periodEnd', invoice_row.period_end,
    'state', invoice_row.state, 'paymentState', invoice_row.payment_state,
    'providerCostNanos', invoice_row.provider_cost_nanos::text,
    'serviceFeeNanos', invoice_row.service_fee_nanos::text,
    'subtotalNanos', invoice_row.subtotal_nanos::text,
    'creditAppliedNanos', invoice_row.credit_applied_nanos::text,
    'taxNanos', invoice_row.tax_nanos::text,
    'roundingNanos', invoice_row.rounding_nanos::text,
    'totalNanos', invoice_row.total_nanos::text,
    'amountDueNanos', invoice_row.amount_due_nanos::text,
    'paidNanos', invoice_row.paid_nanos::text,
    'refundedNanos', invoice_row.refunded_nanos::text,
    'taxStatus', invoice_row.tax_status, 'supplyKind', invoice_row.supply_kind,
    'seller', invoice_row.seller_snapshot, 'buyer', invoice_row.buyer_snapshot,
    'taxEvidenceUrl', invoice_row.tax_evidence_url,
    'issuedAt', invoice_row.issued_at, 'dueAt', invoice_row.due_at,
    'voidedAt', invoice_row.voided_at, 'voidReason', invoice_row.void_reason,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', line.id::text, 'providerKey', line.provider_key, 'modelKey', line.model_key,
        'providerCostNanos', line.provider_cost_nanos::text,
        'serviceFeeNanos', line.service_fee_nanos::text,
        'customerChargeNanos', line.customer_charge_nanos::text,
        'creditAppliedNanos', line.credit_applied_nanos::text,
        'amountDueNanos', line.amount_due_nanos::text,
        'sourceCurrencyCode', line.source_currency_code,
        'sourceProviderCostNanos', line.source_provider_cost_nanos::text,
        'sourceServiceFeeNanos', line.source_service_fee_nanos::text,
        'sourceCustomerChargeNanos', line.source_customer_charge_nanos::text,
        'sourceCreditAppliedNanos', line.source_credit_applied_nanos::text,
        'sourceAmountDueNanos', line.source_amount_due_nanos::text,
        'inputTokens', line.input_tokens, 'outputTokens', line.output_tokens,
        'usageRecordedAt', line.usage_recorded_at
      ) order by line.id)
      from public.io_invoice_lines as line where line.invoice_id = invoice_row.id
    ), '[]'::jsonb)
  );
end;
$function$;

comment on function public.admin_io_create_fx_draft_invoice(
  uuid, text, text, uuid, timestamptz, timestamptz, text
) is 'Creates an invoice draft in a settlement currency from uninvoiced usage using one approved, effective, immutable FX-rate snapshot.';
comment on function public.record_io_checkout_verification(uuid, text, text, text) is
  'Service-only receipt of a server-verified Razorpay Standard Checkout signature; the signed webhook remains the settlement authority.';
comment on column public.io_payment_intents.checkout_signature_sha256 is
  'SHA-256 evidence of the verified checkout signature; raw signatures and provider secrets are never stored.';
comment on column public.io_invoices.fx_rate_version_id is
  'Approved FX rate version snapshotted when a cross-currency draft invoice is created.';

-- Both I/O operators and finance operators can create a same-currency draft.
-- Draft creation is not issuance and does not create a tax document.
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
  if not private.has_admin_capability(caller_id, 'io.manage')
    and not private.has_admin_capability(caller_id, 'billing.manage') then
    raise exception 'I/O or billing management access required' using errcode = '42501';
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

  if charge_total is null then
    raise exception 'No uninvoiced usage exists for this period';
  end if;

  insert into public.io_invoices (
    workspace_id, invoice_number, currency_code, period_start, period_end,
    provider_cost_nanos, service_fee_nanos, subtotal_nanos, credit_applied_nanos,
    total_nanos, amount_due_nanos, created_by
  ) values (
    _workspace_id,
    'IO-' || to_char(statement_timestamp(), 'YYYYMM') || '-'
      || lpad(nextval('private.io_invoice_number_sequence')::text, 6, '0'),
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
  ) values (
    _workspace_id, 'user', caller_id, 'io.invoice.draft_created',
    jsonb_build_object('invoiceId', invoice_row.id, 'currencyCode', normalized_currency)
  );

  return jsonb_build_object(
    'ok', true, 'invoiceId', invoice_row.id,
    'invoiceNumber', invoice_row.invoice_number, 'state', invoice_row.state
  );
end;
$function$;
