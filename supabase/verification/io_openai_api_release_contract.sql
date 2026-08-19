-- Read-only hosted release contract for the bounded OpenAI-compatible I/O API.
-- Run against project jpwvgpnbkrktipwhvqss after migration 20260819232624.

select
  exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260819232624'
      and name = 'add_io_openai_api_foundation'
  ) as migration_present,
  to_regclass('private.io_api_key_rate_windows') is not null as rate_table_present,
  to_regprocedure(
    'public.create_my_io_test_api_key(uuid,text,text[],timestamptz)'
  ) is not null as create_function_present,
  to_regprocedure('public.revoke_my_io_api_key(uuid)') is not null as revoke_function_present,
  to_regprocedure(
    'public.io_consume_api_key_request(text,text,integer)'
  ) is not null as consume_function_present,
  (
    select prosecdef
    from pg_proc
    where oid = 'public.create_my_io_test_api_key(uuid,text,text[],timestamptz)'::regprocedure
  ) as create_security_definer,
  (
    select proconfig = array['search_path=""']::text[]
    from pg_proc
    where oid = 'public.create_my_io_test_api_key(uuid,text,text[],timestamptz)'::regprocedure
  ) as create_empty_search_path,
  has_function_privilege(
    'authenticated',
    'public.create_my_io_test_api_key(uuid,text,text[],timestamptz)',
    'execute'
  ) as authenticated_can_create,
  not has_function_privilege(
    'anon',
    'public.create_my_io_test_api_key(uuid,text,text[],timestamptz)',
    'execute'
  ) as anonymous_cannot_create,
  has_function_privilege(
    'service_role',
    'public.io_consume_api_key_request(text,text,integer)',
    'execute'
  ) as service_can_consume,
  not has_function_privilege(
    'authenticated',
    'public.io_consume_api_key_request(text,text,integer)',
    'execute'
  ) as browser_cannot_consume,
  not has_table_privilege(
    'authenticated',
    'private.io_api_key_rate_windows',
    'select'
  ) as browser_cannot_read_rate_windows,
  not has_table_privilege(
    'authenticated',
    'private.io_api_key_rate_windows',
    'insert'
  ) as browser_cannot_forge_rate_windows;
