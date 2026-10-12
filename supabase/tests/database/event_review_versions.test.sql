begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) values
('99000000-0000-4000-8000-000000000001','review-host@example.test',now()),
('99000000-0000-4000-8000-000000000002','review-lead@example.test',now()),
('99000000-0000-4000-8000-000000000003','review-operator@example.test',now()),
('99000000-0000-4000-8000-000000000004','review-member@example.test',now());
insert into private.community_onboarding_state(user_id,status,current_step,started_at,completed_at)
select id,'completed','completed',now(),now() from auth.users where id::text like '99000000%';
insert into private.admin_team_assignments(user_id,role,assigned_by,reason)
values('99000000-0000-4000-8000-000000000003','content_operator','99000000-0000-4000-8000-000000000003','Synthetic review operator');
insert into public.chapters(id,name,description) values
('99100000-0000-4000-8000-000000000001','Reviewed chapter','Synthetic review chapter'),
('99100000-0000-4000-8000-000000000002','Other chapter','Outside the reviewer scope');
insert into public.chapter_members(chapter_id,user_id,role,membership_state) values
('99100000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000001','member','active'),
('99100000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000002','lead','active');
insert into public.events(id,organizer_id,chapter_id,title,description,start_time,end_time,location_type,status,registration_scope) values
('99200000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000001','99100000-0000-4000-8000-000000000001','Chapter invitation',repeat('Full invitation. ',30),now()+interval '2 days',now()+interval '2 days 2 hours','virtual','pending','public'),
('99200000-0000-4000-8000-000000000002','99000000-0000-4000-8000-000000000001','99100000-0000-4000-8000-000000000002','Outside chapter invitation','An invitation outside the lead scope',now()+interval '2 days',now()+interval '2 days 2 hours','virtual','pending','public'),
('99200000-0000-4000-8000-000000000003','99000000-0000-4000-8000-000000000002','99100000-0000-4000-8000-000000000001','Lead own invitation','This is the reviewing lead own submission',now()+interval '2 days',now()+interval '2 days 2 hours','virtual','pending','public');
insert into private.event_access_details(event_id,join_url) select id,'https://example.test/private-review-link' from public.events where id::text like '99200000%';
insert into public.courses(id,title,slug,status,created_by) values
('99300000-0000-4000-8000-000000000001','A course control','review-course-control','draft','99000000-0000-4000-8000-000000000003');

