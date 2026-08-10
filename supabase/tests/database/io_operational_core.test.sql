begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(46);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'io-core-admin@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"I/O core admin"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'io-core-member@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"I/O core member"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'io-core-outsider@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"I/O core outsider"}'::jsonb,
    now(),
    now()
  );

insert into public.user_roles (user_id, role)
values ('11000000-0000-4000-8000-000000000001', 'admin');

insert into public.io_workspaces (id, slug, name, created_by)
values (
  '12000000-0000-4000-8000-000000000001',
  'io-core-test',
  'I/O core test workspace',
  '11000000-0000-4000-8000-000000000002'
);

insert into public.io_workspace_members (workspace_id, user_id, role, status)
values (
  '12000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002',
  'owner',
  'active'
);

insert into public.io_capacity_sources (
  id,
  source_key,
  display_name,
  operator_name,
  provenance,
  procurement_model,
  access_mode,
  status,
  created_by
) values (
  '13000000-0000-4000-8000-000000000001',
  'io-core-capacity',
  'I/O core capacity',
  'Indus Orbit test operator',
  'partner_provider',
  'pay_as_you_go',
  'pooled',
  'active',
  '11000000-0000-4000-8000-000000000001'
);

insert into public.io_providers (
  id,
  provider_key,
  display_name,
  provider_kind,
  integration_style,
  lifecycle_state,
  catalogue_visibility,
  operator_name,
  created_by
) values (
  '14000000-0000-4000-8000-000000000001',
  'io-core-provider',
  'I/O Core Provider',
  'direct_api',
  'openai_compatible',
  'active',
  'listed',
  'Indus Orbit test operator',
  '11000000-0000-4000-8000-000000000001'
);

insert into public.io_models (
  id,
  provider_id,
  provider_model_id,
  display_name,
  revision,
  modalities,
  max_context_tokens,
  listing_state,
  released_at,
  auto_route_tier,
  created_by
) values (
  '15000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000001',
  'io-core-model',
  'I/O Core Model',
  'test-v1',
  array['text']::text[],
  8192,
  'listed',
  date '2026-01-01',
  'balanced',
  '11000000-0000-4000-8000-000000000001'
);

insert into public.io_model_endpoints (
  id,
  provider_id,
  model_id,
  capacity_source_id,
  endpoint_key,
  capacity_mode,
  routing_state,
  member_visible,
  retention_class,
  created_by
) values (
  '16000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000001',
  '15000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000001',
  'io-core-endpoint',
  'direct_api',
  'active',
  true,
  'contractual_no_training',
  '11000000-0000-4000-8000-000000000001'
);

insert into public.io_budget_limits (
  id,
  workspace_id,
  currency_code,
  hard_limit_minor,
  period_start,
  period_end,
  reason,
  created_by,
  updated_by
) values (
  '17000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  'USD',
  1000,
  now() - interval '1 day',
  now() + interval '29 days',
  'Test budget for atomic reservation contracts.',
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.io_begin_route_request(uuid,uuid,text,text,uuid,uuid,text,bigint)',
    'execute'
  ),
  'browser users cannot begin trusted route requests'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.io_begin_route_request(uuid,uuid,text,text,uuid,uuid,text,bigint)',
    'execute'
  ),
  'service role can begin trusted route requests'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.io_finalize_route_request(uuid,text,text,jsonb,jsonb,integer,integer,bigint,text,integer,integer,bigint,jsonb,jsonb)',
    'execute'
  ),
  'browser users cannot finalize trusted route requests'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.io_finalize_route_request(uuid,text,text,jsonb,jsonb,integer,integer,bigint,text,integer,integer,bigint,jsonb,jsonb)',
    'execute'
  ),
  'service role can finalize trusted route requests'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.io_record_endpoint_outcome(uuid,boolean,integer,text)',
    'execute'
  ),
  'browser users cannot forge endpoint health'
);

set local role service_role;

select is(
  public.io_begin_route_request(
    '12000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002',
    'request:test:success',
    repeat('a', 64),
    '18000000-0000-4000-8000-000000000001',
    '16000000-0000-4000-8000-000000000001',
    'usd',
    400
  ) ->> 'replayed',
  'false',
  'first request atomically reserves its budget'
);

select is(
  (select state from public.io_usage_reservations where request_id = '18000000-0000-4000-8000-000000000001'),
  'reserved',
  'reservation starts active'
);

select is(
  (select reserved_minor from public.io_usage_reservations where request_id = '18000000-0000-4000-8000-000000000001'),
  400::bigint,
  'reservation preserves integer minor units'
);

