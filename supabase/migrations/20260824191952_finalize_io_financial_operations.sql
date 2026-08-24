-- I/O financial operations.
--
-- Money is stored as integer currency nanos internally and converted to a
-- processor's minor unit only through an active currency rule. Tax, FX and
-- payment processor configuration are versioned and fail closed until a
-- second, independent approver activates them. No processor secret is stored
-- in Postgres or returned to a browser.

alter table private.admin_team_assignments
  drop constraint admin_team_assignments_role_check,
  add constraint admin_team_assignments_role_check check (
    role in (
      'trust_safety', 'member_support', 'content_operator',
      'program_operator', 'io_operator', 'finance_operator', 'audit_viewer'
    )
  );

alter table private.admin_team_role_capabilities
  drop constraint admin_team_role_capabilities_role_check,
  add constraint admin_team_role_capabilities_role_check check (
    role in (
      'trust_safety', 'member_support', 'content_operator',
      'program_operator', 'io_operator', 'finance_operator', 'audit_viewer'
    )
  );

alter table private.admin_team_events
  drop constraint admin_team_events_role_check,
  add constraint admin_team_events_role_check check (
    role in (
      'trust_safety', 'member_support', 'content_operator',
      'program_operator', 'io_operator', 'finance_operator', 'audit_viewer'
    )
  );

insert into private.admin_team_role_capabilities (role, capability)
values
  ('finance_operator', 'admin.enter'),
  ('finance_operator', 'audit.read'),
  ('finance_operator', 'billing.read'),
  ('finance_operator', 'billing.manage'),
  ('finance_operator', 'billing.reconcile')
on conflict do nothing;

