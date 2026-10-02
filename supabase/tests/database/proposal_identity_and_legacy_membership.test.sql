begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(9);
select is((select confrelid::regclass::text from pg_constraint
  where conrelid = 'public.chapter_proposals'::regclass and conname = 'chapter_proposals_proposer_id_fkey'),
  'profiles', 'Proposal identity resolves through the member profile');
select ok(not has_function_privilege('authenticated', 'public.lead_remove_chapter_member(uuid,uuid)', 'execute'), 'Members cannot call legacy Chapter deletion');
select ok(not has_function_privilege('authenticated', 'public.lead_remove_mission_member(uuid,uuid)', 'execute'), 'Members cannot call legacy Mission deletion');
select ok(not has_function_privilege('anon', 'public.lead_remove_chapter_member(uuid,uuid)', 'execute'), 'Anonymous callers cannot call legacy deletion');
select ok(not has_function_privilege('service_role', 'public.lead_remove_mission_member(uuid,uuid)', 'execute'), 'Service clients cannot bypass the canonical lifecycle');
select throws_ok($$select public.lead_remove_chapter_member(gen_random_uuid(),gen_random_uuid())$$,
  '42501', 'Legacy member removal is retired; use the canonical membership transition', 'Even owners cannot use retired physical deletion');
insert into auth.users (id, email, raw_user_meta_data) values
  ('99000000-0000-4000-8000-000000000001', 'proposal-identity@example.test', '{"display_name":"Proposal identity"}');
insert into public.chapter_proposals (id, proposer_id, proposed_name, rationale, proposer_background)
values ('99000000-0000-4000-8000-000000000002', '99000000-0000-4000-8000-000000000001', 'Identity test', 'Identity test', 'Identity test');
select is((select count(*)::int from public.chapter_proposals where id = '99000000-0000-4000-8000-000000000002'), 1, 'A valid profile can own a proposal');
delete from public.profiles where user_id = '99000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.chapter_proposals where id = '99000000-0000-4000-8000-000000000002'), 0, 'Removing the profile removes its proposal consistently with hosted behavior');
select throws_ok($$insert into public.chapter_proposals (proposer_id, proposed_name, rationale, proposer_background)
values ('99000000-0000-4000-8000-000000000001', 'Orphan', 'Orphan', 'Orphan')$$,
  '23503', null, 'An auth identity without a profile cannot create an orphan proposal');
select * from finish();
rollback;
