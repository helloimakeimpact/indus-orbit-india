-- GoTrue/Storage calls are separately tested through dependency-injected
-- handlers. Auth metadata changes below are rollback-only confirmations.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) values
('96900000-0000-4000-8000-000000000001','close-subject@example.test',now()),
('96900000-0000-4000-8000-000000000002','close-operator@example.test',now()),
('96900000-0000-4000-8000-000000000003','close-other@example.test',now());
insert into public.user_roles(user_id,role) values('96900000-0000-4000-8000-000000000002','admin');
update public.profiles set display_name='Sensitive original name',bio='Sensitive biography',is_public=true where user_id='96900000-0000-4000-8000-000000000001';
insert into public.stories(id,author_id,title,content,status) values('96900000-0000-4000-8000-000000000021','96900000-0000-4000-8000-000000000001','My own story','Private authored content to erase','pending');
insert into public.direct_messages(id,sender_id,recipient_id,content,client_request_id) values
('96900000-0000-4000-8000-000000000031','96900000-0000-4000-8000-000000000001','96900000-0000-4000-8000-000000000003','Subject sent private text','96900000-0000-4000-8000-000000000041'),
('96900000-0000-4000-8000-000000000032','96900000-0000-4000-8000-000000000003','96900000-0000-4000-8000-000000000001','Other persons separate sent record','96900000-0000-4000-8000-000000000042');
set local role anon;
set local "request.jwt.claims"='{"role":"anon"}';
select lives_ok($$select public.enforce_account_access()$$,'Public Data API requests can pass the closure hook without private schema privileges');
reset role;
select ok(not has_function_privilege('authenticated','public.erase_closed_account_data(uuid,uuid)','EXECUTE'),'Browser cannot execute erasure');
select ok(not has_function_privilege('authenticated','public.claim_account_deletion()','EXECUTE'),'Browser cannot claim account closure');
set local role authenticated;
set local "request.jwt.claim.sub"='96900000-0000-4000-8000-000000000001';
set local "request.jwt.claims"='{"role":"authenticated","aal":"aal1"}';
select throws_ok($$select public.request_my_account_privacy_action_v2('96900000-0000-4000-8000-000000000003','deletion',null,'DELETE MY ACCOUNT',gen_random_uuid())$$,'42501',null,'Changed account cannot submit an old deletion form');
create temp table close_request as select public.request_my_account_privacy_action_v2('96900000-0000-4000-8000-000000000001','deletion',null,'DELETE MY ACCOUNT','96900000-0000-4000-8000-000000000011') as result;
select throws_ok($$select public.schedule_account_deletion((select (result->>'id')::uuid from close_request),1,'Reviewed verified request')$$,'42501',null,'A member cannot self-authorize worker execution');
set local "request.jwt.claim.sub"='96900000-0000-4000-8000-000000000002';
select throws_ok($$select public.schedule_account_deletion((select (result->>'id')::uuid from close_request),1,'Reviewed verified request')$$,'42501',null,'Privileged deletion approval still needs MFA');
set local "request.jwt.claims"='{"role":"authenticated","aal":"aal2"}';
select lives_ok($$select public.schedule_account_deletion((select (result->>'id')::uuid from close_request),1,'Reviewed verified request')$$,'MFA support can schedule the current request');
select throws_ok($$select public.schedule_account_deletion((select (result->>'id')::uuid from close_request),1,'Duplicate stale approval')$$,'40001',null,'Stale approval is rejected');
reset role;
set local "request.jwt.claims"='{"role":"service_role"}';
select is(public.claim_account_deletion(),null::jsonb,'Seven-day cancellation window is enforced');
update private.privacy_execution_jobs set not_before=now()-interval '1 second' where request_id=(select (result->>'id')::uuid from close_request);
select is(public.claim_account_deletion(),null::jsonb,'Missing Data API access guard prevents irreversible processing');
select is((select state from public.account_privacy_requests where id=(select (result->>'id')::uuid from close_request)),'blocked','Configuration failure records a visible blocker');
-- Fixture-only activation; ALTER ROLE is rolled back with the test.
alter role authenticator set pgrst.db_pre_request='public.enforce_account_access';
set local role authenticated;
set local "request.jwt.claim.sub"='96900000-0000-4000-8000-000000000002';
set local "request.jwt.claims"='{"role":"authenticated","aal":"aal2"}';
select lives_ok($$select public.admin_place_privacy_hold('96900000-0000-4000-8000-000000000051','96900000-0000-4000-8000-000000000001',null,'Synthetic safety hold',now()+interval '30 days',now()+interval '7 days')$$,'MFA operator can place a bounded, reviewable hold');
select throws_ok($$select public.schedule_account_deletion((select (result->>'id')::uuid from close_request),3,'Reviewed verified request')$$,'55000',null,'Active hold prevents scheduling erasure');
select lives_ok($$select public.admin_release_privacy_hold('96900000-0000-4000-8000-000000000051','Case resolved with evidence')$$,'Hold release is an explicit audited action');
select lives_ok($$select public.schedule_account_deletion((select (result->>'id')::uuid from close_request),3,'Reviewed after hold release')$$,'Resolved blocker permits a new versioned approval');
reset role;
set local "request.jwt.claims"='{"role":"service_role"}';
update private.privacy_execution_jobs set not_before=now()-interval '1 second' where request_id=(select (result->>'id')::uuid from close_request);
create temp table close_job as select public.claim_account_deletion() as job;
select is((select job->>'phase' from close_job),'frozen','Claim closes access before erasure');
select ok(public.is_suspended('96900000-0000-4000-8000-000000000001'),'Existing suspension checks also close the account');
select is((select is_public from public.profiles where user_id='96900000-0000-4000-8000-000000000001'),false,'Public profile is hidden immediately');
-- The clean CLI stack may have no default browser table grants. Grant only
-- the tested column inside this rolled-back fixture to exercise RLS itself.
grant select(user_id) on public.profiles to authenticated;
set local role authenticated;
set local "request.jwt.claim.sub"='96900000-0000-4000-8000-000000000001';
set local "request.jwt.claims"='{"role":"authenticated"}';
select is((select count(user_id)::integer from public.profiles),0,'An old JWT cannot read even its own table rows');
select throws_ok($$select public.enforce_account_access()$$,'42501',null,'Data API guard rejects a cryptographically valid old identity');
select throws_ok($$select public.cancel_my_account_privacy_request((select (result->>'id')::uuid from close_request),4)$$,'55000',null,'A started irreversible closure cannot be cancelled');
reset role;
set local "request.jwt.claims"='{"role":"service_role"}';
select throws_ok($$insert into public.user_roles(user_id,role) values('96900000-0000-4000-8000-000000000001','editor')$$,'42501',null,'A closed account cannot receive new authority');
select throws_ok($$select public.erase_closed_account_data((select (job->>'request_id')::uuid from close_job),gen_random_uuid())$$,'40001',null,'Wrong deletion lease cannot change data');
set local role authenticated;
set local "request.jwt.claim.sub"='96900000-0000-4000-8000-000000000002';
set local "request.jwt.claims"='{"role":"authenticated","aal":"aal2"}';
select lives_ok($$select public.admin_place_privacy_hold('96900000-0000-4000-8000-000000000052','96900000-0000-4000-8000-000000000001',null,'Safety hold after worker claim',now()+interval '30 days',now()+interval '7 days')$$,'Operator can place a hold after claim');
reset role;
set local "request.jwt.claims"='{"role":"service_role"}';
select ok(not (select public.account_deletion_current((job->>'request_id')::uuid,(job->>'lease_token')::uuid) from close_job),'Hold accepted after claim stops irreversible data cleanup');
select throws_ok($$select public.erase_closed_account_data((job->>'request_id')::uuid,(job->>'lease_token')::uuid) from close_job$$,'40001',null,'Held worker cannot erase account data');
set local role authenticated;
set local "request.jwt.claims"='{"role":"authenticated","aal":"aal2"}';
select lives_ok($$select public.admin_release_privacy_hold('96900000-0000-4000-8000-000000000052','Safety investigation resolved')$$,'Audited release permits current worker preflight');
reset role;
set local "request.jwt.claims"='{"role":"service_role"}';
select lives_ok($$select public.erase_closed_account_data((job->>'request_id')::uuid,(job->>'lease_token')::uuid) from close_job$$,'Current lease removes ordinary data transactionally');
select is((select display_name from public.profiles where user_id='96900000-0000-4000-8000-000000000001'),'Deleted member','Profile is a pseudonymous shell');
select is((select bio from public.profiles where user_id='96900000-0000-4000-8000-000000000001'),null::text,'Biography is removed');
select is((select count(*)::integer from public.stories where author_id='96900000-0000-4000-8000-000000000001'),0,'Own authored story is removed');
select is((select content from public.direct_messages where id='96900000-0000-4000-8000-000000000031'),'[Message removed]','Sent message text is removed');
select is((select content from public.direct_messages where id='96900000-0000-4000-8000-000000000032'),'Other persons separate sent record','Another persons separate record is preserved');
select is((public.advance_account_deletion((select (job->>'request_id')::uuid from close_job),(select (job->>'lease_token')::uuid from close_job))->>'phase'),'auth','Empty file inventory advances to managed Auth cleanup');
select throws_ok($$select public.complete_account_deletion((job->>'request_id')::uuid,(job->>'lease_token')::uuid) from close_job$$,'55000',null,'Cannot claim completion before managed Auth evidence');
update auth.users set deleted_at=now(),raw_user_meta_data='{}'::jsonb where id='96900000-0000-4000-8000-000000000001';
select ok((select public.complete_account_deletion((job->>'request_id')::uuid,(job->>'lease_token')::uuid) from close_job),'Synthetic confirmed Auth evidence permits completion');
select is((select state from public.account_privacy_requests where id=(select (result->>'id')::uuid from close_request)),'completed','Completion is recorded after every stage');
select ok((select report->>'authRemoval'='confirmed' from private.account_closures where user_id='96900000-0000-4000-8000-000000000001'),'Retained report states the actual completion boundary');
select is((select count(*)::integer from public.profiles where user_id='96900000-0000-4000-8000-000000000003'),1,'Other account remains intact');
select * from finish();
rollback;
