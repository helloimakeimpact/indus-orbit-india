-- Read-only hosted release contract for the I/O evidence migration.
-- It returns schema/ACL facts and aggregate counts only; no member, route,
-- provider-secret, prompt, response, endpoint or error data is selected.

select jsonb_build_object(
  'project_contract', 'io_evidence_v1',
  'migration_recorded', exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260809174030'
  ),
  'conformance_index_migration_recorded', exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260809182509'
  ),
  'currency_column', exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'io_route_receipts'
      and column_name = 'selected_currency_code'
  ),
  'global_receipt_index', to_regclass('public.io_route_receipts_global_time_idx') is not null,
  'conformance_composite_index', to_regclass(
    'private.io_provider_conformance_runs_endpoint_capability_idx'
  ) is not null,
  'summary_function', to_regprocedure('public.admin_io_evidence_summary()') is not null,
  'receipt_function', to_regprocedure(
    'public.admin_io_recent_route_receipts(timestamptz,uuid,integer)'
  ) is not null,
  'anon_summary_execute', has_function_privilege(
    'anon',
    'public.admin_io_evidence_summary()',
    'execute'
  ),
  'authenticated_summary_execute', has_function_privilege(
    'authenticated',
    'public.admin_io_evidence_summary()',
    'execute'
  ),
  'anon_receipt_execute', has_function_privilege(
    'anon',
    'public.admin_io_recent_route_receipts(timestamptz,uuid,integer)',
    'execute'
  ),
  'authenticated_receipt_execute', has_function_privilege(
    'authenticated',
    'public.admin_io_recent_route_receipts(timestamptz,uuid,integer)',
    'execute'
  ),
  'route_receipt_count', (select count(*) from public.io_route_receipts),
  'provider_attempt_count', (select count(*) from public.io_provider_attempts)
) as release_contract;
