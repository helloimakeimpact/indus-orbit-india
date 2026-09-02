-- Operational queues for trusted attachment scanning and fixed-template
-- notification delivery. Worker claims are leased and operator actions are
-- capability checked, reasoned and audited.

alter table public.conversation_attachments
  add column scan_attempt_count integer not null default 0 check (scan_attempt_count between 0 and 20),
  add column scan_next_attempt_at timestamptz not null default now(),
  add column scan_lease_token uuid,
  add column scan_leased_at timestamptz,
  add column scan_last_error_code text,
  add constraint conversation_attachments_scan_lease_check check (
    (scan_lease_token is null and scan_leased_at is null)
    or (scan_lease_token is not null and scan_leased_at is not null)
  ),
  add constraint conversation_attachments_scan_error_check check (
    scan_last_error_code is null or scan_last_error_code ~ '^[a-z][a-z0-9_.-]{1,79}$'
  );

create index conversation_attachments_scan_due_idx
  on public.conversation_attachments (scan_next_attempt_at, created_at, id)
  where scan_status = 'pending';

create or replace function public.claim_conversation_attachment_scan_batch(_limit integer default 10)
returns table (
  id uuid,
  lease_token uuid,
  storage_bucket text,
  storage_path text,
  file_name text,
  content_type text,
  byte_size bigint,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  return query
  with due as (
    select attachment.id
    from public.conversation_attachments as attachment
    where attachment.scan_status = 'pending'
      and attachment.scan_next_attempt_at <= statement_timestamp()
      and attachment.scan_attempt_count < 5
      and (
        attachment.scan_lease_token is null
        or attachment.scan_leased_at < statement_timestamp() - interval '10 minutes'
      )
    order by attachment.scan_next_attempt_at, attachment.created_at, attachment.id
    for update skip locked
    limit greatest(1, least(coalesce(_limit, 10), 50))
  ), claimed as (
    update public.conversation_attachments as attachment
    set scan_lease_token = gen_random_uuid(),
        scan_leased_at = statement_timestamp(),
        scan_started_at = coalesce(attachment.scan_started_at, statement_timestamp()),
        scan_attempt_count = attachment.scan_attempt_count + 1,
        scan_last_error_code = null
    from due where attachment.id = due.id
    returning attachment.*
  )
  select claimed.id, claimed.scan_lease_token, claimed.storage_bucket,
    claimed.storage_path, claimed.file_name, claimed.content_type,
    claimed.byte_size, claimed.scan_attempt_count
  from claimed;
end;
$function$;

create or replace function public.complete_conversation_attachment_scan_attempt(
  _attachment_id uuid,
  _lease_token uuid,
  _submitted boolean,
  _error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare attachment_row public.conversation_attachments%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  select * into attachment_row from public.conversation_attachments
  where id = _attachment_id for update;
  if not found or attachment_row.scan_lease_token is distinct from _lease_token then
    raise exception 'Attachment scan lease is invalid or expired' using errcode = '22023';
  end if;
  if _submitted then
    if attachment_row.scan_status = 'pending' then
      raise exception 'Scanner result must be recorded before completing the lease' using errcode = '22023';
    end if;
    update public.conversation_attachments
    set scan_lease_token = null, scan_leased_at = null, scan_last_error_code = null
    where id = _attachment_id;
  else
    if coalesce(_error_code, '') !~ '^[a-z][a-z0-9_.-]{1,79}$' then
      raise exception 'A normalized scanner error code is required' using errcode = '22023';
    end if;
    update public.conversation_attachments
    set scan_status = case when scan_attempt_count >= 5 then 'failed' else 'pending' end,
        scan_finished_at = case when scan_attempt_count >= 5 then statement_timestamp() else null end,
        scan_next_attempt_at = statement_timestamp()
          + make_interval(secs => least(3600, 15 * (2 ^ scan_attempt_count))::integer),
        scan_lease_token = null,
        scan_leased_at = null,
        scan_last_error_code = _error_code,
        threat_code = case when scan_attempt_count >= 5 then 'scanner_retry_exhausted' else threat_code end
    where id = _attachment_id;
  end if;
  return jsonb_build_object('attachmentId', _attachment_id, 'submitted', _submitted);
end;
$function$;

create or replace function public.admin_notification_delivery_queue(
  _status text default 'attention',
  _limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare caller_id uuid := auth.uid(); result jsonb;
begin
  if not private.has_admin_capability(caller_id, 'trust.manage') then
    raise exception 'Notification operations access is required' using errcode = '42501';
  end if;
  if _status not in ('attention', 'pending', 'processing', 'delivered', 'dead')
    or _limit not between 1 and 250 then
    raise exception 'Notification queue filter is invalid' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', job.id,
    'eventKey', job.event_key,
    'templateKey', job.template_key,
    'status', job.status,
    'attemptCount', job.attempt_count,
    'nextAttemptAt', job.next_attempt_at,
    'lastError', job.last_error,
    'createdAt', job.created_at,
    'updatedAt', job.updated_at
  ) order by job.updated_at desc, job.id desc), '[]'::jsonb) into result
  from (select * from private.email_delivery_outbox as outbox
    where (_status = 'attention' and outbox.status in ('pending', 'processing', 'dead'))
      or (_status <> 'attention' and outbox.status = _status)
    order by outbox.updated_at desc limit _limit
  ) as job;
  return result;
