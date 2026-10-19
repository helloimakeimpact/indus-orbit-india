-- Account access closes before erasure. Financial/Trust references keep a
-- pseudonymous Auth/profile shell; no cascade through shared accounting data.
create table private.account_closures (
  user_id uuid primary key,
  request_id uuid not null unique,
  phase text not null check(phase in ('frozen','files','auth','completed')),
  closed_at timestamptz not null default now(),
  security_retained_until timestamptz not null default now()+interval '1 year',
  finance_retained_until timestamptz,
  completed_at timestamptz,
  report jsonb not null default '{}'::jsonb
);
alter table private.account_closures enable row level security;
revoke all on private.account_closures from public,anon,authenticated;
grant select on private.account_closures to service_role;

create function private.account_access_open()
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and not exists(select 1 from private.account_closures c where c.user_id=auth.uid());
$$;
revoke all on function private.account_access_open() from public,anon;
grant execute on function private.account_access_open() to authenticated;

create function private.enforce_account_access()
returns void language plpgsql stable security definer set search_path='' as $$
begin
  if auth.jwt()->>'role'='authenticated' and not private.account_access_open() then
    raise exception using errcode='42501',message='This account is closed';
  end if;
end;
$$;
revoke all on function private.enforce_account_access() from public,anon;
grant execute on function private.enforce_account_access() to authenticated;
-- Anonymous and service requests need an invoker hook without private-schema
-- access. Only authenticated requests enter the private closure check.
create function public.enforce_account_access()
returns void language plpgsql stable security invoker set search_path='' as $$
begin
  if auth.jwt()->>'role'='authenticated' then perform private.enforce_account_access(); end if;
end;
$$;
revoke all on function public.enforce_account_access() from public,anon,authenticated,service_role;
grant execute on function public.enforce_account_access() to anon,authenticated,service_role;
-- No role configuration is changed here. Deployment must preserve any existing
-- pre-request hook and install/verify this guard before enabling deletion.

create or replace function public.is_suspended(_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.member_suspensions s where s.user_id=_user_id and s.lifted_at is null)
    or exists(select 1 from private.account_closures c where c.user_id=_user_id);
$$;

do $$
declare relation record;
begin
  for relation in select n.nspname,c.relname from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where c.relkind in ('r','p') and c.relrowsecurity
      and (pg_catalog.has_table_privilege('authenticated',c.oid,'SELECT') or pg_catalog.has_table_privilege('authenticated',c.oid,'INSERT')
        or pg_catalog.has_table_privilege('authenticated',c.oid,'UPDATE') or pg_catalog.has_table_privilege('authenticated',c.oid,'DELETE'))
      and (n.nspname='public' or (n.nspname in ('storage','realtime') and c.relname in ('objects','messages'))) loop
    execute format('create policy "Closed accounts cannot access data" on %I.%I as restrictive for all to authenticated using ((select private.account_access_open())) with check ((select private.account_access_open()))',relation.nspname,relation.relname);
  end loop;
end;
$$;

create function private.guard_closed_account_assignment()
returns trigger language plpgsql security definer set search_path='' as $$
declare subject uuid:= (to_jsonb(new)->>tg_argv[0])::uuid;
begin
  perform 1 from auth.users where id=subject for key share;
  if exists(select 1 from private.account_closures c where c.user_id=subject) then
    if tg_table_name='admin_team_assignments' and to_jsonb(new)->>'revoked_at' is not null then return new; end if;
    if tg_table_name in ('chapter_members','mission_members') and to_jsonb(new)->>'membership_state' in ('left','removed') then return new; end if;
    if tg_table_name='io_workspace_members' and to_jsonb(new)->>'status'<>'active' then return new; end if;
    raise exception using errcode='42501',message='Closed accounts cannot receive membership or authority';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_closed_account_assignment() from public,anon,authenticated;
create trigger guard_closed_user_role before insert or update on public.user_roles for each row execute function private.guard_closed_account_assignment('user_id');
create trigger guard_closed_admin_assignment before insert or update on private.admin_team_assignments for each row execute function private.guard_closed_account_assignment('user_id');
create trigger guard_closed_chapter_membership before insert or update on public.chapter_members for each row execute function private.guard_closed_account_assignment('user_id');
create trigger guard_closed_mission_membership before insert or update on public.mission_members for each row execute function private.guard_closed_account_assignment('user_id');
create trigger guard_closed_io_membership before insert or update on public.io_workspace_members for each row execute function private.guard_closed_account_assignment('user_id');

