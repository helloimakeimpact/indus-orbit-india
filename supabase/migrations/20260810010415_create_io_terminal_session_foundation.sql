-- Durable, privacy-bounded I/O Terminal metadata.
--
-- Local prompts, responses, shell output, file contents, repository paths,
-- environment variables and OpenCode passwords remain on the member device.
-- The cloud control plane stores only session lifecycle metadata and hashes of
-- the local connector/runtime references.

create table public.io_terminal_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  mode text not null,
  execution_location text not null default 'local',
  connector_kind text not null default 'opencode',
  connector_origin_hash text not null,
  runtime_reference_hash text not null,
  runtime_version text,
  state text not null default 'running',
  last_event_sequence bigint not null default 0,
  parent_session_id uuid references public.io_terminal_sessions(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_terminal_sessions_title_check check (
    char_length(btrim(title)) between 3 and 160
  ),
  constraint io_terminal_sessions_mode_check check (mode in ('observe', 'plan', 'build', 'run')),
  constraint io_terminal_sessions_location_check check (execution_location in ('local', 'hosted')),
  constraint io_terminal_sessions_connector_check check (connector_kind in ('opencode')),
  constraint io_terminal_sessions_origin_hash_check check (connector_origin_hash ~ '^[a-f0-9]{64}$'),
  constraint io_terminal_sessions_runtime_hash_check check (runtime_reference_hash ~ '^[a-f0-9]{64}$'),
  constraint io_terminal_sessions_runtime_version_check check (
    runtime_version is null or char_length(runtime_version) between 1 and 64
  ),
  constraint io_terminal_sessions_state_check check (
    state in ('running', 'completed', 'failed', 'stopped', 'archived')
  ),
  constraint io_terminal_sessions_sequence_check check (last_event_sequence >= 0),
  constraint io_terminal_sessions_completion_check check (
    (state = 'running' and completed_at is null)
    or (state in ('completed', 'failed', 'stopped', 'archived') and completed_at is not null)
  )
);

create index io_terminal_sessions_workspace_time_idx
  on public.io_terminal_sessions (workspace_id, created_at desc, id desc);
create index io_terminal_sessions_creator_time_idx
  on public.io_terminal_sessions (created_by, created_at desc);
create index io_terminal_sessions_parent_idx
  on public.io_terminal_sessions (parent_session_id)
  where parent_session_id is not null;

create table public.io_terminal_session_members (
  session_id uuid not null references public.io_terminal_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null,
  status text not null default 'active',
  invited_by uuid references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id),
  constraint io_terminal_session_members_role_check check (
    role in ('owner', 'collaborator', 'reviewer', 'viewer')
  ),
  constraint io_terminal_session_members_status_check check (
    status in ('invited', 'active', 'revoked', 'expired')
  ),
  constraint io_terminal_session_members_time_check check (
    expires_at is null or expires_at > created_at
  )
);

create index io_terminal_session_members_user_state_idx
  on public.io_terminal_session_members (user_id, status, session_id);
create index io_terminal_session_members_invited_by_idx
  on public.io_terminal_session_members (invited_by)
  where invited_by is not null;

create table public.io_terminal_session_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.io_terminal_sessions(id) on delete cascade,
  sequence bigint not null,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete restrict,
  content_classification text not null default 'metadata_only',
  sync_policy text not null default 'cloud_metadata',
  redacted_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint io_terminal_session_events_sequence_key unique (session_id, sequence),
  constraint io_terminal_session_events_sequence_check check (sequence > 0),
  constraint io_terminal_session_events_type_check check (
    event_type in (
      'session.created',
      'runtime.connected',
      'prompt.accepted',
      'session.completed',
      'session.failed',
      'session.stopped',
      'session.archived'
    )
  ),
  constraint io_terminal_session_events_classification_check check (
    content_classification in ('metadata_only', 'redacted_summary')
  ),
  constraint io_terminal_session_events_sync_check check (
    sync_policy in ('cloud_metadata', 'explicit_share')
  ),
  constraint io_terminal_session_events_payload_check check (
    jsonb_typeof(redacted_payload) = 'object'
    and pg_column_size(redacted_payload) <= 4096
  )
);

create index io_terminal_session_events_session_time_idx
  on public.io_terminal_session_events (session_id, sequence, occurred_at);
create index io_terminal_session_events_actor_time_idx
  on public.io_terminal_session_events (actor_user_id, occurred_at desc)
  where actor_user_id is not null;

create table public.io_terminal_approval_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.io_terminal_sessions(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  permission_kind text not null,
  risk_class text not null,
  decision_scope text not null,
  reason text not null,
  state text not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_terminal_approval_requests_permission_check check (
    permission_kind in ('read', 'edit', 'shell', 'network', 'task', 'web', 'mcp', 'external_directory')
  ),
  constraint io_terminal_approval_requests_risk_check check (
    risk_class in ('low', 'moderate', 'high', 'critical')
  ),
  constraint io_terminal_approval_requests_scope_check check (
    decision_scope in ('once', 'session', 'policy')
  ),
  constraint io_terminal_approval_requests_reason_check check (
    char_length(btrim(reason)) between 8 and 500
  ),
  constraint io_terminal_approval_requests_state_check check (
    state in ('pending', 'approved', 'rejected', 'expired', 'cancelled')
  ),
  constraint io_terminal_approval_requests_expiry_check check (expires_at > created_at)
);

