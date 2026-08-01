begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

select has_table('public', 'loops', 'archived Loops rows retain their table');

select ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class as relation
    where relation.oid = 'public.loops'::regclass
  ),
  'archived Loops table keeps row-level security enabled'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'loops'
  $$,
  array[0::bigint],
  'archived Loops table has no browser-facing policies'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_catalog.pg_trigger as trigger
    where trigger.tgrelid = 'public.loops'::regclass
      and not trigger.tgisinternal
  $$,
  array[0::bigint],
  'retired product update trigger is removed'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_class as relation
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        relation.relacl,
        pg_catalog.acldefault('r', relation.relowner)
      )
    ) as privilege
    where relation.oid = 'public.loops'::regclass
      and privilege.grantee = 0
  ),
  'PUBLIC has no table ACL on archived Loops'
);

select ok(
  not exists (
    select 1
    from information_schema.column_privileges as privilege
    where privilege.table_schema = 'public'
      and privilege.table_name = 'loops'
      and privilege.grantee in ('PUBLIC', 'anon', 'authenticated')
  ),
  'browser roles have no column-level Loops grants'
);

select ok(
  not has_table_privilege('anon', 'public.loops', 'SELECT')
    and not has_table_privilege('anon', 'public.loops', 'INSERT')
    and not has_table_privilege('anon', 'public.loops', 'UPDATE')
    and not has_table_privilege('anon', 'public.loops', 'DELETE')
    and not has_table_privilege('anon', 'public.loops', 'TRUNCATE')
    and not has_table_privilege('anon', 'public.loops', 'REFERENCES')
    and not has_table_privilege('anon', 'public.loops', 'TRIGGER'),
  'anonymous role has no Loops table privileges'
);

select ok(
  not has_table_privilege('authenticated', 'public.loops', 'SELECT')
    and not has_table_privilege('authenticated', 'public.loops', 'INSERT')
    and not has_table_privilege('authenticated', 'public.loops', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.loops', 'DELETE')
    and not has_table_privilege('authenticated', 'public.loops', 'TRUNCATE')
    and not has_table_privilege('authenticated', 'public.loops', 'REFERENCES')
    and not has_table_privilege('authenticated', 'public.loops', 'TRIGGER'),
  'authenticated role has no Loops table privileges'
);

select ok(
  has_table_privilege('service_role', 'public.loops', 'SELECT'),
  'service role retains archive read access'
);

select ok(
  not has_table_privilege('service_role', 'public.loops', 'INSERT')
    and not has_table_privilege('service_role', 'public.loops', 'UPDATE')
    and not has_table_privilege('service_role', 'public.loops', 'DELETE')
    and not has_table_privilege('service_role', 'public.loops', 'TRUNCATE')
    and not has_table_privilege('service_role', 'public.loops', 'REFERENCES')
    and not has_table_privilege('service_role', 'public.loops', 'TRIGGER'),
  'service role archive contract is read-only'
);

select ok(
  pg_catalog.strpos(
    coalesce(
      pg_catalog.obj_description('public.loops'::regclass, 'pg_class'),
      ''
    ),
    'ARCHIVED'
  ) > 0
    and pg_catalog.strpos(
      coalesce(
        pg_catalog.obj_description('public.loops'::regclass, 'pg_class'),
        ''
      ),
      'service_role-only'
    ) > 0,
  'table comment records the archived service-role-only contract'
);

insert into public.loops (id, slug, title)
values (
  '30000000-0000-4000-8000-000000000001'::uuid,
  'archived-loop-contract-fixture',
  'Archived Loop contract fixture'
);

set local role service_role;

select results_eq(
  $$
    select archived.id
    from public.loops as archived
    where archived.slug = 'archived-loop-contract-fixture'
  $$,
  array['30000000-0000-4000-8000-000000000001'::uuid],
  'service role can export a preserved archived row'
);

reset role;

select * from finish();

rollback;
