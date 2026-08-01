begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(30);

-- Fixed IDs keep failures readable and make the conformance tie-break test
-- deterministic. The transaction is rolled back at the end of the suite.
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
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'io-eligibility-admin@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"I/O eligibility admin"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'io-eligibility-member@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"I/O eligibility member"}'::jsonb,
    now(),
    now()
  );

insert into public.user_roles (user_id, role)
values ('10000000-0000-4000-8000-000000000001', 'admin');

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
  '20000000-0000-4000-8000-000000000001',
  'eligibility-test-capacity',
  'Eligibility test capacity',
  'Indus Orbit test operator',
  'partner_provider',
  'pay_as_you_go',
  'pooled',
  'active',
  '10000000-0000-4000-8000-000000000001'
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
  '30000000-0000-4000-8000-000000000001',
  'eligibility-test',
  'Eligibility Test Provider',
  'direct_api',
  'openai_compatible',
  'active',
  'listed',
  'Indus Orbit test operator',
  '10000000-0000-4000-8000-000000000001'
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
) values
  (
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'eligibility-model-a',
    'Eligibility Model A',
    'test-v1',
    array['text']::text[],
    8192,
    'listed',
    date '2026-01-01',
    'balanced',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    'eligibility-model-b',
    'Eligibility Model B',
    'test-v1',
    array['text']::text[],
    8192,
    'listed',
    date '2026-01-02',
    'balanced',
    '10000000-0000-4000-8000-000000000001'
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
) values
  (
    '50000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'eligibility-endpoint-a',
    'direct_api',
    'active',
    true,
    'contractual_no_training',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'eligibility-endpoint-b',
    'direct_api',
    'active',
    true,
    'contractual_no_training',
    '10000000-0000-4000-8000-000000000001'
  );

insert into private.io_endpoint_connections (
  endpoint_id,
  connection_mode,
  endpoint_base_url,
  secret_reference,
  connection_state
) values
  (
    '50000000-0000-4000-8000-000000000001',
    'server_secret',
    'https://a.example.invalid/v1',
    'IO_PROVIDER_ELIGIBILITY_A_API_KEY',
    'ready'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    'server_secret',
    'https://b.example.invalid/v1',
    'IO_PROVIDER_ELIGIBILITY_B_API_KEY',
    'ready'
  );

insert into public.io_endpoint_pricing_versions (
  id,
  endpoint_id,
  version,
  publication_state,
  member_visible,
  currency_code,
  billing_meter,
  unit_quantity,
  input_price_nanos,
  output_price_nanos,
  effective_from,
  recorded_by
) values
  (
    '60000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    1,
    'published',
    true,
    'USD',
    'tokens',
    1000000,
    1000000000,
    2000000000,
    timestamptz '2026-01-01 00:00:00+00',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    1,
    'published',
    true,
    'USD',
    'tokens',
    1000000,
    1000000000,
    2000000000,
    timestamptz '2026-01-01 00:00:00+00',
    '10000000-0000-4000-8000-000000000001'
  );

insert into public.io_endpoint_capability_versions (
  id,
  endpoint_id,
  version,
  verification_state,
  supports_chat,
  tested_at,
  verified_by
) values
  (
    '70000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    1,
    'verified',
    true,
    timestamptz '2026-01-01 00:00:00+00',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    1,
    'verified',
    true,
    timestamptz '2026-01-01 00:00:00+00',
    '10000000-0000-4000-8000-000000000001'
  );

insert into private.io_provider_conformance_runs (
  id,
  endpoint_id,
  capability_version_id,
  run_state,
  started_at,
  finished_at,
  run_by
) values
  (
    '80000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    'passed',
    timestamptz '2026-01-01 00:00:00+00',
    timestamptz '2026-01-01 00:01:00+00',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000002',
    'passed',
    timestamptz '2026-01-01 00:00:00+00',
    timestamptz '2026-01-01 00:01:00+00',
    '10000000-0000-4000-8000-000000000001'
  );