create or replace function public.admin_set_team_role(
  _target_user_id uuid,
  _role text,
  _enabled boolean,
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
  changed_count integer := 0;
begin
  if not private.is_platform_super_admin(caller_id) then
    raise exception 'Super-admin access required' using errcode = '42501';
  end if;
  if _target_user_id is null or not exists (
    select 1 from auth.users as auth_user where auth_user.id = _target_user_id
  ) then
    raise exception 'Target user does not exist';
  end if;
  if _role not in (
    'trust_safety', 'member_support', 'content_operator',
    'program_operator', 'io_operator', 'finance_operator', 'audit_viewer'
  ) then
    raise exception 'Unsupported admin-team role';
  end if;
  if char_length(normalized_reason) not between 8 and 500 then
    raise exception 'A reason between 8 and 500 characters is required';
  end if;
  if _enabled then
    insert into private.admin_team_assignments (user_id, role, assigned_by, reason)
    select _target_user_id, _role, caller_id, normalized_reason
    where not exists (
      select 1 from private.admin_team_assignments as assignment
      where assignment.user_id = _target_user_id
        and assignment.role = _role and assignment.revoked_at is null
    );
    get diagnostics changed_count = row_count;
  else
    update private.admin_team_assignments
    set revoked_at = now(), revoked_by = caller_id
    where user_id = _target_user_id and role = _role and revoked_at is null;
    get diagnostics changed_count = row_count;
  end if;
  if changed_count > 0 then
    insert into private.admin_team_events (
      actor_user_id, target_user_id, role, action, reason
    ) values (
      caller_id, _target_user_id, _role,
      case when _enabled then 'assigned' else 'revoked' end,
      normalized_reason
    );
  end if;
  return jsonb_build_object('ok', true, 'changed', changed_count > 0);
end;
$function$;

alter table private.admin_operation_events
  drop constraint admin_operation_events_domain_check,
  add constraint admin_operation_events_domain_check check (
    domain in ('trust', 'members', 'content', 'programs', 'io', 'billing', 'team')
  );

create table private.io_currency_rules (
  currency_code text primary key,
  minor_unit_exponent integer not null,
  status text not null default 'active',
  evidence_url text not null,
  reviewed_at timestamptz not null,
  constraint io_currency_rules_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_currency_rules_exponent_check check (minor_unit_exponent between 0 and 4),
  constraint io_currency_rules_status_check check (status in ('active', 'retired')),
  constraint io_currency_rules_evidence_check check (evidence_url ~ '^https://')
);

insert into private.io_currency_rules (
  currency_code, minor_unit_exponent, evidence_url, reviewed_at
) values
  ('INR', 2, 'https://www.iso.org/iso-4217-currency-codes.html', '2026-08-24T00:00:00Z'),
  ('USD', 2, 'https://www.iso.org/iso-4217-currency-codes.html', '2026-08-24T00:00:00Z'),
  ('EUR', 2, 'https://www.iso.org/iso-4217-currency-codes.html', '2026-08-24T00:00:00Z'),
  ('GBP', 2, 'https://www.iso.org/iso-4217-currency-codes.html', '2026-08-24T00:00:00Z')
on conflict do nothing;

create table public.io_billing_profiles (
  workspace_id uuid primary key references public.io_workspaces(id) on delete restrict,
  legal_name text not null,
  billing_email text not null,
  customer_type text not null,
  country_code text not null,
  state_code text,
  postal_code text,
  address_lines jsonb not null,
  gstin text,
  tax_registration_name text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_billing_profiles_legal_name_check check (
    char_length(btrim(legal_name)) between 2 and 200
  ),
  constraint io_billing_profiles_email_check check (
    billing_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  constraint io_billing_profiles_customer_type_check check (
    customer_type in ('business', 'individual')
  ),
  constraint io_billing_profiles_country_check check (country_code ~ '^[A-Z]{2}$'),
  constraint io_billing_profiles_state_check check (
    state_code is null or state_code ~ '^[A-Z0-9-]{1,12}$'
  ),
  constraint io_billing_profiles_address_check check (
    jsonb_typeof(address_lines) = 'array'
    and jsonb_array_length(address_lines) between 1 and 4
    and pg_column_size(address_lines) <= 1200
  ),
  constraint io_billing_profiles_gstin_check check (
    gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$'
  ),
  constraint io_billing_profiles_verification_check check (
    (verified_at is null and verified_by is null)
    or (verified_at is not null and verified_by is not null)
  ),
  constraint io_billing_profiles_version_check check (version > 0)
);

create table public.io_tax_policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null,
  version integer not null,
  status text not null default 'draft',
  currency_code text not null,
  seller_country_code text not null,
  seller_state_code text,
  seller_legal_name text not null,
  seller_address jsonb not null,
  seller_gstin text,
  service_accounting_code text not null,
  service_description text not null,
  supply_kind text not null,
  buyer_country_code text not null,
  buyer_state_code text,
  taxable_base text not null,
  cgst_basis_points integer not null default 0,
  sgst_basis_points integer not null default 0,
  igst_basis_points integer not null default 0,
  evidence_url text not null,
  effective_from timestamptz not null,
  effective_until timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  constraint io_tax_policy_versions_key check (
    policy_key ~ '^[a-z][a-z0-9_.-]{2,79}$'
  ),
  constraint io_tax_policy_versions_unique unique (policy_key, version),
  constraint io_tax_policy_versions_version_check check (version > 0),
  constraint io_tax_policy_versions_status_check check (
    status in ('draft', 'approved', 'retired')
  ),
  constraint io_tax_policy_versions_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_tax_policy_versions_country_check check (
    seller_country_code ~ '^[A-Z]{2}$' and buyer_country_code ~ '^[A-Z]{2}$'
  ),
  constraint io_tax_policy_versions_state_check check (
    (seller_state_code is null or seller_state_code ~ '^[A-Z0-9-]{1,12}$')
    and (buyer_state_code is null or buyer_state_code ~ '^[A-Z0-9-]{1,12}$')
  ),
  constraint io_tax_policy_versions_seller_check check (
    char_length(btrim(seller_legal_name)) between 2 and 200
    and jsonb_typeof(seller_address) = 'object'
    and pg_column_size(seller_address) <= 1600
  ),
  constraint io_tax_policy_versions_gstin_check check (
    seller_gstin is null or seller_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$'
  ),
  constraint io_tax_policy_versions_sac_check check (
    service_accounting_code ~ '^[0-9]{4,8}$'
  ),
  constraint io_tax_policy_versions_description_check check (
    char_length(btrim(service_description)) between 4 and 240
  ),
  constraint io_tax_policy_versions_supply_check check (
    supply_kind in ('domestic_intra_state', 'domestic_inter_state', 'export', 'exempt')
  ),
  constraint io_tax_policy_versions_base_check check (
    taxable_base in ('subtotal', 'net_of_credits')
  ),
  constraint io_tax_policy_versions_rates_check check (
    cgst_basis_points between 0 and 10000
    and sgst_basis_points between 0 and 10000
    and igst_basis_points between 0 and 10000
    and (
      (supply_kind = 'domestic_intra_state' and cgst_basis_points > 0 and sgst_basis_points > 0 and igst_basis_points = 0)
      or (supply_kind = 'domestic_inter_state' and cgst_basis_points = 0 and sgst_basis_points = 0 and igst_basis_points > 0)
      or (supply_kind in ('export', 'exempt') and cgst_basis_points = 0 and sgst_basis_points = 0 and igst_basis_points = 0)
    )
  ),
  constraint io_tax_policy_versions_evidence_check check (evidence_url ~ '^https://'),
  constraint io_tax_policy_versions_effective_check check (
    effective_until is null or effective_until > effective_from
  ),
  constraint io_tax_policy_versions_approval_check check (
    (status = 'draft' and approved_by is null and approved_at is null)
    or (status in ('approved', 'retired') and approved_by is not null and approved_at is not null)
  ),
  constraint io_tax_policy_versions_two_person_check check (
    approved_by is null or approved_by <> created_by
  )
);

create index io_tax_policy_active_match_idx
  on public.io_tax_policy_versions (
    status, currency_code, buyer_country_code, buyer_state_code, effective_from desc
  );

create table public.io_fx_rate_versions (
  id uuid primary key default gen_random_uuid(),
  base_currency_code text not null,
  quote_currency_code text not null,
  rate_numerator bigint not null,
  rate_denominator bigint not null,
  status text not null default 'draft',
  source_name text not null,
  evidence_url text not null,
  observed_at timestamptz not null,
  effective_from timestamptz not null,
  effective_until timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  constraint io_fx_rates_currency_check check (
    base_currency_code ~ '^[A-Z]{3}$'
    and quote_currency_code ~ '^[A-Z]{3}$'
    and base_currency_code <> quote_currency_code
  ),
  constraint io_fx_rates_value_check check (
    rate_numerator > 0 and rate_denominator > 0
  ),
  constraint io_fx_rates_status_check check (status in ('draft', 'approved', 'retired')),
  constraint io_fx_rates_source_check check (
    char_length(btrim(source_name)) between 2 and 120 and evidence_url ~ '^https://'
  ),
  constraint io_fx_rates_period_check check (
    effective_until > effective_from and observed_at <= effective_from
  ),
  constraint io_fx_rates_approval_check check (
    (status = 'draft' and approved_by is null and approved_at is null)
    or (status in ('approved', 'retired') and approved_by is not null and approved_at is not null)
  ),
  constraint io_fx_rates_two_person_check check (
    approved_by is null or approved_by <> created_by
  )
);

create unique index io_fx_rate_active_period_key
  on public.io_fx_rate_versions (base_currency_code, quote_currency_code, effective_from)
  where status = 'approved';

create table private.io_payment_processor_configs (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  environment text not null,
  status text not null default 'draft',
  currency_codes text[] not null,
  merchant_reference text not null,
  terms_evidence_url text not null,
  refund_policy_url text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  retired_at timestamptz,
  constraint io_payment_processor_provider_check check (provider_key in ('razorpay')),
  constraint io_payment_processor_environment_check check (environment in ('test', 'live')),
  constraint io_payment_processor_status_check check (status in ('draft', 'approved', 'retired')),
  constraint io_payment_processor_currency_check check (
    cardinality(currency_codes) between 1 and 20
  ),
  constraint io_payment_processor_reference_check check (
    char_length(merchant_reference) between 4 and 120
  ),
  constraint io_payment_processor_urls_check check (
    terms_evidence_url ~ '^https://' and refund_policy_url ~ '^https://'
  ),
  constraint io_payment_processor_approval_check check (
    (status = 'draft' and approved_by is null and approved_at is null and retired_at is null)
    or (status = 'approved' and approved_by is not null and approved_at is not null and retired_at is null)
    or (status = 'retired' and approved_by is not null and approved_at is not null and retired_at is not null)
  ),
  constraint io_payment_processor_two_person_check check (
    approved_by is null or approved_by <> created_by
  )
);

create unique index io_payment_processor_one_active_idx
  on private.io_payment_processor_configs (provider_key, environment)
  where status = 'approved';

alter table public.io_invoices
  drop constraint io_invoices_amounts_check,
  add column seller_snapshot jsonb not null default '{}'::jsonb,
  add column tax_policy_version_id uuid references public.io_tax_policy_versions(id) on delete restrict,
  add column supply_kind text,
  add column rounding_nanos bigint not null default 0,
  add column collection_amount_nanos bigint,
  add column payment_state text not null default 'not_due',
  add column paid_nanos bigint not null default 0,
  add column refunded_nanos bigint not null default 0,
  add column issued_by uuid references auth.users(id) on delete set null,
  add column void_reason text,
  add constraint io_invoices_amounts_check check (
    provider_cost_nanos >= 0
    and service_fee_nanos >= 0
    and subtotal_nanos = provider_cost_nanos + service_fee_nanos
    and credit_applied_nanos between 0 and subtotal_nanos
    and tax_nanos >= 0
    and total_nanos = subtotal_nanos + tax_nanos + rounding_nanos
    and amount_due_nanos = total_nanos - credit_applied_nanos
    and paid_nanos >= 0 and refunded_nanos between 0 and paid_nanos
    and (collection_amount_nanos is null or collection_amount_nanos = amount_due_nanos)
  ),
  add constraint io_invoices_seller_snapshot_check check (
    jsonb_typeof(seller_snapshot) = 'object'
  ),
  add constraint io_invoices_supply_kind_check check (
    supply_kind is null or supply_kind in ('domestic_intra_state', 'domestic_inter_state', 'export', 'exempt')
  ),
  add constraint io_invoices_payment_state_check check (
    payment_state in ('not_due', 'due', 'partially_paid', 'paid', 'partially_refunded', 'refunded', 'disputed')
  ),
  add constraint io_invoices_issue_snapshot_check check (
    (state = 'draft' and tax_policy_version_id is null and collection_amount_nanos is null and issued_by is null)
    or (state <> 'draft' and tax_policy_version_id is not null and collection_amount_nanos is not null and issued_by is not null)
  ),
  add constraint io_invoices_void_reason_check check (
    (state <> 'void' and void_reason is null)
    or (state = 'void' and char_length(btrim(void_reason)) between 8 and 500)
  );

create table public.io_payment_intents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete restrict,
  invoice_id uuid not null references public.io_invoices(id) on delete restrict,
  processor_config_id uuid not null references private.io_payment_processor_configs(id) on delete restrict,
  provider_key text not null,
  environment text not null,
  currency_code text not null,
  amount_nanos bigint not null,
  amount_minor bigint not null,
  state text not null default 'created',
  client_request_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  external_order_id text,
  external_payment_id text,
  failure_code text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  captured_at timestamptz,
  constraint io_payment_intents_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_payment_intents_amount_check check (amount_nanos > 0 and amount_minor > 0),
  constraint io_payment_intents_state_check check (
    state in ('created', 'order_created', 'captured', 'failed', 'cancelled')
  ),
  constraint io_payment_intents_external_check check (
    external_order_id is null or char_length(external_order_id) between 4 and 160
  ),
  constraint io_payment_intents_expiry_check check (expires_at > created_at),
  unique (workspace_id, created_by, client_request_id)
);

create unique index io_payment_intents_external_order_key
  on public.io_payment_intents (provider_key, external_order_id)
  where external_order_id is not null;
create unique index io_payment_intents_external_payment_key
  on public.io_payment_intents (provider_key, external_payment_id)
  where external_payment_id is not null;
create index io_payment_intents_invoice_time_idx
  on public.io_payment_intents (invoice_id, created_at desc);

create table private.io_payment_events (
  id bigint generated always as identity primary key,
  provider_key text not null,
  provider_event_id text not null,
  event_type text not null,
  payment_intent_id uuid references public.io_payment_intents(id) on delete restrict,
  external_order_id text,
  external_payment_id text,
  external_refund_id text,
  amount_minor bigint,
  currency_code text,
  payload_sha256 text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint io_payment_events_provider_check check (provider_key in ('razorpay')),
  constraint io_payment_events_id_check check (char_length(provider_event_id) between 8 and 200),
  constraint io_payment_events_type_check check (
    event_type in ('payment.authorized', 'payment.captured', 'payment.failed', 'refund.created', 'refund.processed', 'refund.failed', 'payment.dispute.created')
  ),
  constraint io_payment_events_amount_check check (amount_minor is null or amount_minor >= 0),
  constraint io_payment_events_currency_check check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  constraint io_payment_events_hash_check check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  unique (provider_key, provider_event_id)
);

