begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_table(
  'private',
  'email_delivery_outbox',
  'private fixed-template email outbox exists'
);
select ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class as relation
    where relation.oid = 'private.email_delivery_outbox'::regclass
  ),
  'email outbox keeps row-level security enabled'
);
select ok(
  pg_catalog.to_regclass('private.email_delivery_outbox_due_idx') is not null,
  'email outbox has a due-work partial index'
);
select ok(
  pg_catalog.to_regclass('private.email_delivery_outbox_recipient_user_idx') is not null,
  'email outbox recipient foreign key has a covering index'
);

select has_column(
  'public',
  'connection_requests',
  'client_request_id',
  'connection requests carry a caller idempotency key'
);
select has_column(
  'public',
  'mentor_sessions',
  'client_request_id',
  'mentor sessions carry a caller idempotency key'
);
select has_column(
  'public',
  'mission_updates',
  'client_request_id',
  'mission updates carry a caller idempotency key'
);
select has_column(
  'public',
  'vouch_requests',
  'client_request_id',
  'vouch requests carry a caller idempotency key'
);

select ok(pg_catalog.to_regclass('public.connection_requests_sender_client_request_key') is not null);
select ok(pg_catalog.to_regclass('public.mentor_sessions_booker_client_request_key') is not null);
select ok(pg_catalog.to_regclass('public.mission_updates_author_client_request_key') is not null);
select ok(pg_catalog.to_regclass('public.vouch_requests_requester_client_request_key') is not null);

select has_function('public', 'create_my_connection_request', array['uuid', 'text', 'text', 'uuid']);
select has_function('public', 'respond_to_my_connection_request', array['uuid', 'text']);
select has_function('public', 'request_my_mentor_session', array['uuid', 'text', 'integer', 'uuid']);
select has_function('public', 'transition_my_mentor_session', array['uuid', 'text', 'text', 'timestamptz']);
select has_function('public', 'post_my_mission_update', array['uuid', 'text', 'uuid']);
select has_function('public', 'request_my_vouch', array['text', 'uuid', 'uuid']);
select has_function('public', 'approve_chapter_proposal', array['uuid']);
select has_function('public', 'reject_chapter_proposal', array['uuid']);
select has_function('public', 'claim_email_delivery_batch', array['integer']);
select has_function('public', 'complete_email_delivery', array['uuid', 'uuid', 'boolean', 'text', 'text']);

select ok(
  has_function_privilege('authenticated', signature, 'execute'),
  signature || ' is available to authenticated members'
)
from (
  values
    ('public.create_my_connection_request(uuid,text,text,uuid)'),
    ('public.respond_to_my_connection_request(uuid,text)'),
    ('public.request_my_mentor_session(uuid,text,integer,uuid)'),
    ('public.transition_my_mentor_session(uuid,text,text,timestamptz)'),
    ('public.post_my_mission_update(uuid,text,uuid)'),
    ('public.request_my_vouch(text,uuid,uuid)'),
    ('public.approve_chapter_proposal(uuid)'),
    ('public.reject_chapter_proposal(uuid)')
) as member_functions(signature);

select ok(
  not has_function_privilege('anon', signature, 'execute'),
  signature || ' denies anonymous execution'
)
from (
  values
    ('public.create_my_connection_request(uuid,text,text,uuid)'),
    ('public.respond_to_my_connection_request(uuid,text)'),
    ('public.request_my_mentor_session(uuid,text,integer,uuid)'),
    ('public.transition_my_mentor_session(uuid,text,text,timestamptz)'),
    ('public.post_my_mission_update(uuid,text,uuid)'),
    ('public.request_my_vouch(text,uuid,uuid)'),
    ('public.approve_chapter_proposal(uuid)'),
    ('public.reject_chapter_proposal(uuid)'),
    ('public.claim_email_delivery_batch(integer)'),
    ('public.complete_email_delivery(uuid,uuid,boolean,text,text)')
) as anonymous_functions(signature);

select ok(
  has_function_privilege('service_role', 'public.claim_email_delivery_batch(integer)', 'execute'),
  'service worker can claim email jobs'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.complete_email_delivery(uuid,uuid,boolean,text,text)',
    'execute'
  ),
  'service worker can complete email jobs'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_email_delivery_batch(integer)',
    'execute'
  ),
  'members cannot claim email jobs'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.complete_email_delivery(uuid,uuid,boolean,text,text)',
    'execute'
  ),
  'members cannot complete email jobs'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.send_notification(uuid,text,text,text)',
    'execute'
  ),
  'legacy arbitrary notification RPC is retired'
);

