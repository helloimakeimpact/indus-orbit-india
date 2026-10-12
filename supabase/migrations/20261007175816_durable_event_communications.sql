-- Transactional event communications. All recipient data stays in private,
-- service-only storage; browsers cannot enqueue or claim arbitrary mail.
alter table private.event_registrations add column communication_version integer not null default 1;
create table private.event_delivery_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid not null references private.event_registrations(id) on delete cascade,
  kind text not null check (kind in ('registration','changed','cancelled','reminder_24h','reminder_1h')),
  registration_version integer not null,
  registration_status text not null,
  event_revision integer not null,
  status text not null default 'pending' check (status in ('pending','processing','delivered','suppressed','dead')),
  due_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  lease_token uuid,
  leased_at timestamptz,
  first_attempt_at timestamptz,
  recipient_email text,
  template_data jsonb,
  prepared_payload jsonb,
  delivered_at timestamptz,
  provider_message_id text,
  error_code text,
  created_at timestamptz not null default now(),
  unique (registration_id,kind,registration_version,event_revision)
);
create index event_delivery_due_idx on private.event_delivery_outbox(due_at,created_at)
  where status in ('pending','processing');
create index event_delivery_event_idx on private.event_delivery_outbox(event_id);
alter table private.event_delivery_outbox enable row level security;
revoke all on private.event_delivery_outbox from public,anon,authenticated;
grant select on private.event_delivery_outbox to service_role;

create function private.event_communication_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op='UPDATE' then
    new.communication_version := old.communication_version + case when new.status is distinct from old.status then 1 else 0 end;
  else new.communication_version := 1;
  end if;
  return new;
end;
$$;
create trigger event_communication_version before insert or update on private.event_registrations
  for each row execute function private.event_communication_version();

create function private.enqueue_event_communication(_registration_id uuid,_kind text)
returns void language plpgsql security definer set search_path = '' as $$
declare r private.event_registrations%rowtype; e public.events%rowtype; rev integer; due timestamptz;
begin
  select * into r from private.event_registrations where id=_registration_id;
  select * into e from public.events where id=r.event_id;
  if e.id is null then return; end if;
  rev := coalesce((select max(revision) from private.event_edit_history where event_id=e.id),0);
  due := case _kind when 'reminder_24h' then e.start_time-interval '24 hours'
    when 'reminder_1h' then e.start_time-interval '1 hour' else now() end;
  -- Do not catch up a reminder whose threshold has already passed.
  if _kind like 'reminder_%' and (r.status<>'confirmed' or due<=now()) then return; end if;
  insert into private.event_delivery_outbox(event_id,registration_id,kind,registration_version,registration_status,event_revision,due_at)
    values(e.id,r.id,_kind,r.communication_version,r.status,rev,due)
    on conflict(registration_id,kind,registration_version,event_revision) do nothing;
end;
$$;

create function private.event_registration_communication()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='INSERT' or new.status is distinct from old.status then
    perform private.enqueue_event_communication(new.id,'registration');
    if new.status='confirmed' then
      perform private.enqueue_event_communication(new.id,'reminder_24h');
      perform private.enqueue_event_communication(new.id,'reminder_1h');
    end if;
  end if;
  return new;
end;
$$;
create trigger event_registration_communication after insert or update on private.event_registrations
  for each row execute function private.event_registration_communication();

create function private.event_change_communication()
returns trigger language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  for rid in select id from private.event_registrations where event_id=new.event_id and status in ('confirmed','pending','waitlisted') loop
    perform private.enqueue_event_communication(rid,'changed');
    perform private.enqueue_event_communication(rid,'reminder_24h');
    perform private.enqueue_event_communication(rid,'reminder_1h');
  end loop;
  return new;
end;
$$;
create trigger event_change_communication after insert on private.event_edit_history
  for each row execute function private.event_change_communication();

create function private.event_cancel_communication()
returns trigger language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  if new.lifecycle='cancelled' and old.lifecycle is distinct from new.lifecycle then
    for rid in select id from private.event_registrations where event_id=new.id and status in ('confirmed','pending','waitlisted') loop
      perform private.enqueue_event_communication(rid,'cancelled');
    end loop;
  end if;
  return new;
end;
$$;
create trigger event_cancel_communication after update of lifecycle on public.events
  for each row execute function private.event_cancel_communication();