create table public.io_refunds (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete restrict,
  invoice_id uuid not null references public.io_invoices(id) on delete restrict,
  payment_intent_id uuid not null references public.io_payment_intents(id) on delete restrict,
  currency_code text not null,
  amount_nanos bigint not null,
  amount_minor bigint not null,
  state text not null default 'requested',
  reason text not null,
  client_request_id uuid not null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  external_refund_id text,
  failure_code text,
  requested_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  constraint io_refunds_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_refunds_amount_check check (amount_nanos > 0 and amount_minor > 0),
  constraint io_refunds_state_check check (
    state in ('requested', 'submitted', 'processed', 'failed', 'cancelled')
  ),
  constraint io_refunds_reason_check check (char_length(btrim(reason)) between 8 and 500),
  unique (requested_by, client_request_id)
);

create unique index io_refunds_external_key
  on public.io_refunds (external_refund_id) where external_refund_id is not null;
create index io_refunds_invoice_time_idx on public.io_refunds (invoice_id, requested_at desc);

create table public.io_provider_statements (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.io_providers(id) on delete restrict,
  statement_number text not null,
  currency_code text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  stated_total_nanos bigint not null,
  evidence_url text not null,
  content_sha256 text not null,
  imported_by uuid not null references auth.users(id) on delete restrict,
  imported_at timestamptz not null default now(),
  constraint io_provider_statements_number_check check (char_length(statement_number) between 2 and 120),
  constraint io_provider_statements_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_provider_statements_period_check check (period_end > period_start),
  constraint io_provider_statements_total_check check (stated_total_nanos >= 0),
  constraint io_provider_statements_evidence_check check (evidence_url ~ '^https://'),
  constraint io_provider_statements_hash_check check (content_sha256 ~ '^[a-f0-9]{64}$'),
  unique (provider_id, statement_number)
);

create table public.io_provider_statement_lines (
  id bigint generated always as identity primary key,
  statement_id uuid not null references public.io_provider_statements(id) on delete restrict,
  external_line_id text not null,
  provider_request_id text,
  service_date timestamptz not null,
  model_reference text,
  input_tokens integer,
  output_tokens integer,
  amount_nanos bigint not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint io_provider_statement_lines_id_check check (char_length(external_line_id) between 1 and 160),
  constraint io_provider_statement_lines_request_check check (
    provider_request_id is null or char_length(provider_request_id) between 1 and 200
  ),
  constraint io_provider_statement_lines_tokens_check check (
    (input_tokens is null or input_tokens >= 0) and (output_tokens is null or output_tokens >= 0)
  ),
  constraint io_provider_statement_lines_amount_check check (amount_nanos >= 0),
  constraint io_provider_statement_lines_metadata_check check (
    jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 2048
  ),
  unique (statement_id, external_line_id)
);

create index io_provider_statement_lines_request_idx
  on public.io_provider_statement_lines (provider_request_id)
  where provider_request_id is not null;
create index io_provider_attempts_provider_request_idx
  on public.io_provider_attempts (provider_id, provider_request_id)
  where provider_request_id is not null;

create table public.io_provider_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.io_provider_statements(id) on delete restrict,
  run_state text not null default 'completed',
  matched_count integer not null,
  exception_count integer not null,
  expected_total_nanos bigint not null,
  stated_total_nanos bigint not null,
  delta_nanos bigint not null,
  run_by uuid not null references auth.users(id) on delete restrict,
  run_at timestamptz not null default now(),
  constraint io_provider_reconciliation_state_check check (run_state in ('completed')),
  constraint io_provider_reconciliation_counts_check check (matched_count >= 0 and exception_count >= 0),
  constraint io_provider_reconciliation_totals_check check (expected_total_nanos >= 0 and stated_total_nanos >= 0)
);

create table public.io_provider_reconciliation_results (
  run_id uuid not null references public.io_provider_reconciliation_runs(id) on delete restrict,
  statement_line_id bigint not null references public.io_provider_statement_lines(id) on delete restrict,
  attempt_id uuid references public.io_provider_attempts(id) on delete restrict,
  receipt_id uuid references public.io_route_receipts(id) on delete restrict,
  result_state text not null,
  expected_nanos bigint,
  stated_nanos bigint not null,
  delta_nanos bigint,
  reason_code text not null,
  primary key (run_id, statement_line_id),
  constraint io_provider_reconciliation_result_check check (
    result_state in ('matched', 'unmatched', 'ambiguous', 'amount_mismatch', 'currency_mismatch')
  ),
  constraint io_provider_reconciliation_reason_check check (
    reason_code ~ '^[a-z][a-z0-9_.-]{1,99}$'
  )
);

alter table public.io_billing_profiles enable row level security;
alter table public.io_tax_policy_versions enable row level security;
alter table public.io_fx_rate_versions enable row level security;
alter table private.io_payment_processor_configs enable row level security;
alter table public.io_payment_intents enable row level security;
alter table private.io_payment_events enable row level security;
alter table public.io_refunds enable row level security;
alter table public.io_provider_statements enable row level security;
alter table public.io_provider_statement_lines enable row level security;
alter table public.io_provider_reconciliation_runs enable row level security;
alter table public.io_provider_reconciliation_results enable row level security;
alter table private.io_currency_rules enable row level security;

revoke all on public.io_billing_profiles, public.io_tax_policy_versions,
  public.io_fx_rate_versions, private.io_payment_processor_configs,
  public.io_payment_intents, private.io_payment_events, public.io_refunds,
  public.io_provider_statements, public.io_provider_statement_lines,
  public.io_provider_reconciliation_runs, public.io_provider_reconciliation_results,
  private.io_currency_rules
from public, anon, authenticated;

grant select, insert, update on public.io_billing_profiles, public.io_tax_policy_versions,
  public.io_fx_rate_versions, public.io_payment_intents, public.io_refunds,
  public.io_provider_statements, public.io_provider_statement_lines,
  public.io_provider_reconciliation_runs, public.io_provider_reconciliation_results
to service_role;
grant select, insert, update on private.io_payment_processor_configs to service_role;
grant select, insert on private.io_payment_events to service_role;
grant select on private.io_currency_rules to service_role;

create or replace function private.io_currency_nanos_per_minor(_currency_code text)
returns bigint
language sql
stable
security definer
set search_path = ''
as $function$
  select (power(10::numeric, 9 - rule.minor_unit_exponent))::bigint
  from private.io_currency_rules as rule
  where rule.currency_code = upper(_currency_code) and rule.status = 'active';
$function$;

revoke all on function private.io_currency_nanos_per_minor(text)
  from public, anon, authenticated;