select is(
  (select count(*) from private.io_ledger_transactions where request_id = '18000000-0000-4000-8000-000000000001'),
  1::bigint,
  'reserve creates one ledger transaction'
);

select is(
  (
    select sum(entry.amount_minor)
    from private.io_ledger_entries as entry
    join private.io_ledger_transactions as ledger_transaction on ledger_transaction.id = entry.transaction_id
    where ledger_transaction.request_id = '18000000-0000-4000-8000-000000000001'
  ),
  0::numeric,
  'reserve ledger entries balance to zero'
);

select is(
  public.io_begin_route_request(
    '12000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002',
    'request:test:success',
    repeat('a', 64),
    '18000000-0000-4000-8000-000000000099',
    '16000000-0000-4000-8000-000000000001',
    'USD',
    400
  ) ->> 'replayed',
  'true',
  'same idempotency key and fingerprint replays without a new hold'
);

select is(
  (select count(*) from public.io_usage_reservations),
  1::bigint,
  'idempotent replay creates no duplicate reservation'
);

select throws_ok(
  $$
    select public.io_begin_route_request(
      '12000000-0000-4000-8000-000000000001',
      '11000000-0000-4000-8000-000000000002',
      'request:test:success',
      repeat('b', 64),
      '18000000-0000-4000-8000-000000000098',
      '16000000-0000-4000-8000-000000000001',
      'USD',
      400
    )
  $$,
  'P0001',
  'Idempotency key was already used for a different request',
  'same key with different fingerprint fails closed'
);

select throws_ok(
  $$
    select public.io_begin_route_request(
      '12000000-0000-4000-8000-000000000001',
      '11000000-0000-4000-8000-000000000002',
      'request:test:over-budget',
      repeat('c', 64),
      '18000000-0000-4000-8000-000000000002',
      '16000000-0000-4000-8000-000000000001',
      'USD',
      601
    )
  $$,
  'P0001',
  'Workspace budget would be exceeded',
  'hard budget includes active holds and rejects overspend'
);

select is(
  public.io_finalize_route_request(
    '18000000-0000-4000-8000-000000000001',
    'completed',
    'latest_affordable',
    jsonb_build_object(
      'provider_id', '14000000-0000-4000-8000-000000000001',
      'model_id', '15000000-0000-4000-8000-000000000001',
      'endpoint_id', '16000000-0000-4000-8000-000000000001',
      'capacity_source_id', '13000000-0000-4000-8000-000000000001',
      'provider_key', 'io-core-provider',
      'model_key', 'io-core-model',
      'capacity_mode', 'direct_api',
      'region_code', null,
      'residency_country_code', null,
      'retention_class', 'contractual_no_training',
      'capability_version', 1,
      'price_version', 1
    ),
    jsonb_build_array(jsonb_build_object(
      'provider_id', '14000000-0000-4000-8000-000000000001',
      'model_id', '15000000-0000-4000-8000-000000000001',
      'endpoint_id', '16000000-0000-4000-8000-000000000001',
      'state', 'completed',
      'started_at', now() - interval '1 second',
      'completed_at', now(),
      'input_tokens', 100,
      'output_tokens', 50
    )),
    1,
    0,
    300000000,
    'USD',
    100,
    50,
    250,
    '{"strategy":"latest_affordable","budget":"hard"}'::jsonb,
    '[]'::jsonb
  ) ->> 'state',
  'completed',
  'finalization atomically records a successful route'
);

select is(
  (select state from public.io_usage_reservations where request_id = '18000000-0000-4000-8000-000000000001'),
  'settled',
  'successful route settles its reservation'
);

select is(
  (select settled_minor from public.io_usage_reservations where request_id = '18000000-0000-4000-8000-000000000001'),
  250::bigint,
  'settlement uses actual integer minor units'
);

select is(
  (select amount_minor from public.io_usage_records where request_id = '18000000-0000-4000-8000-000000000001'),
  250::bigint,
  'settled usage is linked to the route receipt'
);

select is(
  (select count(*) from public.io_route_receipts where request_id = '18000000-0000-4000-8000-000000000001'),
  1::bigint,
  'finalization writes one immutable route receipt'
);

select is(
  (select count(*) from public.io_provider_attempts where receipt_id = (
    select id from public.io_route_receipts where request_id = '18000000-0000-4000-8000-000000000001'
  )),
  1::bigint,
  'receipt and attempts are committed in the same transaction'
);

