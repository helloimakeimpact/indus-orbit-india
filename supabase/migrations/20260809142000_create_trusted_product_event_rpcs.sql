-- Replace browser-composed product notifications with database-trusted, caller-bound,
-- event-specific mutations. Every notification recipient, category, message
-- and link is now derived from trusted database state in the same transaction
-- as the product mutation that caused it.

alter table public.connection_requests
  add column if not exists client_request_id uuid;
alter table public.mentor_sessions
  add column if not exists client_request_id uuid;
alter table public.mission_updates
  add column if not exists client_request_id uuid;
alter table public.vouch_requests
  add column if not exists client_request_id uuid;

create unique index if not exists connection_requests_sender_client_request_key
  on public.connection_requests (sender_id, client_request_id)
  where client_request_id is not null;
create unique index if not exists mentor_sessions_booker_client_request_key
  on public.mentor_sessions (booker_id, client_request_id)
  where client_request_id is not null;
create unique index if not exists mission_updates_author_client_request_key
  on public.mission_updates (author_id, client_request_id)
  where client_request_id is not null;
create unique index if not exists vouch_requests_requester_client_request_key
  on public.vouch_requests (requester_id, client_request_id)
  where client_request_id is not null;

create table if not exists private.email_delivery_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  template_key text not null check (template_key in ('mentor_session_accepted')),
  template_data jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'delivered', 'dead')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  leased_at timestamptz,
  delivered_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_delivery_outbox_due_idx
  on private.email_delivery_outbox (next_attempt_at, created_at)
  where status in ('pending', 'processing');

alter table private.email_delivery_outbox enable row level security;
revoke all privileges on table private.email_delivery_outbox
  from public, anon, authenticated;
grant select, update on table private.email_delivery_outbox to service_role;

create or replace function public.create_my_connection_request(
  _recipient_id uuid,
  _reason text,
  _note text,
  _client_request_id uuid
)
returns public.connection_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _clean_note text := pg_catalog.btrim(_note);
  _existing public.connection_requests%rowtype;
  _created public.connection_requests%rowtype;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if _recipient_id is null or _client_request_id is null then
    raise exception using errcode = '22004', message = 'Recipient and client request ID are required';
  end if;
  if _recipient_id = _actor_id then
    raise exception using errcode = '22023', message = 'You cannot connect with yourself';
  end if;
  if _reason is null or _reason not in ('intro', 'advice', 'collab', 'capital', 'other') then
    raise exception using errcode = '22023', message = 'Choose a valid connection reason';
  end if;
  if _clean_note is null or pg_catalog.char_length(_clean_note) < 10
    or pg_catalog.char_length(_clean_note) > 280 then
    raise exception using errcode = '22023', message = 'Connection note must be 10 to 280 characters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('connection-request:' || _actor_id::text, 0)
  );

  select request.*
  into _existing
  from public.connection_requests as request
  where request.sender_id = _actor_id
    and request.client_request_id = _client_request_id;

  if found then
    if _existing.recipient_id <> _recipient_id
      or _existing.reason <> _reason
      or _existing.note <> _clean_note then
      raise exception using errcode = '22023',
        message = 'Client request ID was already used for another connection request';
    end if;
    return _existing;
  end if;

  if public.is_suspended(_actor_id) or public.is_suspended(_recipient_id) then
    raise exception using errcode = '42501', message = 'Connections are unavailable for this member';
  end if;
  if not exists (
    select 1 from public.profiles as profile where profile.user_id = _recipient_id
  ) then
    raise exception using errcode = 'P0002', message = 'Member not found';
  end if;

  if exists (
    select 1
    from public.connection_requests as request
    where request.sender_id = _actor_id
      and request.recipient_id = _recipient_id
  ) then
    raise exception using errcode = '23505', message = 'A connection request already exists for this member';
  end if;

  insert into public.connection_requests (
    sender_id, recipient_id, reason, note, client_request_id
  ) values (
    _actor_id, _recipient_id, _reason, _clean_note, _client_request_id
  ) returning * into _created;

  insert into public.notifications (user_id, type, message, link)
  values (
    _recipient_id,
    'connection_request',
    'You have a new connection request.',
    '/app/directory'
  );

  return _created;
end;
$$;

