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
  (select commercial_access_state from public.io_providers where provider_key = 'openai'),
  'resale_pending',
  'OpenAI remains commercially pending'
);
select is(
  (select resale_authorized from public.io_providers where provider_key = 'openai'),
  false,
  'OpenAI is not falsely marked resale-authorized'
);
select is(
  (select training_use_class from public.io_providers where provider_key = 'openai'),
  'no_training_claimed',
  'OpenAI API no-training default is recorded as a claim rather than a contract'
);
select is(
  (select commercial_access_state from public.io_providers where provider_key = 'deepseek'),
  'resale_pending',
  'DeepSeek remains commercially pending'
);
select is(
  (select resale_authorized from public.io_providers where provider_key = 'deepseek'),
  false,
  'DeepSeek is not falsely marked resale-authorized'
);
select is(
  (select default_residency_country from public.io_providers where provider_key = 'deepseek'),
  'CN',
  'DeepSeek hosted data-location disclosure is recorded'
);
select is(
  (
    select endpoint.residency_country_code
    from public.io_model_endpoints as endpoint
    join public.io_providers as provider on provider.id = endpoint.provider_id
    where provider.provider_key = 'deepseek'
    order by endpoint.created_at
    limit 1
  ),
  'CN',
  'DeepSeek endpoint carries the hosted residency disclosure'
);
select is(
  (
    select price.input_price_nanos
    from public.io_endpoint_pricing_versions as price
    join public.io_model_endpoints as endpoint on endpoint.id = price.endpoint_id
    join public.io_providers as provider on provider.id = endpoint.provider_id
    where provider.provider_key = 'openai' and price.version = 2
  ),
  200000000::bigint,
  'current OpenAI Luna input price is versioned in currency nanos'
);
select is(
  (
    select price.cached_input_price_nanos
    from public.io_endpoint_pricing_versions as price
    join public.io_model_endpoints as endpoint on endpoint.id = price.endpoint_id
    join public.io_providers as provider on provider.id = endpoint.provider_id
    where provider.provider_key = 'openai' and price.version = 2
  ),
  20000000::bigint,
  'current OpenAI Luna cached-input price is versioned'
);
select is(
  (
    select price.output_price_nanos
    from public.io_endpoint_pricing_versions as price
    join public.io_model_endpoints as endpoint on endpoint.id = price.endpoint_id
    join public.io_providers as provider on provider.id = endpoint.provider_id
    where provider.provider_key = 'openai' and price.version = 2
  ),
  1200000000::bigint,
  'current OpenAI Luna output price is versioned'
);

select throws_ok(
  $$
    update private.io_provider_runtime_controls as control
    set routing_enabled = true
    from public.io_providers as provider
    where control.provider_id = provider.id and provider.provider_key = 'openai'
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
    where provider.provider_key = 'openai'
  ),
  false,
  'failed commercial activation leaves routing disabled'
);

reset role;

select * from finish();
rollback;
