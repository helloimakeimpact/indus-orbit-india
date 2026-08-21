begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(26);

select has_column(
  'public',
  'io_providers',
  'resale_authorized',
  'provider registry stores explicit onward-resale authorization'
);
select has_column(
  'public',
  'io_providers',
  'commercial_access_state',
  'provider registry stores commercial access state'
);
select has_table(
  'private',
  'io_service_fee_policies',
  'service fee policy is private'
);
select ok(
  not has_table_privilege('authenticated', 'private.io_service_fee_policies', 'select'),
  'browser users cannot inspect private pricing policy rows directly'
);
select ok(
  not has_table_privilege('authenticated', 'private.io_service_fee_policies', 'update'),
  'browser users cannot change the I/O fee'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.io_get_active_service_fee_policy()',
    'execute'
  ),
  'browser users cannot invoke the service-only pricing projection'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.io_get_active_service_fee_policy()',
    'execute'
  ),
  'gateway service can load the current fee policy'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.io_finalize_priced_route_request(uuid,text,text,jsonb,jsonb,integer,integer,bigint,text,integer,integer,bigint,bigint,bigint,bigint,integer,integer,jsonb,jsonb)',
    'execute'
  ),
  'gateway service can enter the priced finalization boundary'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.io_finalize_priced_route_request(uuid,text,text,jsonb,jsonb,integer,integer,bigint,text,integer,integer,bigint,bigint,bigint,bigint,integer,integer,jsonb,jsonb)',
    'execute'
  ),
  'browser users cannot finalize priced usage'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.admin_io_provider_commercial_snapshot()',
    'execute'
  ),
  'authenticated admin clients can enter the capability-checked commercial projection'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.admin_io_provider_commercial_snapshot()',
    'execute'
  ),
  'anonymous clients cannot inspect provider commercial evidence'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '51000000-0000-4000-8000-000000000001',
  'commercial-gate-operator@example.test',
  '{"display_name":"Commercial Gate Operator"}'::jsonb
);

insert into public.io_capacity_sources (
  id, source_key, display_name, operator_name, provenance,
  procurement_model, access_mode, status, data_residency_country, created_by
) values (
  '52000000-0000-4000-8000-000000000001',
  'commercial-gate-capacity',
  'Commercial gate capacity',
  'Contract test operator',
  'partner_provider',
  'pay_as_you_go',
  'pooled',
  'active',
  'CN',
  '51000000-0000-4000-8000-000000000001'
);

insert into public.io_providers (
  id, provider_key, display_name, provider_kind, integration_style,
  lifecycle_state, catalogue_visibility, operator_name,
  data_retention_class, training_use_class, default_residency_country,
  commercial_access_state, resale_authorized, created_by
) values (
  '53000000-0000-4000-8000-000000000001',
  'commercial-gate-test',
  'Commercial Gate Test',
  'direct_api',
  'openai_compatible',
  'conformance',
  'listed',
  'Contract test operator',
  'provider_default',
  'no_training_claimed',
  'CN',
  'resale_pending',
  false,
  '51000000-0000-4000-8000-000000000001'
);

insert into public.io_models (
  id, provider_id, provider_model_id, display_name, revision, modalities,
  listing_state, released_at, auto_route_tier, created_by
) values (
  '54000000-0000-4000-8000-000000000001',
  '53000000-0000-4000-8000-000000000001',
  'commercial-test-model',
  'Commercial Test Model',
  'v1',
  array['text']::text[],
  'listed',
  date '2026-01-01',
  'balanced',
  '51000000-0000-4000-8000-000000000001'
);

insert into public.io_model_endpoints (
  id, provider_id, model_id, capacity_source_id, endpoint_key, capacity_mode,
  routing_state, member_visible, residency_country_code, retention_class, created_by
) values (
  '55000000-0000-4000-8000-000000000001',
  '53000000-0000-4000-8000-000000000001',
  '54000000-0000-4000-8000-000000000001',
  '52000000-0000-4000-8000-000000000001',
  'commercial-gate-endpoint',
  'direct_api',
  'conformance',
  true,
  'CN',
  'provider_default',
  '51000000-0000-4000-8000-000000000001'
);

insert into public.io_endpoint_pricing_versions (
  endpoint_id, version, publication_state, member_visible, currency_code,
  billing_meter, unit_quantity, input_price_nanos, cached_input_price_nanos,
  output_price_nanos, effective_from, recorded_by
) values (
  '55000000-0000-4000-8000-000000000001',
  2,
  'published',
  true,
  'USD',
  'tokens',
  1000000,
  200000000,
  20000000,
  1200000000,
  timestamptz '2026-01-01 00:00:00+00',
  '51000000-0000-4000-8000-000000000001'
);

