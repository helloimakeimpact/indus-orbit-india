begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(24);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '31000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'io-api-owner@example.invalid', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '31000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'io-api-analyst@example.invalid', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.io_workspaces (id, slug, name, created_by)
values (
  '32000000-0000-4000-8000-000000000001',
  'io-api-test',
  'I/O API test workspace',
  '31000000-0000-4000-8000-000000000001'
);

insert into public.io_workspace_members (workspace_id, user_id, role, status)
values
  (
    '32000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000001',
    'owner',
    'active'
  ),
  (
    '32000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000002',
    'analyst',
    'active'
  );

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_my_io_test_api_key(uuid,text,text[],timestamptz)',
    'execute'
  ),
  'authenticated callers can enter the owner/admin key-issuance boundary'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_my_io_test_api_key(uuid,text,text[],timestamptz)',
    'execute'
  ),
  'anonymous callers cannot issue API keys'
);

select ok(
  has_function_privilege('authenticated', 'public.revoke_my_io_api_key(uuid)', 'execute'),
  'authenticated callers can enter the owner/admin revocation boundary'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.io_consume_api_key_request(text,text,integer)',
    'execute'
  ),
  'browser users cannot authenticate or meter an API key directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.io_consume_api_key_request(text,text,integer)',
    'execute'
  ),
  'service role can use the API-key authentication boundary'
);

select ok(
  not has_table_privilege('authenticated', 'private.io_api_key_request_windows_v2', 'select'),
  'browser users cannot inspect service rate windows'
);

select ok(
  not has_table_privilege('authenticated', 'private.io_api_key_request_windows_v2', 'insert'),
  'browser users cannot forge service rate windows'
);

select is(
  (select prosecdef from pg_proc where oid = 'public.create_my_io_test_api_key(uuid,text,text[],timestamptz)'::regprocedure),
  true,
  'key issuance is a reviewed security-definer boundary'
);

select is(
  (select proconfig from pg_proc where oid = 'public.create_my_io_test_api_key(uuid,text,text[],timestamptz)'::regprocedure),
  array['search_path=""']::text[],
  'key issuance has an empty search path'
);

create temp table api_key_result (payload jsonb);
grant select, insert on table pg_temp.api_key_result to authenticated;
grant select on table pg_temp.api_key_result to service_role;

set local "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

insert into pg_temp.api_key_result (payload)
select public.create_my_io_test_api_key(
  '32000000-0000-4000-8000-000000000001',
  'CLI test key'
);

select matches(
  (select payload ->> 'rawKey' from pg_temp.api_key_result),
  '^io_test_[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{43}$',
  'raw API key has the documented high-entropy test-key format'
);

select is(
  (select payload ->> 'status' from pg_temp.api_key_result),
  'active',
  'new test API key is active'
);

select is(
  (select jsonb_array_length(payload -> 'scopes') from pg_temp.api_key_result),
  2,
  'default test API key has exactly the model and inference scopes'
);

reset role;

select is(
  (
    select key_hash
    from public.io_api_keys
    where id = ((select payload ->> 'id' from pg_temp.api_key_result))::uuid
  ),
  extensions.digest(
    convert_to((select payload ->> 'rawKey' from pg_temp.api_key_result), 'UTF8'),
    'sha256'
  ),
  'database stores only the SHA-256 key hash'
);

select ok(
  not exists (
    select 1
    from public.io_api_keys
    where row_to_json(io_api_keys)::text like '%' || (select payload ->> 'rawKey' from pg_temp.api_key_result) || '%'
  ),
  'raw API key is not persisted in the API key row'
);

select is(
  (
    select count(*)
    from public.io_audit_events
    where event_type = 'io.api_key.created'
      and workspace_id = '32000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'key issuance writes a content-free audit event'
);

set local "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000002';
set local role authenticated;

select throws_ok(
  $$
    select public.create_my_io_test_api_key(
      '32000000-0000-4000-8000-000000000001',
      'Analyst forged key'
    )
  $$,
  'P0001',
  'Workspace owner or admin role required',
  'analyst cannot issue an API key'
);

reset role;

update public.io_api_keys
set requests_per_minute = 1
where id = ((select payload ->> 'id' from pg_temp.api_key_result))::uuid;

set local role service_role;

select is(
  public.io_consume_api_key_request(
    encode(extensions.digest(convert_to((select payload ->> 'rawKey' from pg_temp.api_key_result), 'UTF8'), 'sha256'), 'hex'),
    'models:read'
  ) ->> 'allowed',
  'true',
  'first scoped API request is allowed atomically'
);

select is(
  public.io_consume_api_key_request(
    encode(extensions.digest(convert_to((select payload ->> 'rawKey' from pg_temp.api_key_result), 'UTF8'), 'sha256'), 'hex'),
    'models:read'
  ) ->> 'allowed',
  'false',
  'request above the key minute limit is rejected'
);

select is(
  (
    select request_count
    from private.io_api_key_request_windows_v2
    where api_key_id = ((select payload ->> 'id' from pg_temp.api_key_result))::uuid
      and period_kind = 'minute'
  ),
  1,
  'rate window never increments past its enforced limit'
);

select is(
  public.io_consume_api_key_request(repeat('0', 64), 'models:read') ->> 'authenticated',
  'false',
  'unknown key hash fails with no identity disclosure'
);

reset role;
set local "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(
  public.revoke_my_io_api_key(((select payload ->> 'id' from pg_temp.api_key_result))::uuid) ->> 'status',
  'revoked',
  'owner can revoke the API key'
);

select is(
  public.revoke_my_io_api_key(((select payload ->> 'id' from pg_temp.api_key_result))::uuid) ->> 'status',
  'revoked',
  'API key revocation is idempotent'
);

select is(
  (
    select count(*)
    from public.io_audit_events
    where event_type = 'io.api_key.revoked'
      and workspace_id = '32000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'idempotent revocation writes exactly one audit event'
);

reset role;
set local role service_role;

select is(
  public.io_consume_api_key_request(
    encode(extensions.digest(convert_to((select payload ->> 'rawKey' from pg_temp.api_key_result), 'UTF8'), 'sha256'), 'hex'),
    'models:read'
  ) ->> 'authenticated',
  'false',
  'revoked key cannot authenticate'
);

select * from finish();
rollback;