create or replace function public.get_my_io_billing_profile(_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  profile_row public.io_billing_profiles%rowtype;
begin
  if caller_id is null or not private.io_workspace_has_role(_workspace_id, array['owner', 'admin', 'billing']) then
    raise exception 'Workspace billing access required' using errcode = '42501';
  end if;
  select * into profile_row from public.io_billing_profiles where workspace_id = _workspace_id;
  if not found then return null; end if;
  return jsonb_build_object(
    'workspaceId', profile_row.workspace_id,
    'legalName', profile_row.legal_name,
    'billingEmail', profile_row.billing_email,
    'customerType', profile_row.customer_type,
    'countryCode', profile_row.country_code,
    'stateCode', profile_row.state_code,
    'postalCode', profile_row.postal_code,
    'addressLines', profile_row.address_lines,
    'gstin', profile_row.gstin,
    'taxRegistrationName', profile_row.tax_registration_name,
    'verifiedAt', profile_row.verified_at,
    'version', profile_row.version
  );
end;
$function$;

create or replace function public.upsert_my_io_billing_profile(
  _workspace_id uuid,
  _legal_name text,
  _billing_email text,
  _customer_type text,
  _country_code text,
  _state_code text,
  _postal_code text,
  _address_lines jsonb,
  _gstin text,
  _tax_registration_name text,
  _expected_version integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  profile_row public.io_billing_profiles%rowtype;
begin
  if caller_id is null or not private.io_workspace_has_role(_workspace_id, array['owner', 'admin', 'billing']) then
    raise exception 'Workspace billing access required' using errcode = '42501';
  end if;
  select * into profile_row from public.io_billing_profiles where workspace_id = _workspace_id for update;
  if not found then
    if coalesce(_expected_version, 0) <> 0 then raise exception 'Billing profile changed; refresh before saving'; end if;
    insert into public.io_billing_profiles (
      workspace_id, legal_name, billing_email, customer_type, country_code,
      state_code, postal_code, address_lines, gstin, tax_registration_name
    ) values (
      _workspace_id, btrim(_legal_name), lower(btrim(_billing_email)), _customer_type,
      upper(btrim(_country_code)), nullif(upper(btrim(_state_code)), ''),
      nullif(btrim(_postal_code), ''), _address_lines,
      nullif(upper(btrim(_gstin)), ''), nullif(btrim(_tax_registration_name), '')
    ) returning * into profile_row;
  else
    if profile_row.version <> _expected_version then raise exception 'Billing profile changed; refresh before saving'; end if;
    update public.io_billing_profiles
    set legal_name = btrim(_legal_name),
        billing_email = lower(btrim(_billing_email)),
        customer_type = _customer_type,
        country_code = upper(btrim(_country_code)),
        state_code = nullif(upper(btrim(_state_code)), ''),
        postal_code = nullif(btrim(_postal_code), ''),
        address_lines = _address_lines,
        gstin = nullif(upper(btrim(_gstin)), ''),
        tax_registration_name = nullif(btrim(_tax_registration_name), ''),
        verified_at = null,
        verified_by = null,
        version = version + 1,
        updated_at = now()
    where workspace_id = _workspace_id returning * into profile_row;
  end if;
  return jsonb_build_object('ok', true, 'version', profile_row.version, 'verifiedAt', profile_row.verified_at);
end;
$function$;

create or replace function public.admin_io_verify_billing_profile(
  _workspace_id uuid,
  _expected_version integer,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  profile_row public.io_billing_profiles%rowtype;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.has_admin_capability(caller_id, 'billing.manage') then
    raise exception 'Billing management access required' using errcode = '42501';
  end if;
  if char_length(normalized_reason) not between 8 and 500 then raise exception 'Verification reason is invalid'; end if;
  select * into profile_row from public.io_billing_profiles where workspace_id = _workspace_id for update;
  if not found or profile_row.version <> _expected_version then raise exception 'Billing profile changed; refresh before verifying'; end if;
  update public.io_billing_profiles
  set verified_at = now(), verified_by = caller_id, version = version + 1, updated_at = now()
  where workspace_id = _workspace_id returning * into profile_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.manage', 'billing', 'billing_profile.verified',
    'workspace', _workspace_id, normalized_reason,
    jsonb_build_object('version', profile_row.version)
  );
  return jsonb_build_object('ok', true, 'version', profile_row.version, 'verifiedAt', profile_row.verified_at);
end;
$function$;

create or replace function public.admin_io_create_tax_policy_draft(
  _policy jsonb,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  policy_row public.io_tax_policy_versions%rowtype;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.has_admin_capability(caller_id, 'billing.manage') then
    raise exception 'Billing management access required' using errcode = '42501';
  end if;
  if jsonb_typeof(_policy) <> 'object' or pg_column_size(_policy) > 8192
    or char_length(normalized_reason) not between 8 and 500 then
    raise exception 'Tax policy draft is invalid';
  end if;
  insert into public.io_tax_policy_versions (
    policy_key, version, currency_code, seller_country_code, seller_state_code,
    seller_legal_name, seller_address, seller_gstin, service_accounting_code,
    service_description, supply_kind, buyer_country_code, buyer_state_code,
    taxable_base, cgst_basis_points, sgst_basis_points, igst_basis_points,
    evidence_url, effective_from, effective_until, created_by
  ) values (
    _policy ->> 'policyKey', (_policy ->> 'version')::integer,
    upper(_policy ->> 'currencyCode'), upper(_policy ->> 'sellerCountryCode'),
    nullif(upper(_policy ->> 'sellerStateCode'), ''), _policy ->> 'sellerLegalName',
    _policy -> 'sellerAddress', nullif(upper(_policy ->> 'sellerGstin'), ''),
    _policy ->> 'serviceAccountingCode', _policy ->> 'serviceDescription',
    _policy ->> 'supplyKind', upper(_policy ->> 'buyerCountryCode'),
    nullif(upper(_policy ->> 'buyerStateCode'), ''), _policy ->> 'taxableBase',
    coalesce((_policy ->> 'cgstBasisPoints')::integer, 0),
    coalesce((_policy ->> 'sgstBasisPoints')::integer, 0),
    coalesce((_policy ->> 'igstBasisPoints')::integer, 0),
    _policy ->> 'evidenceUrl', (_policy ->> 'effectiveFrom')::timestamptz,
    nullif(_policy ->> 'effectiveUntil', '')::timestamptz, caller_id
  ) returning * into policy_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.manage', 'billing', 'tax_policy.draft_created',
    'tax_policy', policy_row.id, normalized_reason,
    jsonb_build_object('policyKey', policy_row.policy_key, 'version', policy_row.version)
  );
  return jsonb_build_object('ok', true, 'policyId', policy_row.id, 'status', policy_row.status);
end;
$function$;

create or replace function public.admin_io_approve_tax_policy(
  _policy_id uuid,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  policy_row public.io_tax_policy_versions%rowtype;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.is_platform_super_admin(caller_id) then
    raise exception 'Super-admin approval required' using errcode = '42501';
  end if;
  if char_length(normalized_reason) not between 8 and 500 then raise exception 'Approval reason is invalid'; end if;
  select * into policy_row from public.io_tax_policy_versions where id = _policy_id for update;
  if not found or policy_row.status <> 'draft' then raise exception 'Tax policy is not an approvable draft'; end if;
  if policy_row.created_by = caller_id then raise exception 'A second person must approve the tax policy'; end if;
  update public.io_tax_policy_versions
  set status = 'approved', approved_by = caller_id, approved_at = now()
  where id = _policy_id returning * into policy_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.approve', 'billing', 'tax_policy.approved',
    'tax_policy', _policy_id, normalized_reason,
    jsonb_build_object('policyKey', policy_row.policy_key, 'version', policy_row.version)
  );
  return jsonb_build_object('ok', true, 'status', policy_row.status);
end;
$function$;

create or replace function public.admin_io_create_fx_rate_draft(
  _base_currency_code text,
  _quote_currency_code text,
  _rate_numerator bigint,
  _rate_denominator bigint,
  _source_name text,
  _evidence_url text,
  _observed_at timestamptz,
  _effective_from timestamptz,
  _effective_until timestamptz,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  rate_row public.io_fx_rate_versions%rowtype;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.has_admin_capability(caller_id, 'billing.manage') then
    raise exception 'Billing management access required' using errcode = '42501';
  end if;
  if char_length(normalized_reason) not between 8 and 500 then raise exception 'FX evidence reason is invalid'; end if;
  insert into public.io_fx_rate_versions (
    base_currency_code, quote_currency_code, rate_numerator, rate_denominator,
    source_name, evidence_url, observed_at, effective_from, effective_until, created_by
  ) values (
    upper(_base_currency_code), upper(_quote_currency_code), _rate_numerator, _rate_denominator,
    btrim(_source_name), _evidence_url, _observed_at, _effective_from, _effective_until, caller_id
  ) returning * into rate_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.manage', 'billing', 'fx_rate.draft_created', 'fx_rate', rate_row.id,
    normalized_reason, jsonb_build_object('base', rate_row.base_currency_code, 'quote', rate_row.quote_currency_code)
  );
  return jsonb_build_object('ok', true, 'rateId', rate_row.id, 'status', rate_row.status);
end;
$function$;

create or replace function public.admin_io_approve_fx_rate(_rate_id uuid, _reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  rate_row public.io_fx_rate_versions%rowtype;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.is_platform_super_admin(caller_id) then raise exception 'Super-admin approval required' using errcode = '42501'; end if;
  if char_length(normalized_reason) not between 8 and 500 then raise exception 'Approval reason is invalid'; end if;
  select * into rate_row from public.io_fx_rate_versions where id = _rate_id for update;
  if not found or rate_row.status <> 'draft' then raise exception 'FX rate is not an approvable draft'; end if;
  if rate_row.created_by = caller_id then raise exception 'A second person must approve the FX rate'; end if;
  update public.io_fx_rate_versions set status = 'approved', approved_by = caller_id, approved_at = now()
  where id = _rate_id returning * into rate_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.approve', 'billing', 'fx_rate.approved', 'fx_rate', _rate_id,
    normalized_reason, jsonb_build_object('base', rate_row.base_currency_code, 'quote', rate_row.quote_currency_code)
  );
  return jsonb_build_object('ok', true, 'status', rate_row.status);
end;
$function$;

create or replace function public.admin_io_register_payment_processor(
  _provider_key text,
  _environment text,
  _currency_codes text[],
  _merchant_reference text,
  _terms_evidence_url text,
  _refund_policy_url text,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  config_row private.io_payment_processor_configs%rowtype;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.has_admin_capability(caller_id, 'billing.manage') then raise exception 'Billing management access required' using errcode = '42501'; end if;
  if char_length(normalized_reason) not between 8 and 500 then raise exception 'Processor registration reason is invalid'; end if;
  insert into private.io_payment_processor_configs (
    provider_key, environment, currency_codes, merchant_reference,
    terms_evidence_url, refund_policy_url, created_by
  ) values (
    _provider_key, _environment,
    array(select distinct upper(item) from unnest(_currency_codes) as item order by upper(item)),
    btrim(_merchant_reference), _terms_evidence_url, _refund_policy_url, caller_id
  ) returning * into config_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.manage', 'billing', 'payment_processor.draft_created',
    'payment_processor', config_row.id, normalized_reason,
    jsonb_build_object('provider', config_row.provider_key, 'environment', config_row.environment)
  );
  return jsonb_build_object('ok', true, 'configId', config_row.id, 'status', config_row.status);
end;
$function$;

create or replace function public.admin_io_approve_payment_processor(_config_id uuid, _reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  config_row private.io_payment_processor_configs%rowtype;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.is_platform_super_admin(caller_id) then raise exception 'Super-admin approval required' using errcode = '42501'; end if;
  if char_length(normalized_reason) not between 8 and 500 then raise exception 'Approval reason is invalid'; end if;
  select * into config_row from private.io_payment_processor_configs where id = _config_id for update;
  if not found or config_row.status <> 'draft' then raise exception 'Processor config is not an approvable draft'; end if;
  if config_row.created_by = caller_id then raise exception 'A second person must approve the processor'; end if;
  update private.io_payment_processor_configs
  set status = 'approved', approved_by = caller_id, approved_at = now()
  where id = _config_id returning * into config_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.approve', 'billing', 'payment_processor.approved',
    'payment_processor', config_row.id, normalized_reason,
    jsonb_build_object('provider', config_row.provider_key, 'environment', config_row.environment)
  );
  return jsonb_build_object('ok', true, 'status', config_row.status);
end;
$function$;

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
  if not private.has_admin_capability(caller_id, 'billing.manage') then raise exception 'Billing management access required' using errcode = '42501'; end if;
  if _due_days not between 1 and 90 or char_length(normalized_reason) not between 8 and 500 then raise exception 'Invoice issuance request is invalid'; end if;
  select * into invoice_row from public.io_invoices where id = _invoice_id for update;
  if not found or invoice_row.state <> 'draft' then raise exception 'Only a draft invoice can be issued'; end if;
  select * into billing_row from public.io_billing_profiles where workspace_id = invoice_row.workspace_id for update;
  if not found or billing_row.verified_at is null then raise exception 'A verified workspace billing profile is required'; end if;
  select * into policy_row from public.io_tax_policy_versions where id = _tax_policy_id for update;
  if not found or policy_row.status <> 'approved'
    or policy_row.currency_code <> invoice_row.currency_code
    or policy_row.buyer_country_code <> billing_row.country_code
    or policy_row.buyer_state_code is distinct from billing_row.state_code
    or policy_row.effective_from > now()
    or (policy_row.effective_until is not null and policy_row.effective_until <= now()) then
    raise exception 'No approved tax policy matches this invoice and buyer';
  end if;
  if policy_row.supply_kind = 'domestic_intra_state' and policy_row.seller_state_code is distinct from billing_row.state_code then
    raise exception 'Intra-state policy does not match buyer state';
  end if;
  if policy_row.supply_kind = 'domestic_inter_state' and policy_row.seller_state_code is not distinct from billing_row.state_code then
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
  raw_due_nanos := invoice_row.subtotal_nanos + cgst_nanos + sgst_nanos + igst_nanos - invoice_row.credit_applied_nanos;
  rounded_due_nanos := floor(
    (raw_due_nanos::numeric + nanos_per_minor::numeric / 2) / nanos_per_minor::numeric
  )::bigint * nanos_per_minor;
  rounding_delta := rounded_due_nanos - raw_due_nanos;
  update public.io_invoices
  set state = 'issued',
      tax_status = case when policy_row.supply_kind in ('export', 'exempt') then 'not_applicable' else 'assessed' end,
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
          'cgstNanos', cgst_nanos::text, 'sgstNanos', sgst_nanos::text, 'igstNanos', igst_nanos::text
        )
      ),
      tax_policy_version_id = policy_row.id,
      supply_kind = policy_row.supply_kind,
      tax_evidence_url = policy_row.evidence_url,
      payment_state = case when rounded_due_nanos = 0 then 'paid' else 'due' end,
      issued_at = now(), due_at = now() + make_interval(days => _due_days), issued_by = caller_id
  where id = _invoice_id returning * into invoice_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.manage', 'billing', 'invoice.issued', 'invoice', _invoice_id,
    normalized_reason, jsonb_build_object('invoiceNumber', invoice_row.invoice_number, 'taxPolicyId', policy_row.id)
  );
  return jsonb_build_object('ok', true, 'state', invoice_row.state, 'amountDueNanos', invoice_row.amount_due_nanos::text);
