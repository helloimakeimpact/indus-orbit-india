begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(50);

select has_table(
  'private',
  'community_onboarding_state',
  'private community onboarding state exists'
);
select has_table(
  'private',
  'product_measurement_preferences',
  'private measurement preferences exist'
);
select has_table(
  'private',
  'product_measurement_events',
  'private measurement events exist'
);
select has_table(
  'private',
  'product_client_operations',
  'private client-operation idempotency ledger exists'
);

select ok(
  (
    select pg_catalog.bool_and(relation.relrowsecurity)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'private'
      and relation.relname in (
        'community_onboarding_state',
        'product_measurement_preferences',
        'product_measurement_events',
        'product_client_operations'
      )
  ),
  'all product-boundary private tables keep RLS enabled'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'private.community_onboarding_state',
    'SELECT'
  )
  and not has_table_privilege(
    'authenticated',
    'private.product_measurement_preferences',
    'SELECT'
  )
  and not has_table_privilege(
    'authenticated',
    'private.product_measurement_events',
    'SELECT'
  )
  and not has_table_privilege(
    'authenticated',
    'private.product_client_operations',
    'SELECT'
  ),
  'authenticated users have no direct private table access'
);

select ok(
  not has_table_privilege(
    'anon',
    'private.community_onboarding_state',
    'SELECT'
  )
  and not has_table_privilege(
    'anon',
    'private.product_measurement_preferences',
    'SELECT'
  )
  and not has_table_privilege(
    'anon',
    'private.product_measurement_events',
    'SELECT'
  )
  and not has_table_privilege(
    'anon',
    'private.product_client_operations',
    'SELECT'
  ),
  'anonymous users have no direct private table access'
);

select ok(
  has_table_privilege(
    'service_role',
    'private.community_onboarding_state',
    'SELECT'
  )
  and has_table_privilege(
    'service_role',
    'private.product_measurement_preferences',
    'SELECT'
  )
  and has_table_privilege(
    'service_role',
    'private.product_measurement_events',
    'SELECT'
  )
  and has_table_privilege(
    'service_role',
    'private.product_client_operations',
    'SELECT'
  ),
  'service role receives explicit private read grants'
);

select ok(
  not exists (
    select 1
    from information_schema.columns as column_info
    where column_info.table_schema = 'private'
      and column_info.table_name in (
        'product_measurement_preferences',
        'product_measurement_events',
        'product_client_operations'
      )
      and (
        column_info.data_type in ('json', 'jsonb')
        or column_info.column_name in (
          'location',
          'city',
          'country',
          'region',
          'timezone',
          'prompt',
          'email',
          'ip',
          'ip_address',
          'user_agent'
        )
      )
  ),
  'measurement storage has no arbitrary JSON or sensitive request/profile fields'
);

select ok(
  not exists (
    select 1
    from information_schema.columns as column_info
    where column_info.table_schema = 'private'
      and column_info.table_name = 'community_onboarding_state'
      and column_info.column_name in (
        'location',
        'city',
        'country',
        'region',
        'timezone'
      )
  ),
  'community onboarding state has no location requirement field'
);

select ok(
  (
    select pg_catalog.strpos(
      pg_catalog.pg_get_constraintdef(constraint_row.oid),
      'not_started'
    ) > 0
      and pg_catalog.strpos(
        pg_catalog.pg_get_constraintdef(constraint_row.oid),
        'in_progress'
      ) > 0
      and pg_catalog.strpos(
        pg_catalog.pg_get_constraintdef(constraint_row.oid),
        'paused'
      ) > 0
      and pg_catalog.strpos(
        pg_catalog.pg_get_constraintdef(constraint_row.oid),
        'completed'
      ) > 0
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conname = 'community_onboarding_state_status_check'
  ),
  'community state admits the four intended lifecycle statuses'
);

select has_function(
  'public',
  'get_my_product_access',
  array[]::text[],
  'caller product-access RPC exists'
);
select has_function(
  'public',
  'start_my_community_onboarding',
  array['integer', 'uuid'],
  'community start RPC exists'
);
select has_function(
  'public',
  'complete_my_community_onboarding',
  array['integer', 'uuid'],
  'community completion RPC exists'
);
select has_function(
  'public',
  'set_my_measurement_consent',
  array['boolean', 'uuid'],
  'measurement-consent RPC exists'
);
select has_function(
  'public',
  'record_my_product_event',
  array['text', 'text', 'uuid'],
  'allowlisted product-event RPC exists'
);