select is(
  public.io_finalize_route_request(
    '18000000-0000-4000-8000-000000000001',
    'completed',
    'latest_affordable',
    '{}'::jsonb,
    '[]'::jsonb,
    0,
    0,
    0,
    'USD',
    null,
    null,
    0,
    '{}'::jsonb,
    '[]'::jsonb
  ) ->> 'replayed',
  'true',
  'finalization replay returns the original terminal result'
);

select is(
  (select count(*) from public.io_route_receipts where request_id = '18000000-0000-4000-8000-000000000001'),
  1::bigint,
  'finalization replay creates no duplicate receipt'
);

select is(
  (select count(*) from private.io_ledger_transactions where request_id = '18000000-0000-4000-8000-000000000001'),
  2::bigint,
  'completed route has reserve and settle transactions'
);

select results_eq(
  $$
    select coalesce(sum(entry.amount_minor), 0)::bigint
    from private.io_ledger_entries as entry
    join private.io_ledger_transactions as ledger_transaction on ledger_transaction.id = entry.transaction_id
    where ledger_transaction.request_id = '18000000-0000-4000-8000-000000000001'
    group by ledger_transaction.id
    order by ledger_transaction.transaction_kind
  $$,
  array[0::bigint, 0::bigint],
  'every route ledger transaction independently balances'
);

select is(
  public.io_begin_route_request(
    '12000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002',
    'request:test:failed',
    repeat('d', 64),
    '18000000-0000-4000-8000-000000000003',
    '16000000-0000-4000-8000-000000000001',
    'USD',
    300
  ) ->> 'state',
  'reserved',
  'second request reserves remaining budget'
);

select is(
  public.io_finalize_route_request(
    '18000000-0000-4000-8000-000000000003',
    'failed',
    'latest_affordable',
    jsonb_build_object(
      'provider_id', '14000000-0000-4000-8000-000000000001',
      'model_id', '15000000-0000-4000-8000-000000000001',
      'endpoint_id', '16000000-0000-4000-8000-000000000001',
      'capacity_source_id', '13000000-0000-4000-8000-000000000001',
      'provider_key', 'io-core-provider',
      'model_key', 'io-core-model',
      'capacity_mode', 'direct_api',
      'retention_class', 'contractual_no_training',
      'capability_version', 1,
      'price_version', 1
    ),
    jsonb_build_array(jsonb_build_object(
      'provider_id', '14000000-0000-4000-8000-000000000001',
      'model_id', '15000000-0000-4000-8000-000000000001',
      'endpoint_id', '16000000-0000-4000-8000-000000000001',
      'state', 'failed',
      'error_code', 'upstream_failure',
      'upstream_status', 502,
      'started_at', now() - interval '1 second',
      'completed_at', now()
    )),
    1,
    0,
    300000000,
    'USD',
    null,
    null,
    0,
    '{"strategy":"latest_affordable","budget":"hard"}'::jsonb,
    '[]'::jsonb
  ) ->> 'state',
  'failed',
  'failed route finalizes without charging provider cost'
);

select is(
  (select state from public.io_usage_reservations where request_id = '18000000-0000-4000-8000-000000000003'),
  'released',
  'failed route releases its reservation'
);

select is(
  (select count(*) from public.io_usage_records where request_id = '18000000-0000-4000-8000-000000000003'),
  0::bigint,
  'failed route creates no settled usage record'
);

select is(
  public.io_begin_route_request(
    '12000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002',
    'request:test:stale',
    repeat('f', 64),
    '18000000-0000-4000-8000-000000000005',
    '16000000-0000-4000-8000-000000000001',
    'USD',
    100
  ) ->> 'state',
  'reserved',
  'stale-request fixture starts with a durable hold'
);

update public.io_usage_reservations
set created_at = now() - interval '2 minutes', expires_at = now() - interval '1 minute'
where request_id = '18000000-0000-4000-8000-000000000005';

select is(
  public.io_begin_route_request(
    '12000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002',
    'request:test:after-stale',
    repeat('0', 64),
    '18000000-0000-4000-8000-000000000006',
    '16000000-0000-4000-8000-000000000001',
    'USD',
    1
  ) ->> 'state',
  'reserved',
  'a new request performs stale-hold housekeeping before reserving'
);

select is(
  (select state from public.io_usage_reservations where request_id = '18000000-0000-4000-8000-000000000005'),
  'expired',
  'stale reservation becomes terminal and no longer consumes budget'
);

