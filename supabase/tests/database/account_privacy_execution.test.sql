-- Synthetic, rollback-only fixtures. Storage metadata INSERT/DELETE below
-- emulate upload/removal confirmations; production uses the Storage API.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) values
('95900000-0000-4000-8000-000000000001','privacy-one@example.test',now()),
('95900000-0000-4000-8000-000000000002','privacy-two@example.test',now());
update public.profiles set display_name=case user_id when '95900000-0000-4000-8000-000000000001' then 'Export owner' else 'Other private person' end
where user_id in ('95900000-0000-4000-8000-000000000001','95900000-0000-4000-8000-000000000002');
select ok(not has_table_privilege('authenticated','private.privacy_execution_jobs','SELECT'),'Browser cannot inspect export jobs');
select ok(not has_table_privilege('authenticated','private.privacy_holds','INSERT'),'Browser cannot invent holds');
select ok(not has_function_privilege('anon','public.build_account_export(uuid,uuid)','EXECUTE'),'Anonymous cannot read snapshots');
select ok(not has_function_privilege('authenticated','public.complete_account_export(uuid,uuid,text,integer)','EXECUTE'),'Browser cannot mark an export ready');
set local role authenticated;
set local "request.jwt.claim.sub"='95900000-0000-4000-8000-000000000001';
set local "request.jwt.claims"='{"role":"authenticated"}';
create temp table export_request as select public.request_my_account_privacy_action('export',null,null,'95900000-0000-4000-8000-000000000011') as result;
select throws_ok($$select public.claim_account_export()$$,'42501',null,'Ordinary member cannot claim work');
reset role;
set local "request.jwt.claims"='{"role":"service_role"}';
create temp table export_job as select public.claim_account_export() as job;
select is((select job->>'requester_id' from export_job),'95900000-0000-4000-8000-000000000001','Worker job is bound to the requester');
select ok(public.account_export_current((select (job->>'request_id')::uuid from export_job),(select (job->>'lease_token')::uuid from export_job)),'Current service lease is accepted');
select ok(not public.account_export_current((select (job->>'request_id')::uuid from export_job),gen_random_uuid()),'Wrong lease is denied');
create temp table export_body as select public.build_account_export((job->>'request_id')::uuid,(job->>'lease_token')::uuid) as body from export_job;
select is((select body->>'subject_user_id' from export_body),'95900000-0000-4000-8000-000000000001','Snapshot identifies exactly its subject');
select is((select jsonb_array_length(body->'datasets'->'public.profiles') from export_body),1,'Only the requester profile is included');
select is((select body->'datasets'->'public.profiles'->0->>'display_name' from export_body),'Export owner','Own data is exported');
select ok((select body::text not like '%Other private person%' from export_body),'Other private profile is excluded');
select ok((select not (body->'datasets' ? 'auth.users') from export_body),'Auth password/session records are excluded');
select is((select count(*)::integer from export_body, lateral jsonb_object_keys(body->'datasets')),35,'Portable account export uses thirty-five explicit reviewed datasets');
select ok((select body->'datasets' ? 'public.conversation_space_memberships' from export_body),'Own group opt-in is included in portable account coverage');
select ok((select body::text not like '%"key_hash"%' from export_body),'API key credentials are excluded');
select throws_ok($$select public.complete_account_export((job->>'request_id')::uuid,(job->>'lease_token')::uuid,repeat('a',64),100) from export_job$$,'22023',null,'Cannot claim an artifact before upload confirmation');
insert into storage.objects(bucket_id,name,metadata) select 'account-exports',job->>'artifact_path','{"size":100,"mimetype":"application/json"}' from export_job;
select ok((select public.complete_account_export((job->>'request_id')::uuid,(job->>'lease_token')::uuid,repeat('a',64),100) from export_job),'Confirmed immutable artifact becomes ready');
select is((select state from public.account_privacy_requests where id=(select (job->>'request_id')::uuid from export_job)),'ready','Request becomes ready only after upload');
set local role authenticated;
set local "request.jwt.claims"='{"role":"authenticated"}';
select is((select count(*)::integer from storage.objects where bucket_id='account-exports'),1,'Owner can read their current artifact');
select is((public.get_my_account_export((select (result->>'id')::uuid from export_request))->>'expires_in')::integer,300,'Download proof is bounded to five minutes');
-- Model the Storage API transaction flag while keeping its protection
-- trigger installed. This tests restrictive RLS, not direct SQL permission.
set local "storage.allow_delete_query"='true';
with removed as (delete from storage.objects where bucket_id='account-exports' returning id) select is(count(*)::integer,0,'Browser cannot delete an immutable export') from removed;
set local "storage.allow_delete_query"='false';
set local "request.jwt.claim.sub"='95900000-0000-4000-8000-000000000002';
select is((select count(*)::integer from storage.objects where bucket_id='account-exports'),0,'Another member cannot read the artifact');
select throws_ok($$select public.get_my_account_export((select (result->>'id')::uuid from export_request))$$,'42501',null,'Another member cannot mint download details');
reset role;
set local "request.jwt.claims"='{"role":"service_role"}';
update public.account_privacy_requests set artifact_expires_at=now()-interval '1 second' where id=(select (job->>'request_id')::uuid from export_job);
select lives_ok($$select public.run_privacy_retention_batch()$$,'Retention expires finished artifacts');
select is((select state from public.account_privacy_requests where id=(select (job->>'request_id')::uuid from export_job)),'expired','Expired artifact cannot remain ready');
-- Cancellation after claim invalidates both snapshot and completion.
set local role authenticated;
set local "request.jwt.claim.sub"='95900000-0000-4000-8000-000000000001';
set local "request.jwt.claims"='{"role":"authenticated"}';
create temp table cancelled_request as select public.request_my_account_privacy_action('export',null,null,'95900000-0000-4000-8000-000000000012') as result;
reset role;
set local "request.jwt.claims"='{"role":"service_role"}';
create temp table cancelled_job as select public.claim_account_export() as job;
set local role authenticated;
set local "request.jwt.claims"='{"role":"authenticated"}';
select lives_ok($$select public.cancel_my_account_privacy_request((select (result->>'id')::uuid from cancelled_request),2)$$,'Member can cancel after a worker claim');
reset role;
set local "request.jwt.claims"='{"role":"service_role"}';
select ok(not public.account_export_current((select (job->>'request_id')::uuid from cancelled_job),(select (job->>'lease_token')::uuid from cancelled_job)),'Cancellation invalidates the lease');
select throws_ok($$select public.build_account_export((job->>'request_id')::uuid,(job->>'lease_token')::uuid) from cancelled_job$$,'40001',null,'Cancelled job cannot rebuild private data');
select ok(not public.complete_account_export((select (job->>'request_id')::uuid from cancelled_job),(select (job->>'lease_token')::uuid from cancelled_job),repeat('a',64),100),'Cancelled job cannot publish an artifact');
select * from finish();
rollback;