select ok(not has_function_privilege('anon','public.admin_content_queue_revision(text,text,integer)','EXECUTE'),'Anonymous clients cannot read revision evidence');
select ok(not has_function_privilege('anon','public.admin_transition_event_revision(uuid,integer,text,text,text)','EXECUTE'),'Anonymous clients cannot decide on events');
select ok(not has_function_privilege('anon','public.get_chapter_event_review_queue()','EXECUTE'),'Anonymous clients cannot read private chapter invitations');
select ok(not has_function_privilege('authenticated','private.transition_content_locked(text,uuid,text,text,text)','EXECUTE'),'The original unversioned lifecycle implementation is not browser-callable');
select ok(not has_function_privilege('authenticated','private.review_event(uuid,boolean,text)','EXECUTE'),'The original unversioned event review helper is not browser-callable');
set local role authenticated;
set local "request.jwt.claim.sub"='99000000-0000-4000-8000-000000000004';
select is((select count(*)::int from public.get_chapter_event_review_queue()),0,'An ordinary member receives no private invitations');
select throws_ok($$select * from public.admin_content_queue_revision()$$,'42501',null,'An ordinary member cannot read the admin queue');
select throws_ok($$select public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',0,'approved','pending','A proper decision reason')$$,'42501',null,'An ordinary member cannot use a guessed current revision');
set local "request.jwt.claim.sub"='99000000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.get_chapter_event_review_queue()),1,'The lead sees only another host submission in their active chapter');
select is((select revision from public.get_chapter_event_review_queue()),0,'Chapter invitation and revision start together at zero');
select is((select join_url from public.get_chapter_event_review_queue()),'https://example.test/private-review-link','Authorized chapter review includes the private access link');
select ok((select char_length(description)>240 from public.get_chapter_event_review_queue()),'Chapter review includes the complete invitation body');
select throws_ok($$select public.lead_approve_event('99200000-0000-4000-8000-000000000001')$$,'40001',null,'An authorized legacy approval requires a fresh versioned review');
select throws_ok($$select public.lead_reject_event('99200000-0000-4000-8000-000000000001','A deliberate rejection')$$,'40001',null,'An authorized legacy rejection cannot omit the revision');
select throws_ok($$select public.review_event_revision('99200000-0000-4000-8000-000000000002',0,true,'A proper review reason')$$,'42501',null,'A chapter lead cannot publish outside their chapter');
select throws_ok($$select public.review_event_revision('99200000-0000-4000-8000-000000000003',0,true,'A proper review reason')$$,'42501',null,'A chapter lead cannot approve their own submission');
set local "request.jwt.claim.sub"='99000000-0000-4000-8000-000000000001';
select is(public.update_hosted_event(jsonb_build_object(
  'eventId','99200000-0000-4000-8000-000000000001','expectedUserId','99000000-0000-4000-8000-000000000001',
  'clientRequestId','99400000-0000-4000-8000-000000000001','expectedRevision',0,'reason','Change the private meeting link',
  'title','Chapter invitation','description',repeat('Full invitation. ',30),'startTime',now()+interval '2 days','endTime',now()+interval '2 days 2 hours',
  'timezone','Asia/Kolkata','locationType','virtual','location','','link','https://example.test/changed-private-review-link','publicLocation','','coverTemplate','dawn'
))->>'revision','1','A private-link change also advances the invitation revision');
set local "request.jwt.claim.sub"='99000000-0000-4000-8000-000000000002';
select throws_ok($$select public.review_event_revision('99200000-0000-4000-8000-000000000001',0,true,'Reviewed the old invitation')$$,'40001',null,'An old chapter review cannot publish a changed private link');
select is((select revision from public.get_chapter_event_review_queue()),1,'A refreshed chapter review receives the changed revision');
select lives_ok($$select public.review_event_revision('99200000-0000-4000-8000-000000000001',1,true,'Reviewed the new invitation')$$,'Current chapter review can publish');
select is((select count(*)::int from public.get_chapter_event_review_queue()),0,'A published invitation leaves the pending chapter review queue');

set local "request.jwt.claim.sub"='99000000-0000-4000-8000-000000000003';
set local "request.jwt.claims"='{"aal":"aal1"}';
select throws_ok($$select public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',0,'approved','pending','A proper decision reason')$$,'42501',null,'The versioned admin event command requires MFA');
set local "request.jwt.claims"='{"aal":"aal2"}';
select throws_ok($$select public.admin_transition_content('event','99200000-0000-4000-8000-000000000002','approved','pending','A proper decision reason')$$,'42501',null,'Even an MFA operator cannot publish through the legacy generic command');
select is((select event_revision from public.admin_content_queue_revision('event',null,100) where content_id='99200000-0000-4000-8000-000000000001'),1,'The admin queue carries the changed invitation revision');
select ok((select char_length(summary)<=240 and event_revision=0 from public.admin_content_queue_revision('event',null,100) where content_id='99200000-0000-4000-8000-000000000002'),'Admin evidence retains the bounded summary contract');
select is((select event_revision from public.admin_content_queue_revision('course',null,100) where content_id='99300000-0000-4000-8000-000000000001'),null::integer,'Non-event content has no fabricated event revision');
select throws_ok($$select * from public.admin_content_queue_revision(null,null,101)$$,'22023',null,'The new queue preserves bounded limits');
select throws_ok($$select public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',null,'approved','pending','A proper decision reason')$$,'40001',null,'A missing admin revision is refused');
select throws_ok($$select public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',1,'approved','pending','A proper decision reason')$$,'40001',null,'A wrong admin revision is refused');
select throws_ok($$select public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',0,'approved',null,'A proper decision reason')$$,'40001',null,'A missing publication state is refused');
select throws_ok($$select public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',0,'approved','declined','A proper decision reason')$$,'40001',null,'A wrong publication state is refused');
select throws_ok($$select public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',0,'pending','pending','A proper decision reason')$$,'22023',null,'The allowed event lifecycle graph remains enforced');
select throws_ok($$select public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',0,'approved','pending','tiny')$$,'22023',null,'A bounded meaningful reason remains required');
select is(public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',0,'approved','pending','Reviewed the current invitation')->>'status','approved','A current MFA event decision publishes');
select throws_ok($$select public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',0,'declined','pending','A proper decision reason')$$,'40001',null,'An earlier publication state cannot undo the current decision');
select is(public.admin_transition_content('course','99300000-0000-4000-8000-000000000001','published','draft','Reviewed the course control')->>'status','published','Other Content lifecycles retain their existing command');
reset role;
select is((select count(*)::int from private.admin_operation_events where target_id='99200000-0000-4000-8000-000000000002' and action='content.transitioned'),1,'Only the accepted admin transition records lifecycle evidence');
select is((select metadata->>'revision' from private.admin_operation_events where target_id='99200000-0000-4000-8000-000000000002' and action='event.revision_reviewed'),'0','Private audit records the inspected event revision');
insert into private.event_registrations(event_id,user_id,status) values
('99200000-0000-4000-8000-000000000002','99000000-0000-4000-8000-000000000004','confirmed');
set local role authenticated;
set local "request.jwt.claim.sub"='99000000-0000-4000-8000-000000000003';
select is(public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',0,'declined','approved','Withdraw the published invitation')->>'status','declined','An MFA operator can withdraw a published invitation');
select throws_ok($$select public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',0,'pending','declined','Reopen the withdrawn invitation')$$,'22023',null,'A cancelled invitation cannot return to pending publication');
reset role;
select is((select lifecycle from public.events where id='99200000-0000-4000-8000-000000000002'),'cancelled','Withdrawal closes the invitation lifecycle atomically');
select is((select count(*)::int from private.event_delivery_outbox where event_id='99200000-0000-4000-8000-000000000002' and kind='cancelled'),1,'Withdrawal enqueues one guest cancellation notice');
select ok((select private.event_delivery_current(o) from private.event_delivery_outbox o where event_id='99200000-0000-4000-8000-000000000002' and kind='cancelled'),'The cancellation notice remains eligible after publication withdrawal');
set local role authenticated;
set local "request.jwt.claim.sub"='99000000-0000-4000-8000-000000000002';
select lives_ok($$select public.cancel_hosted_event('99200000-0000-4000-8000-000000000003','99000000-0000-4000-8000-000000000002')$$,'The submitting host can cancel a pending invitation');
set local "request.jwt.claim.sub"='99000000-0000-4000-8000-000000000003';
select throws_ok($$select public.review_event_revision('99200000-0000-4000-8000-000000000003',0,true,'Reviewed the cancelled invitation')$$,'22023',null,'Versioned host/chapter review cannot publish a cancelled submission');
select lives_ok($$select public.review_event_revision('99200000-0000-4000-8000-000000000003',0,false,'Decline the cancelled submission')$$,'A cancelled pending submission can still be declined');
reset role;
insert into public.events(id,organizer_id,chapter_id,title,description,start_time,end_time,location_type,status,registration_scope) values
('99200000-0000-4000-8000-000000000004','99000000-0000-4000-8000-000000000001','99100000-0000-4000-8000-000000000001','Pending access control','A fresh pending invitation for access revocation',now()+interval '2 days',now()+interval '2 days 2 hours','virtual','pending','public');
set local role authenticated;
set local "request.jwt.claim.sub"='99000000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.get_chapter_event_review_queue()),1,'The current lead sees a fresh pending invitation before revocation');
reset role;
update public.chapter_members set membership_state='left' where user_id='99000000-0000-4000-8000-000000000002';
set local role authenticated;
set local "request.jwt.claim.sub"='99000000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.get_chapter_event_review_queue()),0,'A former lead receives no chapter review evidence');
reset role;
insert into public.member_suspensions(user_id,actor_id,reason) values('99000000-0000-4000-8000-000000000003','99000000-0000-4000-8000-000000000002','Synthetic operator suspension');
set local role authenticated;
set local "request.jwt.claim.sub"='99000000-0000-4000-8000-000000000003';
select throws_ok($$select * from public.admin_content_queue_revision()$$,'42501',null,'A suspended operator cannot obtain refreshed evidence');
select throws_ok($$select public.admin_transition_event_revision('99200000-0000-4000-8000-000000000002',0,'declined','approved','A proper decision reason')$$,'42501',null,'A suspended MFA operator cannot decide on events');
reset role;
delete from auth.users where id='99000000-0000-4000-8000-000000000004';
set local role authenticated;
set local "request.jwt.claim.sub"='99000000-0000-4000-8000-000000000004';
select throws_ok($$select * from public.get_chapter_event_review_queue()$$,'42501',null,'A deleted account token cannot obtain chapter evidence');
reset role;
select * from finish();
rollback;
