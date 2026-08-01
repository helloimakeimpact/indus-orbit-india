-- Retire the former Loops product without destroying its historical records.
-- The table remains available only to the server archive role for export and
-- future data-governance work; it is no longer a browser/Data API surface.

revoke all privileges on table public.loops
  from public, anon, authenticated, service_role;
grant select on table public.loops to service_role;

-- Remove every policy attached to the retired table, including any policy
-- introduced outside the recovered local history. RLS stays enabled as a
-- defense-in-depth default if table privileges are ever changed accidentally.
do $migration$
declare
  existing_policy record;
begin
  for existing_policy in
    select policy.policyname
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'loops'
  loop
    execute pg_catalog.format(
      'drop policy %I on public.loops',
      existing_policy.policyname
    );
  end loop;
end;
$migration$;

alter table public.loops enable row level security;

-- Archive rows are immutable through the remaining service_role contract, so
-- the product-era updated_at trigger is no longer needed.
drop trigger if exists loops_set_updated_at on public.loops;

comment on table public.loops is
  'ARCHIVED: the Loops product is retired. Rows are preserved for historical integrity and service_role-only archival/export; browser and member access is revoked.';
