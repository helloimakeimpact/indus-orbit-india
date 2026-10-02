-- Vouch issuance and quiz grading belong to caller-bound transactions.
-- Preserve redemption of existing codes while retiring plaintext storage.
create extension if not exists pgcrypto with schema extensions;
alter table public.vouch_codes add column code_hash text;
update public.vouch_codes set code_hash = pg_catalog.encode(extensions.digest(pg_catalog.upper(pg_catalog.btrim(code)), 'sha256'), 'hex');
update public.vouch_codes set code = 'HASHED:' || id::text;
alter table public.vouch_codes alter column code_hash set not null;
create unique index vouch_codes_code_hash_key on public.vouch_codes(code_hash);
create or replace function public.hash_vouch_code_before_write()
returns trigger language plpgsql security invoker set search_path = '' as $function$
begin
  if new.code not like 'HASHED:%' then
    new.code_hash := pg_catalog.encode(extensions.digest(pg_catalog.upper(pg_catalog.btrim(new.code)), 'sha256'), 'hex');
    new.code := 'HASHED:' || new.id::text;
  end if;
  if new.code_hash is null or new.code_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'A vouch code hash is required';
  end if;
  return new;
end;
$function$;
revoke all on function public.hash_vouch_code_before_write() from public, anon, authenticated;
create trigger hash_vouch_code_before_write before insert or update of code on public.vouch_codes
for each row execute function public.hash_vouch_code_before_write();
drop policy if exists "Anyone can look up code by exact value" on public.vouch_codes;
revoke all on public.vouch_codes from public, anon, authenticated;
grant select (id, issuer_id, created_at, expires_at, redeemed_at, redeemer_id, status) on public.vouch_codes to authenticated;
revoke insert, update, delete on public.vouch_events from public, anon, authenticated;

create or replace function public.issue_my_vouch_code()
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  caller uuid := auth.uid();
  is_admin boolean;
  verified boolean;
  ttl integer;
  code_id uuid := extensions.gen_random_uuid();
  raw_code text;
  expires timestamptz;
begin
  if caller is null then raise exception 'Unauthorized'; end if;
  -- Match direct-vouch locking so two issuance paths share the same quota.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('indus-orbit:vouch-issuer:' || caller::text, 0));
  if public.is_suspended(caller) then raise exception 'Your account is suspended.'; end if;
  select p.is_verified into verified from public.profiles p where p.user_id = caller for update;
  if not found then raise exception 'Profile not found.'; end if;
  is_admin := public.has_role(caller, 'admin'::public.app_role);
  if not is_admin and not coalesce(verified, false) then raise exception 'Only verified members can vouch.'; end if;
  if not is_admin and public.vouch_remaining(caller) <= 0 then raise exception 'You have used your vouch budget for this period.'; end if;
  select code_ttl_days into ttl from public.vouch_settings where id = 'global';
  ttl := coalesce(ttl, 14);
  if ttl < 1 or ttl > 365 then raise exception 'Invalid vouch expiry policy'; end if;
  -- 80 cryptographically random bits; returned once and never persisted raw.
  raw_code := pg_catalog.upper(pg_catalog.encode(extensions.gen_random_bytes(10), 'hex'));
  expires := pg_catalog.now() + pg_catalog.make_interval(days => ttl);
  insert into public.vouch_codes (id, code, issuer_id, expires_at) values (code_id, raw_code, caller, expires);
  insert into public.vouch_events (issuer_id, channel, code_id) values (caller, 'code', code_id);
  insert into public.audit_log (actor_id, action, target_type, target_id)
    values (caller, 'vouch.code_issued', 'vouch_code', code_id);
  return pg_catalog.jsonb_build_object('id', code_id, 'code', raw_code, 'expiresAt', expires);
end;
$function$;
revoke all on function public.issue_my_vouch_code() from public, anon, authenticated;
grant execute on function public.issue_my_vouch_code() to authenticated;

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
  if pg_catalog.char_length(_code) < 6 or pg_catalog.char_length(_code) > 128 then
    raise exception 'Invalid code.';
  end if;

  -- A code is a single-use capability. Lock its row before checking state so
  -- concurrent redeemers cannot both observe it as active.
  select code.*
  into code_row
  from public.vouch_codes as code
  where code.code_hash = pg_catalog.encode(extensions.digest(_code, 'sha256'), 'hex')
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