select is(
  (select state from private.io_idempotency_records where request_id = '18000000-0000-4000-8000-000000000005'),
  'expired',
  'stale idempotency record becomes explicitly retryable with a new key'
);

select is(
  (
    select coalesce(sum(entry.amount_minor), 0)::bigint
    from private.io_ledger_entries as entry
    join private.io_ledger_transactions as ledger_transaction
      on ledger_transaction.id = entry.transaction_id
    where ledger_transaction.request_id = '18000000-0000-4000-8000-000000000005'
      and ledger_transaction.transaction_kind = 'expire'
  ),
  0::bigint,
  'expiration releases the hold through a balanced ledger transaction'
);

select is(
  public.io_finalize_route_request(
    '18000000-0000-4000-8000-000000000006',
    'failed',
    'latest_affordable',
    jsonb_build_object(
      'provider_id', '14000000-0000-4000-8000-000000000001',
      'model_id', '15000000-0000-4000-8000-000000000001',
      'endpoint_id', '16000000-0000-4000-8000-000000000001',
      'capacity_source_id', '13000000-0000-4000-8000-000000000001',
      'provider_key', 'io-core-provider',
      'model_key', 'io-core-model',
      'capacity_mode', 'direct_api',
      'retention_class', 'contractual_no_training',
      'capability_version', 1,
      'price_version', 1
    ),
    '[]'::jsonb,
    1,
    0,
    1,
    'USD',
    null,
    null,
    0,
    '{"strategy":"latest_affordable","budget":"hard"}'::jsonb,
    '[]'::jsonb
  ) ->> 'state',
  'failed',
  'housekeeping trigger request releases normally'
);

select is(
  (select count(*) from private.io_endpoint_health_samples),
  0::bigint,
  'health evidence starts empty rather than invented'
);

select public.io_record_endpoint_outcome(
  '16000000-0000-4000-8000-000000000001', false, 100, 'upstream_failure'
) from generate_series(1, 5);

select is(
  (select circuit_state from private.io_endpoint_circuit_states where endpoint_id = '16000000-0000-4000-8000-000000000001'),
  'open',
  'five consecutive failures open the endpoint circuit'
);

select is(
  (select consecutive_failures from private.io_endpoint_circuit_states where endpoint_id = '16000000-0000-4000-8000-000000000001'),
  5,
  'circuit preserves its consecutive failure count'
);

select throws_ok(
  $$
    select public.io_begin_route_request(
      '12000000-0000-4000-8000-000000000001',
      '11000000-0000-4000-8000-000000000002',
      'request:test:circuit',
      repeat('e', 64),
      '18000000-0000-4000-8000-000000000004',
      '16000000-0000-4000-8000-000000000001',
      'USD',
      1
    )
  $$,
  'P0001',
  'Selected endpoint circuit is open',
  'open endpoint circuit blocks a new reservation'
);

select is(
  public.io_record_endpoint_outcome(
    '16000000-0000-4000-8000-000000000001', true, 80, null
  ) ->> 'circuitState',
  'closed',
  'successful outcome closes the automatic circuit'
);

select is(
  (select health_state from private.io_endpoint_health_samples order by id desc limit 1),
  'healthy',
  'successful outcome records fresh healthy evidence'
);

reset role;
set local "request.jwt.claim.sub" = '11000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  (public.get_my_io_budget_status('12000000-0000-4000-8000-000000000001') -> 0 ->> 'spentMinor'),
  '250',
  'workspace member sees settled budget evidence'
);

select is(
  (select count(*) from public.io_usage_records),
  1::bigint,
  'workspace member reads only its RLS-scoped usage'
);

reset role;
set local "request.jwt.claim.sub" = '11000000-0000-4000-8000-000000000003';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  (select count(*) from public.io_usage_records),
  0::bigint,
  'unrelated member cannot read workspace usage'
);

select throws_ok(
  $$ select public.get_my_io_budget_status('12000000-0000-4000-8000-000000000001') $$,
  '42501',
  'Active workspace membership required',
  'unrelated member cannot read the workspace budget projection'
);

reset role;
set local "request.jwt.claim.sub" = '11000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  (select spent_minor from public.admin_io_budget_snapshot() where workspace_id = '12000000-0000-4000-8000-000000000001'),
  '250',
  'authorized operator sees redacted workspace budget evidence'
);

select is(
  (select circuit_state from public.admin_io_endpoint_health_snapshot() where endpoint_id = '16000000-0000-4000-8000-000000000001'),
  'closed',
  'authorized operator sees endpoint circuit evidence'
);

select * from finish();
rollback;
