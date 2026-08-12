-- Ordered, idempotent terminal metadata events and recorded approvals.
--
-- This is deliberately a metadata-only control plane. It does not accept raw
-- prompts, responses, shell commands, output, code, paths, credentials, or
-- arbitrary JSON. Recording an approval does not execute a local action: a
-- future authenticated daemon must enforce it before tools/commands are shown.

alter table public.io_terminal_session_events
  add column event_key text;

alter table public.io_terminal_session_events
  add constraint io_terminal_session_events_key_check check (
    event_key is null
    or (
      char_length(event_key) between 8 and 128
      and event_key ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]+$'
    )
  );

create unique index io_terminal_session_events_session_key_idx
  on public.io_terminal_session_events (session_id, event_key)
  where event_key is not null;

alter table public.io_terminal_session_events
  drop constraint io_terminal_session_events_type_check;

alter table public.io_terminal_session_events
  add constraint io_terminal_session_events_type_check check (
    event_type in (
      'session.created',
      'runtime.connected',
      'runtime.disconnected',
      'prompt.accepted',
      'approval.requested',
      'approval.approved',
      'approval.rejected',
      'approval.expired',
      'session.completed',
      'session.failed',
      'session.stopped',
      'session.archived'
    )
  );

create or replace function private.io_terminal_safe_event_payload(
  _event_type text,
  _payload jsonb
)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $function$
declare
  payload jsonb := coalesce(_payload, '{}'::jsonb);
  payload_key text;
  reason_code text;
begin
  if jsonb_typeof(payload) <> 'object' or pg_column_size(payload) > 512 then
    raise exception 'Terminal event payload must be a small metadata object';
  end if;

  if _event_type = 'runtime.connected' then
    for payload_key in select jsonb_object_keys(payload)
    loop
      if payload_key <> 'runtimeVersionKnown' then
        raise exception 'Terminal event payload contains an unsupported field';
      end if;
    end loop;
    if payload ? 'runtimeVersionKnown'
      and jsonb_typeof(payload -> 'runtimeVersionKnown') <> 'boolean' then
      raise exception 'runtimeVersionKnown must be boolean';
    end if;
  elsif _event_type = 'runtime.disconnected' then
    for payload_key in select jsonb_object_keys(payload)
    loop
      if payload_key <> 'reasonCode' then
        raise exception 'Terminal event payload contains an unsupported field';
      end if;
    end loop;
    reason_code := payload ->> 'reasonCode';
    if reason_code is null
      or reason_code not in ('connection_lost', 'local_stop', 'request_timeout') then
      raise exception 'Terminal disconnect reason is unsupported';
    end if;
  elsif _event_type = 'prompt.accepted' then
    if payload <> '{}'::jsonb then
      raise exception 'Prompt acceptance stores no cloud payload';
    end if;
  else
    raise exception 'Unsupported appendable terminal event type';
  end if;

  return payload;
end;
$function$;

revoke all on function private.io_terminal_safe_event_payload(text, jsonb)
  from public, anon, authenticated, service_role;

create or replace function public.append_my_io_terminal_event(
  _session_id uuid,
  _event_type text,
  _event_key text,
  _payload jsonb default '{}'::jsonb
)
returns table (
  event_id bigint,
  sequence bigint,
  event_type text,
  occurred_at timestamptz,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  current_session public.io_terminal_sessions%rowtype;
  existing_event public.io_terminal_session_events%rowtype;
  created_event public.io_terminal_session_events%rowtype;
  payload jsonb;
  normalized_key text := btrim(coalesce(_event_key, ''));
begin
  if caller_id is null
    or not private.io_terminal_has_session_role(_session_id, array['owner', 'collaborator']) then
    raise exception 'Terminal session write access required' using errcode = '42501';
  end if;
  if char_length(normalized_key) < 8
    or char_length(normalized_key) > 128
    or normalized_key !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]+$' then
    raise exception 'Terminal event key is invalid';
  end if;

  payload := private.io_terminal_safe_event_payload(_event_type, _payload);

  select * into current_session
  from public.io_terminal_sessions as session
  where session.id = _session_id
  for update;

  if not found then
    raise exception 'Terminal session does not exist';
  end if;
  if current_session.state <> 'running' then
    raise exception 'Terminal session is no longer running';
  end if;

  select * into existing_event
  from public.io_terminal_session_events as event
  where event.session_id = _session_id
    and event.event_key = normalized_key;

  if found then
    if existing_event.event_type <> _event_type
      or existing_event.redacted_payload <> payload then
      raise exception 'Terminal event key was already used for different metadata';
    end if;
    return query
    select
      existing_event.id,
      existing_event.sequence,
      existing_event.event_type,
      existing_event.occurred_at,
      true;
    return;
  end if;

  update public.io_terminal_sessions
  set last_event_sequence = last_event_sequence + 1
  where id = _session_id
  returning * into current_session;

  insert into public.io_terminal_session_events (
    session_id,
    sequence,
    event_type,
    event_key,
    actor_user_id,
    redacted_payload
  ) values (
    _session_id,
    current_session.last_event_sequence,
    _event_type,
    normalized_key,
    caller_id,
    payload
  ) returning * into created_event;

  return query
  select
    created_event.id,
    created_event.sequence,
    created_event.event_type,
    created_event.occurred_at,
    false;