create or replace function public.respond_to_my_connection_request(
  _request_id uuid,
  _status text
)
returns public.connection_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _request public.connection_requests%rowtype;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if _status is null or _status not in ('accepted', 'declined', 'withdrawn') then
    raise exception using errcode = '22023', message = 'Choose a valid request response';
  end if;

  select request.*
  into _request
  from public.connection_requests as request
  where request.id = _request_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Connection request not found';
  end if;
  if _request.status <> 'pending' then
    if _request.status = _status
      and ((_status = 'withdrawn' and _request.sender_id = _actor_id)
        or (_status in ('accepted', 'declined') and _request.recipient_id = _actor_id)) then
      return _request;
    end if;
    raise exception using errcode = '22023', message = 'Connection request is already resolved';
  end if;

  if _status = 'withdrawn' and _request.sender_id <> _actor_id then
    raise exception using errcode = '42501', message = 'Only the sender can withdraw this request';
  end if;
  if _status in ('accepted', 'declined') and _request.recipient_id <> _actor_id then
    raise exception using errcode = '42501', message = 'Only the recipient can respond to this request';
  end if;

  update public.connection_requests as request
  set status = _status
  where request.id = _request.id
  returning * into _request;

  if _status = 'accepted' then
    insert into public.notifications (user_id, type, message, link)
    values (
      _request.sender_id,
      'connection_accepted',
      'Your connection request was accepted.',
      '/app/directory'
    );
  end if;

  return _request;
end;
$$;

create or replace function public.request_my_mentor_session(
  _expert_id uuid,
  _message text,
  _duration_mins integer,
  _client_request_id uuid
)
returns public.mentor_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _clean_message text := pg_catalog.btrim(_message);
  _existing public.mentor_sessions%rowtype;
  _created public.mentor_sessions%rowtype;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if _expert_id is null or _client_request_id is null then
    raise exception using errcode = '22004', message = 'Expert and client request ID are required';
  end if;
  if _expert_id = _actor_id then
    raise exception using errcode = '22023', message = 'You cannot book a session with yourself';
  end if;
  if _duration_mins not in (30, 60) then
    raise exception using errcode = '22023', message = 'Choose a 30 or 60 minute session';
  end if;
  if _clean_message is null or pg_catalog.char_length(_clean_message) < 20
    or pg_catalog.char_length(_clean_message) > 2000 then
    raise exception using errcode = '22023', message = 'Session context must be 20 to 2,000 characters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mentor-request:' || _actor_id::text, 0)
  );

  select session.*
  into _existing
  from public.mentor_sessions as session
  where session.booker_id = _actor_id
    and session.client_request_id = _client_request_id;

  if found then
    if _existing.expert_id <> _expert_id
      or _existing.message <> _clean_message
      or _existing.duration_mins <> _duration_mins then
      raise exception using errcode = '22023',
        message = 'Client request ID was already used for another mentorship request';
    end if;
    return _existing;
  end if;

  if public.is_suspended(_actor_id) or public.is_suspended(_expert_id) then
    raise exception using errcode = '42501', message = 'Mentorship is unavailable for this member';
  end if;
  if not exists (
    select 1 from public.profiles as profile where profile.user_id = _expert_id
  ) then
    raise exception using errcode = 'P0002', message = 'Expert not found';
  end if;
  if not exists (
    select 1
    from public.profiles as profile
    where profile.user_id = _actor_id
      and coalesce(profile.is_verified, false)
  ) then
    raise exception using errcode = '42501',
      message = 'Only verified members can book sessions. Please get verified first';
  end if;

  insert into public.mentor_sessions (
    expert_id, booker_id, message, duration_mins, client_request_id
  ) values (
    _expert_id, _actor_id, _clean_message, _duration_mins, _client_request_id
  ) returning * into _created;

  insert into public.notifications (user_id, type, message, link)
  values (
    _expert_id,
    'mentor_request',
    'You have a new mentorship session request.',
    '/app/mentor'
  );

  return _created;
end;
$$;