select ok(
  not has_function_privilege(
    'authenticated',
    'private.io_endpoint_latest_evidence(uuid)',
    'execute'
  ),
  'authenticated cannot execute the internal evidence function'
);

select ok(
  not has_function_privilege(
    'anon',
    'private.io_endpoint_latest_evidence(uuid)',
    'execute'
  ),
  'anon cannot execute the internal evidence function'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.io_get_ready_endpoint_connections()',
    'execute'
  ),
  'authenticated cannot execute the service resolver'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.io_get_ready_endpoint_connections()',
    'execute'
  ),
  'service role can execute the service resolver'
);

select is(
  (select eligible from private.io_endpoint_latest_evidence(
    '50000000-0000-4000-8000-000000000001'
  )),
  true,
  'endpoint A starts eligible with a latest bound pass'
);

select is(
  (select eligible from private.io_endpoint_latest_evidence(
    '50000000-0000-4000-8000-000000000002'
  )),
  true,
  'endpoint B starts eligible with a latest bound pass'
);

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select results_eq(
  $$
    select count(*)
    from public.admin_io_operational_snapshot()
    where provider_id = '30000000-0000-4000-8000-000000000001'
      and activation_eligible
  $$,
  array[2::bigint],
  'admin snapshot reports both endpoints eligible'
);

select is(
  public.admin_io_set_provider_routing(
    '30000000-0000-4000-8000-000000000001',
    true,
    'Initial test activation has current bound evidence.'
  ) ->> 'routingEnabled',
  'true',
  'admin can enable a provider with a current eligible endpoint'
);

reset role;
set local role service_role;

select results_eq(
  $$
    select count(*)
    from public.io_get_ready_endpoint_connections()
    where provider_id = '30000000-0000-4000-8000-000000000001'
  $$,
  array[2::bigint],
  'resolver initially returns both eligible sibling endpoints'
);

reset role;

-- A newer verified capability supersedes v1 immediately. Until a run is
-- recorded for v2, the historical v1 pass cannot satisfy eligibility.
insert into public.io_endpoint_capability_versions (
  id,
  endpoint_id,
  version,
  verification_state,
  supports_chat,
  tested_at,
  verified_by
) values (
  '70000000-0000-4000-8000-000000000011',
  '50000000-0000-4000-8000-000000000001',
  2,
  'verified',
  true,
  timestamptz '2026-02-01 00:00:00+00',
  '10000000-0000-4000-8000-000000000001'
);

select is(
  (select eligible from private.io_endpoint_latest_evidence(
    '50000000-0000-4000-8000-000000000001'
  )),
  false,
  'a newer capability without a run for that version is fail-closed'
);

select is(
  (select capability_version from private.io_endpoint_latest_evidence(
    '50000000-0000-4000-8000-000000000001'
  )),
  2,
  'the helper reports the newest capability rather than an older verified version'
);

set local role authenticated;

select results_eq(
  $$
    select activation_eligible
    from public.admin_io_operational_snapshot()
    where endpoint_id = '50000000-0000-4000-8000-000000000001'
  $$,
  array[false],
  'snapshot uses the same fail-closed capability/conformance binding'
);

reset role;
set local role service_role;

select results_eq(
  $$
    select endpoint_id
    from public.io_get_ready_endpoint_connections()
    where provider_id = '30000000-0000-4000-8000-000000000001'
    order by endpoint_id
  $$,
  array['50000000-0000-4000-8000-000000000002'::uuid],
  'provider-wide switch does not expose an ineligible sibling endpoint'
);

reset role;

insert into private.io_provider_conformance_runs (
  id,
  endpoint_id,
  capability_version_id,
  run_state,
  started_at,
  finished_at,
  run_by
) values (
  '80000000-0000-4000-8000-000000000011',
  '50000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000011',
  'failed',
  timestamptz '2026-02-01 00:00:00+00',
  timestamptz '2026-02-01 00:01:00+00',
  '10000000-0000-4000-8000-000000000001'
);

