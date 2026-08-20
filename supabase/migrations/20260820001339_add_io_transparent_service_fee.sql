-- Commercial activation and transparent 5.5% I/O service-fee foundation.
--
-- Provider API integration is not evidence that onward API resale is allowed.
-- Every route remains ineligible until a reviewed written basis explicitly
-- authorizes it. Money evidence is stored in high-precision currency nanos;
-- the existing minor-unit budget ledger receives only the final customer
-- charge after provider cost and fee have been calculated separately.

alter table public.io_providers
  add column commercial_access_state text not null default 'unreviewed',
  add column resale_authorized boolean not null default false,
  add column commercial_terms_evidence_url text,
  add column commercial_terms_reviewed_at timestamptz,
  add column commercial_terms_reviewed_by uuid references auth.users(id) on delete set null;

alter table public.io_providers
  add constraint io_providers_commercial_access_state_check check (
    commercial_access_state in (
      'unreviewed',
      'application_integration',
      'resale_pending',
      'resale_authorized',
      'self_hosted_licence',
      'suspended',
      'expired'
    )
  ),
  add constraint io_providers_commercial_terms_url_check check (
    commercial_terms_evidence_url is null
    or commercial_terms_evidence_url ~ '^https://'
  ),
  add constraint io_providers_resale_authorization_check check (
    (
      resale_authorized = true
      and commercial_access_state in ('resale_authorized', 'self_hosted_licence')
      and commercial_terms_evidence_url is not null
      and commercial_terms_reviewed_at is not null
      and commercial_terms_reviewed_by is not null
    )
    or (
      resale_authorized = false
      and commercial_access_state not in ('resale_authorized', 'self_hosted_licence')
    )
  );

comment on column public.io_providers.resale_authorized is
  'Fail-closed evidence flag. True only after reviewed written terms explicitly permit Indus Orbit onward API access/resale or an approved self-hosted licence does so.';

create table private.io_service_fee_policies (
  version integer primary key,
  fee_basis_points integer not null,
  status text not null default 'draft',
  effective_from timestamptz not null,
  effective_until timestamptz,
  reason text not null,
  evidence_url text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint io_service_fee_policies_version_check check (version > 0),
  constraint io_service_fee_policies_basis_points_check check (
    fee_basis_points between 0 and 10000
  ),
  constraint io_service_fee_policies_status_check check (
    status in ('draft', 'active', 'retired')
  ),
  constraint io_service_fee_policies_period_check check (
    effective_until is null or effective_until > effective_from
  ),
  constraint io_service_fee_policies_reason_check check (
    char_length(btrim(reason)) between 8 and 500
  ),
  constraint io_service_fee_policies_evidence_url_check check (
    evidence_url ~ '^https://'
  )
);

create unique index io_service_fee_policies_one_active_idx
  on private.io_service_fee_policies ((true))
  where status = 'active';

alter table private.io_service_fee_policies enable row level security;
revoke all on private.io_service_fee_policies from public, anon, authenticated;
grant select, insert, update on private.io_service_fee_policies to service_role;

insert into private.io_service_fee_policies (
  version,
  fee_basis_points,
  status,
  effective_from,
  reason,
  evidence_url
) values (
  1,
  550,
  'active',
  timestamptz '2026-08-20 00:00:00+00',
  'Owner-approved transparent 5.5% I/O service fee on settled provider usage.',
  'https://openrouter.ai/docs/faq'
);

create or replace function public.io_get_active_service_fee_policy()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  policy private.io_service_fee_policies%rowtype;
begin
  select *
  into policy
  from private.io_service_fee_policies as candidate
  where candidate.status = 'active'
    and candidate.effective_from <= now()
    and (candidate.effective_until is null or candidate.effective_until > now())
  order by candidate.version desc
  limit 1;

  if not found then
    raise exception 'No active I/O service fee policy';
  end if;

  return jsonb_build_object(
    'version', policy.version,
    'feeBasisPoints', policy.fee_basis_points,
    'effectiveFrom', policy.effective_from
  );
end;
$function$;

revoke all on function public.io_get_active_service_fee_policy()
  from public, anon, authenticated;
grant execute on function public.io_get_active_service_fee_policy() to service_role;

