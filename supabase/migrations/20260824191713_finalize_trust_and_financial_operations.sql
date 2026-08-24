-- Production-shaped Trust & Safety operations for Orbit collaboration.
--
-- This release deliberately keeps report content, moderation evidence and
-- quarantined attachment metadata behind capability-checked RPCs. Browser
-- clients cannot mark an attachment clean. Only the service-role scanner
-- result boundary can publish a clean verdict.

create table private.admin_trust_case_state (
  source_kind text not null,
  report_id uuid not null,
  assigned_to uuid references auth.users(id) on delete set null,
  priority text not null default 'normal',
  triage_note text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_kind, report_id),
  constraint admin_trust_case_source_check check (
    source_kind in ('legacy', 'conversation')
  ),
  constraint admin_trust_case_priority_check check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  constraint admin_trust_case_note_check check (
    triage_note is null or char_length(btrim(triage_note)) between 8 and 500
  ),
  constraint admin_trust_case_version_check check (version > 0)
);

create index admin_trust_case_assignee_idx
  on private.admin_trust_case_state (assigned_to, updated_at desc)
  where assigned_to is not null;

create table public.conversation_moderation_notices (
  id uuid primary key default gen_random_uuid(),
  moderation_action_id uuid not null unique
    references private.conversation_moderation_actions(id) on delete restrict,
  target_user_id uuid not null references public.profiles(user_id) on delete restrict,
  target_type text not null,
  target_id uuid not null,
  action_type text not null,
  reason_summary text not null,
  appeal_deadline timestamptz not null,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversation_moderation_notices_target_check check (
    target_type in ('message', 'thread', 'member')
  ),
  constraint conversation_moderation_notices_action_check check (
    action_type in ('warn', 'mute', 'timeout', 'remove', 'restore', 'content_restrict')
  ),
  constraint conversation_moderation_notices_reason_check check (
    char_length(btrim(reason_summary)) between 8 and 500
  ),
  constraint conversation_moderation_notices_deadline_check check (
    appeal_deadline > created_at
  )
);

create index conversation_moderation_notices_user_time_idx
  on public.conversation_moderation_notices (target_user_id, created_at desc, id desc);

create table public.conversation_moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null unique
    references public.conversation_moderation_notices(id) on delete restrict,
  appellant_id uuid not null references public.profiles(user_id) on delete restrict,
  reason text not null,
  status text not null default 'submitted',
  assigned_to uuid references auth.users(id) on delete set null,
  decision_note text,
  decided_by uuid references auth.users(id) on delete set null,
  client_request_id uuid not null,
  version integer not null default 1,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint conversation_moderation_appeals_reason_check check (
    char_length(btrim(reason)) between 20 and 4000
  ),
  constraint conversation_moderation_appeals_status_check check (
    status in ('submitted', 'reviewing', 'upheld', 'overturned', 'withdrawn')
  ),
  constraint conversation_moderation_appeals_decision_check check (
    (
      status in ('submitted', 'reviewing', 'withdrawn')
      and decided_by is null and decided_at is null and decision_note is null
    ) or (
      status in ('upheld', 'overturned')
      and decided_by is not null and decided_at is not null
      and char_length(btrim(decision_note)) between 8 and 1000
    )
  ),
  constraint conversation_moderation_appeals_version_check check (version > 0),
  constraint conversation_moderation_appeals_request_key
    unique (appellant_id, client_request_id)
);

create index conversation_moderation_appeals_status_time_idx
  on public.conversation_moderation_appeals (status, submitted_at, id);
create index conversation_moderation_appeals_assignee_time_idx
  on public.conversation_moderation_appeals (assigned_to, submitted_at, id)
  where assigned_to is not null;

alter table public.conversation_attachments
  add column scan_provider text,
  add column scanner_reference text,
  add column content_sha256 text,
  add column threat_code text,
  add column scan_started_at timestamptz,
  add column scan_finished_at timestamptz,
  add column reviewed_by uuid references auth.users(id) on delete set null,
  add column reviewed_at timestamptz,
  add column review_note text,
  add column review_version integer not null default 1;