select is(
  (select eligible from private.io_endpoint_latest_evidence(
    '50000000-0000-4000-8000-000000000001'
  )),
  false,
  'a latest failed run remains ineligible even when it is correctly bound'
);

insert into private.io_provider_conformance_runs (
  id,
  endpoint_id,
  capability_version_id,
  run_state,
  started_at,
  finished_at,
  run_by
) values (
  '80000000-0000-4000-8000-000000000012',
  '50000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000011',
  'passed',
  timestamptz '2026-03-01 00:00:00+00',
  timestamptz '2026-03-01 00:01:00+00',
  '10000000-0000-4000-8000-000000000001'
);

select is(
  (select eligible from private.io_endpoint_latest_evidence(
    '50000000-0000-4000-8000-000000000001'
  )),
  true,
  'a newer pass bound to the newest capability restores eligibility'
);

select is(
  (select conformance_capability_version_id
   from private.io_endpoint_latest_evidence(
     '50000000-0000-4000-8000-000000000001'
   )),
  '70000000-0000-4000-8000-000000000011'::uuid,
  'the selected conformance evidence is bound to the selected capability'
);

select throws_ok(
  $$
    insert into private.io_provider_conformance_runs (
      id, endpoint_id, capability_version_id, run_state, started_at, finished_at
    ) values (
      '80000000-0000-4000-8000-000000000021',
      '50000000-0000-4000-8000-000000000001',
      null,
      'passed',
      timestamptz '2026-03-02 00:00:00+00',
      timestamptz '2026-03-02 00:01:00+00'
    )
  $$,
  '23514',
  'new row for relation "io_provider_conformance_runs" violates check constraint "io_provider_conformance_runs_passed_capability_check"',
  'a passed run must identify its capability version'
);

select throws_ok(
  $$
    insert into private.io_provider_conformance_runs (
      id, endpoint_id, capability_version_id, run_state, started_at, finished_at
    ) values (
      '80000000-0000-4000-8000-000000000022',
      '50000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000002',
      'failed',
      timestamptz '2026-03-02 00:00:00+00',
      timestamptz '2026-03-02 00:01:00+00'
    )
  $$,
  '23503',
  'insert or update on table "io_provider_conformance_runs" violates foreign key constraint "io_provider_conformance_runs_endpoint_capability_fkey"',
  'a run cannot cite a capability from another endpoint'
);

-- Two runs can start at the same instant. The UUID tie-breaker must make the
-- result stable rather than depending on heap order.
insert into private.io_provider_conformance_runs (
  id,
  endpoint_id,
  capability_version_id,
  run_state,
  started_at,
  finished_at,
  run_by
) values
  (
    '80000000-0000-4000-8000-0000000000f1',
    '50000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000002',
    'passed',
    timestamptz '2026-04-01 00:00:00+00',
    timestamptz '2026-04-01 00:01:00+00',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '80000000-0000-4000-8000-0000000000f2',
    '50000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000002',
    'failed',
    timestamptz '2026-04-01 00:00:00+00',
    timestamptz '2026-04-01 00:01:00+00',
    '10000000-0000-4000-8000-000000000001'
  );

select is(
  (select conformance_state from private.io_endpoint_latest_evidence(
    '50000000-0000-4000-8000-000000000002'
  )),
  'failed',
  'equal start times resolve deterministically by descending run ID'
);

delete from private.io_provider_conformance_runs
where id in (
  '80000000-0000-4000-8000-0000000000f1',
  '80000000-0000-4000-8000-0000000000f2'
);

select is(
  (select eligible from private.io_endpoint_latest_evidence(
    '50000000-0000-4000-8000-000000000002'
  )),
  true,
  'removing the tie fixtures exposes endpoint B original bound pass again'
);

insert into private.io_provider_conformance_runs (
  id,
  endpoint_id,
  capability_version_id,
  run_state,
  started_at,
  finished_at,
  run_by
) values (
  '80000000-0000-4000-8000-000000000031',
  '50000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000002',
  'failed',
  timestamptz '2026-05-01 00:00:00+00',
  timestamptz '2026-05-01 00:01:00+00',
  '10000000-0000-4000-8000-000000000001'
);

