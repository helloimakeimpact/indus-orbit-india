-- Existing and new education files require a current clean verdict.
-- No browser role, including an editor, can mark an object as clean.
create table private.education_file_scans (
  object_id uuid primary key references storage.objects(id) on delete cascade,
  storage_path text not null unique,
  object_version text,
  state text not null default 'pending' check(state in ('pending','processing','clean','blocked','failed')),
  attempt_count integer not null default 0 check(attempt_count between 0 and 5),
  due_at timestamptz not null default now(),
  lease_token uuid,
  leased_at timestamptz,
  content_sha256 text,
  provider_key text,
  provider_event_id text,
  error_code text,
  scanned_at timestamptz,
  created_at timestamptz not null default now()
);
create index education_scan_due_idx on private.education_file_scans(due_at,created_at)
  where state in ('pending','processing');
alter table private.education_file_scans enable row level security;
revoke all on private.education_file_scans from public,anon,authenticated;
grant select on private.education_file_scans to service_role;

create function private.quarantine_education_object()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.bucket_id='education' then
    insert into private.education_file_scans(object_id,storage_path,object_version)
      values(new.id,new.name,new.version)
      on conflict(object_id) do update set storage_path=excluded.storage_path,object_version=excluded.object_version,
        state='pending',attempt_count=0,due_at=now(),lease_token=null,leased_at=null,
        content_sha256=null,provider_key=null,provider_event_id=null,error_code=null,scanned_at=null;
  elsif tg_op='UPDATE' and old.bucket_id='education' then
    delete from private.education_file_scans where object_id=new.id;
  end if;
  return new;
end;
$$;
create trigger quarantine_education_object after insert or update of bucket_id,name,metadata,version on storage.objects
  for each row execute function private.quarantine_education_object();
insert into private.education_file_scans(object_id,storage_path,object_version)
  select id,name,version from storage.objects where bucket_id='education';