create index io_terminal_approval_requests_session_state_idx
  on public.io_terminal_approval_requests (session_id, state, created_at desc);
create index io_terminal_approval_requests_requested_by_idx
  on public.io_terminal_approval_requests (requested_by, created_at desc);

create table public.io_terminal_approval_decisions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.io_terminal_approval_requests(id) on delete restrict,
  decided_by uuid not null references auth.users(id) on delete restrict,
  decision text not null,
  decision_scope text not null,
  reason text not null,
  decided_at timestamptz not null default now(),
  constraint io_terminal_approval_decisions_decision_check check (decision in ('approved', 'rejected')),
  constraint io_terminal_approval_decisions_scope_check check (
    decision_scope in ('once', 'session', 'policy')
  ),
  constraint io_terminal_approval_decisions_reason_check check (
    char_length(btrim(reason)) between 8 and 500
  )
);

create index io_terminal_approval_decisions_decided_by_idx
  on public.io_terminal_approval_decisions (decided_by, decided_at desc);

alter table public.io_terminal_sessions enable row level security;
alter table public.io_terminal_session_members enable row level security;
alter table public.io_terminal_session_events enable row level security;
alter table public.io_terminal_approval_requests enable row level security;
alter table public.io_terminal_approval_decisions enable row level security;

revoke all on public.io_terminal_sessions,
  public.io_terminal_session_members,
  public.io_terminal_session_events,
  public.io_terminal_approval_requests,
  public.io_terminal_approval_decisions
from public, anon, authenticated;
grant select on public.io_terminal_sessions,
  public.io_terminal_session_members,
  public.io_terminal_session_events,
  public.io_terminal_approval_requests,
  public.io_terminal_approval_decisions
to authenticated;
grant select, insert, update on public.io_terminal_sessions,
  public.io_terminal_session_members,
  public.io_terminal_approval_requests
to service_role;
grant select, insert on public.io_terminal_session_events,
  public.io_terminal_approval_decisions
to service_role;

create or replace function private.io_terminal_has_session_role(
  _session_id uuid,
  _allowed_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.io_terminal_session_members as member
    where member.session_id = _session_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
      and (member.expires_at is null or member.expires_at > now())
      and (_allowed_roles is null or member.role = any(_allowed_roles))
  );
$function$;

revoke all on function private.io_terminal_has_session_role(uuid, text[])
  from public, anon, authenticated, service_role;
grant execute on function private.io_terminal_has_session_role(uuid, text[])
  to authenticated, service_role;

create policy io_terminal_sessions_member_select
on public.io_terminal_sessions for select to authenticated
using (created_by = (select auth.uid()));

create policy io_terminal_session_members_member_select
on public.io_terminal_session_members for select to authenticated
using (
  user_id = (select auth.uid())
);

create policy io_terminal_session_events_member_select
on public.io_terminal_session_events for select to authenticated
using (
  exists (
    select 1
    from public.io_terminal_sessions as session
    where session.id = session_id
      and session.created_by = (select auth.uid())
  )
);

create policy io_terminal_approval_requests_member_select
on public.io_terminal_approval_requests for select to authenticated
using (
  exists (
    select 1
    from public.io_terminal_sessions as session
    where session.id = session_id
      and session.created_by = (select auth.uid())
  )
);

create policy io_terminal_approval_decisions_member_select
on public.io_terminal_approval_decisions for select to authenticated
using (
  exists (
    select 1
    from public.io_terminal_approval_requests as request
    where request.id = request_id
      and exists (
        select 1
        from public.io_terminal_sessions as session
        where session.id = request.session_id
          and session.created_by = (select auth.uid())
      )
  )
);

create trigger io_terminal_sessions_set_updated_at
before update on public.io_terminal_sessions
for each row execute function public.update_updated_at_column();

create trigger io_terminal_session_members_set_updated_at
before update on public.io_terminal_session_members
for each row execute function public.update_updated_at_column();

create trigger io_terminal_approval_requests_set_updated_at
before update on public.io_terminal_approval_requests
for each row execute function public.update_updated_at_column();

create or replace function public.create_my_io_terminal_session(
  _workspace_id uuid,
  _title text,
  _mode text,
  _connector_origin text,
  _runtime_reference text,
  _runtime_version text default null
)
returns public.io_terminal_sessions
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  created_session public.io_terminal_sessions%rowtype;
  normalized_title text := btrim(coalesce(_title, ''));
  normalized_origin text := btrim(coalesce(_connector_origin, ''));
  normalized_reference text := btrim(coalesce(_runtime_reference, ''));
  normalized_version text := nullif(btrim(coalesce(_runtime_version, '')), '');