create or replace function public.transition_my_mentor_session(
  _session_id uuid,
  _status text,
  _meeting_url text default null,
  _scheduled_for timestamptz default null
)
returns public.mentor_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _session public.mentor_sessions%rowtype;
  _clean_meeting_url text := nullif(pg_catalog.btrim(_meeting_url), '');
  _notify_user_id uuid;
  _mentor_name text;
  _email_enabled boolean;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if _status is null or _status not in ('accepted', 'declined', 'completed', 'cancelled') then
    raise exception using errcode = '22023', message = 'Choose a valid session status';
  end if;
  if _clean_meeting_url is not null
    and _clean_meeting_url !~* '^https://[^[:space:]]+$' then
    raise exception using errcode = '22023', message = 'Meeting link must use HTTPS';
  end if;
  if _scheduled_for is not null
    and _scheduled_for < pg_catalog.statement_timestamp() - interval '5 minutes' then
    raise exception using errcode = '22023', message = 'Choose a future session time';
  end if;

  select session.*
  into _session
  from public.mentor_sessions as session
  where session.id = _session_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Session not found';
  end if;
  if _actor_id <> _session.expert_id and _actor_id <> _session.booker_id then
    raise exception using errcode = '42501', message = 'You are not a participant in this session';
  end if;

  if _session.status = _status then
    if _status <> 'accepted'
      or (coalesce(_session.meeting_url, '') = coalesce(_clean_meeting_url, _session.meeting_url, '')
        and coalesce(_session.scheduled_for, '-infinity'::timestamptz)
          = coalesce(_scheduled_for, _session.scheduled_for, '-infinity'::timestamptz)) then
      return _session;
    end if;
    raise exception using errcode = '22023', message = 'Session is already accepted with different details';
  end if;

  if _actor_id = _session.booker_id and _status <> 'cancelled' then
    raise exception using errcode = '42501', message = 'Only the expert can perform this action';
  end if;
  if _session.status = 'pending' and _status not in ('accepted', 'declined', 'cancelled') then
    raise exception using errcode = '22023', message = 'Pending sessions can only be accepted, declined or cancelled';
  end if;
  if _session.status = 'accepted' and _status not in ('completed', 'cancelled') then
    raise exception using errcode = '22023', message = 'Accepted sessions can only be completed or cancelled';
  end if;
  if _session.status not in ('pending', 'accepted') then
    raise exception using errcode = '22023', message = 'Session is already resolved';
  end if;
  if _status = 'accepted' and _actor_id <> _session.expert_id then
    raise exception using errcode = '42501', message = 'Only the expert can accept this session';
  end if;

  update public.mentor_sessions as session
  set status = _status,
      meeting_url = case when _status = 'accepted'
        then coalesce(_clean_meeting_url, session.meeting_url)
        else session.meeting_url end,
      scheduled_for = case when _status = 'accepted'
        then coalesce(_scheduled_for, session.scheduled_for)
        else session.scheduled_for end,
      updated_at = pg_catalog.statement_timestamp()
  where session.id = _session.id
  returning * into _session;

  _notify_user_id := case
    when _actor_id = _session.expert_id then _session.booker_id
    else _session.expert_id
  end;

  insert into public.notifications (user_id, type, message, link)
  values (
    _notify_user_id,
    'mentor_update',
    'Your mentorship session was marked as ' || _status || '.',
    '/app/mentor'
  );

  if _status = 'accepted' then
    select coalesce(nullif(pg_catalog.btrim(profile.display_name), ''), 'A mentor')
    into _mentor_name
    from public.profiles as profile
    where profile.user_id = _session.expert_id;

    select coalesce(
      (profile.notification_prefs -> 'mentorship' ->> 'email')::boolean,
      true
    )
    into _email_enabled
    from public.profiles as profile
    where profile.user_id = _session.booker_id;

    if coalesce(_email_enabled, true) then
      insert into private.email_delivery_outbox (
        event_key,
        recipient_user_id,
        template_key,
        template_data
      ) values (
        'mentor_session_accepted:' || _session.id::text,
        _session.booker_id,
        'mentor_session_accepted',
        pg_catalog.jsonb_build_object(
          'mentor_name', coalesce(_mentor_name, 'A mentor'),
          'scheduled_for', _session.scheduled_for,
          'meeting_url', _session.meeting_url
        )
      ) on conflict (event_key) do nothing;
    end if;
  end if;

  return _session;
end;
$$;

