-- Read-only hosted contract for bounded direct-conversation history. It emits
-- only migration/function/grant facts and an aggregate message count.

select jsonb_build_object(
  'project_contract', 'direct_message_pagination_v1',
  'migration_present', exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260819225550'
  ),
  'function_present', to_regprocedure(
    'public.list_my_direct_conversation(uuid,timestamptz,uuid,integer)'
  ) is not null,
  'function_security_definer', coalesce((
    select proc.prosecdef
    from pg_catalog.pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.list_my_direct_conversation(uuid,timestamptz,uuid,integer)'
    )
  ), false),
  'authenticated_execute', has_function_privilege(
    'authenticated',
    'public.list_my_direct_conversation(uuid,timestamptz,uuid,integer)',
    'execute'
  ),
  'anon_execute', has_function_privilege(
    'anon',
    'public.list_my_direct_conversation(uuid,timestamptz,uuid,integer)',
    'execute'
  ),
  'authenticated_direct_insert', has_table_privilege(
    'authenticated',
    'public.direct_messages',
    'insert'
  ),
  'conversation_index_present', to_regclass(
    'public.direct_messages_conversation_recent_idx'
  ) is not null,
  'message_count', (select count(*) from public.direct_messages)
) as release_contract;