alter table public.io_route_receipts
  add column provider_cost_nanos bigint,
  add column service_fee_nanos bigint,
  add column customer_charge_nanos bigint,
  add column service_fee_policy_version integer,
  add column service_fee_basis_points integer;

alter table public.io_route_receipts
  add constraint io_route_receipts_commercial_amounts_check check (
    (
      provider_cost_nanos is null
      and service_fee_nanos is null
      and customer_charge_nanos is null
      and service_fee_policy_version is null
      and service_fee_basis_points is null
    )
    or (
      provider_cost_nanos >= 0
      and service_fee_nanos >= 0
      and customer_charge_nanos = provider_cost_nanos + service_fee_nanos
      and service_fee_policy_version > 0
      and service_fee_basis_points between 0 and 10000
    )
  );

alter table public.io_usage_records
  add column provider_cost_nanos bigint,
  add column service_fee_nanos bigint,
  add column customer_charge_nanos bigint,
  add column service_fee_policy_version integer,
  add column service_fee_basis_points integer;

alter table public.io_usage_records
  add constraint io_usage_records_commercial_amounts_check check (
    (
      provider_cost_nanos is null
      and service_fee_nanos is null
      and customer_charge_nanos is null
      and service_fee_policy_version is null
      and service_fee_basis_points is null
    )
    or (
      provider_cost_nanos >= 0
      and service_fee_nanos >= 0
      and customer_charge_nanos = provider_cost_nanos + service_fee_nanos
      and service_fee_policy_version > 0
      and service_fee_basis_points between 0 and 10000
    )
  );

alter table private.io_ledger_entries
  drop constraint io_ledger_entries_account_check;

alter table private.io_ledger_entries
  add constraint io_ledger_entries_account_check check (
    account_code in (
      'budget_available',
      'budget_reserved',
      'provider_cost',
      'customer_usage_charge',
      'adjustment'
    )
  );

