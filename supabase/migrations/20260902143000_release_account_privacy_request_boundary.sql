-- Account exports and deletion are destructive/privacy-sensitive operations.
-- This migration exposes an auditable request boundary, not an automatic purge.

create table if not exists public.account_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(user_id) on delete cascade,
  request_type text not null check (request_type in ('export', 'deletion')),
  state text not null default 'submitted'
    check (state in ('submitted', 'reviewing', 'blocked', 'ready', 'completed', 'rejected', 'cancelled', 'expired')),
  member_note text,
  client_request_id uuid not null,
  assigned_to uuid references public.profiles(user_id) on delete set null,
  operator_note text,
  artifact_expires_at timestamptz,
  version integer not null default 1 check (version > 0),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  completed_at timestamptz,
  unique (requester_id, client_request_id),
  constraint account_privacy_requests_member_note_check
    check (member_note is null or char_length(member_note) between 1 and 500),
  constraint account_privacy_requests_operator_note_check
    check (operator_note is null or char_length(operator_note) between 8 and 1000),
  constraint account_privacy_requests_artifact_state_check
    check (artifact_expires_at is null or request_type = 'export')
);

create index if not exists account_privacy_requests_requester_created_idx
  on public.account_privacy_requests (requester_id, submitted_at desc, id desc);

create index if not exists account_privacy_requests_operator_queue_idx
  on public.account_privacy_requests (state, submitted_at, id)
  where state in ('submitted', 'reviewing', 'blocked');

create unique index if not exists account_privacy_requests_one_open_kind_idx
  on public.account_privacy_requests (requester_id, request_type)
  where state in ('submitted', 'reviewing', 'blocked', 'ready');

alter table public.account_privacy_requests enable row level security;

drop policy if exists account_privacy_requests_member_select
  on public.account_privacy_requests;
create policy account_privacy_requests_member_select
on public.account_privacy_requests
for select
to authenticated
using ((select auth.uid()) = requester_id);

revoke all on table public.account_privacy_requests from public, anon, authenticated;
grant select on table public.account_privacy_requests to authenticated, service_role;
grant all on table public.account_privacy_requests to service_role;

create or replace function public.request_my_account_privacy_action(
  _request_type text,
  _member_note text,
  _confirmation_text text,
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_note text := nullif(pg_catalog.btrim(coalesce(_member_note, '')), '');
  existing_request public.account_privacy_requests%rowtype;
  created_request public.account_privacy_requests%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if _client_request_id is null or _request_type not in ('export', 'deletion') then
    raise exception 'Privacy request is invalid';
  end if;
  if normalized_note is not null and pg_catalog.char_length(normalized_note) > 500 then
    raise exception 'Privacy request note cannot exceed 500 characters';
  end if;
  if _request_type = 'deletion'
    and pg_catalog.upper(pg_catalog.btrim(coalesce(_confirmation_text, ''))) <> 'DELETE MY ACCOUNT' then
    raise exception 'Type DELETE MY ACCOUNT to request account deletion';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('privacy-request:' || caller_id::text || ':' || _request_type, 0)
  );

  select request.* into existing_request
  from public.account_privacy_requests as request
  where request.requester_id = caller_id
    and request.client_request_id = _client_request_id;
  if found then
    if existing_request.request_type <> _request_type then
      raise exception 'Client request ID was already used for another privacy request';
    end if;
    return pg_catalog.jsonb_build_object(
      'id', existing_request.id,
      'type', existing_request.request_type,
      'state', existing_request.state,
      'version', existing_request.version,
      'replayed', true
    );
  end if;

  if exists (
    select 1
    from public.account_privacy_requests as request
    where request.requester_id = caller_id
      and request.request_type = _request_type
      and request.state in ('submitted', 'reviewing', 'blocked', 'ready')
  ) then
    raise exception 'An open request of this type already exists';
  end if;

  insert into public.account_privacy_requests (
    requester_id, request_type, member_note, client_request_id
  ) values (
    caller_id, _request_type, normalized_note, _client_request_id
  ) returning * into created_request;

  return pg_catalog.jsonb_build_object(
    'id', created_request.id,
    'type', created_request.request_type,
    'state', created_request.state,
    'version', created_request.version,
    'replayed', false
  );
end;
$function$;

