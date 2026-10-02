-- Public name/email guest registration is the default for newly created events.
-- Existing events retain their explicit Community restriction until a host reviews it.
alter table public.events drop constraint events_registration_scope_check;
alter table public.events add constraint events_registration_scope_check check (registration_scope in ('public','community','chapter'));
alter table public.events alter column registration_scope set default 'public';
alter table private.event_registrations alter column user_id drop not null;
alter table private.event_registrations
  add column guest_email text,
  add column guest_name text,
  add constraint event_guest_identity check (user_id is not null or (guest_email is not null and guest_name is not null));
create unique index event_guest_email_unique on private.event_registrations(event_id,guest_email) where guest_email is not null;

create table private.event_guest_links (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  event_id uuid not null references public.events(id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  display_name text not null check (char_length(display_name) between 1 and 120),
  registration_id uuid references private.event_registrations(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);
create index event_guest_links_email_created_idx on private.event_guest_links(email,created_at);
create index event_guest_links_created_idx on private.event_guest_links(created_at);
alter table private.event_guest_links enable row level security;
revoke all on private.event_guest_links from public,anon,authenticated;

create or replace function private.event_registration_eligible(_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select case when e.registration_scope = 'public' then
    (r.user_id is null or not public.is_suspended(r.user_id))
    and (r.guest_email is not null or exists(select 1 from auth.users u where u.id = r.user_id and u.email_confirmed_at is not null))
    and not exists(select 1 from auth.users u where lower(u.email) = r.guest_email and public.is_suspended(u.id))
    else private.event_member_eligible(r.user_id,e.chapter_id,e.registration_scope) end
  from private.event_registrations r join public.events e on e.id = r.event_id where r.id = _id),false);
$$;
revoke all on function private.event_registration_eligible(uuid) from public,anon,authenticated;

create or replace function private.event_can_manage(_event_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select _user_id is not null and not public.is_suspended(_user_id) and exists(
    select 1 from public.events e where e.id = _event_id and (
      private.event_operator(_user_id)
      or (e.organizer_id = _user_id and private.event_member_eligible(_user_id,e.chapter_id,case when e.registration_scope = 'chapter' then 'chapter' else 'community' end))
    )
  );
$$;

create or replace function public.submit_my_event(_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); eid uuid; chapter uuid; state text; start_at timestamptz; end_at timestamptz;
  title_text text := btrim(_input->>'title'); description_text text := btrim(_input->>'description');
  zone text := _input->>'timezone'; format text := _input->>'locationType'; url text := nullif(btrim(_input->>'link'),'');
  venue text := nullif(btrim(_input->>'location'),''); scope text := coalesce(_input->>'registrationScope','public');
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
    or vis not in ('public','unlisted','members') or scope not in ('public','community','chapter') or (vis = 'members' and scope = 'public') or (scope = 'chapter' and chapter is null)
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

create or replace function private.promote_event_waitlist(_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype; r private.event_registrations%rowtype; occupied integer;
begin
  select * into e from public.events where id = _event_id for update;
  if e.lifecycle <> 'scheduled' or e.status <> 'approved' or e.end_time <= now() then return; end if;
  for r in select * from private.event_registrations where event_id = e.id and status = 'waitlisted' and approved_at is not null order by created_at,id for update loop
    if not private.event_registration_eligible(r.id) then
      update private.event_registrations set status = 'cancelled',updated_at = now() where id = r.id;
      continue;
    end if;
    select count(*) into occupied from private.event_registrations where event_id = e.id and status = 'confirmed';
    if e.capacity is not null and occupied >= e.capacity then exit; end if;
    update private.event_registrations set status = 'confirmed',updated_at = now() where id = r.id;
  end loop;
end;
$$;

create or replace function public.register_for_event(_event_id uuid,_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype; r private.event_registrations%rowtype; occupied integer; state text; email_text text;
begin
  if _expected_user_id is distinct from auth.uid() or auth.uid() is null then raise exception using errcode = '42501', message = 'Account changed; retry from your current account'; end if;
  select * into e from public.events where id = _event_id for update;
  if not found or e.status <> 'approved' or e.lifecycle <> 'scheduled' or e.end_time <= now() then
    raise exception using errcode = '22023', message = 'Registration is closed'; end if;
  if not ((e.registration_scope = 'public' and not public.is_suspended(auth.uid()) and exists(select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null)) or private.event_member_eligible(auth.uid(),e.chapter_id,e.registration_scope)) then
    raise exception using errcode = '42501', message = 'Active membership required for this event'; end if;
  select lower(email) into email_text from auth.users where id = auth.uid() and email_confirmed_at is not null;
  select * into r from private.event_registrations where event_id = e.id and (user_id = auth.uid() or (guest_email = email_text and user_id is null)) for update;
  if found and r.user_id is null then update private.event_registrations set user_id = auth.uid() where id = r.id; r.user_id := auth.uid(); end if;
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

create or replace function public.get_event_guest_list(_event_id uuid,_offset integer default 0,_limit integer default 100)
returns table(id uuid,display_name text,status text,created_at timestamptz,checked_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.event_can_manage(_event_id,auth.uid()) then raise exception using errcode = '42501', message = 'Event host access required'; end if;
  if _offset is null or _offset < 0 or _offset > 100000 or _limit is null or _limit not between 1 and 100 then raise exception using errcode = '22023', message = 'Invalid guest list page'; end if;
  return query select r.id,coalesce(p.display_name,r.guest_name,'Event guest'),r.status,r.created_at,r.checked_in_at
    from private.event_registrations r left join public.profiles p on p.user_id = r.user_id
    where r.event_id = _event_id order by r.created_at,r.id limit _limit offset _offset;
end;
$$;

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
    if not private.event_registration_eligible(r.id) then raise exception using errcode = '42501', message = 'Guest membership is inactive'; end if;
    select count(*) into occupied from private.event_registrations where event_id = e.id and status = 'confirmed';
    update private.event_registrations set status = case when e.capacity is not null and occupied >= e.capacity then 'waitlisted' else 'confirmed' end,
      approved_at = now(),updated_at = now() where id = r.id;
  elsif _action = 'reject' then
    if r.status not in ('pending','waitlisted') then raise exception using errcode = '22023', message = 'Only pending or waitlisted guests may be declined'; end if;
    update private.event_registrations set status = 'rejected',updated_at = now() where id = r.id;
  elsif _action = 'check_in' then
    if r.status <> 'confirmed' or not private.event_registration_eligible(r.id)
      or now() < e.start_time - interval '24 hours' then raise exception using errcode = '22023', message = 'Only an eligible confirmed guest can check in near the event'; end if;
    if r.checked_in_at is not null then return; end if;
    update private.event_registrations set checked_in_at = now(),checked_in_by = auth.uid(),updated_at = now() where id = r.id;
  else raise exception using errcode = '22023', message = 'Invalid guest action'; end if;
  insert into public.audit_log(actor_id,action,target_type,target_id) values(auth.uid(),'event.guest_' || _action,'event',e.id);
end;
$$;

grant usage on schema private to service_role;

-- Only the guest Edge Function's service identity may call these APIs. The
-- wrapper is invoker-rights; privileged work stays in the unexposed schema.
create or replace function private.request_event_guest_link(_event_id uuid,_email text,_name text,_token_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype;
begin
  if _token_hash is null or _token_hash !~ '^[a-f0-9]{64}$' or _email is null or _email <> lower(btrim(_email))
    or char_length(_email) > 254 or _email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or _name is null or char_length(btrim(_name)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'Invalid guest request'; end if;
  -- Serialize rate checks, including requests for different addresses.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('event-guest-mail-rate',0));
  if (select count(*) from private.event_guest_links where created_at > now()-interval '1 minute') >= 100
    or (select count(*) from private.event_guest_links where email = _email and created_at > now()-interval '1 hour') >= 3 then return false; end if;
  select * into e from public.events where id = _event_id;
  if not found or e.status <> 'approved' or e.lifecycle <> 'scheduled' or e.end_time <= now()
    or e.visibility = 'members' or e.registration_scope <> 'public'
    or exists(select 1 from auth.users u where lower(u.email) = _email and public.is_suspended(u.id)) then return false; end if;
  insert into private.event_guest_links(token_hash,event_id,email,display_name) values(_token_hash,_event_id,_email,btrim(_name));
  return true;
end;
$$;

create or replace function private.event_guest_receipt(_event_id uuid,_token_hash text,_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype; link private.event_guest_links%rowtype; r private.event_registrations%rowtype;
  occupied integer; state text; account_id uuid; details private.event_access_details%rowtype;
begin
  if _action is null or _action not in ('receipt','confirm','cancel') then raise exception using errcode = '22023', message = 'Invalid guest action'; end if;
  -- Use the same event-row lock as authenticated registrations and host actions.
  select * into e from public.events where id = _event_id for update;
  select * into link from private.event_guest_links where token_hash = _token_hash and event_id = _event_id and expires_at > now() for update;
  if not found then raise exception using errcode = '42501', message = 'This private link has expired or is invalid. Request a new link.'; end if;
  if e.registration_scope <> 'public' or e.visibility = 'members'
    or exists(select 1 from auth.users u where lower(u.email) = link.email and public.is_suspended(u.id)) then
    raise exception using errcode = '42501', message = 'This registration is not available'; end if;
  if _action = 'confirm' and link.registration_id is null then
    if e.status <> 'approved' or e.lifecycle <> 'scheduled' or e.end_time <= now() then raise exception using errcode = '22023', message = 'Registration is closed'; end if;
    select id into account_id from auth.users where lower(email) = link.email and email_confirmed_at is not null limit 1;
    select * into r from private.event_registrations where event_id = e.id and (guest_email = link.email or (account_id is not null and user_id = account_id)) order by created_at limit 1 for update;
    if not found or r.status = 'cancelled' then
      perform private.promote_event_waitlist(e.id);
      select count(*) into occupied from private.event_registrations where event_id = e.id and status = 'confirmed';
      state := case when e.requires_approval then 'pending' when e.capacity is not null and occupied >= e.capacity then 'waitlisted' else 'confirmed' end;
      if r.id is null then
        insert into private.event_registrations(event_id,user_id,guest_email,guest_name,status,approved_at)
          values(e.id,account_id,link.email,link.display_name,state,case when not e.requires_approval then now() end) returning * into r;
      else
        update private.event_registrations set status = state,guest_email = link.email,guest_name = link.display_name,
          approved_at = case when not e.requires_approval then now() end,created_at = now(),updated_at = now() where id = r.id returning * into r;
      end if;
    else
      update private.event_registrations set guest_email = link.email,guest_name = link.display_name where id = r.id returning * into r;
    end if;
    update private.event_guest_links set registration_id = r.id,expires_at = e.end_time + interval '7 days' where token_hash = _token_hash;
    link.registration_id := r.id;
  end if;
  select * into r from private.event_registrations where id = link.registration_id and event_id = e.id;
  if _action = 'cancel' then
    if r.id is null then raise exception using errcode = '22023', message = 'Confirm the registration first'; end if;
    if r.checked_in_at is not null then raise exception using errcode = '22023', message = 'Attendance is recorded; contact the host for a correction'; end if;
    update private.event_registrations set status = 'cancelled',updated_at = now() where id = r.id and status in ('pending','confirmed','waitlisted');
    perform private.promote_event_waitlist(e.id);
    select * into r from private.event_registrations where id = link.registration_id;
  end if;
  if r.status = 'confirmed' and e.status = 'approved' and e.lifecycle = 'scheduled' and e.end_time > now() and private.event_registration_eligible(r.id) then
    select * into details from private.event_access_details where event_id = e.id;
  end if;
  return jsonb_build_object('id',r.id,'status',r.status,'checkedInAt',r.checked_in_at,'location',details.location,'joinUrl',details.join_url,
    'canManage',false,'needsConfirmation',link.registration_id is null);
end;
$$;

revoke all on function private.request_event_guest_link(uuid,text,text,text), private.event_guest_receipt(uuid,text,text) from public,anon,authenticated;
grant execute on function private.request_event_guest_link(uuid,text,text,text), private.event_guest_receipt(uuid,text,text) to service_role;
create or replace function public.request_event_guest_link(_event_id uuid,_email text,_name text,_token_hash text)
returns boolean language sql security invoker set search_path = '' as $$ select private.request_event_guest_link(_event_id,_email,_name,_token_hash); $$;
create or replace function public.event_guest_receipt(_event_id uuid,_token_hash text,_action text)
returns jsonb language sql security invoker set search_path = '' as $$ select private.event_guest_receipt(_event_id,_token_hash,_action); $$;
revoke all on function public.request_event_guest_link(uuid,text,text,text),public.event_guest_receipt(uuid,text,text) from public,anon,authenticated;
grant execute on function public.request_event_guest_link(uuid,text,text,text),public.event_guest_receipt(uuid,text,text) to service_role;

-- Expired credentials are retained only while rate counters need them. Schedule
-- this service-only cleanup daily as part of the reviewed delivery runbook.
create or replace function public.prune_expired_event_guest_links()
returns bigint language plpgsql security invoker set search_path = '' as $$
declare total bigint;
begin
  delete from private.event_guest_links where expires_at < now()-interval '1 day';
  get diagnostics total = row_count; return total;
end;
$$;
revoke all on function public.prune_expired_event_guest_links() from public,anon,authenticated;
grant execute on function public.prune_expired_event_guest_links() to service_role;
grant select,delete on private.event_guest_links to service_role;

-- Preserve authenticated chapter/feed reads for active members when a new
-- event is publicly registrable. Raw event rows still exclude access details.
drop policy "Active members view approved event rows" on public.events;
create policy "Active members view approved event rows" on public.events for select to authenticated
  using (status = 'approved' and visibility in ('public','members') and private.event_member_eligible((select auth.uid()),chapter_id,
    case when registration_scope = 'chapter' then 'chapter' else 'community' end));

-- Public profile activity must use a safe projection after anonymous raw-table
-- access is removed. Unlisted/member invitations do not appear in a profile.
create or replace function public.discover_host_events(_host_id uuid,_limit integer default 8)
returns table(id uuid,title text,description text,start_time timestamptz,location text,location_type text,status text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if _host_id is null or _limit is null or _limit not between 1 and 24 then raise exception using errcode = '22023', message = 'Invalid host event filters'; end if;
  return query select e.id,e.title,e.description,e.start_time,e.public_location,e.location_type,e.status
    from public.events e where e.organizer_id = _host_id and e.status = 'approved' and e.visibility = 'public'
    order by e.start_time desc,e.id limit _limit;
end;
$$;
revoke all on function public.discover_host_events(uuid,integer) from public,anon,authenticated;
grant execute on function public.discover_host_events(uuid,integer) to anon,authenticated;