alter table public.conversation_attachments
  add constraint conversation_attachments_hash_check check (
    content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$'
  ),
  add constraint conversation_attachments_scan_provider_check check (
    scan_provider is null
    or scan_provider ~ '^[a-z][a-z0-9_.-]{1,79}$'
  ),
  add constraint conversation_attachments_scanner_reference_check check (
    scanner_reference is null
    or char_length(scanner_reference) between 8 and 160
  ),
  add constraint conversation_attachments_threat_check check (
    threat_code is null or threat_code ~ '^[a-z][a-z0-9_.-]{1,99}$'
  ),
  add constraint conversation_attachments_review_note_check check (
    review_note is null or char_length(btrim(review_note)) between 8 and 500
  ),
  add constraint conversation_attachments_review_version_check check (
    review_version > 0
  ),
  add constraint conversation_attachments_scan_lifecycle_check check (
    (scan_status = 'pending' and scan_finished_at is null)
    or (
      scan_status in ('clean', 'blocked', 'failed')
      and scan_finished_at is not null
    )
  );

create index conversation_attachments_scan_queue_idx
  on public.conversation_attachments (scan_status, created_at, id);

create table private.conversation_attachment_scan_events (
  id bigint generated always as identity primary key,
  attachment_id uuid not null
    references public.conversation_attachments(id) on delete restrict,
  provider_key text not null,
  provider_event_id text not null,
  verdict text not null,
  content_sha256 text not null,
  threat_code text,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint conversation_attachment_scan_provider_check check (
    provider_key ~ '^[a-z][a-z0-9_.-]{1,79}$'
  ),
  constraint conversation_attachment_scan_event_check check (
    char_length(provider_event_id) between 8 and 160
  ),
  constraint conversation_attachment_scan_verdict_check check (
    verdict in ('clean', 'blocked', 'failed')
  ),
  constraint conversation_attachment_scan_hash_check check (
    content_sha256 ~ '^[a-f0-9]{64}$'
  ),
  unique (provider_key, provider_event_id)
);

alter table private.admin_trust_case_state enable row level security;
alter table public.conversation_moderation_notices enable row level security;
alter table public.conversation_moderation_appeals enable row level security;
alter table private.conversation_attachment_scan_events enable row level security;

revoke all on private.admin_trust_case_state,
  public.conversation_moderation_notices,
  public.conversation_moderation_appeals,
  private.conversation_attachment_scan_events
from public, anon, authenticated;

grant select, insert, update on private.admin_trust_case_state to service_role;
grant select, insert, update on public.conversation_moderation_notices to service_role;
grant select, insert, update on public.conversation_moderation_appeals to service_role;
grant select, insert on private.conversation_attachment_scan_events to service_role;

create or replace function private.emit_conversation_moderation_notice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  notice_target_type text;
  notice_target_id uuid;
begin
  if new.target_user_id is null or new.action_type = 'restore' then
    return new;
  end if;
  notice_target_type := case
    when new.target_message_id is not null then 'message'
    when new.target_thread_id is not null then 'thread'
    else 'member'
  end;
  notice_target_id := coalesce(new.target_message_id, new.target_thread_id, new.target_user_id);
  insert into public.conversation_moderation_notices (
    moderation_action_id,
    target_user_id,
    target_type,
    target_id,
    action_type,
    reason_summary,
    appeal_deadline
  ) values (
    new.id,
    new.target_user_id,
    notice_target_type,
    notice_target_id,
    new.action_type,
    left(new.reason, 500),
    new.created_at + interval '30 days'
  ) on conflict (moderation_action_id) do nothing;
  return new;
end;
$function$;

revoke all on function private.emit_conversation_moderation_notice()
  from public, anon, authenticated, service_role;

create trigger conversation_moderation_action_emit_notice
after insert on private.conversation_moderation_actions
for each row execute function private.emit_conversation_moderation_notice();