select is(
  (select eligible from private.io_endpoint_latest_evidence(
    '50000000-0000-4000-8000-000000000002'
  )),
  false,
  'a newer failed run invalidates endpoint B historical pass'
);

set local role service_role;

select results_eq(
  $$
    select endpoint_id
    from public.io_get_ready_endpoint_connections()
    where provider_id = '30000000-0000-4000-8000-000000000001'
    order by endpoint_id
  $$,
  array['50000000-0000-4000-8000-000000000001'::uuid],
  'resolver returns only endpoint A after endpoint B latest failure'
);

reset role;

insert into private.io_provider_conformance_runs (
  id,
  endpoint_id,
  capability_version_id,
  run_state,
  started_at,
  finished_at,
  run_by
) values (
  '80000000-0000-4000-8000-000000000032',
  '50000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000011',
  'failed',
  timestamptz '2026-06-01 00:00:00+00',
  timestamptz '2026-06-01 00:01:00+00',
  '10000000-0000-4000-8000-000000000001'
);

select is(
  (select eligible from private.io_endpoint_latest_evidence(
    '50000000-0000-4000-8000-000000000001'
  )),
  false,
  'endpoint A also becomes ineligible after its newer failure'
);

set local role service_role;

select results_eq(
  $$
    select count(*)
    from public.io_get_ready_endpoint_connections()
    where provider_id = '30000000-0000-4000-8000-000000000001'
  $$,
  array[0::bigint],
  'resolver fails closed when every switched endpoint has newer failed evidence'
);

reset role;
set local role authenticated;

select throws_ok(
  $$
    select public.admin_io_set_provider_routing(
      '30000000-0000-4000-8000-000000000001',
      true,
      'A historical pass must not allow this activation.'
    )
  $$,
  'P0001',
  'Provider has no endpoint eligible for activation',
  'activation rejects a provider whose endpoints only have historical passes'
);

reset role;

insert into private.io_provider_conformance_runs (
  id,
  endpoint_id,
  capability_version_id,
  run_state,
  started_at,
  finished_at,
  run_by
) values (
  '80000000-0000-4000-8000-000000000041',
  '50000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000002',
  'passed',
  timestamptz '2026-07-01 00:00:00+00',
  timestamptz '2026-07-01 00:01:00+00',
  '10000000-0000-4000-8000-000000000001'
);

select is(
  (select eligible from private.io_endpoint_latest_evidence(
    '50000000-0000-4000-8000-000000000002'
  )),
  true,
  'a new bound pass restores endpoint B after its failure'
);

set local role authenticated;

select is(
  public.admin_io_set_provider_routing(
    '30000000-0000-4000-8000-000000000001',
    true,
    'Endpoint B has fresh endpoint-bound passing evidence.'
  ) ->> 'routingEnabled',
  'true',
  'activation succeeds again after fresh passing evidence'
);

reset role;
set local role service_role;

select results_eq(
  $$
    select endpoint_id
    from public.io_get_ready_endpoint_connections()
    where provider_id = '30000000-0000-4000-8000-000000000001'
    order by endpoint_id
  $$,
  array['50000000-0000-4000-8000-000000000002'::uuid],
  'resolver returns only the endpoint with fresh passing evidence'
);

reset role;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';
set local role authenticated;

select throws_ok(
  $$select * from public.admin_io_operational_snapshot()$$,
  '42501',
  'I/O operations access required',
  'a regular member cannot read the operator snapshot'
);

select throws_ok(
  $$
    select public.admin_io_set_provider_routing(
      '30000000-0000-4000-8000-000000000001',
      false,
      'A regular member must not manage routing.'
    )
  $$,
  '42501',
  'I/O operations management access required',
  'a regular member cannot manage provider routing'
);

reset role;

select * from finish();
rollback;