end;
$function$;

create or replace function public.admin_set_notification_delivery_state(
  _id uuid,
  _action text,
  _reason text,
  _expected_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
  job private.email_delivery_outbox%rowtype;
  normalized_reason text := btrim(coalesce(_reason, ''));
begin
  if not private.has_admin_capability(caller_id, 'trust.manage') then
    raise exception 'Notification operations access is required' using errcode = '42501';
  end if;
  if _action not in ('retry', 'dead') or char_length(normalized_reason) not between 8 and 500 then
    raise exception 'A valid action and reason are required' using errcode = '22023';
  end if;
  select * into job from private.email_delivery_outbox where id = _id for update;
  if not found or job.status <> _expected_status then
    raise exception 'Notification job changed; refresh before acting' using errcode = '40001';
  end if;
  update private.email_delivery_outbox
  set status = case when _action = 'retry' then 'pending' else 'dead' end,
      attempt_count = case when _action = 'retry' then 0 else attempt_count end,
      next_attempt_at = case when _action = 'retry' then statement_timestamp() else next_attempt_at end,
      lease_token = null,
      leased_at = null,
      last_error = case when _action = 'retry' then null else 'Stopped by an operator' end,
      updated_at = statement_timestamp()
  where id = _id;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, 'trust.manage', 'notifications', 'delivery.' || _action,
    'email_delivery', _id, normalized_reason,
    jsonb_build_object('fromStatus', _expected_status)
  );
  return jsonb_build_object('id', _id, 'status', case when _action = 'retry' then 'pending' else 'dead' end);
end;
$function$;

revoke all on function public.claim_conversation_attachment_scan_batch(integer) from public, anon, authenticated;
revoke all on function public.complete_conversation_attachment_scan_attempt(uuid, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.admin_notification_delivery_queue(text, integer) from public, anon;
revoke all on function public.admin_set_notification_delivery_state(uuid, text, text, text) from public, anon;
grant execute on function public.claim_conversation_attachment_scan_batch(integer) to service_role;
grant execute on function public.complete_conversation_attachment_scan_attempt(uuid, uuid, boolean, text) to service_role;
grant execute on function public.admin_notification_delivery_queue(text, integer) to authenticated, service_role;
grant execute on function public.admin_set_notification_delivery_state(uuid, text, text, text) to authenticated, service_role;

comment on function public.claim_conversation_attachment_scan_batch(integer) is
  'Service-only leased attachment queue. Storage contents and signed URLs are never returned to a browser.';
comment on function public.admin_set_notification_delivery_state(uuid, text, text, text) is
  'Trust-operator retry/dead-letter control with optimistic status agreement, a reason and an append-only audit event.';
