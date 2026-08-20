-- I/O workspace routing consent and API-key production guardrails.
--
-- Provider credentials remain server-only. Workspace members make an explicit
-- choice before a China-resident endpoint can be returned by either the member
-- gateway or the OpenAI-compatible API. API-key request and spend ceilings are
-- versioned on each key and enforced in Postgres before provider dispatch.

create table public.io_workspace_provider_policies (
  workspace_id uuid primary key references public.io_workspaces(id) on delete cascade,
  allow_china_hosted boolean not null default false,
  allow_training_possible boolean not null default false,
  acknowledged_at timestamptz,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_workspace_provider_policies_acknowledgement_check check (
    (
      not allow_china_hosted
      and not allow_training_possible
      and acknowledged_at is null
    )
    or (
      allow_china_hosted
      and allow_training_possible
      and acknowledged_at is not null
    )
  )
);

comment on table public.io_workspace_provider_policies is
  'Workspace routing consent. China-hosted routes remain disabled unless an owner/admin explicitly acknowledges external processing and possible provider training use.';

create index io_workspace_provider_policies_updated_by_idx
  on public.io_workspace_provider_policies (updated_by);

alter table public.io_workspace_provider_policies enable row level security;
revoke all on public.io_workspace_provider_policies from public, anon, authenticated;
grant select on public.io_workspace_provider_policies to authenticated;

create policy "I/O members read workspace provider policy"
on public.io_workspace_provider_policies for select
to authenticated
using ((select private.io_workspace_has_role(workspace_id, null)));

