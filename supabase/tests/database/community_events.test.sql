begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
('98000000-0000-4000-8000-000000000001','event-host@example.test','{"display_name":"Host"}'),
('98000000-0000-4000-8000-000000000002','event-member@example.test','{"display_name":"Guest"}'),
('98000000-0000-4000-8000-000000000003','event-waitlist@example.test','{"display_name":"Waitlist guest"}'),
('98000000-0000-4000-8000-000000000004','event-nonmember@example.test','{"display_name":"I/O user"}'),
('98000000-0000-4000-8000-000000000005','event-operator@example.test','{"display_name":"Operator"}');
insert into private.community_onboarding_state(user_id,status,current_step,started_at,completed_at)
select id,'completed','completed',now(),now() from auth.users where id in ('98000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000003','98000000-0000-4000-8000-000000000005');
insert into public.chapters(id,name,description) values ('98100000-0000-4000-8000-000000000001','Contract chapter','Synthetic event chapter');
insert into public.chapter_members(chapter_id,user_id,role,membership_state) values
('98100000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000001','member','active'),
('98100000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002','member','active');
insert into private.admin_team_assignments(user_id,role,assigned_by,reason) values ('98000000-0000-4000-8000-000000000005','content_operator','98000000-0000-4000-8000-000000000005','Synthetic event operator');
insert into public.events(id,organizer_id,title,description,start_time,end_time,location_type,status,capacity,requires_approval,visibility,chapter_id,registration_scope) values
('98200000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000001','Public event','Public description',now()+interval '1 hour',now()+interval '3 hours','virtual','approved',1,false,'public',null,'community'),
('98200000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000001','Members event','Members description',now()+interval '1 hour',now()+interval '3 hours','irl','approved',null,false,'members',null,'community'),
('98200000-0000-4000-8000-000000000003','98000000-0000-4000-8000-000000000001','Unlisted event','Unlisted description',now()+interval '1 hour',now()+interval '3 hours','virtual','approved',null,true,'unlisted',null,'community'),
('98200000-0000-4000-8000-000000000004','98000000-0000-4000-8000-000000000001','Chapter event','Chapter description',now()+interval '1 hour',now()+interval '3 hours','virtual','approved',null,false,'public','98100000-0000-4000-8000-000000000001','chapter'),
('98200000-0000-4000-8000-000000000005','98000000-0000-4000-8000-000000000001','Pending event','Pending description',now()+interval '1 hour',now()+interval '3 hours','virtual','pending',null,false,'public',null,'community');
insert into private.event_access_details(event_id,location,join_url) select id,'PRIVATE ADDRESS','https://example.test/private-credential' from public.events where organizer_id='98000000-0000-4000-8000-000000000001';
select ok(not has_table_privilege('anon','public.events','SELECT'),'Anonymous discovery cannot select raw event rows');
select ok(not has_table_privilege('authenticated','public.events','INSERT'),'Members cannot self-publish through a table insert');
select ok(not has_table_privilege('authenticated','public.events','UPDATE'),'Members cannot forge publication or ownership through an update');
select ok(not has_table_privilege('authenticated','public.event_rsvps','INSERT'),'Legacy RSVP upsert cannot bypass registration capacity');
select ok(not has_function_privilege('anon','public.register_for_event(uuid,uuid)','EXECUTE'),'Anonymous registration is denied');
select ok(not has_table_privilege('authenticated','private.event_registrations','SELECT'),'Raw guest records are private');
set local role anon;
set local "request.jwt.claim.sub"='';
select is((select count(*)::int from public.discover_events(_period=>'all') where id::text like '98200000%'),2,'Only approved public events appear in anonymous discovery');
select is((select count(*)::int from public.discover_events(_event_id=>'98200000-0000-4000-8000-000000000003')),1,'Unlisted events open only through an explicit invitation ID');
select is((select count(*)::int from public.discover_events(_event_id=>'98200000-0000-4000-8000-000000000002')),0,'A direct link cannot bypass members-only visibility');
select ok((select not (to_jsonb(e)::text like '%PRIVATE ADDRESS%' or to_jsonb(e)::text like '%private-credential%') from public.discover_events(_event_id=>'98200000-0000-4000-8000-000000000001') e),'Public invitation excludes private venue and join credentials');
select throws_ok($$select * from public.discover_events(_limit=>10000)$$,'22023',null,'Discovery query limits are bounded');
reset role;
set local role authenticated;
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000004';
select throws_ok($$select public.register_for_event('98200000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000004')$$,'42501',null,'I/O-only users cannot register');
select is((public.get_my_event_registration('98200000-0000-4000-8000-000000000001')->>'joinUrl'),null,'A signed-in nonmember cannot read the join link');
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.discover_events(_event_id=>'98200000-0000-4000-8000-000000000002')),1,'Active members can open member invitations');
select throws_ok($$select public.register_for_event('98200000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000003')$$,'42501',null,'An account change fails atomically before reservation');
select is(public.register_for_event('98200000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002')->>'status','confirmed','First eligible guest receives a place');
select is(public.register_for_event('98200000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002')->>'status','confirmed','Repeated registration is idempotent');
select is(public.get_my_event_registration('98200000-0000-4000-8000-000000000001')->>'joinUrl','https://example.test/private-credential','Confirmed eligible guest receives access details');
select throws_ok($$select * from public.get_event_guest_list('98200000-0000-4000-8000-000000000001')$$,'42501',null,'An ordinary guest cannot enumerate the guest list');
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000003';
select is(public.register_for_event('98200000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000003')->>'status','waitlisted','Capacity allocates no second confirmed place');
select is(public.get_my_event_registration('98200000-0000-4000-8000-000000000001')->>'joinUrl',null,'Waitlisted guests cannot obtain access credentials');
select throws_ok($$select public.register_for_event('98200000-0000-4000-8000-000000000004','98000000-0000-4000-8000-000000000003')$$,'42501',null,'Chapter restriction is enforced server-side');
select is(public.register_for_event('98200000-0000-4000-8000-000000000003','98000000-0000-4000-8000-000000000003')->>'status','pending','An approval event creates a request rather than a reservation');
select is(public.get_my_event_registration('98200000-0000-4000-8000-000000000003')->>'joinUrl',null,'Pending guests cannot obtain access details');
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000002';
select lives_ok($$select public.cancel_my_event_registration('98200000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002')$$,'A guest can cancel');
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000003';
select is(public.get_my_event_registration('98200000-0000-4000-8000-000000000001')->>'status','confirmed','Cancellation promotes the oldest eligible waitlisted guest');
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.get_event_guest_list('98200000-0000-4000-8000-000000000001')),2,'The event host can view scoped guests');
select lives_ok($$select public.manage_event_guest('98200000-0000-4000-8000-000000000003',(select id from public.get_event_guest_list('98200000-0000-4000-8000-000000000003') limit 1),'approve','98000000-0000-4000-8000-000000000001')$$,'The host can approve a pending registration');
select lives_ok($$select public.manage_event_guest('98200000-0000-4000-8000-000000000001',(select id from public.get_event_guest_list('98200000-0000-4000-8000-000000000001') where status='confirmed'),'check_in','98000000-0000-4000-8000-000000000001')$$,'The host can check in a confirmed eligible guest near the event');
select lives_ok($$select public.manage_event_guest('98200000-0000-4000-8000-000000000001',(select id from public.get_event_guest_list('98200000-0000-4000-8000-000000000001') where status='confirmed'),'check_in','98000000-0000-4000-8000-000000000001')$$,'Check-in is idempotent');
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000003';
select throws_ok($$select public.cancel_my_event_registration('98200000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000003')$$,'22023',null,'A checked-in guest cannot erase their attendance or reopen a used place');
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000001';
select throws_ok($$select public.lead_approve_event('98200000-0000-4000-8000-000000000005')$$,'42501',null,'A submitting host cannot approve their own pending event');
select lives_ok($$select public.cancel_hosted_event('98200000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000001')$$,'The host may cancel the event');
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000003';
select is(public.get_my_event_registration('98200000-0000-4000-8000-000000000001')->>'joinUrl',null,'Cancellation withdraws guest access credentials');
select throws_ok($$select public.register_for_event('98200000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000003')$$,'22023',null,'Cancelled events cannot accept registrations');
reset role;
insert into public.member_suspensions(user_id,actor_id,reason) values ('98000000-0000-4000-8000-000000000003','98000000-0000-4000-8000-000000000005','Event contract suspension');
set local role authenticated;
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000003';
select is(public.get_my_event_registration('98200000-0000-4000-8000-000000000003')->>'joinUrl',null,'Suspension closes previously confirmed access');
select throws_ok($$select public.register_for_event('98200000-0000-4000-8000-000000000004','98000000-0000-4000-8000-000000000003')$$,'42501',null,'Suspension denies registration');
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000005';
set local "request.jwt.claims"='{}';
select throws_ok($$select public.review_event_host('98000000-0000-4000-8000-000000000001',true,'A reviewed host contract')$$,'42501',null,'A missing AAL claim fails closed for host approval');
set local "request.jwt.claims"='{"aal":"aal1"}';
select throws_ok($$select public.lead_approve_event('98200000-0000-4000-8000-000000000005')$$,'42501',null,'Operators require MFA to publish');
select throws_ok($$select public.admin_transition_content('event','98200000-0000-4000-8000-000000000005','approved','pending','A deliberate publication review')$$,'42501',null,'Existing admin content RPC cannot bypass event MFA guard');
set local "request.jwt.claims"='{"aal":"aal2"}';
select lives_ok($$select public.review_event_host('98000000-0000-4000-8000-000000000001',true,'A reviewed host contract')$$,'A content operator with MFA can approve a separate host');
select lives_ok($$select public.review_event_revision('98200000-0000-4000-8000-000000000005',0,false,'Declined after event review')$$,'Versioned event rejection uses the real declined schema state');
select throws_ok($$select public.review_event_host('98000000-0000-4000-8000-000000000005',true,'Review my own host access')$$,'42501',null,'Operators cannot grant themselves host approval');
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000001';
select is(public.submit_my_event(jsonb_build_object('title','Trusted event','description','A proper description for the event','startTime',now()+interval '2 days','endTime',now()+interval '2 days 2 hours','timezone','Asia/Kolkata','locationType','virtual','link','https://example.test/secret','clientRequestId','98300000-0000-4000-8000-000000000001','expectedUserId','98000000-0000-4000-8000-000000000001'))->>'status','approved','Approved hosts publish their own general events');
select is(public.submit_my_event(jsonb_build_object('title','Trusted event','description','A proper description for the event','startTime',now()+interval '2 days','endTime',now()+interval '2 days 2 hours','timezone','Asia/Kolkata','locationType','virtual','link','https://example.test/secret','clientRequestId','98300000-0000-4000-8000-000000000001','expectedUserId','98000000-0000-4000-8000-000000000001'))->>'status','approved','Submission replay returns the original event');
select throws_ok($$select public.submit_my_event(jsonb_build_object('title','Different event','description','A proper description for the event','startTime',now()+interval '2 days','endTime',now()+interval '2 days 2 hours','timezone','Asia/Kolkata','locationType','virtual','link','https://example.test/secret','clientRequestId','98300000-0000-4000-8000-000000000001','expectedUserId','98000000-0000-4000-8000-000000000001'))$$,'22023',null,'Submission IDs cannot be reused for changed content');
set local "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000002';
select is(public.submit_my_event(jsonb_build_object('title','New host event','description','A proper description for the event','startTime',now()+interval '2 days','endTime',now()+interval '2 days 2 hours','timezone','Asia/Kolkata','locationType','virtual','link','https://example.test/secret','status','approved','clientRequestId','98300000-0000-4000-8000-000000000002','expectedUserId','98000000-0000-4000-8000-000000000002'))->>'status','pending','New hosts cannot supply a forged approved status');
reset role;
select is((select count(*)::int from public.events where title='Trusted event'),1,'Retries create exactly one event');
select ok((select bool_and(location is null and link is null) from public.events where organizer_id in ('98000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002')),'Private fields are never stored in the public event row');
select * from finish();
rollback;
