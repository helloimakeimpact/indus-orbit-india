begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(33);

select has_function(
  'public',
  'admin_member_search',
  array['text', 'integer'],
  'scoped member search exists'
);
select has_function(
  'public',
  'admin_set_member_suspension',
  array['uuid', 'boolean', 'text', 'boolean'],
  'transactional member suspension command exists'
);
select has_function(
  'public',
  'admin_set_member_verification',
  array['uuid', 'boolean', 'text', 'boolean'],
  'transactional member verification command exists'
);
select has_function(
  'public',
  'admin_operation_event_queue',
  array['text[]', 'timestamptz', 'bigint', 'integer'],
  'redacted admin event queue exists'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.admin_set_member_suspension(uuid,boolean,text,boolean)',
    'EXECUTE'
  )
    and not has_function_privilege(
      'anon',
      'public.admin_set_member_suspension(uuid,boolean,text,boolean)',
      'EXECUTE'
    ),
  'member support command is reachable only through authenticated capability checks'
);
select ok(
  not has_table_privilege('authenticated', 'public.member_suspensions', 'INSERT')
    and not has_table_privilege('authenticated', 'public.member_suspensions', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.member_suspensions', 'DELETE'),
  'browser roles cannot mutate suspension rows directly'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '61000000-0000-4000-8000-000000000001',
    'support-root@example.test',
    '{"display_name":"Support Root"}'::jsonb
  ),
  (
    '61000000-0000-4000-8000-000000000002',
    'support-operator@example.test',
    '{"display_name":"Support Operator"}'::jsonb
  ),
  (
    '61000000-0000-4000-8000-000000000003',
    'audit-operator@example.test',
    '{"display_name":"Audit Operator"}'::jsonb
  ),
  (
    '61000000-0000-4000-8000-000000000004',
    'member-target@example.test',
    '{"display_name":"Member Target"}'::jsonb
  ),
  (
    '61000000-0000-4000-8000-000000000005',
    'member-outsider@example.test',
    '{"display_name":"Member Outsider"}'::jsonb
  );

insert into public.user_roles (user_id, role)
values ('61000000-0000-4000-8000-000000000001', 'admin');

insert into private.admin_team_assignments (
  user_id,
  role,
  assigned_by,
  reason
) values
  (
    '61000000-0000-4000-8000-000000000002',
    'member_support',
    '61000000-0000-4000-8000-000000000001',
    'Assigned to the member support contract test.'
  ),
  (
    '61000000-0000-4000-8000-000000000003',
    'audit_viewer',
    '61000000-0000-4000-8000-000000000001',
    'Assigned to the audit evidence contract test.'
  );

update public.profiles
set
  display_name = case user_id
    when '61000000-0000-4000-8000-000000000002'::uuid then 'Support Operator'
    when '61000000-0000-4000-8000-000000000003'::uuid then 'Audit Operator'
    when '61000000-0000-4000-8000-000000000004'::uuid then 'Member Target'
    else display_name
  end,
  headline = case
    when user_id = '61000000-0000-4000-8000-000000000004'::uuid
      then 'Builds public-interest systems'
    else headline
  end
where user_id in (
  '61000000-0000-4000-8000-000000000002',
  '61000000-0000-4000-8000-000000000003',
  '61000000-0000-4000-8000-000000000004'
);

set local "request.jwt.claim.sub" = '61000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  (select count(*) from public.admin_member_search('Member Target', 25)),
  1::bigint,
  'member support operator receives matching privacy-minimised members'
);
select ok(
  not exists (
    select 1
    from public.admin_member_search('Member Target', 25) as member
    where to_jsonb(member) ? 'email'
      or to_jsonb(member) ? 'city'
      or to_jsonb(member) ? 'country'
  ),
  'member support search omits email and private location'
);
select throws_ok(
  $$ select * from public.admin_member_search('M', 25) $$,
  'P0001',
  'Member search must be between 2 and 80 characters',
  'member search rejects undersized queries'
);
select throws_ok(
  $$ select * from public.admin_member_search('Member', 51) $$,
  'P0001',
  'Member search limit must be between 1 and 50',
  'member search bounds result size'
);
select is(
  public.admin_set_member_suspension(
    '61000000-0000-4000-8000-000000000004',
    true,
    'Repeated abuse was verified against the support policy.',
    false
  ) ->> 'suspended',
  'true',
  'support operator suspends through the transactional command'
);

reset role;

select is(
  (
    select count(*)
    from public.member_suspensions
    where user_id = '61000000-0000-4000-8000-000000000004'
      and lifted_at is null
  ),
  1::bigint,
  'one active suspension row is created'
);
select is(
  (
    select count(*)
    from private.admin_operation_events
    where target_id = '61000000-0000-4000-8000-000000000004'
      and action = 'member.suspended'
  ),
  1::bigint,
  'suspension creates private operation evidence'
);

set local "request.jwt.claim.sub" = '61000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  public.admin_set_member_suspension(
    '61000000-0000-4000-8000-000000000004',
    true,
    'Repeated abuse was verified against the support policy.',
    true
  ) ->> 'changed',
  'false',
  'identical desired suspension state is idempotent'
);

reset role;

