begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(50);

select has_table('public', 'io_workspace_provider_policies', 'workspace provider policy exists');
select has_column('public', 'io_workspace_provider_policies', 'allow_china_hosted', 'CN hosting consent is explicit');
select has_column('public', 'io_workspace_provider_policies', 'allow_training_possible', 'possible training consent is explicit');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.io_workspace_provider_policies'::regclass),
  'workspace provider policy uses RLS'
);
select ok(
  has_table_privilege('authenticated', 'public.io_workspace_provider_policies', 'select'),
  'authenticated members can enter the RLS-protected read boundary'
);
select ok(
  not has_table_privilege('authenticated', 'public.io_workspace_provider_policies', 'insert'),
  'browser users cannot bypass the audited policy RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.get_my_io_workspace_provider_policy(uuid)', 'execute'),
  'members can read their workspace provider policy through a caller-bound RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.set_my_io_workspace_provider_policy(uuid,boolean,boolean)', 'execute'),
  'owners/admins can enter the audited provider-policy mutation boundary'
);
select ok(
  has_function_privilege('service_role', 'public.io_get_workspace_provider_policy(uuid)', 'execute'),
  'gateway service can enforce the workspace policy'
);
select ok(
  not has_function_privilege('authenticated', 'public.io_get_workspace_provider_policy(uuid)', 'execute'),
  'browser users cannot call the service-only policy projection'
);

select has_column('public', 'io_api_keys', 'limit_policy_version', 'key limit policy is versioned');
select has_column('public', 'io_api_keys', 'requests_per_minute', 'key minute request cap exists');
select has_column('public', 'io_api_keys', 'requests_per_day', 'key daily request cap exists');
select has_column('public', 'io_api_keys', 'requests_per_month', 'key monthly request cap exists');
select has_column('public', 'io_api_keys', 'spend_per_day_nanos', 'key daily spend cap exists');
select has_column('public', 'io_api_keys', 'spend_per_month_nanos', 'key monthly spend cap exists');
select has_table('private', 'io_api_key_request_windows_v2', 'multi-period request counters are private');
select has_table('private', 'io_api_key_spend_windows', 'key spend windows are private');
select has_table('private', 'io_api_key_spend_reservations', 'key spend reservations are private');
select ok(
  not has_table_privilege('authenticated', 'private.io_api_key_request_windows_v2', 'select'),
  'browser users cannot inspect request windows'
);
select ok(
  not has_table_privilege('authenticated', 'private.io_api_key_spend_reservations', 'select'),
  'browser users cannot inspect spend reservations'
);
select ok(
  to_regclass('private.io_provider_conformance_approvals_capability_version_idx') is not null,
  'conformance approval capability foreign key is indexed'
);
select ok(
  to_regclass('private.io_provider_conformance_events_actor_user_idx') is not null,
  'conformance event actor foreign key is indexed'
);
select ok(
  to_regclass('private.io_provider_conformance_events_approval_idx') is not null,
  'conformance event approval foreign key is indexed'
);
select ok(
  to_regclass('private.io_provider_conformance_events_endpoint_idx') is not null,
  'conformance event endpoint foreign key is indexed'
);
select ok(
  has_function_privilege('service_role', 'public.io_consume_api_key_request(text,text,integer)', 'execute'),
  'API service can enforce the immutable key policy through the deployed RPC'
);
select is(
  (
    select proargnames
    from pg_proc
    where oid = 'public.io_consume_api_key_request(text,text,integer)'::regprocedure
  ),
  array['_key_hash_hex', '_required_scope', '_limit']::text[],
  'the deployed compatibility overload preserves its existing parameter names'
);
select like(
  (
    select pg_get_function_arguments(oid)
    from pg_proc
    where oid = 'public.io_consume_api_key_request(text,text,integer)'::regprocedure
  ),
  '%_limit integer DEFAULT 60%',
  'the deployed RPC preserves its default argument for two-argument callers'
);
select ok(
  not has_function_privilege('service_role', 'private.io_consume_api_key_request_v2(text,text)', 'execute'),
  'the immutable policy helper is not directly callable by the API service'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.io_begin_api_key_route_request(uuid,uuid,text,text,uuid,uuid,text,bigint,uuid,bigint)',
    'execute'
  ),
  'API service can atomically reserve workspace and key spend'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.io_begin_api_key_route_request(uuid,uuid,text,text,uuid,uuid,text,bigint,uuid,bigint)',
    'execute'
  ),
  'browser users cannot reserve API-key spend directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.io_finalize_api_key_priced_route_request(uuid,uuid,text,text,jsonb,jsonb,integer,integer,bigint,text,integer,integer,bigint,bigint,bigint,bigint,integer,integer,jsonb,jsonb)',
    'execute'
  ),
  'API service can atomically settle key and workspace spend'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.io_finalize_api_key_priced_route_request(uuid,uuid,text,text,jsonb,jsonb,integer,integer,bigint,text,integer,integer,bigint,bigint,bigint,bigint,integer,integer,jsonb,jsonb)',
    'execute'
  ),
  'browser users cannot settle API-key spend directly'
);