create function private.privacy_deletion_blocker(_subject uuid)
returns text language plpgsql stable security definer set search_path='' as $$
begin
  if private.privacy_is_held(_subject,null) then return 'legal_or_safety_hold'; end if;
  if exists(select 1 from private.event_registrations r join private.privacy_holds h on h.event_id=r.event_id
      where r.user_id=_subject and h.released_at is null and h.held_until>now()) then return 'event_hold'; end if;
  if exists(select 1 from public.user_roles where user_id=_subject and role::text<>'member')
    or exists(select 1 from private.admin_team_assignments where user_id=_subject and revoked_at is null) then return 'operator_handover_required'; end if;
  if exists(select 1 from public.chapter_members where user_id=_subject and membership_state='active' and role in ('lead','steward'))
    or exists(select 1 from public.mission_members where user_id=_subject and membership_state='active' and role in ('lead','coordinator','founder'))
    or exists(select 1 from public.io_workspace_members where user_id=_subject and status='active' and role in ('owner','admin'))
    then return 'ownership_transfer_required'; end if;
  if exists(select 1 from public.events where organizer_id=_subject and end_time>now() and lifecycle='scheduled' and status in ('approved','pending')) then return 'upcoming_event_review_required'; end if;
  if exists(select 1 from public.member_suspensions where user_id=_subject and lifted_at is null)
    or exists(select 1 from public.conversation_reports report join public.conversation_messages message on message.id=report.message_id
      where message.author_id=_subject and report.status not in ('resolved','dismissed'))
    or exists(select 1 from public.reports report where report.status not in ('resolved','dismissed') and
      (report.target_id=_subject or report.target_id in (select id from public.profiles where user_id=_subject)
        or report.target_id in (select id from public.stories where author_id=_subject))) then return 'safety_review_required'; end if;
  if exists(select 1 from public.courses where created_by=_subject) or exists(select 1 from public.resources where created_by=_subject)
    or exists(select 1 from public.skills where created_by=_subject) or exists(select 1 from public.soda_ideas where created_by=_subject)
    or exists(select 1 from public.loops where created_by=_subject) then return 'published_content_review_required'; end if;
  -- A regulated archive profile must be delivered before the future minimum
  -- processing-data retention commencement. Never silently erase through it.
  if now()>=timestamptz '2027-05-13 00:00:00+05:30' then return 'statutory_retention_profile_required'; end if;
  if (select count(*) from (select 1 from public.conversation_messages where author_id=_subject limit 10001) bounded)>10000
    or (select count(*) from (select 1 from storage.objects where owner_id=_subject::text limit 1001) bounded)>1000 then return 'assisted_erasure_required'; end if;
  return null;
end;
$$;
revoke all on function private.privacy_deletion_blocker(uuid) from public,anon,authenticated;

create function private.schedule_account_deletion(_request_id uuid,_expected_version integer,_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); r public.account_privacy_requests%rowtype; blocker text; note text:=btrim(_reason); due timestamptz;
begin
  if actor is null or auth.jwt()->>'aal' is distinct from 'aal2' or public.is_suspended(actor)
    or not private.has_admin_capability(actor,'members.support') then raise exception using errcode='42501',message='MFA privacy support access required'; end if;
  if note is null or char_length(note) not between 8 and 1000 or _expected_version is null or _expected_version<1 then raise exception using errcode='22023',message='Privacy approval requires a current version and reason'; end if;
  select * into r from public.account_privacy_requests where id=_request_id for update;
  if r.id is null or r.request_type<>'deletion' or r.state not in ('submitted','reviewing','blocked') then raise exception using errcode='22023',message='Deletion request is not reviewable'; end if;
  if r.version<>_expected_version then raise exception using errcode='40001',message='Privacy request changed; refresh before approval'; end if;
  if exists(select 1 from private.privacy_execution_jobs where request_id=r.id and started_at is not null) then raise exception using errcode='55000',message='Deletion has already started'; end if;
  blocker:=private.privacy_deletion_blocker(r.requester_id);
  if blocker is not null then raise exception using errcode='55000',message=blocker; end if;
  due:=greatest(now(),r.submitted_at+interval '7 days');
  update public.account_privacy_requests set state='reviewing',assigned_to=actor,operator_note=note,version=version+1,updated_at=now() where id=r.id returning * into r;
  insert into private.privacy_execution_jobs(request_id,requester_id,kind,request_version,not_before)
    values(r.id,r.requester_id,'deletion',r.version,due)
    on conflict(request_id) do update set request_version=excluded.request_version,not_before=excluded.not_before,state='queued',attempt_count=0,lease_token=null,leased_at=null,error_code=null;
  insert into private.admin_operation_events(actor_user_id,capability,domain,action,target_type,target_id,reason,metadata)
    values(actor,'members.support','members','privacy.deletion_scheduled','account_privacy_request',r.id,note,
      jsonb_build_object('version',r.version,'notBefore',due,'policyVersion','2026-10-15.1'));
  return jsonb_build_object('id',r.id,'state',r.state,'version',r.version,'assignedToMe',true,'notBefore',due);
end;
$$;

create function private.prevent_started_privacy_cancellation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.state is distinct from old.state and new.state in ('cancelled','rejected')
    and exists(select 1 from private.privacy_execution_jobs j where j.request_id=old.id and j.started_at is not null) then
    raise exception using errcode='55000',message='Deletion has started and cannot be cancelled';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_started_privacy_cancellation() from public,anon,authenticated;
create trigger prevent_started_privacy_cancellation before update on public.account_privacy_requests for each row execute function private.prevent_started_privacy_cancellation();

