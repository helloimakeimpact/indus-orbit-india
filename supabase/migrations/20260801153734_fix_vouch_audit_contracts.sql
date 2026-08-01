-- Make the two member-facing vouch mutations type-correct, caller-bound and
-- safe under concurrent use. Audit targets are UUID columns; the previous
-- definitions incorrectly cast those UUIDs to text.

-- This trigger validates a row-local transition and does not need definer
-- privileges. Running as invoker preserves the request JWT role set by
-- PostgREST (or narrowly by the trusted vouch RPCs) instead of switching to
-- the trigger owner's execution context.
create or replace function public.guard_profile_verification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  request_role text := pg_catalog.current_setting(
    'request.jwt.claim.role',
    true
  );
begin
  if request_role = 'service_role' then
    if new.is_verified = true
      and (old.is_verified = false or old.is_verified is null) then
      new.verified_at := coalesce(new.verified_at, pg_catalog.now());
    elsif new.is_verified = false and old.is_verified = true then
      new.verified_at := null;
      new.verified_by := null;
    end if;
    return new;
  end if;

  if public.has_role((select auth.uid()), 'admin'::public.app_role) then
    if new.is_verified = true
      and (old.is_verified = false or old.is_verified is null) then
      new.verified_at := pg_catalog.now();
      new.verified_by := (select auth.uid());
    elsif new.is_verified = false and old.is_verified = true then
      new.verified_at := null;
      new.verified_by := null;
    end if;
    return new;
  end if;

  if new.is_verified is distinct from old.is_verified
    or new.verified_at is distinct from old.verified_at
    or new.verified_by is distinct from old.verified_by then
    raise exception 'Only admins can change verification status';
  end if;

  return new;
end;
$function$;

revoke execute on function public.guard_profile_verification()
  from public, anon, authenticated;