create or replace function public.admin_trust_case_queue(
  _source_kind text default null,
  _status text default null,
  _assigned_to_me boolean default false,
  _before_created_at timestamptz default null,
  _before_id uuid default null,
  _limit integer default 25
)
returns table (
  source_kind text,
  report_id uuid,
  target_type text,
  target_id uuid,
  category text,
  report_reason text,
  context_excerpt text,
  report_status text,
  priority text,
  assigned_to_me boolean,
  assigned_display_name text,
  triage_note text,
  case_version integer,
  resolution_note text,
  created_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  bounded_limit integer := coalesce(_limit, 25);
begin
  if not private.has_admin_capability(caller_id, 'trust.manage') then
    raise exception 'Trust operations access required' using errcode = '42501';
  end if;
  if _source_kind is not null and _source_kind not in ('legacy', 'conversation') then
    raise exception 'Report source is invalid';
  end if;
  if _status is not null and _status not in (
    'open', 'triaged', 'actioned', 'dismissed', 'appealed'
  ) then
    raise exception 'Report status is invalid';
  end if;
  if bounded_limit not between 1 and 100 then
    raise exception 'Report queue limit must be between 1 and 100';
  end if;
  if (_before_created_at is null) <> (_before_id is null) then
    raise exception 'Report queue cursor is incomplete';
  end if;

  return query
  with sources as (
    select
      'legacy'::text as source_kind,
      report.id as report_id,
      report.target_type,
      report.target_id,
      'legacy'::text as category,
      report.reason as report_reason,
      null::text as context_excerpt,
      report.status as report_status,
      report.resolution_note,
      report.created_at,
      report.resolved_at
    from public.reports as report
    union all
    select
      'conversation'::text,
      report.id,
      case
        when report.message_id is not null then 'message'
        when report.room_id is not null then 'room'
        else 'space'
      end,
      coalesce(report.message_id, report.room_id, report.space_id),
      report.category,
      report.description,
      case
        when message.deleted_at is not null then '[restricted]'
        else left(message.body, 500)
      end,
      case report.status
        when 'resolved' then 'actioned'
        else report.status
      end,
      null::text,
      report.created_at,
      case when report.status in ('resolved', 'dismissed') then report.updated_at else null end
    from public.conversation_reports as report
    left join public.conversation_messages as message on message.id = report.message_id
  )
  select
    source.source_kind,
    source.report_id,
    source.target_type,
    source.target_id,
    source.category,
    source.report_reason,
    source.context_excerpt,
    source.report_status,
    coalesce(triage.priority, 'normal'),
    triage.assigned_to = caller_id,
    case when triage.assigned_to is null then null else coalesce(profile.display_name, 'Admin team member') end,
    triage.triage_note,
    coalesce(triage.version, 0),
    source.resolution_note,
    source.created_at,
    source.resolved_at
  from sources as source
  left join private.admin_trust_case_state as triage
    on triage.source_kind = source.source_kind and triage.report_id = source.report_id
  left join public.profiles as profile on profile.user_id = triage.assigned_to
  where (_source_kind is null or source.source_kind = _source_kind)
    and (_status is null or source.report_status = _status)
    and (not _assigned_to_me or triage.assigned_to = caller_id)
    and (
      _before_created_at is null
      or (source.created_at, source.report_id) < (_before_created_at, _before_id)
    )
  order by
    case coalesce(triage.priority, 'normal')
      when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4
    end,
    source.created_at desc,
    source.report_id desc
  limit bounded_limit;
end;
$function$;

create or replace function public.admin_assign_trust_case(
  _source_kind text,
  _report_id uuid,
  _priority text,
  _triage_note text,
  _expected_version integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  state_row private.admin_trust_case_state%rowtype;
  normalized_note text := btrim(coalesce(_triage_note, ''));
begin
  if not private.has_admin_capability(caller_id, 'trust.manage') then
    raise exception 'Trust operations access required' using errcode = '42501';
  end if;
  if _source_kind not in ('legacy', 'conversation') or _priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Trust case assignment is invalid';
  end if;
  if char_length(normalized_note) not between 8 and 500 then
    raise exception 'Triage note must be 8 to 500 characters';
  end if;
  if (_source_kind = 'legacy' and not exists (select 1 from public.reports where id = _report_id))
    or (_source_kind = 'conversation' and not exists (select 1 from public.conversation_reports where id = _report_id)) then
    raise exception 'Report does not exist';
  end if;

  select * into state_row from private.admin_trust_case_state
  where source_kind = _source_kind and report_id = _report_id for update;

  if not found then
    if coalesce(_expected_version, 0) <> 0 then
      raise exception 'Trust case changed; refresh before assigning';
    end if;
    insert into private.admin_trust_case_state (
      source_kind, report_id, assigned_to, priority, triage_note
    ) values (
      _source_kind, _report_id, caller_id, _priority, normalized_note
    ) returning * into state_row;
  else
    if state_row.version <> _expected_version then
      raise exception 'Trust case changed; refresh before assigning';
    end if;
    update private.admin_trust_case_state
    set assigned_to = caller_id,
        priority = _priority,
        triage_note = normalized_note,
        version = version + 1,
        updated_at = now()
    where source_kind = _source_kind and report_id = _report_id
    returning * into state_row;
  end if;

  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'trust.manage', 'trust', 'report.assigned', 'report', _report_id,
    normalized_note,
    jsonb_build_object('sourceKind', _source_kind, 'priority', _priority, 'version', state_row.version)
  );
  return jsonb_build_object('ok', true, 'version', state_row.version, 'priority', state_row.priority);
end;
$function$;

create or replace function public.admin_decide_trust_case(
  _source_kind text,
  _report_id uuid,
  _outcome text,
  _moderation_action text,
  _reason text,
  _expected_status text,
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_reason text := btrim(coalesce(_reason, ''));
  legacy_report public.reports%rowtype;
  conversation_report public.conversation_reports%rowtype;
  message_row public.conversation_messages%rowtype;
  normalized_status text;
begin
  if not private.has_admin_capability(caller_id, 'trust.manage') then
    raise exception 'Trust operations access required' using errcode = '42501';
  end if;
  if _source_kind not in ('legacy', 'conversation')
    or _outcome not in ('actioned', 'dismissed')
    or _moderation_action not in ('none', 'warn', 'content_restrict')
    or _client_request_id is null then
    raise exception 'Trust case decision is invalid';
  end if;
  if char_length(normalized_reason) not between 8 and 500 then
    raise exception 'Decision reason must be 8 to 500 characters';
  end if;
  if _outcome = 'dismissed' and _moderation_action <> 'none' then
    raise exception 'A dismissed report cannot apply a moderation action';
  end if;

  if _source_kind = 'legacy' then
    select * into legacy_report from public.reports where id = _report_id for update;
    if not found then raise exception 'Report does not exist'; end if;
    if legacy_report.status <> _expected_status then
      raise exception 'Report state changed; refresh before deciding';
    end if;
    update public.reports
    set status = _outcome,
        resolution_note = normalized_reason,
        resolver_id = caller_id,
        resolved_at = now()
    where id = _report_id;
    normalized_status := _outcome;
  else
    select * into conversation_report
    from public.conversation_reports where id = _report_id for update;
    if not found then raise exception 'Report does not exist'; end if;
    normalized_status := case conversation_report.status when 'resolved' then 'actioned' else conversation_report.status end;
    if normalized_status <> _expected_status then
      raise exception 'Report state changed; refresh before deciding';
    end if;
    if _moderation_action in ('warn', 'content_restrict') then
      if conversation_report.message_id is null then
        raise exception 'This moderation action requires a message target';
      end if;
      select * into message_row from public.conversation_messages
      where id = conversation_report.message_id for update;
      if _moderation_action = 'content_restrict' then
        update public.conversation_messages
        set deleted_at = coalesce(deleted_at, now()) where id = message_row.id;
      end if;
      insert into private.conversation_moderation_actions (
        report_id, space_id, target_user_id, target_message_id,
        action_type, reason, actor_id, client_request_id
      ) values (
        conversation_report.id,
        conversation_report.space_id,
        message_row.author_id,
        message_row.id,
        _moderation_action,
        normalized_reason,
        caller_id,
        _client_request_id
      ) on conflict (actor_id, client_request_id)
        where client_request_id is not null do nothing;
    end if;
    update public.conversation_reports
    set status = case when _outcome = 'actioned' then 'resolved' else 'dismissed' end,
        updated_at = now()
    where id = _report_id;
  end if;

  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'trust.manage', 'trust', 'report.' || _outcome, 'report', _report_id,
    normalized_reason,
    jsonb_build_object('sourceKind', _source_kind, 'moderationAction', _moderation_action)
  );
  return jsonb_build_object('ok', true, 'status', _outcome);
end;
$function$;

create or replace function public.list_my_moderation_notices(_limit integer default 25)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if _limit not between 1 and 100 then raise exception 'Notice limit is invalid'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', notice.id,
      'targetType', notice.target_type,
      'targetId', notice.target_id,
      'actionType', notice.action_type,
      'reason', notice.reason_summary,
      'appealDeadline', notice.appeal_deadline,
      'reversedAt', notice.reversed_at,
      'createdAt', notice.created_at,
      'appeal', case when appeal.id is null then null else jsonb_build_object(
        'id', appeal.id,
        'status', appeal.status,
        'submittedAt', appeal.submitted_at,
        'decidedAt', appeal.decided_at,
        'decisionNote', appeal.decision_note
      ) end
    ) order by notice.created_at desc, notice.id desc)
    from (
      select source.* from public.conversation_moderation_notices as source
      where source.target_user_id = caller_id
      order by source.created_at desc, source.id desc limit _limit
    ) as notice
    left join public.conversation_moderation_appeals as appeal on appeal.notice_id = notice.id
  ), '[]'::jsonb);