create or replace function public.cancel_my_account_privacy_request(
  _request_id uuid,
  _expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  request_row public.account_privacy_requests%rowtype;
begin
  if caller_id is null or _request_id is null or _expected_version < 1 then
    raise exception 'Privacy cancellation is invalid' using errcode = '42501';
  end if;
  select request.* into request_row
  from public.account_privacy_requests as request
  where request.id = _request_id and request.requester_id = caller_id
  for update;
  if not found then
    raise exception 'Privacy request was not found' using errcode = 'P0002';
  end if;
  if request_row.version <> _expected_version then
    raise exception 'Privacy request changed; refresh before cancelling' using errcode = '40001';
  end if;
  if request_row.state not in ('submitted', 'reviewing', 'blocked', 'ready') then
    raise exception 'This privacy request can no longer be cancelled';
  end if;
  update public.account_privacy_requests
  set state = 'cancelled',
      cancelled_at = now(),
      updated_at = now(),
      version = version + 1
  where id = request_row.id
  returning * into request_row;
  return pg_catalog.jsonb_build_object(
    'id', request_row.id,
    'state', request_row.state,
    'version', request_row.version
  );
end;
$function$;

create or replace function public.list_my_account_privacy_requests(_limit integer default 20)
returns table (
  request_id uuid,
  request_type text,
  request_state text,
  member_note text,
  operator_note text,
  version integer,
  submitted_at timestamptz,
  updated_at timestamptz,
  artifact_expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  bounded_limit integer := coalesce(_limit, 20);
begin
  if caller_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if bounded_limit < 1 or bounded_limit > 50 then
    raise exception 'Privacy request limit must be between 1 and 50';
  end if;
  return query
  select
    request.id,
    request.request_type,
    request.state,
    request.member_note,
    request.operator_note,
    request.version,
    request.submitted_at,
    request.updated_at,
    request.artifact_expires_at
  from public.account_privacy_requests as request
  where request.requester_id = caller_id
  order by request.submitted_at desc, request.id desc
  limit bounded_limit;
end;
$function$;

create or replace function public.admin_account_privacy_request_queue(
  _state text default null,
  _limit integer default 50
)
returns table (
  request_id uuid,
  requester_id uuid,
  request_type text,
  request_state text,
  member_note text,
  is_assigned_to_me boolean,
  version integer,
  submitted_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  bounded_limit integer := coalesce(_limit, 50);
begin
  if not private.has_admin_capability(caller_id, 'members.support') then
    raise exception 'Member privacy support access is required' using errcode = '42501';
  end if;
  if _state is not null and _state not in ('submitted', 'reviewing', 'blocked', 'ready', 'completed', 'rejected', 'cancelled', 'expired') then
    raise exception 'Privacy queue state is invalid';
  end if;
  if bounded_limit < 1 or bounded_limit > 100 then
    raise exception 'Privacy queue limit must be between 1 and 100';
  end if;
  return query
  select
    request.id,
    request.requester_id,
    request.request_type,
    request.state,
    request.member_note,
    request.assigned_to = caller_id,
    request.version,
    request.submitted_at,
    request.updated_at
  from public.account_privacy_requests as request
  where _state is null or request.state = _state
  order by
    case request.state when 'submitted' then 0 when 'reviewing' then 1 when 'blocked' then 2 else 3 end,
    request.submitted_at,
    request.id
  limit bounded_limit;
end;
$function$;

create or replace function public.admin_review_account_privacy_request(
  _request_id uuid,
  _next_state text,
  _operator_note text,
  _expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_note text := pg_catalog.btrim(coalesce(_operator_note, ''));
  request_row public.account_privacy_requests%rowtype;
begin
  if not private.has_admin_capability(caller_id, 'members.support') then
    raise exception 'Member privacy support mutation access is required' using errcode = '42501';
  end if;
  if _request_id is null or _expected_version < 1
    or _next_state not in ('reviewing', 'blocked', 'rejected')
    or pg_catalog.char_length(normalized_note) not between 8 and 1000 then
    raise exception 'Privacy review command is invalid';
  end if;
  select request.* into request_row
  from public.account_privacy_requests as request
  where request.id = _request_id
  for update;
  if not found then raise exception 'Privacy request was not found' using errcode = 'P0002'; end if;
  if request_row.version <> _expected_version then
    raise exception 'Privacy request changed; refresh before continuing' using errcode = '40001';
  end if;
  if request_row.state not in ('submitted', 'reviewing', 'blocked') then
    raise exception 'Privacy request is not reviewable';
  end if;
  update public.account_privacy_requests
  set state = _next_state,
      assigned_to = caller_id,
      operator_note = normalized_note,
      updated_at = now(),
      version = version + 1
  where id = request_row.id
  returning * into request_row;

  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id,
    'members.support',
    'members',
    'privacy_request.' || _next_state,
    'account_privacy_request',
    request_row.id,
    normalized_note,
    pg_catalog.jsonb_build_object(
      'requestType', request_row.request_type,
      'requesterId', request_row.requester_id,
      'version', request_row.version
    )
  );
  return pg_catalog.jsonb_build_object(
    'id', request_row.id,
    'state', request_row.state,
    'version', request_row.version,
    'assignedToMe', true
  );
end;
$function$;

revoke all on function public.request_my_account_privacy_action(text, text, text, uuid)
  from public, anon;
revoke all on function public.cancel_my_account_privacy_request(uuid, integer)
  from public, anon;
revoke all on function public.list_my_account_privacy_requests(integer)
  from public, anon;
revoke all on function public.admin_account_privacy_request_queue(text, integer)
  from public, anon;
revoke all on function public.admin_review_account_privacy_request(uuid, text, text, integer)
  from public, anon;

grant execute on function public.request_my_account_privacy_action(text, text, text, uuid)
  to authenticated, service_role;
grant execute on function public.cancel_my_account_privacy_request(uuid, integer)
  to authenticated, service_role;
grant execute on function public.list_my_account_privacy_requests(integer)
  to authenticated, service_role;
grant execute on function public.admin_account_privacy_request_queue(text, integer)
  to authenticated, service_role;
grant execute on function public.admin_review_account_privacy_request(uuid, text, text, integer)
  to authenticated, service_role;

comment on table public.account_privacy_requests is
  'Auditable account export/deletion requests. No browser action performs a purge or claims an export is ready.';
comment on function public.admin_review_account_privacy_request(uuid, text, text, integer) is
  'Privacy-minimised operator review. Browser operators cannot mark exports ready or deletions complete.';
