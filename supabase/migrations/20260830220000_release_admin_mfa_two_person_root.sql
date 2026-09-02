-- Root authority changes require a recent AAL2 session and approval by a
-- different existing super-admin. Direct browser mutation remains revoked.

create table private.admin_root_change_requests (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('grant', 'revoke')),
  reason text not null check (char_length(btrim(reason)) between 16 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  decided_by uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  decision_reason text,
  constraint admin_root_change_decision_check check (
    (status = 'pending' and decided_by is null and decided_at is null and decision_reason is null)
    or (status <> 'pending' and decided_at is not null and decision_reason is not null)
  ),
  constraint admin_root_change_two_person_check check (decided_by is null or decided_by <> requested_by)
);

create unique index admin_root_change_target_pending_key
  on private.admin_root_change_requests (target_user_id)
  where status = 'pending';
create index admin_root_change_status_time_idx
  on private.admin_root_change_requests (status, requested_at desc);

alter table private.admin_root_change_requests enable row level security;
revoke all on private.admin_root_change_requests from public, anon, authenticated;
grant select, insert, update on private.admin_root_change_requests to service_role;

create or replace function private.require_recent_admin_aal2(_max_age_seconds integer default 600)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare issued_at bigint;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'AAL2 MFA verification is required' using errcode = '42501';
  end if;
  issued_at := nullif(auth.jwt() ->> 'iat', '')::bigint;
  if issued_at is null
    or extract(epoch from statement_timestamp())::bigint - issued_at > greatest(60, least(_max_age_seconds, 900)) then
    raise exception 'Recent MFA re-authentication is required' using errcode = '42501';
  end if;
end;
$function$;

create or replace function public.admin_request_root_change(
  _target_user_id uuid,
  _action text,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare caller_id uuid := auth.uid(); request_row private.admin_root_change_requests%rowtype;
begin
  perform private.require_recent_admin_aal2(600);
  if not private.is_platform_super_admin(caller_id) then
    raise exception 'Super-admin authority is required' using errcode = '42501';
  end if;
  if _target_user_id is null or _target_user_id = caller_id or _action not in ('grant', 'revoke')
    or char_length(btrim(coalesce(_reason, ''))) not between 16 and 1000
    or not exists (select 1 from auth.users where id = _target_user_id) then
    raise exception 'Root change request is invalid' using errcode = '22023';
  end if;
  if (_action = 'grant') = private.is_platform_super_admin(_target_user_id) then
    raise exception 'Target already has the requested root state' using errcode = '22023';
  end if;
  update private.admin_root_change_requests
  set status = 'expired', decided_at = now(), decision_reason = 'Request expired before decision'
  where target_user_id = _target_user_id and status = 'pending' and expires_at <= now();
  insert into private.admin_root_change_requests (target_user_id, action, reason, requested_by)
  values (_target_user_id, _action, btrim(_reason), caller_id)
  returning * into request_row;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, '*', 'team', 'root_change.requested', 'root_change', request_row.id,
    btrim(_reason), jsonb_build_object('action', _action)
  );
  return jsonb_build_object('id', request_row.id, 'status', request_row.status, 'expiresAt', request_row.expires_at);
end;
$function$;

create or replace function public.admin_list_root_change_requests(_status text default 'pending')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare caller_id uuid := auth.uid(); result jsonb;
begin
  if not private.is_platform_super_admin(caller_id) then
    raise exception 'Super-admin authority is required' using errcode = '42501';
  end if;
  if _status not in ('pending', 'approved', 'rejected', 'cancelled', 'expired') then
    raise exception 'Root change status is invalid' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', request.id,
    'targetUserId', request.target_user_id,
    'targetDisplayName', coalesce(profile.display_name, 'Member'),
    'action', request.action,
    'reason', request.reason,
    'status', request.status,
    'requestedByMe', request.requested_by = caller_id,
    'requestedAt', request.requested_at,
    'expiresAt', request.expires_at
  ) order by request.requested_at desc), '[]'::jsonb) into result
  from private.admin_root_change_requests as request
  left join public.profiles as profile on profile.user_id = request.target_user_id
  where request.status = _status;
  return result;
end;
$function$;

create or replace function public.admin_decide_root_change(
  _request_id uuid,
  _decision text,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare caller_id uuid := auth.uid(); request_row private.admin_root_change_requests%rowtype;
begin
  perform private.require_recent_admin_aal2(600);
  if not private.is_platform_super_admin(caller_id) then
    raise exception 'Super-admin authority is required' using errcode = '42501';
  end if;
  if _decision not in ('approve', 'reject') or char_length(btrim(coalesce(_reason, ''))) not between 16 and 1000 then
    raise exception 'Root change decision is invalid' using errcode = '22023';
  end if;
  select * into request_row from private.admin_root_change_requests where id = _request_id for update;
  if not found or request_row.status <> 'pending' or request_row.requested_by = caller_id
    or request_row.expires_at <= now() then
    raise exception 'A current request from another super-admin is required' using errcode = '42501';
  end if;
  if _decision = 'approve' then
    if request_row.action = 'grant' then
      insert into public.user_roles (user_id, role)
      values (request_row.target_user_id, 'admin') on conflict (user_id, role) do nothing;
    else
      if (select count(*) from public.user_roles where role::text = 'admin') <= 2 then
        raise exception 'At least two super-admins must remain' using errcode = '22023';
      end if;
      delete from public.user_roles where user_id = request_row.target_user_id and role::text = 'admin';
    end if;
  end if;
  update private.admin_root_change_requests
  set status = case when _decision = 'approve' then 'approved' else 'rejected' end,
      decided_by = caller_id, decided_at = now(), decision_reason = btrim(_reason)
  where id = _request_id;
  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id, '*', 'team', 'root_change.' || _decision, 'root_change', _request_id,
    btrim(_reason), jsonb_build_object('action', request_row.action)
  );
  return jsonb_build_object('id', _request_id, 'status', case when _decision = 'approve' then 'approved' else 'rejected' end);
end;
$function$;

revoke all on function private.require_recent_admin_aal2(integer) from public, anon, authenticated;
revoke all on function public.admin_request_root_change(uuid, text, text) from public, anon;
revoke all on function public.admin_list_root_change_requests(text) from public, anon;
revoke all on function public.admin_decide_root_change(uuid, text, text) from public, anon;
grant execute on function private.require_recent_admin_aal2(integer) to authenticated;
grant execute on function public.admin_request_root_change(uuid, text, text) to authenticated, service_role;
grant execute on function public.admin_list_root_change_requests(text) to authenticated, service_role;
grant execute on function public.admin_decide_root_change(uuid, text, text) to authenticated, service_role;

comment on table private.admin_root_change_requests is
  'Two-person root authority requests. Requester and approver must each use a recent AAL2 JWT; direct browser DML remains revoked.';