end;
$function$;

revoke all on function public.append_my_io_terminal_event(uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.append_my_io_terminal_event(uuid, text, text, jsonb)
  to authenticated, service_role;

create or replace function public.list_my_io_terminal_events(
  _session_id uuid,
  _before_sequence bigint default null,
  _limit integer default 50
)
returns table (
  event_id bigint,
  sequence bigint,
  event_type text,
  content_classification text,
  sync_policy text,
  occurred_at timestamptz
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
  if caller_id is null
    or not private.io_terminal_has_session_role(_session_id, null) then
    raise exception 'Terminal session read access required' using errcode = '42501';
  end if;
  if bounded_limit < 1 or bounded_limit > 100 then
    raise exception 'Terminal event limit must be between 1 and 100';
  end if;

  return query
  select
    event.id,
    event.sequence,
    event.event_type,
    event.content_classification,
    event.sync_policy,
    event.occurred_at
  from public.io_terminal_session_events as event
  where event.session_id = _session_id
    and (_before_sequence is null or event.sequence < _before_sequence)
  order by event.sequence desc
  limit bounded_limit;
end;
$function$;

revoke all on function public.list_my_io_terminal_events(uuid, bigint, integer)
  from public, anon;
grant execute on function public.list_my_io_terminal_events(uuid, bigint, integer)
  to authenticated, service_role;

create or replace function private.io_terminal_safe_approval_reason(_reason text)
returns text
language plpgsql
immutable
security invoker
set search_path = ''
as $function$
declare
  normalized_reason text := lower(btrim(coalesce(_reason, '')));
begin
  if normalized_reason !~ '^[a-z][a-z0-9._ -]{7,120}$' then
    raise exception 'Approval reason must be a safe classification, not execution detail';
  end if;
  return normalized_reason;
end;
$function$;

revoke all on function private.io_terminal_safe_approval_reason(text)
  from public, anon, authenticated, service_role;

create unique index io_terminal_approval_requests_one_pending_idx
  on public.io_terminal_approval_requests (session_id, permission_kind)
  where state = 'pending';

create or replace function public.request_my_io_terminal_approval(
  _session_id uuid,
  _permission_kind text,
  _risk_class text,
  _decision_scope text,
  _reason text,
  _expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  current_session public.io_terminal_sessions%rowtype;
  request_row public.io_terminal_approval_requests%rowtype;
  normalized_reason text;
  maximum_expiry interval;
begin
  if caller_id is null
    or not private.io_terminal_has_session_role(_session_id, array['owner', 'collaborator']) then
    raise exception 'Terminal session write access required' using errcode = '42501';
  end if;
  if _permission_kind not in ('read', 'edit', 'shell', 'network', 'task', 'web', 'mcp', 'external_directory')
    or _risk_class not in ('low', 'moderate', 'high', 'critical')
    or _decision_scope not in ('once', 'session', 'policy') then
    raise exception 'Unsupported terminal approval classification';
  end if;
  if _risk_class = 'critical' and _decision_scope <> 'once' then
    raise exception 'Critical approvals may only be recorded once';
  end if;
  maximum_expiry := case when _risk_class = 'critical' then interval '5 minutes' else interval '24 hours' end;
  if _expires_at is null
    or _expires_at < now() + interval '30 seconds'
    or _expires_at > now() + maximum_expiry then
    raise exception 'Terminal approval expiry is outside the allowed window';
  end if;
  normalized_reason := private.io_terminal_safe_approval_reason(_reason);

  select * into current_session
  from public.io_terminal_sessions as session
  where session.id = _session_id
  for update;
  if not found then
    raise exception 'Terminal session does not exist';
  end if;
  if current_session.state <> 'running' then
    raise exception 'Terminal session is no longer running';
  end if;

  insert into public.io_terminal_approval_requests (
    session_id,
    requested_by,
    permission_kind,
    risk_class,
    decision_scope,
    reason,
    expires_at
  ) values (
    _session_id,
    caller_id,
    _permission_kind,
    _risk_class,
    _decision_scope,
    normalized_reason,
    _expires_at
  ) returning * into request_row;

  update public.io_terminal_sessions
  set last_event_sequence = last_event_sequence + 1
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
    'approval.requested',
    caller_id,
    jsonb_build_object(
      'permissionKind', _permission_kind,
      'riskClass', _risk_class,
      'decisionScope', _decision_scope
    )
  );

  return jsonb_build_object(
    'ok', true,
    'requestId', request_row.id,
    'state', request_row.state,
    'expiresAt', request_row.expires_at
  );
end;
$function$;

revoke all on function public.request_my_io_terminal_approval(uuid, text, text, text, text, timestamptz)
  from public, anon;
grant execute on function public.request_my_io_terminal_approval(uuid, text, text, text, text, timestamptz)
  to authenticated, service_role;

create or replace function public.decide_my_io_terminal_approval(
  _request_id uuid,
  _decision text,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  request_row public.io_terminal_approval_requests%rowtype;
  current_session public.io_terminal_sessions%rowtype;
  existing_decision public.io_terminal_approval_decisions%rowtype;
  normalized_reason text;
  event_type_value text;
begin
  select * into request_row
  from public.io_terminal_approval_requests as request
  where request.id = _request_id
  for update;
  if not found then
    raise exception 'Terminal approval request does not exist';
  end if;
  if caller_id is null
    or not private.io_terminal_has_session_role(request_row.session_id, array['owner']) then
    raise exception 'Terminal approval decision access required' using errcode = '42501';
  end if;
  if _decision not in ('approved', 'rejected') then
    raise exception 'Unsupported terminal approval decision';
  end if;
  normalized_reason := private.io_terminal_safe_approval_reason(_reason);

  select * into current_session
  from public.io_terminal_sessions as session
  where session.id = request_row.session_id
  for update;

  if request_row.state in ('approved', 'rejected') then
    select * into existing_decision
    from public.io_terminal_approval_decisions as decision
    where decision.request_id = request_row.id;
    if existing_decision.decision <> _decision then
      raise exception 'Terminal approval was already decided differently';
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'requestId', request_row.id,
      'state', request_row.state
    );
  end if;

  if request_row.state = 'pending' and request_row.expires_at <= now() then
    update public.io_terminal_approval_requests
    set state = 'expired'
    where id = request_row.id
    returning * into request_row;

    update public.io_terminal_sessions
    set last_event_sequence = last_event_sequence + 1
    where id = current_session.id
    returning * into current_session;

    insert into public.io_terminal_session_events (
      session_id,
      sequence,
      event_type,
      actor_user_id,
      redacted_payload
    ) values (
      current_session.id,
      current_session.last_event_sequence,
      'approval.expired',
      caller_id,
      jsonb_build_object('permissionKind', request_row.permission_kind)
    );

    return jsonb_build_object(
      'ok', true,
      'replayed', false,
      'requestId', request_row.id,
      'state', 'expired'
    );
  end if;

  if request_row.state <> 'pending' then
    raise exception 'Terminal approval is not pending';
  end if;

  update public.io_terminal_approval_requests
  set state = _decision
  where id = request_row.id
  returning * into request_row;

  insert into public.io_terminal_approval_decisions (
    request_id,
    decided_by,
    decision,
    decision_scope,
    reason
  ) values (
    request_row.id,
    caller_id,
    _decision,
    request_row.decision_scope,
    normalized_reason
  );

  update public.io_terminal_sessions
  set last_event_sequence = last_event_sequence + 1
  where id = current_session.id
  returning * into current_session;

  event_type_value := case when _decision = 'approved' then 'approval.approved' else 'approval.rejected' end;
  insert into public.io_terminal_session_events (
    session_id,
    sequence,
    event_type,
    actor_user_id,
    redacted_payload
  ) values (
    current_session.id,
    current_session.last_event_sequence,
    event_type_value,
    caller_id,
    jsonb_build_object(
      'permissionKind', request_row.permission_kind,
      'riskClass', request_row.risk_class,
      'decisionScope', request_row.decision_scope
    )
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'requestId', request_row.id,
    'state', request_row.state
  );
end;
$function$;

revoke all on function public.decide_my_io_terminal_approval(uuid, text, text)
  from public, anon;
grant execute on function public.decide_my_io_terminal_approval(uuid, text, text)
  to authenticated, service_role;

comment on function public.append_my_io_terminal_event(uuid, text, text, jsonb) is
  'Writes one ordered, idempotent, metadata-only terminal event. Payloads use a strict allowlist and cannot include prompt/output content.';
comment on function public.request_my_io_terminal_approval(uuid, text, text, text, text, timestamptz) is
  'Records a classified approval request. This is not an execution grant until an authenticated local daemon enforces it.';
comment on function public.decide_my_io_terminal_approval(uuid, text, text) is
  'Records an owner decision with idempotency. This is not an execution grant until an authenticated local daemon enforces it.';