create function private.education_file_is_clean(_object_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null
    and exists(select 1 from auth.users u where u.id=auth.uid())
    and not public.is_suspended(auth.uid())
    and exists(select 1 from private.education_file_scans s join storage.objects o on o.id=s.object_id
    where s.object_id=_object_id and s.state='clean' and o.bucket_id='education'
      and s.storage_path=o.name and s.object_version is not distinct from o.version);
$$;
revoke all on function private.education_file_is_clean(uuid) from public,anon;
grant execute on function private.education_file_is_clean(uuid) to authenticated;
create policy "Education downloads require clean scans" on storage.objects as restrictive
  for select to authenticated using(bucket_id<>'education' or private.education_file_is_clean(id));
-- Signed Storage URLs authorize a path, not a content revision. A browser
-- must not overwrite or delete/recreate bytes behind a previously signed path.
-- New uploads use new paths; physical cleanup belongs to trusted service work.
create policy "Education object paths are immutable" on storage.objects as restrictive
  for update to authenticated using(bucket_id<>'education') with check(bucket_id<>'education');
create policy "Education objects require trusted removal" on storage.objects as restrictive
  for delete to authenticated using(bucket_id<>'education');

create function private.claim_education_scan_batch(_limit integer default 5)
returns table(id uuid,lease_token uuid,storage_path text,object_version text,byte_size bigint,content_type text)
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
  update private.education_file_scans set state='failed',error_code='retry_exhausted',lease_token=null,leased_at=null
    where state='processing' and leased_at<now()-interval '5 minutes' and attempt_count>=5;
  return query with due as (
    select s.object_id from private.education_file_scans s where
      ((s.state='pending' and s.due_at<=now()) or (s.state='processing' and s.leased_at<now()-interval '5 minutes'))
      and s.attempt_count<5 order by s.due_at,s.created_at,s.object_id
      limit greatest(1,least(coalesce(_limit,5),5)) for update skip locked
  ), claimed as (
    update private.education_file_scans s set state='processing',attempt_count=s.attempt_count+1,lease_token=gen_random_uuid(),leased_at=now()
      from due where s.object_id=due.object_id returning s.*
  ) select c.object_id,c.lease_token,c.storage_path,c.object_version,
      case when o.metadata->>'size'~'^[0-9]{1,10}$' then (o.metadata->>'size')::bigint else null end,
      o.metadata->>'mimetype'
      from claimed c join storage.objects o on o.id=c.object_id;
end;
$$;
create function private.complete_education_scan(_id uuid,_lease_token uuid,_verdict text,_sha256 text default null,
  _provider_key text default null,_provider_event_id text default null,_error_code text default null)
returns void language plpgsql security definer set search_path='' as $$
declare s private.education_file_scans%rowtype; o storage.objects%rowtype;
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
  -- Storage updates lock the object before its scan row. Keep that order.
  select * into o from storage.objects where id=_id for update;
  select * into s from private.education_file_scans where object_id=_id for update;
  if not found or s.state<>'processing' or s.lease_token is distinct from _lease_token or s.leased_at<now()-interval '5 minutes'
    or o.bucket_id<>'education' or o.name is distinct from s.storage_path or o.version is distinct from s.object_version then
    raise exception using errcode='22023',message='Scan lease is invalid or expired'; end if;
  if _verdict is null or _verdict not in ('clean','blocked','failed') then raise exception using errcode='22023',message='Scanner verdict required'; end if;
  if _verdict in ('clean','blocked') and (
    _sha256 is null or _sha256!~'^[a-f0-9]{64}$' or _provider_key is null or _provider_key!~'^[a-z][a-z0-9_.-]{1,79}$'
    or _provider_event_id is null or char_length(_provider_event_id) not between 8 and 200) then
    raise exception using errcode='22023',message='Trusted scanner evidence required'; end if;
  update private.education_file_scans set
    state=case when _verdict='failed' and attempt_count<5 then 'pending' else _verdict end,
    due_at=case when _verdict='failed' then now()+make_interval(secs=>least(3600,30*(2^attempt_count))::integer) else due_at end,
    content_sha256=case when _verdict in ('clean','blocked') then _sha256 else null end,
    provider_key=case when _verdict in ('clean','blocked') then _provider_key else null end,
    provider_event_id=case when _verdict in ('clean','blocked') then _provider_event_id else null end,
    scanned_at=case when _verdict in ('clean','blocked') then now() else null end,
    error_code=case when _verdict='clean' then null when _verdict='blocked' then 'malware_blocked'
      when _error_code in ('scanner_timeout','scanner_http_failure','scanner_invalid_response','scanner_unavailable') then _error_code else 'scanner_unavailable' end,
    lease_token=null,leased_at=null where object_id=_id;
end;
$$;
create function public.claim_education_scan_batch(_limit integer default 5)
returns table(id uuid,lease_token uuid,storage_path text,object_version text,byte_size bigint,content_type text)
language plpgsql security invoker set search_path='' as $$
begin
  return query select * from private.claim_education_scan_batch(_limit);
end;
$$;
create function public.complete_education_scan(_id uuid,_lease_token uuid,_verdict text,_sha256 text default null,
  _provider_key text default null,_provider_event_id text default null,_error_code text default null)
returns void language sql security invoker set search_path='' as $$
  select private.complete_education_scan(_id,_lease_token,_verdict,_sha256,_provider_key,_provider_event_id,_error_code);
$$;
-- This status contract preserves ordinary published-file authorization. It
-- reveals no file name/path, digest, scanner identity or recipient data.
create function private.education_file_status(_path text)
returns text language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from auth.users u where u.id=auth.uid())
    or public.is_suspended(auth.uid()) then raise exception using errcode='42501',message='File access unavailable'; end if;
  if not (public.can_author_education(auth.uid())
    or exists(select 1 from public.resources r where r.file_path=_path and r.status='published')
    or exists(select 1 from public.lesson_attachments a join public.lessons l on l.id=a.lesson_id
      join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id
      where a.file_path=_path and l.status='published' and c.status='published')) then
    raise exception using errcode='42501',message='File access unavailable'; end if;
  return coalesce((select s.state from private.education_file_scans s join storage.objects o on o.id=s.object_id
    where o.bucket_id='education' and o.name=_path),'unavailable');
end;
$$;
create function public.education_file_status(_path text)
returns text language sql security invoker set search_path='' as $$ select private.education_file_status(_path); $$;
revoke all on function private.quarantine_education_object(),
  private.claim_education_scan_batch(integer),public.claim_education_scan_batch(integer),
  private.complete_education_scan(uuid,uuid,text,text,text,text,text),public.complete_education_scan(uuid,uuid,text,text,text,text,text),
  private.education_file_status(text),public.education_file_status(text) from public,anon,authenticated;
grant execute on function private.claim_education_scan_batch(integer),public.claim_education_scan_batch(integer),
  private.complete_education_scan(uuid,uuid,text,text,text,text,text),public.complete_education_scan(uuid,uuid,text,text,text,text,text) to service_role;
grant execute on function private.education_file_status(text),public.education_file_status(text) to authenticated;