-- A removed or inactive programme lead cannot retain education authorship.
create or replace function public.can_author_education(_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $function$
  select not public.is_suspended(_user_id) and (
    public.has_role(_user_id, 'admin'::public.app_role)
    or public.has_role(_user_id, 'editor'::public.app_role)
    or exists (select 1 from public.chapter_members cm join public.chapters c on c.id=cm.chapter_id
      where cm.user_id=_user_id and cm.role='lead' and cm.membership_state='active' and c.lifecycle_state='active')
  );
$function$;
revoke all on function public.can_author_education(uuid) from public, anon;
grant execute on function public.can_author_education(uuid) to authenticated, service_role;

-- Column grants enforce secrecy even when a caller bypasses the application.
revoke select on public.quiz_options from public, anon, authenticated;
grant select (id, question_id, label, sort_order) on public.quiz_options to authenticated;
revoke insert, update, delete on public.quiz_attempts from public, anon, authenticated;

create or replace function public.submit_my_education_quiz(_quiz_id uuid, _answers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  caller uuid := auth.uid();
  threshold integer;
  total integer;
  right_count integer;
  score_value integer;
  attempt_id uuid;
begin
  if caller is null then raise exception 'Unauthorized'; end if;
  if public.is_suspended(caller) then raise exception 'Your account is suspended.'; end if;
  if _answers is null or pg_catalog.jsonb_typeof(_answers) <> 'object' or pg_catalog.octet_length(_answers::text) > 65536 then
    raise exception 'Invalid quiz answers';
  end if;
  select q.passing_score into threshold from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where q.id = _quiz_id and l.status = 'published' and c.status = 'published'
    for share of q, l, c;
  if not found then raise exception 'Quiz is not available'; end if;
  select count(*)::integer into total from public.quiz_questions where quiz_id = _quiz_id;
  if total < 1 or total > 500 then raise exception 'Quiz question configuration is invalid'; end if;
  if exists (select 1 from public.quiz_questions q where q.quiz_id = _quiz_id
    and (select count(*) from public.quiz_options o where o.question_id = q.id and o.is_correct) <> 1) then
    raise exception 'Quiz answer configuration is invalid';
  end if;
  if exists (select 1 from pg_catalog.jsonb_each(_answers) a
    where pg_catalog.jsonb_typeof(a.value) <> 'string' or not exists (
      select 1 from public.quiz_questions q join public.quiz_options o on o.question_id = q.id
      where q.quiz_id = _quiz_id and q.id::text = a.key and o.id::text = a.value #>> '{}')) then
    raise exception 'Answers must belong to this quiz and question';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('indus-orbit:quiz-attempt:' || caller::text || ':' || _quiz_id::text, 0));
  if (select count(*) from public.quiz_attempts where user_id = caller and quiz_id = _quiz_id and created_at > pg_catalog.now() - interval '1 minute') >= 10 then
    raise exception 'Too many quiz attempts; try again later';
  end if;
  select count(*)::integer into right_count from public.quiz_questions q
    join public.quiz_options o on o.question_id = q.id
    where q.quiz_id = _quiz_id and o.is_correct and _answers ->> q.id::text = o.id::text;
  score_value := pg_catalog.round(right_count::numeric * 100 / total)::integer;
  insert into public.quiz_attempts (user_id, quiz_id, score, passed, answers)
    values (caller, _quiz_id, score_value, score_value >= threshold, _answers) returning id into attempt_id;
  return pg_catalog.jsonb_build_object('attemptId', attempt_id, 'score', score_value,
    'passed', score_value >= threshold, 'total', total, 'right', right_count);
end;
$function$;
revoke all on function public.submit_my_education_quiz(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.submit_my_education_quiz(uuid,jsonb) to authenticated;

create or replace function public.get_managed_education_quiz(_lesson_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  caller uuid := auth.uid();
  quiz_row public.quizzes%rowtype;
  question_rows jsonb;
begin
  if caller is null or public.is_suspended(caller) or not public.can_author_education(caller) then
    raise exception using errcode = '42501', message = 'Education author authority is required';
  end if;
  select * into quiz_row from public.quizzes where lesson_id = _lesson_id;
  if not found then return pg_catalog.jsonb_build_object('quiz', null, 'questions', '[]'::jsonb); end if;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(q) || pg_catalog.jsonb_build_object('options',
    (select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(o) order by o.sort_order,o.id), '[]'::jsonb)
      from public.quiz_options o where o.question_id=q.id)) order by q.sort_order,q.id), '[]'::jsonb)
    into question_rows from public.quiz_questions q where q.quiz_id = quiz_row.id;
  return pg_catalog.jsonb_build_object('quiz', pg_catalog.to_jsonb(quiz_row), 'questions', question_rows);
end;
$function$;
revoke all on function public.get_managed_education_quiz(uuid) from public, anon, authenticated;
grant execute on function public.get_managed_education_quiz(uuid) to authenticated;