end;
$function$;

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
  if caller_id is null or _client_request_id is null then raise exception 'Authentication and client request ID are required' using errcode = '42501'; end if;
  select * into invoice_row from public.io_invoices where id = _invoice_id for update;
  if not found or not private.io_workspace_has_role(invoice_row.workspace_id, null) then raise exception 'Invoice access required' using errcode = '42501'; end if;
  if invoice_row.state not in ('issued', 'paid') or invoice_row.payment_state not in ('due', 'partially_paid') then raise exception 'Invoice is not payable'; end if;
  select * into existing from public.io_payment_intents
  where workspace_id = invoice_row.workspace_id and created_by = caller_id and client_request_id = _client_request_id;
  if found then return jsonb_build_object('ok', true, 'replayed', true, 'paymentIntentId', existing.id, 'state', existing.state, 'provider', existing.provider_key, 'amountMinor', existing.amount_minor, 'currencyCode', existing.currency_code); end if;
  select * into config_row from private.io_payment_processor_configs
  where status = 'approved' and environment = 'live'
    and invoice_row.currency_code = any(currency_codes)
  order by approved_at desc limit 1;
  if not found then raise exception 'No approved live payment processor supports this currency'; end if;
  nanos_per_minor := private.io_currency_nanos_per_minor(invoice_row.currency_code);
  outstanding_nanos := invoice_row.amount_due_nanos - invoice_row.paid_nanos + invoice_row.refunded_nanos;
  if nanos_per_minor is null or outstanding_nanos <= 0 or outstanding_nanos % nanos_per_minor <> 0 then raise exception 'Invoice amount is not payable in exact minor units'; end if;
  insert into public.io_payment_intents (
    workspace_id, invoice_id, processor_config_id, provider_key, environment,
    currency_code, amount_nanos, amount_minor, client_request_id, created_by, expires_at
  ) values (
    invoice_row.workspace_id, invoice_row.id, config_row.id, config_row.provider_key,
    config_row.environment, invoice_row.currency_code, outstanding_nanos,
    outstanding_nanos / nanos_per_minor, _client_request_id, caller_id, now() + interval '30 minutes'
  ) returning * into intent_row;
  return jsonb_build_object('ok', true, 'replayed', false, 'paymentIntentId', intent_row.id, 'state', intent_row.state, 'provider', intent_row.provider_key, 'amountMinor', intent_row.amount_minor, 'currencyCode', intent_row.currency_code, 'invoiceNumber', invoice_row.invoice_number);
end;
$function$;

