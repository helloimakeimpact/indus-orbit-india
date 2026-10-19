-- Rollback-only synthetic Storage metadata simulates external API confirmations.
-- Production object removal must use the Storage API, never SQL metadata deletion.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) values
('97900000-0000-4000-8000-000000000001','retention-owner@example.test',now()),
('97900000-0000-4000-8000-000000000002','retention-held@example.test',now()),
('97900000-0000-4000-8000-000000000003','file-owner@example.test',now());
insert into public.events(id,organizer_id,title,description,start_time,end_time,location_type,status,registration_scope) values
('97900000-0000-4000-8000-000000000011','97900000-0000-4000-8000-000000000001','Old gathering','Synthetic retention event',now()-interval '101 days',now()-interval '100 days','virtual','approved','public'),
('97900000-0000-4000-8000-000000000012','97900000-0000-4000-8000-000000000001','Held gathering','Synthetic retention event',now()-interval '101 days',now()-interval '100 days','virtual','approved','public'),
('97900000-0000-4000-8000-000000000013','97900000-0000-4000-8000-000000000001','Recent gathering','Synthetic retention event',now()-interval '11 days',now()-interval '10 days','virtual','approved','public');
insert into private.event_registrations(id,event_id,guest_name,guest_email,status,updated_at) values
('97900000-0000-4000-8000-000000000021','97900000-0000-4000-8000-000000000011','Old guest','old@example.test','confirmed',now()-interval '100 days'),
('97900000-0000-4000-8000-000000000022','97900000-0000-4000-8000-000000000012','Held guest','held@example.test','confirmed',now()-interval '100 days'),
('97900000-0000-4000-8000-000000000023','97900000-0000-4000-8000-000000000013','Recent guest','recent@example.test','confirmed',now()-interval '10 days');
insert into private.event_registrations(id,event_id,user_id,status,updated_at) values
('97900000-0000-4000-8000-000000000024','97900000-0000-4000-8000-000000000011','97900000-0000-4000-8000-000000000002','confirmed',now()-interval '100 days');
insert into private.privacy_holds(id,event_id,reason,held_until,review_at,created_by) values
('97900000-0000-4000-8000-000000000031','97900000-0000-4000-8000-000000000012','Synthetic event hold',now()+interval '30 days',now()+interval '7 days','97900000-0000-4000-8000-000000000001');
insert into private.privacy_holds(id,subject_user_id,reason,held_until,review_at,created_by) values
('97900000-0000-4000-8000-000000000032','97900000-0000-4000-8000-000000000002','Synthetic subject hold',now()+interval '30 days',now()+interval '7 days','97900000-0000-4000-8000-000000000001');
update private.event_delivery_outbox set status='delivered',recipient_email='mail@example.test',template_data='{"synthetic":"private payload"}',prepared_payload='{"synthetic":"private mail"}',delivered_at=now()-interval '40 days';
select ok(not has_function_privilege('authenticated','public.run_privacy_retention_batch()','EXECUTE'),'Browser cannot run retention');
select ok(not has_function_privilege('anon','public.claim_privacy_file_cleanup()','EXECUTE'),'Guest cannot claim file cleanup');
select ok(not has_function_privilege('authenticated','public.complete_privacy_file_cleanup(uuid,uuid,boolean)','EXECUTE'),'Browser cannot settle physical removal');
set local "request.jwt.claims"='{"role":"service_role"}';
select lives_ok($$select public.run_privacy_retention_batch()$$,'Retention processes a bounded old fixture');
select is((select guest_name from private.event_registrations where id='97900000-0000-4000-8000-000000000021'),'Former guest','Old guest direct name is erased');
select ok((select guest_email like 'removed-%@invalid.example' and identity_erased_at is not null from private.event_registrations where id='97900000-0000-4000-8000-000000000021'),'Old guest email becomes a non-deliverable pseudonym');
select is((select status from private.event_registrations where id='97900000-0000-4000-8000-000000000021'),'confirmed','Attendance count/status remains intact');
select ok(not private.event_registration_eligible('97900000-0000-4000-8000-000000000021'),'Erased identity cannot receive access or mail');
select is((select guest_name from private.event_registrations where id='97900000-0000-4000-8000-000000000022'),'Held guest','Event hold preserves direct identity');
select is((select guest_name from private.event_registrations where id='97900000-0000-4000-8000-000000000023'),'Recent guest','Recent guest stays within retention window');
select is((select user_id from private.event_registrations where id='97900000-0000-4000-8000-000000000024'),'97900000-0000-4000-8000-000000000002'::uuid,'Subject hold preserves account association');
select ok((select bool_and(recipient_email is null and template_data is null and prepared_payload is null) from private.event_delivery_outbox where registration_id='97900000-0000-4000-8000-000000000021'),'Old terminal mail payload and address are cleared');
select ok((select bool_and(recipient_email is not null) from private.event_delivery_outbox where registration_id='97900000-0000-4000-8000-000000000022'),'Event hold preserves applicable mail evidence');
select lives_ok($$select public.run_privacy_retention_batch()$$,'Repeated retention is safe');
select is((select count(*)::integer from private.event_registrations),4,'Retention preserves aggregate registration rows');
insert into storage.objects(id,bucket_id,name,version,created_at,metadata) values
('97900000-0000-4000-8000-000000000041','education','resources/97900000-0000-4000-8000-000000000003/old.pdf','v1',now()-interval '40 days','{"size":12}'),
('97900000-0000-4000-8000-000000000042','education','resources/97900000-0000-4000-8000-000000000002/held.pdf','v1',now()-interval '40 days','{"size":12}'),
('97900000-0000-4000-8000-000000000043','education','resources/97900000-0000-4000-8000-000000000003/new.pdf','v1',now()-interval '1 day','{"size":12}');
create temp table cleanup_job as select public.claim_privacy_file_cleanup() as job;
select is((select job->>'object_id' from cleanup_job),'97900000-0000-4000-8000-000000000041','Only old unreferenced and unheld object is claimed');
select ok(not public.privacy_file_cleanup_current('97900000-0000-4000-8000-000000000041',gen_random_uuid()),'Wrong cleanup lease is rejected');
select ok((select public.privacy_file_cleanup_current((job->>'object_id')::uuid,(job->>'lease_token')::uuid) from cleanup_job),'Exact object version with current lease is accepted');
select throws_ok($$select public.complete_privacy_file_cleanup((job->>'object_id')::uuid,(job->>'lease_token')::uuid,true) from cleanup_job$$,'22023',null,'Metadata presence prevents false physical removal acknowledgement');
select throws_ok($$update storage.objects set version='replacement' where id='97900000-0000-4000-8000-000000000041'$$,'55000',null,'A retiring path cannot be overwritten');
-- Add an accepted hold after claim: the immediate preflight must stop removal.
insert into private.privacy_holds(id,subject_user_id,reason,held_until,review_at,created_by) values
('97900000-0000-4000-8000-000000000033','97900000-0000-4000-8000-000000000003','Hold accepted after claim',now()+interval '30 days',now()+interval '7 days','97900000-0000-4000-8000-000000000001');
select ok(not (select public.privacy_file_cleanup_current((job->>'object_id')::uuid,(job->>'lease_token')::uuid) from cleanup_job),'A hold accepted after claim prevents file cleanup');
select is((select state from private.privacy_file_cleanup where object_id='97900000-0000-4000-8000-000000000041'),'queued','Held cleanup is deferred');
update private.privacy_holds set released_at=now() where id='97900000-0000-4000-8000-000000000033';
update private.privacy_file_cleanup set due_at=now()-interval '1 second' where object_id='97900000-0000-4000-8000-000000000041';
update cleanup_job set job=public.claim_privacy_file_cleanup();
select ok((select public.privacy_file_cleanup_current((job->>'object_id')::uuid,(job->>'lease_token')::uuid) from cleanup_job),'Release permits a fresh cleanup lease');
-- Synthetic rollback-only API confirmation; no real object bytes are deleted.
delete from storage.objects where id='97900000-0000-4000-8000-000000000041';
select ok((select public.complete_privacy_file_cleanup((job->>'object_id')::uuid,(job->>'lease_token')::uuid,true) from cleanup_job),'Confirmed missing object can settle exactly its lease');
select is((select state from private.privacy_file_cleanup where object_id='97900000-0000-4000-8000-000000000041'),'deleted','Cleanup records confirmed completion');
select ok(not (select public.complete_privacy_file_cleanup((job->>'object_id')::uuid,(job->>'lease_token')::uuid,true) from cleanup_job),'Old lease cannot settle twice');
select is((select count(*)::integer from storage.objects where id in ('97900000-0000-4000-8000-000000000042','97900000-0000-4000-8000-000000000043')),2,'Held and recent object metadata remain untouched');
select * from finish();
rollback;