create or replace function public.io_finalize_priced_route_request(
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
  _customer_charge_minor bigint,
  _provider_cost_nanos bigint,
  _service_fee_nanos bigint,
  _customer_charge_nanos bigint,
  _service_fee_policy_version integer,
  _service_fee_basis_points integer,
  _policy_snapshot jsonb,
  _candidate_summary jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  result jsonb;
  created_receipt_id uuid;
  expected_fee_nanos bigint;
begin
  if _provider_cost_nanos is null or _provider_cost_nanos < 0
    or _service_fee_nanos is null or _service_fee_nanos < 0
    or _customer_charge_nanos is null or _customer_charge_nanos < 0
    or _customer_charge_minor is null or _customer_charge_minor < 0 then
    raise exception 'Invalid commercial charge amounts';
  end if;
  if _customer_charge_nanos <> _provider_cost_nanos + _service_fee_nanos then
    raise exception 'Commercial charge does not reconcile';
  end if;
  if _service_fee_policy_version is null or _service_fee_policy_version < 1
    or _service_fee_basis_points is null
    or _service_fee_basis_points not between 0 and 10000 then
    raise exception 'Invalid service fee policy';
  end if;

  expected_fee_nanos := ceil(
    _provider_cost_nanos::numeric
    * _service_fee_basis_points::numeric
    / 10000::numeric
  )::bigint;
  if _service_fee_nanos <> expected_fee_nanos then
    raise exception 'Service fee does not match its policy';
  end if;
  if _result_state = 'failed'
    and (_provider_cost_nanos <> 0 or _service_fee_nanos <> 0 or _customer_charge_nanos <> 0) then
    raise exception 'Failed routes cannot carry a commercial charge';
  end if;
  if not exists (
    select 1
    from private.io_service_fee_policies as policy
    where policy.version = _service_fee_policy_version
      and policy.fee_basis_points = _service_fee_basis_points
      and policy.status = 'active'
      and policy.effective_from <= now()
      and (policy.effective_until is null or policy.effective_until > now())
  ) then
    raise exception 'Service fee policy is not active';
  end if;

  result := public.io_finalize_route_request(
    _request_id,
    _result_state,
    _route_strategy,
    _selection,
    _attempts,
    _candidate_count,
    _fallback_count,
    _estimated_cost_nanos,
    _currency_code,
    _input_tokens,
    _output_tokens,
    _customer_charge_minor,
    _policy_snapshot || jsonb_build_object(
      'service_fee_policy_version', _service_fee_policy_version,
      'service_fee_basis_points', _service_fee_basis_points,
      'provider_cost_nanos', _provider_cost_nanos,
      'service_fee_nanos', _service_fee_nanos,
      'customer_charge_nanos', _customer_charge_nanos
    ),
    _candidate_summary
  );

  created_receipt_id := nullif(result ->> 'receiptId', '')::uuid;
  if created_receipt_id is null then
    raise exception 'Priced route finalization returned no receipt';
  end if;

  update public.io_route_receipts
  set
    provider_cost_nanos = _provider_cost_nanos,
    service_fee_nanos = _service_fee_nanos,
    customer_charge_nanos = _customer_charge_nanos,
    service_fee_policy_version = _service_fee_policy_version,
    service_fee_basis_points = _service_fee_basis_points
  where id = created_receipt_id;

  if _result_state = 'completed' then
    update public.io_usage_records
    set
      provider_cost_nanos = _provider_cost_nanos,
      service_fee_nanos = _service_fee_nanos,
      customer_charge_nanos = _customer_charge_nanos,
      service_fee_policy_version = _service_fee_policy_version,
      service_fee_basis_points = _service_fee_basis_points
    where receipt_id = created_receipt_id;

    update private.io_ledger_entries as entry
    set account_code = 'customer_usage_charge'
    from private.io_ledger_transactions as transaction
    where entry.transaction_id = transaction.id
      and transaction.request_id = _request_id
      and transaction.transaction_kind = 'settle'
      and entry.account_code = 'provider_cost';
  end if;

  return result || jsonb_build_object(
    'providerCostNanos', _provider_cost_nanos,
    'serviceFeeNanos', _service_fee_nanos,
    'customerChargeNanos', _customer_charge_nanos,
    'serviceFeePolicyVersion', _service_fee_policy_version,
    'serviceFeeBasisPoints', _service_fee_basis_points
  );
end;
$function$;

revoke all on function public.io_finalize_priced_route_request(
  uuid, text, text, jsonb, jsonb, integer, integer, bigint, text, integer,
  integer, bigint, bigint, bigint, bigint, integer, integer, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.io_finalize_priced_route_request(
  uuid, text, text, jsonb, jsonb, integer, integer, bigint, text, integer,
  integer, bigint, bigint, bigint, bigint, integer, integer, jsonb, jsonb
) to service_role;

-- Commercial evidence is part of the canonical endpoint-eligibility result,
-- so the member catalogue, admin activation switch and runtime resolver all
-- fail closed together.
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
      commercial.resale_authorized
      and capability.verification_state = 'verified'
      and capability.supports_chat = true
      and conformance.run_state = 'passed'
      and conformance.finished_at is not null
      and conformance.capability_version_id = capability.id,
      false
    )
  from (values (_endpoint_id)) as requested(endpoint_id)
  left join lateral (
    select provider.resale_authorized
    from public.io_model_endpoints as endpoint
    join public.io_providers as provider on provider.id = endpoint.provider_id
    where endpoint.id = requested.endpoint_id
  ) as commercial on true
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

comment on function private.io_endpoint_latest_evidence(uuid) is
  'Fail-closed endpoint evidence: written resale authorization, latest verified chat capability and latest endpoint-bound passing conformance are all required.';

create or replace function private.enforce_io_provider_resale_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.routing_enabled and not exists (
    select 1
    from public.io_providers as provider
    where provider.id = new.provider_id
      and provider.resale_authorized = true
      and provider.commercial_access_state in ('resale_authorized', 'self_hosted_licence')
  ) then
    raise exception 'Provider routing requires reviewed written resale authorization';
  end if;
  return new;
end;
$function$;

revoke all on function private.enforce_io_provider_resale_gate()
  from public, anon, authenticated;

create trigger enforce_io_provider_resale_gate
before insert or update of routing_enabled
on private.io_provider_runtime_controls
for each row execute function private.enforce_io_provider_resale_gate();

-- Keep commercial terms in a separate admin projection. This avoids widening
-- the established operational snapshot contract while still making the new
-- fail-closed gate visible to the separate admin application.
create or replace function public.admin_io_provider_commercial_snapshot()
returns table (
  provider_id uuid,
  provider_key text,
  commercial_access_state text,
  resale_authorized boolean,
  commercial_terms_evidence_url text,
  commercial_terms_reviewed_at timestamptz
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
    provider.commercial_access_state,
    provider.resale_authorized,
    provider.commercial_terms_evidence_url,
    provider.commercial_terms_reviewed_at
  from public.io_providers as provider
  order by provider.display_name;
end;
$function$;

revoke all on function public.admin_io_provider_commercial_snapshot()
  from public, anon;
grant execute on function public.admin_io_provider_commercial_snapshot()
  to authenticated, service_role;

-- Record current official policy evidence without claiming a partnership.
update public.io_providers
set
  terms_version = 'API policy reviewed 2026-08-20',
  terms_evidence_url = 'https://openai.com/policies/services-agreement/',
  data_retention_class = 'provider_default',
  training_use_class = 'no_training_claimed',
  commercial_access_state = 'resale_pending',
  resale_authorized = false,
  commercial_terms_evidence_url = 'https://openai.com/policies/services-agreement/',
  commercial_terms_reviewed_at = timestamptz '2026-08-20 00:00:00+00',
  updated_at = now()
where provider_key = 'openai';

update public.io_model_endpoints as endpoint
set retention_class = 'provider_default', updated_at = now()
from public.io_providers as provider
where endpoint.provider_id = provider.id and provider.provider_key = 'openai';

update public.io_endpoint_pricing_versions as price
set effective_until = timestamptz '2026-08-20 00:00:00+00'
from public.io_model_endpoints as endpoint
join public.io_providers as provider on provider.id = endpoint.provider_id
where price.endpoint_id = endpoint.id
  and provider.provider_key = 'openai'
  and price.effective_until is null;

insert into public.io_endpoint_pricing_versions (
  endpoint_id,
  version,
  publication_state,
  member_visible,
  currency_code,
  billing_meter,
  unit_quantity,
  input_price_nanos,
  cached_input_price_nanos,
  output_price_nanos,
  evidence_url,
  evidence_note,
  effective_from,
  recorded_by
)
select
  endpoint.id,
  2,
  'published',
  true,
  'USD',
  'tokens',
  1000000,
  200000000,
  20000000,
  1200000000,
  'https://developers.openai.com/api/docs/pricing',
  'Observed standard short-context GPT-5.6 Luna price. Long-context, regional, tools, storage and other metered dimensions require separate price cards.',
  timestamptz '2026-08-20 00:00:00+00',
  provider.created_by
from public.io_model_endpoints as endpoint
join public.io_providers as provider on provider.id = endpoint.provider_id
where provider.provider_key = 'openai'
on conflict (endpoint_id, version) do nothing;

update public.io_providers
set
  terms_version = 'Open Platform Terms effective 2026-04-29',
  terms_evidence_url = 'https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html',
  data_retention_class = 'provider_default',
  training_use_class = 'opt_out_supported',
  default_region_code = 'CN',
  default_residency_country = 'CN',
  commercial_access_state = 'resale_pending',
  resale_authorized = false,
  commercial_terms_evidence_url = 'https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html',
  commercial_terms_reviewed_at = timestamptz '2026-08-20 00:00:00+00',
  updated_at = now()
where provider_key = 'deepseek';

update public.io_model_endpoints as endpoint
set
  region_code = 'CN',
  residency_country_code = 'CN',
  residency_evidence_url = 'https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html',
  retention_class = 'provider_default',
  updated_at = now()
from public.io_providers as provider
where endpoint.provider_id = provider.id and provider.provider_key = 'deepseek';

comment on table private.io_service_fee_policies is
  'Versioned service-fee policy. 550 basis points means a transparent 5.5% fee on settled provider usage; tax, FX and payment costs are separate.';
comment on function public.io_finalize_priced_route_request(
  uuid, text, text, jsonb, jsonb, integer, integer, bigint, text, integer,
  integer, bigint, bigint, bigint, bigint, integer, integer, jsonb, jsonb
) is
  'Service-role-only atomic route finalization with separate provider-cost, I/O service-fee and customer-charge evidence.';
comment on function public.admin_io_provider_commercial_snapshot() is
  'Admin-team projection of provider commercial-access and onward-resale evidence. Requires io.read.';
comment on column public.io_usage_records.amount_minor is
  'Final customer usage charge in currency minor units. High-precision provider cost and I/O fee are stored separately in nanos.';