insert into private.io_provider_runtime_controls (
  provider_id, routing_enabled, disabled_reason
) values (
  '53000000-0000-4000-8000-000000000001',
  false,
  'Awaiting written onward-access authorization.'
);

set local role service_role;

select is(
  public.io_get_active_service_fee_policy() ->> 'version',
  '1',
  'service fee policy version is immutable evidence'
);
select is(
  public.io_get_active_service_fee_policy() ->> 'feeBasisPoints',
  '550',
  'owner-approved fee is exactly 5.5 percent'
);

reset role;

select is(
  (
    select count(*)
    from private.io_service_fee_policies
    where status = 'active'
  ),
  1::bigint,
  'there is exactly one active service fee policy'
);

select is(
  (select commercial_access_state from public.io_providers where provider_key = 'commercial-gate-test'),
  'resale_pending',
  'pending provider remains commercially blocked'
);
select is(
  (select resale_authorized from public.io_providers where provider_key = 'commercial-gate-test'),
  false,
  'pending provider is not falsely marked resale-authorized'
);
select is(
  (select training_use_class from public.io_providers where provider_key = 'commercial-gate-test'),
  'no_training_claimed',
  'no-training status remains a claim rather than a contract'
);
select is(
  (select default_residency_country from public.io_providers where provider_key = 'commercial-gate-test'),
  'CN',
  'provider default residency disclosure is retained'
);
select is(
  (
    select endpoint.residency_country_code
    from public.io_model_endpoints as endpoint
    join public.io_providers as provider on provider.id = endpoint.provider_id
    where provider.provider_key = 'commercial-gate-test'
    order by endpoint.created_at
    limit 1
  ),
  'CN',
  'endpoint carries its reviewed residency disclosure'
);
select is(
  (
    select endpoint.retention_class
    from public.io_model_endpoints as endpoint
    join public.io_providers as provider on provider.id = endpoint.provider_id
    where provider.provider_key = 'commercial-gate-test'
  ),
  'provider_default',
  'endpoint carries its reviewed retention class'
);
select is(
  (
    select price.input_price_nanos
    from public.io_endpoint_pricing_versions as price
    join public.io_model_endpoints as endpoint on endpoint.id = price.endpoint_id
    join public.io_providers as provider on provider.id = endpoint.provider_id
    where provider.provider_key = 'commercial-gate-test' and price.version = 2
  ),
  200000000::bigint,
  'current input price is versioned in currency nanos'
);
select is(
  (
    select price.cached_input_price_nanos
    from public.io_endpoint_pricing_versions as price
    join public.io_model_endpoints as endpoint on endpoint.id = price.endpoint_id
    join public.io_providers as provider on provider.id = endpoint.provider_id
    where provider.provider_key = 'commercial-gate-test' and price.version = 2
  ),
  20000000::bigint,
  'current cached-input price is versioned'
);
select is(
  (
    select price.output_price_nanos
    from public.io_endpoint_pricing_versions as price
    join public.io_model_endpoints as endpoint on endpoint.id = price.endpoint_id
    join public.io_providers as provider on provider.id = endpoint.provider_id
    where provider.provider_key = 'commercial-gate-test' and price.version = 2
  ),
  1200000000::bigint,
  'current output price is versioned'
);
select is(
  (
    select price.version
    from public.io_endpoint_pricing_versions as price
    join public.io_model_endpoints as endpoint on endpoint.id = price.endpoint_id
    join public.io_providers as provider on provider.id = endpoint.provider_id
    where provider.provider_key = 'commercial-gate-test'
  ),
  2,
  'price evidence is pinned to an explicit version'
);

select throws_ok(
  $$
    update private.io_provider_runtime_controls as control
    set routing_enabled = true
    from public.io_providers as provider
    where control.provider_id = provider.id and provider.provider_key = 'commercial-gate-test'
  $$,
  'P0001',
  'Provider routing requires reviewed written resale authorization',
  'commercial gate blocks an otherwise privileged route enable'
);
select is(
  (
    select control.routing_enabled
    from private.io_provider_runtime_controls as control
    join public.io_providers as provider on provider.id = control.provider_id
    where provider.provider_key = 'commercial-gate-test'
  ),
  false,
  'failed commercial activation leaves routing disabled'
);

select * from finish();
rollback;
