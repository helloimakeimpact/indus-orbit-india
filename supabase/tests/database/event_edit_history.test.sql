begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email) values
('98700000-0000-4000-8000-000000000001','edit-host@example.test'),
('98700000-0000-4000-8000-000000000002','edit-other@example.test'),
('98700000-0000-4000-8000-000000000003','edit-reviewer@example.test');
insert into private.community_onboarding_state(user_id,status,current_step,started_at,completed_at)
select id,'completed','completed',now(),now() from auth.users where id::text like '98700000%';
insert into private.admin_team_assignments(user_id,role,assigned_by,reason) values
('98700000-0000-4000-8000-000000000003','content_operator','98700000-0000-4000-8000-000000000003','Synthetic event edit reviewer');
insert into private.event_host_approvals(user_id,approved,reviewed_by,reason) values
('98700000-0000-4000-8000-000000000001',true,'98700000-0000-4000-8000-000000000003','Synthetic host approved for testing');
insert into public.events(id,organizer_id,title,description,start_time,end_time,location_type,status,registration_scope,capacity) values
('98800000-0000-4000-8000-000000000001','98700000-0000-4000-8000-000000000001','Original invitation','The original description',now()+interval '2 days',now()+interval '2 days 2 hours','virtual','approved','public',1),
('98800000-0000-4000-8000-000000000002','98700000-0000-4000-8000-000000000002','Pending invitation','The pending description',now()+interval '2 days',now()+interval '2 days 2 hours','virtual','pending','public',1);
insert into private.event_access_details(event_id,join_url) select id,'https://example.test/old-private-link' from public.events where id::text like '98800000%';
insert into private.event_registrations(event_id,user_id,status) values('98800000-0000-4000-8000-000000000001','98700000-0000-4000-8000-000000000002','confirmed');
insert into private.event_guest_links(token_hash,event_id,email,display_name,registration_id,expires_at)
select repeat('a',64),event_id,'verified-edit@example.test','Verified guest',id,now()+interval '9 days' from private.event_registrations where event_id='98800000-0000-4000-8000-000000000001';
insert into private.event_guest_links(token_hash,event_id,email,display_name,registration_id,expires_at)
select repeat('b',64),event_id,'expired-edit@example.test','Expired guest',id,now()-interval '1 hour' from private.event_registrations where event_id='98800000-0000-4000-8000-000000000001';
insert into private.event_guest_links(token_hash,event_id,email,display_name,expires_at)
values(repeat('c',64),'98800000-0000-4000-8000-000000000001','unconfirmed-edit@example.test','Unconfirmed guest',now()+interval '15 minutes');
create function pg_temp.change_input(_title text default 'Updated invitation',_request integer default 1,_version integer default 0,_event integer default 1,_actor integer default 1)
returns jsonb language sql as $$ select jsonb_build_object(
  'eventId','98800000-0000-4000-8000-'||lpad(_event::text,12,'0'),
  'expectedUserId','98700000-0000-4000-8000-'||lpad(_actor::text,12,'0'),
  'clientRequestId','98900000-0000-4000-8000-'||lpad(_request::text,12,'0'),'expectedRevision',_version,
  'title',_title,'description','A changed gathering description','startTime',now()+interval '3 days','endTime',now()+interval '3 days 2 hours',
  'timezone','Asia/Kolkata','locationType','virtual','location','','link','https://example.test/new-private-link',
  'publicLocation','Online','coverTemplate','lotus','reason','Reschedule to a more suitable day'); $$;
