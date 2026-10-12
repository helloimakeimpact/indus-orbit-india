-- Host changes preserve publication authority and registration conditions.
-- Locking the same parent row as registration/cancellation serializes changes.
create table private.event_edit_history (
  event_id uuid not null references public.events(id) on delete cascade,
  revision integer not null check (revision > 0),
  actor_id uuid references auth.users(id) on delete set null,
  request_id uuid not null,
  fingerprint text not null,
  changed_fields text[] not null,
  summary jsonb not null,
  reason text not null check (char_length(btrim(reason)) between 8 and 500),
  created_at timestamptz not null default now(),
  primary key(event_id,revision),
  unique(actor_id,request_id)
);
create index event_edit_history_actor_idx on private.event_edit_history(actor_id);
create index event_guest_links_registered_event_idx on private.event_guest_links(event_id) where registration_id is not null;
alter table private.event_edit_history enable row level security;
revoke all on private.event_edit_history from public,anon,authenticated;

create or replace function public.get_host_event_draft(_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare e public.events%rowtype; d private.event_access_details%rowtype;
begin
  if not private.event_can_manage(_event_id,auth.uid()) then
    raise exception using errcode = '42501', message = 'Event host access required'; end if;
  select * into e from public.events where id = _event_id;
  select * into d from private.event_access_details where event_id = _event_id;
  return jsonb_build_object('id',e.id,'revision',coalesce((select max(revision) from private.event_edit_history where event_id=e.id),0),
    'draft',jsonb_build_object('title',e.title,'description',e.description,'startTime',e.start_time,'endTime',e.end_time,
      'timezone',e.timezone,'locationType',e.location_type,'location',coalesce(d.location,''),'link',coalesce(d.join_url,''),
      'publicLocation',coalesce(e.public_location,''),'chapterId',coalesce(e.chapter_id::text,''),'coverTemplate',e.cover_template,
      'visibility',e.visibility,'registrationScope',e.registration_scope,'capacity',coalesce(e.capacity::text,''),'requiresApproval',e.requires_approval),
    'history',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select revision,changed_fields,summary,reason,created_at from private.event_edit_history where event_id=e.id order by revision desc limit 10
    ) x),'[]'::jsonb));
end;
$$;
revoke all on function public.get_host_event_draft(uuid) from public,anon;
grant execute on function public.get_host_event_draft(uuid) to authenticated;

create or replace function public.update_hosted_event(_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); e public.events%rowtype; d private.event_access_details%rowtype;
  previous private.event_edit_history%rowtype; current_revision integer; fields text[] := '{}'; k text;
  eid uuid := (_input->>'eventId')::uuid; rid uuid := (_input->>'clientRequestId')::uuid;
  fingerprint text := encode(extensions.digest((_input - 'expectedUserId' - 'clientRequestId')::text,'sha256'),'hex');
  title_text text := btrim(_input->>'title'); description_text text := btrim(_input->>'description');
  start_at timestamptz := (_input->>'startTime')::timestamptz; end_at timestamptz := (_input->>'endTime')::timestamptz;
  zone text := _input->>'timezone'; format text := _input->>'locationType'; cover text := _input->>'coverTemplate';
  venue text := nullif(btrim(_input->>'location'),''); url text := nullif(btrim(_input->>'link'),'');
  public_place text := nullif(btrim(_input->>'publicLocation'),''); reason_text text := btrim(_input->>'reason');