select is(
  (
    select count(*)
    from private.admin_operation_events
    where target_id = '61000000-0000-4000-8000-000000000004'
      and action = 'member.suspended'
  ),
  1::bigint,
  'idempotent suspension retry creates no duplicate evidence'
);

set local "request.jwt.claim.sub" = '61000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select throws_ok(
  $$
    select public.admin_set_member_suspension(
      '61000000-0000-4000-8000-000000000004',
      false,
      'State conflict should fail before a support mutation.',
      false
    )
  $$,
  'P0001',
  'Member suspension state changed; refresh before continuing',
  'stale suspension state fails closed'
);
select throws_ok(
  $$
    select public.admin_set_member_suspension(
      '61000000-0000-4000-8000-000000000003',
      true,
      'Admin-team authority must be removed before suspension.',
      false
    )
  $$,
  'P0001',
  'Remove admin-team authority before suspending this member',
  'active admin-team members are protected from support suspension'
);
select throws_ok(
  $$
    select public.admin_set_member_verification(
      '61000000-0000-4000-8000-000000000003',
      true,
      'Staff verification needs a separate authority path.',
      false
    )
  $$,
  'P0001',
  'Remove admin-team authority before changing verification',
  'active admin-team members are protected from support verification changes'
);
select is(
  public.admin_set_member_suspension(
    '61000000-0000-4000-8000-000000000004',
    false,
    'Appeal review established that the suspension should be lifted.',
    true
  ) ->> 'suspended',
  'false',
  'support operator lifts the suspension transactionally'
);

reset role;

select is(
  (
    select count(*)
    from public.member_suspensions
    where user_id = '61000000-0000-4000-8000-000000000004'
      and lifted_at is not null
      and lifted_by = '61000000-0000-4000-8000-000000000002'
  ),
  1::bigint,
  'lifted suspension records the authenticated operator'
);

set local "request.jwt.claim.sub" = '61000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  public.admin_set_member_verification(
    '61000000-0000-4000-8000-000000000004',
    true,
    'Identity evidence met the documented verification standard.',
    false
  ) ->> 'verified',
  'true',
  'support operator records a verification decision'
);

reset role;

select is(
  (
    select is_verified
    from public.profiles
    where user_id = '61000000-0000-4000-8000-000000000004'
  ),
  true,
  'member profile reflects the verified decision'
);
select is(
  (
    select count(*)
    from public.verification_decisions
    where actor_id = '61000000-0000-4000-8000-000000000002'
      and decision = 'approved'
  ),
  1::bigint,
  'verification command appends the legacy-compatible decision record'
);
select is(
  (
    select count(*)
    from private.admin_operation_events
    where target_id = '61000000-0000-4000-8000-000000000004'
      and action = 'member.verified'
  ),
  1::bigint,
  'verification command appends private operation evidence'
);

set local "request.jwt.claim.sub" = '61000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  public.admin_set_member_verification(
    '61000000-0000-4000-8000-000000000004',
    true,
    'Identity evidence met the documented verification standard.',
    true
  ) ->> 'changed',
  'false',
  'identical verification retry is idempotent'
);

reset role;

set local "request.jwt.claim.sub" = '61000000-0000-4000-8000-000000000003';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select ok(
  (select count(*) from public.admin_operation_event_queue(null, null, null, 25)) >= 3,
  'audit viewer reads redacted operation evidence'
);
select ok(
  not exists (
    select 1
    from public.admin_operation_event_queue(array['members'], null, null, 25) as event
    where event.domain <> 'members'
      or to_jsonb(event) ? 'actor_user_id'
  ),
  'audit queue filters domains and omits raw actor identity'
);
select throws_ok(
  $$
    select *
    from public.admin_operation_event_queue(array['secrets'], null, null, 25)
  $$,
  'P0001',
  'Audit domain filter is invalid',
  'audit queue rejects unknown domains'
);
select throws_ok(
  $$
    select *
    from public.admin_operation_event_queue(null, now(), null, 25)
  $$,
  'P0001',
  'Audit queue cursor is incomplete',
  'audit queue rejects incomplete cursors'
);

set local "request.jwt.claim.sub" = '61000000-0000-4000-8000-000000000005';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select throws_ok(
  $$ select * from public.admin_member_search('Member', 25) $$,
  '42501',
  'Member support access required',
  'ordinary member cannot search support records'
);
select throws_ok(
  $$
    select public.admin_set_member_suspension(
      '61000000-0000-4000-8000-000000000004',
      true,
      'Ordinary members must not suspend another member.',
      false
    )
  $$,
  '42501',
  'Member support mutation access required',
  'ordinary member cannot mutate suspension state'
);
select throws_ok(
  $$
    select public.admin_set_member_verification(
      '61000000-0000-4000-8000-000000000004',
      false,
      'Ordinary members must not change verification state.',
      true
    )
  $$,
  '42501',
  'Member support mutation access required',
  'ordinary member cannot mutate verification state'
);
select throws_ok(
  $$ select * from public.admin_operation_event_queue(null, null, null, 25) $$,
  '42501',
  'Audit access required',
  'ordinary member cannot read admin operation evidence'
);

reset role;

select * from finish();
rollback;