create function private.claim_account_deletion()
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.account_privacy_requests%rowtype; j private.privacy_execution_jobs%rowtype; blocker text; phase text;
begin
  perform private.privacy_service_only();
  select request.* into r from public.account_privacy_requests request join private.privacy_execution_jobs job on job.request_id=request.id
    where job.kind='deletion' and request.state='reviewing' and job.request_version=request.version and job.attempt_count<5
      and ((job.state='queued' and job.not_before<=now()) or (job.state='processing' and job.leased_at<now()-interval '5 minutes'))
    order by job.not_before,job.created_at,request.id limit 1 for update of request skip locked;
  if r.id is null then return null; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('privacy-subject:'||r.requester_id::text,0));
  perform 1 from auth.users where id=r.requester_id for update;
  select c.phase into phase from private.account_closures c where c.user_id=r.requester_id;
  blocker:=case when phase is null then private.privacy_deletion_blocker(r.requester_id)
    when private.privacy_is_held(r.requester_id,null) then 'legal_or_safety_hold' else null end;
  if not exists(select 1 from pg_catalog.pg_roles where rolname='authenticator' and
    'pgrst.db_pre_request=public.enforce_account_access'=any(rolconfig)) then blocker:='account_access_guard_not_configured'; end if;
  if blocker is not null then
    update public.account_privacy_requests set state='blocked',version=version+1,updated_at=now(),operator_note='Privacy processing needs operator attention: '||replace(blocker,'_',' ')||'.' where id=r.id;
    return null;
  end if;
  if phase is null then
    insert into private.account_closures(user_id,request_id,phase) values(r.requester_id,r.id,'frozen');
    phase:='frozen';
    update public.profiles set is_public=false where user_id=r.requester_id;
  end if;
  update private.privacy_execution_jobs set state='processing',attempt_count=attempt_count+1,lease_token=gen_random_uuid(),leased_at=now(),started_at=coalesce(started_at,now())
    where request_id=r.id returning * into j;
  return jsonb_build_object('request_id',j.request_id,'requester_id',j.requester_id,'lease_token',j.lease_token,'phase',phase);
end;
$$;

create function private.account_deletion_current(_request_id uuid,_lease_token uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.account_privacy_requests%rowtype; j private.privacy_execution_jobs%rowtype;
begin
  perform private.privacy_service_only();
  select * into r from public.account_privacy_requests where id=_request_id for update;
  if r.requester_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('privacy-subject:'||r.requester_id::text,0));
    perform 1 from auth.users where id=r.requester_id for update;
    perform 1 from public.events event where event.organizer_id=r.requester_id or event.id in
      (select event_id from private.event_registrations where user_id=r.requester_id) order by event.id for update;
  end if;
  select * into j from private.privacy_execution_jobs where request_id=r.id for update;
  return coalesce(r.state='reviewing' and j.kind='deletion' and j.state='processing' and j.request_version=r.version
    and j.lease_token=_lease_token and j.leased_at>now()-interval '5 minutes' and not private.privacy_is_held(j.requester_id,null)
    and exists(select 1 from pg_catalog.pg_roles where rolname='authenticator' and 'pgrst.db_pre_request=public.enforce_account_access'=any(rolconfig)),false);
end;
$$;