select ok(not has_table_privilege('authenticated', 'public.connection_requests', 'insert'));
select ok(not has_table_privilege('authenticated', 'public.connection_requests', 'update'));
select ok(not has_table_privilege('authenticated', 'public.mentor_sessions', 'insert'));
select ok(not has_table_privilege('authenticated', 'public.mentor_sessions', 'update'));
select ok(not has_table_privilege('authenticated', 'public.mission_updates', 'insert'));
select ok(not has_table_privilege('authenticated', 'public.vouch_requests', 'insert'));
select ok(not has_table_privilege('authenticated', 'public.vouch_requests', 'update'));
select ok(not has_table_privilege('authenticated', 'public.chapter_proposals', 'update'));
select ok(not has_table_privilege('authenticated', 'private.email_delivery_outbox', 'select'));
select ok(has_table_privilege('authenticated', 'public.connection_requests', 'select'));
select ok(has_table_privilege('authenticated', 'public.mentor_sessions', 'select'));
select ok(has_table_privilege('authenticated', 'public.mission_updates', 'select'));
select ok(has_table_privilege('authenticated', 'public.vouch_requests', 'select'));
select ok(has_column_privilege('authenticated', 'public.mission_updates', 'is_pinned', 'update'));

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '41000000-0000-4000-8000-000000000001'::uuid,
    'trusted-member-a@example.test',
    '{"display_name":"Trusted Member A"}'::jsonb
  ),
  (
    '41000000-0000-4000-8000-000000000002'::uuid,
    'trusted-member-b@example.test',
    '{"display_name":"Trusted Member B"}'::jsonb
  ),
  (
    '41000000-0000-4000-8000-000000000003'::uuid,
    'trusted-member-c@example.test',
    '{"display_name":"Trusted Member C"}'::jsonb
  ),
  (
    '41000000-0000-4000-8000-000000000004'::uuid,
    'trusted-admin@example.test',
    '{"display_name":"Trusted Admin"}'::jsonb
  );

set local "request.jwt.claim.role" = 'service_role';
update public.profiles
set is_verified = true
where user_id in (
  '41000000-0000-4000-8000-000000000001'::uuid,
  '41000000-0000-4000-8000-000000000002'::uuid
);

insert into public.user_roles (user_id, role)
values ('41000000-0000-4000-8000-000000000004'::uuid, 'admin');

insert into public.missions (id, title, theme, description, created_by)
values (
  '42000000-0000-4000-8000-000000000001'::uuid,
  'Trusted Mission',
  'collaboration',
  'Mission fixture for trusted event contracts.',
  '41000000-0000-4000-8000-000000000004'::uuid
);
insert into public.mission_members (mission_id, user_id, role)
values
  (
    '42000000-0000-4000-8000-000000000001'::uuid,
    '41000000-0000-4000-8000-000000000001'::uuid,
    'contributor'
  ),
  (
    '42000000-0000-4000-8000-000000000001'::uuid,
    '41000000-0000-4000-8000-000000000002'::uuid,
    'contributor'
  );

insert into public.chapter_proposals (
  id,
  proposer_id,
  proposed_name,
  city,
  country,
  target_audience,
  rationale,
  proposer_background,
  expected_size
) values (
  '43000000-0000-4000-8000-000000000001'::uuid,
  '41000000-0000-4000-8000-000000000003'::uuid,
  'Trusted Chapter',
  'Pune',
  'India',
  'Builders',
  'A chapter created through a trusted atomic approval contract.',
  'Community builder',
  25
);