create or replace function public.post_my_mission_update(
  _mission_id uuid,
  _content text,
  _client_request_id uuid
)
returns public.mission_updates
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _clean_content text := pg_catalog.btrim(_content);
  _mission_title text;
  _existing public.mission_updates%rowtype;
  _created public.mission_updates%rowtype;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if _mission_id is null or _client_request_id is null then
    raise exception using errcode = '22004', message = 'Mission and client request ID are required';
  end if;
  if _clean_content is null or pg_catalog.char_length(_clean_content) = 0
    or pg_catalog.char_length(_clean_content) > 5000 then
    raise exception using errcode = '22023', message = 'Mission update must be 1 to 5,000 characters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mission-update:' || _actor_id::text, 0)
  );

  select update_row.*
  into _existing
  from public.mission_updates as update_row
  where update_row.author_id = _actor_id
    and update_row.client_request_id = _client_request_id;

  if found then
    if _existing.mission_id <> _mission_id or _existing.content <> _clean_content then
      raise exception using errcode = '22023',
        message = 'Client request ID was already used for another mission update';
    end if;
    return _existing;
  end if;

  select mission.title
  into _mission_title
  from public.missions as mission
  where mission.id = _mission_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Mission not found';
  end if;
  if public.is_suspended(_actor_id) then
    raise exception using errcode = '42501', message = 'Mission posting is unavailable for this member';
  end if;
  if not public.has_role(_actor_id, 'admin'::public.app_role)
    and not exists (
      select 1
      from public.mission_members as member
      where member.mission_id = _mission_id
        and member.user_id = _actor_id
    ) then
    raise exception using errcode = '42501', message = 'Join this mission before posting updates';
  end if;

  insert into public.mission_updates (
    mission_id, author_id, content, client_request_id
  ) values (
    _mission_id, _actor_id, _clean_content, _client_request_id
  ) returning * into _created;

  insert into public.notifications (user_id, type, message, link)
  select
    member.user_id,
    'mission_updates',
    'New update in mission: ' || _mission_title,
    '/app/missions/' || _mission_id::text
  from public.mission_members as member
  where member.mission_id = _mission_id
    and member.user_id <> _actor_id;

  return _created;
end;
$$;

create or replace function public.request_my_vouch(
  _message text,
  _target_verifier_id uuid,
  _client_request_id uuid
)
returns public.vouch_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _clean_message text := pg_catalog.btrim(_message);
  _existing public.vouch_requests%rowtype;
  _created public.vouch_requests%rowtype;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if _client_request_id is null then
    raise exception using errcode = '22004', message = 'Client request ID is required';
  end if;
  if _target_verifier_id = _actor_id then
    raise exception using errcode = '22023', message = 'You cannot request a vouch from yourself';
  end if;
  if _clean_message is null or pg_catalog.char_length(_clean_message) < 10
    or pg_catalog.char_length(_clean_message) > 1000 then
    raise exception using errcode = '22023', message = 'Vouch request must be 10 to 1,000 characters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('vouch-request:' || _actor_id::text, 0)
  );

  select request.*
  into _existing
  from public.vouch_requests as request
  where request.requester_id = _actor_id
    and request.client_request_id = _client_request_id;

  if found then
    if _existing.target_verifier_id is distinct from _target_verifier_id
      or _existing.message <> _clean_message then
      raise exception using errcode = '22023',
        message = 'Client request ID was already used for another vouch request';
    end if;
    return _existing;
  end if;

  if public.is_suspended(_actor_id)
    or (_target_verifier_id is not null and public.is_suspended(_target_verifier_id)) then
    raise exception using errcode = '42501', message = 'Vouching is unavailable for this member';
  end if;
  if _target_verifier_id is not null and not exists (
    select 1
    from public.profiles as profile
    where profile.user_id = _target_verifier_id
      and (
        coalesce(profile.is_verified, false)
        or public.has_role(_target_verifier_id, 'admin'::public.app_role)
      )
  ) then
    raise exception using errcode = '42501', message = 'Choose a verified member to request a vouch';
  end if;

  insert into public.vouch_requests (
    requester_id, target_verifier_id, message, client_request_id
  ) values (
    _actor_id, _target_verifier_id, _clean_message, _client_request_id
  ) returning * into _created;

  insert into public.audit_log (actor_id, action, target_type, target_id)
  values (_actor_id, 'vouch.request_created', 'vouch_request', _created.id);

  if _target_verifier_id is not null then
    insert into public.notifications (user_id, type, message, link)
    values (
      _target_verifier_id,
      'vouch_request',
      'A member has requested a vouch from you.',
      '/app/vouch'
    );
  end if;

  return _created;
end;
$$;