select has_table('private', 'io_provider_conformance_approvals', 'single-use conformance approvals are private');
select has_table('private', 'io_provider_conformance_events', 'conformance events are private');
select has_column('private', 'io_provider_conformance_runs', 'approval_id', 'runs bind to an approval');
select has_column('private', 'io_provider_conformance_runs', 'suite_version', 'runs bind to a suite version');
select ok(
  has_function_privilege(
    'authenticated',
    'public.admin_io_begin_provider_conformance(uuid,bigint,boolean,text)',
    'execute'
  ),
  'authenticated admin clients can enter the capability-checked approval boundary'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.admin_io_begin_provider_conformance(uuid,bigint,boolean,text)',
    'execute'
  ),
  'anonymous callers cannot approve provider traffic'
);
select ok(
  has_function_privilege('service_role', 'public.io_get_provider_conformance_connection(uuid)', 'execute'),
  'conformance service can load an approved connection'
);
select ok(
  not has_function_privilege('authenticated', 'public.io_get_provider_conformance_connection(uuid)', 'execute'),
  'browser users cannot read the private conformance connection'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.io_finish_provider_conformance(uuid,text,bigint,text,jsonb,text)',
    'execute'
  ),
  'conformance service can finalize redacted evidence'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.io_finish_provider_conformance(uuid,text,bigint,text,jsonb,text)',
    'execute'
  ),
  'browser users cannot forge conformance results'
);
select ok(
  has_function_privilege('authenticated', 'public.admin_io_provider_conformance_snapshot()', 'execute'),
  'admin clients can enter the capability-checked conformance projection'
);
select ok(
  not has_function_privilege('anon', 'public.admin_io_provider_conformance_snapshot()', 'execute'),
  'anonymous callers cannot read conformance evidence'
);
select is(
  (
    select proconfig
    from pg_proc
    where oid = 'public.admin_io_begin_provider_conformance(uuid,bigint,boolean,text)'::regprocedure
  ),
  array['search_path=""']::text[],
  'conformance approval has an empty search path'
);
select is(
  (
    select proconfig
    from pg_proc
    where oid = 'public.io_finish_provider_conformance(uuid,text,bigint,text,jsonb,text)'::regprocedure
  ),
  array['search_path=""']::text[],
  'conformance finalization has an empty search path'
);
select ok(
  position(
    'capability.verification_state = ''draft'''
    in pg_get_functiondef('public.admin_io_begin_provider_conformance(uuid,bigint,boolean,text)'::regprocedure)
  ) > 0,
  'conformance can start from the latest staged capability declaration'
);
select ok(
  position(
    'supports_model_listing = true'
    in pg_get_functiondef('public.io_finish_provider_conformance(uuid,text,bigint,text,jsonb,text)'::regprocedure)
  ) > 0,
  'a passing conformance run seals the tested capability declaration'
);
select ok(
  position(
    'Passed conformance requires complete positive evidence'
    in pg_get_functiondef('public.io_finish_provider_conformance(uuid,text,bigint,text,jsonb,text)'::regprocedure)
  ) > 0,
  'the database rejects incomplete pass evidence even from the service boundary'
);

select * from finish();
rollback;
