-- Reconcile the clean replay with the observed hosted profile identity contract.
-- No data is removed. Unexpected constraints/orphans stop the migration.
do $migration$
declare
  existing_fk pg_constraint%rowtype;
  proposer_att smallint;
  target_att smallint;
begin
  select attnum into proposer_att from pg_attribute
    where attrelid = 'public.chapter_proposals'::regclass and attname = 'proposer_id';
  select * into existing_fk from pg_constraint
    where conrelid = 'public.chapter_proposals'::regclass
      and conname = 'chapter_proposals_proposer_id_fkey';
  if not found or existing_fk.contype <> 'f' or existing_fk.conkey <> array[proposer_att]
    or existing_fk.confrelid not in ('auth.users'::regclass, 'public.profiles'::regclass) then
    raise exception 'Unexpected chapter proposal identity constraint; manual reconciliation required';
  end if;
  select attnum into target_att from pg_attribute
    where attrelid = existing_fk.confrelid
      and attname = case when existing_fk.confrelid = 'auth.users'::regclass then 'id' else 'user_id' end;
  if target_att is null or existing_fk.confkey <> array[target_att] then
    raise exception 'Unexpected chapter proposal identity key';
  end if;
  if exists (select 1 from public.chapter_proposals cp
    left join public.profiles p on p.user_id = cp.proposer_id
    where p.user_id is null) then
    raise exception 'Chapter proposal identity reconciliation requires profiles for every proposer';
  end if;
  if existing_fk.confrelid = 'auth.users'::regclass then
    alter table public.chapter_proposals
      drop constraint chapter_proposals_proposer_id_fkey,
      add constraint chapter_proposals_proposer_id_fkey
        foreign key (proposer_id) references public.profiles(user_id) on delete cascade;
  elsif existing_fk.confdeltype <> 'c' or not existing_fk.convalidated then
    raise exception 'Unexpected profile identity constraint lifecycle';
  end if;
end;
$migration$;

-- Hosted historical RPCs physically deleted memberships and bypassed the current
-- expected-state lifecycle. Keep their signatures for schema reconciliation but
-- deny execution and direct callers to the canonical transition contracts.
create or replace function public.lead_remove_chapter_member(_chapter_id uuid, _target_user_id uuid)
returns void language plpgsql security invoker set search_path = pg_catalog, public
as $function$
begin
  raise exception using errcode = '42501', message = 'Legacy member removal is retired; use the canonical membership transition';
end;
$function$;
create or replace function public.lead_remove_mission_member(_mission_id uuid, _target_user_id uuid)
returns void language plpgsql security invoker set search_path = pg_catalog, public
as $function$
begin
  raise exception using errcode = '42501', message = 'Legacy member removal is retired; use the canonical membership transition';
end;
$function$;
revoke all on function public.lead_remove_chapter_member(uuid,uuid) from public, anon, authenticated, service_role;
revoke all on function public.lead_remove_mission_member(uuid,uuid) from public, anon, authenticated, service_role;
