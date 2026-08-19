-- Version matches the hosted Indus Orbit project migration ledger.
-- Safe public I/O API foundation: one-time test-key issuance, revocation, and
-- an atomic per-key request window. Provider credentials remain server-only.

create table private.io_api_key_rate_windows (
  api_key_id uuid not null references public.io_api_keys(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null,
  primary key (api_key_id, window_started_at),
  constraint io_api_key_rate_windows_count_check check (request_count between 1 and 600)
);

comment on table private.io_api_key_rate_windows is
  'Service-only fixed-minute counters for I/O API keys. No prompt or response content is stored.';

alter table private.io_api_key_rate_windows enable row level security;
revoke all on private.io_api_key_rate_windows from public, anon, authenticated;
grant select, insert, update, delete on private.io_api_key_rate_windows to service_role;

create or replace function public.create_my_io_test_api_key(
  _workspace_id uuid,
  _name text,
  _scopes text[] default array['models:read', 'inference:invoke']::text[],
  _expires_at timestamptz default now() + interval '30 days'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_name text := btrim(_name);
  normalized_scopes text[];
  lookup_part text;
  secret_part text;
  raw_key text;
  inserted public.io_api_keys;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.io_workspace_members membership
    where membership.workspace_id = _workspace_id
      and membership.user_id = actor_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  ) then
    raise exception 'Workspace owner or admin role required';
  end if;

  if char_length(normalized_name) not between 2 and 120 then
    raise exception 'API key name must contain between 2 and 120 characters';
  end if;

  select coalesce(array_agg(distinct scope order by scope), '{}'::text[])
    into normalized_scopes
  from unnest(coalesce(_scopes, '{}'::text[])) as scope;

  if cardinality(normalized_scopes) not between 1 and 5
     or not normalized_scopes <@ array[
       'inference:invoke', 'models:read', 'usage:read', 'sessions:read', 'sessions:write'
     ]::text[] then
    raise exception 'Unsupported API key scope';
  end if;

  if _expires_at is null
     or _expires_at <= statement_timestamp()
     or _expires_at > statement_timestamp() + interval '90 days' then
    raise exception 'Test API keys must expire within 90 days';
  end if;

  lookup_part := translate(rtrim(encode(extensions.gen_random_bytes(12), 'base64'), '='), '+/', '-_');
  secret_part := translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
  raw_key := 'io_test_' || lookup_part || '.' || secret_part;

  insert into public.io_api_keys (
    workspace_id,
    name,
    key_prefix,
    last_four,
    key_hash,
    scopes,
    created_by,
    expires_at
  )
  values (
    _workspace_id,
    normalized_name,
    'io_test_' || lookup_part,
    right(secret_part, 4),
    extensions.digest(convert_to(raw_key, 'UTF8'), 'sha256'),
    normalized_scopes,
    actor_id,
    _expires_at
  )
  returning * into inserted;

  insert into public.io_audit_events (
    workspace_id,
    actor_kind,
    actor_user_id,
    event_type,
    payload
  )
  values (
    _workspace_id,
    'user',
    actor_id,
    'io.api_key.created',
    jsonb_build_object(
      'api_key_id', inserted.id,
      'key_prefix', inserted.key_prefix,
      'scopes', inserted.scopes,
      'expires_at', inserted.expires_at
    )
  );

  return jsonb_build_object(
    'id', inserted.id,
    'workspaceId', inserted.workspace_id,
    'name', inserted.name,
    'keyPrefix', inserted.key_prefix,
    'lastFour', inserted.last_four,
    'scopes', inserted.scopes,
    'status', inserted.status,
    'expiresAt', inserted.expires_at,
    'createdAt', inserted.created_at,
    'rawKey', raw_key
  );
end;
$$;

create or replace function public.revoke_my_io_api_key(_key_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target public.io_api_keys;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  select * into target
  from public.io_api_keys api_key
  where api_key.id = _key_id;

  if target.id is null or not exists (
    select 1
    from public.io_workspace_members membership
    where membership.workspace_id = target.workspace_id
      and membership.user_id = actor_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  ) then
    raise exception 'API key not found';
  end if;

  if target.status <> 'revoked' then
    update public.io_api_keys
    set status = 'revoked', revoked_at = statement_timestamp()
    where id = target.id
    returning * into target;

    insert into public.io_audit_events (
      workspace_id,
      actor_kind,
      actor_user_id,
      event_type,
      payload
    )
    values (
      target.workspace_id,
      'user',
      actor_id,
      'io.api_key.revoked',
      jsonb_build_object('api_key_id', target.id, 'key_prefix', target.key_prefix)
    );
  end if;

  return jsonb_build_object(
    'id', target.id,
    'status', target.status,
    'revokedAt', target.revoked_at
  );
end;
$$;

create or replace function public.io_consume_api_key_request(
  _key_hash_hex text,
  _required_scope text,
  _limit integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.io_api_keys;
  window_start timestamptz := date_trunc('minute', statement_timestamp());
  next_count integer;
  retry_after integer := greatest(
    1,
    extract(epoch from (date_trunc('minute', statement_timestamp()) + interval '1 minute' - statement_timestamp()))::integer
  );
begin
  if _key_hash_hex is null or _key_hash_hex !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('authenticated', false, 'allowed', false);
  end if;

  if _required_scope not in (
    'inference:invoke', 'models:read', 'usage:read', 'sessions:read', 'sessions:write'
  ) then
    raise exception 'Unsupported API key scope';
  end if;

  if _limit not between 1 and 600 then
    raise exception 'API key request limit must be between 1 and 600';
  end if;

  select * into target
  from public.io_api_keys api_key
  where api_key.key_hash = decode(_key_hash_hex, 'hex')
  for update;

  if target.id is null then
    return jsonb_build_object('authenticated', false, 'allowed', false);
  end if;

  if target.status = 'active'
     and target.expires_at is not null
     and target.expires_at <= statement_timestamp() then
    update public.io_api_keys
    set status = 'expired'
    where id = target.id;
    target.status := 'expired';
  end if;

  if target.status <> 'active'
     or not (_required_scope = any(target.scopes))
     or not exists (
       select 1
       from public.io_workspace_members membership
       where membership.workspace_id = target.workspace_id
         and membership.user_id = target.created_by
         and membership.status = 'active'
     ) then
    return jsonb_build_object('authenticated', false, 'allowed', false);
  end if;

  delete from private.io_api_key_rate_windows
  where api_key_id = target.id
    and window_started_at < window_start - interval '2 days';

  insert into private.io_api_key_rate_windows (api_key_id, window_started_at, request_count)
  values (target.id, window_start, 1)
  on conflict (api_key_id, window_started_at)
  do update set request_count = private.io_api_key_rate_windows.request_count + 1
  where private.io_api_key_rate_windows.request_count < _limit
  returning request_count into next_count;

  if next_count is null then
    return jsonb_build_object(
      'authenticated', true,
      'allowed', false,
      'retryAfterSeconds', retry_after
    );
  end if;

  update public.io_api_keys
  set last_used_at = statement_timestamp()
  where id = target.id;

  return jsonb_build_object(
    'authenticated', true,
    'allowed', true,
    'apiKeyId', target.id,
    'workspaceId', target.workspace_id,
    'actorUserId', target.created_by,
    'scopes', target.scopes,
    'limit', _limit,
    'remaining', greatest(0, _limit - next_count),
    'resetAt', window_start + interval '1 minute'
  );
end;
$$;

revoke all on function public.create_my_io_test_api_key(uuid, text, text[], timestamptz) from public, anon;
revoke all on function public.revoke_my_io_api_key(uuid) from public, anon;
revoke all on function public.io_consume_api_key_request(text, text, integer) from public, anon, authenticated;

grant execute on function public.create_my_io_test_api_key(uuid, text, text[], timestamptz) to authenticated;
grant execute on function public.revoke_my_io_api_key(uuid) to authenticated;
grant execute on function public.io_consume_api_key_request(text, text, integer) to service_role;

comment on function public.create_my_io_test_api_key(uuid, text, text[], timestamptz) is
  'Creates an expiring test key for a workspace owner/admin. The raw key is returned once and never stored.';
comment on function public.revoke_my_io_api_key(uuid) is
  'Revokes a workspace API key through an owner/admin authorization boundary.';
comment on function public.io_consume_api_key_request(text, text, integer) is
  'Service-only API-key authentication, scope enforcement, and atomic fixed-minute rate limiting.';