create function private.event_delivery_email(_registration_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case when r.user_id is null then r.guest_email else
    (select lower(u.email) from auth.users u where u.id=r.user_id and u.email_confirmed_at is not null) end
  from private.event_registrations r where r.id=_registration_id;
$$;

create function private.event_delivery_current(_job private.event_delivery_outbox)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select
    r.communication_version=_job.registration_version and r.status=_job.registration_status
    and coalesce((select max(revision) from private.event_edit_history where event_id=e.id),0)=_job.event_revision
    and (_job.recipient_email is null or _job.recipient_email=private.event_delivery_email(r.id))
    and (r.user_id is null or not public.is_suspended(r.user_id))
    and not exists(select 1 from auth.users u where lower(u.email)=r.guest_email and public.is_suspended(u.id))
    and case when _job.kind='cancelled' then e.lifecycle='cancelled'
      else e.lifecycle='scheduled' and e.status='approved' and e.end_time>now()
        and (r.status in ('cancelled','rejected') or private.event_registration_eligible(r.id))
        and (_job.kind not like 'reminder_%' or (r.status='confirmed' and r.checked_in_at is null and e.start_time>now())) end
  from private.event_registrations r join public.events e on e.id=r.event_id where r.id=_job.registration_id),false);
$$;

create function private.claim_event_delivery_batch(_limit integer default 10)
returns table(id uuid,lease_token uuid,recipient_email text,template_key text,template_data jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then
    raise exception using errcode='42501',message='Service role required'; end if;
  -- Obsolete jobs are suppressed even when their last lease also exhausted
  -- retries. Dead letters describe current delivery failures, not old edits.
  update private.event_delivery_outbox o set status='suppressed',error_code='superseded',lease_token=null,leased_at=null
    where (o.status='pending' or (o.status='processing' and o.leased_at<now()-interval '5 minutes'))
      and not private.event_delivery_current(o);
  -- Recover crashed final attempts and bound automatic retries inside Resend's
  -- 24-hour idempotency window. Never resend an ambiguous result after it.
  update private.event_delivery_outbox o set status='dead',error_code='retry_window_exhausted',lease_token=null,leased_at=null
    where (o.status='pending' or (o.status='processing' and o.leased_at<now()-interval '5 minutes'))
      and (o.attempt_count>=5 or o.first_attempt_at<now()-interval '20 hours');
  update private.event_delivery_outbox o set status='dead',error_code='recipient_unavailable',lease_token=null,leased_at=null
    where (o.status='pending' or (o.status='processing' and o.leased_at<now()-interval '5 minutes'))
      and private.event_delivery_email(o.registration_id) is null;

  return query with due as (
    select o.id from private.event_delivery_outbox o where
      ((o.status='pending' and o.due_at<=now()) or (o.status='processing' and o.leased_at<now()-interval '5 minutes'))
      and o.attempt_count<5
      order by o.due_at,o.created_at,o.id limit greatest(1,least(coalesce(_limit,10),20))
      for update skip locked
  ), claimed as (
    update private.event_delivery_outbox o set status='processing',attempt_count=o.attempt_count+1,
      lease_token=gen_random_uuid(),leased_at=now(),first_attempt_at=coalesce(o.first_attempt_at,now()),
      recipient_email=coalesce(o.recipient_email,private.event_delivery_email(o.registration_id)),
      template_data=coalesce(o.template_data,jsonb_build_object('event_id',e.id,'title',e.title,'start_time',e.start_time,
        'end_time',e.end_time,'timezone',e.timezone,'public_location',e.public_location,'kind',o.kind,
        'registration_status',o.registration_status,'guest',r.user_id is null))
    from due,public.events e,private.event_registrations r
    where o.id=due.id and e.id=o.event_id and r.id=o.registration_id
    returning o.*
  ) select c.id,c.lease_token,c.recipient_email,'event_transactional'::text,c.template_data from claimed c;
end;
$$;

create function private.event_delivery_ready(_id uuid,_lease_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare o private.event_delivery_outbox%rowtype;
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then
    raise exception using errcode='42501',message='Service role required'; end if;
  select * into o from private.event_delivery_outbox where id=_id for update;
  if not found or o.status<>'processing' or o.lease_token is distinct from _lease_token or o.leased_at<now()-interval '5 minutes' then return false; end if;
  if not private.event_delivery_current(o) then
    update private.event_delivery_outbox set status='suppressed',error_code='superseded',lease_token=null,leased_at=null where id=_id;
    return false;
  end if;
  return true;
end;
$$;

create function private.prepare_event_delivery(_id uuid,_lease_token uuid,_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o private.event_delivery_outbox%rowtype; k text;
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then
    raise exception using errcode='42501',message='Service role required'; end if;
  select * into o from private.event_delivery_outbox where id=_id for update;
  if not found or o.status<>'processing' or o.lease_token is distinct from _lease_token or o.leased_at<now()-interval '5 minutes' then
    raise exception using errcode='22023',message='Delivery lease is invalid or expired'; end if;
  if not private.event_delivery_current(o) then
    update private.event_delivery_outbox set status='suppressed',error_code='superseded',lease_token=null,leased_at=null where id=_id;
    return null;
  end if;
  if o.prepared_payload is not null then return o.prepared_payload; end if;
  if jsonb_typeof(_payload) is distinct from 'object' or _payload->'to' is distinct from jsonb_build_array(o.recipient_email)
    or exists(select 1 from jsonb_object_keys(_payload) a(key) where key not in ('from','to','subject','text','html')) then
    raise exception using errcode='22023',message='Invalid transactional email payload'; end if;
  foreach k in array array['from','subject','text','html'] loop
    if jsonb_typeof(_payload->k) is distinct from 'string' or char_length(_payload->>k) not between 1 and
      (case k when 'from' then 320 when 'subject' then 350 when 'text' then 15000 else 30000 end) then
      raise exception using errcode='22023',message='Invalid transactional email payload'; end if;
  end loop;
  if position(chr(10) in (_payload->>'from'))>0 or position(chr(13) in (_payload->>'from'))>0
    or position(chr(10) in (_payload->>'subject'))>0 or position(chr(13) in (_payload->>'subject'))>0 then
    raise exception using errcode='22023',message='Invalid transactional email headers'; end if;
  update private.event_delivery_outbox set prepared_payload=_payload where id=_id;
  return _payload;
end;
$$;
create function public.prepare_event_delivery(_id uuid,_lease_token uuid,_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin return private.prepare_event_delivery(_id,_lease_token,_payload); end;
$$;
revoke all on function private.prepare_event_delivery(uuid,uuid,jsonb),public.prepare_event_delivery(uuid,uuid,jsonb)
  from public,anon,authenticated;
grant execute on function private.prepare_event_delivery(uuid,uuid,jsonb),public.prepare_event_delivery(uuid,uuid,jsonb)
  to service_role;


create function private.complete_event_delivery(_id uuid,_lease_token uuid,_succeeded boolean,_provider_message_id text default null,_error_code text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare o private.event_delivery_outbox%rowtype;
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then
    raise exception using errcode='42501',message='Service role required'; end if;
  if _succeeded is null then raise exception using errcode='22023',message='Delivery result required'; end if;
  select * into o from private.event_delivery_outbox where id=_id for update;
  if not found or o.status<>'processing' or o.lease_token is distinct from _lease_token or o.leased_at<now()-interval '5 minutes' then
    raise exception using errcode='22023',message='Delivery lease is invalid or expired'; end if;
  if _succeeded then
    update private.event_delivery_outbox set status='delivered',delivered_at=now(),
      provider_message_id=case when _provider_message_id~'^[a-zA-Z0-9_-]{1,120}$' then _provider_message_id else null end,
      error_code=null,lease_token=null,leased_at=null where id=_id;
  else
    update private.event_delivery_outbox set status=case when attempt_count>=5 then 'dead' else 'pending' end,
      due_at=now()+make_interval(secs=>least(3600,30*(2^attempt_count))::integer),
      error_code=case when _error_code in ('provider_rejected','provider_unavailable','invalid_template','delivery_unconfirmed') then _error_code else 'delivery_unconfirmed' end,
      lease_token=null,leased_at=null where id=_id;
  end if;
end;
$$;

-- Invoker wrappers expose only bounded service contracts.
create function public.claim_event_delivery_batch(_limit integer default 10)
returns table(id uuid,lease_token uuid,recipient_email text,template_key text,template_data jsonb)
language plpgsql security invoker set search_path='' as $$
begin
  return query select * from private.claim_event_delivery_batch(_limit);
end;
$$;
create function public.event_delivery_ready(_id uuid,_lease_token uuid)
returns boolean language sql security invoker set search_path='' as $$ select private.event_delivery_ready(_id,_lease_token); $$;
create function public.complete_event_delivery(_id uuid,_lease_token uuid,_succeeded boolean,_provider_message_id text default null,_error_code text default null)
returns void language sql security invoker set search_path='' as $$ select private.complete_event_delivery(_id,_lease_token,_succeeded,_provider_message_id,_error_code); $$;

revoke all on function private.event_communication_version(),private.enqueue_event_communication(uuid,text),
  private.event_registration_communication(),private.event_change_communication(),private.event_cancel_communication(),
  private.event_delivery_email(uuid),private.event_delivery_current(private.event_delivery_outbox),
  private.claim_event_delivery_batch(integer),private.event_delivery_ready(uuid,uuid),
  private.complete_event_delivery(uuid,uuid,boolean,text,text),
  public.claim_event_delivery_batch(integer),public.event_delivery_ready(uuid,uuid),
  public.complete_event_delivery(uuid,uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function private.claim_event_delivery_batch(integer),private.event_delivery_ready(uuid,uuid),
  private.complete_event_delivery(uuid,uuid,boolean,text,text),
  public.claim_event_delivery_batch(integer),public.event_delivery_ready(uuid,uuid),
  public.complete_event_delivery(uuid,uuid,boolean,text,text) to service_role;

-- Existing confirmed registrations receive future reminders, not a historical
-- confirmation email. No backfill sends real mail by itself.
do $$ declare r record; begin
  for r in select id from private.event_registrations where status='confirmed' loop
    perform private.enqueue_event_communication(r.id,'reminder_24h');
    perform private.enqueue_event_communication(r.id,'reminder_1h');
  end loop;
end $$;