set local role authenticated;
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$
    select public.create_my_connection_request(
      '41000000-0000-4000-8000-000000000002'::uuid,
      'collab',
      'Let us work together on a trusted project.',
      '44000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'member can create an atomic connection request'
);
select lives_ok(
  $$
    select public.create_my_connection_request(
      '41000000-0000-4000-8000-000000000002'::uuid,
      'collab',
      'Let us work together on a trusted project.',
      '44000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'identical connection retry is idempotent'
);

reset role;
select results_eq(
  $$
    select count(*)::bigint
    from public.connection_requests
    where client_request_id = '44000000-0000-4000-8000-000000000001'::uuid
  $$,
  array[1::bigint],
  'connection retry creates one request'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.notifications
    where user_id = '41000000-0000-4000-8000-000000000002'::uuid
      and type = 'connection_request'
  $$,
  array[1::bigint],
  'connection event creates one fixed recipient notification'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
select lives_ok(
  $$
    select public.respond_to_my_connection_request(
      (
        select id
        from public.connection_requests
        where client_request_id = '44000000-0000-4000-8000-000000000001'::uuid
      ),
      'accepted'
    )
  $$,
  'recipient can atomically accept a connection request'
);

reset role;
select results_eq(
  $$
    select count(*)::bigint
    from public.notifications
    where user_id = '41000000-0000-4000-8000-000000000001'::uuid
      and type = 'connection_accepted'
      and message = 'Your connection request was accepted.'
  $$,
  array[1::bigint],
  'connection acceptance content is server-owned'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.connection_requests
    where client_request_id = '44000000-0000-4000-8000-000000000001'::uuid
      and responded_at is not null
  $$,
  array[1::bigint],
  'connection response records its trusted transition time'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
select lives_ok(
  $$
    select public.request_my_mentor_session(
      '41000000-0000-4000-8000-000000000002'::uuid,
      'Please help me plan a secure community system.',
      30,
      '44000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'verified member can request mentorship atomically'
);

reset role;
select results_eq(
  $$
    select count(*)::bigint
    from public.notifications
    where user_id = '41000000-0000-4000-8000-000000000002'::uuid
      and type = 'mentor_request'
  $$,
  array[1::bigint],
  'mentor request creates one fixed expert notification'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
select lives_ok(
  $$
    select public.transition_my_mentor_session(
      (
        select id
        from public.mentor_sessions
        where client_request_id = '44000000-0000-4000-8000-000000000002'::uuid
      ),
      'accepted',
      'https://meet.example.test/trusted-session',
      statement_timestamp() + interval '1 day'
    )
  $$,
  'expert can atomically accept a mentorship session'
);

reset role;
select results_eq(
  $$
    select count(*)::bigint
    from private.email_delivery_outbox
    where template_key = 'mentor_session_accepted'
      and recipient_user_id = '41000000-0000-4000-8000-000000000001'::uuid
  $$,
  array[1::bigint],
  'mentor acceptance queues one fixed-template email job'
);
select results_eq(
  $$
    select count(*)::bigint
    from private.email_delivery_outbox
    where template_data ? 'mentor_name'
      and template_data ? 'scheduled_for'
      and template_data ? 'meeting_url'
      and not template_data ? 'subject'
      and not template_data ? 'html_body'
  $$,
  array[1::bigint],
  'email outbox stores scalar template data, not caller-authored subject or HTML'
);

set local role service_role;
set local "request.jwt.claim.role" = 'service_role';
select lives_ok(
  $$select * from public.claim_email_delivery_batch(10)$$,
  'service worker can atomically claim a due email job'
);
select results_eq(
  $$
    select count(*)::bigint
    from private.email_delivery_outbox
    where status = 'processing'
      and lease_token is not null
      and attempt_count = 1
  $$,
  array[1::bigint],
  'claimed job carries a lease and bounded attempt count'
);
select lives_ok(
  $$
    select public.complete_email_delivery(
      outbox.id,
      outbox.lease_token,
      true,
      'provider-message-fixture',
      null
    )
    from private.email_delivery_outbox as outbox
    where outbox.status = 'processing'
  $$,
  'service worker can complete the matching lease'
);

reset role;
select results_eq(
  $$
    select count(*)::bigint
    from private.email_delivery_outbox
    where status = 'delivered'
      and provider_message_id = 'provider-message-fixture'
      and lease_token is null
  $$,
  array[1::bigint],
  'successful completion seals the outbox job'
);

reset role;
update auth.users
set email = null
where id = '41000000-0000-4000-8000-000000000003'::uuid;
insert into private.email_delivery_outbox (
  event_key,
  recipient_user_id,
  template_key,
  template_data
) values (
  'missing-email-fixture',
  '41000000-0000-4000-8000-000000000003'::uuid,
  'mentor_session_accepted',
  '{}'::jsonb
);
set local role service_role;
set local "request.jwt.claim.role" = 'service_role';
select lives_ok(
  $$select * from public.claim_email_delivery_batch(10)$$,
  'claiming fails closed for an account without an email address'
);

reset role;
select results_eq(
  $$
    select count(*)::bigint
    from private.email_delivery_outbox
    where event_key = 'missing-email-fixture'
      and status = 'dead'
      and last_error = 'Recipient has no deliverable email address'
  $$,
  array[1::bigint],
  'missing-email job becomes operator-visible dead work instead of retrying forever'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
select lives_ok(
  $$
    select public.post_my_mission_update(
      '42000000-0000-4000-8000-000000000001'::uuid,
      'The trusted event boundary is ready for review.',
      '44000000-0000-4000-8000-000000000003'::uuid
    )
  $$,
  'mission member can publish through the atomic event RPC'
);
select lives_ok(
  $$
    select public.request_my_vouch(
      'Please vouch for my contribution to the trusted mission.',
      '41000000-0000-4000-8000-000000000002'::uuid,
      '44000000-0000-4000-8000-000000000004'::uuid
    )
  $$,
  'member can create a targeted vouch request through the event RPC'
);

reset role;
select results_eq(
  $$
    select count(*)::bigint
    from public.notifications
    where user_id = '41000000-0000-4000-8000-000000000002'::uuid
      and type in ('mission_updates', 'vouch_request')
  $$,
  array[2::bigint],
  'mission and vouch mutations derive their recipient notifications'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000004';
set local "request.jwt.claim.role" = 'authenticated';
select lives_ok(
  $$
    select public.approve_chapter_proposal(
      '43000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'admin can approve a proposal with one trusted transaction'
);

reset role;
select results_eq(
  $$
    select count(*)::bigint
    from public.chapter_proposals as proposal
    join public.chapter_members as member on member.user_id = proposal.proposer_id
    join public.chapters as chapter on chapter.id = member.chapter_id
    where proposal.id = '43000000-0000-4000-8000-000000000001'::uuid
      and proposal.status = 'approved'
      and member.role = 'lead'
      and chapter.name = proposal.proposed_name
  $$,
  array[1::bigint],
  'chapter, lead membership and proposal status commit together'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.notifications
    where user_id = '41000000-0000-4000-8000-000000000003'::uuid
      and type = 'chapter_approved'
  $$,
  array[1::bigint],
  'chapter approval derives one proposer notification'
);

select * from finish();

rollback;
