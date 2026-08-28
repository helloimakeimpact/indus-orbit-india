-- Read-only hosted release contract for the trusted-event, email-claim and
-- Chapter/Mission Space forward migrations. This query must not mutate data.

with expected_migrations(version) as (
  values
    ('20260809142000'),
    ('20260809150000'),
    ('20260809152439')
),
expected_space_tables(table_name) as (
  values
    ('conversation_spaces'),
    ('conversation_space_roles'),
    ('conversation_space_memberships'),
    ('conversation_space_role_members'),
    ('conversation_context_groups'),
    ('conversation_rooms'),
    ('conversation_room_permission_overrides'),
    ('conversation_threads'),
    ('conversation_messages'),
    ('conversation_thread_members'),
    ('conversation_message_revisions'),
    ('conversation_mentions'),
    ('conversation_reactions'),
    ('conversation_attachments'),
    ('conversation_pins'),
    ('conversation_bookmarks'),
    ('conversation_read_states'),
    ('conversation_notification_preferences'),
    ('conversation_reports')
),
expected_functions(function_name) as (
  values
    ('create_my_connection_request'),
    ('respond_to_my_connection_request'),
    ('request_my_mentor_session'),
    ('transition_my_mentor_session'),
    ('request_my_vouch'),
    ('claim_email_delivery_batch'),
    ('complete_email_delivery'),
    ('create_my_chapter_proposal'),
    ('create_managed_chapter'),
    ('create_my_mission'),
    ('request_my_space_membership'),
    ('leave_my_conversation_space'),
    ('decide_space_membership'),
    ('set_managed_space_lead'),
    ('transition_managed_chapter'),
    ('transition_my_mission'),
    ('update_my_chapter_details'),
    ('create_my_conversation_thread'),
    ('get_my_conversation_thread_controls'),
    ('replace_managed_conversation_thread_members'),
    ('send_my_conversation_message'),
    ('mark_my_conversation_room_read')
),
missing_migrations as (
  select em.version
  from expected_migrations em
  where not exists (
    select 1
    from supabase_migrations.schema_migrations sm
    where sm.version = em.version
  )
),
missing_space_tables as (
  select est.table_name
  from expected_space_tables est
  where to_regclass(format('public.%I', est.table_name)) is null
),
space_rls as (
  select
    count(*) filter (where c.relrowsecurity) as enabled_count,
    count(*) as table_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join expected_space_tables est on est.table_name = c.relname
  where n.nspname = 'public'
    and c.relkind = 'r'
),
missing_functions as (
  select ef.function_name
  from expected_functions ef
  where not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = ef.function_name
  )
)
select jsonb_build_object(
  'project_contract', 'chapter_mission_space_v1',
  'missing_migrations', coalesce((select jsonb_agg(version order by version) from missing_migrations), '[]'::jsonb),
  'missing_space_tables', coalesce((select jsonb_agg(table_name order by table_name) from missing_space_tables), '[]'::jsonb),
  'space_rls_enabled', (select enabled_count = table_count and table_count = 19 from space_rls),
  'space_rls_table_count', (select table_count from space_rls),
  'missing_functions', coalesce((select jsonb_agg(function_name order by function_name) from missing_functions), '[]'::jsonb),
  'authenticated_direct_chapter_insert', has_table_privilege('authenticated', 'public.chapters', 'INSERT'),
  'authenticated_direct_chapter_update', has_table_privilege('authenticated', 'public.chapters', 'UPDATE'),
  'authenticated_direct_mission_insert', has_table_privilege('authenticated', 'public.missions', 'INSERT'),
  'authenticated_direct_mission_update', has_table_privilege('authenticated', 'public.missions', 'UPDATE'),
  'messages_in_realtime_publication', exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_messages'
  ),
  'conversation_spaces', (select count(*) from public.conversation_spaces),
  'conversation_rooms', (select count(*) from public.conversation_rooms),
  'conversation_messages', (select count(*) from public.conversation_messages),
  'providers', (select count(*) from public.io_providers),
  'models', (select count(*) from public.io_models),
  'endpoints', (select count(*) from public.io_model_endpoints),
  'capability_versions', (select count(*) from public.io_endpoint_capability_versions),
  'pricing_versions', (select count(*) from public.io_endpoint_pricing_versions),
  'runtime_controls', (select count(*) from private.io_provider_runtime_controls),
  'endpoint_connections', (select count(*) from private.io_endpoint_connections),
  'capacity_sources', (select count(*) from public.io_capacity_sources),
  'workspace_capacity_grants', (select count(*) from public.io_workspace_capacity_grants),
  'route_receipts', (select count(*) from public.io_route_receipts),
  'provider_attempts', (select count(*) from public.io_provider_attempts)
) as release_contract;