create function private.erase_closed_account_data(_request_id uuid,_lease_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare subject uuid; email_text text; profile uuid; o record; item record; phase text; year_number integer; year_end timestamptz;
begin
  if not private.account_deletion_current(_request_id,_lease_token) then raise exception using errcode='40001',message='Privacy deletion lease is no longer current'; end if;
  select j.requester_id into subject from private.privacy_execution_jobs j where j.request_id=_request_id;
  select c.phase into phase from private.account_closures c where c.user_id=subject for update;
  if phase<>'frozen' then return jsonb_build_object('phase',phase); end if;
  select lower(email) into email_text from auth.users where id=subject and email_confirmed_at is not null;
  select id into profile from public.profiles where user_id=subject;
  -- Snapshot exact owned object identities before detaching references. Retired
  -- paths cannot be changed or reattached while the Storage API removes bytes.
  for o in select object.* from storage.objects object where object.owner_id=subject::text
    or (object.bucket_id='account-exports' and split_part(object.name,'/',1)=subject::text)
    or (object.bucket_id='education' and ((split_part(object.name,'/',1)='resources' and split_part(object.name,'/',2)=subject::text)
      or (split_part(object.name,'/',1)='lessons' and split_part(object.name,'/',3)=subject::text)))
    or exists(select 1 from public.conversation_attachments a where a.uploaded_by=subject and a.storage_bucket=object.bucket_id and a.storage_path=object.name)
    order by object.id for update of object loop
    if o.bucket_id not in ('education','orbit-attachments','account-exports') then raise exception using errcode='55000',message='Unsupported owned bucket requires operator review'; end if;
    insert into private.privacy_file_cleanup(object_id,bucket_id,storage_path,object_version,subject_user_id,reason)
      values(o.id,o.bucket_id,o.name,o.version,subject,'account_deletion') on conflict(object_id) do nothing;
  end loop;
  -- Own messages are removed; reply structure and recipients' separate records
  -- retain a pseudonymous author shell, not the removed text or file bytes.
  delete from public.conversation_message_revisions where message_id in (select id from public.conversation_messages where author_id=subject);
  delete from public.conversation_attachments where uploaded_by=subject;
  update public.conversation_messages set content='[Message removed]',deleted_at=coalesce(deleted_at,now()),provenance='{}'::jsonb where author_id=subject;
  update public.direct_messages set content='[Message removed]' where sender_id=subject;
  update public.profiles set display_name='Deleted member',headline=null,bio=null,city=null,country=null,avatar_url=null,linkedin_url=null,website_url=null,
    orbit_segment=null,is_public=false,is_verified=false,verified_at=null,verified_by=null,segment_details='{}'::jsonb,region=null,timezone=null,notification_prefs=null,booking_url=null where user_id=subject;
  update public.io_api_keys set status='revoked',revoked_at=coalesce(revoked_at,now()) where created_by=subject and status<>'revoked';
  update public.io_terminal_session_members set status='revoked',revoked_at=coalesce(revoked_at,now()) where user_id=subject and status<>'revoked';
  update public.io_workspace_members set status='suspended' where user_id=subject and status<>'suspended';
  update public.chapter_members set membership_state='left',left_at=coalesce(left_at,now()),request_message=null where user_id=subject;
  update public.mission_members set membership_state='left',left_at=coalesce(left_at,now()),message=null where user_id=subject;
  update public.conversation_space_memberships set membership_state='left',left_at=coalesce(left_at,now()) where user_id=subject;
  update public.conversation_thread_members set left_at=coalesce(left_at,now()) where user_id=subject;
  update public.conversation_threads set title='Conversation' where created_by=subject;
  update public.account_privacy_requests set state='cancelled',version=version+1,updated_at=now()
    where requester_id=subject and id<>_request_id and state in ('submitted','reviewing','blocked','ready');
  update public.account_privacy_requests set member_note=null,operator_note=null where requester_id=subject and id<>_request_id;
  update public.io_terminal_sessions set title='Closed session',state=case when state='running' then 'stopped' else state end,completed_at=coalesce(completed_at,now()) where created_by=subject;
  -- Credentials are not retained as evidence. Other members' records and case,
  -- financial and governance evidence are not cascade-deleted.
  for item in select * from (values
    ('public','asks_offers','author_id'),('public','stories','author_id'),('public','mission_updates','author_id'),
    ('public','notifications','user_id'),('public','event_rsvps','user_id'),('public','lesson_progress','user_id'),('public','quiz_attempts','user_id'),
    ('public','conversation_bookmarks','user_id'),('public','conversation_reactions','user_id'),('public','conversation_read_states','user_id'),
    ('public','conversation_notification_preferences','user_id'),('public','conversation_thread_follows','user_id'),('public','conversation_mentions','mentioned_user_id'),('public','conversation_space_role_members','user_id'),('public','vouch_requests','requester_id'),
    ('public','member_location_shares','user_id'),('public','vouch_user_overrides','user_id'),
    ('private','member_location_preferences','user_id'),('private','member_location_consent_events','user_id'),('private','member_location_operations','user_id'),
    ('private','community_onboarding_state','user_id'),('private','product_client_operations','user_id'),('private','product_measurement_preferences','user_id'),('private','product_measurement_events','user_id')
  ) as inventory(schema_name,table_name,subject_column) loop
    execute format('delete from %I.%I where %I=$1',item.schema_name,item.table_name,item.subject_column) using subject;
  end loop;
  delete from public.member_blocks where blocker_id=subject or blocked_user_id=subject;
  delete from public.connection_requests where sender_id=subject or recipient_id=subject;
  delete from public.endorsements where endorser_id=subject or endorsee_id=subject;
  delete from public.spotlights where user_id=subject;
  update public.mentor_sessions set message='[Removed]',meeting_url=null,status='cancelled' where booker_id=subject or expert_id=subject;
  delete from public.newsletter_subscriptions where lower(email)=email_text;
  delete from public.contact_submissions where lower(email)=email_text;
  delete from private.email_delivery_outbox where recipient_user_id=subject;
  delete from private.event_guest_links where lower(email)=email_text or registration_id in (select id from private.event_registrations where user_id=subject);
  update private.event_delivery_outbox set status='suppressed',recipient_email=null,template_data=null,prepared_payload=null,lease_token=null,leased_at=null,error_code='account_closed'
    where registration_id in (select id from private.event_registrations where user_id=subject or (user_id is null and guest_email=email_text));
  update private.event_registrations set user_id=null,guest_name='Former guest',guest_email='removed-'||id::text||'@invalid.example',
    checked_in_by=null,identity_erased_at=coalesce(identity_erased_at,now()) where user_id=subject or (user_id is null and guest_email=email_text);
  delete from public.user_roles where user_id=subject;
  update public.vouch_codes set status='expired' where issuer_id=subject and status='active';
  -- Public invitations become archival summaries; private audit evidence remains
  -- restricted under the evidence policy rather than being falsely anonymised.
  update public.events set title='Archived event',description='This event is archived.',status='declined',lifecycle='cancelled' where organizer_id=subject;
  update private.event_access_details set location=null,join_url=null where event_id in (select id from public.events where organizer_id=subject);
  year_number:=extract(year from now() at time zone 'Asia/Kolkata')::integer;
  if extract(month from now() at time zone 'Asia/Kolkata')>3 then year_number:=year_number+1; end if;
  year_end:=(make_date(year_number,4,1)+interval '8 years') at time zone 'Asia/Kolkata';
  update private.account_closures set phase='files',finance_retained_until=case when
    exists(select 1 from public.io_usage_records where actor_user_id=subject) or exists(select 1 from public.io_invoices where created_by=subject)
    or exists(select 1 from public.io_payment_intents where created_by=subject) then year_end else null end,
    report=jsonb_build_object('policyVersion','2026-10-15.1','retainedClasses',jsonb_build_array('pseudonymous_reply_structure','security_and_governance_evidence','required_financial_evidence'),
      'binaryRemoval','pending','authRemoval','pending') where user_id=subject;
  return jsonb_build_object('phase','files');
end;
$$;

create function private.advance_account_deletion(_request_id uuid,_lease_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare subject uuid; phase text;
begin
  if not private.account_deletion_current(_request_id,_lease_token) then return jsonb_build_object('phase','superseded'); end if;
  select requester_id into subject from private.privacy_execution_jobs where request_id=_request_id;
  select c.phase into phase from private.account_closures c where c.user_id=subject for update;
  if phase='files' then
    if exists(select 1 from private.privacy_file_cleanup task where task.subject_user_id=subject and (task.state='failed' or (task.state='superseded' and exists(select 1 from storage.objects object where object.id=task.object_id or (object.bucket_id=task.bucket_id and object.name=task.storage_path))))) then
      raise exception using errcode='55000',message='File removal needs operator recovery';
    end if;
    if not exists(select 1 from private.privacy_file_cleanup where subject_user_id=subject and state in ('queued','processing'))
      and not exists(select 1 from storage.objects where owner_id=subject::text)
      and not exists(select 1 from storage.objects object join private.privacy_file_cleanup task on object.id=task.object_id or (object.bucket_id=task.bucket_id and object.name=task.storage_path) where task.subject_user_id=subject) then
      update private.account_closures set phase='auth',report=report||jsonb_build_object('binaryRemoval','confirmed') where user_id=subject;
      phase:='auth';
    end if;
  end if;
  return jsonb_build_object('phase',phase);
end;
$$;

create function private.complete_account_deletion(_request_id uuid,_lease_token uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare subject uuid;
begin
  if not private.account_deletion_current(_request_id,_lease_token) then return false; end if;
  select requester_id into subject from private.privacy_execution_jobs where request_id=_request_id;
  if not exists(select 1 from private.account_closures where user_id=subject and phase='auth')
    or not exists(select 1 from auth.users where id=subject and deleted_at is not null and coalesce(jsonb_strip_nulls(raw_user_meta_data),'{}'::jsonb)='{}'::jsonb)
    or exists(select 1 from storage.objects where owner_id=subject::text) then
    raise exception using errcode='55000',message='Account identity removal is not confirmed';
  end if;
  update private.account_closures set phase='completed',completed_at=now(),report=report||jsonb_build_object('authRemoval','confirmed') where user_id=subject;
  update private.privacy_execution_jobs set state='succeeded',completed_at=now(),lease_token=null,leased_at=null where request_id=_request_id;
  update public.account_privacy_requests set state='completed',completed_at=now(),version=version+1,updated_at=now(),member_note=null,
    operator_note='Account access and ordinary account data were removed. Required financial, security and governance records remain restricted under the retention policy.' where id=_request_id;
  return true;
end;
$$;

create function private.defer_account_deletion(_request_id uuid,_lease_token uuid,_failed boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.account_privacy_requests%rowtype; j private.privacy_execution_jobs%rowtype;
begin
  perform private.privacy_service_only();
  select * into r from public.account_privacy_requests where id=_request_id for update;
  select * into j from private.privacy_execution_jobs where request_id=r.id for update;
  if j.request_id is null or _lease_token is null or _failed is null or j.state<>'processing' or j.lease_token is distinct from _lease_token then return false; end if;
  update private.privacy_execution_jobs set state=case when _failed and attempt_count>=5 then 'failed' else 'queued' end,
    not_before=now()+interval '5 minutes',attempt_count=case when _failed then attempt_count else 0 end,lease_token=null,leased_at=null,
    error_code=case when _failed then 'deletion_step_unconfirmed' else null end where request_id=j.request_id;
  if _failed and j.attempt_count>=5 then
    update public.account_privacy_requests set state='blocked',version=version+1,updated_at=now(),operator_note='Account closure needs privacy-team recovery. No incomplete operation is marked complete.' where id=r.id;
  end if;
  return true;
end;
$$;

-- Account-owned conversation bytes join the same immutable-path cleanup flow.
create or replace function private.privacy_cleanup_is_unreferenced(_bucket text,_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select case when _bucket='account-exports' then not exists(select 1 from private.privacy_execution_jobs j join public.account_privacy_requests r on r.id=j.request_id
    where j.artifact_path=_path and ((j.state='processing' and j.leased_at>now()-interval '5 minutes') or (j.state='succeeded' and r.state='ready' and r.artifact_expires_at>now())))
  when _bucket='education' then not exists(select 1 from public.resources where file_path=_path) and not exists(select 1 from public.lesson_attachments where file_path=_path)
  when _bucket='orbit-attachments' then not exists(select 1 from public.conversation_attachments where storage_bucket=_bucket and storage_path=_path)
  else false end;
$$;

create function private.prevent_retiring_conversation_reference()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform 1 from storage.objects where bucket_id=new.storage_bucket and name=new.storage_path for update;
  if exists(select 1 from private.privacy_file_cleanup where bucket_id=new.storage_bucket and storage_path=new.storage_path and state<>'superseded') then
    raise exception using errcode='55000',message='This attachment is retiring; upload a new file';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_retiring_conversation_reference() from public,anon,authenticated;
create trigger prevent_retiring_conversation_reference before insert or update of storage_bucket,storage_path on public.conversation_attachments
  for each row execute function private.prevent_retiring_conversation_reference();

create function private.admin_place_privacy_hold(_id uuid,_subject_user_id uuid,_event_id uuid,_reason text,_held_until timestamptz,_review_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); existing private.privacy_holds%rowtype; note text:=btrim(_reason);
begin
  if actor is null or auth.jwt()->>'aal' is distinct from 'aal2' or public.is_suspended(actor) or not private.has_admin_capability(actor,'members.support') then
    raise exception using errcode='42501',message='MFA privacy support access required'; end if;
  if _id is null or ((_subject_user_id is null)=(_event_id is null)) or note is null or char_length(note) not between 8 and 500
    or _held_until is null or _held_until<=now() or _held_until>now()+interval '1 year'
    or _review_at is null or _review_at<now() or _review_at>least(_held_until,now()+interval '30 days') then
    raise exception using errcode='22023',message='Hold requires a reason, review date and bounded expiry'; end if;
  if _subject_user_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('privacy-subject:'||_subject_user_id::text,0));
    perform 1 from auth.users where id=_subject_user_id for update;
    if not found then raise exception using errcode='22023',message='Privacy subject does not exist'; end if; end if;
  if _event_id is not null then perform 1 from public.events where id=_event_id for update;
    if not found then raise exception using errcode='22023',message='Privacy event does not exist'; end if; end if;
  perform pg_advisory_xact_lock(hashtextextended('privacy-hold:'||_id::text,0));
  select * into existing from private.privacy_holds where id=_id;
  if found then
    if existing.created_by<>actor or existing.subject_user_id is distinct from _subject_user_id or existing.event_id is distinct from _event_id
      or existing.reason<>note or existing.held_until<>_held_until or existing.review_at<>_review_at then raise exception using errcode='22023',message='Hold ID was used for another operation'; end if;
    return jsonb_build_object('id',existing.id,'replayed',true);
  end if;
  insert into private.privacy_holds(id,subject_user_id,event_id,reason,held_until,review_at,created_by)
    values(_id,_subject_user_id,_event_id,note,_held_until,_review_at,actor);
  insert into private.admin_operation_events(actor_user_id,capability,domain,action,target_type,target_id,reason,metadata)
    values(actor,'members.support','members','privacy.hold_placed','privacy_hold',_id,note,jsonb_build_object('reviewAt',_review_at,'heldUntil',_held_until));
  return jsonb_build_object('id',_id,'replayed',false);
end;
$$;
create function private.admin_release_privacy_hold(_id uuid,_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); hold_row private.privacy_holds%rowtype; note text:=btrim(_reason);
begin
  if actor is null or auth.jwt()->>'aal' is distinct from 'aal2' or public.is_suspended(actor) or not private.has_admin_capability(actor,'members.support') then
    raise exception using errcode='42501',message='MFA privacy support access required'; end if;
  if note is null or char_length(note) not between 8 and 500 then raise exception using errcode='22023',message='Hold release requires a reason'; end if;
  select * into hold_row from private.privacy_holds where id=_id for update;
  if hold_row.id is null then raise exception using errcode='P0002',message='Privacy hold does not exist'; end if;
  if hold_row.released_at is null then
    update private.privacy_holds set released_at=now() where id=_id;
    insert into private.admin_operation_events(actor_user_id,capability,domain,action,target_type,target_id,reason,metadata)
      values(actor,'members.support','members','privacy.hold_released','privacy_hold',_id,note,'{}'::jsonb);
  end if;
  return jsonb_build_object('id',_id,'released',true);
end;
$$;
create function private.admin_privacy_hold_queue()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or auth.jwt()->>'aal' is distinct from 'aal2' or public.is_suspended(auth.uid()) or not private.has_admin_capability(auth.uid(),'members.support') then
    raise exception using errcode='42501',message='MFA privacy support access required'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(held)),'[]'::jsonb) from (select id,subject_user_id,event_id,reason,held_until,review_at
    from private.privacy_holds where released_at is null and held_until>now() order by review_at,id limit 50) held);
end;
$$;

revoke all on function private.schedule_account_deletion(uuid,integer,text) from public,anon,authenticated;
grant execute on function private.schedule_account_deletion(uuid,integer,text) to authenticated;
create function public.schedule_account_deletion(_request_id uuid,_expected_version integer,_reason text) returns jsonb language plpgsql security invoker set search_path='' as $wrapper$ begin return private.schedule_account_deletion(_request_id,_expected_version,_reason); end; $wrapper$;
revoke all on function public.schedule_account_deletion(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.schedule_account_deletion(uuid,integer,text) to authenticated;

revoke all on function private.claim_account_deletion() from public,anon,authenticated;
grant execute on function private.claim_account_deletion() to service_role;
create function public.claim_account_deletion() returns jsonb language plpgsql security invoker set search_path='' as $wrapper$ begin return private.claim_account_deletion(); end; $wrapper$;
revoke all on function public.claim_account_deletion() from public,anon,authenticated;
grant execute on function public.claim_account_deletion() to service_role;

revoke all on function private.account_deletion_current(uuid,uuid) from public,anon,authenticated;
grant execute on function private.account_deletion_current(uuid,uuid) to service_role;
create function public.account_deletion_current(_request_id uuid,_lease_token uuid) returns boolean language plpgsql security invoker set search_path='' as $wrapper$ begin return private.account_deletion_current(_request_id,_lease_token); end; $wrapper$;
revoke all on function public.account_deletion_current(uuid,uuid) from public,anon,authenticated;
grant execute on function public.account_deletion_current(uuid,uuid) to service_role;

revoke all on function private.erase_closed_account_data(uuid,uuid) from public,anon,authenticated;
grant execute on function private.erase_closed_account_data(uuid,uuid) to service_role;
create function public.erase_closed_account_data(_request_id uuid,_lease_token uuid) returns jsonb language plpgsql security invoker set search_path='' as $wrapper$ begin return private.erase_closed_account_data(_request_id,_lease_token); end; $wrapper$;
revoke all on function public.erase_closed_account_data(uuid,uuid) from public,anon,authenticated;
grant execute on function public.erase_closed_account_data(uuid,uuid) to service_role;

revoke all on function private.advance_account_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function private.advance_account_deletion(uuid,uuid) to service_role;
create function public.advance_account_deletion(_request_id uuid,_lease_token uuid) returns jsonb language plpgsql security invoker set search_path='' as $wrapper$ begin return private.advance_account_deletion(_request_id,_lease_token); end; $wrapper$;
revoke all on function public.advance_account_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.advance_account_deletion(uuid,uuid) to service_role;

revoke all on function private.complete_account_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function private.complete_account_deletion(uuid,uuid) to service_role;
create function public.complete_account_deletion(_request_id uuid,_lease_token uuid) returns boolean language plpgsql security invoker set search_path='' as $wrapper$ begin return private.complete_account_deletion(_request_id,_lease_token); end; $wrapper$;
revoke all on function public.complete_account_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.complete_account_deletion(uuid,uuid) to service_role;

revoke all on function private.defer_account_deletion(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function private.defer_account_deletion(uuid,uuid,boolean) to service_role;
create function public.defer_account_deletion(_request_id uuid,_lease_token uuid,_failed boolean) returns boolean language plpgsql security invoker set search_path='' as $wrapper$ begin return private.defer_account_deletion(_request_id,_lease_token,_failed); end; $wrapper$;
revoke all on function public.defer_account_deletion(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.defer_account_deletion(uuid,uuid,boolean) to service_role;

revoke all on function private.admin_place_privacy_hold(uuid,uuid,uuid,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function private.admin_place_privacy_hold(uuid,uuid,uuid,text,timestamptz,timestamptz) to authenticated;
create function public.admin_place_privacy_hold(_id uuid,_subject_user_id uuid,_event_id uuid,_reason text,_held_until timestamptz,_review_at timestamptz) returns jsonb language plpgsql security invoker set search_path='' as $wrapper$ begin return private.admin_place_privacy_hold(_id,_subject_user_id,_event_id,_reason,_held_until,_review_at); end; $wrapper$;
revoke all on function public.admin_place_privacy_hold(uuid,uuid,uuid,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_place_privacy_hold(uuid,uuid,uuid,text,timestamptz,timestamptz) to authenticated;

revoke all on function private.admin_release_privacy_hold(uuid,text) from public,anon,authenticated;
grant execute on function private.admin_release_privacy_hold(uuid,text) to authenticated;
create function public.admin_release_privacy_hold(_id uuid,_reason text) returns jsonb language plpgsql security invoker set search_path='' as $wrapper$ begin return private.admin_release_privacy_hold(_id,_reason); end; $wrapper$;
revoke all on function public.admin_release_privacy_hold(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_release_privacy_hold(uuid,text) to authenticated;

revoke all on function private.admin_privacy_hold_queue() from public,anon,authenticated;
grant execute on function private.admin_privacy_hold_queue() to authenticated;
create function public.admin_privacy_hold_queue() returns jsonb language plpgsql security invoker set search_path='' as $wrapper$ begin return private.admin_privacy_hold_queue(); end; $wrapper$;
revoke all on function public.admin_privacy_hold_queue() from public,anon,authenticated;
grant execute on function public.admin_privacy_hold_queue() to authenticated;

create function private.account_identity_removed(_request_id uuid,_lease_token uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not private.account_deletion_current(_request_id,_lease_token) then return false; end if;
  return exists(select 1 from private.privacy_execution_jobs j join auth.users u on u.id=j.requester_id
    where j.request_id=_request_id and u.deleted_at is not null and coalesce(jsonb_strip_nulls(u.raw_user_meta_data),'{}'::jsonb)='{}'::jsonb);
end;
$$;
revoke all on function private.account_identity_removed(uuid,uuid) from public,anon,authenticated;
grant execute on function private.account_identity_removed(uuid,uuid) to service_role;
create function public.account_identity_removed(_request_id uuid,_lease_token uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin return private.account_identity_removed(_request_id,_lease_token); end;
$$;
revoke all on function public.account_identity_removed(uuid,uuid) from public,anon,authenticated;
grant execute on function public.account_identity_removed(uuid,uuid) to service_role;

create function private.retry_account_deletion(_request_id uuid,_expected_version integer,_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); r public.account_privacy_requests%rowtype; j private.privacy_execution_jobs%rowtype; note text:=btrim(_reason);
begin
  if actor is null or auth.jwt()->>'aal' is distinct from 'aal2' or public.is_suspended(actor) or not private.has_admin_capability(actor,'members.support') then
    raise exception using errcode='42501',message='MFA privacy support access required'; end if;
  if note is null or char_length(note) not between 8 and 1000 or _expected_version is null then raise exception using errcode='22023',message='Recovery requires a version and reason'; end if;
  select * into r from public.account_privacy_requests where id=_request_id for update;
  select * into j from private.privacy_execution_jobs where request_id=r.id for update;
  if r.id is null or j.kind<>'deletion' or j.started_at is null or r.state not in ('blocked','reviewing') then raise exception using errcode='22023',message='Account closure is not recoverable here'; end if;
  if r.version<>_expected_version then raise exception using errcode='40001',message='Privacy request changed; refresh before recovery'; end if;
  if j.state='processing' and j.leased_at>now()-interval '5 minutes' then raise exception using errcode='55000',message='A deletion step is still in progress'; end if;
  if private.privacy_is_held(j.requester_id,null) then raise exception using errcode='55000',message='A legal or safety hold is active'; end if;
  update public.account_privacy_requests set state='reviewing',version=version+1,updated_at=now(),assigned_to=actor,operator_note=note where id=r.id returning * into r;
  update private.privacy_execution_jobs set state='queued',request_version=r.version,attempt_count=0,lease_token=null,leased_at=null,not_before=now(),error_code=null where request_id=r.id;
  update private.privacy_file_cleanup set state='queued',attempt_count=0,lease_token=null,leased_at=null,due_at=now(),error_code=null where subject_user_id=j.requester_id and state='failed';
  insert into private.admin_operation_events(actor_user_id,capability,domain,action,target_type,target_id,reason,metadata)
    values(actor,'members.support','members','privacy.deletion_retried','account_privacy_request',r.id,note,jsonb_build_object('version',r.version));
  return jsonb_build_object('id',r.id,'state',r.state,'version',r.version,'assignedToMe',true);
end;
$$;
revoke all on function private.retry_account_deletion(uuid,integer,text) from public,anon,authenticated;
grant execute on function private.retry_account_deletion(uuid,integer,text) to authenticated;
create function public.retry_account_deletion(_request_id uuid,_expected_version integer,_reason text) returns jsonb language plpgsql security invoker set search_path='' as $$
begin return private.retry_account_deletion(_request_id,_expected_version,_reason); end;
$$;
revoke all on function public.retry_account_deletion(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.retry_account_deletion(uuid,integer,text) to authenticated;


-- Bind a pending browser submission to the account that opened the form.
create function private.request_my_account_privacy_action_v2(_expected_user_id uuid,_request_type text,_member_note text default null,_confirmation_text text default null,_client_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or auth.uid() is distinct from _expected_user_id or not private.account_access_open()
    or not exists(select 1 from auth.users where id=auth.uid() and deleted_at is null) then
    raise exception using errcode='42501',message='Account changed; reopen privacy settings';
  end if;
  return public.request_my_account_privacy_action(_request_type,_member_note,_confirmation_text,_client_request_id);
end;
$$;
revoke all on function private.request_my_account_privacy_action_v2(uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function private.request_my_account_privacy_action_v2(uuid,text,text,text,uuid) to authenticated;
create function public.request_my_account_privacy_action_v2(_expected_user_id uuid,_request_type text,_member_note text default null,_confirmation_text text default null,_client_request_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin return private.request_my_account_privacy_action_v2(_expected_user_id,_request_type,_member_note,_confirmation_text,_client_request_id); end;
$$;
revoke all on function public.request_my_account_privacy_action_v2(uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.request_my_account_privacy_action_v2(uuid,text,text,text,uuid) to authenticated;
