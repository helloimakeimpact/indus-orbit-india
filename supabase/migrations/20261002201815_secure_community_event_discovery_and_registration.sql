-- Native free events. Public discovery is a bounded projection; private access
-- details and guest records never live in the anonymously readable event row.
alter table public.events
  add column visibility text not null default 'public' check (visibility in ('public','unlisted','members')),
  add column timezone text not null default 'Asia/Kolkata',
  add column cover_template text not null default 'dawn' check (cover_template in ('dawn','lotus','banyan')),
  add column public_location text,
  add column capacity integer check (capacity between 1 and 100000),
  add column requires_approval boolean not null default false,
  add column registration_scope text not null default 'community' check (registration_scope in ('community','chapter')),
  add column lifecycle text not null default 'scheduled' check (lifecycle in ('scheduled','cancelled'));

create table private.event_access_details (
  event_id uuid primary key references public.events(id) on delete cascade,
  location text,
  join_url text
);
insert into private.event_access_details(event_id,location,join_url)
select id,location,link from public.events;
-- Do not derive a public city from an existing private street address or URL.
update public.events set location = null, link = null;

create table private.event_host_approvals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  approved boolean not null default false,
  reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  reason text not null check (char_length(btrim(reason)) between 8 and 500)
);
create table private.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('confirmed','pending','waitlisted','cancelled','rejected')),
  approved_at timestamptz,
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id,user_id),
  check (checked_in_at is null or status = 'confirmed')
);
create index event_registrations_event_status_idx on private.event_registrations(event_id,status,created_at,id);
create index event_registrations_user_idx on private.event_registrations(user_id,event_id);
alter table private.event_access_details enable row level security;
alter table private.event_host_approvals enable row level security;
alter table private.event_registrations enable row level security;
revoke all on private.event_access_details, private.event_host_approvals, private.event_registrations from public,anon,authenticated;

create or replace function private.event_member_eligible(_user_id uuid, _chapter_id uuid, _scope text)
returns boolean language sql stable security definer set search_path = '' as $$
  select _user_id is not null
    and not public.is_suspended(_user_id)
    and exists(select 1 from private.community_onboarding_state s where s.user_id = _user_id and s.status = 'completed')
    and (_scope = 'community' or (_scope = 'chapter' and _chapter_id is not null and exists(
      select 1 from public.chapter_members m where m.user_id = _user_id and m.chapter_id = _chapter_id and m.membership_state = 'active'
    )));
