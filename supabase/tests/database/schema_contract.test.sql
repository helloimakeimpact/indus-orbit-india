begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

-- Member-platform foundations.
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'user_roles', 'user roles table exists');
select has_table('public', 'direct_messages', 'direct messages table exists');
select has_table('public', 'notifications', 'notifications table exists');

-- I/O workspace, registry and route-evidence foundations.
select has_table('public', 'io_workspaces', 'I/O workspaces table exists');
select has_table('public', 'io_workspace_members', 'I/O workspace members table exists');
select has_table('public', 'io_providers', 'I/O providers table exists');
select has_table('public', 'io_models', 'I/O models table exists');
select has_table('public', 'io_model_endpoints', 'I/O model endpoints table exists');
select has_table('public', 'io_route_receipts', 'I/O route receipts table exists');
select has_table('public', 'io_provider_attempts', 'I/O provider attempts table exists');

-- Admin control-plane state remains outside the exposed public schema.
select has_table('private', 'admin_team_assignments', 'admin team assignments table exists');
select has_table(
  'private',
  'io_provider_runtime_controls',
  'provider runtime controls table exists'
);

-- Critical caller-bound RPC and server-only resolver contracts.
select ok(
  to_regprocedure('public.create_my_io_workspace()') is not null,
  'authenticated workspace creation RPC exists'
);
select ok(
  to_regprocedure('public.io_get_ready_endpoint_connections()') is not null,
  'server-only ready endpoint resolver exists'
);
select ok(
  to_regprocedure('public.get_my_admin_access()') is not null,
  'caller-bound admin access RPC exists'
);
select ok(
  to_regprocedure('public.admin_io_operational_snapshot()') is not null,
  'admin I/O operational snapshot RPC exists'
);
select ok(
  to_regprocedure('public.admin_io_set_provider_routing(uuid,boolean,text)') is not null,
  'admin provider routing RPC exists'
);

-- Critical exposed tables must retain row-level security.
select ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'profiles'
  ),
  'profiles has row-level security enabled'
);
select ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'direct_messages'
  ),
  'direct messages has row-level security enabled'
);
select ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'io_providers'
  ),
  'I/O providers has row-level security enabled'
);
select ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'io_route_receipts'
  ),
  'I/O route receipts has row-level security enabled'
);

-- Execute grants preserve browser/server trust boundaries.
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_my_io_workspace()',
    'EXECUTE'
  ),
  'authenticated may execute workspace creation RPC'
);
select ok(
  not has_function_privilege('anon', 'public.create_my_io_workspace()', 'EXECUTE'),
  'anonymous users cannot execute workspace creation RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.io_get_ready_endpoint_connections()',
    'EXECUTE'
  ),
  'service role may execute the ready endpoint resolver'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.io_get_ready_endpoint_connections()',
    'EXECUTE'
  ),
  'authenticated users cannot execute the ready endpoint resolver'
);

-- Root and private administration data must remain non-mutable/non-readable
-- through browser table privileges.
select ok(
  has_table_privilege('authenticated', 'public.user_roles', 'SELECT'),
  'authenticated retains RLS-scoped user-role reads'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_roles', 'INSERT')
    and not has_table_privilege('authenticated', 'public.user_roles', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.user_roles', 'DELETE'),
  'authenticated cannot mutate root user roles directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'private.admin_team_assignments',
    'SELECT'
  ),
  'authenticated cannot read private admin assignments directly'
);

select * from finish();

rollback;