create or replace function public.approve_chapter_proposal(
  _proposal_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _proposal public.chapter_proposals%rowtype;
  _chapter_id uuid;
begin
  if _actor_id is null or not public.has_role(_actor_id, 'admin'::public.app_role) then
    raise exception using errcode = '42501', message = 'Only admins can approve proposals';
  end if;

  select proposal.*
  into _proposal
  from public.chapter_proposals as proposal
  where proposal.id = _proposal_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Chapter proposal not found';
  end if;
  if _proposal.status <> 'pending' then
    raise exception using errcode = '22023', message = 'Chapter proposal is already resolved';
  end if;
  if nullif(pg_catalog.btrim(_proposal.city), '') is null
    or nullif(pg_catalog.btrim(_proposal.country), '') is null then
    raise exception using errcode = '22023', message = 'Chapter proposals require a city and country';
  end if;

  insert into public.chapters (name, city, country, description)
  values (
    pg_catalog.btrim(_proposal.proposed_name),
    pg_catalog.btrim(_proposal.city),
    pg_catalog.btrim(_proposal.country),
    pg_catalog.left(pg_catalog.btrim(_proposal.rationale), 200)
  ) returning id into _chapter_id;

  insert into public.chapter_members (chapter_id, user_id, role)
  values (_chapter_id, _proposal.proposer_id, 'lead');

  update public.chapter_proposals as proposal
  set status = 'approved'
  where proposal.id = _proposal.id;

  insert into public.notifications (user_id, type, message, link)
  values (
    _proposal.proposer_id,
    'chapter_approved',
    'Your chapter proposal was approved. You are now the Lead.',
    '/app/chapters'
  );

  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    _actor_id,
    'chapter.proposal_approved',
    'chapter_proposal',
    _proposal.id,
    pg_catalog.jsonb_build_object('chapter_id', _chapter_id)
  );

  return _chapter_id;
end;
$$;

