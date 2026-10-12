-- Every browser event decision must identify the invitation it inspected.
-- Keep the existing Content lifecycle implementation and its private audit,
-- but remove direct caller access to its unversioned event branch.
alter function public.admin_transition_content(text,uuid,text,text,text) set schema private;
alter function private.admin_transition_content(text,uuid,text,text,text) rename to transition_content_locked;
revoke all on function private.transition_content_locked(text,uuid,text,text,text) from public,anon,authenticated;

create function private.transition_non_event_content(_content_type text,_content_id uuid,_target_status text,_expected_status text,_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid())
    or public.is_suspended(auth.uid()) or not private.has_admin_capability(auth.uid(),'content.manage') then
    raise exception using errcode='42501',message='Content operations access required'; end if;
  if _content_type='event' then
    raise exception using errcode='42501',message='Event decisions require an inspected revision. Refresh the Content queue'; end if;
  return private.transition_content_locked(_content_type,_content_id,_target_status,_expected_status,_reason);
end;
$$;
create function public.admin_transition_content(_content_type text,_content_id uuid,_target_status text,_expected_status text,_reason text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  return private.transition_non_event_content(_content_type,_content_id,_target_status,_expected_status,_reason);
end;
$$;
revoke all on function private.transition_non_event_content(text,uuid,text,text,text),public.admin_transition_content(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function private.transition_non_event_content(text,uuid,text,text,text),public.admin_transition_content(text,uuid,text,text,text) to authenticated;

create function private.transition_event_revision(_event_id uuid,_expected_revision integer,_target_status text,_expected_status text,_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype; revision_value integer; result jsonb;
begin
  if not private.event_operator(auth.uid()) or not exists(select 1 from auth.users where id=auth.uid()) then
    raise exception using errcode='42501',message='Content operations with MFA required'; end if;
  select * into e from public.events where id=_event_id for update;
  if not found then raise exception using errcode='P0002',message='Event does not exist'; end if;
  revision_value := coalesce((select max(revision) from private.event_edit_history where event_id=e.id),0);
  if _expected_revision is distinct from revision_value then
    raise exception using errcode='40001',message='This event changed. Refresh the review before deciding'; end if;
  if _expected_status is distinct from e.status then
    raise exception using errcode='40001',message='Event state changed. Refresh the review before deciding'; end if;
  if e.lifecycle='cancelled' and _target_status in ('pending','approved') then
    raise exception using errcode='22023',message='Cancelled events cannot be republished. Create a new invitation'; end if;
  result := private.transition_content_locked('event',e.id,_target_status,_expected_status,_reason);
  if e.status='approved' and _target_status='declined' and e.lifecycle='scheduled' then
    -- Withdrawal must close the invitation and enqueue guest cancellation mail
    -- through the same transactional lifecycle trigger as host cancellation.
    update public.events set lifecycle='cancelled' where id=e.id;
    insert into public.audit_log(actor_id,action,target_type,target_id,reason)
      values(auth.uid(),'event.cancelled','event',e.id,btrim(_reason));
  end if;
  -- Record which invitation the operator's decision covered. The existing
  -- lifecycle helper retains the reason/from/to evidence and graph validation.
  insert into private.admin_operation_events(actor_user_id,capability,domain,action,target_type,target_id,reason,metadata)
    values(auth.uid(),'content.manage','content','event.revision_reviewed','event',e.id,btrim(_reason),
      jsonb_build_object('revision',revision_value,'fromStatus',e.status,'toStatus',_target_status));
  return result||jsonb_build_object('revision',revision_value);
end;
$$;
create function public.admin_transition_event_revision(_event_id uuid,_expected_revision integer,_target_status text,_expected_status text,_reason text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  return private.transition_event_revision(_event_id,_expected_revision,_target_status,_expected_status,_reason);
end;
$$;
revoke all on function private.transition_event_revision(uuid,integer,text,text,text),public.admin_transition_event_revision(uuid,integer,text,text,text) from public,anon,authenticated;
grant execute on function private.transition_event_revision(uuid,integer,text,text,text),public.admin_transition_event_revision(uuid,integer,text,text,text) to authenticated;

create function private.content_queue_revision(_content_type text default null,_status text default null,_limit integer default 100)
returns table(content_type text,content_id uuid,title text,status text,owner_display_name text,summary text,created_at timestamptz,published_at timestamptz,event_revision integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid())
    or public.is_suspended(auth.uid()) or not private.has_admin_capability(auth.uid(),'content.manage') then
    raise exception using errcode='42501',message='Content operations access required'; end if;
  -- One statement snapshot binds the bounded invitation summary to its revision.
  return query select q.*,case when q.content_type='event' then
    coalesce((select max(h.revision) from private.event_edit_history h where h.event_id=q.content_id),0) else null::integer end
    from public.admin_content_queue(_content_type,_status,_limit) q;
end;
$$;
create function public.admin_content_queue_revision(_content_type text default null,_status text default null,_limit integer default 100)
returns table(content_type text,content_id uuid,title text,status text,owner_display_name text,summary text,created_at timestamptz,published_at timestamptz,event_revision integer)
language plpgsql stable security invoker set search_path = '' as $$
begin
  return query select * from private.content_queue_revision(_content_type,_status,_limit);
end;
$$;
revoke all on function private.content_queue_revision(text,text,integer),public.admin_content_queue_revision(text,text,integer) from public,anon,authenticated;
grant execute on function private.content_queue_revision(text,text,integer),public.admin_content_queue_revision(text,text,integer) to authenticated;

create function private.chapter_event_review_queue()
returns table(id uuid,title text,description text,start_time timestamptz,end_time timestamptz,timezone text,location_type text,public_location text,location text,join_url text,chapter_id uuid,host_name text,revision integer)
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if not exists(select 1 from auth.users where auth.users.id=actor)
    or not private.event_member_eligible(actor,null,'community') then
    raise exception using errcode='42501',message='Active Community membership required'; end if;
  return query select e.id,e.title,e.description,e.start_time,e.end_time,e.timezone,e.location_type,e.public_location,
    d.location,d.join_url,e.chapter_id,coalesce(p.display_name,'Community host'),
    coalesce((select max(h.revision) from private.event_edit_history h where h.event_id=e.id),0)
    from public.events e left join public.profiles p on p.user_id=e.organizer_id
    left join private.event_access_details d on d.event_id=e.id
    where e.status='pending' and e.chapter_id is not null and e.organizer_id<>actor
      and private.event_member_eligible(actor,e.chapter_id,'chapter') and public.is_chapter_lead(actor,e.chapter_id)
    order by e.start_time,e.id limit 100;
end;
$$;
create function public.get_chapter_event_review_queue()
returns table(id uuid,title text,description text,start_time timestamptz,end_time timestamptz,timezone text,location_type text,public_location text,location text,join_url text,chapter_id uuid,host_name text,revision integer)
language plpgsql stable security invoker set search_path = '' as $$
begin
  return query select * from private.chapter_event_review_queue();
end;
$$;
revoke all on function private.chapter_event_review_queue(),public.get_chapter_event_review_queue() from public,anon,authenticated;
grant execute on function private.chapter_event_review_queue(),public.get_chapter_event_review_queue() to authenticated;

create or replace function private.review_event_revision(_event_id uuid,_expected_revision integer,_approved boolean,_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype;
begin
  select * into e from public.events where id=_event_id for update;
  if not found or not (private.event_operator(auth.uid()) or (e.chapter_id is not null and e.organizer_id<>auth.uid()
    and private.event_member_eligible(auth.uid(),e.chapter_id,'chapter') and public.is_chapter_lead(auth.uid(),e.chapter_id))) then
    raise exception using errcode='42501',message='Event review access required'; end if;
  if _expected_revision is distinct from coalesce((select max(revision) from private.event_edit_history where event_id=_event_id),0) then
    raise exception using errcode='40001',message='This event changed. Refresh the review before deciding'; end if;
  if _approved is null then raise exception using errcode='22023',message='Review decision required'; end if;
  if _approved and e.lifecycle='cancelled' then
    raise exception using errcode='22023',message='Cancelled events cannot be republished. Create a new invitation'; end if;
  perform private.review_event(_event_id,_approved,_reason);
end;
$$;
revoke all on function private.review_event_revision(uuid,integer,boolean,text) from public,anon,authenticated;
grant execute on function private.review_event_revision(uuid,integer,boolean,text) to authenticated;

-- Retire old event commands without adding a fail-open frontend fallback.
-- The revision helper checks the same reviewer/chapter authority first, then
-- refuses a missing version. It is still callable through its reviewed wrapper.
revoke all on function private.review_event(uuid,boolean,text) from public,anon,authenticated;
create or replace function public.lead_approve_event(_event_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin perform private.review_event_revision(_event_id,null,true,null); end;
$$;
create or replace function public.lead_reject_event(_event_id uuid,_reason text default null)
returns void language plpgsql security invoker set search_path = '' as $$
begin perform private.review_event_revision(_event_id,null,false,_reason); end;
$$;
revoke all on function public.lead_approve_event(uuid),public.lead_reject_event(uuid,text) from public,anon,authenticated;
grant execute on function public.lead_approve_event(uuid),public.lead_reject_event(uuid,text) to authenticated;

comment on function public.admin_transition_event_revision(uuid,integer,text,text,text) is
  'MFA content operation bound to the inspected invitation revision and publication state; locks against host edits and audits the decision.';
comment on function public.admin_content_queue_revision(text,text,integer) is
  'Bounded capability-checked Content summaries with event revisions from the same statement snapshot.';
comment on function public.get_chapter_event_review_queue() is
  'Up to 100 pending invitations for active chapter leads; private access details and inspected revision share a statement snapshot.';
