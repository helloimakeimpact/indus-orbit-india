-- Read-only hosted release contract for the I/O operational and terminal
-- migrations. It returns booleans, object names and aggregate counts only; it
-- deliberately selects no member, terminal, prompt, output, credential or
-- provider-request content.

with expected_migrations(version) as (
  values
    ('20260810002754'),
    ('20260810010415'),
    ('20260812000100')
),
expected_tables(schema_name, table_name) as (
  values
    ('public', 'io_budget_limits'),
    ('public', 'io_usage_reservations'),
    ('public', 'io_usage_records'),
    ('private', 'io_idempotency_records'),
    ('private', 'io_ledger_transactions'),
    ('private', 'io_ledger_entries'),
    ('private', 'io_endpoint_health_samples'),
    ('private', 'io_endpoint_circuit_states'),
    ('private', 'io_endpoint_circuit_events'),
    ('public', 'io_terminal_sessions'),
    ('public', 'io_terminal_session_members'),
    ('public', 'io_terminal_session_events'),
    ('public', 'io_terminal_approval_requests'),
    ('public', 'io_terminal_approval_decisions')
),
missing_migrations as (
  select expected.version
  from expected_migrations as expected
  where not exists (
    select 1
    from supabase_migrations.schema_migrations as recorded
    where recorded.version = expected.version
  )
),
missing_tables as (
  select expected.schema_name, expected.table_name
  from expected_tables as expected
  where to_regclass(format('%I.%I', expected.schema_name, expected.table_name)) is null
),
rls_state as (
  select
    count(*) as expected_count,
    count(*) filter (where relation.relrowsecurity) as rls_enabled_count
  from expected_tables as expected
  join pg_namespace as namespace on namespace.nspname = expected.schema_name
  join pg_class as relation
    on relation.relnamespace = namespace.oid
    and relation.relname = expected.table_name
    and relation.relkind = 'r'
)
select jsonb_build_object(
  'project_contract', 'io_operational_terminal_v1',
  'missing_migrations', coalesce(
    (select jsonb_agg(version order by version) from missing_migrations),
    '[]'::jsonb
  ),
  'missing_tables', coalesce(
    (
      select jsonb_agg(format('%I.%I', schema_name, table_name) order by schema_name, table_name)
      from missing_tables
    ),
    '[]'::jsonb
  ),
  'expected_tables_have_rls', (
    select expected_count = 14 and rls_enabled_count = 14
    from rls_state
  ),
  'authenticated_direct_terminal_event_insert', has_table_privilege(
    'authenticated',
    'public.io_terminal_session_events',
    'insert'
  ),
  'authenticated_direct_usage_reservation_insert', has_table_privilege(
    'authenticated',
    'public.io_usage_reservations',
    'insert'
  ),
  'authenticated_direct_budget_limit_select', has_table_privilege(
    'authenticated',
    'public.io_budget_limits',
    'select'
  ),
  'anon_append_terminal_event_execute', has_function_privilege(
    'anon',
    'public.append_my_io_terminal_event(uuid,text,text,jsonb)',
    'execute'
  ),
  'authenticated_append_terminal_event_execute', has_function_privilege(
    'authenticated',
    'public.append_my_io_terminal_event(uuid,text,text,jsonb)',
    'execute'
  ),
  'anon_list_terminal_events_execute', has_function_privilege(
    'anon',
    'public.list_my_io_terminal_events(uuid,bigint,integer)',
    'execute'
  ),
  'authenticated_list_terminal_events_execute', has_function_privilege(
    'authenticated',
    'public.list_my_io_terminal_events(uuid,bigint,integer)',
    'execute'
  ),
  'anon_request_terminal_approval_execute', has_function_privilege(
    'anon',
    'public.request_my_io_terminal_approval(uuid,text,text,text,text,timestamptz)',
    'execute'
  ),
  'authenticated_request_terminal_approval_execute', has_function_privilege(
    'authenticated',
    'public.request_my_io_terminal_approval(uuid,text,text,text,text,timestamptz)',
    'execute'
  ),
  'anon_decide_terminal_approval_execute', has_function_privilege(
    'anon',
    'public.decide_my_io_terminal_approval(uuid,text,text)',
    'execute'
  ),
  'authenticated_decide_terminal_approval_execute', has_function_privilege(
    'authenticated',
    'public.decide_my_io_terminal_approval(uuid,text,text)',
    'execute'
  ),
  'authenticated_private_idempotency_select', has_table_privilege(
    'authenticated',
    'private.io_idempotency_records',
    'select'
  ),
  'authenticated_private_ledger_select', has_table_privilege(
    'authenticated',
    'private.io_ledger_entries',
    'select'
  ),
  'terminal_event_key_index', to_regclass(
    'public.io_terminal_session_events_session_key_idx'
  ) is not null,
  'pending_approval_index', to_regclass(
    'public.io_terminal_approval_requests_one_pending_idx'
  ) is not null,
  'reservation_count', (select count(*) from public.io_usage_reservations),
  'usage_record_count', (select count(*) from public.io_usage_records),
  'terminal_session_count', (select count(*) from public.io_terminal_sessions),
  'terminal_event_count', (select count(*) from public.io_terminal_session_events),
  'terminal_approval_request_count', (select count(*) from public.io_terminal_approval_requests)
) as release_contract;