select ok(not has_table_privilege('authenticated','private.event_edit_history','SELECT'),'Change history is not directly readable by members');
select ok(not has_function_privilege('anon','public.update_hosted_event(jsonb)','EXECUTE'),'Anonymous clients cannot edit events');
select ok(not has_function_privilege('anon','public.get_host_event_draft(uuid)','EXECUTE'),'Anonymous clients cannot read private drafts');
select ok(not has_function_privilege('anon','public.review_event_revision(uuid,integer,boolean,text)','EXECUTE'),'Anonymous clients cannot review event revisions');
set local role authenticated;
set local "request.jwt.claim.sub"='98700000-0000-4000-8000-000000000002';
select throws_ok($$select public.get_host_event_draft('98800000-0000-4000-8000-000000000001')$$,'42501',null,'Another member cannot read the host draft');
select throws_ok($$select public.update_hosted_event(pg_temp.change_input(_actor=>2))$$,'42501',null,'Another member cannot edit an event');
set local "request.jwt.claim.sub"='98700000-0000-4000-8000-000000000001';
select is(public.get_host_event_draft('98800000-0000-4000-8000-000000000001')->>'revision','0','A draft starts at revision zero');
select is(public.get_host_event_draft('98800000-0000-4000-8000-000000000001')->'draft'->>'link','https://example.test/old-private-link','The authorized host receives private draft fields');
select throws_ok($$select public.update_hosted_event(pg_temp.change_input(_actor=>2))$$,'42501',null,'Account switching fails closed');
select throws_ok($$select public.update_hosted_event(pg_temp.change_input() || '{"capacity":99}')$$,'22023',null,'The editing RPC cannot change registration conditions');
select throws_ok($$select public.update_hosted_event(pg_temp.change_input() || '{"status":"approved"}')$$,'22023',null,'The editing RPC cannot forge publication state');
select throws_ok($$select public.update_hosted_event(pg_temp.change_input() || '{"link":"http://example.test"}')$$,'22023',null,'Private access links require HTTPS');
select throws_ok($$select public.update_hosted_event(pg_temp.change_input() || '{"timezone":"Invalid/Zone"}')$$,'22023',null,'Invalid IANA zones are refused');
select throws_ok($$select public.update_hosted_event(pg_temp.change_input() || '{"reason":"tiny"}')$$,'22023',null,'A bounded meaningful change reason is required');
select throws_ok($$select public.update_hosted_event(pg_temp.change_input() || jsonb_build_object('startTime',now()-interval '1 day'))$$,'22023',null,'Rescheduling into the past is refused');
select is(public.update_hosted_event(pg_temp.change_input())->>'revision','1','An approved host can reschedule and edit');
select is(public.update_hosted_event(pg_temp.change_input())->>'revision','1','A lost-response retry returns the original revision');
select throws_ok($$select public.update_hosted_event(pg_temp.change_input(_title=>'Other invitation'))$$,'22023',null,'A request ID cannot be reused for different changes');
select throws_ok($$select public.update_hosted_event(pg_temp.change_input(_request=>2))$$,'40001',null,'A stale editor cannot overwrite a newer change');
select is(public.get_host_event_draft('98800000-0000-4000-8000-000000000001')->'draft'->>'capacity','1','Rescheduling preserves capacity');
select is(jsonb_array_length(public.get_host_event_draft('98800000-0000-4000-8000-000000000001')->'history'),1,'Retries create exactly one history entry');
set local "request.jwt.claim.sub"='98700000-0000-4000-8000-000000000002';
select is(public.update_hosted_event(pg_temp.change_input(_event=>2,_actor=>2,_request=>3))->>'status','pending','A new host can edit a pending event without publishing');
reset role;
select is((select count(*)::int from public.audit_log where action='event.edited' and target_id='98800000-0000-4000-8000-000000000001'),1,'Exactly one audit event records the edit');
select is((select count(*)::int from private.event_registrations where event_id='98800000-0000-4000-8000-000000000001' and status='confirmed'),1,'Existing confirmed registrations survive rescheduling');
select is((select expires_at from private.event_guest_links where token_hash=repeat('a',64)),now()+interval '10 days 2 hours','Verified active receipts follow the new event end plus seven days');
select is((select expires_at from private.event_guest_links where token_hash=repeat('b',64)),now()-interval '1 hour','Rescheduling does not revive an expired receipt');
select is((select expires_at from private.event_guest_links where token_hash=repeat('c',64)),now()+interval '15 minutes','Rescheduling does not extend an unconfirmed email challenge');
select ok((select not (summary::text like '%private-link%') from private.event_edit_history where event_id='98800000-0000-4000-8000-000000000001'),'History summaries exclude private access credentials');
update private.event_host_approvals set approved=false where user_id='98700000-0000-4000-8000-000000000001';
set local role authenticated;
set local "request.jwt.claim.sub"='98700000-0000-4000-8000-000000000001';
select throws_ok($$select public.update_hosted_event(pg_temp.change_input(_title=>'Changed again',_request=>4,_version=>1))$$,'42501',null,'A revoked host cannot rewrite a reviewed published event');
set local "request.jwt.claim.sub"='98700000-0000-4000-8000-000000000003';
set local "request.jwt.claims"='{"aal":"aal1"}';
select throws_ok($$select public.update_hosted_event(pg_temp.change_input(_title=>'Reviewer change',_request=>5,_version=>1,_actor=>3))$$,'42501',null,'Content reviewers require MFA to edit another host event');
set local "request.jwt.claims"='{"aal":"aal2"}';
select is(public.update_hosted_event(pg_temp.change_input(_title=>'Reviewer change',_request=>5,_version=>1,_actor=>3))->>'revision','2','An MFA content reviewer can make an audited change');
select is(public.get_my_event_workspace()->'review'->0->>'revision','1','The review workspace identifies the version presented');
select throws_ok($$select public.review_event_revision('98800000-0000-4000-8000-000000000002',0,true,'Reviewed earlier version')$$,'40001',null,'Reviewing an obsolete draft cannot publish changed content');
select lives_ok($$select public.review_event_revision('98800000-0000-4000-8000-000000000002',1,true,'Reviewed current invitation')$$,'The reviewer can publish the inspected revision');
reset role;
update public.events set lifecycle='cancelled' where id='98800000-0000-4000-8000-000000000001';
set local role authenticated;
set local "request.jwt.claim.sub"='98700000-0000-4000-8000-000000000003';
select throws_ok($$select public.update_hosted_event(pg_temp.change_input(_title=>'Revive event',_request=>6,_version=>2,_actor=>3))$$,'22023',null,'Editing cannot revive a cancelled event');
reset role;
select * from finish();
rollback;