begin
  if caller_id is null or not private.io_workspace_has_role(_workspace_id, null) then
    raise exception 'Active workspace membership required' using errcode = '42501';
  end if;
  if char_length(normalized_title) < 3 or char_length(normalized_title) > 160 then
    raise exception 'Terminal session title must be between 3 and 160 characters';
  end if;
  if _mode not in ('observe', 'plan', 'build', 'run') then
    raise exception 'Unsupported terminal session mode';
  end if;
  if normalized_origin !~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]{1,5})?$'
    or char_length(normalized_origin) > 128 then
    raise exception 'Only a loopback OpenCode origin can be registered';
  end if;
  if char_length(normalized_reference) < 1 or char_length(normalized_reference) > 512 then
    raise exception 'Invalid local runtime reference';
  end if;
  if normalized_version is not null and char_length(normalized_version) > 64 then
    raise exception 'Invalid local runtime version';
  end if;

  insert into public.io_terminal_sessions (
    workspace_id,
    created_by,
    title,
    mode,
    connector_origin_hash,
    runtime_reference_hash,
    runtime_version,
    last_event_sequence
  ) values (
    _workspace_id,
    caller_id,
    normalized_title,
    _mode,
    encode(extensions.digest(normalized_origin, 'sha256'), 'hex'),
    encode(extensions.digest(normalized_reference, 'sha256'), 'hex'),
    normalized_version,
    1
  ) returning * into created_session;

  insert into public.io_terminal_session_members (
    session_id,
    user_id,
    role,
    status,
    invited_by,
    accepted_at
  ) values (
    created_session.id,
    caller_id,
    'owner',
    'active',
    caller_id,
    now()
  );

  insert into public.io_terminal_session_events (
    session_id,
    sequence,
    event_type,
    actor_user_id,
    redacted_payload
  ) values (
    created_session.id,
    1,
    'session.created',
    caller_id,
    jsonb_build_object(
      'connectorKind', 'opencode',
      'executionLocation', 'local',
      'mode', _mode,
      'runtimeVersionKnown', normalized_version is not null
    )
  );

  return created_session;
end;
$function$;

revoke all on function public.create_my_io_terminal_session(uuid, text, text, text, text, text)
  from public, anon;
grant execute on function public.create_my_io_terminal_session(uuid, text, text, text, text, text)
  to authenticated, service_role;

create or replace function public.complete_my_io_terminal_session(
  _session_id uuid,
  _state text
)
returns public.io_terminal_sessions
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  current_session public.io_terminal_sessions%rowtype;
  terminal_event text;
begin
  if _state not in ('completed', 'failed', 'stopped') then
    raise exception 'Unsupported terminal session completion state';
  end if;
  if caller_id is null
    or not private.io_terminal_has_session_role(_session_id, array['owner', 'collaborator']) then
    raise exception 'Terminal session write access required' using errcode = '42501';
  end if;

  select * into current_session
  from public.io_terminal_sessions as session
  where session.id = _session_id
  for update;

  if not found then
    raise exception 'Terminal session does not exist';
  end if;
  if current_session.state <> 'running' then
    return current_session;
  end if;

  terminal_event := case _state
    when 'completed' then 'session.completed'
    when 'failed' then 'session.failed'
    else 'session.stopped'
  end;

  update public.io_terminal_sessions
  set
    state = _state,
    completed_at = now(),
    last_event_sequence = last_event_sequence + 1
  where id = _session_id
  returning * into current_session;

  insert into public.io_terminal_session_events (
    session_id,
    sequence,
    event_type,
    actor_user_id,
    redacted_payload
  ) values (
    _session_id,
    current_session.last_event_sequence,
    terminal_event,
    caller_id,
    jsonb_build_object('state', _state)
  );

  return current_session;
end;
$function$;

revoke all on function public.complete_my_io_terminal_session(uuid, text)
  from public, anon;
grant execute on function public.complete_my_io_terminal_session(uuid, text)
  to authenticated, service_role;

create or replace function public.list_my_io_terminal_sessions(_workspace_id uuid)
returns table (
  session_id uuid,
  title text,
  mode text,
  state text,
  runtime_version text,
  last_event_sequence bigint,
  started_at timestamptz,
  completed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not private.io_workspace_has_role(_workspace_id, null) then
    raise exception 'Active workspace membership required' using errcode = '42501';
  end if;
  return query
  select
    session.id,
    session.title,
    session.mode,
    session.state,
    session.runtime_version,
    session.last_event_sequence,
    session.started_at,
    session.completed_at
  from public.io_terminal_sessions as session
  where session.workspace_id = _workspace_id
    and session.created_by = caller_id
  order by session.started_at desc, session.id desc
  limit 20;
end;
$function$;

revoke all on function public.list_my_io_terminal_sessions(uuid) from public, anon;
grant execute on function public.list_my_io_terminal_sessions(uuid)
  to authenticated, service_role;

comment on table public.io_terminal_sessions is
  'Durable local/hosted terminal lifecycle metadata. Connector origins and runtime references are SHA-256 hashes; content remains local by default.';
comment on table public.io_terminal_session_events is
  'Ordered safe terminal lifecycle projections. Raw prompts, output, code, paths and secrets are prohibited.';
comment on table public.io_terminal_approval_requests is
  'Approval metadata foundation; direct browser mutation is prohibited until decision RPCs and UI ship.';