create or replace function public.record_io_payment_order(
  _payment_intent_id uuid,
  _external_order_id text
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
  select * into intent_row from public.io_payment_intents where id = _payment_intent_id for update;
  if not found then raise exception 'Payment intent does not exist'; end if;
  if intent_row.external_order_id is not null then
    if intent_row.external_order_id <> _external_order_id then raise exception 'Payment order was already recorded differently'; end if;
    return jsonb_build_object('ok', true, 'replayed', true, 'state', intent_row.state);
  end if;
  update public.io_payment_intents set external_order_id = _external_order_id, state = 'order_created', updated_at = now()
  where id = _payment_intent_id returning * into intent_row;
  return jsonb_build_object('ok', true, 'replayed', false, 'state', intent_row.state);
end;
$function$;

create or replace function public.record_io_payment_provider_event(
  _provider_key text,
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
  if _occurred_at < now() - interval '7 days' or _occurred_at > now() + interval '5 minutes' then raise exception 'Payment event timestamp is invalid'; end if;
  select * into intent_row from public.io_payment_intents
  where provider_key = _provider_key and external_order_id = _external_order_id for update;
  if not found then raise exception 'Payment order is unknown'; end if;
  insert into private.io_payment_events (
    provider_key, provider_event_id, event_type, payment_intent_id,
    external_order_id, external_payment_id, external_refund_id,
    amount_minor, currency_code, payload_sha256, occurred_at
  ) values (
    _provider_key, _provider_event_id, _event_type, intent_row.id,
    _external_order_id, nullif(_external_payment_id, ''), nullif(_external_refund_id, ''),
    _amount_minor, nullif(upper(_currency_code), ''), _payload_sha256, _occurred_at
  ) on conflict (provider_key, provider_event_id) do nothing returning id into inserted_event_id;
  if inserted_event_id is null then return jsonb_build_object('ok', true, 'replayed', true); end if;
  nanos_per_minor := private.io_currency_nanos_per_minor(intent_row.currency_code);
  event_nanos := coalesce(_amount_minor, 0) * nanos_per_minor;
  if _event_type = 'payment.captured' then
    if upper(_currency_code) <> intent_row.currency_code or _amount_minor <> intent_row.amount_minor then raise exception 'Captured payment does not match the intent'; end if;
    update public.io_payment_intents
    set state = 'captured', external_payment_id = _external_payment_id,
        captured_at = _occurred_at, updated_at = now()
    where id = intent_row.id;
    select * into invoice_row from public.io_invoices where id = intent_row.invoice_id for update;
    update public.io_invoices
    set paid_nanos = paid_nanos + event_nanos,
        payment_state = case when paid_nanos + event_nanos >= amount_due_nanos then 'paid' else 'partially_paid' end,
        state = case when paid_nanos + event_nanos >= amount_due_nanos then 'paid' else state end
    where id = invoice_row.id;
  elsif _event_type = 'payment.failed' then
    update public.io_payment_intents set state = 'failed', failure_code = 'provider_reported_failure', updated_at = now()
    where id = intent_row.id and state <> 'captured';
  elsif _event_type in ('refund.processed', 'refund.failed') and _external_refund_id is not null then
    select * into refund_row from public.io_refunds where external_refund_id = _external_refund_id for update;
    if found then
      update public.io_refunds
      set state = case when _event_type = 'refund.processed' then 'processed' else 'failed' end,
          completed_at = case when _event_type = 'refund.processed' then _occurred_at else null end,
          failure_code = case when _event_type = 'refund.failed' then 'provider_reported_failure' else null end
      where id = refund_row.id;
      if _event_type = 'refund.processed' then
        update public.io_invoices
        set refunded_nanos = refunded_nanos + refund_row.amount_nanos,
            payment_state = case when refunded_nanos + refund_row.amount_nanos >= paid_nanos then 'refunded' else 'partially_refunded' end
        where id = refund_row.invoice_id;
      end if;
    end if;
  elsif _event_type = 'payment.dispute.created' then
    update public.io_invoices set payment_state = 'disputed' where id = intent_row.invoice_id;
  end if;
  return jsonb_build_object('ok', true, 'replayed', false);
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
  if not private.has_admin_capability(caller_id, 'billing.manage') then raise exception 'Billing management access required' using errcode = '42501'; end if;
  if _client_request_id is null or char_length(normalized_reason) not between 8 and 500 then raise exception 'Refund request is invalid'; end if;
  select * into refund_row from public.io_refunds where requested_by = caller_id and client_request_id = _client_request_id;
  if found then return jsonb_build_object('ok', true, 'replayed', true, 'refundId', refund_row.id, 'state', refund_row.state, 'amountMinor', refund_row.amount_minor, 'externalPaymentId', (select external_payment_id from public.io_payment_intents where id = refund_row.payment_intent_id)); end if;
  select * into intent_row from public.io_payment_intents where id = _payment_intent_id for update;
  if not found or intent_row.state <> 'captured' or intent_row.external_payment_id is null then raise exception 'Only a captured payment can be refunded'; end if;
  select * into invoice_row from public.io_invoices where id = intent_row.invoice_id for update;
  select coalesce(sum(amount_nanos), 0) into already_requested from public.io_refunds
  where payment_intent_id = intent_row.id and state in ('requested', 'submitted', 'processed');
  if _amount_nanos <= 0 or _amount_nanos > intent_row.amount_nanos - already_requested then raise exception 'Refund amount exceeds the refundable balance'; end if;
  nanos_per_minor := private.io_currency_nanos_per_minor(intent_row.currency_code);
  if _amount_nanos % nanos_per_minor <> 0 then raise exception 'Refund amount is not an exact minor-unit value'; end if;
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
  return jsonb_build_object('ok', true, 'replayed', false, 'refundId', refund_row.id, 'state', refund_row.state, 'amountMinor', refund_row.amount_minor, 'currencyCode', refund_row.currency_code, 'provider', intent_row.provider_key, 'externalPaymentId', intent_row.external_payment_id);
end;
$function$;

create or replace function public.record_io_refund_submission(
  _refund_id uuid,
  _external_refund_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare refund_row public.io_refunds%rowtype;
begin
  if current_user <> 'service_role' then
    raise exception 'Payment service role required' using errcode = '42501';
  end if;
  select * into refund_row from public.io_refunds where id = _refund_id for update;
  if not found then raise exception 'Refund does not exist'; end if;
  if refund_row.external_refund_id is not null then
    if refund_row.external_refund_id <> _external_refund_id then raise exception 'Refund was submitted differently'; end if;
    return jsonb_build_object('ok', true, 'replayed', true, 'state', refund_row.state);
  end if;
  update public.io_refunds
  set external_refund_id = _external_refund_id, state = 'submitted', submitted_at = now()
  where id = _refund_id returning * into refund_row;
  return jsonb_build_object('ok', true, 'replayed', false, 'state', refund_row.state);
end;
$function$;

create or replace function public.admin_io_import_provider_statement(
  _provider_id uuid,
  _statement_number text,
  _currency_code text,
  _period_start timestamptz,
  _period_end timestamptz,
  _stated_total_nanos bigint,
  _evidence_url text,
  _content_sha256 text,
  _lines jsonb,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  statement_row public.io_provider_statements%rowtype;
  normalized_reason text := btrim(coalesce(_reason, ''));
  inserted_total bigint;
begin
  if not private.has_admin_capability(caller_id, 'billing.reconcile') then raise exception 'Billing reconciliation access required' using errcode = '42501'; end if;
  if jsonb_typeof(_lines) <> 'array' or jsonb_array_length(_lines) not between 1 and 1000 or pg_column_size(_lines) > 1048576 then raise exception 'Provider statement lines are invalid'; end if;
  if char_length(normalized_reason) not between 8 and 500 then raise exception 'Import reason is invalid'; end if;
  insert into public.io_provider_statements (
    provider_id, statement_number, currency_code, period_start, period_end,
    stated_total_nanos, evidence_url, content_sha256, imported_by
  ) values (
    _provider_id, btrim(_statement_number), upper(_currency_code), _period_start, _period_end,
    _stated_total_nanos, _evidence_url, _content_sha256, caller_id
  ) returning * into statement_row;
  insert into public.io_provider_statement_lines (
    statement_id, external_line_id, provider_request_id, service_date,
    model_reference, input_tokens, output_tokens, amount_nanos, metadata
  )
  select statement_row.id, item ->> 'externalLineId', nullif(item ->> 'providerRequestId', ''),
    (item ->> 'serviceDate')::timestamptz, nullif(item ->> 'modelReference', ''),
    nullif(item ->> 'inputTokens', '')::integer, nullif(item ->> 'outputTokens', '')::integer,
    (item ->> 'amountNanos')::bigint, coalesce(item -> 'metadata', '{}'::jsonb)
  from jsonb_array_elements(_lines) as item;
  select sum(amount_nanos)::bigint into inserted_total from public.io_provider_statement_lines where statement_id = statement_row.id;
  if inserted_total <> _stated_total_nanos then raise exception 'Statement line total does not equal the stated total'; end if;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.reconcile', 'billing', 'provider_statement.imported',
    'provider_statement', statement_row.id, normalized_reason,
    jsonb_build_object('providerId', _provider_id, 'lineCount', jsonb_array_length(_lines))
  );
  return jsonb_build_object('ok', true, 'statementId', statement_row.id, 'lineCount', jsonb_array_length(_lines));
end;
$function$;

create or replace function public.admin_io_reconcile_provider_statement(
  _statement_id uuid,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  statement_row public.io_provider_statements%rowtype;
  run_row public.io_provider_reconciliation_runs%rowtype;
  normalized_reason text := btrim(coalesce(_reason, ''));
  matched_total bigint;
  matched_count integer;
  exception_count integer;
begin
  if not private.has_admin_capability(caller_id, 'billing.reconcile') then raise exception 'Billing reconciliation access required' using errcode = '42501'; end if;
  if char_length(normalized_reason) not between 8 and 500 then raise exception 'Reconciliation reason is invalid'; end if;
  select * into statement_row from public.io_provider_statements where id = _statement_id for update;
  if not found then raise exception 'Provider statement does not exist'; end if;

  with matches as (
    select line.id as line_id,
      case when count(attempt.id) = 1 then min(attempt.id::text)::uuid else null end as attempt_id,
      case when count(attempt.id) = 1 then min(attempt.receipt_id::text)::uuid else null end as receipt_id,
      count(attempt.id)::integer as match_count
    from public.io_provider_statement_lines as line
    left join public.io_provider_attempts as attempt
      on attempt.provider_id = statement_row.provider_id
      and attempt.provider_request_id = line.provider_request_id
    where line.statement_id = statement_row.id
    group by line.id
  ), assessed as (
    select line.id as line_id, matches.attempt_id, matches.receipt_id,
      line.amount_nanos as stated_nanos,
      usage.provider_cost_nanos as expected_nanos,
      case
        when line.provider_request_id is null or matches.match_count = 0 then 'unmatched'
        when matches.match_count > 1 then 'ambiguous'
        when receipt.selected_currency_code <> statement_row.currency_code then 'currency_mismatch'
        when usage.provider_cost_nanos is null or usage.provider_cost_nanos <> line.amount_nanos then 'amount_mismatch'
        else 'matched'
      end as result_state
    from public.io_provider_statement_lines as line
    join matches on matches.line_id = line.id
    left join public.io_route_receipts as receipt on receipt.id = matches.receipt_id
    left join public.io_usage_records as usage on usage.receipt_id = matches.receipt_id
    where line.statement_id = statement_row.id
  )
  select coalesce(sum(expected_nanos) filter (where result_state = 'matched'), 0)::bigint,
    count(*) filter (where result_state = 'matched')::integer,
    count(*) filter (where result_state <> 'matched')::integer
  into matched_total, matched_count, exception_count from assessed;

  insert into public.io_provider_reconciliation_runs (
    statement_id, matched_count, exception_count, expected_total_nanos,
    stated_total_nanos, delta_nanos, run_by
  ) values (
    statement_row.id, matched_count, exception_count, matched_total,
    statement_row.stated_total_nanos, statement_row.stated_total_nanos - matched_total, caller_id
  ) returning * into run_row;

  with matches as (
    select line.id as line_id,
      case when count(attempt.id) = 1 then min(attempt.id::text)::uuid else null end as attempt_id,
      case when count(attempt.id) = 1 then min(attempt.receipt_id::text)::uuid else null end as receipt_id,
      count(attempt.id)::integer as match_count
    from public.io_provider_statement_lines as line
    left join public.io_provider_attempts as attempt
      on attempt.provider_id = statement_row.provider_id
      and attempt.provider_request_id = line.provider_request_id
    where line.statement_id = statement_row.id
    group by line.id
  )
  insert into public.io_provider_reconciliation_results (
    run_id, statement_line_id, attempt_id, receipt_id, result_state,
    expected_nanos, stated_nanos, delta_nanos, reason_code
  )
  select run_row.id, line.id, matches.attempt_id, matches.receipt_id,
    case
      when line.provider_request_id is null or matches.match_count = 0 then 'unmatched'
      when matches.match_count > 1 then 'ambiguous'
      when receipt.selected_currency_code <> statement_row.currency_code then 'currency_mismatch'
      when usage.provider_cost_nanos is null or usage.provider_cost_nanos <> line.amount_nanos then 'amount_mismatch'
      else 'matched'
    end,
    usage.provider_cost_nanos, line.amount_nanos,
    case when usage.provider_cost_nanos is null then null else line.amount_nanos - usage.provider_cost_nanos end,
    case
      when line.provider_request_id is null then 'provider_request_missing'
      when matches.match_count = 0 then 'provider_request_unmatched'
      when matches.match_count > 1 then 'provider_request_ambiguous'
      when receipt.selected_currency_code <> statement_row.currency_code then 'currency_mismatch'
      when usage.provider_cost_nanos is null then 'expected_cost_missing'
      when usage.provider_cost_nanos <> line.amount_nanos then 'amount_mismatch'
      else 'exact_match'
    end
  from public.io_provider_statement_lines as line
  join matches on matches.line_id = line.id
  left join public.io_route_receipts as receipt on receipt.id = matches.receipt_id
  left join public.io_usage_records as usage on usage.receipt_id = matches.receipt_id
  where line.statement_id = statement_row.id;

  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'billing.reconcile', 'billing', 'provider_statement.reconciled',
    'provider_statement', statement_row.id, normalized_reason,
    jsonb_build_object('runId', run_row.id, 'matchedCount', matched_count, 'exceptionCount', exception_count)
  );
  return jsonb_build_object('ok', true, 'runId', run_row.id, 'matchedCount', matched_count, 'exceptionCount', exception_count, 'deltaNanos', run_row.delta_nanos::text);
end;
$function$;

create or replace function public.admin_io_finance_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare caller_id uuid := (select auth.uid());
begin
  if not private.has_admin_capability(caller_id, 'billing.read') then raise exception 'Billing read access required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'billingProfiles', coalesce((select jsonb_agg(jsonb_build_object(
      'workspaceId', profile.workspace_id, 'workspaceName', workspace.name,
      'legalName', profile.legal_name, 'countryCode', profile.country_code,
      'stateCode', profile.state_code, 'gstinPresent', profile.gstin is not null,
      'verifiedAt', profile.verified_at, 'version', profile.version
    ) order by profile.updated_at desc) from public.io_billing_profiles as profile
      join public.io_workspaces as workspace on workspace.id = profile.workspace_id), '[]'::jsonb),
    'taxPolicies', coalesce((select jsonb_agg(jsonb_build_object(
      'id', policy.id, 'policyKey', policy.policy_key, 'version', policy.version,
      'status', policy.status, 'currencyCode', policy.currency_code,
      'supplyKind', policy.supply_kind, 'buyerCountryCode', policy.buyer_country_code,
      'buyerStateCode', policy.buyer_state_code, 'effectiveFrom', policy.effective_from,
      'effectiveUntil', policy.effective_until, 'createdAt', policy.created_at
    ) order by policy.created_at desc) from public.io_tax_policy_versions as policy), '[]'::jsonb),
    'fxRates', coalesce((select jsonb_agg(jsonb_build_object(
      'id', rate.id, 'base', rate.base_currency_code, 'quote', rate.quote_currency_code,
      'numerator', rate.rate_numerator::text, 'denominator', rate.rate_denominator::text,
      'status', rate.status, 'source', rate.source_name, 'observedAt', rate.observed_at,
      'effectiveFrom', rate.effective_from, 'effectiveUntil', rate.effective_until
    ) order by rate.created_at desc) from public.io_fx_rate_versions as rate), '[]'::jsonb),
    'processors', coalesce((select jsonb_agg(jsonb_build_object(
      'id', config.id, 'provider', config.provider_key, 'environment', config.environment,
      'status', config.status, 'currencyCodes', config.currency_codes,
      'merchantReference', config.merchant_reference, 'approvedAt', config.approved_at
    ) order by config.created_at desc) from private.io_payment_processor_configs as config), '[]'::jsonb),
    'invoices', coalesce((select jsonb_agg(jsonb_build_object(
      'id', invoice.id, 'workspaceId', invoice.workspace_id, 'workspaceName', workspace.name,
      'invoiceNumber', invoice.invoice_number, 'currencyCode', invoice.currency_code,
      'state', invoice.state, 'paymentState', invoice.payment_state,
      'amountDueNanos', invoice.amount_due_nanos::text, 'paidNanos', invoice.paid_nanos::text,
      'refundedNanos', invoice.refunded_nanos::text, 'createdAt', invoice.created_at,
      'issuedAt', invoice.issued_at, 'dueAt', invoice.due_at
    ) order by invoice.created_at desc) from (
      select source.* from public.io_invoices as source
      order by source.created_at desc limit 100
    ) as invoice
      join public.io_workspaces as workspace on workspace.id = invoice.workspace_id), '[]'::jsonb),
    'refunds', coalesce((select jsonb_agg(jsonb_build_object(
      'id', refund.id, 'invoiceId', refund.invoice_id, 'state', refund.state,
      'currencyCode', refund.currency_code, 'amountNanos', refund.amount_nanos::text,
      'reason', refund.reason, 'requestedAt', refund.requested_at
    ) order by refund.requested_at desc) from (
      select source.* from public.io_refunds as source
      order by source.requested_at desc limit 100
    ) as refund), '[]'::jsonb),
    'statements', coalesce((select jsonb_agg(jsonb_build_object(
      'id', statement.id, 'providerId', statement.provider_id,
      'providerName', provider.display_name, 'statementNumber', statement.statement_number,
      'currencyCode', statement.currency_code, 'statedTotalNanos', statement.stated_total_nanos::text,
      'periodStart', statement.period_start, 'periodEnd', statement.period_end,
      'importedAt', statement.imported_at,
      'latestRun', (select jsonb_build_object(
        'id', run.id, 'matchedCount', run.matched_count, 'exceptionCount', run.exception_count,
        'deltaNanos', run.delta_nanos::text, 'runAt', run.run_at
      ) from public.io_provider_reconciliation_runs as run where run.statement_id = statement.id
        order by run.run_at desc limit 1)
    ) order by statement.imported_at desc) from (
      select source.* from public.io_provider_statements as source
      order by source.imported_at desc limit 100
    ) as statement
      join public.io_providers as provider on provider.id = statement.provider_id), '[]'::jsonb)
  );
