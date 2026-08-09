begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_table('public', 'conversation_spaces', 'conversation Spaces exist');
select has_table('public', 'conversation_space_memberships', 'Space membership projection exists');
select has_table('public', 'conversation_space_roles', 'Space roles exist');
select has_table('public', 'conversation_context_groups', 'Space context groups exist');
select has_table('public', 'conversation_rooms', 'typed Rooms exist');
select has_table('public', 'conversation_threads', 'Threads exist');
select has_table('public', 'conversation_messages', 'durable Room messages exist');
select has_table('public', 'conversation_read_states', 'per-member Room read state exists');
select has_table('public', 'conversation_reports', 'conversation reports exist');
select has_table('private', 'conversation_moderation_actions', 'moderation actions are private');
select has_table('private', 'conversation_outbox', 'conversation delivery outbox is private');

select has_column('public', 'chapters', 'lifecycle_state', 'Chapters have a lifecycle state');
select has_column('public', 'chapters', 'state_version', 'Chapters use optimistic concurrency');
select has_column('public', 'chapters', 'join_policy', 'Chapters have an explicit join policy');
select has_column('public', 'chapters', 'client_request_id', 'managed Chapter creation is idempotent');
select has_column('public', 'chapter_proposals', 'client_request_id', 'Chapter proposals are idempotent');
select has_column('public', 'chapter_members', 'membership_state', 'Chapter memberships have lifecycle');
select has_column('public', 'missions', 'lifecycle_state', 'Missions have a lifecycle state');
select has_column('public', 'missions', 'client_request_id', 'Mission creation is idempotent');
select has_column('public', 'mission_members', 'membership_state', 'Mission memberships have lifecycle');

select ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class as relation
    where relation.oid = 'public.conversation_spaces'::regclass
  ),
  'Spaces use RLS'
);
select ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class as relation
    where relation.oid = 'public.conversation_messages'::regclass
  ),
  'Room messages use RLS'
);
select ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class as relation
    where relation.oid = 'private.conversation_outbox'::regclass
  ),
  'private outbox keeps RLS defense in depth'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_messages'
  ),
  'Room messages are published for realtime fan-out'
);

select has_function(
  'public',
  'create_my_chapter_proposal',
  array['text','text','text','text','text','text','text','integer','text','text','uuid']
);
select has_function(
  'public',
  'create_managed_chapter',
  array['text','text','text','text','text','text','uuid']
);
select has_function(
  'public',
  'create_my_mission',
  array['text','text','text','uuid','text','text','uuid']
);
select has_function(
  'public',
  'request_my_space_membership',
  array['uuid','text','text','uuid']
);
select has_function(
  'public',
  'set_managed_space_lead',
  array['uuid','uuid','boolean','bigint','text']
);
select has_function(
  'public',
  'transition_managed_chapter',
  array['uuid','text','bigint','text']
);
select has_function(
  'public',
  'send_my_conversation_message',
  array['uuid','uuid','text','uuid']
);
select has_function(
  'public',
  'mark_my_conversation_room_read',
  array['uuid','uuid']
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_my_mission(text,text,text,uuid,text,text,uuid)',
    'EXECUTE'
  ),
  'authenticated members can execute the atomic Mission contract'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_my_mission(text,text,text,uuid,text,text,uuid)',
    'EXECUTE'
  ),
  'anonymous callers cannot create Missions'
);
select ok(
  not has_table_privilege('authenticated', 'public.missions', 'INSERT')
    and not has_table_privilege('authenticated', 'public.missions', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.missions', 'DELETE'),
  'browser roles cannot mutate Missions directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.mission_members', 'INSERT')
    and not has_table_privilege('authenticated', 'public.chapter_members', 'INSERT'),
  'browser roles cannot forge domain membership'
);
select ok(
  not has_table_privilege('authenticated', 'public.conversation_messages', 'INSERT'),
  'browser roles cannot bypass the message RPC'
);
select ok(
  not has_table_privilege('authenticated', 'private.conversation_outbox', 'SELECT'),
  'browser roles cannot inspect conversation delivery work'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '51000000-0000-4000-8000-000000000001'::uuid,
    'space-lead@example.test',
    '{"display_name":"Space Lead"}'::jsonb
  ),
  (
    '51000000-0000-4000-8000-000000000002'::uuid,
    'space-member@example.test',
    '{"display_name":"Space Member"}'::jsonb
  ),
  (
    '51000000-0000-4000-8000-000000000003'::uuid,
    'space-outsider@example.test',
    '{"display_name":"Space Outsider"}'::jsonb
  ),
  (
    '51000000-0000-4000-8000-000000000004'::uuid,
    'space-admin@example.test',
    '{"display_name":"Space Admin"}'::jsonb
  );