begin
  if actor is null or (_input->>'expectedUserId')::uuid is distinct from actor then
    raise exception using errcode = '42501', message = 'Account changed; retry from your current account'; end if;
  select * into e from public.events where id=eid for update;
  if not found or not private.event_can_manage(eid,actor) then
    raise exception using errcode = '42501', message = 'Event host access required'; end if;
  if rid is null then raise exception using errcode = '22023', message = 'Change request ID required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('event-edit:'||actor::text||':'||rid::text,0));
  select * into previous from private.event_edit_history where actor_id=actor and request_id=rid;
  if found then
    if previous.event_id<>eid or previous.fingerprint<>fingerprint then
      raise exception using errcode = '22023', message = 'Change request ID was used for different content'; end if;
    return jsonb_build_object('id',eid,'revision',previous.revision,'status',e.status);
  end if;
  if e.lifecycle<>'scheduled' or e.start_time<=now() or e.status not in ('pending','approved') then
    raise exception using errcode = '22023', message = 'Only upcoming scheduled events can be edited'; end if;
  if e.status='approved' and not (private.event_operator(actor) or (
    exists(select 1 from private.event_host_approvals h where h.user_id=actor and h.approved)
    and (e.chapter_id is null or public.is_chapter_lead(actor,e.chapter_id)))) then
    raise exception using errcode = '42501', message = 'Approved host or content reviewer access required to change a published event'; end if;
  current_revision := coalesce((select max(revision) from private.event_edit_history where event_id=eid),0);
  if (_input->>'expectedRevision')::integer is distinct from current_revision then
    raise exception using errcode = '40001', message = 'This event changed. Reopen the editor before saving'; end if;
  if exists(select 1 from jsonb_object_keys(_input) a(key) where key not in ('eventId','clientRequestId','expectedUserId','expectedRevision','reason',
    'title','description','startTime','endTime','timezone','locationType','location','link','publicLocation','coverTemplate')) then
    raise exception using errcode = '22023', message = 'Registration and publication settings cannot be changed by this editor'; end if;
  if title_text is null or char_length(title_text) not between 3 and 160 or description_text is null or char_length(description_text) not between 10 and 10000
    or start_at is null or end_at is null or start_at<=now() or end_at<=start_at or end_at>start_at+interval '30 days'
    or zone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=zone)
    or format is null or format not in ('virtual','irl') or cover is null or cover not in ('dawn','lotus','banyan')
    or char_length(coalesce(public_place,''))>160 or char_length(coalesce(venue,''))>1000 or char_length(coalesce(url,''))>2048
    or (url is not null and url !~ '^https://[^[:space:]]+$') or (format='irl' and venue is null) or (format='virtual' and url is null)
    or reason_text is null or char_length(reason_text) not between 8 and 500 then
    raise exception using errcode = '22023', message = 'Check the event details, dates and change reason'; end if;
  select * into d from private.event_access_details where event_id=eid;
  for k in select key from jsonb_each(jsonb_build_object(
    'title',title_text is distinct from e.title,'description',description_text is distinct from e.description,
    'startTime',start_at is distinct from e.start_time,'endTime',end_at is distinct from e.end_time,'timezone',zone is distinct from e.timezone,
    'locationType',format is distinct from e.location_type,'publicLocation',public_place is distinct from e.public_location,
    'coverTemplate',cover is distinct from e.cover_template,'location',venue is distinct from d.location,'link',url is distinct from d.join_url)) where value='true'::jsonb
  loop fields := array_append(fields,k); end loop;
  if cardinality(fields)=0 then raise exception using errcode = '22023', message = 'No event details changed'; end if;
  update public.events set title=title_text,description=description_text,start_time=start_at,end_time=end_at,
    timezone=zone,location_type=format,public_location=public_place,cover_template=cover where id=eid;
  insert into private.event_access_details(event_id,location,join_url) values(eid,venue,url)
    on conflict(event_id) do update set location=excluded.location,join_url=excluded.join_url;
  -- Preserve active verified receipts across rescheduling. Never revive an
  -- expired credential or extend the initial 15-minute email-proof challenge.
  update private.event_guest_links set expires_at=end_at+interval '7 days'
    where event_id=eid and registration_id is not null and expires_at>now();
  insert into private.event_edit_history(event_id,revision,actor_id,request_id,fingerprint,changed_fields,summary,reason)
    values(eid,current_revision+1,actor,rid,fingerprint,fields,
      jsonb_build_object('title',title_text,'startTime',start_at,'endTime',end_at,'timezone',zone,'publicLocation',public_place),reason_text);
  insert into public.audit_log(actor_id,action,target_type,target_id,reason) values(actor,'event.edited','event',eid,reason_text);
  return jsonb_build_object('id',eid,'revision',current_revision+1,'status',e.status);
end;
$$;
revoke all on function public.update_hosted_event(jsonb) from public,anon;
grant execute on function public.update_hosted_event(jsonb) to authenticated;

-- Main review UI must approve the version it actually inspected.
create or replace function public.review_event_revision(_event_id uuid,_expected_revision integer,_approved boolean,_reason text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform private.review_event_revision(_event_id,_expected_revision,_approved,_reason);
end;
$$;
-- The privileged helper still derives the reviewer and MFA from the JWT.
create or replace function private.review_event_revision(_event_id uuid,_expected_revision integer,_approved boolean,_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype;
begin
  select * into e from public.events where id=_event_id for update;
  if not found or not (private.event_operator(auth.uid()) or (e.chapter_id is not null and e.organizer_id<>auth.uid()
    and private.event_member_eligible(auth.uid(),e.chapter_id,'chapter') and public.is_chapter_lead(auth.uid(),e.chapter_id))) then
    raise exception using errcode = '42501', message = 'Event review access required'; end if;
  if _expected_revision is distinct from coalesce((select max(revision) from private.event_edit_history where event_id=_event_id),0) then
    raise exception using errcode = '40001', message = 'This event changed. Refresh the review before deciding'; end if;
  if _approved is null then raise exception using errcode = '22023', message = 'Review decision required'; end if;
  perform private.review_event(_event_id,_approved,_reason);
end;
$$;
revoke all on function private.review_event_revision(uuid,integer,boolean,text),public.review_event_revision(uuid,integer,boolean,text) from public,anon;
grant execute on function private.review_event_revision(uuid,integer,boolean,text),public.review_event_revision(uuid,integer,boolean,text) to authenticated;

create or replace function public.get_my_event_workspace()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid(); can_review boolean := private.event_operator(actor);
begin
  if not private.event_member_eligible(actor,null,'community') then
    raise exception using errcode = '42501', message = 'Active Community membership required'; end if;
  return jsonb_build_object(
    'approvedHost',exists(select 1 from private.event_host_approvals h where h.user_id=actor and h.approved),
    'canReviewHosts',can_review,
    'hosted',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select e.id,e.title,e.status,e.start_time,e.lifecycle from public.events e where e.organizer_id=actor order by e.created_at desc limit 100
    ) x),'[]'::jsonb),
    'review',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select e.id,e.title,e.description,e.status,e.start_time,e.end_time,e.timezone,e.location_type,e.public_location,e.organizer_id,
        d.location,d.join_url,coalesce(p.display_name,'Community host') as host_name,
        coalesce((select max(revision) from private.event_edit_history where event_id=e.id),0) as revision
      from public.events e left join public.profiles p on p.user_id=e.organizer_id left join private.event_access_details d on d.event_id=e.id
      where e.status='pending' and (can_review or (e.chapter_id is not null and e.organizer_id<>actor
        and private.event_member_eligible(actor,e.chapter_id,'chapter') and public.is_chapter_lead(actor,e.chapter_id)))
      order by e.created_at,e.id limit 100
    ) x),'[]'::jsonb)
  );
end;
$$;
