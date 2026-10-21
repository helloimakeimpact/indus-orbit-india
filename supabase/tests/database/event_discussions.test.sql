begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('97300000-0000-4000-8000-000000000001','discussion-host@example.test',now(),'{"display_name":"Host"}'),
('97300000-0000-4000-8000-000000000002','discussion-member@example.test',now(),'{"display_name":"Member"}'),
('97300000-0000-4000-8000-000000000003','discussion-guest@example.test',now(),'{"display_name":"Guest"}'),
('97300000-0000-4000-8000-000000000004','discussion-outsider@example.test',now(),'{"display_name":"Outsider"}'),
('97300000-0000-4000-8000-000000000005','discussion-unverified@example.test',null,'{"email":"discussion-guest@example.test","display_name":"Unverified"}'),
('97300000-0000-4000-8000-000000000006','discussion-waiting@example.test',now(),'{"display_name":"Waiting"}');
insert into private.community_onboarding_state(user_id,status,current_step,started_at,completed_at) values('97300000-0000-4000-8000-000000000001','completed','completed',now(),now());
insert into public.events(id,organizer_id,title,description,start_time,end_time,location_type,status,registration_scope) values
('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000001','Private attendee discussion','A real conversation behind a public invitation',now()+interval '1 hour',now()+interval '2 hours','virtual','approved','public');
insert into private.event_registrations(id,event_id,user_id,guest_email,guest_name,status,approved_at) values
('97300000-0000-4000-8000-000000000021','97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002',null,null,'confirmed',now()),
('97300000-0000-4000-8000-000000000022','97300000-0000-4000-8000-000000000011',null,'discussion-guest@example.test','Guest before account linking','confirmed',now()),
('97300000-0000-4000-8000-000000000023','97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000006',null,null,'waitlisted',now());
select ok(not has_table_privilege('authenticated','private.event_discussions','SELECT'),'Discussion controls remain private');
select ok(not has_function_privilege('anon','public.get_event_discussion(uuid)','EXECUTE'),'Anonymous discovery does not expose discussions');
select ok(not has_function_privilege('anon','public.list_event_discussion_feed(uuid,uuid,integer,timestamptz,uuid,timestamptz,uuid)','EXECUTE'),'Anonymous visitors cannot read history');
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000004';
select throws_ok($$select public.set_event_discussion('97300000-0000-4000-8000-000000000011',true,0,'97300000-0000-4000-8000-000000000004')$$,'42501',null,'Outsider cannot enable another host discussion');
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000001';
select throws_ok($$select public.set_event_discussion('97300000-0000-4000-8000-000000000011',true,0,'97300000-0000-4000-8000-000000000002')$$,'42501',null,'Changed account cannot act through a stale host form');
create temp table event_discussion_state as select public.set_event_discussion('97300000-0000-4000-8000-000000000011',true,0,'97300000-0000-4000-8000-000000000001') as value;
select is((select value->>'joined' from event_discussion_state),'true','Host opt-in provisions and joins the Room');
select throws_ok($$select public.set_event_discussion('97300000-0000-4000-8000-000000000011',true,0,'97300000-0000-4000-8000-000000000001')$$,'40001',null,'Stale provisioning cannot create a second Room');
reset role;
select is((select count(*)::integer from private.event_discussions where event_id='97300000-0000-4000-8000-000000000011'),1,'Provisioning is unique per event');
select is((select count(*)::integer from public.conversation_spaces where event_id='97300000-0000-4000-8000-000000000011'),1,'Existing conversation storage has one event source');
select is((select count(*)::integer from public.chapter_members where user_id in ('97300000-0000-4000-8000-000000000002','97300000-0000-4000-8000-000000000003')),0,'Discussion creates no Chapter membership');
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000004';
select is(public.get_event_discussion('97300000-0000-4000-8000-000000000011')->>'roomId',null,'Public invitation reveals no Room to outsiders');
select throws_ok($$select public.join_event_discussion('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000004')$$,'42501',null,'A signed-in outsider cannot join');
select is(jsonb_array_length(public.list_my_community_chat_links()),0,'Outsider inbox has no private group links');
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000006';
select throws_ok($$select public.join_event_discussion('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000006')$$,'42501',null,'Waitlisted attendees cannot read the confirmed group');
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000005';
select throws_ok($$select public.join_event_discussion('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000005')$$,'42501',null,'Client metadata email cannot claim a verified guest');
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000003';
select is(public.get_event_discussion('97300000-0000-4000-8000-000000000011')->>'canJoin','true','Verified Auth email can claim its email-only registration');
select is(public.get_event_discussion('97300000-0000-4000-8000-000000000011')->>'roomId',null,'Verified guest has no history before explicit join');
select lives_ok($$select public.join_event_discussion('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003')$$,'Explicit join links the verified guest');
reset role;
select is((select user_id from private.event_registrations where id='97300000-0000-4000-8000-000000000022'),'97300000-0000-4000-8000-000000000003'::uuid,'Only the server verified identity is linked');
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000002';
select lives_ok($$select public.join_event_discussion('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002')$$,'Confirmed attendee joins without expanded Community membership');
create temp table event_message as select public.send_event_discussion_message('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002','Attendee question before the gathering','97300000-0000-4000-8000-000000000031') as id;
select is(public.send_event_discussion_message('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002','Attendee question before the gathering','97300000-0000-4000-8000-000000000031'),(select id from event_message),'Uncertain send retry returns the original message');
select throws_ok($$select public.send_event_discussion_message('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003','Stale account message',gen_random_uuid())$$,'42501',null,'Account-bound event send rejects a new identity');
select is(jsonb_array_length(public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002')->'items'),1,'Event adapter reuses durable Room feed');
select throws_ok($$select public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003')$$,'42501',null,'Account-bound history rejects a stale identity');
select throws_ok($$select public.mark_event_discussion_read('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003',(select id from event_message))$$,'42501',null,'Stale identity cannot acknowledge the old account history');
select lives_ok($$select public.mark_event_discussion_read('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002',(select id from event_message))$$,'Visible current participant can acknowledge its Room read');
-- Member reports use existing private safety review, and host moderation is
-- audited without exposing case evidence to the group.
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000003';
select lives_ok($$select public.event_discussion_safety_action('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003',(select id from event_message),'report','safety','A concern requiring private review','97300000-0000-4000-8000-000000000041')$$,'A current attendee can report a group message');
select lives_ok($$select public.event_discussion_safety_action('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003',(select id from event_message),'report','safety','A concern requiring private review','97300000-0000-4000-8000-000000000041')$$,'Uncertain report retry reuses the same safety record');
select throws_ok($$select public.event_discussion_safety_action('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003',(select id from event_message),'content_restrict','safety','An attendee cannot moderate',gen_random_uuid())$$,'42501',null,'Attendee cannot take host moderation authority');
select throws_ok($$select public.event_discussion_safety_action('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000001',(select id from event_message),'report','safety','Stale account report attempt',gen_random_uuid())$$,'42501',null,'Stale account cannot submit a safety action');
reset role;
select is((select count(*)::integer from public.conversation_reports where message_id=(select id from event_message)),1,'Report retries create one private safety record');
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000004';
select throws_ok($$select public.event_discussion_safety_action('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000004',(select id from event_message),'report','safety','An outsider cannot inspect this group',gen_random_uuid())$$,'42501',null,'Outsider cannot use report to inspect or affect a private message');
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000001';
select is(public.event_discussion_safety_action('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000001',(select id from event_message),'content_restrict','safety','Restrict for reviewed group safety','97300000-0000-4000-8000-000000000042')->>'action','content_restrict','Host can restrict group content with audit evidence');
select throws_ok($$select public.event_discussion_safety_action('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000001',(select id from event_message),'restore','safety','Cannot replay another action','97300000-0000-4000-8000-000000000042')$$,'22023',null,'Moderation retry ID cannot silently authorize a different action');
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000003';
select is(public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003')->'items'->0->>'content',null,'Restricted content has a stable tombstone in group history');
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000001';
select is(public.event_discussion_safety_action('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000001',(select id from event_message),'restore','safety','Reviewed content may be restored','97300000-0000-4000-8000-000000000043')->>'action','restore','Host restoration is an explicit audited action');
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000002';
-- A long reconnect uses stable keyset pages; an older viewport refresh is
-- anchored inclusively and never splices an unknown latest-page gap.
reset role;
savepoint history_fixture;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000001';
insert into public.conversation_messages(room_id,author_id,content,client_request_id,created_at)
select (select (value->>'roomId')::uuid from event_discussion_state),'97300000-0000-4000-8000-000000000001','Historical message '||n,gen_random_uuid(),now()-interval '200 seconds'+n*interval '1 second' from generate_series(1,120) n;
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000002';
create temp table event_first_page as select public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002',50) as value;
select is(jsonb_array_length((select value->'items' from event_first_page)),50,'History page is bounded to fifty requested rows');
select is((select value->>'hasMore' from event_first_page),'true','Older history has an explicit cursor');
create temp table event_second_page as select public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002',50,(select (value->'nextCursor'->>'createdAt')::timestamptz from event_first_page),(select (value->'nextCursor'->>'id')::uuid from event_first_page)) as value;
select is((select count(distinct item->>'id')::integer from (select jsonb_array_elements(value->'items') item from event_first_page union all select jsonb_array_elements(value->'items') from event_second_page) history),100,'Consecutive keyset pages have no duplicate or missing boundary');
select throws_ok($$select public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002',101)$$,'22023',null,'Event history rejects an oversized server page');
reset role;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000001';
insert into public.conversation_messages(room_id,author_id,content,client_request_id,created_at)
select (select (value->>'roomId')::uuid from event_discussion_state),'97300000-0000-4000-8000-000000000001','Missed message '||n,gen_random_uuid(),now()+n*interval '1 second' from generate_series(1,65) n;
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000002';
create temp table event_anchored_page as select public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002',50,null,null,(select created_at from public.conversation_messages where id=(select id from event_message)),(select id from event_message)) as value;
select is((select value->'items' from event_anchored_page),(select value->'items' from event_first_page),'Anchored older refresh preserves exactly the visible history despite 65 new messages');
select is((select value->>'newerAvailable' from event_anchored_page),'true','An older viewport is told that newer messages exist');
select is(jsonb_array_length(public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002',100)->'items'),100,'Reconnect can fetch a contiguous one-hundred-row server window');
reset role;
rollback to history_fixture;
release savepoint history_fixture;
-- Host closure uses a revision-bound toggle without creating another history.
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000001';
select is(public.set_event_discussion('97300000-0000-4000-8000-000000000011',false,1,'97300000-0000-4000-8000-000000000001')->>'enabled','false','Host can close the existing discussion');
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000003';
select throws_ok($$select public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003')$$,'42501',null,'Host closure immediately rejects an existing participant');
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000001';
select is(public.set_event_discussion('97300000-0000-4000-8000-000000000011',true,2,'97300000-0000-4000-8000-000000000001')->>'roomId',(select value->>'roomId' from event_discussion_state),'Reopening preserves the same durable Room and history');
reset role;
insert into public.member_suspensions(user_id,actor_id,reason) values('97300000-0000-4000-8000-000000000003','97300000-0000-4000-8000-000000000001','Synthetic event suspension');
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000003';
select throws_ok($$select public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003')$$,'42501',null,'Suspension revokes a previously joined discussion');
reset role;
update public.member_suspensions set lifted_at=now() where user_id='97300000-0000-4000-8000-000000000003';
-- Authored event messages remain inside the existing explicit export inventory.
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000002';
create temp table event_export_request as select public.request_my_account_privacy_action_v2('97300000-0000-4000-8000-000000000002','export',null,null,gen_random_uuid()) as value;
reset role;
set local "request.jwt.claims"='{"role":"service_role"}';
create temp table event_export_job as select public.claim_account_export() as value;
select ok((public.build_account_export((select (value->>'request_id')::uuid from event_export_job),(select (value->>'lease_token')::uuid from event_export_job))::text like '%Attendee question before the gathering%'),'Portable export includes authored event Room content');
select is((select count(*)::integer from jsonb_object_keys(public.build_account_export((select (value->>'request_id')::uuid from event_export_job),(select (value->>'lease_token')::uuid from event_export_job))->'datasets')),35,'Export coverage explicitly includes the thirty-fifth group opt-in dataset');
select is(jsonb_array_length(public.build_account_export((select (value->>'request_id')::uuid from event_export_job),(select (value->>'lease_token')::uuid from event_export_job))->'datasets'->'public.conversation_space_memberships'),1,'Export contains only this caller group membership');
select is(public.build_account_export((select (value->>'request_id')::uuid from event_export_job),(select (value->>'lease_token')::uuid from event_export_job))->'datasets'->'public.conversation_space_memberships'->0->>'user_id','97300000-0000-4000-8000-000000000002','Other participants membership rows are excluded');

insert into private.privacy_holds(subject_user_id,event_id,reason,held_until,review_at,created_by) values(null,'97300000-0000-4000-8000-000000000011','Synthetic event safety hold',now()+interval '30 days',now()+interval '7 days','97300000-0000-4000-8000-000000000001');
select ok(private.privacy_is_held('97300000-0000-4000-8000-000000000002',null),'An event hold protects a linked attendee from account erasure');
-- Realtime Postgres Changes checks the same SELECT RLS for every outgoing row.
grant select on public.conversation_messages to authenticated;
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000002';
set local "request.jwt.claims"='{"role":"authenticated"}';
select is((select count(*)::integer from public.conversation_messages where id=(select id from event_message)),1,'Current participant passes message row RLS');
reset role;
update private.event_registrations set status='cancelled' where id='97300000-0000-4000-8000-000000000021';
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.conversation_messages where id=(select id from event_message)),0,'Registration revocation immediately closes row RLS');
select throws_ok($$select public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002')$$,'42501',null,'Revoked attendee cannot refresh old Room history');
select throws_ok($$select public.send_event_discussion_message('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000002','Revoked posting attempt',gen_random_uuid())$$,'42501',null,'Revoked attendee cannot send');
reset role;
insert into private.account_closures(user_id,request_id,phase) values('97300000-0000-4000-8000-000000000003',gen_random_uuid(),'frozen');
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000003';
select throws_ok($$select public.get_event_discussion('97300000-0000-4000-8000-000000000011')$$,'42501',null,'Old JWT cannot read a closed account discussion state');
select is((select count(*)::integer from public.conversation_messages where id=(select id from event_message)),0,'Closed account row RLS denies a still-valid identity');
reset role;
delete from private.account_closures where user_id='97300000-0000-4000-8000-000000000003';
update public.events set start_time=now()-interval '10 days',end_time=now()-interval '8 days' where id='97300000-0000-4000-8000-000000000011';
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000003';
select is(public.get_event_discussion('97300000-0000-4000-8000-000000000011')->>'canPost','false','Post-event grace ends after seven days');
select is(jsonb_array_length(public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003')->'items'),1,'Authorized archived history remains readable');
select throws_ok($$select public.send_event_discussion_message('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003','Late message',gen_random_uuid())$$,'42501',null,'Generic durable insertion enforces read-only archive');
reset role;
update public.events set lifecycle='cancelled' where id='97300000-0000-4000-8000-000000000011';
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000003';
select is((select count(*)::integer from public.conversation_messages where id=(select id from event_message)),0,'Cancellation closes already-joined recipient row RLS');
select throws_ok($$select public.list_event_discussion_feed('97300000-0000-4000-8000-000000000011','97300000-0000-4000-8000-000000000003')$$,'42501',null,'Cancelled event history is not public or participant-readable');
-- Reviewed account erasure covers event messages and group opt-in using the
-- shared inventory. This is synthetic SQL erasure, not managed Auth acceptance.
reset role;
update private.privacy_holds set released_at=now() where event_id='97300000-0000-4000-8000-000000000011';
update public.conversation_reports set status='resolved' where message_id=(select id from event_message);
insert into public.user_roles(user_id,role) values('97300000-0000-4000-8000-000000000001','admin');
set local role authenticated;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000002';
create temp table event_delete_request as select public.request_my_account_privacy_action_v2('97300000-0000-4000-8000-000000000002','deletion',null,'DELETE MY ACCOUNT',gen_random_uuid()) as value;
set local "request.jwt.claim.sub"='97300000-0000-4000-8000-000000000001';
set local "request.jwt.claims"='{"role":"authenticated","aal":"aal2"}';
select lives_ok($$select public.schedule_account_deletion((select (value->>'id')::uuid from event_delete_request),1,'Reviewed deletion after safety resolution')$$,'Resolved event safety cases permit reviewed account deletion');
reset role;
alter role authenticator set pgrst.db_pre_request='public.enforce_account_access';
update private.privacy_execution_jobs set not_before=now()-interval '1 second' where request_id=(select (value->>'id')::uuid from event_delete_request);
set local "request.jwt.claims"='{"role":"service_role"}';
create temp table event_delete_job as select public.claim_account_deletion() as value;
select lives_ok($$select public.erase_closed_account_data((select (value->>'request_id')::uuid from event_delete_job),(select (value->>'lease_token')::uuid from event_delete_job))$$,'Trusted account erasure includes event discussion data');
select is((select content from public.conversation_messages where id=(select id from event_message)),'[Message removed]','Erasure removes own event text and retains a pseudonymous reply structure');
select is((select membership_state from public.conversation_space_memberships where user_id='97300000-0000-4000-8000-000000000002' and space_id=(select space_id from public.conversation_rooms where id=(select (value->>'roomId')::uuid from event_discussion_state))),'left','Erasure revokes the subject own group opt-in');
select * from finish();
rollback;