insert into private.community_onboarding_state (
  user_id, status, current_step, version, started_at, completed_at
)
values
  ('51000000-0000-4000-8000-000000000001'::uuid, 'completed', 'completed', 1, now(), now()),
  ('51000000-0000-4000-8000-000000000002'::uuid, 'completed', 'completed', 1, now(), now()),
  ('51000000-0000-4000-8000-000000000003'::uuid, 'completed', 'completed', 1, now(), now()),
  ('51000000-0000-4000-8000-000000000004'::uuid, 'completed', 'completed', 1, now(), now())
on conflict (user_id) do update
set status = excluded.status,
    current_step = excluded.current_step,
    version = excluded.version,
    started_at = excluded.started_at,
    completed_at = excluded.completed_at;

insert into public.user_roles (user_id, role)
values ('51000000-0000-4000-8000-000000000004'::uuid, 'admin');

set local role authenticated;
set local "request.jwt.claim.sub" = '51000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  $$
    insert into public.chapter_proposals (
      proposer_id, proposed_name, rationale, proposer_background
    ) values (
      '51000000-0000-4000-8000-000000000001'::uuid,
      'Forged Chapter',
      'This direct insert must not cross the trusted mutation boundary.',
      'This direct insert is deliberately unauthorized.'
    )
  $$,
  '42501',
  'permission denied for table chapter_proposals',
  'member cannot bypass the Chapter proposal RPC'
);