end;
$function$;

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
declare caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not private.io_workspace_has_role(_workspace_id, null) then raise exception 'Active workspace membership required' using errcode = '42501'; end if;
  if _limit not between 1 and 100 then raise exception 'Invoice history limit is invalid'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', invoice.id, 'invoiceNumber', invoice.invoice_number,
    'currencyCode', invoice.currency_code, 'periodStart', invoice.period_start,
    'periodEnd', invoice.period_end, 'state', invoice.state,
    'paymentState', invoice.payment_state,
    'providerCostNanos', invoice.provider_cost_nanos::text,
    'serviceFeeNanos', invoice.service_fee_nanos::text,
    'subtotalNanos', invoice.subtotal_nanos::text,
    'creditAppliedNanos', invoice.credit_applied_nanos::text,
    'taxNanos', invoice.tax_nanos::text, 'roundingNanos', invoice.rounding_nanos::text,
    'totalNanos', invoice.total_nanos::text, 'amountDueNanos', invoice.amount_due_nanos::text,
    'paidNanos', invoice.paid_nanos::text, 'refundedNanos', invoice.refunded_nanos::text,
    'taxStatus', invoice.tax_status, 'supplyKind', invoice.supply_kind,
    'createdAt', invoice.created_at, 'issuedAt', invoice.issued_at,
    'dueAt', invoice.due_at,
    'lineCount', (select count(*) from public.io_invoice_lines as line where line.invoice_id = invoice.id)
  ) order by invoice.created_at desc, invoice.id desc)
  from (select source.* from public.io_invoices as source
    where source.workspace_id = _workspace_id
      and (source.state <> 'draft' or private.io_workspace_has_role(_workspace_id, array['owner', 'admin']))
    order by source.created_at desc, source.id desc limit _limit) as invoice), '[]'::jsonb);
