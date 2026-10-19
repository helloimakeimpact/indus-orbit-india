-- Owner delegated retention defaults on 15 October 2026. This migration
-- installs service-only execution contracts; it starts no schedules or purges.
create table private.privacy_execution_jobs (
  request_id uuid primary key references public.account_privacy_requests(id) on delete cascade,
  requester_id uuid not null,
  kind text not null check(kind in ('export','deletion')),
  request_version integer not null,
  policy_version text not null default '2026-10-15.1' check(policy_version='2026-10-15.1'),
  state text not null default 'queued' check(state in ('queued','processing','succeeded','failed','cancelled')),
  not_before timestamptz not null default now(),
  attempt_count integer not null default 0 check(attempt_count between 0 and 5),
  lease_token uuid,
  leased_at timestamptz,
  started_at timestamptz,
  artifact_path text,
  artifact_sha256 text,
  artifact_bytes integer,
  error_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index privacy_execution_due_idx on private.privacy_execution_jobs(not_before,created_at)
  where state in ('queued','processing');
create index privacy_execution_requester_idx on private.privacy_execution_jobs(requester_id);

create table private.privacy_holds (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid,
  event_id uuid,
  reason text not null check(char_length(btrim(reason)) between 8 and 500),
  held_until timestamptz not null check(held_until>created_at),
  review_at timestamptz not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  check(subject_user_id is not null or event_id is not null),
  check(review_at>=created_at and review_at<=held_until)
);
create index privacy_holds_subject_idx on private.privacy_holds(subject_user_id,held_until) where released_at is null;
create index privacy_holds_event_idx on private.privacy_holds(event_id,held_until) where released_at is null;

create table private.privacy_file_cleanup (
  object_id uuid primary key,
  bucket_id text not null,
  storage_path text not null,
  object_version text,
  subject_user_id uuid,
  reason text not null check(reason in ('expired_export','cancelled_export','orphan_upload','account_deletion')),
  state text not null default 'queued' check(state in ('queued','processing','deleted','superseded','failed')),
  due_at timestamptz not null default now(),
  attempt_count integer not null default 0 check(attempt_count between 0 and 5),
  lease_token uuid,
  leased_at timestamptz,
  error_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index privacy_cleanup_due_idx on private.privacy_file_cleanup(due_at,created_at) where state in ('queued','processing');
create index privacy_cleanup_subject_idx on private.privacy_file_cleanup(subject_user_id);

alter table private.privacy_execution_jobs enable row level security;
alter table private.privacy_holds enable row level security;
alter table private.privacy_file_cleanup enable row level security;
revoke all on private.privacy_execution_jobs,private.privacy_holds,private.privacy_file_cleanup from public,anon,authenticated;
grant select on private.privacy_execution_jobs,private.privacy_file_cleanup to service_role;

create function private.privacy_service_only()
returns void language plpgsql stable set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then
    raise exception using errcode='42501',message='Privacy service authentication required';
  end if;
end;
$$;
revoke all on function private.privacy_service_only() from public,anon,authenticated;

create function private.privacy_is_held(_subject uuid,_event uuid default null)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.privacy_holds h where h.released_at is null and h.held_until>now()
    and ((_subject is not null and (h.subject_user_id=_subject or h.event_id in
      (select event_id from private.event_registrations where user_id=_subject union select id from public.events where organizer_id=_subject)))
      or (_event is not null and h.event_id=_event)));
$$;
revoke all on function private.privacy_is_held(uuid,uuid) from public,anon,authenticated;

create function private.sync_privacy_execution_request()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' and new.request_type='export' then
    insert into private.privacy_execution_jobs(request_id,requester_id,kind,request_version)
      values(new.id,new.requester_id,'export',new.version);
  elsif tg_op='UPDATE' then
    if new.state in ('cancelled','rejected','expired') then
      update private.privacy_execution_jobs set state='cancelled',lease_token=null,leased_at=null
        where request_id=new.id and state in ('queued','processing');
    elsif new.state='blocked' then
      update private.privacy_execution_jobs set state='failed',lease_token=null,leased_at=null
        where request_id=new.id and state in ('queued','processing');
    end if;
  end if;
  return new;
end;
$$;
create trigger sync_privacy_execution_request after insert or update on public.account_privacy_requests
  for each row execute function private.sync_privacy_execution_request();
insert into private.privacy_execution_jobs(request_id,requester_id,kind,request_version)
  select id,requester_id,'export',version from public.account_privacy_requests where request_type='export' and state in ('submitted','reviewing');

create function private.claim_account_export()
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.account_privacy_requests%rowtype; j private.privacy_execution_jobs%rowtype;
begin
  perform private.privacy_service_only();
  -- Parent request precedes its job lock, consistently with cancellation/review.
  select q.* into r from public.account_privacy_requests q join private.privacy_execution_jobs w on w.request_id=q.id
    where w.kind='export' and q.state in ('submitted','reviewing') and w.attempt_count<5
      and ((w.state='queued' and w.not_before<=now()) or (w.state='processing' and w.leased_at<now()-interval '5 minutes'))
    order by w.not_before,w.created_at,q.id limit 1 for update of q skip locked;
  if not found then return null; end if;
  update public.account_privacy_requests set state='reviewing',version=version+1,updated_at=now() where id=r.id returning * into r;
  update private.privacy_execution_jobs set state='processing',request_version=r.version,attempt_count=attempt_count+1,
    lease_token=gen_random_uuid(),leased_at=now(),error_code=null,
    artifact_path=r.requester_id::text||'/'||r.id::text||'/'||gen_random_uuid()::text||'.json'
    where request_id=r.id returning * into j;
  return jsonb_build_object('request_id',j.request_id,'requester_id',j.requester_id,'lease_token',j.lease_token,
    'artifact_path',j.artifact_path,'policy_version',j.policy_version);
end;
$$;

create function private.account_export_current(_request_id uuid,_lease_token uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.account_privacy_requests%rowtype; j private.privacy_execution_jobs%rowtype;
begin
  perform private.privacy_service_only();
  select * into r from public.account_privacy_requests where id=_request_id for update;
  select * into j from private.privacy_execution_jobs where request_id=r.id for update;
  return coalesce(r.request_type='export' and r.state='reviewing' and j.state='processing'
    and j.request_version=r.version and j.lease_token=_lease_token and j.leased_at>now()-interval '5 minutes'
    and exists(select 1 from auth.users u where u.id=r.requester_id and u.deleted_at is null),false);
end;
$$;

create function private.build_account_export(_request_id uuid,_lease_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare subject uuid; dataset record; rows jsonb; body jsonb := '{}'::jsonb;
begin
  if not private.account_export_current(_request_id,_lease_token) then
    raise exception using errcode='40001',message='Privacy request is no longer current';
  end if;
  select requester_id into subject from private.privacy_execution_jobs where request_id=_request_id;
  -- These identifiers, predicates and columns are reviewed source literals.
  -- No browser input participates in dynamic SQL and new columns are excluded.
  for dataset in select * from (values
('public.profiles','public','profiles','"id","user_id","display_name","headline","bio","city","country","avatar_url","linkedin_url","website_url","orbit_segment","is_public","created_at","updated_at","is_verified","verified_at","verified_by","segment_details","region","timezone","notification_prefs","booking_url","segment_details_text"','user_id = $1'),
('public.asks_offers','public','asks_offers','"id","author_id","kind","title","body","segment_target","region","sector","expires_at","status","created_at","updated_at"','author_id = $1'),
('public.chapter_members','public','chapter_members','"chapter_id","user_id","role","membership_state","requested_at","left_at","request_message"','user_id = $1'),
('public.chapter_proposals','public','chapter_proposals','"id","proposed_name","city","country","rationale","proposer_background","proposed_stewards","status","submitted_at"','proposer_id = $1'),
('public.connection_requests','public','connection_requests','"id","sender_id","recipient_id","note","status","created_at","responded_at"','sender_id = $1 or recipient_id = $1'),
('public.conversation_messages','public','conversation_messages','"id","author_id","room_id","thread_id","content","created_at","edited_at","deleted_at","reply_to_message_id"','author_id = $1'),
('public.conversation_bookmarks','public','conversation_bookmarks','"user_id","message_id","created_at"','user_id = $1'),
('public.conversation_reactions','public','conversation_reactions','"message_id","user_id","reaction_key","created_at"','user_id = $1'),
('public.conversation_notification_preferences','public','conversation_notification_preferences','"user_id","space_id","room_id","preference","quiet_hours","updated_at","id"','user_id = $1'),
('public.conversation_read_states','public','conversation_read_states','"user_id","room_id","last_read_message_id","last_read_at","updated_at"','user_id = $1'),
('public.conversation_thread_follows','public','conversation_thread_follows','"thread_id","user_id","followed_at","last_read_message_id","last_read_at","updated_at"','user_id = $1'),
('public.direct_messages','public','direct_messages','"id","sender_id","recipient_id","content","created_at","read_at"','sender_id = $1 or recipient_id = $1'),
('public.endorsements','public','endorsements','"id","endorser_id","endorsee_id","note","segment","created_at"','endorser_id = $1'),
('public.event_rsvps','public','event_rsvps','"id","event_id","user_id","status","note","created_at","updated_at"','user_id = $1'),
('public.events','public','events','"id","title","description","start_time","end_time","timezone","location_type","public_location","registration_scope","visibility","capacity","requires_approval","status","lifecycle"','organizer_id = $1'),
('private.event_registrations','private','event_registrations','"id","event_id","user_id","status","approved_at","checked_in_at","created_at","updated_at"','user_id = $1'),
('public.lesson_progress','public','lesson_progress','"user_id","lesson_id","completed_at"','user_id = $1'),
('public.quiz_attempts','public','quiz_attempts','"id","user_id","quiz_id","score","passed","answers","created_at"','user_id = $1'),
('public.mission_members','public','mission_members','"mission_id","user_id","role","membership_state","message","requested_at","left_at"','user_id = $1'),
('public.mission_updates','public','mission_updates','"id","mission_id","author_id","content","created_at","is_pinned","client_request_id"','author_id = $1'),
('public.mentor_sessions','public','mentor_sessions','"id","expert_id","booker_id","duration_mins","message","status","meeting_url","scheduled_for","created_at","updated_at","client_request_id"','booker_id = $1 or expert_id = $1'),
('public.notifications','public','notifications','"id","user_id","type","message","link","is_read","created_at","category"','user_id = $1'),
('public.stories','public','stories','"id","author_id","title","content","status","created_at","published_at","mission_id","chapter_id"','author_id = $1'),
('public.resources','public','resources','"id","title","description","category","tags","kind","url","file_path","file_name","mime_type","chapter_id","created_by","status","created_at","updated_at"','created_by = $1'),
('public.lesson_attachments','public','lesson_attachments','"id","lesson_id","file_name","file_path","file_size","mime_type","uploaded_by","created_at"','uploaded_by = $1'),
('public.conversation_attachments','public','conversation_attachments','"id","message_id","file_name","content_type","byte_size","storage_bucket","storage_path","created_at","scan_status"','uploaded_by = $1'),
('public.member_location_shares','public','member_location_shares','"user_id","audience","precision","country_code","region_id","place_id","region_label","city_label","consent_version","shared_at","updated_at"','user_id = $1'),
('private.member_location_preferences','private','member_location_preferences','"user_id","country_code","legacy_country_label","region_label","city_label","timezone_name","legacy_timezone_label","use_for_scheduling","use_for_recommendations","source","consent_version","consented_at","created_at","updated_at"','user_id = $1'),
('private.community_onboarding_state','private','community_onboarding_state','"user_id","status","current_step","version","started_at","paused_at","completed_at","created_at","updated_at"','user_id = $1'),
('public.io_api_keys','public','io_api_keys','"id","name","workspace_id","created_at","expires_at","revoked_at","status","scopes"','created_by = $1'),
('public.io_route_receipts','public','io_route_receipts','"id","request_id","workspace_id","created_at","completed_at","selected_provider_key","selected_model_key","input_tokens","output_tokens","provider_cost_nanos","service_fee_nanos","customer_charge_nanos","result_state"','actor_user_id = $1'),
('public.io_usage_records','public','io_usage_records','"id","workspace_id","request_id","recorded_at","input_tokens","output_tokens","currency_code","provider_cost_nanos","service_fee_nanos","customer_charge_nanos","amount_due_nanos"','actor_user_id = $1'),
('public.io_terminal_sessions','public','io_terminal_sessions','"id","workspace_id","title","mode","state","created_at","started_at","completed_at"','created_by = $1'),
('public.account_privacy_requests','public','account_privacy_requests','"id","request_type","state","member_note","operator_note","submitted_at","updated_at","completed_at"','requester_id = $1')
  ) as inventory(dataset_key,schema_name,table_name,column_list,predicate) loop
    execute format('select coalesce(jsonb_agg(to_jsonb(selected)),''[]''::jsonb) from (select %s from %I.%I where %s limit 10001) selected',
      dataset.column_list,dataset.schema_name,dataset.table_name,dataset.predicate) into rows using subject;
    if jsonb_array_length(rows)>10000 then raise exception using errcode='54000',message='Privacy export requires assisted delivery'; end if;
    body := body||jsonb_build_object(dataset.dataset_key,rows);
    if octet_length(body::text)>5000000 then raise exception using errcode='54000',message='Privacy export requires assisted delivery'; end if;
  end loop;
  return jsonb_build_object('format','indus-orbit-account-export','format_version',1,'policy_version','2026-10-15.1',
    'generated_at',now(),'subject_user_id',subject,
    'coverage',jsonb_build_object('kind','portable_account_data','binary_files','metadata_only',
      'supplements','Contact the privacy team for financial, security/case or other access-request supplements. Other guests, credentials and internal case evidence are excluded.'),
    'datasets',body);
end;
$$;

create function private.complete_account_export(_request_id uuid,_lease_token uuid,_sha256 text,_byte_size integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare j private.privacy_execution_jobs%rowtype; expiry timestamptz;
begin
  if not private.account_export_current(_request_id,_lease_token) then return false; end if;
  select * into j from private.privacy_execution_jobs where request_id=_request_id;
  if _sha256 is null or _sha256!~'^[a-f0-9]{64}$' or _byte_size is null or _byte_size not between 1 and 5242880 then
    raise exception using errcode='22023',message='Invalid privacy artifact evidence';
  end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='account-exports' and o.name=j.artifact_path
      and (o.metadata->>'size')::bigint=_byte_size) then
    raise exception using errcode='22023',message='Privacy artifact upload is not confirmed';
  end if;
  expiry := now()+interval '7 days';
  update private.privacy_execution_jobs set state='succeeded',artifact_sha256=_sha256,artifact_bytes=_byte_size,
    lease_token=null,leased_at=null,completed_at=now() where request_id=j.request_id;
  update public.account_privacy_requests set state='ready',artifact_expires_at=expiry,updated_at=now(),version=version+1 where id=j.request_id;
  return true;
end;
$$;

create function private.fail_account_export(_request_id uuid,_lease_token uuid,_error_code text)
returns boolean language plpgsql security definer set search_path='' as $$
declare j private.privacy_execution_jobs%rowtype; r public.account_privacy_requests%rowtype;
begin
  perform private.privacy_service_only();
  select * into r from public.account_privacy_requests where id=_request_id for update;
  select * into j from private.privacy_execution_jobs where request_id=r.id for update;
  if r.id is null or j.request_id is null or _lease_token is null or r.state<>'reviewing' or j.state<>'processing' or j.lease_token is distinct from _lease_token or j.request_version<>r.version then return false; end if;
  if _error_code not in ('backend_unavailable','artifact_upload_failed','export_requires_assistance','artifact_unconfirmed') then
    raise exception using errcode='22023',message='Invalid privacy failure code';
  end if;
  update private.privacy_execution_jobs set state=case when attempt_count>=5 or _error_code='export_requires_assistance' then 'failed' else 'queued' end,
    not_before=now()+interval '5 minutes',lease_token=null,leased_at=null,error_code=_error_code where request_id=j.request_id;
  if j.attempt_count>=5 or _error_code='export_requires_assistance' then
    update public.account_privacy_requests set state='blocked',operator_note='Automated delivery needs privacy-team assistance. Your request remains recorded.',
      updated_at=now(),version=version+1 where id=j.request_id;
  end if;
  return true;
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('account-exports','account-exports',false,5242880,array['application/json']) on conflict(id) do nothing;

create function private.my_export_object_allowed(_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from auth.users u where u.id=auth.uid() and u.deleted_at is null)
    and exists(select 1 from private.privacy_execution_jobs j join public.account_privacy_requests r on r.id=j.request_id
    where j.artifact_path=_path and j.requester_id=auth.uid() and j.state='succeeded' and r.state='ready' and r.artifact_expires_at>now());
$$;
revoke all on function private.my_export_object_allowed(text) from public,anon;
grant execute on function private.my_export_object_allowed(text) to authenticated;
create policy "Members download their current private export" on storage.objects for select to authenticated
  using(bucket_id='account-exports' and private.my_export_object_allowed(name));
create policy "Privacy exports cannot be browsed or changed" on storage.objects as restrictive for all to authenticated
  using(bucket_id<>'account-exports' or private.my_export_object_allowed(name))
  with check(bucket_id<>'account-exports');
create policy "Privacy exports require service deletion" on storage.objects as restrictive for delete to authenticated
  using(bucket_id<>'account-exports');
create policy "Privacy exports deny anonymous access" on storage.objects as restrictive for all to anon
  using(bucket_id<>'account-exports') with check(bucket_id<>'account-exports');

create function private.get_my_account_export(_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare j private.privacy_execution_jobs%rowtype; r public.account_privacy_requests%rowtype;
begin
  select * into r from public.account_privacy_requests where id=_request_id and requester_id=auth.uid();
  select * into j from private.privacy_execution_jobs where request_id=r.id;
  if not private.my_export_object_allowed(j.artifact_path) then raise exception using errcode='42501',message='Export is unavailable or expired'; end if;
  return jsonb_build_object('bucket','account-exports','path',j.artifact_path,'sha256',j.artifact_sha256,
    'byte_size',j.artifact_bytes,'expires_in',greatest(1,least(300,extract(epoch from (r.artifact_expires_at-now()))::integer)));
end;
$$;

-- Private definer implementations; explicit public PL/pgSQL invoker wrappers.

revoke all on function private.claim_account_export() from public,anon,authenticated;
grant execute on function private.claim_account_export() to service_role;
create function public.claim_account_export() returns jsonb
language plpgsql security invoker set search_path='' as $wrapper$
begin return private.claim_account_export(); end;
$wrapper$;
revoke all on function public.claim_account_export() from public,anon,authenticated;
grant execute on function public.claim_account_export() to service_role;

revoke all on function private.account_export_current(uuid,uuid) from public,anon,authenticated;
grant execute on function private.account_export_current(uuid,uuid) to service_role;
create function public.account_export_current(_request_id uuid,_lease_token uuid) returns boolean
language plpgsql security invoker set search_path='' as $wrapper$
begin return private.account_export_current(_request_id,_lease_token); end;
$wrapper$;
revoke all on function public.account_export_current(uuid,uuid) from public,anon,authenticated;
grant execute on function public.account_export_current(uuid,uuid) to service_role;

revoke all on function private.build_account_export(uuid,uuid) from public,anon,authenticated;
grant execute on function private.build_account_export(uuid,uuid) to service_role;
create function public.build_account_export(_request_id uuid,_lease_token uuid) returns jsonb
language plpgsql security invoker set search_path='' as $wrapper$
begin return private.build_account_export(_request_id,_lease_token); end;
$wrapper$;
revoke all on function public.build_account_export(uuid,uuid) from public,anon,authenticated;
grant execute on function public.build_account_export(uuid,uuid) to service_role;

revoke all on function private.complete_account_export(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function private.complete_account_export(uuid,uuid,text,integer) to service_role;
create function public.complete_account_export(_request_id uuid,_lease_token uuid,_sha256 text,_byte_size integer) returns boolean
language plpgsql security invoker set search_path='' as $wrapper$
begin return private.complete_account_export(_request_id,_lease_token,_sha256,_byte_size); end;
$wrapper$;
revoke all on function public.complete_account_export(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.complete_account_export(uuid,uuid,text,integer) to service_role;

revoke all on function private.fail_account_export(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.fail_account_export(uuid,uuid,text) to service_role;
create function public.fail_account_export(_request_id uuid,_lease_token uuid,_error_code text) returns boolean
language plpgsql security invoker set search_path='' as $wrapper$
begin return private.fail_account_export(_request_id,_lease_token,_error_code); end;
$wrapper$;
revoke all on function public.fail_account_export(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.fail_account_export(uuid,uuid,text) to service_role;

revoke all on function private.get_my_account_export(uuid) from public,anon,authenticated;
grant execute on function private.get_my_account_export(uuid) to authenticated;
create function public.get_my_account_export(_request_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $wrapper$
begin return private.get_my_account_export(_request_id); end;
$wrapper$;
revoke all on function public.get_my_account_export(uuid) from public,anon,authenticated;
grant execute on function public.get_my_account_export(uuid) to authenticated;

-- Expiry, bounded retention and byte cleanup share the same hold boundary.
alter table private.event_registrations add column identity_erased_at timestamptz;
create index event_registration_retention_idx on private.event_registrations(event_id,updated_at,id) where identity_erased_at is null;

create function private.privacy_retention_due(_last_processed timestamptz,_ordinary_due timestamptz)
returns boolean language sql stable set search_path='' as $$
  select _ordinary_due<=now() and (now()<timestamptz '2027-05-13 00:00:00+05:30'
    or _last_processed+interval '1 year'<=now());
$$;
revoke all on function private.privacy_retention_due(timestamptz,timestamptz) from public,anon,authenticated;

create or replace function private.event_registration_eligible(_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select r.identity_erased_at is null and case when e.registration_scope='public' then
    (r.user_id is null or not public.is_suspended(r.user_id))
    and (r.guest_email is not null or exists(select 1 from auth.users u where u.id=r.user_id and u.email_confirmed_at is not null))
    and not exists(select 1 from auth.users u where lower(u.email)=r.guest_email and public.is_suspended(u.id))
    else private.event_member_eligible(r.user_id,e.chapter_id,e.registration_scope) end
    from private.event_registrations r join public.events e on e.id=r.event_id where r.id=_id),false);
$$;

create function private.run_privacy_retention_batch()
returns jsonb language plpgsql security definer set search_path='' as $$
declare e record; r record; erased integer:=0; cleared integer:=0; n integer; requests_expired integer:=0;
begin
  perform private.privacy_service_only();
  -- The event parent lock matches the edit/register/dispatch lock order.
  for e in select event.id,event.end_time from public.events event
    where event.end_time<now()-interval '90 days' and not private.privacy_is_held(null,event.id)
      and exists(select 1 from private.event_registrations reg where reg.event_id=event.id and reg.identity_erased_at is null)
    order by event.end_time,event.id limit 10 for update of event skip locked loop
    for r in select reg.* from private.event_registrations reg where reg.event_id=e.id and reg.identity_erased_at is null
      and private.privacy_retention_due(reg.updated_at,e.end_time+interval '90 days')
      and not private.privacy_is_held(reg.user_id,e.id) order by reg.id limit 100 for update skip locked loop
      if r.user_id is not null and not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended('privacy-subject:'||r.user_id::text,0)) then continue; end if;
      if private.privacy_is_held(r.user_id,e.id) then continue; end if;
      delete from private.event_guest_links where registration_id=r.id;
      -- Keep counts/status, remove the attendee linkage and direct identity.
      update private.event_delivery_outbox set status='suppressed',recipient_email=null,template_data=null,prepared_payload=null,
        lease_token=null,leased_at=null,error_code='privacy_retention' where registration_id=r.id and status in ('pending','processing');
      update private.event_registrations set user_id=null,guest_name='Former guest',
        guest_email='removed-'||id::text||'@invalid.example',checked_in_by=null,identity_erased_at=now()
        where id=r.id;
      erased:=erased+1;
    end loop;
  end loop;
  with due as (
    select q.id from private.event_delivery_outbox q join public.events event on event.id=q.event_id
      join private.event_registrations reg on reg.id=q.registration_id
      where q.status in ('delivered','dead','suppressed')
        and (q.recipient_email is not null or q.template_data is not null or q.prepared_payload is not null)
        and private.privacy_retention_due(coalesce(q.delivered_at,q.first_attempt_at,q.created_at),
          coalesce(q.delivered_at,q.first_attempt_at,q.created_at)+interval '30 days')
        and not private.privacy_is_held(reg.user_id,event.id)
      order by q.created_at,q.id limit 100 for update of q skip locked
  ) update private.event_delivery_outbox q set recipient_email=null,template_data=null,prepared_payload=null from due where q.id=due.id;
  get diagnostics cleared=row_count;
  -- Expired verification credentials retain a bounded day for abuse throttling.
  with due as (select token_hash from private.event_guest_links where expires_at<now()-interval '1 day'
    and not private.privacy_is_held(null,event_id) order by expires_at limit 100 for update skip locked)
  delete from private.event_guest_links l using due where l.token_hash=due.token_hash;
  get diagnostics n=row_count;
  with due as (select id from public.account_privacy_requests where request_type='export' and state='ready' and artifact_expires_at<=now()
    order by artifact_expires_at,id limit 100 for update skip locked)
  update public.account_privacy_requests request_row set state='expired',version=version+1,updated_at=now() from due where request_row.id=due.id;
  get diagnostics requests_expired=row_count;
  -- Exhausted crashed leases surface a real blocker rather than hanging forever.
  for r in select q.id from public.account_privacy_requests q join private.privacy_execution_jobs j on j.request_id=q.id
    where j.kind='export' and j.state='processing' and j.attempt_count>=5 and j.leased_at<now()-interval '5 minutes'
      and q.state='reviewing' order by q.id limit 20 for update of q skip locked loop
    update public.account_privacy_requests set state='blocked',version=version+1,updated_at=now(),
      operator_note='Automated delivery needs privacy-team assistance. Your request remains recorded.' where id=r.id;
  end loop;
  return jsonb_build_object('identities_erased',erased,'email_payloads_cleared',cleared,'expired_credentials',n,'exports_expired',requests_expired);
end;
$$;

create function private.privacy_cleanup_is_unreferenced(_bucket text,_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select case when _bucket='account-exports' then not exists(
    select 1 from private.privacy_execution_jobs j join public.account_privacy_requests r on r.id=j.request_id
      where j.artifact_path=_path and ((j.state='processing' and j.leased_at>now()-interval '5 minutes')
        or (j.state='succeeded' and r.state='ready' and r.artifact_expires_at>now())))
  when _bucket='education' then not exists(select 1 from public.resources r where r.file_path=_path)
    and not exists(select 1 from public.lesson_attachments a where a.file_path=_path)
  else false end;
$$;
revoke all on function private.privacy_cleanup_is_unreferenced(text,text) from public,anon,authenticated;

create function private.enqueue_privacy_file_cleanup()
returns void language plpgsql security definer set search_path='' as $$
declare o record; subject uuid; reason text;
begin
  perform private.privacy_service_only();
  for o in select object.* from storage.objects object
    where ((object.bucket_id='account-exports' and object.created_at<now()-interval '10 minutes')
      or (object.bucket_id='education' and object.created_at<now()-interval '30 days'))
      and not exists(select 1 from private.privacy_file_cleanup task where task.object_id=object.id)
    order by object.created_at,object.id limit 100 for update of object skip locked loop
    subject:=null;
    if o.bucket_id='account-exports' and o.name~'^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.json$' then
      begin subject:=split_part(o.name,'/',1)::uuid; exception when invalid_text_representation then continue; end;
      reason:='expired_export';
    elsif o.bucket_id='education' then
      begin
        subject:=case split_part(o.name,'/',1) when 'resources' then split_part(o.name,'/',2)::uuid
          when 'lessons' then split_part(o.name,'/',3)::uuid else null end;
      exception when invalid_text_representation then continue; end;
      reason:='orphan_upload';
    end if;
    if subject is null or private.privacy_is_held(subject,null) or not private.privacy_cleanup_is_unreferenced(o.bucket_id,o.name) then continue; end if;
    if o.bucket_id='education' and not private.privacy_retention_due(o.created_at,o.created_at+interval '30 days') then continue; end if;
    -- Unfinished upload must never age into cleanup while its worker lease runs.
    insert into private.privacy_file_cleanup(object_id,bucket_id,storage_path,object_version,subject_user_id,reason)
      values(o.id,o.bucket_id,o.name,o.version,subject,reason) on conflict(object_id) do nothing;
  end loop;
end;
$$;

create function private.prevent_retiring_object_reuse()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from private.privacy_file_cleanup t where t.bucket_id=new.bucket_id and t.storage_path=new.name and t.state<>'superseded') then
    raise exception using errcode='55000',message='This file path is retired; use a new upload path';
  end if;
  return new;
end;
$$;
create trigger prevent_retiring_object_reuse before insert or update of name,bucket_id,version,metadata on storage.objects
  for each row execute function private.prevent_retiring_object_reuse();
create index privacy_cleanup_path_idx on private.privacy_file_cleanup(bucket_id,storage_path) where state<>'superseded';

create function private.prevent_retiring_education_reference()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.file_path is null then return new; end if;
  -- Share the object lock with cleanup enqueue; recheck after waiting.
  perform 1 from storage.objects o where o.bucket_id='education' and o.name=new.file_path for update;
  if exists(select 1 from private.privacy_file_cleanup t where t.bucket_id='education' and t.storage_path=new.file_path and t.state<>'superseded') then
    raise exception using errcode='55000',message='This file is retiring; upload a new file';
  end if;
  return new;
end;
$$;
create trigger prevent_retiring_resource_reference before insert or update of file_path on public.resources
  for each row execute function private.prevent_retiring_education_reference();
create trigger prevent_retiring_lesson_reference before insert or update of file_path on public.lesson_attachments
  for each row execute function private.prevent_retiring_education_reference();

create function private.claim_privacy_file_cleanup()
returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.privacy_file_cleanup%rowtype;
begin
  perform private.privacy_service_only();
  perform private.enqueue_privacy_file_cleanup();
  update private.privacy_file_cleanup set state='failed',lease_token=null,leased_at=null,error_code='retry_exhausted'
    where state='processing' and attempt_count>=5 and leased_at<now()-interval '5 minutes';
  select * into j from private.privacy_file_cleanup task where attempt_count<5 and not private.privacy_is_held(subject_user_id,null)
    and ((state='queued' and due_at<=now()) or (state='processing' and leased_at<now()-interval '5 minutes'))
    order by due_at,created_at,object_id limit 1 for update skip locked;
  if not found then return null; end if;
  update private.privacy_file_cleanup set state='processing',attempt_count=attempt_count+1,lease_token=gen_random_uuid(),leased_at=now()
    where object_id=j.object_id returning * into j;
  return jsonb_build_object('object_id',j.object_id,'bucket_id',j.bucket_id,'storage_path',j.storage_path,'object_version',j.object_version,'lease_token',j.lease_token);
end;
$$;

create function private.privacy_file_cleanup_current(_object_id uuid,_lease_token uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare j private.privacy_file_cleanup%rowtype; o storage.objects%rowtype; subject uuid;
begin
  perform private.privacy_service_only();
  select subject_user_id into subject from private.privacy_file_cleanup where object_id=_object_id;
  if subject is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('privacy-subject:'||subject::text,0));
  end if;
  -- Object precedes its task, matching Storage/reference writes and enqueue.
  select * into o from storage.objects where id=_object_id for update;
  select * into j from private.privacy_file_cleanup where object_id=_object_id for update;
  if j.object_id is null or _lease_token is null or j.state<>'processing' or j.lease_token is distinct from _lease_token or j.leased_at<now()-interval '5 minutes' then return false; end if;
  if private.privacy_is_held(j.subject_user_id,null) then
    update private.privacy_file_cleanup set state='queued',due_at=now()+interval '1 day',lease_token=null,leased_at=null where object_id=j.object_id;
    return false;
  end if;
  if o.id is not null and (o.bucket_id<>j.bucket_id or o.name<>j.storage_path or o.version is distinct from j.object_version
    or not private.privacy_cleanup_is_unreferenced(o.bucket_id,o.name)) then
    update private.privacy_file_cleanup set state='superseded',lease_token=null,leased_at=null where object_id=j.object_id;
    return false;
  end if;
  return true;
end;
$$;

create function private.complete_privacy_file_cleanup(_object_id uuid,_lease_token uuid,_succeeded boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare j private.privacy_file_cleanup%rowtype;
begin
  perform private.privacy_service_only();
  select * into j from private.privacy_file_cleanup where object_id=_object_id for update;
  if j.object_id is null or _lease_token is null or _succeeded is null or j.state<>'processing' or j.leased_at<now()-interval '5 minutes' or j.lease_token is distinct from _lease_token then return false; end if;
  if _succeeded and exists(select 1 from storage.objects where id=j.object_id or (bucket_id=j.bucket_id and name=j.storage_path)) then
    raise exception using errcode='22023',message='Physical file removal is not confirmed';
  end if;
  update private.privacy_file_cleanup set state=case when _succeeded then 'deleted' when attempt_count>=5 then 'failed' else 'queued' end,
    due_at=now()+interval '5 minutes',lease_token=null,leased_at=null,error_code=case when _succeeded then null else 'storage_removal_failed' end,
    completed_at=case when _succeeded then now() else null end where object_id=j.object_id;
  return true;
end;
$$;

revoke all on function private.run_privacy_retention_batch() from public,anon,authenticated;
grant execute on function private.run_privacy_retention_batch() to service_role;
create function public.run_privacy_retention_batch() returns jsonb language plpgsql security invoker set search_path='' as $wrapper$ begin return private.run_privacy_retention_batch(); end; $wrapper$;
revoke all on function public.run_privacy_retention_batch() from public,anon,authenticated;
grant execute on function public.run_privacy_retention_batch() to service_role;

revoke all on function private.claim_privacy_file_cleanup() from public,anon,authenticated;
grant execute on function private.claim_privacy_file_cleanup() to service_role;
create function public.claim_privacy_file_cleanup() returns jsonb language plpgsql security invoker set search_path='' as $wrapper$ begin return private.claim_privacy_file_cleanup(); end; $wrapper$;
revoke all on function public.claim_privacy_file_cleanup() from public,anon,authenticated;
grant execute on function public.claim_privacy_file_cleanup() to service_role;

revoke all on function private.privacy_file_cleanup_current(uuid,uuid) from public,anon,authenticated;
grant execute on function private.privacy_file_cleanup_current(uuid,uuid) to service_role;
create function public.privacy_file_cleanup_current(_object_id uuid,_lease_token uuid) returns boolean language plpgsql security invoker set search_path='' as $wrapper$ begin return private.privacy_file_cleanup_current(_object_id,_lease_token); end; $wrapper$;
revoke all on function public.privacy_file_cleanup_current(uuid,uuid) from public,anon,authenticated;
grant execute on function public.privacy_file_cleanup_current(uuid,uuid) to service_role;

revoke all on function private.complete_privacy_file_cleanup(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function private.complete_privacy_file_cleanup(uuid,uuid,boolean) to service_role;
create function public.complete_privacy_file_cleanup(_object_id uuid,_lease_token uuid,_succeeded boolean) returns boolean language plpgsql security invoker set search_path='' as $wrapper$ begin return private.complete_privacy_file_cleanup(_object_id,_lease_token,_succeeded); end; $wrapper$;
revoke all on function public.complete_privacy_file_cleanup(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.complete_privacy_file_cleanup(uuid,uuid,boolean) to service_role;

revoke all on function private.enqueue_privacy_file_cleanup() from public,anon,authenticated;

revoke all on function private.prevent_retiring_object_reuse() from public,anon,authenticated;

revoke all on function private.prevent_retiring_education_reference() from public,anon,authenticated;

revoke all on function private.sync_privacy_execution_request() from public,anon,authenticated;
