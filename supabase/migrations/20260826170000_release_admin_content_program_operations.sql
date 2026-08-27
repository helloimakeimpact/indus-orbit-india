-- Replace the separate admin app's remaining Content and Program transition
-- placeholders with capability-checked, reasoned and concurrency-safe commands.

create or replace function public.admin_content_queue(
  _content_type text default null,
  _status text default null,
  _limit integer default 100
)
returns table (
  content_type text,
  content_id uuid,
  title text,
  status text,
  owner_display_name text,
  summary text,
  created_at timestamptz,
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  bounded_limit integer := coalesce(_limit, 100);
begin
  if not private.has_admin_capability(caller_id, 'content.manage') then
    raise exception 'Content operations access required' using errcode = '42501';
  end if;
  if _content_type is not null
     and _content_type not in ('story', 'event', 'course', 'soda') then
    raise exception 'Content type is invalid' using errcode = '22023';
  end if;
  if _status is not null and (
    char_length(_status) < 3 or char_length(_status) > 32
    or _status !~ '^[a-z][a-z_]*$'
  ) then
    raise exception 'Content status filter is invalid' using errcode = '22023';
  end if;
  if bounded_limit < 1 or bounded_limit > 100 then
    raise exception 'Content queue limit must be between 1 and 100' using errcode = '22023';
  end if;

  return query
  select item.*
  from (
    select
      'story'::text as content_type,
      story.id as content_id,
      story.title,
      story.status,
      coalesce(profile.display_name, 'Member') as owner_display_name,
      pg_catalog.left(story.content, 240) as summary,
      story.created_at,
      story.published_at
    from public.stories as story
    left join public.profiles as profile on profile.user_id = story.author_id

    union all

    select
      'event'::text,
      event.id,
      event.title,
      event.status,
      coalesce(profile.display_name, 'Member'),
      pg_catalog.left(event.description, 240),
      event.created_at,
      null::timestamptz
    from public.events as event
    left join public.profiles as profile on profile.user_id = event.organizer_id

    union all

    select
      'course'::text,
      course.id,
      course.title,
      course.status,
      coalesce(profile.display_name, 'Administrator'),
      pg_catalog.left(coalesce(course.summary, ''), 240),
      course.created_at,
      course.published_at
    from public.courses as course
    left join public.profiles as profile on profile.user_id = course.created_by

    union all

    select
      'soda'::text,
      idea.id,
      idea.title,
      idea.status,
      coalesce(profile.display_name, 'Administrator'),
      pg_catalog.left(coalesce(idea.summary, ''), 240),
      idea.created_at,
      idea.published_at
    from public.soda_ideas as idea
    left join public.profiles as profile on profile.user_id = idea.created_by
  ) as item
  where (_content_type is null or item.content_type = _content_type)
    and (_status is null or item.status = _status)
  order by item.created_at desc, item.content_id desc
  limit bounded_limit;
end;
$function$;

create or replace function public.admin_transition_content(
  _content_type text,
  _content_id uuid,
  _target_status text,
  _expected_status text,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_reason text := pg_catalog.btrim(coalesce(_reason, ''));
  current_status text;
  published_value timestamptz;
begin
  if not private.has_admin_capability(caller_id, 'content.manage') then
    raise exception 'Content operations access required' using errcode = '42501';
  end if;
  if _content_type not in ('story', 'event', 'course', 'soda') then
    raise exception 'Content type is invalid' using errcode = '22023';
  end if;
  if char_length(normalized_reason) < 8 or char_length(normalized_reason) > 500 then
    raise exception 'Content decision reason must be between 8 and 500 characters' using errcode = '22023';
  end if;

  case _content_type
    when 'story' then
      select story.status, story.published_at
      into current_status, published_value
      from public.stories as story
      where story.id = _content_id
      for update;
    when 'event' then
      select event.status, null::timestamptz
      into current_status, published_value
      from public.events as event
      where event.id = _content_id
      for update;
    when 'course' then
      select course.status, course.published_at
      into current_status, published_value
      from public.courses as course
      where course.id = _content_id
      for update;
    when 'soda' then
      select idea.status, idea.published_at
      into current_status, published_value
      from public.soda_ideas as idea
      where idea.id = _content_id
      for update;
  end case;

  if current_status is null then
    raise exception 'Content record does not exist' using errcode = 'P0002';
  end if;
  if current_status <> _expected_status then
    raise exception 'Content state changed; refresh and try again' using errcode = '40001';
  end if;
  if not exists (
    select 1
    from (values
      ('story', 'pending', 'approved'),
      ('story', 'pending', 'declined'),
      ('story', 'approved', 'featured'),
      ('story', 'approved', 'declined'),
      ('story', 'featured', 'approved'),
      ('story', 'declined', 'pending'),
      ('event', 'pending', 'approved'),
      ('event', 'pending', 'declined'),
      ('event', 'approved', 'declined'),
      ('event', 'declined', 'pending'),
      ('course', 'draft', 'published'),
      ('course', 'published', 'archived'),
      ('course', 'archived', 'draft'),
      ('soda', 'draft', 'published'),
      ('soda', 'published', 'archived'),
      ('soda', 'archived', 'draft')
    ) as transition(content_type, from_status, to_status)
    where transition.content_type = _content_type
      and transition.from_status = current_status
      and transition.to_status = _target_status
  ) then
    raise exception 'Content status transition is not allowed' using errcode = '22023';
  end if;

  case _content_type
    when 'story' then
      update public.stories as story
      set status = _target_status,
          published_at = case
            when _target_status in ('approved', 'featured') then coalesce(story.published_at, statement_timestamp())
            when _target_status = 'pending' then null
            else story.published_at
          end
      where story.id = _content_id;
    when 'event' then
      update public.events as event
      set status = _target_status
      where event.id = _content_id;
    when 'course' then
      update public.courses as course
      set status = _target_status,
          published_at = case
            when _target_status = 'published' then coalesce(course.published_at, statement_timestamp())
            when _target_status = 'draft' then null
            else course.published_at
          end,
          updated_at = statement_timestamp()
      where course.id = _content_id;
    when 'soda' then
      update public.soda_ideas as idea
      set status = _target_status,
          published_at = case
            when _target_status = 'published' then coalesce(idea.published_at, statement_timestamp())
            when _target_status = 'draft' then null
            else idea.published_at
          end,
          updated_at = statement_timestamp()
      where idea.id = _content_id;
  end case;

  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id,
    'content.manage',
    'content',
    'content.transitioned',
    _content_type,
    _content_id,
    normalized_reason,
    pg_catalog.jsonb_build_object('fromStatus', current_status, 'toStatus', _target_status)
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'contentType', _content_type,
    'contentId', _content_id,
    'fromStatus', current_status,
    'status', _target_status
  );
end;
$function$;

create or replace function public.admin_program_queue(
  _program_type text default null,
  _lifecycle_state text default null,
  _limit integer default 100
)
returns table (
  program_type text,
  program_id uuid,
  title text,
  lifecycle_state text,
  state_version bigint,
  owner_display_name text,
  location_label text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  bounded_limit integer := coalesce(_limit, 100);
begin
  if not private.has_admin_capability(caller_id, 'programs.manage') then
    raise exception 'Programme operations access required' using errcode = '42501';
  end if;
  if _program_type is not null and _program_type not in ('chapter', 'mission') then
    raise exception 'Program type is invalid' using errcode = '22023';
  end if;
  if _lifecycle_state is not null and (
    char_length(_lifecycle_state) < 3 or char_length(_lifecycle_state) > 32
    or _lifecycle_state !~ '^[a-z][a-z_]*$'
  ) then
    raise exception 'Program lifecycle filter is invalid' using errcode = '22023';
  end if;
  if bounded_limit < 1 or bounded_limit > 100 then
    raise exception 'Program queue limit must be between 1 and 100' using errcode = '22023';
  end if;

  return query
  select item.*
  from (
    select
      'chapter'::text as program_type,
      chapter.id as program_id,
      chapter.name as title,
      chapter.lifecycle_state,
      chapter.state_version,
      coalesce(profile.display_name, 'Administrator') as owner_display_name,
      nullif(pg_catalog.concat_ws(', ', chapter.city, chapter.country), '') as location_label,
      chapter.created_at,
      chapter.updated_at
    from public.chapters as chapter
    left join public.profiles as profile on profile.user_id = chapter.created_by

    union all

    select
      'mission'::text,
      mission.id,
      mission.title,
      mission.lifecycle_state,
      mission.state_version,
      coalesce(profile.display_name, 'Member'),
      coalesce(mission.country_code, chapter.name),
      mission.created_at,
      mission.updated_at
    from public.missions as mission
    left join public.profiles as profile on profile.user_id = mission.created_by
    left join public.chapters as chapter on chapter.id = mission.chapter_id
  ) as item
  where (_program_type is null or item.program_type = _program_type)
    and (_lifecycle_state is null or item.lifecycle_state = _lifecycle_state)
  order by item.updated_at desc, item.program_id desc
  limit bounded_limit;
end;
$function$;

create or replace function public.admin_transition_program(
  _program_type text,
  _program_id uuid,
  _target_state text,
  _expected_version bigint,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_reason text := pg_catalog.btrim(coalesce(_reason, ''));
  chapter_row public.chapters%rowtype;
  mission_row public.missions%rowtype;
  previous_state text;
  next_version bigint;
begin
  if not private.has_admin_capability(caller_id, 'programs.manage') then
    raise exception 'Programme operations access required' using errcode = '42501';
  end if;
  if _program_type not in ('chapter', 'mission') then
    raise exception 'Program type is invalid' using errcode = '22023';
  end if;
  if _expected_version < 1 then
    raise exception 'Expected program version is invalid' using errcode = '22023';
  end if;
  if char_length(normalized_reason) < 8 or char_length(normalized_reason) > 500 then
    raise exception 'Program decision reason must be between 8 and 500 characters' using errcode = '22023';
  end if;

  if _program_type = 'chapter' then
    select chapter.lifecycle_state into previous_state
    from public.chapters as chapter
    where chapter.id = _program_id;
    if previous_state is null then
      raise exception 'Chapter does not exist' using errcode = 'P0002';
    end if;
    select * into chapter_row
    from public.transition_managed_chapter(
      _program_id, _target_state, _expected_version, normalized_reason
    );
    next_version := chapter_row.state_version;
  else
    select mission.lifecycle_state into previous_state
    from public.missions as mission
    where mission.id = _program_id;
    if previous_state is null then
      raise exception 'Mission does not exist' using errcode = 'P0002';
    end if;
    select * into mission_row
    from public.transition_my_mission(
      _program_id, _target_state, normalized_reason, _expected_version
    );
    next_version := mission_row.state_version;
  end if;

  insert into private.admin_operation_events (
    actor_user_id, capability, domain, action, target_type, target_id, reason, metadata
  ) values (
    caller_id,
    'programs.manage',
    'programs',
    'program.lifecycle_transitioned',
    _program_type,
    _program_id,
    normalized_reason,
    pg_catalog.jsonb_build_object(
      'fromState', previous_state,
      'toState', _target_state,
      'fromVersion', _expected_version,
      'toVersion', next_version
    )
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'programType', _program_type,
    'programId', _program_id,
    'fromState', previous_state,
    'lifecycleState', _target_state,
    'stateVersion', next_version
  );
end;
$function$;

revoke all on function public.admin_content_queue(text, text, integer)
  from public, anon;
revoke all on function public.admin_transition_content(text, uuid, text, text, text)
  from public, anon;
revoke all on function public.admin_program_queue(text, text, integer)
  from public, anon;
revoke all on function public.admin_transition_program(text, uuid, text, bigint, text)
  from public, anon;

grant execute on function public.admin_content_queue(text, text, integer)
  to authenticated, service_role;
grant execute on function public.admin_transition_content(text, uuid, text, text, text)
  to authenticated, service_role;
grant execute on function public.admin_program_queue(text, text, integer)
  to authenticated, service_role;
grant execute on function public.admin_transition_program(text, uuid, text, bigint, text)
  to authenticated, service_role;

comment on function public.admin_content_queue(text, text, integer) is
  'Privacy-minimised Content queue for scoped operators; full bodies are omitted.';
comment on function public.admin_transition_content(text, uuid, text, text, text) is
  'Capability-checked Content lifecycle command with expected-state concurrency and private audit evidence.';
comment on function public.admin_program_queue(text, text, integer) is
  'Privacy-minimised Chapter and Mission lifecycle queue for scoped programme operators.';
comment on function public.admin_transition_program(text, uuid, text, bigint, text) is
  'Capability-checked wrapper over canonical Chapter/Mission transitions with private admin audit evidence.';