end;
$function$;

revoke all on function public.get_my_io_billing_profile(uuid) from public, anon;
revoke all on function public.upsert_my_io_billing_profile(uuid, text, text, text, text, text, text, jsonb, text, text, integer) from public, anon;
revoke all on function public.admin_io_verify_billing_profile(uuid, integer, text) from public, anon;
revoke all on function public.admin_io_create_tax_policy_draft(jsonb, text) from public, anon;
revoke all on function public.admin_io_approve_tax_policy(uuid, text) from public, anon;
revoke all on function public.admin_io_create_fx_rate_draft(text, text, bigint, bigint, text, text, timestamptz, timestamptz, timestamptz, text) from public, anon;
revoke all on function public.admin_io_approve_fx_rate(uuid, text) from public, anon;
revoke all on function public.admin_io_register_payment_processor(text, text, text[], text, text, text, text) from public, anon;
revoke all on function public.admin_io_approve_payment_processor(uuid, text) from public, anon;
revoke all on function public.admin_io_issue_invoice(uuid, uuid, integer, text) from public, anon;
revoke all on function public.create_my_io_payment_intent(uuid, uuid) from public, anon;
revoke all on function public.record_io_payment_order(uuid, text) from public, anon, authenticated;
revoke all on function public.record_io_payment_provider_event(text, text, text, text, text, text, bigint, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_io_request_refund(uuid, bigint, text, uuid) from public, anon;
revoke all on function public.record_io_refund_submission(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_io_import_provider_statement(uuid, text, text, timestamptz, timestamptz, bigint, text, text, jsonb, text) from public, anon;
revoke all on function public.admin_io_reconcile_provider_statement(uuid, text) from public, anon;
revoke all on function public.admin_io_finance_snapshot() from public, anon;
revoke all on function public.list_my_io_invoices(uuid, integer) from public, anon;

grant execute on function public.get_my_io_billing_profile(uuid) to authenticated, service_role;
grant execute on function public.upsert_my_io_billing_profile(uuid, text, text, text, text, text, text, jsonb, text, text, integer) to authenticated, service_role;
grant execute on function public.admin_io_verify_billing_profile(uuid, integer, text) to authenticated, service_role;
grant execute on function public.admin_io_create_tax_policy_draft(jsonb, text) to authenticated, service_role;
grant execute on function public.admin_io_approve_tax_policy(uuid, text) to authenticated, service_role;
grant execute on function public.admin_io_create_fx_rate_draft(text, text, bigint, bigint, text, text, timestamptz, timestamptz, timestamptz, text) to authenticated, service_role;
grant execute on function public.admin_io_approve_fx_rate(uuid, text) to authenticated, service_role;
grant execute on function public.admin_io_register_payment_processor(text, text, text[], text, text, text, text) to authenticated, service_role;
grant execute on function public.admin_io_approve_payment_processor(uuid, text) to authenticated, service_role;
grant execute on function public.admin_io_issue_invoice(uuid, uuid, integer, text) to authenticated, service_role;
grant execute on function public.create_my_io_payment_intent(uuid, uuid) to authenticated, service_role;
grant execute on function public.record_io_payment_order(uuid, text) to service_role;
grant execute on function public.record_io_payment_provider_event(text, text, text, text, text, text, bigint, text, text, timestamptz) to service_role;
grant execute on function public.admin_io_request_refund(uuid, bigint, text, uuid) to authenticated, service_role;
grant execute on function public.record_io_refund_submission(uuid, text) to service_role;
grant execute on function private.io_currency_nanos_per_minor(text) to service_role;
grant execute on function public.admin_io_import_provider_statement(uuid, text, text, timestamptz, timestamptz, bigint, text, text, jsonb, text) to authenticated, service_role;
grant execute on function public.admin_io_reconcile_provider_statement(uuid, text) to authenticated, service_role;
grant execute on function public.admin_io_finance_snapshot() to authenticated, service_role;
grant execute on function public.list_my_io_invoices(uuid, integer) to authenticated, service_role;

comment on table public.io_tax_policy_versions is
  'Versioned tax decision evidence. Drafts do not authorize invoice issuance; approval must come from a second super-admin.';
comment on table private.io_payment_events is
  'Redacted, idempotent provider-event evidence. Raw payment webhook payloads are never stored.';
comment on table public.io_provider_reconciliation_results is
  'Immutable per-run provider statement comparison using provider request identifiers and exact nanos.';