$$;
revoke all on function private.event_member_eligible(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.event_member_eligible(uuid,uuid,text) to authenticated;

create or replace function private.event_operator(_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(_user_id is not null and not public.is_suspended(_user_id)
    and (select auth.jwt()->>'aal') = 'aal2'
    and private.has_admin_capability(_user_id,'content.manage'), false);
$$;
revoke all on function private.event_operator(uuid) from public,anon,authenticated;
grant execute on function private.event_operator(uuid) to authenticated;

create or replace function private.event_can_manage(_event_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select _user_id is not null and not public.is_suspended(_user_id) and exists(
    select 1 from public.events e where e.id = _event_id and (
      private.event_operator(_user_id)
      or (e.organizer_id = _user_id and private.event_member_eligible(_user_id,e.chapter_id,e.registration_scope))
    )
  );
$$;
revoke all on function private.event_can_manage(uuid,uuid) from public,anon,authenticated;
grant execute on function private.event_can_manage(uuid,uuid) to authenticated;

-- Remove the permissive OR paths and direct browser mutation grants. Trusted
-- RPCs below derive actor, status and ownership from database state.
revoke select,insert,update,delete on public.events from anon;
revoke insert,update,delete on public.events from public,authenticated;
drop policy if exists "Anyone can view approved events" on public.events;
drop policy if exists "Users can create events" on public.events;
drop policy if exists "Chapter leads can create chapter events" on public.events;
drop policy if exists "Chapter leads can update chapter events" on public.events;
drop policy if exists "Admins can update events" on public.events;
drop policy if exists "Editors update events" on public.events;
drop policy if exists "Admins can delete events" on public.events;
create policy "Active members view approved event rows" on public.events for select to authenticated
  using (status = 'approved' and visibility in ('public','members') and private.event_member_eligible((select auth.uid()),chapter_id,registration_scope));
-- Legacy RSVP rows remain readable to their existing authorized audience, but
-- cannot bypass the new capacity/approval contract by direct upsert.
revoke insert,update,delete on public.event_rsvps from public,anon,authenticated;
drop policy if exists "Members insert own RSVP" on public.event_rsvps;
drop policy if exists "Members update own RSVP" on public.event_rsvps;
drop policy if exists "Members delete own RSVP" on public.event_rsvps;

create or replace function public.discover_events(
  _event_id uuid default null, _chapter_id uuid default null,
  _search text default '', _period text default 'upcoming', _format text default 'all',
  _offset integer default 0, _limit integer default 24
) returns table (
  id uuid,title text,description text,start_time timestamptz,end_time timestamptz,
  location_type text,public_location text,timezone text,cover_template text,
  capacity integer,requires_approval boolean,registration_scope text,lifecycle text,
  chapter_id uuid,chapter_name text,host_name text,visibility text
) language plpgsql stable security definer set search_path = '' as $$
begin
  if _offset is null or _offset < 0 or _offset > 10000 or _limit is null or _limit < 1 or _limit > 50
    or _search is null or char_length(_search) > 120 or _period is null or _period not in ('upcoming','past','all')
    or _format is null or _format not in ('all','virtual','irl') then
    raise exception using errcode = '22023', message = 'Invalid event filters';
  end if;
  return query select e.id,e.title,e.description,e.start_time,e.end_time,e.location_type,e.public_location,
    e.timezone,e.cover_template,e.capacity,e.requires_approval,e.registration_scope,e.lifecycle,
    e.chapter_id,c.name,coalesce(p.display_name,'Indus Orbit host'),e.visibility
  from public.events e left join public.chapters c on c.id = e.chapter_id
  left join public.profiles p on p.user_id = e.organizer_id
  where e.status = 'approved'
    and (_event_id is null or e.id = _event_id)
    and (e.visibility = 'public' or (e.visibility = 'unlisted' and _event_id is not null)
      or (e.visibility = 'members' and private.event_member_eligible(auth.uid(),e.chapter_id,e.registration_scope)))
    and (_chapter_id is null or e.chapter_id = _chapter_id)
    and (_event_id is not null or ((_period = 'all' or (_period = 'upcoming' and e.end_time >= now()) or (_period = 'past' and e.end_time < now()))
      and (_format = 'all' or e.location_type = _format)
      and (_search = '' or position(lower(_search) in lower(e.title || ' ' || coalesce(c.name,'') || ' ' || coalesce(e.public_location,''))) > 0)))
  order by case when _period = 'past' then null else e.start_time end asc, e.start_time desc,e.id
  limit _limit offset _offset;
end;
$$;
revoke all on function public.discover_events(uuid,uuid,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.discover_events(uuid,uuid,text,text,text,integer,integer) to anon,authenticated;

create table private.event_submission_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  fingerprint text not null,
  event_id uuid not null references public.events(id) on delete cascade,
  primary key(user_id,request_id)
);
alter table private.event_submission_requests enable row level security;
revoke all on private.event_submission_requests from public,anon,authenticated;

create or replace function public.submit_my_event(_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); eid uuid; chapter uuid; state text; start_at timestamptz; end_at timestamptz;
  title_text text := btrim(_input->>'title'); description_text text := btrim(_input->>'description');
  zone text := _input->>'timezone'; format text := _input->>'locationType'; url text := nullif(btrim(_input->>'link'),'');
  venue text := nullif(btrim(_input->>'location'),''); scope text := coalesce(_input->>'registrationScope','community');
  cover text := coalesce(_input->>'coverTemplate','dawn'); vis text := coalesce(_input->>'visibility','public');
  cap integer := nullif(_input->>'capacity','')::integer;
  submission_request_id uuid := (_input->>'clientRequestId')::uuid;
  submission_fingerprint text := encode(extensions.digest((_input - 'expectedUserId' - 'clientRequestId')::text,'sha256'),'hex');
  previous private.event_submission_requests%rowtype;
begin
  if (_input->>'expectedUserId')::uuid is distinct from actor then raise exception using errcode = '42501', message = 'Account changed; retry from your current account'; end if;
  if not private.event_member_eligible(actor,null,'community') then
    raise exception using errcode = '42501', message = 'Active Community membership required';
  end if;
  if submission_request_id is null then raise exception using errcode = '22023', message = 'Submission ID required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('event-submit:' || actor::text || ':' || submission_request_id::text,0));
  select * into previous from private.event_submission_requests r where r.user_id = actor and r.request_id = submission_request_id;
  if found then
    if previous.fingerprint <> submission_fingerprint then raise exception using errcode = '22023', message = 'Submission ID was used for another event'; end if;
    select status into state from public.events where id = previous.event_id;
    return jsonb_build_object('id',previous.event_id,'status',state);
  end if;
  chapter := nullif(_input->>'chapterId','')::uuid;
  if chapter is not null and not private.event_member_eligible(actor,chapter,'chapter') then
    raise exception using errcode = '42501', message = 'Join this chapter before submitting its event';
  end if;
  start_at := (_input->>'startTime')::timestamptz; end_at := (_input->>'endTime')::timestamptz;
  if title_text is null or char_length(title_text) not between 3 and 160
    or description_text is null or char_length(description_text) not between 10 and 10000
    or start_at is null or end_at is null or start_at <= now() or end_at <= start_at or end_at > start_at + interval '30 days'
    or zone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name = zone)
    or format is null or format not in ('virtual','irl') or cover not in ('dawn','lotus','banyan')
    or vis not in ('public','unlisted','members') or scope not in ('community','chapter') or (scope = 'chapter' and chapter is null)
    or (cap is not null and cap not between 1 and 100000) or char_length(coalesce(_input->>'publicLocation','')) > 160
    or char_length(coalesce(venue,'')) > 1000 or char_length(coalesce(url,'')) > 2048
    or (url is not null and url !~ '^https://[^[:space:]]+$')
    or (format = 'irl' and venue is null) or (format = 'virtual' and url is null) then
    raise exception using errcode = '22023', message = 'Check the event title, dates, timezone and access details';
  end if;
  state := case when exists(select 1 from private.event_host_approvals h where h.user_id = actor and h.approved)
    and (chapter is null or public.is_chapter_lead(actor,chapter)) then 'approved' else 'pending' end;
  insert into public.events(organizer_id,chapter_id,title,description,start_time,end_time,location_type,status,
    timezone,cover_template,public_location,capacity,requires_approval,registration_scope,visibility)
  values(actor,chapter,title_text,description_text,start_at,end_at,format,state,zone,cover,
    nullif(btrim(_input->>'publicLocation'),''),cap,coalesce((_input->>'requiresApproval')::boolean,false),scope,vis)
  returning id into eid;
  insert into private.event_access_details(event_id,location,join_url) values(eid,venue,url);
  insert into private.event_submission_requests(user_id,request_id,fingerprint,event_id) values(actor,submission_request_id,submission_fingerprint,eid);
  insert into public.audit_log(actor_id,action,target_type,target_id) values(actor,'event.submitted','event',eid);
  return jsonb_build_object('id',eid,'status',state);
end;
$$;
revoke all on function public.submit_my_event(jsonb) from public,anon;
grant execute on function public.submit_my_event(jsonb) to authenticated;

-- Event review does not silently approve the host's future publications.
create or replace function private.review_event(_event_id uuid,_approved boolean,_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype; actor uuid := auth.uid();
begin
  select * into e from public.events where id = _event_id for update;
  if not found then raise exception using errcode = '22023', message = 'Event not found'; end if;
  if not (private.event_operator(actor) or (e.chapter_id is not null and actor <> e.organizer_id
    and private.event_member_eligible(actor,e.chapter_id,'chapter') and public.is_chapter_lead(actor,e.chapter_id))) then
    raise exception using errcode = '42501', message = 'Event review access required';
  end if;
  if e.status <> 'pending' then raise exception using errcode = '22023', message = 'Event is no longer pending review'; end if;
  update public.events set status = case when _approved then 'approved' else 'declined' end where id = e.id;
  insert into public.audit_log(actor_id,action,target_type,target_id,reason)
    values(actor,case when _approved then 'event.approved' else 'event.declined' end,'event',e.id,left(_reason,500));
end;
$$;
revoke all on function private.review_event(uuid,boolean,text) from public,anon;
grant execute on function private.review_event(uuid,boolean,text) to authenticated;
create or replace function public.lead_approve_event(_event_id uuid) returns void language sql security invoker set search_path = '' as $$ select private.review_event(_event_id,true,null); $$;
create or replace function public.lead_reject_event(_event_id uuid,_reason text default null) returns void language sql security invoker set search_path = '' as $$ select private.review_event(_event_id,false,_reason); $$;
revoke all on function public.lead_approve_event(uuid), public.lead_reject_event(uuid,text) from public,anon;
grant execute on function public.lead_approve_event(uuid), public.lead_reject_event(uuid,text) to authenticated;

create or replace function public.review_event_host(_user_id uuid,_approved boolean,_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.event_operator(auth.uid()) then raise exception using errcode = '42501', message = 'Content operations with MFA required'; end if;
  if _user_id = auth.uid() then raise exception using errcode = '42501', message = 'Another operator must review your host access'; end if;
  if _approved is null or _reason is null or char_length(btrim(_reason)) not between 8 and 500 then
    raise exception using errcode = '22023', message = 'A review reason is required'; end if;
  if not private.event_member_eligible(_user_id,null,'community') then raise exception using errcode = '22023', message = 'Host must be an active member'; end if;
  insert into private.event_host_approvals(user_id,approved,reviewed_by,reason)
    values(_user_id,_approved,auth.uid(),btrim(_reason))
    on conflict(user_id) do update set approved = excluded.approved,reviewed_by = excluded.reviewed_by,reviewed_at = now(),reason = excluded.reason;
  insert into public.audit_log(actor_id,action,target_type,target_id,reason) values(auth.uid(),'event.host_reviewed','user',_user_id,btrim(_reason));
end;
$$;
revoke all on function public.review_event_host(uuid,boolean,text) from public,anon;
grant execute on function public.review_event_host(uuid,boolean,text) to authenticated;

-- Lock the parent event for every reservation, cancellation, approval and
-- check-in: simultaneous requests cannot allocate the final place twice.
create or replace function private.promote_event_waitlist(_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype; r private.event_registrations%rowtype; occupied integer;
begin
  select * into e from public.events where id = _event_id for update;
  if e.lifecycle <> 'scheduled' or e.status <> 'approved' or e.end_time <= now() then return; end if;
  for r in select * from private.event_registrations where event_id = e.id and status = 'waitlisted' and approved_at is not null order by created_at,id for update loop
    if not private.event_member_eligible(r.user_id,e.chapter_id,e.registration_scope) then
      update private.event_registrations set status = 'cancelled',updated_at = now() where id = r.id;
      continue;
    end if;
    select count(*) into occupied from private.event_registrations where event_id = e.id and status = 'confirmed';
    if e.capacity is not null and occupied >= e.capacity then exit; end if;
    update private.event_registrations set status = 'confirmed',updated_at = now() where id = r.id;
  end loop;
end;
$$;
revoke all on function private.promote_event_waitlist(uuid) from public,anon,authenticated;

create or replace function public.register_for_event(_event_id uuid,_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype; r private.event_registrations%rowtype; occupied integer; state text;
begin
  if _expected_user_id is distinct from auth.uid() or auth.uid() is null then raise exception using errcode = '42501', message = 'Account changed; retry from your current account'; end if;
  select * into e from public.events where id = _event_id for update;
  if not found or e.status <> 'approved' or e.lifecycle <> 'scheduled' or e.end_time <= now() then
    raise exception using errcode = '22023', message = 'Registration is closed'; end if;
  if not private.event_member_eligible(auth.uid(),e.chapter_id,e.registration_scope) then
    raise exception using errcode = '42501', message = 'Active membership required for this event'; end if;
  select * into r from private.event_registrations where event_id = e.id and user_id = auth.uid();
  if found and r.status in ('confirmed','pending','waitlisted') then return jsonb_build_object('id',r.id,'status',r.status,'checkedInAt',r.checked_in_at); end if;
  if found and r.status = 'rejected' then raise exception using errcode = '42501', message = 'Contact the host about your registration'; end if;
  perform private.promote_event_waitlist(e.id);
  select count(*) into occupied from private.event_registrations where event_id = e.id and status = 'confirmed';
  state := case when e.requires_approval then 'pending' when e.capacity is not null and occupied >= e.capacity then 'waitlisted' else 'confirmed' end;
  insert into private.event_registrations(event_id,user_id,status,approved_at)
    values(e.id,auth.uid(),state,case when not e.requires_approval then now() end)
    on conflict(event_id,user_id) do update set status = excluded.status,approved_at = excluded.approved_at,checked_in_at = null,checked_in_by = null,created_at = now(),updated_at = now()
    returning * into r;
  insert into public.audit_log(actor_id,action,target_type,target_id) values(auth.uid(),'event.registered','event',e.id);
  return jsonb_build_object('id',r.id,'status',r.status,'checkedInAt',r.checked_in_at);
end;
$$;
revoke all on function public.register_for_event(uuid,uuid) from public,anon;
grant execute on function public.register_for_event(uuid,uuid) to authenticated;

create or replace function public.cancel_my_event_registration(_event_id uuid,_expected_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if _expected_user_id is distinct from auth.uid() or auth.uid() is null then raise exception using errcode = '42501', message = 'Account changed; retry from your current account'; end if;
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Sign in required'; end if;
  perform 1 from public.events where id = _event_id for update;
  if exists(select 1 from private.event_registrations where event_id = _event_id and user_id = auth.uid() and checked_in_at is not null) then raise exception using errcode = '22023', message = 'Attendance is recorded; contact the host for a correction'; end if;
  update private.event_registrations set status = 'cancelled',checked_in_at = null,checked_in_by = null,updated_at = now()
    where event_id = _event_id and user_id = auth.uid() and status in ('confirmed','pending','waitlisted');
  perform private.promote_event_waitlist(_event_id);
end;
$$;
revoke all on function public.cancel_my_event_registration(uuid,uuid) from public,anon;
grant execute on function public.cancel_my_event_registration(uuid,uuid) to authenticated;

create or replace function public.get_my_event_registration(_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r private.event_registrations%rowtype; e public.events%rowtype; details private.event_access_details%rowtype;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Sign in required'; end if;
  select * into e from public.events where id = _event_id;
  select * into r from private.event_registrations where event_id = _event_id and user_id = auth.uid();
  if private.event_can_manage(_event_id,auth.uid()) or (r.status = 'confirmed' and e.status = 'approved' and e.lifecycle = 'scheduled'
      and private.event_member_eligible(auth.uid(),e.chapter_id,e.registration_scope)) then
    select * into details from private.event_access_details where event_id = _event_id;
  end if;
  return jsonb_build_object('id',r.id,'status',r.status,'checkedInAt',r.checked_in_at,
    'location',details.location,'joinUrl',details.join_url,'canManage',private.event_can_manage(_event_id,auth.uid()));
end;
$$;
revoke all on function public.get_my_event_registration(uuid) from public,anon;
grant execute on function public.get_my_event_registration(uuid) to authenticated;

create or replace function public.get_event_guest_list(_event_id uuid,_offset integer default 0,_limit integer default 100)
returns table(id uuid,display_name text,status text,created_at timestamptz,checked_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.event_can_manage(_event_id,auth.uid()) then raise exception using errcode = '42501', message = 'Event host access required'; end if;
  if _offset is null or _offset < 0 or _offset > 100000 or _limit is null or _limit not between 1 and 100 then raise exception using errcode = '22023', message = 'Invalid guest list page'; end if;
  return query select r.id,coalesce(p.display_name,'Community member'),r.status,r.created_at,r.checked_in_at
    from private.event_registrations r left join public.profiles p on p.user_id = r.user_id
    where r.event_id = _event_id order by r.created_at,r.id limit _limit offset _offset;
end;
$$;
revoke all on function public.get_event_guest_list(uuid,integer,integer) from public,anon;
grant execute on function public.get_event_guest_list(uuid,integer,integer) to authenticated;

create or replace function public.manage_event_guest(_event_id uuid,_registration_id uuid,_action text,_expected_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype; r private.event_registrations%rowtype; occupied integer;
begin
  if _expected_user_id is distinct from auth.uid() or auth.uid() is null then raise exception using errcode = '42501', message = 'Account changed; retry from your current account'; end if;
  select * into e from public.events where id = _event_id for update;
  if not private.event_can_manage(_event_id,auth.uid()) then raise exception using errcode = '42501', message = 'Event host access required'; end if;
  if e.status <> 'approved' or e.lifecycle <> 'scheduled' or e.end_time <= now() then raise exception using errcode = '22023', message = 'Event is closed'; end if;
  select * into r from private.event_registrations where event_id = _event_id and id = _registration_id for update;
  if not found then raise exception using errcode = '22023', message = 'Guest not found'; end if;
  if _action = 'approve' then
    if r.status <> 'pending' then raise exception using errcode = '22023', message = 'Guest is no longer pending'; end if;
    if not private.event_member_eligible(r.user_id,e.chapter_id,e.registration_scope) then raise exception using errcode = '42501', message = 'Guest membership is inactive'; end if;
    select count(*) into occupied from private.event_registrations where event_id = e.id and status = 'confirmed';
    update private.event_registrations set status = case when e.capacity is not null and occupied >= e.capacity then 'waitlisted' else 'confirmed' end,
      approved_at = now(),updated_at = now() where id = r.id;
  elsif _action = 'reject' then
    if r.status not in ('pending','waitlisted') then raise exception using errcode = '22023', message = 'Only pending or waitlisted guests may be declined'; end if;
    update private.event_registrations set status = 'rejected',updated_at = now() where id = r.id;
  elsif _action = 'check_in' then
    if r.status <> 'confirmed' or not private.event_member_eligible(r.user_id,e.chapter_id,e.registration_scope)
      or now() < e.start_time - interval '24 hours' then raise exception using errcode = '22023', message = 'Only an eligible confirmed guest can check in near the event'; end if;
    if r.checked_in_at is not null then return; end if;
    update private.event_registrations set checked_in_at = now(),checked_in_by = auth.uid(),updated_at = now() where id = r.id;
  else raise exception using errcode = '22023', message = 'Invalid guest action'; end if;
  insert into public.audit_log(actor_id,action,target_type,target_id) values(auth.uid(),'event.guest_' || _action,'event',e.id);
end;
$$;
revoke all on function public.manage_event_guest(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.manage_event_guest(uuid,uuid,text,uuid) to authenticated;

create or replace function public.cancel_hosted_event(_event_id uuid,_expected_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if _expected_user_id is distinct from auth.uid() or auth.uid() is null then raise exception using errcode = '42501', message = 'Account changed; retry from your current account'; end if;
  perform 1 from public.events where id = _event_id for update;
  if not private.event_can_manage(_event_id,auth.uid()) then raise exception using errcode = '42501', message = 'Event host access required'; end if;
  update public.events set lifecycle = 'cancelled' where id = _event_id;
  insert into public.audit_log(actor_id,action,target_type,target_id) values(auth.uid(),'event.cancelled','event',_event_id);
end;
$$;
revoke all on function public.cancel_hosted_event(uuid,uuid) from public,anon;
grant execute on function public.cancel_hosted_event(uuid,uuid) to authenticated;

-- Public communities expose curated chapter descriptions, never the member list.
create or replace function public.discover_communities()
returns table(id uuid,name text,city text,country text,description text,upcoming_events bigint)
language sql stable security definer set search_path = '' as $$
  select c.id,c.name,c.city,c.country,c.description,count(e.id)
  from public.chapters c left join public.events e on e.chapter_id = c.id and e.status = 'approved'
    and e.visibility = 'public' and e.lifecycle = 'scheduled' and e.end_time >= now()
  group by c.id order by c.name,c.id limit 200;
$$;
revoke all on function public.discover_communities() from public,anon;
grant execute on function public.discover_communities() to anon,authenticated;

create or replace function private.guard_event_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Service/database migration jobs have no end-user subject. Browser writes
  -- are already revoked; subject-bound RPCs still pass this publication guard.
  if auth.uid() is not null and new.status is distinct from old.status then
    if not (private.event_operator(auth.uid()) or (old.chapter_id is not null
      and old.organizer_id <> auth.uid() and private.event_member_eligible(auth.uid(),old.chapter_id,'chapter')
      and public.is_chapter_lead(auth.uid(),old.chapter_id))) then
      raise exception using errcode = '42501', message = 'Event publication review access required';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_event_publication() from public,anon,authenticated;
create trigger event_publication_authority before update of status on public.events
  for each row execute function private.guard_event_publication();

create or replace function public.get_my_event_workspace()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid(); can_review boolean := private.event_operator(actor);
begin
  if not private.event_member_eligible(actor,null,'community') then
    raise exception using errcode = '42501', message = 'Active Community membership required'; end if;
  return jsonb_build_object(
    'approvedHost',exists(select 1 from private.event_host_approvals h where h.user_id = actor and h.approved),
    'canReviewHosts',can_review,
    'hosted',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select e.id,e.title,e.status,e.start_time,e.lifecycle from public.events e where e.organizer_id = actor order by e.created_at desc limit 100
    ) x),'[]'::jsonb),
    'review',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select e.id,e.title,e.description,e.status,e.start_time,e.end_time,e.timezone,e.location_type,e.public_location,e.organizer_id,
        d.location,d.join_url,coalesce(p.display_name,'Community host') as host_name
      from public.events e left join public.profiles p on p.user_id = e.organizer_id
      left join private.event_access_details d on d.event_id = e.id
      where e.status = 'pending' and (can_review or (e.chapter_id is not null and e.organizer_id <> actor
        and private.event_member_eligible(actor,e.chapter_id,'chapter') and public.is_chapter_lead(actor,e.chapter_id)))
      order by e.created_at,e.id limit 100
    ) x),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_my_event_workspace() from public,anon;
grant execute on function public.get_my_event_workspace() to authenticated;