create or replace function public.get_my_io_workspace_provider_policy(_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  policy public.io_workspace_provider_policies%rowtype;
begin
  if caller_id is null or not exists (
    select 1
    from public.io_workspace_members as member
    where member.workspace_id = _workspace_id
      and member.user_id = caller_id
      and member.status = 'active'
  ) then
    raise exception 'Active workspace membership required' using errcode = '42501';
  end if;

  select * into policy
  from public.io_workspace_provider_policies as workspace_policy
  where workspace_policy.workspace_id = _workspace_id;

  return jsonb_build_object(
    'workspaceId', _workspace_id,
    'allowChinaHosted', coalesce(policy.allow_china_hosted, false),
    'allowTrainingPossible', coalesce(policy.allow_training_possible, false),
    'acknowledgedAt', policy.acknowledged_at,
    'updatedAt', policy.updated_at
  );
end;
$function$;

create or replace function public.set_my_io_workspace_provider_policy(
  _workspace_id uuid,
  _allow_china_hosted boolean,
  _allow_training_possible boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  policy public.io_workspace_provider_policies%rowtype;
begin
  if caller_id is null or not exists (
    select 1
    from public.io_workspace_members as member
    where member.workspace_id = _workspace_id
      and member.user_id = caller_id
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  ) then
    raise exception 'Workspace owner or admin role required' using errcode = '42501';
  end if;
  if coalesce(_allow_china_hosted, false) <> coalesce(_allow_training_possible, false) then
    raise exception 'China hosting and possible training acknowledgement must be changed together';
  end if;

  insert into public.io_workspace_provider_policies (
    workspace_id,
    allow_china_hosted,
    allow_training_possible,
    acknowledged_at,
    updated_by,
    updated_at
  ) values (
    _workspace_id,
    coalesce(_allow_china_hosted, false),
    coalesce(_allow_training_possible, false),
    case when coalesce(_allow_china_hosted, false) then statement_timestamp() else null end,
    caller_id,
    statement_timestamp()
  )
  on conflict (workspace_id) do update set
    allow_china_hosted = excluded.allow_china_hosted,
    allow_training_possible = excluded.allow_training_possible,
    acknowledged_at = excluded.acknowledged_at,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at
  returning * into policy;

  insert into public.io_audit_events (
    workspace_id,
    actor_kind,
    actor_user_id,
    event_type,
    payload
  ) values (
    _workspace_id,
    'user',
    caller_id,
    'io.provider_policy.updated',
    jsonb_build_object(
      'allow_china_hosted', policy.allow_china_hosted,
      'allow_training_possible', policy.allow_training_possible
    )
  );

  return jsonb_build_object(
    'workspaceId', policy.workspace_id,
    'allowChinaHosted', policy.allow_china_hosted,
    'allowTrainingPossible', policy.allow_training_possible,
    'acknowledgedAt', policy.acknowledged_at,
    'updatedAt', policy.updated_at
  );
end;
$function$;

create or replace function public.io_get_workspace_provider_policy(_workspace_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'workspaceId', _workspace_id,
    'allowChinaHosted', coalesce(policy.allow_china_hosted, false),
    'allowTrainingPossible', coalesce(policy.allow_training_possible, false),
    'acknowledgedAt', policy.acknowledged_at
  )
  from (values (_workspace_id)) as requested(workspace_id)
  left join public.io_workspace_provider_policies as policy
    on policy.workspace_id = requested.workspace_id;
$function$;

revoke all on function public.get_my_io_workspace_provider_policy(uuid)
  from public, anon;
revoke all on function public.set_my_io_workspace_provider_policy(uuid, boolean, boolean)
  from public, anon;
revoke all on function public.io_get_workspace_provider_policy(uuid)
  from public, anon, authenticated;
grant execute on function public.get_my_io_workspace_provider_policy(uuid)
  to authenticated, service_role;
grant execute on function public.set_my_io_workspace_provider_policy(uuid, boolean, boolean)
  to authenticated, service_role;
grant execute on function public.io_get_workspace_provider_policy(uuid)
  to service_role;

-- Conservative beta defaults. Each issued key receives a durable policy
-- snapshot so later plan changes cannot silently widen an existing key.
alter table public.io_api_keys
  add column limit_policy_version integer not null default 1,
  add column requests_per_minute integer not null default 20,
  add column requests_per_day integer not null default 200,
  add column requests_per_month integer not null default 2000,
  add column spend_currency_code text not null default 'USD',
  add column spend_per_day_nanos bigint not null default 1000000000,
  add column spend_per_month_nanos bigint not null default 10000000000;

alter table public.io_api_keys
  add constraint io_api_keys_limit_policy_version_check check (limit_policy_version > 0),
  add constraint io_api_keys_request_limits_check check (
    requests_per_minute between 1 and 600
    and requests_per_day between requests_per_minute and 1000000
    and requests_per_month between requests_per_day and 10000000
  ),
  add constraint io_api_keys_spend_currency_check check (spend_currency_code ~ '^[A-Z]{3}$'),
  add constraint io_api_keys_spend_limits_check check (
    spend_per_day_nanos between 0 and 1000000000000000
    and spend_per_month_nanos between spend_per_day_nanos and 10000000000000000
  );

comment on column public.io_api_keys.limit_policy_version is
  'Immutable-at-issuance API-key limit policy snapshot version.';
comment on column public.io_api_keys.spend_per_day_nanos is
  'Daily customer-charge ceiling in one-billionth currency units, including the I/O service fee.';
comment on column public.io_api_keys.spend_per_month_nanos is
  'Monthly customer-charge ceiling in one-billionth currency units, including the I/O service fee.';

create table private.io_api_key_request_windows_v2 (
  api_key_id uuid not null references public.io_api_keys(id) on delete cascade,
  period_kind text not null,
  period_started_at timestamptz not null,
  request_count integer not null,
  primary key (api_key_id, period_kind, period_started_at),
  constraint io_api_key_request_windows_v2_kind_check check (
    period_kind in ('minute', 'day', 'month')
  ),
  constraint io_api_key_request_windows_v2_count_check check (
    request_count between 1 and 10000000
  )
);

create table private.io_api_key_spend_windows (
  api_key_id uuid not null references public.io_api_keys(id) on delete cascade,
  period_kind text not null,
  period_started_on date not null,
  currency_code text not null,
  reserved_nanos bigint not null default 0,
  spent_nanos bigint not null default 0,
  primary key (api_key_id, period_kind, period_started_on, currency_code),
  constraint io_api_key_spend_windows_kind_check check (period_kind in ('day', 'month')),
  constraint io_api_key_spend_windows_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_api_key_spend_windows_amounts_check check (
    reserved_nanos >= 0 and spent_nanos >= 0
  )
);

create table private.io_api_key_spend_reservations (
  request_id uuid primary key,
  api_key_id uuid not null references public.io_api_keys(id) on delete cascade,
  currency_code text not null,
  reserved_nanos bigint not null,
  settled_nanos bigint,
  day_started_on date not null,
  month_started_on date not null,
  state text not null default 'reserved',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  constraint io_api_key_spend_reservations_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint io_api_key_spend_reservations_amount_check check (
    reserved_nanos >= 0
    and (settled_nanos is null or settled_nanos between 0 and reserved_nanos)
  ),
  constraint io_api_key_spend_reservations_state_check check (
    state in ('reserved', 'settled', 'released', 'expired')
  ),
  constraint io_api_key_spend_reservations_terminal_check check (
    (state = 'reserved' and settled_nanos is null and settled_at is null)
    or (state <> 'reserved' and settled_nanos is not null and settled_at is not null)
  )
);

create index io_api_key_request_windows_v2_period_idx
  on private.io_api_key_request_windows_v2 (period_kind, period_started_at);
create index io_api_key_spend_reservations_key_state_idx
  on private.io_api_key_spend_reservations (api_key_id, state, expires_at);

alter table private.io_api_key_request_windows_v2 enable row level security;
alter table private.io_api_key_spend_windows enable row level security;
alter table private.io_api_key_spend_reservations enable row level security;
revoke all on private.io_api_key_request_windows_v2 from public, anon, authenticated;
revoke all on private.io_api_key_spend_windows from public, anon, authenticated;
revoke all on private.io_api_key_spend_reservations from public, anon, authenticated;
grant select, insert, update, delete on private.io_api_key_request_windows_v2 to service_role;
grant select, insert, update, delete on private.io_api_key_spend_windows to service_role;
grant select, insert, update, delete on private.io_api_key_spend_reservations to service_role;

create or replace view public.io_api_key_metadata
with (security_invoker = true, security_barrier = true)
as
select
  id,
  workspace_id,
  project_id,
  environment_id,
  name,
  key_prefix,
  last_four,
  hash_algorithm,
  hash_version,
  scopes,
  status,
  created_by,
  expires_at,
  last_used_at,
  revoked_at,
  created_at,
  limit_policy_version,
  requests_per_minute,
  requests_per_day,
  requests_per_month,
  spend_currency_code,
  spend_per_day_nanos,
  spend_per_month_nanos
from public.io_api_keys;

comment on view public.io_api_key_metadata is
  'RLS-protected browser-safe API-key metadata and its enforced limit snapshot. The key_hash column is deliberately absent.';

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
as $function$
declare
  actor_id uuid := (select auth.uid());
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
    from public.io_workspace_members as membership
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
  ) values (
    _workspace_id,
    normalized_name,
    'io_test_' || lookup_part,
    right(secret_part, 4),
    extensions.digest(convert_to(raw_key, 'UTF8'), 'sha256'),
    normalized_scopes,
    actor_id,
    _expires_at
  ) returning * into inserted;

  insert into public.io_audit_events (
    workspace_id,
    actor_kind,
    actor_user_id,
    event_type,
    payload
  ) values (
    _workspace_id,
    'user',
    actor_id,
    'io.api_key.created',
    jsonb_build_object(
      'api_key_id', inserted.id,
      'key_prefix', inserted.key_prefix,
      'scopes', inserted.scopes,
      'expires_at', inserted.expires_at,
      'limit_policy_version', inserted.limit_policy_version
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
    'rawKey', raw_key,
    'limitPolicyVersion', inserted.limit_policy_version,
    'requestsPerMinute', inserted.requests_per_minute,
    'requestsPerDay', inserted.requests_per_day,
    'requestsPerMonth', inserted.requests_per_month,
    'spendCurrencyCode', inserted.spend_currency_code,
    'spendPerDayNanos', inserted.spend_per_day_nanos::text,
    'spendPerMonthNanos', inserted.spend_per_month_nanos::text
  );
end;
$function$;

create or replace function public.io_consume_api_key_request(
  _key_hash_hex text,
  _required_scope text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target public.io_api_keys%rowtype;
  minute_start timestamptz := date_trunc('minute', statement_timestamp());
  day_start timestamptz := date_trunc('day', statement_timestamp() at time zone 'UTC') at time zone 'UTC';
  month_start timestamptz := date_trunc('month', statement_timestamp() at time zone 'UTC') at time zone 'UTC';
  minute_count integer := 0;
  day_count integer := 0;
  month_count integer := 0;
  retry_after integer;
begin
  if _key_hash_hex is null or _key_hash_hex !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('authenticated', false, 'allowed', false);
  end if;
  if _required_scope not in (
    'inference:invoke', 'models:read', 'usage:read', 'sessions:read', 'sessions:write'
  ) then
    raise exception 'Unsupported API key scope';
  end if;

  select * into target
  from public.io_api_keys as api_key
  where api_key.key_hash = decode(_key_hash_hex, 'hex')
  for update;

  if target.id is null then
    return jsonb_build_object('authenticated', false, 'allowed', false);
  end if;
  if target.status = 'active'
     and target.expires_at is not null
     and target.expires_at <= statement_timestamp() then
    update public.io_api_keys set status = 'expired' where id = target.id;
    target.status := 'expired';
  end if;
  if target.status <> 'active'
     or not (_required_scope = any(target.scopes))
     or not exists (
       select 1
       from public.io_workspace_members as membership
       where membership.workspace_id = target.workspace_id
         and membership.user_id = target.created_by
         and membership.status = 'active'
     ) then
    return jsonb_build_object('authenticated', false, 'allowed', false);
  end if;

  delete from private.io_api_key_request_windows_v2
  where api_key_id = target.id
    and (
      (period_kind = 'minute' and period_started_at < minute_start - interval '2 hours')
      or (period_kind = 'day' and period_started_at < day_start - interval '2 days')
      or (period_kind = 'month' and period_started_at < month_start - interval '40 days')
    );

  select
    coalesce(max(request_count) filter (
      where period_kind = 'minute' and period_started_at = minute_start
    ), 0),
    coalesce(max(request_count) filter (
      where period_kind = 'day' and period_started_at = day_start
    ), 0),
    coalesce(max(request_count) filter (
      where period_kind = 'month' and period_started_at = month_start
    ), 0)
  into minute_count, day_count, month_count
  from private.io_api_key_request_windows_v2
  where api_key_id = target.id;

  if minute_count >= target.requests_per_minute then
    retry_after := greatest(1, extract(epoch from (minute_start + interval '1 minute' - statement_timestamp()))::integer);
    return jsonb_build_object(
      'authenticated', true, 'allowed', false, 'limitType', 'minute',
      'retryAfterSeconds', retry_after
    );
  end if;
  if day_count >= target.requests_per_day then
    retry_after := greatest(1, extract(epoch from (day_start + interval '1 day' - statement_timestamp()))::integer);
    return jsonb_build_object(
      'authenticated', true, 'allowed', false, 'limitType', 'day',
      'retryAfterSeconds', retry_after
    );
  end if;
  if month_count >= target.requests_per_month then
    retry_after := greatest(1, extract(epoch from (month_start + interval '1 month' - statement_timestamp()))::integer);
    return jsonb_build_object(
      'authenticated', true, 'allowed', false, 'limitType', 'month',
      'retryAfterSeconds', retry_after
    );
  end if;

  insert into private.io_api_key_request_windows_v2 (
    api_key_id, period_kind, period_started_at, request_count
  ) values
    (target.id, 'minute', minute_start, 1),
    (target.id, 'day', day_start, 1),
    (target.id, 'month', month_start, 1)
  on conflict (api_key_id, period_kind, period_started_at)
  do update set request_count = private.io_api_key_request_windows_v2.request_count + 1;

  minute_count := minute_count + 1;
  day_count := day_count + 1;
  month_count := month_count + 1;
  update public.io_api_keys set last_used_at = statement_timestamp() where id = target.id;

  return jsonb_build_object(
    'authenticated', true,
    'allowed', true,
    'apiKeyId', target.id,
    'workspaceId', target.workspace_id,
    'actorUserId', target.created_by,
    'scopes', target.scopes,
    'limit', target.requests_per_minute,
    'remaining', greatest(0, target.requests_per_minute - minute_count),
    'resetAt', minute_start + interval '1 minute',
    'requestLimits', jsonb_build_object(
      'minute', jsonb_build_object(
        'limit', target.requests_per_minute,
        'remaining', greatest(0, target.requests_per_minute - minute_count),
        'resetAt', minute_start + interval '1 minute'
      ),
      'day', jsonb_build_object(
        'limit', target.requests_per_day,
        'remaining', greatest(0, target.requests_per_day - day_count),
        'resetAt', day_start + interval '1 day'
      ),
      'month', jsonb_build_object(
        'limit', target.requests_per_month,
        'remaining', greatest(0, target.requests_per_month - month_count),
        'resetAt', month_start + interval '1 month'
      )
    ),
    'spendLimits', jsonb_build_object(
      'currencyCode', target.spend_currency_code,
      'dayNanos', target.spend_per_day_nanos::text,
      'monthNanos', target.spend_per_month_nanos::text
    )
  );
end;
$function$;

-- Retain the old signature for deployed callers, but never let an environment
-- variable widen the immutable per-key policy snapshot.
create or replace function public.io_consume_api_key_request(
  _key_hash_hex text,
  _required_scope text,
  _limit integer
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select public.io_consume_api_key_request(_key_hash_hex, _required_scope);
$function$;

revoke all on function public.io_consume_api_key_request(text, text)
  from public, anon, authenticated;
revoke all on function public.io_consume_api_key_request(text, text, integer)
  from public, anon, authenticated;
grant execute on function public.io_consume_api_key_request(text, text) to service_role;
grant execute on function public.io_consume_api_key_request(text, text, integer) to service_role;

create or replace function private.io_expire_api_key_spend_reservations(_api_key_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  stale private.io_api_key_spend_reservations%rowtype;
  expired_count integer := 0;
begin
  for stale in
    select *
    from private.io_api_key_spend_reservations as reservation
    where reservation.api_key_id = _api_key_id
      and reservation.state = 'reserved'
      and reservation.expires_at <= statement_timestamp()
    order by reservation.created_at, reservation.request_id
    for update
  loop
    update private.io_api_key_spend_windows
    set reserved_nanos = reserved_nanos - stale.reserved_nanos
    where api_key_id = stale.api_key_id
      and currency_code = stale.currency_code
      and (
        (period_kind = 'day' and period_started_on = stale.day_started_on)
        or (period_kind = 'month' and period_started_on = stale.month_started_on)
      );

    update private.io_api_key_spend_reservations
    set state = 'expired', settled_nanos = 0, settled_at = statement_timestamp()
    where request_id = stale.request_id;
    expired_count := expired_count + 1;
  end loop;
  return expired_count;
end;
$function$;

revoke all on function private.io_expire_api_key_spend_reservations(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.io_reserve_api_key_spend(
  _request_id uuid,
  _api_key_id uuid,
  _currency_code text,
  _reserve_nanos bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target public.io_api_keys%rowtype;
  existing private.io_api_key_spend_reservations%rowtype;
  normalized_currency text := upper(btrim(coalesce(_currency_code, '')));
  day_start date := (statement_timestamp() at time zone 'UTC')::date;
  month_start date := date_trunc('month', statement_timestamp() at time zone 'UTC')::date;
  day_reserved bigint := 0;
  day_spent bigint := 0;
  month_reserved bigint := 0;
  month_spent bigint := 0;
begin
  if _request_id is null or _api_key_id is null or _reserve_nanos is null or _reserve_nanos < 0 then
    raise exception 'Invalid API key spend reservation';
  end if;
  if normalized_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid API key spend currency';
  end if;

  select * into target
  from public.io_api_keys as api_key
  where api_key.id = _api_key_id
  for update;
  if target.id is null
     or target.status <> 'active'
     or not ('inference:invoke' = any(target.scopes)) then
    raise exception 'API key is not active for inference';
  end if;
  if target.spend_currency_code <> normalized_currency then
    raise exception 'API key spend currency does not match the route currency';
  end if;

  perform private.io_expire_api_key_spend_reservations(target.id);

  select * into existing
  from private.io_api_key_spend_reservations as reservation
  where reservation.request_id = _request_id;
  if found then
    if existing.api_key_id <> _api_key_id
       or existing.currency_code <> normalized_currency
       or existing.reserved_nanos <> _reserve_nanos then
      raise exception 'API key spend reservation belongs to a different request';
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'state', existing.state,
      'reservedNanos', existing.reserved_nanos::text
    );
  end if;

  select reserved_nanos, spent_nanos into day_reserved, day_spent
  from private.io_api_key_spend_windows
  where api_key_id = target.id
    and period_kind = 'day'
    and period_started_on = day_start
    and currency_code = normalized_currency;
  if not found then day_reserved := 0; day_spent := 0; end if;

  select reserved_nanos, spent_nanos into month_reserved, month_spent
  from private.io_api_key_spend_windows
  where api_key_id = target.id
    and period_kind = 'month'
    and period_started_on = month_start
    and currency_code = normalized_currency;
  if not found then month_reserved := 0; month_spent := 0; end if;

  if day_reserved + day_spent + _reserve_nanos > target.spend_per_day_nanos then
    raise exception 'API key daily spend limit would be exceeded';
  end if;
  if month_reserved + month_spent + _reserve_nanos > target.spend_per_month_nanos then
    raise exception 'API key monthly spend limit would be exceeded';
  end if;

  insert into private.io_api_key_spend_windows (
    api_key_id, period_kind, period_started_on, currency_code, reserved_nanos, spent_nanos
  ) values
    (target.id, 'day', day_start, normalized_currency, _reserve_nanos, 0),
    (target.id, 'month', month_start, normalized_currency, _reserve_nanos, 0)
  on conflict (api_key_id, period_kind, period_started_on, currency_code)
  do update set reserved_nanos = private.io_api_key_spend_windows.reserved_nanos + excluded.reserved_nanos;

  insert into private.io_api_key_spend_reservations (
    request_id,
    api_key_id,
    currency_code,
    reserved_nanos,
    day_started_on,
    month_started_on,
    expires_at
  ) values (
    _request_id,
    target.id,
    normalized_currency,
    _reserve_nanos,
    day_start,
    month_start,
    statement_timestamp() + interval '10 minutes'
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'state', 'reserved',
    'reservedNanos', _reserve_nanos::text,
    'dayRemainingNanos', (target.spend_per_day_nanos - day_reserved - day_spent - _reserve_nanos)::text,
    'monthRemainingNanos', (target.spend_per_month_nanos - month_reserved - month_spent - _reserve_nanos)::text
  );
end;
$function$;

revoke all on function private.io_reserve_api_key_spend(uuid, uuid, text, bigint)
  from public, anon, authenticated, service_role;

create or replace function public.io_begin_api_key_route_request(
  _workspace_id uuid,
  _actor_user_id uuid,
  _idempotency_key text,
  _request_fingerprint text,
  _request_id uuid,
  _endpoint_id uuid,
  _currency_code text,
  _reserve_minor bigint,
  _api_key_id uuid,
  _reserve_customer_nanos bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  result jsonb;
begin
  if not exists (
    select 1
    from public.io_api_keys as api_key
    where api_key.id = _api_key_id
      and api_key.workspace_id = _workspace_id
      and api_key.created_by = _actor_user_id
  ) then
    raise exception 'API key route scope does not match the request';
  end if;

  result := public.io_begin_route_request(
    _workspace_id,
    _actor_user_id,
    _idempotency_key,
    _request_fingerprint,
    _request_id,
    _endpoint_id,
    _currency_code,
    _reserve_minor
  );

  if coalesce((result ->> 'replayed')::boolean, false) then
    return result;
  end if;

  perform private.io_reserve_api_key_spend(
    _request_id,
    _api_key_id,
    _currency_code,
    _reserve_customer_nanos
  );
  return result || jsonb_build_object('apiKeySpendReservedNanos', _reserve_customer_nanos::text);
end;
$function$;

revoke all on function public.io_begin_api_key_route_request(
  uuid, uuid, text, text, uuid, uuid, text, bigint, uuid, bigint
) from public, anon, authenticated;
grant execute on function public.io_begin_api_key_route_request(
  uuid, uuid, text, text, uuid, uuid, text, bigint, uuid, bigint
) to service_role;

create or replace function public.io_finalize_api_key_priced_route_request(
  _request_id uuid,
  _api_key_id uuid,
  _result_state text,
  _route_strategy text,
  _selection jsonb,
  _attempts jsonb,
  _candidate_count integer,
  _fallback_count integer,
  _estimated_cost_nanos bigint,
  _currency_code text,
  _input_tokens integer,
  _output_tokens integer,
  _customer_charge_minor bigint,
  _provider_cost_nanos bigint,
  _service_fee_nanos bigint,
  _customer_charge_nanos bigint,
  _service_fee_policy_version integer,
  _service_fee_basis_points integer,
  _policy_snapshot jsonb,
  _candidate_summary jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  spend_reservation private.io_api_key_spend_reservations%rowtype;
  result jsonb;
  final_spend_nanos bigint := case
    when _result_state = 'completed' then _customer_charge_nanos
    else 0
  end;
begin
  select * into spend_reservation
  from private.io_api_key_spend_reservations as reservation
  where reservation.request_id = _request_id
    and reservation.api_key_id = _api_key_id
  for update;
  if spend_reservation.request_id is null then
    raise exception 'API key spend reservation does not exist';
  end if;

  result := public.io_finalize_priced_route_request(
    _request_id,
    _result_state,
    _route_strategy,
    _selection,
    _attempts,
    _candidate_count,
    _fallback_count,
    _estimated_cost_nanos,
    _currency_code,
    _input_tokens,
    _output_tokens,
    _customer_charge_minor,
    _provider_cost_nanos,
    _service_fee_nanos,
    _customer_charge_nanos,
    _service_fee_policy_version,
    _service_fee_basis_points,
    _policy_snapshot,
    _candidate_summary
  );

  if spend_reservation.state = 'reserved' then
    if final_spend_nanos > spend_reservation.reserved_nanos then
      raise exception 'API key settled spend exceeds its reservation';
    end if;

    update private.io_api_key_spend_windows
    set
      reserved_nanos = reserved_nanos - spend_reservation.reserved_nanos,
      spent_nanos = spent_nanos + final_spend_nanos
    where api_key_id = spend_reservation.api_key_id
      and currency_code = spend_reservation.currency_code
      and (
        (period_kind = 'day' and period_started_on = spend_reservation.day_started_on)
        or (period_kind = 'month' and period_started_on = spend_reservation.month_started_on)
      );

    update private.io_api_key_spend_reservations
    set
      state = case when _result_state = 'completed' then 'settled' else 'released' end,
      settled_nanos = final_spend_nanos,
      settled_at = statement_timestamp()
    where request_id = _request_id;
  end if;

  return result || jsonb_build_object(
    'apiKeyId', _api_key_id,
    'apiKeySettledNanos', final_spend_nanos::text
  );
end;
$function$;

revoke all on function public.io_finalize_api_key_priced_route_request(
  uuid, uuid, text, text, jsonb, jsonb, integer, integer, bigint, text, integer,
  integer, bigint, bigint, bigint, bigint, integer, integer, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.io_finalize_api_key_priced_route_request(
  uuid, uuid, text, text, jsonb, jsonb, integer, integer, bigint, text, integer,
  integer, bigint, bigint, bigint, bigint, integer, integer, jsonb, jsonb
) to service_role;

comment on function public.io_begin_api_key_route_request(
  uuid, uuid, text, text, uuid, uuid, text, bigint, uuid, bigint
) is 'Atomically reserves both the workspace hard budget and the API-key day/month customer-charge ceilings before provider dispatch.';
comment on function public.io_finalize_api_key_priced_route_request(
  uuid, uuid, text, text, jsonb, jsonb, integer, integer, bigint, text, integer,
  integer, bigint, bigint, bigint, bigint, integer, integer, jsonb, jsonb
) is 'Atomically settles/releases the workspace and API-key spend reservations with the exact provider cost plus I/O fee.';