create or replace function public.reject_chapter_proposal(
  _proposal_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _proposal public.chapter_proposals%rowtype;
begin
  if _actor_id is null or not public.has_role(_actor_id, 'admin'::public.app_role) then
    raise exception using errcode = '42501', message = 'Only admins can reject proposals';
  end if;

  select proposal.*
  into _proposal
  from public.chapter_proposals as proposal
  where proposal.id = _proposal_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Chapter proposal not found';
  end if;
  if _proposal.status <> 'pending' then
    raise exception using errcode = '22023', message = 'Chapter proposal is already resolved';
  end if;

  update public.chapter_proposals as proposal
  set status = 'rejected'
  where proposal.id = _proposal.id;

  insert into public.notifications (user_id, type, message, link)
  values (
    _proposal.proposer_id,
    'chapter_rejected',
    'Your chapter proposal was not approved.',
    '/app/chapters'
  );

  insert into public.audit_log (actor_id, action, target_type, target_id)
  values (_actor_id, 'chapter.proposal_rejected', 'chapter_proposal', _proposal.id);
end;
$$;

create or replace function public.claim_email_delivery_batch(
  _limit integer default 10
)
returns table (
  id uuid,
  lease_token uuid,
  recipient_email text,
  template_key text,
  template_data jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;

  return query
  with due as (
    select outbox.id
    from private.email_delivery_outbox as outbox
    where (
      (outbox.status = 'pending' and outbox.next_attempt_at <= pg_catalog.statement_timestamp())
      or (outbox.status = 'processing'
        and outbox.leased_at < pg_catalog.statement_timestamp() - interval '10 minutes')
    )
      and outbox.attempt_count < 5
    order by outbox.next_attempt_at, outbox.created_at
    for update skip locked
    limit greatest(1, least(coalesce(_limit, 10), 50))
  ), claimed as (
    update private.email_delivery_outbox as outbox
    set status = 'processing',
        attempt_count = outbox.attempt_count + 1,
        lease_token = gen_random_uuid(),
        leased_at = pg_catalog.statement_timestamp(),
        updated_at = pg_catalog.statement_timestamp()
    from due
    where outbox.id = due.id
    returning outbox.*
  )
  select
    claimed.id,
    claimed.lease_token,
    user_row.email::text,
    claimed.template_key,
    claimed.template_data
  from claimed
  join auth.users as user_row on user_row.id = claimed.recipient_user_id
  where user_row.email is not null;
end;
$$;

create or replace function public.complete_email_delivery(
  _id uuid,
  _lease_token uuid,
  _succeeded boolean,
  _provider_message_id text default null,
  _error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _job private.email_delivery_outbox%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;

  select outbox.*
  into _job
  from private.email_delivery_outbox as outbox
  where outbox.id = _id
  for update;

  if not found or _job.status <> 'processing' or _job.lease_token is distinct from _lease_token then
    raise exception using errcode = '22023', message = 'Email delivery lease is invalid or expired';
  end if;

  if _succeeded then
    update private.email_delivery_outbox as outbox
    set status = 'delivered',
        delivered_at = pg_catalog.statement_timestamp(),
        provider_message_id = pg_catalog.left(_provider_message_id, 500),
        last_error = null,
        lease_token = null,
        leased_at = null,
        updated_at = pg_catalog.statement_timestamp()
    where outbox.id = _id;
  else
    update private.email_delivery_outbox as outbox
    set status = case when outbox.attempt_count >= 5 then 'dead' else 'pending' end,
        next_attempt_at = pg_catalog.statement_timestamp()
          + pg_catalog.make_interval(secs => least(3600, 30 * (2 ^ outbox.attempt_count))::integer),
        last_error = pg_catalog.left(coalesce(_error, 'Unknown delivery error'), 1000),
        lease_token = null,
        leased_at = null,
        updated_at = pg_catalog.statement_timestamp()
    where outbox.id = _id;
  end if;
end;
$$;

revoke all privileges on function public.create_my_connection_request(uuid, text, text, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.respond_to_my_connection_request(uuid, text)
  from public, anon, authenticated;
revoke all privileges on function public.request_my_mentor_session(uuid, text, integer, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.transition_my_mentor_session(uuid, text, text, timestamptz)
  from public, anon, authenticated;
revoke all privileges on function public.post_my_mission_update(uuid, text, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.request_my_vouch(text, uuid, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.approve_chapter_proposal(uuid)
  from public, anon, authenticated;
revoke all privileges on function public.reject_chapter_proposal(uuid)
  from public, anon, authenticated;
revoke all privileges on function public.claim_email_delivery_batch(integer)
  from public, anon, authenticated;
revoke all privileges on function public.complete_email_delivery(uuid, uuid, boolean, text, text)
  from public, anon, authenticated;

grant execute on function public.create_my_connection_request(uuid, text, text, uuid)
  to authenticated;
grant execute on function public.respond_to_my_connection_request(uuid, text)
  to authenticated;
grant execute on function public.request_my_mentor_session(uuid, text, integer, uuid)
  to authenticated;
grant execute on function public.transition_my_mentor_session(uuid, text, text, timestamptz)
  to authenticated;
grant execute on function public.post_my_mission_update(uuid, text, uuid)
  to authenticated;
grant execute on function public.request_my_vouch(text, uuid, uuid)
  to authenticated;
grant execute on function public.approve_chapter_proposal(uuid)
  to authenticated;
grant execute on function public.reject_chapter_proposal(uuid)
  to authenticated;
grant execute on function public.claim_email_delivery_batch(integer)
  to service_role;
grant execute on function public.complete_email_delivery(uuid, uuid, boolean, text, text)
  to service_role;

-- The browser retains RLS-scoped reads and narrowly-scoped writes such as
-- notification read markers and mission pinning. Product mutations that emit
-- cross-user events now go through the contracts above.
revoke insert, update on table public.connection_requests from authenticated;
revoke insert, update on table public.mentor_sessions from authenticated;
revoke insert on table public.mission_updates from authenticated;
revoke insert, update on table public.vouch_requests from authenticated;
revoke update on table public.chapter_proposals from authenticated;

grant select on table public.connection_requests to authenticated;
grant select on table public.mentor_sessions to authenticated;
grant select on table public.mission_updates to authenticated;
grant select on table public.vouch_requests to authenticated;
grant select on table public.chapter_proposals to authenticated;
grant update (is_pinned) on table public.mission_updates to authenticated;

revoke all privileges on function public.send_notification(uuid, text, text, text)
  from public, anon, authenticated;

comment on function public.send_notification(uuid, text, text, text) is
  'RETIRED compatibility function. Browser execution was removed after every product notification moved to caller-bound event RPCs.';
comment on table private.email_delivery_outbox is
  'Private fixed-template delivery queue. Browser clients cannot read or write jobs; only event RPCs enqueue and the service worker claims/completes them.';
