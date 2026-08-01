begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(26);

select has_function(
  'public',
  'redeem_vouch_code',
  array['text'],
  'code redemption RPC exists'
);
select has_function(
  'public',
  'vouch_directly',
  array['uuid'],
  'direct vouch RPC exists'
);

select ok(
  (
    select proc.prosecdef
    from pg_catalog.pg_proc as proc
    where proc.oid = 'public.redeem_vouch_code(text)'::regprocedure
  ) and (
    select proc.prosecdef
    from pg_catalog.pg_proc as proc
    where proc.oid = 'public.vouch_directly(uuid)'::regprocedure
  ),
  'both vouch RPCs retain required definer execution'
);
select ok(
  (
    select pg_catalog.bool_and(
      pg_catalog.replace(
        pg_catalog.split_part(setting, '=', 2),
        '"',
        ''
      ) = ''
    )
    from pg_catalog.pg_proc as proc
    cross join lateral pg_catalog.unnest(proc.proconfig) as setting
    where proc.oid in (
      'public.redeem_vouch_code(text)'::regprocedure,
      'public.vouch_directly(uuid)'::regprocedure
    )
      and pg_catalog.split_part(setting, '=', 1) = 'search_path'
  ),
  'both vouch RPCs use an empty search path'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.redeem_vouch_code(text)',
    'EXECUTE'
  ),
  'authenticated may redeem a vouch code'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.redeem_vouch_code(text)',
    'EXECUTE'
  ),
  'anonymous users cannot redeem a vouch code'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.vouch_directly(uuid)',
    'EXECUTE'
  ),
  'authenticated may vouch directly'
);
select ok(
  not has_function_privilege('anon', 'public.vouch_directly(uuid)', 'EXECUTE'),
  'anonymous users cannot vouch directly'
);
select ok(
  pg_catalog.strpos(
    pg_catalog.lower(
      pg_catalog.pg_get_functiondef(
        'public.redeem_vouch_code(text)'::regprocedure
      )
    ),
    'for update'
  ) > 0,
  'code redemption serialises the single-use code row'
);
select ok(
  pg_catalog.strpos(
    pg_catalog.lower(
      pg_catalog.pg_get_functiondef('public.vouch_directly(uuid)'::regprocedure)
    ),
    'pg_advisory_xact_lock'
  ) > 0,
  'direct vouch serialises issuer quota use'
);

select throws_ok(
  $$select public.redeem_vouch_code('ABCDEF')$$,
  'P0001',
  'Unauthorized',
  'code redemption requires an authenticated caller'
);
select throws_ok(
  $$select public.vouch_directly('10000000-0000-4000-8000-000000000002'::uuid)$$,
  'P0001',
  'Unauthorized',
  'direct vouch requires an authenticated caller'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '10000000-0000-4000-8000-000000000011'::uuid,
    'vouch-issuer@example.test',
    '{"display_name":"Vouch Issuer"}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000012'::uuid,
    'direct-recipient@example.test',
    '{"display_name":"Direct Recipient"}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000013'::uuid,
    'code-redeemer@example.test',
    '{"display_name":"Code Redeemer"}'::jsonb
  );

insert into public.user_roles (user_id, role)
values (
  '10000000-0000-4000-8000-000000000011'::uuid,
  'admin'::public.app_role
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000011';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  public.vouch_directly(
    '10000000-0000-4000-8000-000000000012'::uuid
  ),
  '{"ok":true,"alreadyVerified":false}'::jsonb,
  'admin member can directly vouch for an unverified recipient'
);
select is(
  pg_catalog.current_setting('request.jwt.claim.role', true),
  'authenticated',
  'direct vouch restores the caller request role'
);

reset role;

select ok(
  (
    select profile.is_verified
      and profile.verified_by = '10000000-0000-4000-8000-000000000011'::uuid
    from public.profiles as profile
    where profile.user_id = '10000000-0000-4000-8000-000000000012'::uuid
  ),
  'direct vouch verifies the recipient with issuer provenance'
);
select results_eq(
  $$
    select audit.target_id
    from public.audit_log as audit
    where audit.action = 'vouch.direct'
  $$,
  array['10000000-0000-4000-8000-000000000012'::uuid],
  'direct vouch records a UUID audit target'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.vouch_events as event
    where event.issuer_id = '10000000-0000-4000-8000-000000000011'::uuid
      and event.recipient_id = '10000000-0000-4000-8000-000000000012'::uuid
      and event.channel = 'direct'
  $$,
  array[1::bigint],
  'direct vouch appends one ledger event'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.notifications as notification
    where notification.user_id = '10000000-0000-4000-8000-000000000012'::uuid
      and notification.type = 'vouch_direct'
  $$,
  array[1::bigint],
  'direct vouch notifies the recipient'
);

insert into public.vouch_codes (
  id,
  code,
  issuer_id,
  expires_at,
  status
) values (
  '20000000-0000-4000-8000-000000000011'::uuid,
  'VERIFY42',
  '10000000-0000-4000-8000-000000000011'::uuid,
  pg_catalog.now() + interval '1 day',
  'active'
);
insert into public.vouch_events (issuer_id, channel, code_id)
values (
  '10000000-0000-4000-8000-000000000011'::uuid,
  'code',
  '20000000-0000-4000-8000-000000000011'::uuid
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000013';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  public.redeem_vouch_code(' verify42 '),
  '{"ok":true}'::jsonb,
  'member redeems a normalized active vouch code'
);
select is(
  pg_catalog.current_setting('request.jwt.claim.role', true),
  'authenticated',
  'code redemption restores the caller request role'
);

reset role;

select ok(
  (
    select code.status = 'redeemed'
      and code.redeemer_id = '10000000-0000-4000-8000-000000000013'::uuid
      and code.redeemed_at is not null
    from public.vouch_codes as code
    where code.id = '20000000-0000-4000-8000-000000000011'::uuid
  ),
  'code redemption atomically seals the code to the redeemer'
);
select ok(
  (
    select profile.is_verified
      and profile.verified_by = '10000000-0000-4000-8000-000000000011'::uuid
    from public.profiles as profile
    where profile.user_id = '10000000-0000-4000-8000-000000000013'::uuid
  ),
  'code redemption verifies the member with issuer provenance'
);
select results_eq(
  $$
    select event.recipient_id
    from public.vouch_events as event
    where event.code_id = '20000000-0000-4000-8000-000000000011'::uuid
  $$,
  array['10000000-0000-4000-8000-000000000013'::uuid],
  'code redemption assigns the ledger event recipient'
);
select results_eq(
  $$
    select audit.target_id
    from public.audit_log as audit
    where audit.action = 'vouch.code_redeemed'
  $$,
  array['20000000-0000-4000-8000-000000000011'::uuid],
  'code redemption records a UUID audit target'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.notifications as notification
    where notification.user_id = '10000000-0000-4000-8000-000000000011'::uuid
      and notification.type = 'vouch_code_redeemed'
  $$,
  array[1::bigint],
  'code redemption notifies the issuer'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000013';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  $$select public.redeem_vouch_code('VERIFY42')$$,
  'P0001',
  'Code is redeemed.',
  'a redeemed code cannot be replayed'
);

reset role;

select * from finish();

rollback;