create or replace function public.redeem_vouch_code(_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_user_id uuid := auth.uid();
  code_row public.vouch_codes%rowtype;
  profile_row public.profiles%rowtype;
  suspension_id uuid;
  original_request_role text;
begin
  if caller_user_id is null then
    raise exception 'Unauthorized';
  end if;

  _code := pg_catalog.upper(pg_catalog.btrim(_code));
  if pg_catalog.char_length(_code) < 6 then
    raise exception 'Invalid code.';
  end if;

  -- A code is a single-use capability. Lock its row before checking state so
  -- concurrent redeemers cannot both observe it as active.
  select code.*
  into code_row
  from public.vouch_codes as code
  where code.code = _code
  for update;

  if not found then
    raise exception 'Code not found.';
  end if;

  if code_row.status <> 'active' then
    raise exception 'Code is %.', code_row.status;
  end if;

  if code_row.expires_at < pg_catalog.now() then
    update public.vouch_codes as code
    set status = 'expired'
    where code.id = code_row.id;
    raise exception 'Code has expired.';
  end if;

  if code_row.issuer_id = caller_user_id then
    raise exception 'You cannot redeem your own code.';
  end if;

  select suspension.id
  into suspension_id
  from public.member_suspensions as suspension
  where suspension.user_id = caller_user_id
    and suspension.lifted_at is null
  limit 1;

  if suspension_id is not null then
    raise exception 'Your account is suspended.';
  end if;

  -- Serialise verification of this recipient as well as redemption of the
  -- code. A member may redeem a different code concurrently from another tab.
  select profile.*
  into profile_row
  from public.profiles as profile
  where profile.user_id = caller_user_id
  for update;

  if not found then
    raise exception 'Profile not found. Complete onboarding first.';
  end if;

  if not coalesce(profile_row.is_verified, false) then
    -- guard_profile_verification() deliberately accepts a trusted
    -- service-role claim. Elevate only for the protected write and restore the
    -- original request claim before any subsequent work.
    original_request_role := pg_catalog.current_setting(
      'request.jwt.claim.role',
      true
    );
    perform pg_catalog.set_config(
      'request.jwt.claim.role',
      'service_role',
      true
    );
    begin
      update public.profiles as profile
      set is_verified = true,
          verified_by = code_row.issuer_id,
          verified_at = pg_catalog.now()
      where profile.id = profile_row.id;
    exception
      when others then
        perform pg_catalog.set_config(
          'request.jwt.claim.role',
          coalesce(original_request_role, ''),
          true
        );
        raise;
    end;
    perform pg_catalog.set_config(
      'request.jwt.claim.role',
      coalesce(original_request_role, ''),
      true
    );
  end if;

  update public.vouch_codes as code
  set status = 'redeemed',
      redeemed_at = pg_catalog.now(),
      redeemer_id = caller_user_id
  where code.id = code_row.id;

  update public.vouch_events as event
  set recipient_id = caller_user_id
  where event.code_id = code_row.id;

  insert into public.audit_log (
    actor_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    caller_user_id,
    'vouch.code_redeemed',
    'vouch_code',
    code_row.id,
    pg_catalog.jsonb_build_object('issuer_id', code_row.issuer_id)
  );

  insert into public.notifications (user_id, type, message, link)
  values (
    code_row.issuer_id,
    'vouch_code_redeemed',
    'Someone successfully redeemed your vouch code.',
    '/app/vouch'
  );

  return pg_catalog.jsonb_build_object('ok', true);
end;
$function$;

revoke all on function public.redeem_vouch_code(text)
  from public, anon, authenticated;
grant execute on function public.redeem_vouch_code(text) to authenticated;

create or replace function public.vouch_directly(_recipient_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_user_id uuid := auth.uid();
  recipient_row public.profiles%rowtype;
  already_verified boolean;
  caller_is_admin boolean;
  caller_is_verified boolean;
  remaining_vouches integer;
  suspension_id uuid;
  original_request_role text;
begin
  if caller_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if _recipient_id = caller_user_id then
    raise exception 'You cannot vouch for yourself.';
  end if;

  -- The quota is issuer-scoped. Serialising a single issuer's direct vouches
  -- closes the check-then-insert race without blocking unrelated members.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'indus-orbit:vouch-issuer:' || caller_user_id::text,
      0
    )
  );

  select suspension.id
  into suspension_id
  from public.member_suspensions as suspension
  where suspension.user_id = caller_user_id
    and suspension.lifted_at is null
  limit 1;

  if suspension_id is not null then
    raise exception 'Your account is suspended.';
  end if;

  select public.has_role(caller_user_id, 'admin'::public.app_role)
  into caller_is_admin;

  if not caller_is_admin then
    select profile.is_verified
    into caller_is_verified
    from public.profiles as profile
    where profile.user_id = caller_user_id;

    if not coalesce(caller_is_verified, false) then
      raise exception 'Only verified members can vouch.';
    end if;

    select public.vouch_remaining(caller_user_id)
    into remaining_vouches;

    if remaining_vouches <= 0 then
      raise exception 'You have used your vouch budget for this period.';
    end if;
  end if;

  -- Lock the recipient profile so concurrent issuers observe a deterministic
  -- alreadyVerified value and verification transition.
  select profile.*
  into recipient_row
  from public.profiles as profile
  where profile.user_id = _recipient_id
  for update;

  if not found then
    raise exception 'Recipient not found.';
  end if;

  already_verified := coalesce(recipient_row.is_verified, false);

  if not already_verified then
    original_request_role := pg_catalog.current_setting(
      'request.jwt.claim.role',
      true
    );
    perform pg_catalog.set_config(
      'request.jwt.claim.role',
      'service_role',
      true
    );
    begin
      update public.profiles as profile
      set is_verified = true,
          verified_by = caller_user_id,
          verified_at = pg_catalog.now()
      where profile.id = recipient_row.id;
    exception
      when others then
        perform pg_catalog.set_config(
          'request.jwt.claim.role',
          coalesce(original_request_role, ''),
          true
        );
        raise;
    end;
    perform pg_catalog.set_config(
      'request.jwt.claim.role',
      coalesce(original_request_role, ''),
      true
    );
  end if;

  insert into public.vouch_events (issuer_id, recipient_id, channel)
  values (caller_user_id, _recipient_id, 'direct');

  insert into public.audit_log (actor_id, action, target_type, target_id)
  values (caller_user_id, 'vouch.direct', 'profile', _recipient_id);

  insert into public.notifications (user_id, type, message, link)
  values (
    _recipient_id,
    'vouch_direct',
    'You have been vouched for and verified!',
    '/app/profile'
  );

  return pg_catalog.jsonb_build_object(
    'ok',
    true,
    'alreadyVerified',
    already_verified
  );
end;
$function$;

revoke all on function public.vouch_directly(uuid)
  from public, anon, authenticated;
grant execute on function public.vouch_directly(uuid) to authenticated;