select ok(
  (
    select pg_catalog.bool_and(proc.prosecdef)
    from pg_catalog.pg_proc as proc
    where proc.oid in (
      'public.get_my_product_access()'::regprocedure,
      'public.start_my_community_onboarding(integer,uuid)'::regprocedure,
      'public.complete_my_community_onboarding(integer,uuid)'::regprocedure,
      'public.set_my_measurement_consent(boolean,uuid)'::regprocedure,
      'public.record_my_product_event(text,text,uuid)'::regprocedure
    )
  ),
  'all product-boundary RPCs use definer execution'
);

select ok(
  (
    select count(*) = 5
      and pg_catalog.bool_and(
        pg_catalog.replace(
          pg_catalog.split_part(setting, '=', 2),
          '"',
          ''
        ) = ''
      )
    from pg_catalog.pg_proc as proc
    cross join lateral pg_catalog.unnest(proc.proconfig) as setting
    where proc.oid in (
      'public.get_my_product_access()'::regprocedure,
      'public.start_my_community_onboarding(integer,uuid)'::regprocedure,
      'public.complete_my_community_onboarding(integer,uuid)'::regprocedure,
      'public.set_my_measurement_consent(boolean,uuid)'::regprocedure,
      'public.record_my_product_event(text,text,uuid)'::regprocedure
    )
      and pg_catalog.split_part(setting, '=', 1) = 'search_path'
  ),
  'all product-boundary RPCs pin an empty search path'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_my_product_access()',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.get_my_product_access()',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.start_my_community_onboarding(integer,uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.start_my_community_onboarding(integer,uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.complete_my_community_onboarding(integer,uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.complete_my_community_onboarding(integer,uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.set_my_measurement_consent(boolean,uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.set_my_measurement_consent(boolean,uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.record_my_product_event(text,text,uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.record_my_product_event(text,text,uuid)',
    'EXECUTE'
  ),
  'authenticated and service roles receive explicit RPC execution grants'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.get_my_product_access()',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.start_my_community_onboarding(integer,uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.complete_my_community_onboarding(integer,uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.set_my_measurement_consent(boolean,uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.record_my_product_event(text,text,uuid)',
    'EXECUTE'
  ),
  'anonymous callers receive no product-boundary RPC grants'
);

select throws_ok(
  $$select public.get_my_product_access()$$,
  'P0001',
  'Unauthorized',
  'product access is caller-bound'
);

select ok(
  not exists (
    select 1
    from public.profiles as profile
    left join private.community_onboarding_state as onboarding
      on onboarding.user_id = profile.user_id
    where profile.orbit_segment is not null
      and (
        onboarding.user_id is null
        or onboarding.status <> 'completed'
      )
  ),
  'migration backfills existing segmented profiles as community-complete'
);

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
) values (
  '00000000-0000-0000-0000-000000000000',
  '70000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'product-separation-member@example.invalid',
  '',
  pg_catalog.now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Product separation member"}'::jsonb,
  pg_catalog.now(),
  pg_catalog.now()
);

select ok(
  (
    select profile.orbit_segment is null
      and profile.city is null
      and profile.country is null
      and profile.region is null
      and profile.timezone is null
    from public.profiles as profile
    where profile.user_id = '70000000-0000-4000-8000-000000000001'::uuid
  )
  and not exists (
    select 1
    from private.community_onboarding_state as onboarding
    where onboarding.user_id = '70000000-0000-4000-8000-000000000001'::uuid
  ),
  'a new unsegmented, location-free profile is not implicitly community-complete'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select results_eq(
  $$
    select
      access.io_access,
      access.community_access,
      access.community_status,
      access.community_current_step,
      access.community_version,
      access.measurement_consent
    from public.get_my_product_access() as access
  $$,
  $$values (true, false, 'not_started'::text, 'welcome'::text, 0, false)$$,
  'I/O is available while community and measurement remain off by default'
);

select is(
  public.record_my_product_event(
    'io',
    'surface_opened',
    '71000000-0000-4000-8000-000000000001'::uuid
  ),
  false,
  'consent-off measurement deterministically no-ops'
);

reset role;

select ok(
  not exists (
    select 1
    from private.product_measurement_events as event
    where event.user_id = '70000000-0000-4000-8000-000000000001'::uuid
  )
  and not exists (
    select 1
    from private.product_client_operations as operation
    where operation.user_id = '70000000-0000-4000-8000-000000000001'::uuid
      and operation.client_operation_id =
        '71000000-0000-4000-8000-000000000001'::uuid
  ),
  'consent-off no-op writes neither an event nor an operation trace'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  $$
    select public.record_my_product_event(
      'admin',
      'surface_opened',
      '71000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'P0001',
  'Unsupported product surface',
  'event surface is allowlisted'
);

select throws_ok(
  $$
    select public.record_my_product_event(
      'io',
      'prompt_submitted',
      '71000000-0000-4000-8000-000000000003'::uuid
    )
  $$,
  'P0001',
  'Unsupported product event',
  'event name is allowlisted'
);

select results_eq(
  $$
    select
      access.community_access,
      access.community_status,
      access.community_current_step,
      access.community_version
    from public.start_my_community_onboarding(
      0,
      '72000000-0000-4000-8000-000000000001'::uuid
    ) as access
  $$,
  $$values (false, 'in_progress'::text, 'profile'::text, 1)$$,
  'community start advances an unsegmented caller from version zero'
);

select results_eq(
  $$
    select
      access.community_access,
      access.community_status,
      access.community_current_step,
      access.community_version
    from public.start_my_community_onboarding(
      0,
      '72000000-0000-4000-8000-000000000001'::uuid
    ) as access
  $$,
  $$values (false, 'in_progress'::text, 'profile'::text, 1)$$,
  'replaying the community start operation is idempotent'
);

reset role;

select ok(
  (
    select count(*) = 1
    from private.community_onboarding_state as onboarding
    where onboarding.user_id = '70000000-0000-4000-8000-000000000001'::uuid
      and onboarding.status = 'in_progress'
      and onboarding.version = 1
  )
  and (
    select count(*) = 1
    from private.product_client_operations as operation
    where operation.user_id = '70000000-0000-4000-8000-000000000001'::uuid
      and operation.operation_kind = 'community.start'
  ),
  'start replay creates one state mutation and one idempotency row'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  $$
    select public.complete_my_community_onboarding(
      1,
      '72000000-0000-4000-8000-000000000003'::uuid
    )
  $$,
  'P0001',
  'Community identity is required before completion',
  'community completion requires identity but not location'
);

reset role;

update public.profiles as profile
set orbit_segment = 'youth'::public.orbit_segment
where profile.user_id = '70000000-0000-4000-8000-000000000001'::uuid;

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select results_eq(
  $$
    select
      access.io_access,
      access.community_access,
      access.community_status,
      access.community_current_step,
      access.community_version
    from public.complete_my_community_onboarding(
      1,
      '72000000-0000-4000-8000-000000000002'::uuid
    ) as access
  $$,
  $$values (true, true, 'completed'::text, 'completed'::text, 2)$$,
  'location-free community onboarding can complete without affecting I/O access'
);

select results_eq(
  $$
    select
      access.community_access,
      access.community_status,
      access.community_version
    from public.complete_my_community_onboarding(
      1,
      '72000000-0000-4000-8000-000000000002'::uuid
    ) as access
  $$,
  $$values (true, 'completed'::text, 2)$$,
  'replaying the community completion operation is idempotent'
);

reset role;

select ok(
  (
    select count(*) = 1
    from private.community_onboarding_state as onboarding
    where onboarding.user_id = '70000000-0000-4000-8000-000000000001'::uuid
      and onboarding.status = 'completed'
      and onboarding.version = 2
  )
  and (
    select count(*) = 2
    from private.product_client_operations as operation
    where operation.user_id = '70000000-0000-4000-8000-000000000001'::uuid
      and operation.operation_kind in ('community.start', 'community.complete')
  ),
  'completion replay preserves one state row and two lifecycle operations'
);

select ok(
  pg_catalog.strpos(
    pg_catalog.lower(
      pg_catalog.pg_get_functiondef(
        'public.complete_my_community_onboarding(integer,uuid)'::regprocedure
      )
    ),
    'location'
  ) = 0
  and pg_catalog.strpos(
    pg_catalog.lower(
      pg_catalog.pg_get_functiondef(
        'public.complete_my_community_onboarding(integer,uuid)'::regprocedure
      )
    ),
    'city'
  ) = 0
  and pg_catalog.strpos(
    pg_catalog.lower(
      pg_catalog.pg_get_functiondef(
        'public.complete_my_community_onboarding(integer,uuid)'::regprocedure
      )
    ),
    'country'
  ) = 0
  and pg_catalog.strpos(
    pg_catalog.lower(
      pg_catalog.pg_get_functiondef(
        'public.complete_my_community_onboarding(integer,uuid)'::regprocedure
      )
    ),
    'region'
  ) = 0
  and pg_catalog.strpos(
    pg_catalog.lower(
      pg_catalog.pg_get_functiondef(
        'public.complete_my_community_onboarding(integer,uuid)'::regprocedure
      )
    ),
    'timezone'
  ) = 0,
  'community completion function contains no location-field dependency'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  public.set_my_measurement_consent(
    true,
    '73000000-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'caller can explicitly enable product measurement'
);

select is(
  public.set_my_measurement_consent(
    true,
    '73000000-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'replaying consent enablement is idempotent'
);

reset role;

select ok(
  (
    select count(*) = 1
      and pg_catalog.bool_and(preference.consent_enabled)
      and pg_catalog.max(preference.consent_version) = 1
    from private.product_measurement_preferences as preference
    where preference.user_id = '70000000-0000-4000-8000-000000000001'::uuid
  )
  and (
    select count(*) = 1
    from private.product_client_operations as operation
    where operation.user_id = '70000000-0000-4000-8000-000000000001'::uuid
      and operation.operation_kind = 'measurement.consent'
  ),
  'consent replay creates one preference version and one operation row'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  public.record_my_product_event(
    'io',
    'surface_opened',
    '74000000-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'consented caller can record an allowlisted I/O event'
);

select is(
  public.record_my_product_event(
    'io',
    'surface_opened',
    '74000000-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'replaying the same product event succeeds idempotently'
);

reset role;

select results_eq(
  $$
    select count(*)::bigint
    from private.product_measurement_events as event
    where event.user_id = '70000000-0000-4000-8000-000000000001'::uuid
      and event.client_operation_id =
        '74000000-0000-4000-8000-000000000001'::uuid
  $$,
  array[1::bigint],
  'duplicate event client ID does not duplicate the event'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  $$
    select public.record_my_product_event(
      'community',
      'surface_opened',
      '74000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'P0001',
  'Client operation ID was already used with different parameters',
  'a client ID cannot be replayed with a different event surface'
);

select is(
  public.record_my_product_event(
    'community',
    'onboarding_completed',
    '74000000-0000-4000-8000-000000000002'::uuid
  ),
  true,
  'consented caller can record an allowlisted community event'
);

reset role;

select results_eq(
  $$
    select event.surface, count(*)::bigint
    from private.product_measurement_events as event
    where event.user_id = '70000000-0000-4000-8000-000000000001'::uuid
    group by event.surface
    order by event.surface
  $$,
  $$values ('community'::text, 1::bigint), ('io'::text, 1::bigint)$$,
  'I/O and community measurement remain separate event surfaces'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  public.set_my_measurement_consent(
    false,
    '73000000-0000-4000-8000-000000000002'::uuid
  ),
  false,
  'caller can revoke product measurement consent'
);

select is(
  public.set_my_measurement_consent(
    false,
    '73000000-0000-4000-8000-000000000002'::uuid
  ),
  false,
  'replaying consent revocation is idempotent'
);

select is(
  public.record_my_product_event(
    'io',
    'action_completed',
    '74000000-0000-4000-8000-000000000003'::uuid
  ),
  false,
  'measurement no-ops again after consent is revoked'
);

reset role;

select ok(
  (
    select count(*) = 2
    from private.product_measurement_events as event
    where event.user_id = '70000000-0000-4000-8000-000000000001'::uuid
  )
  and not exists (
    select 1
    from private.product_client_operations as operation
    where operation.user_id = '70000000-0000-4000-8000-000000000001'::uuid
      and operation.client_operation_id =
        '74000000-0000-4000-8000-000000000003'::uuid
  ),
  'revoked-consent event creates no event and no operation trace'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select results_eq(
  $$
    select
      access.io_access,
      access.community_access,
      access.measurement_consent
    from public.get_my_product_access() as access
  $$,
  $$values (true, true, false)$$,
  'final access keeps I/O and completed community available with measurement off'
);

reset role;

select * from finish();

rollback;
