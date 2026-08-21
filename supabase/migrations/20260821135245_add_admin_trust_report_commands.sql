-- First transactional Trust & Safety workflow for the separate admin app.
-- Browser users cannot mutate report rows directly through this boundary: the
-- command is capability checked, reasoned, concurrency safe and audited.

create table private.admin_operation_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  capability text not null,
  domain text not null,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint admin_operation_events_capability_check check (
    capability ~ '^[a-z][a-z0-9_.-]{2,79}$'
  ),
  constraint admin_operation_events_domain_check check (
    domain in ('trust', 'members', 'content', 'programs', 'io', 'team')
  ),
  constraint admin_operation_events_action_check check (
    action ~ '^[a-z][a-z0-9_.-]{2,79}$'
  ),
  constraint admin_operation_events_target_type_check check (
    target_type ~ '^[a-z][a-z0-9_.-]{2,79}$'
  ),
  constraint admin_operation_events_reason_check check (
    char_length(btrim(reason)) between 8 and 500
  ),
  constraint admin_operation_events_metadata_check check (
    jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 2048
  )
);

create index admin_operation_events_time_idx
  on private.admin_operation_events (occurred_at desc, id desc);
create index admin_operation_events_target_time_idx
  on private.admin_operation_events (target_type, target_id, occurred_at desc, id desc);
create index admin_operation_events_actor_time_idx
  on private.admin_operation_events (actor_user_id, occurred_at desc, id desc);

alter table private.admin_operation_events enable row level security;
revoke all on private.admin_operation_events from public, anon, authenticated;
grant select, insert on private.admin_operation_events to service_role;

create or replace function public.admin_report_queue(
  _before_created_at timestamptz default null,
  _before_id uuid default null,
  _limit integer default 25
)
returns table (
  report_id uuid,
  target_type text,
  target_id uuid,
  report_reason text,
  report_status text,
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
  if bounded_limit < 1 or bounded_limit > 100 then
    raise exception 'Report queue limit must be between 1 and 100';
  end if;
  if (_before_created_at is null) <> (_before_id is null) then
    raise exception 'Report queue cursor is incomplete';
  end if;

  return query
  select
    report.id,
    report.target_type,
    report.target_id,
    report.reason,
    report.status,
    report.resolution_note,
    report.created_at,
    report.resolved_at
  from public.reports as report
  where _before_created_at is null
    or (report.created_at, report.id) < (_before_created_at, _before_id)
  order by report.created_at desc, report.id desc
  limit bounded_limit;
end;
$function$;

revoke all on function public.admin_report_queue(timestamptz, uuid, integer)
  from public, anon;
grant execute on function public.admin_report_queue(timestamptz, uuid, integer)
  to authenticated, service_role;

create or replace function public.admin_resolve_report(
  _report_id uuid,
  _outcome text,
  _reason text,
  _expected_status text default 'open'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_reason text := btrim(coalesce(_reason, ''));
  report_row public.reports%rowtype;
begin
  if not private.has_admin_capability(caller_id, 'trust.manage') then
    raise exception 'Trust operations access required' using errcode = '42501';
  end if;
  if _outcome not in ('actioned', 'dismissed') then
    raise exception 'Report outcome must be actioned or dismissed';
  end if;
  if _expected_status not in ('open', 'actioned', 'dismissed') then
    raise exception 'Expected report status is invalid';
  end if;
  if char_length(normalized_reason) < 8 or char_length(normalized_reason) > 500 then
    raise exception 'Report resolution reason must be between 8 and 500 characters';
  end if;

  select * into report_row
  from public.reports as report
  where report.id = _report_id
  for update;
  if not found then
    raise exception 'Report does not exist';
  end if;

  if report_row.status in ('actioned', 'dismissed') then
    if report_row.status = _outcome
      and report_row.resolver_id = caller_id
      and report_row.resolution_note = normalized_reason then
      return jsonb_build_object(
        'ok', true,
        'replayed', true,
        'reportId', report_row.id,
        'status', report_row.status,
        'resolvedAt', report_row.resolved_at
      );
    end if;
    raise exception 'Report was already resolved';
  end if;
  if report_row.status <> _expected_status then
    raise exception 'Report state changed; refresh before resolving';
  end if;

  update public.reports
  set
    status = _outcome,
    resolution_note = normalized_reason,
    resolver_id = caller_id,
    resolved_at = now()
  where id = report_row.id
  returning * into report_row;

  insert into private.admin_operation_events (
    actor_user_id,
    capability,
    domain,
    action,
    target_type,
    target_id,
    reason,
    metadata
  ) values (
    caller_id,
    'trust.manage',
    'trust',
    'report.' || _outcome,
    'report',
    report_row.id,
    normalized_reason,
    jsonb_build_object(
      'fromStatus', _expected_status,
      'toStatus', report_row.status,
      'reportedTargetType', report_row.target_type
    )
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'reportId', report_row.id,
    'status', report_row.status,
    'resolvedAt', report_row.resolved_at
  );
end;
$function$;

revoke all on function public.admin_resolve_report(uuid, text, text, text)
  from public, anon;
grant execute on function public.admin_resolve_report(uuid, text, text, text)
  to authenticated, service_role;

comment on table private.admin_operation_events is
  'Append-only, reasoned evidence for capability-checked admin domain commands.';
comment on function public.admin_report_queue(timestamptz, uuid, integer) is
  'Cursor-paginated Trust & Safety queue. Reporter identity is deliberately omitted.';
comment on function public.admin_resolve_report(uuid, text, text, text) is
  'Concurrency-safe report resolution command with capability checks, reason and append-only audit evidence.';
