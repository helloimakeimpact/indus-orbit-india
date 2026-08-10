begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(24);

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
    '21000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'io-terminal-owner@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '21000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'io-terminal-outsider@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.io_workspaces (id, slug, name, created_by)
values (
  '22000000-0000-4000-8000-000000000001',
  'io-terminal-test',
  'I/O terminal test workspace',
  '21000000-0000-4000-8000-000000000001'
);

insert into public.io_workspace_members (workspace_id, user_id, role, status)
values (
  '22000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000001',
  'owner',
  'active'
);

select ok(
  has_table_privilege('authenticated', 'public.io_terminal_sessions', 'select'),
  'authenticated members can select RLS-scoped terminal sessions'
);

select ok(
  not has_table_privilege('authenticated', 'public.io_terminal_sessions', 'insert'),
  'browser users cannot directly forge terminal sessions'
);

select ok(
  not has_table_privilege('authenticated', 'public.io_terminal_session_events', 'insert'),
  'browser users cannot directly forge terminal events'
);

select ok(
  not has_table_privilege('authenticated', 'public.io_terminal_approval_requests', 'insert'),
  'browser approval mutation remains closed until its reviewed RPC ships'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_my_io_terminal_session(uuid,text,text,text,text,text)',
    'execute'
  ),
  'anonymous callers cannot create terminal sessions'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_my_io_terminal_session(uuid,text,text,text,text,text)',
    'execute'
  ),
  'authenticated callers can use the validated terminal-session boundary'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.list_my_io_terminal_sessions(uuid)',
    'execute'
  ),
  'anonymous callers cannot enumerate terminal sessions'
);

set local "request.jwt.claim.sub" = '21000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  (
    public.create_my_io_terminal_session(
      '22000000-0000-4000-8000-000000000001',
      'Plan the safe terminal rollout',
      'plan',
      'http://127.0.0.1:4096',
      'local-opencode-session-private-reference',
      '1.2.3'
    )
  ).state,
  'running',
  'member creates a durable running session through the narrow RPC'
);

select is(
  (select count(*) from public.io_terminal_sessions),
  1::bigint,
  'member sees its RLS-scoped terminal session'
);

select is(
  (
    select count(*)
    from public.list_my_io_terminal_sessions('22000000-0000-4000-8000-000000000001')
  ),
  1::bigint,
  'member receives the bounded durable terminal-session projection'
);

select is(
  (select char_length(connector_origin_hash) from public.io_terminal_sessions),
  64,
  'connector origin is stored only as a SHA-256 hash'
);

select is(
  (select char_length(runtime_reference_hash) from public.io_terminal_sessions),
  64,
  'local OpenCode session reference is stored only as a SHA-256 hash'
);

select ok(
  not exists (
    select 1
    from public.io_terminal_sessions
    where row_to_json(io_terminal_sessions)::text like '%127.0.0.1%'
      or row_to_json(io_terminal_sessions)::text like '%private-reference%'
  ),
  'durable session rows contain neither raw origin nor raw runtime reference'
);

select is(
  (select role from public.io_terminal_session_members),
  'owner',
  'session creator receives the durable owner membership'
);

select is(
  (select event_type from public.io_terminal_session_events where sequence = 1),
  'session.created',
  'session creation writes the first ordered safe event'
);

select ok(
  not exists (
    select 1 from public.io_terminal_session_events
    where redacted_payload::text like '%safe terminal rollout%'
  ),
  'safe timeline does not copy the user title or prompt-like content into event payloads'
);

select throws_ok(
  $$
    insert into public.io_terminal_sessions (
      workspace_id,
      created_by,
      title,
      mode,
      connector_origin_hash,
      runtime_reference_hash
    ) values (
      '22000000-0000-4000-8000-000000000001',
      '21000000-0000-4000-8000-000000000001',
      'Forged browser session',
      'run',
      repeat('a', 64),
      repeat('b', 64)
    )
  $$,
  '42501',
  null,
  'direct browser insert fails at the privilege boundary'
);

select throws_ok(
  $$
    select public.create_my_io_terminal_session(
      '22000000-0000-4000-8000-000000000001',
      'Invalid public connector',
      'plan',
      'https://example.com',
      'runtime-reference',
      null
    )
  $$,
  'P0001',
  'Only a loopback OpenCode origin can be registered',
  'non-loopback connector registration fails closed'
);

select is(
  (
    public.complete_my_io_terminal_session(
      (select id from public.io_terminal_sessions limit 1),
      'completed'
    )
  ).state,
  'completed',
  'session owner finalizes the durable lifecycle'
);

select is(
  (select last_event_sequence from public.io_terminal_sessions),
  2::bigint,
  'terminal session preserves monotonic event sequence'
);

select is(
  (select count(*) from public.io_terminal_session_events),
  2::bigint,
  'terminal completion adds exactly one immutable safe event'
);

select is(
  (
    public.complete_my_io_terminal_session(
      (select id from public.io_terminal_sessions limit 1),
      'completed'
    )
  ).state,
  'completed',
  'terminal completion is idempotent after reaching a terminal state'
);

reset role;
set local "request.jwt.claim.sub" = '21000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  (select count(*) from public.io_terminal_sessions),
  0::bigint,
  'unrelated member cannot read terminal sessions'
);

select throws_ok(
  $$
    select public.complete_my_io_terminal_session(
      (select id from public.io_terminal_sessions limit 1),
      'stopped'
    )
  $$,
  '42501',
  'Terminal session write access required',
  'unrelated member cannot mutate a terminal lifecycle'
);

select * from finish();
rollback;