select lives_ok(
  $$
    select public.create_my_chapter_proposal(
      'Pune Builders Chapter',
      'Pune',
      'India',
      'IN',
      'Builders and community leaders',
      'This Chapter brings local builders together around durable public-interest work.',
      'The proposer has experience convening builders and coordinating community programmes.',
      100,
      'request',
      'discoverable',
      '52000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'an onboarded member can submit an atomic Chapter proposal'
);

select lives_ok(
  $$
    select public.create_my_chapter_proposal(
      'Pune Builders Chapter',
      'Pune',
      'India',
      'IN',
      'Builders and community leaders',
      'This Chapter brings local builders together around durable public-interest work.',
      'The proposer has experience convening builders and coordinating community programmes.',
      100,
      'request',
      'discoverable',
      '52000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'identical Chapter proposal retry is idempotent'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = '51000000-0000-4000-8000-000000000004';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$
    select public.approve_chapter_proposal(
      (
        select id
        from public.chapter_proposals
        where client_request_id = '52000000-0000-4000-8000-000000000001'::uuid
      )
    )
  $$,
  'programme authority can approve a submitted Chapter proposal atomically'
);

reset role;

select results_eq(
  $$
    select count(*)::bigint
    from public.chapters
    where source_proposal_id = (
      select id
      from public.chapter_proposals
      where client_request_id = '52000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  array[1::bigint],
  'approval creates exactly one Chapter'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.conversation_spaces
    where chapter_id = (
      select approved_chapter_id
      from public.chapter_proposals
      where client_request_id = '52000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  array[1::bigint],
  'approval creates exactly one Chapter Space'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.conversation_rooms as room
    join public.conversation_spaces as space on space.id = room.space_id
    where space.chapter_id = (
      select approved_chapter_id
      from public.chapter_proposals
      where client_request_id = '52000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  array[7::bigint],
  'Chapter blueprint creates seven deterministic Rooms'
);
select results_eq(
  $$
    select role, membership_state
    from public.chapter_members
    where user_id = '51000000-0000-4000-8000-000000000001'::uuid
  $$,
  $$values ('lead'::text, 'active'::text)$$,
  'proposal owner becomes the authoritative active Chapter lead'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '51000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$
    select public.create_my_mission(
      'Neighbourhood knowledge mission',
      'knowledge',
      'Document and share practical neighbourhood knowledge through a measurable community collaboration.',
      (
        select approved_chapter_id
        from public.chapter_proposals
        where client_request_id = '52000000-0000-4000-8000-000000000001'::uuid
      ),
      'open',
      'discoverable',
      '52000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'Chapter lead can atomically create its Mission, lead membership and Space'
);

select throws_ok(
  $$
    insert into public.mission_members (mission_id, user_id, role)
    values (
      (
        select id
        from public.missions
        where client_request_id = '52000000-0000-4000-8000-000000000002'::uuid
      ),
      '51000000-0000-4000-8000-000000000003'::uuid,
      'lead'
    )
  $$,
  '42501',
  'permission denied for table mission_members',
  'member cannot forge Mission leadership directly'
);

reset role;

select results_eq(
  $$
    select count(*)::bigint
    from public.conversation_rooms as room
    join public.conversation_spaces as space on space.id = room.space_id
    where space.mission_id = (
      select id
      from public.missions
      where client_request_id = '52000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  array[6::bigint],
  'Mission blueprint creates six deterministic Rooms'
);
select results_eq(
  $$
    select role, membership_state
    from public.mission_members
    where mission_id = (
      select id
      from public.missions
      where client_request_id = '52000000-0000-4000-8000-000000000002'::uuid
    ) and user_id = '51000000-0000-4000-8000-000000000001'::uuid
  $$,
  $$values ('lead'::text, 'active'::text)$$,
  'Mission creator is its authoritative active lead'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '51000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$
    select public.request_my_space_membership(
      (
        select space.id
        from public.conversation_spaces as space
        join public.missions as mission on mission.id = space.mission_id
        where mission.client_request_id = '52000000-0000-4000-8000-000000000002'::uuid
      ),
      'contributor',
      'I can help document and verify the local knowledge.',
      '52000000-0000-4000-8000-000000000003'::uuid
    )
  $$,
  'open Mission membership becomes active through the caller-bound contract'
);

select lives_ok(
  $$
    select public.send_my_conversation_message(
      (
        select room.id
        from public.conversation_rooms as room
        join public.conversation_spaces as space on space.id = room.space_id
        join public.missions as mission on mission.id = space.mission_id
        where mission.client_request_id = '52000000-0000-4000-8000-000000000002'::uuid
          and room.system_key = 'workroom'
      ),
      null,
      'I will document the first local practice and its evidence.',
      '52000000-0000-4000-8000-000000000004'::uuid
    )
  $$,
  'active Mission member can post through the Room message RPC'
);

select lives_ok(
  $$
    select public.mark_my_conversation_room_read(
      (
        select room_id
        from public.conversation_messages
        where client_request_id = '52000000-0000-4000-8000-000000000004'::uuid
      ),
      (
        select id
        from public.conversation_messages
        where client_request_id = '52000000-0000-4000-8000-000000000004'::uuid
      )
    )
  $$,
  'member can advance a validated Room read cursor'
);

select results_eq(
  $$
    select membership_state
    from public.conversation_space_memberships as membership
    join public.conversation_spaces as space on space.id = membership.space_id
    join public.missions as mission on mission.id = space.mission_id
    where mission.client_request_id = '52000000-0000-4000-8000-000000000002'::uuid
      and membership.user_id = '51000000-0000-4000-8000-000000000002'::uuid
  $$,
  $$values ('active'::text)$$,
  'Space projection synchronizes the authoritative Mission membership'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = '51000000-0000-4000-8000-000000000003';
set local "request.jwt.claim.role" = 'authenticated';

select results_eq(
  $$
    select count(*)::bigint
    from public.conversation_rooms as room
    join public.conversation_spaces as space on space.id = room.space_id
    join public.missions as mission on mission.id = space.mission_id
    where mission.client_request_id = '52000000-0000-4000-8000-000000000002'::uuid
  $$,
  array[0::bigint],
  'a discoverable Space does not grant an outsider content access'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.conversation_messages
    where client_request_id = '52000000-0000-4000-8000-000000000004'::uuid
  $$,
  array[0::bigint],
  'Room message RLS hides member content from an outsider'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = '51000000-0000-4000-8000-000000000004';
set local "request.jwt.claim.role" = 'authenticated';

select results_eq(
  $$
    select count(*)::bigint
    from public.conversation_rooms as room
    join public.conversation_spaces as space on space.id = room.space_id
    join public.missions as mission on mission.id = space.mission_id
    where mission.client_request_id = '52000000-0000-4000-8000-000000000002'::uuid
  $$,
  array[0::bigint],
  'platform admin authority does not imply private Space membership'
);

select * from finish();

rollback;
