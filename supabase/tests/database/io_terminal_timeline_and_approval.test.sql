begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(25);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '31000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'io-timeline-owner@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '31000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'io-timeline-outsider@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.io_workspaces (id, slug, name, created_by)
values (
  '32000000-0000-4000-8000-000000000001',
  'io-timeline-test',
  'I/O timeline test workspace',
  '31000000-0000-4000-8000-000000000001'
);

insert into public.io_workspace_members (workspace_id, user_id, role, status)
values (
  '32000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001',
  'owner',
  'active'
);

select ok(
  not has_table_privilege('authenticated', 'public.io_terminal_session_events', 'insert'),
  'browser users still cannot directly write terminal events'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.append_my_io_terminal_event(uuid,text,text,jsonb)',
    'execute'
  ),
  'authenticated members can use the narrow terminal event RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.append_my_io_terminal_event(uuid,text,text,jsonb)',
    'execute'
  ),
  'anonymous callers cannot append terminal events'
);

set local "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  (
    public.create_my_io_terminal_session(
      '32000000-0000-4000-8000-000000000001',
      'Observe local OpenCode lifecycle',
      'observe',
      'http://127.0.0.1:4096',
      'runtime-reference-must-not-leave-device',
      '1.3.0'
    )
  ).last_event_sequence,
  1::bigint,
  'session starts with a created metadata event'
);

select is(
  (
    select sequence
    from public.append_my_io_terminal_event(
      (select id from public.io_terminal_sessions limit 1),
      'runtime.connected',
      'runtime-connected-001',
      '{"runtimeVersionKnown":true}'::jsonb
    )
  ),
  2::bigint,
  'owner appends an ordered runtime-connected metadata event'
);

select is(
  (
    select replayed
    from public.append_my_io_terminal_event(
      (select id from public.io_terminal_sessions limit 1),
      'runtime.connected',
      'runtime-connected-001',
      '{"runtimeVersionKnown":true}'::jsonb
    )
  ),
  true,
  'the same event key and metadata replay safely'
);

select is(
  (select last_event_sequence from public.io_terminal_sessions),
  2::bigint,
  'event replay does not advance the terminal sequence'
);

select throws_ok(
  $$
    select public.append_my_io_terminal_event(
      (select id from public.io_terminal_sessions limit 1),
      'runtime.connected',
      'runtime-connected-001',
      '{"runtimeVersionKnown":false}'::jsonb
    )
  $$,
  'P0001',
  'Terminal event key was already used for different metadata',
  'event-key reuse with different metadata fails closed'
);

select throws_ok(
  $$
    select public.append_my_io_terminal_event(
      (select id from public.io_terminal_sessions limit 1),
      'prompt.accepted',
      'prompt-accepted-001',
      '{"note":"private prompt must stay local"}'::jsonb
    )
  $$,
  'P0001',
  'Prompt acceptance stores no cloud payload',
  'prompt acceptance refuses arbitrary content payloads'
);

select is(
  (
    select sequence
    from public.append_my_io_terminal_event(
      (select id from public.io_terminal_sessions limit 1),
      'prompt.accepted',
      'prompt-accepted-001',
      '{}'::jsonb
    )
  ),
  3::bigint,
  'prompt acceptance stores only ordered metadata'
);

select is(
  (
    select count(*)
    from public.list_my_io_terminal_events(
      (select id from public.io_terminal_sessions limit 1),
      null,
      50
    )
  ),
  3::bigint,
  'owner receives a bounded terminal metadata timeline'
);

select ok(
  not exists (
    select 1
    from public.list_my_io_terminal_events(
      (select id from public.io_terminal_sessions limit 1),
      null,
      50
    ) as event
    where to_jsonb(event) ? 'redacted_payload'
  ),
  'timeline RPC never returns the event payload column'
);

select throws_ok(
  $$
    select * from public.list_my_io_terminal_events(
      (select id from public.io_terminal_sessions limit 1),
      null,
      101
    )
  $$,
  'P0001',
  'Terminal event limit must be between 1 and 100',
  'timeline RPC bounds page size'
);

select is(
  (
    public.request_my_io_terminal_approval(
      (select id from public.io_terminal_sessions limit 1),
      'shell',
      'high',
      'once',
      'reviewed shell action',
      now() + interval '10 minutes'
    ) ->> 'state'
  ),
  'pending',
  'owner records a classified terminal approval request'
);

select is(
  (select last_event_sequence from public.io_terminal_sessions),
  4::bigint,
  'approval request is represented by one safe timeline event'
);

select ok(
  not exists (
    select 1
    from public.io_terminal_session_events
    where redacted_payload::text like '%reviewed shell action%'
  ),
  'approval reason is not copied into timeline payloads'
);

select throws_ok(
  $$
    select public.request_my_io_terminal_approval(
      (select id from public.io_terminal_sessions limit 1),
      'shell',
      'critical',
      'session',
      'critical shell action',
      now() + interval '4 minutes'
    )
  $$,
  'P0001',
  'Critical approvals may only be recorded once',
  'critical approval records cannot create persistent session policy'
);

select is(
  (
    public.decide_my_io_terminal_approval(
      (select id from public.io_terminal_approval_requests limit 1),
      'approved',
      'owner reviewed action'
    ) ->> 'state'
  ),
  'approved',
  'owner records an approval decision'
);

select is(
  (select last_event_sequence from public.io_terminal_sessions),
  5::bigint,
  'approval decision adds one ordered safe timeline event'
);

select is(
  (
    public.decide_my_io_terminal_approval(
      (select id from public.io_terminal_approval_requests limit 1),
      'approved',
      'owner reviewed action'
    ) ->> 'replayed'
  ),
  'true',
  'same approval decision is idempotent'
);

select throws_ok(
  $$
    select public.decide_my_io_terminal_approval(
      (select id from public.io_terminal_approval_requests limit 1),
      'rejected',
      'owner reviewed action'
    )
  $$,
  'P0001',
  'Terminal approval was already decided differently',
  'opposite approval replay fails closed'
);

select set_config(
  'io_test.timeline_approval_id',
  (select id::text from public.io_terminal_approval_requests limit 1),
  true
);

reset role;
set local "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  (select count(*) from public.io_terminal_session_events),
  0::bigint,
  'unrelated member cannot read terminal event rows directly'
);

select throws_ok(
  $$
    select * from public.list_my_io_terminal_events(
      '33000000-0000-4000-8000-000000000001',
      null,
      50
    )
  $$,
  '42501',
  'Terminal session read access required',
  'unrelated member cannot list a guessed terminal timeline'
);

select throws_ok(
  $$
    select * from public.append_my_io_terminal_event(
      '33000000-0000-4000-8000-000000000001',
      'prompt.accepted',
      'outsider-prompt-001',
      '{}'::jsonb
    )
  $$,
  '42501',
  'Terminal session write access required',
  'unrelated member cannot append a guessed terminal event'
);

select throws_ok(
  $$
    select public.decide_my_io_terminal_approval(
      current_setting('io_test.timeline_approval_id')::uuid,
      'approved',
      'outsider cannot decide'
    )
  $$,
  '42501',
  'Terminal approval decision access required',
  'unrelated member cannot decide a terminal approval'
);

reset role;

select * from finish();
rollback;
