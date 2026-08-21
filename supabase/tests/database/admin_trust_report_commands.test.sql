begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(19);

select has_table('private', 'admin_operation_events', 'admin operation audit table exists');
select ok(
  not has_table_privilege('authenticated', 'private.admin_operation_events', 'SELECT')
    and not has_table_privilege('authenticated', 'private.admin_operation_events', 'INSERT'),
  'browser roles have no direct admin audit table access'
);
select policies_are(
  'private',
  'admin_operation_events',
  array['Browser roles cannot access admin operation events'],
  'admin operation evidence has an explicit browser-deny RLS policy'
);
select has_function(
  'public',
  'admin_report_queue',
  array['timestamptz', 'uuid', 'integer'],
  'admin report queue RPC exists'
);
select has_function(
  'public',
  'admin_resolve_report',
  array['uuid', 'text', 'text', 'text'],
  'admin report resolution RPC exists'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.admin_resolve_report(uuid,text,text,text)',
    'EXECUTE'
  )
    and not has_function_privilege(
      'anon',
      'public.admin_resolve_report(uuid,text,text,text)',
      'EXECUTE'
    ),
  'only authenticated callers can reach the capability-checked command'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '51000000-0000-4000-8000-000000000001',
    'trust-admin@example.test',
    '{"display_name":"Trust Admin"}'::jsonb
  ),
  (
    '51000000-0000-4000-8000-000000000002',
    'trust-outsider@example.test',
    '{"display_name":"Trust Outsider"}'::jsonb
  ),
  (
    '51000000-0000-4000-8000-000000000003',
    'trust-reporter@example.test',
    '{"display_name":"Trust Reporter"}'::jsonb
  );

insert into public.user_roles (user_id, role)
values ('51000000-0000-4000-8000-000000000001', 'admin');

insert into public.reports (
  id,
  reporter_id,
  target_type,
  target_id,
  reason
) values (
  '52000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000003',
  'profile',
  '51000000-0000-4000-8000-000000000002',
  'Repeated unwanted contact after a clear request to stop.'
);

set local "request.jwt.claim.sub" = '51000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  (
    select count(*)
    from public.admin_report_queue(null, null, 25)
  ),
  1::bigint,
  'trust operator receives the bounded report queue'
);
select ok(
  not exists (
    select 1
    from public.admin_report_queue(null, null, 25) as report
    where to_jsonb(report) ? 'reporter_id'
  ),
  'report queue omits reporter identity'
);
select throws_ok(
  $$ select * from public.admin_report_queue(now(), null, 25) $$,
  'P0001',
  'Report queue cursor is incomplete',
  'report queue rejects incomplete cursors'
);
select throws_ok(
  $$ select * from public.admin_report_queue(null, null, 101) $$,
  'P0001',
  'Report queue limit must be between 1 and 100',
  'report queue bounds page size'
);

select is(
  public.admin_resolve_report(
    '52000000-0000-4000-8000-000000000001',
    'actioned',
    'Reviewed evidence and applied the documented trust response.',
    'open'
  ) ->> 'status',
  'actioned',
  'trust operator resolves through the transactional command'
);

reset role;

select is(
  (
    select resolver_id
    from public.reports
    where id = '52000000-0000-4000-8000-000000000001'
  ),
  '51000000-0000-4000-8000-000000000001'::uuid,
  'report records the authenticated resolver'
);

set local "request.jwt.claim.sub" = '51000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select throws_ok(
  $$ select count(*) from private.admin_operation_events $$,
  '42501',
  'permission denied for table admin_operation_events',
  'authenticated browser cannot read private audit events'
);
select is(
  public.admin_resolve_report(
    '52000000-0000-4000-8000-000000000001',
    'actioned',
    'Reviewed evidence and applied the documented trust response.',
    'open'
  ) ->> 'replayed',
  'true',
  'identical resolution retries are idempotent'
);
select throws_ok(
  $$
    select public.admin_resolve_report(
      '52000000-0000-4000-8000-000000000001',
      'dismissed',
      'Reviewed evidence and applied the documented trust response.',
      'open'
    )
  $$,
  'P0001',
  'Report was already resolved',
  'opposite resolution cannot overwrite a completed decision'
);

reset role;

select is(
  (
    select count(*)
    from private.admin_operation_events
    where target_id = '52000000-0000-4000-8000-000000000001'
      and capability = 'trust.manage'
      and action = 'report.actioned'
  ),
  1::bigint,
  'one append-only admin operation event records the decision'
);
select is(
  (
    select metadata ->> 'reportedTargetType'
    from private.admin_operation_events
    where target_id = '52000000-0000-4000-8000-000000000001'
  ),
  'profile',
  'audit metadata records only classified target evidence'
);

set local "request.jwt.claim.sub" = '51000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select throws_ok(
  $$ select * from public.admin_report_queue(null, null, 25) $$,
  '42501',
  'Trust operations access required',
  'ordinary member cannot read the trust queue'
);
select throws_ok(
  $$
    select public.admin_resolve_report(
      '52000000-0000-4000-8000-000000000001',
      'actioned',
      'Outsider must not resolve this report.',
      'actioned'
    )
  $$,
  '42501',
  'Trust operations access required',
  'ordinary member cannot resolve reports'
);

reset role;

select * from finish();
rollback;