end;
$function$;

create or replace function public.submit_my_moderation_appeal(
  _notice_id uuid,
  _reason text,
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  notice_row public.conversation_moderation_notices%rowtype;
  appeal_row public.conversation_moderation_appeals%rowtype;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if caller_id is null or _client_request_id is null then
    raise exception 'Authentication and client request ID are required' using errcode = '42501';
  end if;
  if char_length(normalized_reason) not between 20 and 4000 then
    raise exception 'Appeal reason must be 20 to 4,000 characters';
  end if;
  select * into notice_row from public.conversation_moderation_notices
  where id = _notice_id and target_user_id = caller_id for update;
  if not found then raise exception 'Moderation notice does not exist'; end if;
  if notice_row.reversed_at is not null then raise exception 'The moderation action is already reversed'; end if;
  if notice_row.appeal_deadline < now() then raise exception 'The appeal window has closed'; end if;

  select * into appeal_row from public.conversation_moderation_appeals
  where appellant_id = caller_id and client_request_id = _client_request_id;
  if found then
    if appeal_row.notice_id <> _notice_id then raise exception 'Client request ID was already used'; end if;
    return jsonb_build_object('ok', true, 'appealId', appeal_row.id, 'status', appeal_row.status, 'replayed', true);
  end if;
  if exists (select 1 from public.conversation_moderation_appeals where notice_id = _notice_id) then
    raise exception 'An appeal already exists for this action';
  end if;
  insert into public.conversation_moderation_appeals (
    notice_id, appellant_id, reason, client_request_id
  ) values (
    _notice_id, caller_id, normalized_reason, _client_request_id
  ) returning * into appeal_row;
  return jsonb_build_object('ok', true, 'appealId', appeal_row.id, 'status', appeal_row.status, 'replayed', false);
end;
$function$;

create or replace function public.admin_appeal_queue(
  _status text default null,
  _limit integer default 25
)
returns table (
  appeal_id uuid,
  notice_id uuid,
  target_type text,
  target_id uuid,
  action_type text,
  action_reason text,
  appeal_reason text,
  appeal_status text,
  assigned_to_me boolean,
  submitted_at timestamptz,
  appeal_version integer
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare caller_id uuid := (select auth.uid());
begin
  if not private.has_admin_capability(caller_id, 'trust.manage') then
    raise exception 'Trust operations access required' using errcode = '42501';
  end if;
  if _status is not null and _status not in ('submitted', 'reviewing', 'upheld', 'overturned', 'withdrawn') then
    raise exception 'Appeal status is invalid';
  end if;
  if _limit not between 1 and 100 then raise exception 'Appeal limit is invalid'; end if;
  return query
  select appeal.id, notice.id, notice.target_type, notice.target_id,
    notice.action_type, notice.reason_summary, appeal.reason, appeal.status,
    appeal.assigned_to = caller_id, appeal.submitted_at, appeal.version
  from public.conversation_moderation_appeals as appeal
  join public.conversation_moderation_notices as notice on notice.id = appeal.notice_id
  where _status is null or appeal.status = _status
  order by appeal.submitted_at, appeal.id
  limit _limit;
end;
$function$;

create or replace function public.admin_assign_appeal(
  _appeal_id uuid,
  _reason text,
  _expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  appeal_row public.conversation_moderation_appeals%rowtype;
  action_actor uuid;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.has_admin_capability(caller_id, 'trust.manage') then
    raise exception 'Trust operations access required' using errcode = '42501';
  end if;
  if char_length(normalized_reason) not between 8 and 500 then raise exception 'Assignment reason is invalid'; end if;
  select appeal.* into appeal_row
  from public.conversation_moderation_appeals as appeal where appeal.id = _appeal_id for update;
  if not found or appeal_row.status not in ('submitted', 'reviewing') then raise exception 'Appeal is not assignable'; end if;
  if appeal_row.version <> _expected_version then raise exception 'Appeal changed; refresh before assigning'; end if;
  select action.actor_id into action_actor
  from public.conversation_moderation_notices as notice
  join private.conversation_moderation_actions as action on action.id = notice.moderation_action_id
  where notice.id = appeal_row.notice_id;
  if action_actor = caller_id then raise exception 'The original moderator cannot review this appeal'; end if;
  update public.conversation_moderation_appeals
  set assigned_to = caller_id, status = 'reviewing', version = version + 1, updated_at = now()
  where id = _appeal_id returning * into appeal_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'trust.manage', 'trust', 'appeal.assigned', 'appeal', _appeal_id,
    normalized_reason, jsonb_build_object('version', appeal_row.version)
  );
  return jsonb_build_object('ok', true, 'status', appeal_row.status, 'version', appeal_row.version);
end;
$function$;

create or replace function public.admin_decide_appeal(
  _appeal_id uuid,
  _outcome text,
  _decision_note text,
  _expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  appeal_row public.conversation_moderation_appeals%rowtype;
  notice_row public.conversation_moderation_notices%rowtype;
  action_row private.conversation_moderation_actions%rowtype;
  normalized_note text := btrim(coalesce(_decision_note, ''));
begin
  if not private.has_admin_capability(caller_id, 'trust.manage') then
    raise exception 'Trust operations access required' using errcode = '42501';
  end if;
  if _outcome not in ('upheld', 'overturned') or char_length(normalized_note) not between 8 and 1000 then
    raise exception 'Appeal decision is invalid';
  end if;
  select * into appeal_row from public.conversation_moderation_appeals
  where id = _appeal_id for update;
  if not found or appeal_row.status not in ('submitted', 'reviewing') then raise exception 'Appeal is not decidable'; end if;
  if appeal_row.version <> _expected_version then raise exception 'Appeal changed; refresh before deciding'; end if;
  if appeal_row.assigned_to is distinct from caller_id then raise exception 'Claim the appeal before deciding'; end if;
  select * into notice_row from public.conversation_moderation_notices
  where id = appeal_row.notice_id for update;
  select * into action_row from private.conversation_moderation_actions
  where id = notice_row.moderation_action_id for update;
  if action_row.actor_id = caller_id then raise exception 'The original moderator cannot decide this appeal'; end if;

  if _outcome = 'overturned' then
    update private.conversation_moderation_actions
    set reversed_at = now(), reversed_by = caller_id
    where id = action_row.id and reversed_at is null;
    update public.conversation_moderation_notices set reversed_at = now() where id = notice_row.id;
    if action_row.target_message_id is not null and action_row.action_type = 'content_restrict'
      and not exists (
        select 1 from private.conversation_moderation_actions as later
        where later.target_message_id = action_row.target_message_id
          and later.action_type = 'content_restrict'
          and later.reversed_at is null and later.created_at > action_row.created_at
      ) then
      update public.conversation_messages set deleted_at = null where id = action_row.target_message_id;
    end if;
  end if;
  update public.conversation_moderation_appeals
  set status = _outcome,
      decision_note = normalized_note,
      decided_by = caller_id,
      decided_at = now(),
      version = version + 1,
      updated_at = now()
  where id = _appeal_id returning * into appeal_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'trust.manage', 'trust', 'appeal.' || _outcome, 'appeal', _appeal_id,
    normalized_note, jsonb_build_object('noticeId', notice_row.id, 'version', appeal_row.version)
  );
  return jsonb_build_object('ok', true, 'status', appeal_row.status, 'version', appeal_row.version);
end;
$function$;

create or replace function public.admin_attachment_review_queue(
  _scan_status text default null,
  _limit integer default 25
)
returns table (
  attachment_id uuid,
  message_id uuid,
  file_name text,
  content_type text,
  byte_size bigint,
  scan_status text,
  scan_provider text,
  scanner_reference text,
  content_sha256 text,
  threat_code text,
  review_note text,
  review_version integer,
  created_at timestamptz,
  scan_finished_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare caller_id uuid := (select auth.uid());
begin
  if not private.has_admin_capability(caller_id, 'trust.manage') then
    raise exception 'Trust operations access required' using errcode = '42501';
  end if;
  if _scan_status is not null and _scan_status not in ('pending', 'clean', 'blocked', 'failed') then
    raise exception 'Attachment scan status is invalid';
  end if;
  if _limit not between 1 and 100 then raise exception 'Attachment queue limit is invalid'; end if;
  return query
  select attachment.id, attachment.message_id, attachment.file_name,
    attachment.content_type, attachment.byte_size, attachment.scan_status,
    attachment.scan_provider, attachment.scanner_reference,
    attachment.content_sha256, attachment.threat_code,
    attachment.review_note, attachment.review_version,
    attachment.created_at, attachment.scan_finished_at
  from public.conversation_attachments as attachment
  where _scan_status is null or attachment.scan_status = _scan_status
  order by
    case attachment.scan_status when 'pending' then 1 when 'failed' then 2 when 'blocked' then 3 else 4 end,
    attachment.created_at,
    attachment.id
  limit _limit;
end;
$function$;

create or replace function public.admin_review_conversation_attachment(
  _attachment_id uuid,
  _decision text,
  _reason text,
  _expected_status text,
  _expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  attachment_row public.conversation_attachments%rowtype;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.has_admin_capability(caller_id, 'trust.manage') then
    raise exception 'Trust operations access required' using errcode = '42501';
  end if;
  if _decision not in ('block', 'retry') or char_length(normalized_reason) not between 8 and 500 then
    raise exception 'Attachment review decision is invalid';
  end if;
  select * into attachment_row from public.conversation_attachments
  where id = _attachment_id for update;
  if not found then raise exception 'Attachment does not exist'; end if;
  if attachment_row.scan_status <> _expected_status or attachment_row.review_version <> _expected_version then
    raise exception 'Attachment changed; refresh before deciding';
  end if;
  if _decision = 'retry' and attachment_row.scan_status not in ('pending', 'failed') then
    raise exception 'Only pending or failed scans can be retried';
  end if;
  update public.conversation_attachments
  set scan_status = case when _decision = 'block' then 'blocked' else 'pending' end,
      scan_provider = case when _decision = 'retry' then null else scan_provider end,
      scanner_reference = case when _decision = 'retry' then null else scanner_reference end,
      threat_code = case when _decision = 'block' then coalesce(threat_code, 'manual_policy_block') else null end,
      scan_started_at = case when _decision = 'retry' then now() else scan_started_at end,
      scan_finished_at = case when _decision = 'block' then now() else null end,
      reviewed_by = caller_id,
      reviewed_at = now(),
      review_note = normalized_reason,
      review_version = review_version + 1
  where id = _attachment_id
  returning * into attachment_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'trust.manage', 'trust', 'attachment.' || _decision,
    'attachment', _attachment_id, normalized_reason,
    jsonb_build_object('fromStatus', _expected_status, 'toStatus', attachment_row.scan_status)
  );
  return jsonb_build_object('ok', true, 'scanStatus', attachment_row.scan_status, 'version', attachment_row.review_version);
end;
$function$;

create or replace function public.record_conversation_attachment_scan(
  _attachment_id uuid,
  _provider_key text,
  _provider_event_id text,
  _verdict text,
  _content_sha256 text,
  _threat_code text,
  _observed_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  attachment_row public.conversation_attachments%rowtype;
  event_id bigint;
begin
  if current_user <> 'service_role' then
    raise exception 'Trusted scanner service role required' using errcode = '42501';
  end if;
  if _provider_key !~ '^[a-z][a-z0-9_.-]{1,79}$'
    or char_length(coalesce(_provider_event_id, '')) not between 8 and 160
    or _verdict not in ('clean', 'blocked', 'failed')
    or _content_sha256 !~ '^[a-f0-9]{64}$'
    or _observed_at is null
    or _observed_at > now() + interval '5 minutes'
    or _observed_at < now() - interval '7 days' then
    raise exception 'Scanner result is invalid';
  end if;
  select * into attachment_row from public.conversation_attachments
  where id = _attachment_id for update;
  if not found then raise exception 'Attachment does not exist'; end if;
  insert into private.conversation_attachment_scan_events (
    attachment_id, provider_key, provider_event_id, verdict,
    content_sha256, threat_code, observed_at
  ) values (
    _attachment_id, _provider_key, _provider_event_id, _verdict,
    _content_sha256, nullif(_threat_code, ''), _observed_at
  ) on conflict (provider_key, provider_event_id) do nothing
  returning id into event_id;
  if event_id is null then
    if not exists (
      select 1 from private.conversation_attachment_scan_events
      where attachment_id = _attachment_id and provider_key = _provider_key
        and provider_event_id = _provider_event_id and verdict = _verdict
        and content_sha256 = _content_sha256
    ) then raise exception 'Scanner event was already used differently'; end if;
    return jsonb_build_object('ok', true, 'replayed', true, 'scanStatus', attachment_row.scan_status);
  end if;
  if attachment_row.scan_status = 'clean' and _verdict <> 'clean' then
    update public.conversation_attachments
    set scan_status = _verdict,
        scan_provider = _provider_key,
        scanner_reference = _provider_event_id,
        content_sha256 = _content_sha256,
        threat_code = nullif(_threat_code, ''),
        scan_finished_at = _observed_at,
        review_version = review_version + 1
    where id = _attachment_id returning * into attachment_row;
  elsif attachment_row.scan_status in ('pending', 'failed') then
    update public.conversation_attachments
    set scan_status = _verdict,
        scan_provider = _provider_key,
        scanner_reference = _provider_event_id,
        content_sha256 = _content_sha256,
        threat_code = nullif(_threat_code, ''),
        scan_started_at = coalesce(scan_started_at, _observed_at),
        scan_finished_at = _observed_at,
        review_version = review_version + 1
    where id = _attachment_id returning * into attachment_row;
  end if;
  return jsonb_build_object('ok', true, 'replayed', false, 'scanStatus', attachment_row.scan_status);
end;
$function$;

revoke all on function public.admin_trust_case_queue(text, text, boolean, timestamptz, uuid, integer) from public, anon;
revoke all on function public.admin_assign_trust_case(text, uuid, text, text, integer) from public, anon;
revoke all on function public.admin_decide_trust_case(text, uuid, text, text, text, text, uuid) from public, anon;
revoke all on function public.list_my_moderation_notices(integer) from public, anon;
revoke all on function public.submit_my_moderation_appeal(uuid, text, uuid) from public, anon;
revoke all on function public.admin_appeal_queue(text, integer) from public, anon;
revoke all on function public.admin_assign_appeal(uuid, text, integer) from public, anon;
revoke all on function public.admin_decide_appeal(uuid, text, text, integer) from public, anon;
revoke all on function public.admin_attachment_review_queue(text, integer) from public, anon;
revoke all on function public.admin_review_conversation_attachment(uuid, text, text, text, integer) from public, anon;
revoke all on function public.record_conversation_attachment_scan(uuid, text, text, text, text, text, timestamptz) from public, anon, authenticated;

grant execute on function public.admin_trust_case_queue(text, text, boolean, timestamptz, uuid, integer) to authenticated, service_role;
grant execute on function public.admin_assign_trust_case(text, uuid, text, text, integer) to authenticated, service_role;
grant execute on function public.admin_decide_trust_case(text, uuid, text, text, text, text, uuid) to authenticated, service_role;
grant execute on function public.list_my_moderation_notices(integer) to authenticated, service_role;
grant execute on function public.submit_my_moderation_appeal(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.admin_appeal_queue(text, integer) to authenticated, service_role;
grant execute on function public.admin_assign_appeal(uuid, text, integer) to authenticated, service_role;
grant execute on function public.admin_decide_appeal(uuid, text, text, integer) to authenticated, service_role;
grant execute on function public.admin_attachment_review_queue(text, integer) to authenticated, service_role;
grant execute on function public.admin_review_conversation_attachment(uuid, text, text, text, integer) to authenticated, service_role;
grant execute on function public.record_conversation_attachment_scan(uuid, text, text, text, text, text, timestamptz) to service_role;

comment on function public.record_conversation_attachment_scan(uuid, text, text, text, text, text, timestamptz) is
  'Service-role-only scanner result boundary. Browser and human review cannot publish a clean attachment verdict.';
