-- Chapter and Mission Space foundation.
--
-- Domain membership remains authoritative. Conversation membership is a
-- projection used for navigation and role presentation; every access helper
-- rechecks chapter_members or mission_members.

-- --------------------------------------------------------------------------
-- Existing Chapter and Mission lifecycle contracts
-- --------------------------------------------------------------------------

alter table public.chapters
  add column if not exists created_by uuid references public.profiles(user_id),
  add column if not exists client_request_id uuid,
  add column if not exists source_proposal_id uuid,
  add column if not exists lifecycle_state text not null default 'active',
  add column if not exists state_version bigint not null default 1,
  add column if not exists visibility text not null default 'discoverable',
  add column if not exists join_policy text not null default 'request',
  add column if not exists country_code text references public.geo_countries(country_code),
  add column if not exists region_id uuid references public.geo_regions(id),
  add column if not exists place_id uuid references public.geo_places(id),
  add column if not exists activated_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.chapters
set activated_at = coalesce(activated_at, created_at),
    updated_at = coalesce(updated_at, created_at)
where activated_at is null or updated_at is null;

alter table public.chapters
  drop constraint if exists chapters_lifecycle_state_check,
  add constraint chapters_lifecycle_state_check
    check (lifecycle_state in ('active', 'paused', 'archived')),
  drop constraint if exists chapters_state_version_check,
  add constraint chapters_state_version_check check (state_version > 0),
  drop constraint if exists chapters_visibility_check,
  add constraint chapters_visibility_check
    check (visibility in ('private', 'discoverable', 'public')),
  drop constraint if exists chapters_join_policy_check,
  add constraint chapters_join_policy_check
    check (join_policy in ('open', 'request', 'invite', 'closed'));

alter table public.chapter_proposals
  add column if not exists client_request_id uuid,
  add column if not exists state_version bigint not null default 1,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(user_id),
  add column if not exists decision_reason text,
  add column if not exists requested_information text,
  add column if not exists approved_chapter_id uuid,
  add column if not exists country_code text references public.geo_countries(country_code),
  add column if not exists region_id uuid references public.geo_regions(id),
  add column if not exists place_id uuid references public.geo_places(id),
  add column if not exists join_policy text not null default 'request',
  add column if not exists visibility text not null default 'discoverable',
  add column if not exists proposed_stewards jsonb not null default '[]'::jsonb;

update public.chapter_proposals
set submitted_at = coalesce(submitted_at, created_at),
    updated_at = coalesce(updated_at, created_at)
where status = 'pending';

alter table public.chapter_proposals
  drop constraint if exists chapter_proposals_status_check,
  add constraint chapter_proposals_status_check
    check (status in (
      'draft', 'submitted', 'pending', 'needs_information',
      'approved', 'rejected', 'withdrawn'
    )),
  drop constraint if exists chapter_proposals_state_version_check,
  add constraint chapter_proposals_state_version_check check (state_version > 0),
  drop constraint if exists chapter_proposals_join_policy_check,
  add constraint chapter_proposals_join_policy_check
    check (join_policy in ('open', 'request', 'invite', 'closed')),
  drop constraint if exists chapter_proposals_visibility_check,
  add constraint chapter_proposals_visibility_check
    check (visibility in ('private', 'discoverable', 'public'));

create unique index if not exists chapter_proposals_proposer_request_key
  on public.chapter_proposals (proposer_id, client_request_id)
  where client_request_id is not null;

alter table public.chapter_members
  add column if not exists membership_state text not null default 'active',
  add column if not exists state_version bigint not null default 1,
  add column if not exists client_request_id uuid,
  add column if not exists request_message text,
  add column if not exists invited_by uuid references public.profiles(user_id),
  add column if not exists requested_at timestamptz,
  add column if not exists decided_by uuid references public.profiles(user_id),
  add column if not exists decided_at timestamptz,
  add column if not exists left_at timestamptz,
  add column if not exists removal_reason text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.chapter_members
  drop constraint if exists chapter_members_role_check,
  add constraint chapter_members_role_check
    check (role in ('member', 'steward', 'lead')),
  drop constraint if exists chapter_members_membership_state_check,
  add constraint chapter_members_membership_state_check
    check (membership_state in ('invited', 'requested', 'active', 'suspended', 'left', 'removed')),
  drop constraint if exists chapter_members_state_version_check,
  add constraint chapter_members_state_version_check check (state_version > 0);

alter table public.missions
  add column if not exists lifecycle_state text,
  add column if not exists state_version bigint not null default 1,
  add column if not exists visibility text not null default 'discoverable',
  add column if not exists join_policy text not null default 'request',
  add column if not exists template_key text,
  add column if not exists template_version integer,
  add column if not exists client_request_id uuid,
  add column if not exists risk_classification text not null default 'standard',
  add column if not exists max_members integer,
  add column if not exists country_code text references public.geo_countries(country_code),
  add column if not exists region_id uuid references public.geo_regions(id),
  add column if not exists place_id uuid references public.geo_places(id),
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(user_id),
  add column if not exists decision_reason text,
  add column if not exists activated_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists archived_at timestamptz;

update public.missions
set lifecycle_state = case status
  when 'closed' then 'completed'
  else 'recruiting'
end,
activated_at = case when status = 'open' then coalesce(activated_at, created_at) else activated_at end
where lifecycle_state is null;

alter table public.missions alter column lifecycle_state set not null;
alter table public.missions alter column lifecycle_state set default 'draft';

alter table public.missions
  drop constraint if exists missions_status_check,
  add constraint missions_status_check
    check (status in ('open', 'closed', 'completed', 'archived')),
  drop constraint if exists missions_lifecycle_state_check,
  add constraint missions_lifecycle_state_check
    check (lifecycle_state in (
      'draft', 'submitted_for_review', 'needs_information', 'approved',
      'recruiting', 'active', 'paused', 'completed', 'archived',
      'cancelled', 'rejected', 'withdrawn'
    )),
  drop constraint if exists missions_state_version_check,
  add constraint missions_state_version_check check (state_version > 0),
  drop constraint if exists missions_visibility_check,
  add constraint missions_visibility_check
    check (visibility in ('private', 'members', 'discoverable', 'public')),
  drop constraint if exists missions_join_policy_check,
  add constraint missions_join_policy_check
    check (join_policy in ('open', 'request', 'invite', 'closed')),
  drop constraint if exists missions_risk_classification_check,
  add constraint missions_risk_classification_check
    check (risk_classification in ('standard', 'sensitive', 'sponsored', 'funded', 'global')),
  drop constraint if exists missions_max_members_check,
  add constraint missions_max_members_check check (max_members is null or max_members > 0);

create unique index if not exists missions_creator_request_key
  on public.missions (created_by, client_request_id)
  where client_request_id is not null;

alter table public.mission_members
  add column if not exists membership_state text not null default 'active',
  add column if not exists state_version bigint not null default 1,
  add column if not exists client_request_id uuid,
  add column if not exists invited_by uuid references public.profiles(user_id),
  add column if not exists requested_at timestamptz,
  add column if not exists decided_by uuid references public.profiles(user_id),
  add column if not exists decided_at timestamptz,
  add column if not exists left_at timestamptz,
  add column if not exists removal_reason text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.mission_members
  drop constraint if exists mission_members_role_check,
  add constraint mission_members_role_check
    check (role in ('member', 'contributor', 'founder', 'observer', 'coordinator', 'lead')),
  drop constraint if exists mission_members_membership_state_check,
  add constraint mission_members_membership_state_check
    check (membership_state in ('invited', 'requested', 'active', 'suspended', 'left', 'removed')),
  drop constraint if exists mission_members_state_version_check,
  add constraint mission_members_state_version_check check (state_version > 0);

alter table public.chapters
  drop constraint if exists chapters_source_proposal_id_fkey,
  add constraint chapters_source_proposal_id_fkey
    foreign key (source_proposal_id) references public.chapter_proposals(id) on delete set null;

alter table public.chapter_proposals
  drop constraint if exists chapter_proposals_approved_chapter_id_fkey,
  add constraint chapter_proposals_approved_chapter_id_fkey
    foreign key (approved_chapter_id) references public.chapters(id) on delete set null;

create index if not exists chapters_lifecycle_discovery_idx
  on public.chapters (lifecycle_state, visibility, created_at desc);
create unique index if not exists chapters_creator_request_key
  on public.chapters (created_by, client_request_id)
  where client_request_id is not null;
create index if not exists chapter_members_user_state_idx
  on public.chapter_members (user_id, membership_state, chapter_id);
create unique index if not exists chapter_members_user_request_key
  on public.chapter_members (user_id, client_request_id)
  where client_request_id is not null;
create index if not exists chapter_proposals_status_created_idx
  on public.chapter_proposals (status, created_at desc);
create index if not exists missions_lifecycle_discovery_idx
  on public.missions (lifecycle_state, visibility, created_at desc);
create index if not exists mission_members_user_state_idx
  on public.mission_members (user_id, membership_state, mission_id);
create unique index if not exists mission_members_user_request_key
  on public.mission_members (user_id, client_request_id)
  where client_request_id is not null;

-- --------------------------------------------------------------------------
-- Generic Space, Room and conversation schema
-- --------------------------------------------------------------------------

create table public.conversation_spaces (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('chapter', 'mission')),
  chapter_id uuid unique references public.chapters(id) on delete cascade,
  mission_id uuid unique references public.missions(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 160),
  description text not null default '',
  lifecycle_state text not null default 'active'
    check (lifecycle_state in ('active', 'paused', 'archived')),
  visibility text not null default 'members'
    check (visibility in ('private', 'members', 'discoverable', 'public')),
  join_policy text not null default 'request'
    check (join_policy in ('open', 'request', 'invite', 'closed')),
  blueprint_key text not null,
  blueprint_version integer not null default 1 check (blueprint_version > 0),
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint conversation_spaces_source_check check (
    (source_type = 'chapter' and chapter_id is not null and mission_id is null)
    or (source_type = 'mission' and mission_id is not null and chapter_id is null)
  )
);

create table public.conversation_space_roles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.conversation_spaces(id) on delete cascade,
  system_key text not null check (system_key ~ '^[a-z][a-z0-9_]{1,39}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  capabilities text[] not null default '{}',
  position integer not null default 0,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  unique (space_id, system_key),
  unique (space_id, id)
);

create table public.conversation_space_memberships (
  space_id uuid not null references public.conversation_spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  domain_role text not null,
  membership_state text not null
    check (membership_state in ('invited', 'requested', 'active', 'suspended', 'left', 'removed')),
  source_membership_version bigint not null default 1 check (source_membership_version > 0),
  joined_at timestamptz,
  left_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table public.conversation_space_role_members (
  space_id uuid not null,
  role_id uuid not null,
  user_id uuid not null,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(user_id),
  primary key (role_id, user_id),
  foreign key (space_id, role_id)
    references public.conversation_space_roles(space_id, id) on delete cascade,
  foreign key (space_id, user_id)
    references public.conversation_space_memberships(space_id, user_id) on delete cascade
);

create table public.conversation_context_groups (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.conversation_spaces(id) on delete cascade,
  system_key text not null check (system_key ~ '^[a-z][a-z0-9_]{1,39}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (space_id, system_key),
  unique (space_id, id)
);

create table public.conversation_rooms (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.conversation_spaces(id) on delete cascade,
  context_group_id uuid,
  system_key text not null check (system_key ~ '^[a-z][a-z0-9_]{1,49}$'),
  display_name text not null check (char_length(display_name) between 1 and 100),
  description text not null default '',
  room_type text not null
    check (room_type in ('announcement', 'conversation', 'board', 'event_index', 'evidence', 'help')),
  visibility text not null default 'members'
    check (visibility in ('members', 'role', 'private')),
  posting_policy text not null default 'members'
    check (posting_policy in ('read_only', 'owners', 'stewards', 'members')),
  position integer not null default 0,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (space_id, system_key),
  unique (space_id, id),
  foreign key (space_id, context_group_id)
    references public.conversation_context_groups(space_id, id) on delete restrict
);

create table public.conversation_room_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.conversation_rooms(id) on delete cascade,
  role_id uuid references public.conversation_space_roles(id) on delete cascade,
  user_id uuid references public.profiles(user_id) on delete cascade,
  capability text not null
    check (capability in ('room.view', 'message.create', 'thread.create', 'message.moderate', 'room.manage')),
  effect text not null check (effect in ('allow', 'deny')),
  created_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  constraint conversation_room_override_subject_check
    check ((role_id is not null)::integer + (user_id is not null)::integer = 1)
);

create table public.conversation_threads (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.conversation_rooms(id) on delete cascade,
  parent_message_id uuid,
  title text check (title is null or char_length(title) between 1 and 160),
  visibility text not null default 'room'
    check (visibility in ('room', 'private')),
  created_by uuid not null references public.profiles(user_id),
  client_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  locked_at timestamptz,
  unique (created_by, client_request_id)
);

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.conversation_rooms(id) on delete cascade,
  thread_id uuid references public.conversation_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(user_id) on delete restrict,
  message_type text not null default 'human'
    check (message_type in ('human', 'system', 'agent', 'artifact')),
  content text not null check (char_length(content) between 1 and 4000),
  reply_to_message_id uuid references public.conversation_messages(id) on delete set null,
  client_request_id uuid,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  unique (author_id, client_request_id)
);

alter table public.conversation_threads
  add constraint conversation_threads_parent_message_id_fkey
  foreign key (parent_message_id) references public.conversation_messages(id) on delete set null;

create table public.conversation_thread_members (
  thread_id uuid not null references public.conversation_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  added_by uuid references public.profiles(user_id),
  added_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (thread_id, user_id)
);

create table public.conversation_message_revisions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.conversation_messages(id) on delete cascade,
  previous_content text not null,
  revised_by uuid not null references public.profiles(user_id),
  revised_at timestamptz not null default now()
);

create table public.conversation_mentions (
  message_id uuid not null references public.conversation_messages(id) on delete cascade,
  mentioned_user_id uuid references public.profiles(user_id) on delete cascade,
  mentioned_role_id uuid references public.conversation_space_roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversation_mentions_subject_check
    check ((mentioned_user_id is not null)::integer + (mentioned_role_id is not null)::integer = 1),
  unique nulls not distinct (message_id, mentioned_user_id, mentioned_role_id)
);

create table public.conversation_reactions (
  message_id uuid not null references public.conversation_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  reaction_key text not null check (reaction_key in ('acknowledge', 'support', 'question', 'complete')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, reaction_key)
);

create table public.conversation_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.conversation_messages(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(user_id) on delete restrict,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  content_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 52428800),
  scan_status text not null default 'pending'
    check (scan_status in ('pending', 'clean', 'blocked', 'failed')),
  alt_text text,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table public.conversation_pins (
  room_id uuid not null references public.conversation_rooms(id) on delete cascade,
  message_id uuid not null references public.conversation_messages(id) on delete cascade,
  pinned_by uuid not null references public.profiles(user_id),
  pinned_at timestamptz not null default now(),
  primary key (room_id, message_id)
);

create table public.conversation_bookmarks (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  message_id uuid not null references public.conversation_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

create table public.conversation_read_states (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  room_id uuid not null references public.conversation_rooms(id) on delete cascade,
  last_read_message_id uuid references public.conversation_messages(id) on delete set null,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, room_id)
);

create table public.conversation_notification_preferences (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  space_id uuid not null references public.conversation_spaces(id) on delete cascade,
  room_id uuid references public.conversation_rooms(id) on delete cascade,
  preference text not null default 'default'
    check (preference in ('default', 'all', 'mentions', 'digest', 'mute')),
  quiet_hours jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, space_id, room_id)
);

create table public.conversation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(user_id),
  space_id uuid not null references public.conversation_spaces(id) on delete cascade,
  room_id uuid references public.conversation_rooms(id) on delete set null,
  message_id uuid references public.conversation_messages(id) on delete set null,
  category text not null
    check (category in ('harassment', 'spam', 'privacy', 'safety', 'misinformation', 'other')),
  description text not null check (char_length(description) between 10 and 2000),
  status text not null default 'open'
    check (status in ('open', 'triaged', 'resolved', 'dismissed', 'appealed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.conversation_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.conversation_reports(id) on delete set null,
  space_id uuid not null references public.conversation_spaces(id) on delete cascade,
  target_user_id uuid references public.profiles(user_id),
  action_type text not null
    check (action_type in ('warn', 'mute', 'timeout', 'remove', 'restore', 'content_restrict')),
  reason text not null,
  actor_id uuid not null references public.profiles(user_id),
  expires_at timestamptz,
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now()
);

create table private.conversation_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'delivered', 'failed', 'dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_messages'
  ) then
    alter publication supabase_realtime add table public.conversation_messages;
  end if;
end;
$$;

create index conversation_spaces_source_lifecycle_idx
  on public.conversation_spaces (source_type, lifecycle_state, updated_at desc);
create index conversation_space_members_user_state_idx
  on public.conversation_space_memberships (user_id, membership_state, space_id);
create index conversation_roles_space_position_idx
  on public.conversation_space_roles (space_id, position, id);
create index conversation_role_members_user_idx
  on public.conversation_space_role_members (user_id, space_id);
create index conversation_groups_space_position_idx
  on public.conversation_context_groups (space_id, position, id);
create index conversation_rooms_space_position_idx
  on public.conversation_rooms (space_id, archived_at, position, id);
create index conversation_room_overrides_room_idx
  on public.conversation_room_permission_overrides (room_id, capability, effect);
create index conversation_threads_room_updated_idx
  on public.conversation_threads (room_id, archived_at, updated_at desc, id);
create index conversation_messages_room_cursor_idx
  on public.conversation_messages (room_id, created_at desc, id desc)
  where deleted_at is null;
create index conversation_messages_thread_cursor_idx
  on public.conversation_messages (thread_id, created_at desc, id desc)
  where thread_id is not null and deleted_at is null;
create index conversation_mentions_user_created_idx
  on public.conversation_mentions (mentioned_user_id, created_at desc)
  where mentioned_user_id is not null;
create index conversation_attachments_message_idx
  on public.conversation_attachments (message_id, created_at);
create index conversation_reports_status_created_idx
  on public.conversation_reports (status, created_at);
create index conversation_moderation_space_created_idx
  on private.conversation_moderation_actions (space_id, created_at desc);
create index conversation_outbox_due_idx
  on private.conversation_outbox (next_attempt_at, created_at)
  where status in ('pending', 'failed');

-- Every new foreign-key lookup/cascade path has a covering index. Composite
-- primary/unique indexes already cover their matching leftmost FK columns.
create index chapters_created_by_idx on public.chapters (created_by)
  where created_by is not null;
create index chapters_source_proposal_idx on public.chapters (source_proposal_id)
  where source_proposal_id is not null;
create index chapters_country_code_idx on public.chapters (country_code)
  where country_code is not null;
create index chapters_region_id_idx on public.chapters (region_id)
  where region_id is not null;
create index chapters_place_id_idx on public.chapters (place_id)
  where place_id is not null;
create index chapter_proposals_reviewed_by_idx on public.chapter_proposals (reviewed_by)
  where reviewed_by is not null;
create index chapter_proposals_proposer_idx on public.chapter_proposals (proposer_id);
create index chapter_proposals_approved_chapter_idx on public.chapter_proposals (approved_chapter_id)
  where approved_chapter_id is not null;
create index chapter_proposals_country_code_idx on public.chapter_proposals (country_code)
  where country_code is not null;
create index chapter_proposals_region_id_idx on public.chapter_proposals (region_id)
  where region_id is not null;
create index chapter_proposals_place_id_idx on public.chapter_proposals (place_id)
  where place_id is not null;
create index chapter_members_invited_by_idx on public.chapter_members (invited_by)
  where invited_by is not null;
create index chapter_members_decided_by_idx on public.chapter_members (decided_by)
  where decided_by is not null;
create index missions_reviewed_by_idx on public.missions (reviewed_by)
  where reviewed_by is not null;
create index missions_created_by_idx on public.missions (created_by);
create index missions_chapter_id_idx on public.missions (chapter_id)
  where chapter_id is not null;
create index missions_country_code_idx on public.missions (country_code)
  where country_code is not null;
create index missions_region_id_idx on public.missions (region_id)
  where region_id is not null;
create index missions_place_id_idx on public.missions (place_id)
  where place_id is not null;
create index mission_members_invited_by_idx on public.mission_members (invited_by)
  where invited_by is not null;
create index mission_members_decided_by_idx on public.mission_members (decided_by)
  where decided_by is not null;
create index conversation_spaces_created_by_idx on public.conversation_spaces (created_by)
  where created_by is not null;
create index conversation_role_members_space_user_idx
  on public.conversation_space_role_members (space_id, user_id);
create index conversation_role_members_space_role_idx
  on public.conversation_space_role_members (space_id, role_id);
create index conversation_role_members_assigned_by_idx
  on public.conversation_space_role_members (assigned_by)
  where assigned_by is not null;
create index conversation_rooms_space_group_idx
  on public.conversation_rooms (space_id, context_group_id)
  where context_group_id is not null;
create index conversation_rooms_created_by_idx on public.conversation_rooms (created_by)
  where created_by is not null;
create index conversation_room_overrides_role_idx
  on public.conversation_room_permission_overrides (role_id)
  where role_id is not null;
create index conversation_room_overrides_user_idx
  on public.conversation_room_permission_overrides (user_id)
  where user_id is not null;
create index conversation_room_overrides_created_by_idx
  on public.conversation_room_permission_overrides (created_by);
create index conversation_threads_parent_message_idx
  on public.conversation_threads (parent_message_id)
  where parent_message_id is not null;
create index conversation_thread_members_user_idx
  on public.conversation_thread_members (user_id, thread_id);
create index conversation_thread_members_added_by_idx
  on public.conversation_thread_members (added_by)
  where added_by is not null;
create index conversation_messages_reply_to_idx
  on public.conversation_messages (reply_to_message_id)
  where reply_to_message_id is not null;
create index conversation_message_revisions_message_idx
  on public.conversation_message_revisions (message_id, revised_at);
create index conversation_message_revisions_revised_by_idx
  on public.conversation_message_revisions (revised_by);
create index conversation_mentions_role_idx on public.conversation_mentions (mentioned_role_id)
  where mentioned_role_id is not null;
create index conversation_reactions_user_idx on public.conversation_reactions (user_id, created_at desc);
create index conversation_attachments_uploaded_by_idx
  on public.conversation_attachments (uploaded_by, created_at desc);
create index conversation_pins_message_idx on public.conversation_pins (message_id);
create index conversation_pins_pinned_by_idx on public.conversation_pins (pinned_by, pinned_at desc);
create index conversation_bookmarks_message_idx on public.conversation_bookmarks (message_id);
create index conversation_read_states_room_idx on public.conversation_read_states (room_id, user_id);
create index conversation_read_states_message_idx
  on public.conversation_read_states (last_read_message_id)
  where last_read_message_id is not null;
create index conversation_preferences_space_idx
  on public.conversation_notification_preferences (space_id, user_id);
create index conversation_preferences_room_idx
  on public.conversation_notification_preferences (room_id, user_id)
  where room_id is not null;
create index conversation_reports_reporter_idx
  on public.conversation_reports (reporter_id, created_at desc);
create index conversation_reports_space_idx
  on public.conversation_reports (space_id, created_at desc);
create index conversation_reports_room_idx
  on public.conversation_reports (room_id)
  where room_id is not null;
create index conversation_reports_message_idx
  on public.conversation_reports (message_id)
  where message_id is not null;
create index conversation_moderation_report_idx
  on private.conversation_moderation_actions (report_id)
  where report_id is not null;
create index conversation_moderation_target_idx
  on private.conversation_moderation_actions (target_user_id, created_at desc)
  where target_user_id is not null;
create index conversation_moderation_actor_idx
  on private.conversation_moderation_actions (actor_id, created_at desc);
create index conversation_moderation_reversed_by_idx
  on private.conversation_moderation_actions (reversed_by)
  where reversed_by is not null;

alter table public.conversation_spaces enable row level security;
alter table public.conversation_space_roles enable row level security;
alter table public.conversation_space_memberships enable row level security;
alter table public.conversation_space_role_members enable row level security;
alter table public.conversation_context_groups enable row level security;
alter table public.conversation_rooms enable row level security;
alter table public.conversation_room_permission_overrides enable row level security;
alter table public.conversation_threads enable row level security;
alter table public.conversation_thread_members enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.conversation_message_revisions enable row level security;
alter table public.conversation_mentions enable row level security;
alter table public.conversation_reactions enable row level security;
alter table public.conversation_attachments enable row level security;
alter table public.conversation_pins enable row level security;
alter table public.conversation_bookmarks enable row level security;
alter table public.conversation_read_states enable row level security;
alter table public.conversation_notification_preferences enable row level security;
alter table public.conversation_reports enable row level security;
alter table private.conversation_moderation_actions enable row level security;
alter table private.conversation_outbox enable row level security;

-- --------------------------------------------------------------------------
-- Access evaluation and deterministic Space bootstrap
-- --------------------------------------------------------------------------

create or replace function private.can_access_conversation_space(_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.conversation_spaces as space
    where space.id = _space_id
      and space.lifecycle_state <> 'archived'
      and (
        (
          space.source_type = 'chapter'
          and exists (
            select 1
            from public.chapter_members as member
            where member.chapter_id = space.chapter_id
              and member.user_id = auth.uid()
              and member.membership_state = 'active'
          )
        )
        or (
          space.source_type = 'mission'
          and exists (
            select 1
            from public.mission_members as member
            where member.mission_id = space.mission_id
              and member.user_id = auth.uid()
              and member.membership_state = 'active'
          )
        )
      )
  );
$$;

create or replace function private.can_manage_conversation_space(_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.conversation_spaces as space
    where space.id = _space_id
      and (
        (
          space.source_type = 'chapter'
          and exists (
            select 1
            from public.chapter_members as member
            where member.chapter_id = space.chapter_id
              and member.user_id = auth.uid()
              and member.membership_state = 'active'
              and member.role in ('lead', 'steward')
          )
        )
        or (
          space.source_type = 'mission'
          and exists (
            select 1
            from public.mission_members as member
            where member.mission_id = space.mission_id
              and member.user_id = auth.uid()
              and member.membership_state = 'active'
              and member.role in ('lead', 'coordinator')
          )
        )
      )
  );
$$;

create or replace function private.can_access_conversation_room(_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_rooms as room
    where room.id = _room_id
      and room.archived_at is null
      and private.can_access_conversation_space(room.space_id)
      and not exists (
        select 1
        from public.conversation_room_permission_overrides as override_row
        left join public.conversation_space_role_members as role_member
          on role_member.role_id = override_row.role_id
          and role_member.user_id = auth.uid()
        where override_row.room_id = room.id
          and override_row.capability = 'room.view'
          and override_row.effect = 'deny'
          and (
            override_row.user_id = auth.uid()
            or role_member.user_id is not null
          )
      )
      and (
        room.visibility = 'members'
        or exists (
          select 1
          from public.conversation_room_permission_overrides as override_row
          left join public.conversation_space_role_members as role_member
            on role_member.role_id = override_row.role_id
            and role_member.user_id = auth.uid()
          where override_row.room_id = room.id
            and override_row.capability = 'room.view'
            and override_row.effect = 'allow'
            and (
              override_row.user_id = auth.uid()
              or role_member.user_id is not null
            )
        )
      )
  );
$$;

create or replace function private.can_access_conversation_thread(_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_threads as thread
    where thread.id = _thread_id
      and private.can_access_conversation_room(thread.room_id)
      and (
        thread.visibility = 'room'
        or thread.created_by = auth.uid()
        or exists (
          select 1
          from public.conversation_thread_members as member
          where member.thread_id = thread.id
            and member.user_id = auth.uid()
            and member.left_at is null
        )
      )
  );
$$;

create or replace function private.can_post_conversation_room(_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_rooms as room
    where room.id = _room_id
      and private.can_access_conversation_room(room.id)
      and not exists (
        select 1
        from public.conversation_room_permission_overrides as override_row
        left join public.conversation_space_role_members as role_member
          on role_member.role_id = override_row.role_id
          and role_member.user_id = auth.uid()
        where override_row.room_id = room.id
          and override_row.capability = 'message.create'
          and override_row.effect = 'deny'
          and (
            override_row.user_id = auth.uid()
            or role_member.user_id is not null
          )
      )
      and (
        room.posting_policy = 'members'
        or (
          room.posting_policy in ('owners', 'stewards')
          and private.can_manage_conversation_space(room.space_id)
        )
        or exists (
          select 1
          from public.conversation_room_permission_overrides as override_row
          left join public.conversation_space_role_members as role_member
            on role_member.role_id = override_row.role_id
            and role_member.user_id = auth.uid()
          where override_row.room_id = room.id
            and override_row.capability = 'message.create'
            and override_row.effect = 'allow'
            and (
              override_row.user_id = auth.uid()
              or role_member.user_id is not null
            )
        )
      )
  );
$$;

create or replace function private.sync_conversation_space_member(
  _space_id uuid,
  _user_id uuid,
  _domain_role text,
  _membership_state text,
  _source_version bigint,
  _joined_at timestamptz,
  _left_at timestamptz,
  _assigned_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _source_type text;
  _role_key text;
begin
  select source_type into _source_type
  from public.conversation_spaces
  where id = _space_id;

  if not found then
    return;
  end if;

  insert into public.conversation_space_memberships (
    space_id,
    user_id,
    domain_role,
    membership_state,
    source_membership_version,
    joined_at,
    left_at,
    synced_at
  ) values (
    _space_id,
    _user_id,
    _domain_role,
    _membership_state,
    greatest(coalesce(_source_version, 1), 1),
    _joined_at,
    _left_at,
    now()
  )
  on conflict (space_id, user_id) do update
  set domain_role = excluded.domain_role,
      membership_state = excluded.membership_state,
      source_membership_version = excluded.source_membership_version,
      joined_at = excluded.joined_at,
      left_at = excluded.left_at,
      synced_at = now();

  delete from public.conversation_space_role_members
  where space_id = _space_id and user_id = _user_id;

  if _membership_state <> 'active' then
    return;
  end if;

  _role_key := case
    when _source_type = 'chapter' and _domain_role in ('lead', 'steward', 'member') then _domain_role
    when _source_type = 'mission' and _domain_role in ('lead', 'coordinator', 'observer') then _domain_role
    when _source_type = 'mission' then 'member'
    else 'member'
  end;

  insert into public.conversation_space_role_members (
    space_id,
    role_id,
    user_id,
    assigned_by
  )
  select _space_id, role_row.id, _user_id, _assigned_by
  from public.conversation_space_roles as role_row
  where role_row.space_id = _space_id
    and role_row.system_key = _role_key
  on conflict (role_id, user_id) do update
  set assigned_at = now(), assigned_by = excluded.assigned_by;
end;
$$;

create or replace function private.bootstrap_conversation_space(
  _source_type text,
  _source_id uuid,
  _actor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  _space_id uuid;
  _display_name text;
  _description text;
  _lifecycle_state text;
  _space_lifecycle text;
  _visibility text;
  _join_policy text;
  _created_by uuid;
begin
  if _source_type = 'chapter' then
    select
      chapter.name,
      chapter.description,
      chapter.lifecycle_state,
      chapter.visibility,
      chapter.join_policy,
      coalesce(chapter.created_by, _actor_id)
    into
      _display_name,
      _description,
      _lifecycle_state,
      _visibility,
      _join_policy,
      _created_by
    from public.chapters as chapter
    where chapter.id = _source_id;
  elsif _source_type = 'mission' then
    select
      mission.title,
      mission.description,
      mission.lifecycle_state,
      mission.visibility,
      mission.join_policy,
      mission.created_by
    into
      _display_name,
      _description,
      _lifecycle_state,
      _visibility,
      _join_policy,
      _created_by
    from public.missions as mission
    where mission.id = _source_id;
  else
    raise exception using errcode = '22023', message = 'Unsupported Space source type';
  end if;

  if not found then
    raise exception using errcode = 'P0002', message = 'Space source not found';
  end if;

  _space_lifecycle := case
    when _lifecycle_state = 'archived' then 'archived'
    when _lifecycle_state = 'paused' then 'paused'
    else 'active'
  end;

  if _source_type = 'chapter' then
    insert into public.conversation_spaces (
      source_type,
      chapter_id,
      display_name,
      description,
      lifecycle_state,
      visibility,
      join_policy,
      blueprint_key,
      blueprint_version,
      created_by
    ) values (
      'chapter',
      _source_id,
      _display_name,
      coalesce(_description, ''),
      _space_lifecycle,
      case when _visibility = 'private' then 'private' else _visibility end,
      _join_policy,
      'chapter_default',
      1,
      _created_by
    )
    on conflict (chapter_id) do update
    set display_name = excluded.display_name,
        description = excluded.description,
        lifecycle_state = excluded.lifecycle_state,
        visibility = excluded.visibility,
        join_policy = excluded.join_policy,
        updated_at = now()
    returning id into _space_id;

    insert into public.conversation_space_roles (
      space_id, system_key, display_name, capabilities, position
    ) values
      (_space_id, 'lead', 'Lead', array['space.manage','room.manage','membership.manage','message.create','message.moderate'], 10),
      (_space_id, 'steward', 'Steward', array['room.manage','membership.manage','message.create','message.moderate'], 20),
      (_space_id, 'member', 'Member', array['message.create','thread.create'], 30)
    on conflict (space_id, system_key) do update
    set display_name = excluded.display_name,
        capabilities = excluded.capabilities,
        position = excluded.position;

    insert into public.conversation_context_groups (space_id, system_key, display_name, position)
    values
      (_space_id, 'start_here', 'Start here', 10),
      (_space_id, 'community', 'Community', 20),
      (_space_id, 'activity', 'Activity', 30),
      (_space_id, 'evidence', 'Evidence', 40),
      (_space_id, 'support', 'Support', 50)
    on conflict (space_id, system_key) do update
    set display_name = excluded.display_name, position = excluded.position;

    insert into public.conversation_rooms (
      space_id, context_group_id, system_key, display_name, description,
      room_type, posting_policy, position, created_by
    )
    select _space_id, group_row.id, room_spec.system_key, room_spec.display_name,
      room_spec.description, room_spec.room_type, room_spec.posting_policy,
      room_spec.position, _created_by
    from (values
      ('start_here', 'welcome_rules', 'Welcome and rules', 'Purpose, participation rules and essential notices.', 'announcement', 'stewards', 10),
      ('start_here', 'introductions', 'Introductions', 'A calm place for members to introduce themselves.', 'conversation', 'members', 20),
      ('community', 'town_square', 'Town square', 'Shared Chapter conversation.', 'conversation', 'members', 30),
      ('community', 'opportunities', 'Opportunities', 'Structured opportunities and offers.', 'board', 'members', 40),
      ('activity', 'events', 'Events', 'Events linked to the Chapter.', 'event_index', 'stewards', 50),
      ('evidence', 'stories_evidence', 'Stories and evidence', 'Approved stories, outcomes and evidence.', 'evidence', 'members', 60),
      ('support', 'ask_steward', 'Ask a steward', 'Support and escalation to Chapter stewards.', 'help', 'members', 70)
    ) as room_spec(group_key, system_key, display_name, description, room_type, posting_policy, position)
    join public.conversation_context_groups as group_row
      on group_row.space_id = _space_id and group_row.system_key = room_spec.group_key
    on conflict (space_id, system_key) do update
    set context_group_id = excluded.context_group_id,
        display_name = excluded.display_name,
        description = excluded.description,
        room_type = excluded.room_type,
        posting_policy = excluded.posting_policy,
        position = excluded.position,
        updated_at = now();

    insert into public.conversation_space_memberships (
      space_id, user_id, domain_role, membership_state,
      source_membership_version, joined_at, left_at
    )
    select
      _space_id,
      member.user_id,
      member.role,
      member.membership_state,
      member.state_version,
      member.created_at,
      member.left_at
    from public.chapter_members as member
    where member.chapter_id = _source_id
    on conflict (space_id, user_id) do update
    set domain_role = excluded.domain_role,
        membership_state = excluded.membership_state,
        source_membership_version = excluded.source_membership_version,
        joined_at = excluded.joined_at,
        left_at = excluded.left_at,
        synced_at = now();
  else
    insert into public.conversation_spaces (
      source_type,
      mission_id,
      display_name,
      description,
      lifecycle_state,
      visibility,
      join_policy,
      blueprint_key,
      blueprint_version,
      created_by
    ) values (
      'mission',
      _source_id,
      _display_name,
      coalesce(_description, ''),
      _space_lifecycle,
      _visibility,
      _join_policy,
      'mission_default',
      1,
      _created_by
    )
    on conflict (mission_id) do update
    set display_name = excluded.display_name,
        description = excluded.description,
        lifecycle_state = excluded.lifecycle_state,
        visibility = excluded.visibility,
        join_policy = excluded.join_policy,
        updated_at = now()
    returning id into _space_id;

    insert into public.conversation_space_roles (
      space_id, system_key, display_name, capabilities, position
    ) values
      (_space_id, 'lead', 'Lead', array['space.manage','room.manage','membership.manage','message.create','message.moderate'], 10),
      (_space_id, 'coordinator', 'Coordinator', array['room.manage','membership.manage','message.create','message.moderate'], 20),
      (_space_id, 'member', 'Member', array['message.create','thread.create'], 30),
      (_space_id, 'observer', 'Observer', array[]::text[], 40)
    on conflict (space_id, system_key) do update
    set display_name = excluded.display_name,
        capabilities = excluded.capabilities,
        position = excluded.position;

    insert into public.conversation_context_groups (space_id, system_key, display_name, position)
    values
      (_space_id, 'start_here', 'Start here', 10),
      (_space_id, 'delivery', 'Delivery', 20),
      (_space_id, 'evidence', 'Evidence', 30),
      (_space_id, 'support', 'Support', 40)
    on conflict (space_id, system_key) do update
    set display_name = excluded.display_name, position = excluded.position;

    insert into public.conversation_rooms (
      space_id, context_group_id, system_key, display_name, description,
      room_type, posting_policy, position, created_by
    )
    select _space_id, group_row.id, room_spec.system_key, room_spec.display_name,
      room_spec.description, room_spec.room_type, room_spec.posting_policy,
      room_spec.position, _created_by
    from (values
      ('start_here', 'briefing', 'Briefing', 'Mission purpose, scope and essential decisions.', 'announcement', 'stewards', 10),
      ('delivery', 'workroom', 'Workroom', 'Day-to-day Mission collaboration.', 'conversation', 'members', 20),
      ('delivery', 'decisions', 'Decisions', 'Structured proposals and recorded outcomes.', 'board', 'members', 30),
      ('evidence', 'progress_evidence', 'Progress and evidence', 'Progress, Stories and durable evidence.', 'evidence', 'members', 40),
      ('delivery', 'milestones', 'Milestones', 'Events and delivery milestones.', 'event_index', 'stewards', 50),
      ('support', 'blockers_help', 'Blockers and help', 'Ask for help and make blockers visible.', 'help', 'members', 60)
    ) as room_spec(group_key, system_key, display_name, description, room_type, posting_policy, position)
    join public.conversation_context_groups as group_row
      on group_row.space_id = _space_id and group_row.system_key = room_spec.group_key
    on conflict (space_id, system_key) do update
    set context_group_id = excluded.context_group_id,
        display_name = excluded.display_name,
        description = excluded.description,
        room_type = excluded.room_type,
        posting_policy = excluded.posting_policy,
        position = excluded.position,
        updated_at = now();

    insert into public.conversation_space_memberships (
      space_id, user_id, domain_role, membership_state,
      source_membership_version, joined_at, left_at
    )
    select
      _space_id,
      member.user_id,
      member.role,
      member.membership_state,
      member.state_version,
      member.created_at,
      member.left_at
    from public.mission_members as member
    where member.mission_id = _source_id
    on conflict (space_id, user_id) do update
    set domain_role = excluded.domain_role,
        membership_state = excluded.membership_state,
        source_membership_version = excluded.source_membership_version,
        joined_at = excluded.joined_at,
        left_at = excluded.left_at,
        synced_at = now();
  end if;

  insert into public.conversation_space_role_members (
    space_id, role_id, user_id, assigned_by
  )
  select
    membership.space_id,
    role_row.id,
    membership.user_id,
    _actor_id
  from public.conversation_space_memberships as membership
  join public.conversation_space_roles as role_row
    on role_row.space_id = membership.space_id
    and role_row.system_key = case
      when _source_type = 'chapter'
        and membership.domain_role in ('lead', 'steward', 'member')
        then membership.domain_role
      when _source_type = 'mission'
        and membership.domain_role in ('lead', 'coordinator', 'observer')
        then membership.domain_role
      else 'member'
    end
  where membership.space_id = _space_id
    and membership.membership_state = 'active'
  on conflict (role_id, user_id) do update
  set assigned_at = now(), assigned_by = excluded.assigned_by;

  return _space_id;
end;
$$;

create or replace function private.sync_chapter_space_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _space_id uuid;
begin
  if tg_op = 'DELETE' then
    select id into _space_id
    from public.conversation_spaces
    where chapter_id = old.chapter_id;
  else
    select id into _space_id
    from public.conversation_spaces
    where chapter_id = new.chapter_id;
  end if;

  if _space_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform private.sync_conversation_space_member(
      _space_id, old.user_id, old.role, 'left', old.state_version + 1,
      old.created_at, now(), null
    );
    return old;
  end if;

  perform private.sync_conversation_space_member(
    _space_id, new.user_id, new.role, new.membership_state, new.state_version,
    new.created_at, new.left_at, new.decided_by
  );
  return new;
end;
$$;

create or replace function private.sync_mission_space_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _space_id uuid;
begin
  if tg_op = 'DELETE' then
    select id into _space_id
    from public.conversation_spaces
    where mission_id = old.mission_id;
  else
    select id into _space_id
    from public.conversation_spaces
    where mission_id = new.mission_id;
  end if;

  if _space_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform private.sync_conversation_space_member(
      _space_id, old.user_id, old.role, 'left', old.state_version + 1,
      old.created_at, now(), null
    );
    return old;
  end if;

  perform private.sync_conversation_space_member(
    _space_id, new.user_id, new.role, new.membership_state, new.state_version,
    new.created_at, new.left_at, new.decided_by
  );
  return new;
end;
$$;

drop trigger if exists sync_chapter_space_membership on public.chapter_members;
create trigger sync_chapter_space_membership
after insert or update or delete on public.chapter_members
for each row execute function private.sync_chapter_space_membership();

drop trigger if exists sync_mission_space_membership on public.mission_members;
create trigger sync_mission_space_membership
after insert or update or delete on public.mission_members
for each row execute function private.sync_mission_space_membership();

do $$
declare
  source_row record;
begin
  for source_row in select id from public.chapters loop
    perform private.bootstrap_conversation_space('chapter', source_row.id, null);
  end loop;
  for source_row in select id from public.missions loop
    perform private.bootstrap_conversation_space('mission', source_row.id, null);
  end loop;
end;
$$;

-- --------------------------------------------------------------------------
-- Row-level security and explicit Data API grants
-- --------------------------------------------------------------------------

create or replace function private.is_my_active_chapter(_chapter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.chapter_members as member
    where member.chapter_id = _chapter_id
      and member.user_id = auth.uid()
      and member.membership_state = 'active'
  );
$$;

create or replace function private.is_my_active_mission(_mission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.mission_members as member
    where member.mission_id = _mission_id
      and member.user_id = auth.uid()
      and member.membership_state = 'active'
  );
$$;

create policy conversation_spaces_discovery_select
on public.conversation_spaces
for select
to authenticated
using (
  visibility in ('discoverable', 'public')
  or private.can_access_conversation_space(id)
);

create policy conversation_space_roles_member_select
on public.conversation_space_roles
for select
to authenticated
using (private.can_access_conversation_space(space_id));

create policy conversation_space_memberships_member_select
on public.conversation_space_memberships
for select
to authenticated
using (private.can_access_conversation_space(space_id));

create policy conversation_space_role_members_member_select
on public.conversation_space_role_members
for select
to authenticated
using (private.can_access_conversation_space(space_id));

create policy conversation_groups_member_select
on public.conversation_context_groups
for select
to authenticated
using (private.can_access_conversation_space(space_id));

create policy conversation_rooms_member_select
on public.conversation_rooms
for select
to authenticated
using (private.can_access_conversation_room(id));

create policy conversation_room_overrides_manager_select
on public.conversation_room_permission_overrides
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_rooms as room
    where room.id = room_id
      and private.can_manage_conversation_space(room.space_id)
  )
);

create policy conversation_threads_member_select
on public.conversation_threads
for select
to authenticated
using (private.can_access_conversation_thread(id));

create policy conversation_thread_members_select
on public.conversation_thread_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.can_access_conversation_thread(thread_id)
);

create policy conversation_messages_member_select
on public.conversation_messages
for select
to authenticated
using (
  private.can_access_conversation_room(room_id)
  and (thread_id is null or private.can_access_conversation_thread(thread_id))
);

create policy conversation_message_revisions_member_select
on public.conversation_message_revisions
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_messages as message
    where message.id = message_id
  )
);

create policy conversation_mentions_member_select
on public.conversation_mentions
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_messages as message
    where message.id = message_id
  )
);

create policy conversation_reactions_member_select
on public.conversation_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_messages as message
    where message.id = message_id
  )
);

create policy conversation_attachments_member_select
on public.conversation_attachments
for select
to authenticated
using (
  (scan_status = 'clean' or uploaded_by = (select auth.uid()))
  and exists (
    select 1
    from public.conversation_messages as message
    where message.id = message_id
  )
);

create policy conversation_pins_member_select
on public.conversation_pins
for select
to authenticated
using (private.can_access_conversation_room(room_id));

create policy conversation_bookmarks_owner_select
on public.conversation_bookmarks
for select
to authenticated
using (user_id = (select auth.uid()));

create policy conversation_read_states_owner_select
on public.conversation_read_states
for select
to authenticated
using (user_id = (select auth.uid()));

create policy conversation_preferences_owner_select
on public.conversation_notification_preferences
for select
to authenticated
using (user_id = (select auth.uid()));

create policy conversation_reports_owner_select
on public.conversation_reports
for select
to authenticated
using (reporter_id = (select auth.uid()));

revoke all privileges on table
  public.conversation_spaces,
  public.conversation_space_roles,
  public.conversation_space_memberships,
  public.conversation_space_role_members,
  public.conversation_context_groups,
  public.conversation_rooms,
  public.conversation_room_permission_overrides,
  public.conversation_threads,
  public.conversation_thread_members,
  public.conversation_messages,
  public.conversation_message_revisions,
  public.conversation_mentions,
  public.conversation_reactions,
  public.conversation_attachments,
  public.conversation_pins,
  public.conversation_bookmarks,
  public.conversation_read_states,
  public.conversation_notification_preferences,
  public.conversation_reports
from public, anon, authenticated;

grant select on table
  public.conversation_spaces,
  public.conversation_space_roles,
  public.conversation_space_memberships,
  public.conversation_space_role_members,
  public.conversation_context_groups,
  public.conversation_rooms,
  public.conversation_room_permission_overrides,
  public.conversation_threads,
  public.conversation_thread_members,
  public.conversation_messages,
  public.conversation_message_revisions,
  public.conversation_mentions,
  public.conversation_reactions,
  public.conversation_attachments,
  public.conversation_pins,
  public.conversation_bookmarks,
  public.conversation_read_states,
  public.conversation_notification_preferences,
  public.conversation_reports
to authenticated;

grant all privileges on table
  public.conversation_spaces,
  public.conversation_space_roles,
  public.conversation_space_memberships,
  public.conversation_space_role_members,
  public.conversation_context_groups,
  public.conversation_rooms,
  public.conversation_room_permission_overrides,
  public.conversation_threads,
  public.conversation_thread_members,
  public.conversation_messages,
  public.conversation_message_revisions,
  public.conversation_mentions,
  public.conversation_reactions,
  public.conversation_attachments,
  public.conversation_pins,
  public.conversation_bookmarks,
  public.conversation_read_states,
  public.conversation_notification_preferences,
  public.conversation_reports
to service_role;

revoke all privileges on table
  private.conversation_moderation_actions,
  private.conversation_outbox
from public, anon, authenticated;
grant all privileges on table
  private.conversation_moderation_actions,
  private.conversation_outbox
to service_role;

revoke all privileges on function private.can_access_conversation_space(uuid)
  from public, anon, service_role;
revoke all privileges on function private.can_manage_conversation_space(uuid)
  from public, anon, service_role;
revoke all privileges on function private.can_access_conversation_room(uuid)
  from public, anon, service_role;
revoke all privileges on function private.can_access_conversation_thread(uuid)
  from public, anon, service_role;
revoke all privileges on function private.can_post_conversation_room(uuid)
  from public, anon, service_role;
revoke all privileges on function private.is_my_active_chapter(uuid)
  from public, anon, service_role;
revoke all privileges on function private.is_my_active_mission(uuid)
  from public, anon, service_role;

-- RLS policies execute these caller-bound predicates as the authenticated role.
-- The private schema is not exposed through the Data API, and every helper returns
-- only a boolean scoped to auth.uid(); EXECUTE is therefore the narrow privilege
-- required for policy evaluation without granting direct table access.
grant execute on function private.can_access_conversation_space(uuid)
  to authenticated;
grant execute on function private.can_manage_conversation_space(uuid)
  to authenticated;
grant execute on function private.can_access_conversation_room(uuid)
  to authenticated;
grant execute on function private.can_access_conversation_thread(uuid)
  to authenticated;
grant execute on function private.can_post_conversation_room(uuid)
  to authenticated;
grant execute on function private.is_my_active_chapter(uuid)
  to authenticated;
grant execute on function private.is_my_active_mission(uuid)
  to authenticated;

revoke all privileges on function private.sync_conversation_space_member(
  uuid, uuid, text, text, bigint, timestamptz, timestamptz, uuid
) from public, anon, authenticated;
revoke all privileges on function private.bootstrap_conversation_space(text, uuid, uuid)
  from public, anon, authenticated;
revoke all privileges on function private.sync_chapter_space_membership()
  from public, anon, authenticated;
revoke all privileges on function private.sync_mission_space_membership()
  from public, anon, authenticated;

-- Direct browser writes are superseded by the caller-bound contracts below.
revoke insert, update, delete on table public.chapters from anon, authenticated;
revoke insert, update, delete on table public.chapter_members from anon, authenticated;
revoke insert, update, delete on table public.chapter_proposals from anon, authenticated;
revoke insert, update, delete on table public.missions from anon, authenticated;
revoke insert, update, delete on table public.mission_members from anon, authenticated;

grant select on table public.chapters to anon, authenticated;
grant select on table public.missions to anon, authenticated;
grant select on table public.chapter_members to authenticated;
grant select on table public.mission_members to authenticated;
grant select on table public.chapter_proposals to authenticated;

drop policy if exists "Admins can manage chapters" on public.chapters;
drop policy if exists "Anyone can view chapters" on public.chapters;
drop policy if exists "Anyone can view chapter members" on public.chapter_members;
drop policy if exists "Users can join chapters" on public.chapter_members;
drop policy if exists "Users can leave chapters" on public.chapter_members;
drop policy if exists "Leads can insert chapter members" on public.chapter_members;
drop policy if exists "Leads can update chapter members" on public.chapter_members;
drop policy if exists "Leads can delete chapter members" on public.chapter_members;
drop policy if exists "Admins can insert chapter members" on public.chapter_members;
drop policy if exists "Admins can update chapter members" on public.chapter_members;
drop policy if exists "Admins can delete chapter members" on public.chapter_members;
drop policy if exists "Users can create proposals" on public.chapter_proposals;
drop policy if exists "Admins can update proposals" on public.chapter_proposals;
drop policy if exists "Anyone can view missions" on public.missions;
drop policy if exists "Only admins can create missions" on public.missions;
drop policy if exists "Only admins can update missions" on public.missions;
drop policy if exists "Chapter leads can insert missions" on public.missions;
drop policy if exists "Chapter leads can update their chapter missions" on public.missions;
drop policy if exists "Anyone can view mission members" on public.mission_members;
drop policy if exists "Users can join missions" on public.mission_members;
drop policy if exists "Users can leave missions" on public.mission_members;
drop policy if exists "Users can update their mission participation" on public.mission_members;
drop policy if exists "Leads can insert mission members" on public.mission_members;
drop policy if exists "Leads can update mission members" on public.mission_members;
drop policy if exists "Leads can delete mission members" on public.mission_members;
drop policy if exists "Admins can insert mission members" on public.mission_members;
drop policy if exists "Admins can update mission members" on public.mission_members;
drop policy if exists "Admins can delete mission members" on public.mission_members;

create policy chapters_discovery_select
on public.chapters
for select
to anon, authenticated
using (
  lifecycle_state <> 'archived'
  and visibility in ('discoverable', 'public')
  or exists (
    select 1
    from public.chapter_members as member
    where member.chapter_id = chapters.id
      and member.user_id = (select auth.uid())
      and member.membership_state = 'active'
  )
);

create policy chapter_members_scoped_select
on public.chapter_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_my_active_chapter(chapter_id)
);

create policy missions_discovery_select
on public.missions
for select
to anon, authenticated
using (
  lifecycle_state not in ('archived', 'rejected', 'withdrawn')
  and visibility in ('discoverable', 'public')
  or exists (
    select 1
    from public.mission_members as member
    where member.mission_id = missions.id
      and member.user_id = (select auth.uid())
      and member.membership_state = 'active'
  )
);

create policy mission_members_scoped_select
on public.mission_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_my_active_mission(mission_id)
);

-- --------------------------------------------------------------------------
-- Caller-bound domain and conversation mutations
-- --------------------------------------------------------------------------

create or replace function public.create_my_chapter_proposal(
  _proposed_name text,
  _city text,
  _country text,
  _country_code text,
  _target_audience text,
  _rationale text,
  _proposer_background text,
  _expected_size integer,
  _join_policy text,
  _visibility text,
  _client_request_id uuid
)
returns public.chapter_proposals
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _clean_name text := nullif(pg_catalog.btrim(_proposed_name), '');
  _clean_city text := nullif(pg_catalog.btrim(_city), '');
  _clean_country text := nullif(pg_catalog.btrim(_country), '');
  _clean_country_code text := nullif(pg_catalog.upper(pg_catalog.btrim(_country_code)), '');
  _clean_audience text := nullif(pg_catalog.btrim(_target_audience), '');
  _clean_rationale text := nullif(pg_catalog.btrim(_rationale), '');
  _clean_background text := nullif(pg_catalog.btrim(_proposer_background), '');
  _existing public.chapter_proposals%rowtype;
  _created public.chapter_proposals%rowtype;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if _client_request_id is null then
    raise exception using errcode = '22004', message = 'Client request ID is required';
  end if;
  if public.is_suspended(_actor_id) then
    raise exception using errcode = '42501', message = 'Chapter proposals are unavailable for this member';
  end if;
  if not exists (
    select 1
    from private.community_onboarding_state as onboarding
    where onboarding.user_id = _actor_id and onboarding.status = 'completed'
  ) then
    raise exception using errcode = '42501', message = 'Complete Community onboarding before proposing a Chapter';
  end if;
  if _clean_name is null or pg_catalog.char_length(_clean_name) > 120 then
    raise exception using errcode = '22023', message = 'Chapter name must be 1 to 120 characters';
  end if;
  if _clean_rationale is null or pg_catalog.char_length(_clean_rationale) < 30
    or pg_catalog.char_length(_clean_rationale) > 3000 then
    raise exception using errcode = '22023', message = 'Rationale must be 30 to 3,000 characters';
  end if;
  if _clean_background is null or pg_catalog.char_length(_clean_background) < 20
    or pg_catalog.char_length(_clean_background) > 2000 then
    raise exception using errcode = '22023', message = 'Background must be 20 to 2,000 characters';
  end if;
  if _expected_size is not null and (_expected_size < 1 or _expected_size > 1000000) then
    raise exception using errcode = '22023', message = 'Expected size is outside the supported range';
  end if;
  if _join_policy not in ('open', 'request', 'invite', 'closed') then
    raise exception using errcode = '22023', message = 'Choose a valid join policy';
  end if;
  if _visibility not in ('private', 'discoverable', 'public') then
    raise exception using errcode = '22023', message = 'Choose a valid Chapter visibility';
  end if;
  if _clean_country_code is not null and not exists (
    select 1
    from public.geo_countries as country
    where country.country_code = _clean_country_code and country.active
  ) then
    raise exception using errcode = '22023', message = 'Choose a supported country';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('chapter-proposal:' || _actor_id::text, 0)
  );

  select proposal.* into _existing
  from public.chapter_proposals as proposal
  where proposal.proposer_id = _actor_id
    and proposal.client_request_id = _client_request_id;

  if found then
    if _existing.proposed_name <> _clean_name
      or _existing.rationale <> _clean_rationale
      or _existing.join_policy <> _join_policy
      or _existing.visibility <> _visibility then
      raise exception using errcode = '22023',
        message = 'Client request ID was already used for another Chapter proposal';
    end if;
    return _existing;
  end if;

  if (
    select count(*)
    from public.chapter_proposals as proposal
    where proposal.proposer_id = _actor_id
      and proposal.status in ('pending', 'submitted', 'needs_information')
      and proposal.created_at >= now() - interval '30 days'
  ) >= 3 then
    raise exception using errcode = 'P0001', message = 'Resolve an existing Chapter proposal before creating another';
  end if;

  insert into public.chapter_proposals (
    proposer_id,
    proposed_name,
    city,
    country,
    country_code,
    target_audience,
    rationale,
    proposer_background,
    expected_size,
    status,
    submitted_at,
    join_policy,
    visibility,
    client_request_id
  ) values (
    _actor_id,
    _clean_name,
    _clean_city,
    _clean_country,
    _clean_country_code,
    _clean_audience,
    _clean_rationale,
    _clean_background,
    _expected_size,
    'pending',
    now(),
    _join_policy,
    _visibility,
    _client_request_id
  ) returning * into _created;

  insert into public.audit_log (actor_id, action, target_type, target_id)
  values (_actor_id, 'chapter.proposal_submitted', 'chapter_proposal', _created.id);

  return _created;
end;
$$;

create or replace function public.create_managed_chapter(
  _name text,
  _city text,
  _country text,
  _description text,
  _join_policy text,
  _visibility text,
  _client_request_id uuid
)
returns public.chapters
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _clean_name text := nullif(pg_catalog.btrim(_name), '');
  _clean_city text := nullif(pg_catalog.btrim(_city), '');
  _clean_country text := nullif(pg_catalog.btrim(_country), '');
  _clean_description text := nullif(pg_catalog.btrim(_description), '');
  _existing public.chapters%rowtype;
  _created public.chapters%rowtype;
begin
  if _actor_id is null or not (
    public.has_role(_actor_id, 'admin'::public.app_role)
    or private.has_admin_capability(_actor_id, 'programs.manage')
  ) then
    raise exception using errcode = '42501',
      message = 'Programme authority is required to create a managed Chapter';
  end if;
  if _client_request_id is null then
    raise exception using errcode = '22004', message = 'Client request ID is required';
  end if;
  if _clean_name is null or pg_catalog.char_length(_clean_name) > 160 then
    raise exception using errcode = '22023', message = 'Chapter name must be 1 to 160 characters';
  end if;
  if _clean_city is null or pg_catalog.char_length(_clean_city) > 160 then
    raise exception using errcode = '22023', message = 'Chapter base city is required';
  end if;
  if _clean_country is null or pg_catalog.char_length(_clean_country) > 160 then
    raise exception using errcode = '22023', message = 'Chapter base country is required';
  end if;
  if _clean_description is null or pg_catalog.char_length(_clean_description) > 5000 then
    raise exception using errcode = '22023', message = 'Chapter description must be 1 to 5,000 characters';
  end if;
  if _join_policy not in ('open', 'request', 'invite', 'closed') then
    raise exception using errcode = '22023', message = 'Choose a valid join policy';
  end if;
  if _visibility not in ('private', 'discoverable', 'public') then
    raise exception using errcode = '22023', message = 'Choose a valid Chapter visibility';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('managed-chapter-create:' || _actor_id::text, 0)
  );

  select chapter.* into _existing
  from public.chapters as chapter
  where chapter.created_by = _actor_id
    and chapter.client_request_id = _client_request_id;

  if found then
    if _existing.name <> _clean_name
      or _existing.city is distinct from _clean_city
      or _existing.country is distinct from _clean_country then
      raise exception using errcode = '22023',
        message = 'Client request ID was already used for another Chapter';
    end if;
    return _existing;
  end if;

  insert into public.chapters (
    name,
    city,
    country,
    description,
    created_by,
    client_request_id,
    lifecycle_state,
    visibility,
    join_policy,
    activated_at
  ) values (
    _clean_name,
    _clean_city,
    _clean_country,
    _clean_description,
    _actor_id,
    _client_request_id,
    'active',
    _visibility,
    _join_policy,
    now()
  ) returning * into _created;

  insert into public.chapter_members (
    chapter_id,
    user_id,
    role,
    membership_state,
    decided_by,
    decided_at
  ) values (
    _created.id,
    _actor_id,
    'lead',
    'active',
    _actor_id,
    now()
  );

  perform private.bootstrap_conversation_space('chapter', _created.id, _actor_id);

  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    _actor_id,
    'chapter.managed_created',
    'chapter',
    _created.id,
    pg_catalog.jsonb_build_object(
      'join_policy', _join_policy,
      'visibility', _visibility,
      'client_request_id', _client_request_id
    )
  );

  return _created;
end;
$$;

create or replace function public.create_my_mission(
  _title text,
  _theme text,
  _description text,
  _chapter_id uuid,
  _join_policy text,
  _visibility text,
  _client_request_id uuid
)
returns public.missions
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _clean_title text := nullif(pg_catalog.btrim(_title), '');
  _clean_theme text := nullif(pg_catalog.btrim(_theme), '');
  _clean_description text := nullif(pg_catalog.btrim(_description), '');
  _existing public.missions%rowtype;
  _created public.missions%rowtype;
  _initial_lifecycle text;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if _client_request_id is null then
    raise exception using errcode = '22004', message = 'Client request ID is required';
  end if;
  if public.is_suspended(_actor_id) then
    raise exception using errcode = '42501', message = 'Mission creation is unavailable for this member';
  end if;
  if not exists (
    select 1
    from private.community_onboarding_state as onboarding
    where onboarding.user_id = _actor_id and onboarding.status = 'completed'
  ) then
    raise exception using errcode = '42501', message = 'Complete Community onboarding before creating a Mission';
  end if;
  if _clean_title is null or pg_catalog.char_length(_clean_title) > 160 then
    raise exception using errcode = '22023', message = 'Mission title must be 1 to 160 characters';
  end if;
  if _clean_theme is null or pg_catalog.char_length(_clean_theme) > 80 then
    raise exception using errcode = '22023', message = 'Mission theme must be 1 to 80 characters';
  end if;
  if _clean_description is null or pg_catalog.char_length(_clean_description) < 30
    or pg_catalog.char_length(_clean_description) > 5000 then
    raise exception using errcode = '22023', message = 'Mission description must be 30 to 5,000 characters';
  end if;
  if _join_policy not in ('open', 'request', 'invite', 'closed') then
    raise exception using errcode = '22023', message = 'Choose a valid join policy';
  end if;
  if _visibility not in ('private', 'members', 'discoverable', 'public') then
    raise exception using errcode = '22023', message = 'Choose a valid Mission visibility';
  end if;
  if _chapter_id is not null and not exists (
    select 1
    from public.chapter_members as member
    join public.chapters as chapter on chapter.id = member.chapter_id
    where member.chapter_id = _chapter_id
      and member.user_id = _actor_id
      and member.membership_state = 'active'
      and member.role in ('lead', 'steward')
      and chapter.lifecycle_state = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Only an active Chapter lead or steward can create its Missions';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mission-create:' || _actor_id::text, 0)
  );

  select mission.* into _existing
  from public.missions as mission
  where mission.created_by = _actor_id
    and mission.client_request_id = _client_request_id;

  if found then
    if _existing.title <> _clean_title
      or _existing.description <> _clean_description
      or _existing.chapter_id is distinct from _chapter_id then
      raise exception using errcode = '22023',
        message = 'Client request ID was already used for another Mission';
    end if;
    return _existing;
  end if;

  _initial_lifecycle := case when _chapter_id is null then 'draft' else 'recruiting' end;

  insert into public.missions (
    title,
    theme,
    description,
    status,
    lifecycle_state,
    created_by,
    chapter_id,
    join_policy,
    visibility,
    client_request_id,
    activated_at
  ) values (
    _clean_title,
    _clean_theme,
    _clean_description,
    'open',
    _initial_lifecycle,
    _actor_id,
    _chapter_id,
    _join_policy,
    _visibility,
    _client_request_id,
    case when _initial_lifecycle = 'recruiting' then now() else null end
  ) returning * into _created;

  insert into public.mission_members (
    mission_id,
    user_id,
    role,
    membership_state,
    decided_by,
    decided_at
  ) values (
    _created.id,
    _actor_id,
    'lead',
    'active',
    _actor_id,
    now()
  );

  perform private.bootstrap_conversation_space('mission', _created.id, _actor_id);

  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    _actor_id,
    'mission.created',
    'mission',
    _created.id,
    pg_catalog.jsonb_build_object(
      'lifecycle_state', _initial_lifecycle,
      'chapter_id', _chapter_id
    )
  );

  return _created;
end;
$$;

create or replace function public.request_my_space_membership(
  _space_id uuid,
  _requested_role text,
  _message text,
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _space public.conversation_spaces%rowtype;
  _state text;
  _role text;
  _clean_message text := nullif(pg_catalog.btrim(_message), '');
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if _space_id is null or _client_request_id is null then
    raise exception using errcode = '22004', message = 'Space and client request ID are required';
  end if;
  if public.is_suspended(_actor_id) then
    raise exception using errcode = '42501', message = 'Space membership is unavailable for this member';
  end if;
  if not exists (
    select 1
    from private.community_onboarding_state as onboarding
    where onboarding.user_id = _actor_id and onboarding.status = 'completed'
  ) then
    raise exception using errcode = '42501', message = 'Complete Community onboarding before joining a Space';
  end if;
  if _clean_message is not null and pg_catalog.char_length(_clean_message) > 1000 then
    raise exception using errcode = '22023', message = 'Membership message must be at most 1,000 characters';
  end if;

  select space.* into _space
  from public.conversation_spaces as space
  where space.id = _space_id
  for update;

  if not found or _space.lifecycle_state <> 'active' then
    raise exception using errcode = 'P0002', message = 'Active Space not found';
  end if;
  if _space.join_policy in ('invite', 'closed') then
    raise exception using errcode = '42501', message = 'This Space is not accepting membership requests';
  end if;

  _state := case when _space.join_policy = 'open' then 'active' else 'requested' end;
  _role := case
    when _space.source_type = 'chapter' then 'member'
    when _requested_role in ('contributor', 'founder', 'member') then _requested_role
    else 'member'
  end;

  if _space.source_type = 'chapter' then
    insert into public.chapter_members (
      chapter_id, user_id, role, membership_state, client_request_id,
      requested_at, decided_at, request_message
    ) values (
      _space.chapter_id, _actor_id, _role, _state, _client_request_id,
      now(), case when _state = 'active' then now() else null end, _clean_message
    )
    on conflict (chapter_id, user_id) do update
    set membership_state = case
          when chapter_members.membership_state = 'active' then 'active'
          when chapter_members.membership_state = 'suspended' then 'suspended'
          else excluded.membership_state
        end,
        role = case when chapter_members.role in ('lead', 'steward') then chapter_members.role else excluded.role end,
        client_request_id = excluded.client_request_id,
        request_message = excluded.request_message,
        requested_at = coalesce(chapter_members.requested_at, excluded.requested_at),
        decided_at = case when excluded.membership_state = 'active' then now() else chapter_members.decided_at end,
        left_at = null,
        removal_reason = null,
        state_version = chapter_members.state_version + 1,
        updated_at = now();
  else
    if exists (
      select 1
      from public.missions as mission
      where mission.id = _space.mission_id
        and mission.max_members is not null
        and (
          select count(*)
          from public.mission_members as member
          where member.mission_id = mission.id
            and member.membership_state = 'active'
        ) >= mission.max_members
    ) then
      raise exception using errcode = 'P0001', message = 'This Mission has reached its current capacity';
    end if;

    insert into public.mission_members (
      mission_id, user_id, role, membership_state, client_request_id,
      commitment_type, message, requested_at, decided_at
    ) values (
      _space.mission_id, _actor_id, _role, _state, _client_request_id,
      _requested_role, _clean_message, now(),
      case when _state = 'active' then now() else null end
    )
    on conflict (mission_id, user_id) do update
    set membership_state = case
          when mission_members.membership_state = 'active' then 'active'
          when mission_members.membership_state = 'suspended' then 'suspended'
          else excluded.membership_state
        end,
        role = case when mission_members.role in ('lead', 'coordinator') then mission_members.role else excluded.role end,
        client_request_id = excluded.client_request_id,
        commitment_type = excluded.commitment_type,
        message = excluded.message,
        requested_at = coalesce(mission_members.requested_at, excluded.requested_at),
        decided_at = case when excluded.membership_state = 'active' then now() else mission_members.decided_at end,
        left_at = null,
        removal_reason = null,
        state_version = mission_members.state_version + 1,
        updated_at = now();
  end if;

  return pg_catalog.jsonb_build_object(
    'space_id', _space_id,
    'membership_state', _state,
    'role', _role
  );
end;
$$;

create or replace function public.leave_my_conversation_space(
  _space_id uuid,
  _expected_version bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _space public.conversation_spaces%rowtype;
  _role text;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select space.* into _space
  from public.conversation_spaces as space
  where space.id = _space_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Space not found';
  end if;

  if _space.source_type = 'chapter' then
    select member.role into _role
    from public.chapter_members as member
    where member.chapter_id = _space.chapter_id
      and member.user_id = _actor_id
      and member.state_version = _expected_version
      and member.membership_state = 'active'
    for update;

    if not found then
      raise exception using errcode = '40001', message = 'Chapter membership changed; refresh and try again';
    end if;
    if _role = 'lead' and not exists (
      select 1
      from public.chapter_members as other_lead
      where other_lead.chapter_id = _space.chapter_id
        and other_lead.user_id <> _actor_id
        and other_lead.role = 'lead'
        and other_lead.membership_state = 'active'
    ) then
      raise exception using errcode = '22023', message = 'Assign another active Chapter lead before leaving';
    end if;

    update public.chapter_members as member
    set membership_state = 'left',
        left_at = now(),
        state_version = member.state_version + 1,
        updated_at = now()
    where member.chapter_id = _space.chapter_id and member.user_id = _actor_id;
  else
    select member.role into _role
    from public.mission_members as member
    where member.mission_id = _space.mission_id
      and member.user_id = _actor_id
      and member.state_version = _expected_version
      and member.membership_state = 'active'
    for update;

    if not found then
      raise exception using errcode = '40001', message = 'Mission membership changed; refresh and try again';
    end if;
    if _role = 'lead' and not exists (
      select 1
      from public.mission_members as other_lead
      where other_lead.mission_id = _space.mission_id
        and other_lead.user_id <> _actor_id
        and other_lead.role = 'lead'
        and other_lead.membership_state = 'active'
    ) then
      raise exception using errcode = '22023', message = 'Assign another active Mission lead before leaving';
    end if;

    update public.mission_members as member
    set membership_state = 'left',
        left_at = now(),
        state_version = member.state_version + 1,
        updated_at = now()
    where member.mission_id = _space.mission_id and member.user_id = _actor_id;
  end if;

  insert into public.audit_log (actor_id, action, target_type, target_id)
  values (_actor_id, 'space.membership_left', 'conversation_space', _space_id);
end;
$$;

create or replace function public.decide_space_membership(
  _space_id uuid,
  _target_user_id uuid,
  _decision text,
  _role text,
  _reason text,
  _expected_version bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _space public.conversation_spaces%rowtype;
  _next_state text;
  _safe_role text;
begin
  if _actor_id is null or not private.can_manage_conversation_space(_space_id) then
    raise exception using errcode = '42501', message = 'Space membership management requires a lead or steward role';
  end if;
  if _target_user_id is null or _target_user_id = _actor_id then
    raise exception using errcode = '22023', message = 'Choose another member';
  end if;
  if _decision not in ('approve', 'reject', 'remove', 'restore') then
    raise exception using errcode = '22023', message = 'Choose a valid membership decision';
  end if;
  if _decision in ('reject', 'remove')
    and (nullif(pg_catalog.btrim(_reason), '') is null or pg_catalog.char_length(pg_catalog.btrim(_reason)) > 1000) then
    raise exception using errcode = '22023', message = 'A concise decision reason is required';
  end if;

  select space.* into _space
  from public.conversation_spaces as space
  where space.id = _space_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Space not found';
  end if;

  _next_state := case
    when _decision in ('approve', 'restore') then 'active'
    when _decision = 'reject' then 'removed'
    else 'removed'
  end;

  if _space.source_type = 'chapter' then
    _safe_role := case when _role in ('member', 'steward') then _role else 'member' end;

    update public.chapter_members as member
    set membership_state = _next_state,
        role = case when _next_state = 'active' then _safe_role else member.role end,
        decided_by = _actor_id,
        decided_at = now(),
        removal_reason = case when _next_state = 'removed' then pg_catalog.btrim(_reason) else null end,
        left_at = case when _next_state = 'removed' then now() else null end,
        state_version = member.state_version + 1,
        updated_at = now()
    where member.chapter_id = _space.chapter_id
      and member.user_id = _target_user_id
      and member.state_version = _expected_version;
  else
    _safe_role := case
      when _role in ('member', 'contributor', 'founder', 'observer', 'coordinator') then _role
      else 'member'
    end;

    update public.mission_members as member
    set membership_state = _next_state,
        role = case when _next_state = 'active' then _safe_role else member.role end,
        decided_by = _actor_id,
        decided_at = now(),
        removal_reason = case when _next_state = 'removed' then pg_catalog.btrim(_reason) else null end,
        left_at = case when _next_state = 'removed' then now() else null end,
        state_version = member.state_version + 1,
        updated_at = now()
    where member.mission_id = _space.mission_id
      and member.user_id = _target_user_id
      and member.state_version = _expected_version;
  end if;

  if not found then
    raise exception using errcode = '40001', message = 'Membership changed; refresh and try again';
  end if;

  insert into public.audit_log (actor_id, action, target_type, target_id, reason, metadata)
  values (
    _actor_id,
    'space.membership_' || _decision,
    'conversation_space',
    _space_id,
    nullif(pg_catalog.btrim(_reason), ''),
    pg_catalog.jsonb_build_object('target_user_id', _target_user_id, 'role', _safe_role)
  );

  return pg_catalog.jsonb_build_object(
    'space_id', _space_id,
    'user_id', _target_user_id,
    'membership_state', _next_state,
    'role', _safe_role
  );
end;
$$;

create or replace function public.set_managed_space_lead(
  _space_id uuid,
  _target_user_id uuid,
  _enabled boolean,
  _expected_version bigint,
  _reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _space public.conversation_spaces%rowtype;
  _current_version bigint;
  _result_version bigint;
  _clean_reason text := nullif(pg_catalog.btrim(_reason), '');
begin
  if _actor_id is null or not (
    public.has_role(_actor_id, 'admin'::public.app_role)
    or private.has_admin_capability(_actor_id, 'programs.manage')
  ) then
    raise exception using errcode = '42501',
      message = 'Programme authority is required to manage Space leads';
  end if;
  if _target_user_id is null or _target_user_id = _actor_id then
    raise exception using errcode = '22023', message = 'Choose another member';
  end if;
  if _expected_version < 0 then
    raise exception using errcode = '22023', message = 'Membership version cannot be negative';
  end if;
  if _clean_reason is null or pg_catalog.char_length(_clean_reason) > 1000 then
    raise exception using errcode = '22023', message = 'A concise leadership reason is required';
  end if;
  if not exists (
    select 1 from public.profiles as profile where profile.user_id = _target_user_id
  ) then
    raise exception using errcode = 'P0002', message = 'Target member not found';
  end if;

  select space.* into _space
  from public.conversation_spaces as space
  where space.id = _space_id and space.lifecycle_state <> 'archived'
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Active Space not found';
  end if;

  if _space.source_type = 'chapter' then
    select member.state_version into _current_version
    from public.chapter_members as member
    where member.chapter_id = _space.chapter_id and member.user_id = _target_user_id
    for update;

    if found then
      if _current_version <> _expected_version then
        raise exception using errcode = '40001', message = 'Chapter membership changed; refresh and try again';
      end if;
      if not _enabled and not exists (
        select 1
        from public.chapter_members as other_lead
        where other_lead.chapter_id = _space.chapter_id
          and other_lead.user_id <> _target_user_id
          and other_lead.role = 'lead'
          and other_lead.membership_state = 'active'
      ) then
        raise exception using errcode = '22023', message = 'Assign another active Chapter lead first';
      end if;

      update public.chapter_members as member
      set role = case when _enabled then 'lead' else 'member' end,
          membership_state = 'active',
          decided_by = _actor_id,
          decided_at = now(),
          left_at = null,
          removal_reason = null,
          state_version = member.state_version + 1,
          updated_at = now()
      where member.chapter_id = _space.chapter_id and member.user_id = _target_user_id
      returning state_version into _result_version;
    else
      if not _enabled or _expected_version <> 0 then
        raise exception using errcode = '40001', message = 'Chapter membership changed; refresh and try again';
      end if;
      insert into public.chapter_members (
        chapter_id, user_id, role, membership_state, invited_by, decided_by, decided_at
      ) values (
        _space.chapter_id, _target_user_id, 'lead', 'active', _actor_id, _actor_id, now()
      ) returning state_version into _result_version;
    end if;
  else
    select member.state_version into _current_version
    from public.mission_members as member
    where member.mission_id = _space.mission_id and member.user_id = _target_user_id
    for update;

    if found then
      if _current_version <> _expected_version then
        raise exception using errcode = '40001', message = 'Mission membership changed; refresh and try again';
      end if;
      if not _enabled and not exists (
        select 1
        from public.mission_members as other_lead
        where other_lead.mission_id = _space.mission_id
          and other_lead.user_id <> _target_user_id
          and other_lead.role = 'lead'
          and other_lead.membership_state = 'active'
      ) then
        raise exception using errcode = '22023', message = 'Assign another active Mission lead first';
      end if;

      update public.mission_members as member
      set role = case when _enabled then 'lead' else 'member' end,
          membership_state = 'active',
          decided_by = _actor_id,
          decided_at = now(),
          left_at = null,
          removal_reason = null,
          state_version = member.state_version + 1,
          updated_at = now()
      where member.mission_id = _space.mission_id and member.user_id = _target_user_id
      returning state_version into _result_version;
    else
      if not _enabled or _expected_version <> 0 then
        raise exception using errcode = '40001', message = 'Mission membership changed; refresh and try again';
      end if;
      insert into public.mission_members (
        mission_id, user_id, role, membership_state, invited_by, decided_by, decided_at
      ) values (
        _space.mission_id, _target_user_id, 'lead', 'active', _actor_id, _actor_id, now()
      ) returning state_version into _result_version;
    end if;
  end if;

  insert into public.audit_log (actor_id, action, target_type, target_id, reason, metadata)
  values (
    _actor_id,
    case when _enabled then 'space.lead_assigned' else 'space.lead_removed' end,
    'conversation_space',
    _space_id,
    _clean_reason,
    pg_catalog.jsonb_build_object(
      'target_user_id', _target_user_id,
      'source_type', _space.source_type,
      'membership_version', _result_version
    )
  );

  return pg_catalog.jsonb_build_object(
    'space_id', _space_id,
    'target_user_id', _target_user_id,
    'role', case when _enabled then 'lead' else 'member' end,
    'membership_state', 'active',
    'state_version', _result_version
  );
end;
$$;

create or replace function public.transition_managed_chapter(
  _chapter_id uuid,
  _target_state text,
  _expected_version bigint,
  _reason text
)
returns public.chapters
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _chapter public.chapters%rowtype;
  _updated public.chapters%rowtype;
  _clean_reason text := nullif(pg_catalog.btrim(_reason), '');
begin
  if _actor_id is null or not (
    public.has_role(_actor_id, 'admin'::public.app_role)
    or private.has_admin_capability(_actor_id, 'programs.manage')
  ) then
    raise exception using errcode = '42501',
      message = 'Programme authority is required to change Chapter lifecycle';
  end if;

  select chapter.* into _chapter
  from public.chapters as chapter
  where chapter.id = _chapter_id and chapter.state_version = _expected_version
  for update;

  if not found then
    raise exception using errcode = '40001', message = 'Chapter changed; refresh and try again';
  end if;
  if not exists (
    select 1
    from (values
      ('active', 'paused'),
      ('active', 'archived'),
      ('paused', 'active'),
      ('paused', 'archived')
    ) as transition(from_state, to_state)
    where transition.from_state = _chapter.lifecycle_state
      and transition.to_state = _target_state
  ) then
    raise exception using errcode = '22023', message = 'Chapter lifecycle transition is not allowed';
  end if;
  if _target_state in ('paused', 'archived') and _clean_reason is null then
    raise exception using errcode = '22023', message = 'A lifecycle reason is required';
  end if;

  update public.chapters as chapter
  set lifecycle_state = _target_state,
      state_version = chapter.state_version + 1,
      paused_at = case when _target_state = 'paused' then now() else null end,
      archived_at = case when _target_state = 'archived' then now() else null end,
      updated_at = now()
  where chapter.id = _chapter_id
  returning * into _updated;

  update public.conversation_spaces as space
  set lifecycle_state = _target_state,
      archived_at = case when _target_state = 'archived' then now() else null end,
      updated_at = now()
  where space.chapter_id = _chapter_id;

  insert into public.audit_log (actor_id, action, target_type, target_id, reason, metadata)
  values (
    _actor_id,
    'chapter.lifecycle_transitioned',
    'chapter',
    _chapter_id,
    _clean_reason,
    pg_catalog.jsonb_build_object(
      'from', _chapter.lifecycle_state,
      'to', _target_state,
      'from_version', _expected_version,
      'to_version', _updated.state_version
    )
  );

  return _updated;
end;
$$;

create or replace function public.transition_my_mission(
  _mission_id uuid,
  _target_state text,
  _reason text,
  _expected_version bigint
)
returns public.missions
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _mission public.missions%rowtype;
  _updated public.missions%rowtype;
  _is_program_operator boolean;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select mission.* into _mission
  from public.missions as mission
  where mission.id = _mission_id and mission.state_version = _expected_version
  for update;

  if not found then
    raise exception using errcode = '40001', message = 'Mission changed; refresh and try again';
  end if;

  _is_program_operator := public.has_role(_actor_id, 'admin'::public.app_role)
    or private.has_admin_capability(_actor_id, 'programs.manage');

  if not _is_program_operator and not exists (
    select 1
    from public.mission_members as member
    where member.mission_id = _mission_id
      and member.user_id = _actor_id
      and member.membership_state = 'active'
      and member.role = 'lead'
  ) then
    raise exception using errcode = '42501', message = 'Only Mission leads or programme operators can change lifecycle';
  end if;

  if not exists (
    select 1
    from (values
      ('draft', 'submitted_for_review'),
      ('draft', 'withdrawn'),
      ('submitted_for_review', 'needs_information'),
      ('submitted_for_review', 'approved'),
      ('submitted_for_review', 'rejected'),
      ('submitted_for_review', 'withdrawn'),
      ('needs_information', 'submitted_for_review'),
      ('approved', 'recruiting'),
      ('recruiting', 'active'),
      ('recruiting', 'cancelled'),
      ('active', 'paused'),
      ('active', 'completed'),
      ('active', 'cancelled'),
      ('paused', 'active'),
      ('paused', 'cancelled'),
      ('completed', 'archived'),
      ('cancelled', 'archived')
    ) as transition(from_state, to_state)
    where transition.from_state = _mission.lifecycle_state
      and transition.to_state = _target_state
  ) then
    raise exception using errcode = '22023', message = 'Mission lifecycle transition is not allowed';
  end if;

  if _target_state in ('needs_information', 'approved', 'rejected') and not _is_program_operator then
    raise exception using errcode = '42501', message = 'Programme review is required for this transition';
  end if;
  if _target_state in ('needs_information', 'rejected', 'cancelled')
    and nullif(pg_catalog.btrim(_reason), '') is null then
    raise exception using errcode = '22023', message = 'A lifecycle reason is required';
  end if;

  update public.missions as mission
  set lifecycle_state = _target_state,
      status = case
        when _target_state = 'completed' then 'completed'
        when _target_state = 'archived' then 'archived'
        when _target_state in ('cancelled', 'rejected', 'withdrawn') then 'closed'
        else 'open'
      end,
      state_version = mission.state_version + 1,
      submitted_at = case when _target_state = 'submitted_for_review' then now() else mission.submitted_at end,
      reviewed_at = case when _target_state in ('needs_information', 'approved', 'rejected') then now() else mission.reviewed_at end,
      reviewed_by = case when _target_state in ('needs_information', 'approved', 'rejected') then _actor_id else mission.reviewed_by end,
      decision_reason = case
        when _target_state in ('needs_information', 'approved', 'rejected', 'cancelled')
          then nullif(pg_catalog.btrim(_reason), '')
        else mission.decision_reason
      end,
      activated_at = case when _target_state = 'active' then coalesce(mission.activated_at, now()) else mission.activated_at end,
      completed_at = case when _target_state = 'completed' then now() else mission.completed_at end,
      archived_at = case when _target_state = 'archived' then now() else mission.archived_at end,
      updated_at = now()
  where mission.id = _mission_id
  returning * into _updated;

  update public.conversation_spaces as space
  set lifecycle_state = case
        when _target_state = 'archived' then 'archived'
        when _target_state = 'paused' then 'paused'
        else 'active'
      end,
      archived_at = case when _target_state = 'archived' then now() else null end,
      updated_at = now()
  where space.mission_id = _mission_id;

  insert into public.audit_log (actor_id, action, target_type, target_id, reason, metadata)
  values (
    _actor_id,
    'mission.lifecycle_transitioned',
    'mission',
    _mission_id,
    nullif(pg_catalog.btrim(_reason), ''),
    pg_catalog.jsonb_build_object(
      'from', _mission.lifecycle_state,
      'to', _target_state,
      'from_version', _expected_version,
      'to_version', _updated.state_version
    )
  );

  return _updated;
end;
$$;

create or replace function public.update_my_chapter_details(
  _chapter_id uuid,
  _description text,
  _city text,
  _country text,
  _country_code text,
  _visibility text,
  _join_policy text,
  _expected_version bigint
)
returns public.chapters
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _updated public.chapters%rowtype;
  _clean_description text := nullif(pg_catalog.btrim(_description), '');
  _clean_country_code text := nullif(pg_catalog.upper(pg_catalog.btrim(_country_code)), '');
begin
  if _actor_id is null or not exists (
    select 1
    from public.chapter_members as member
    where member.chapter_id = _chapter_id
      and member.user_id = _actor_id
      and member.membership_state = 'active'
      and member.role in ('lead', 'steward')
  ) then
    raise exception using errcode = '42501', message = 'Only active Chapter leads or stewards can update Chapter details';
  end if;
  if _clean_description is null or pg_catalog.char_length(_clean_description) > 5000 then
    raise exception using errcode = '22023', message = 'Chapter description must be 1 to 5,000 characters';
  end if;
  if _visibility not in ('private', 'discoverable', 'public') then
    raise exception using errcode = '22023', message = 'Choose a valid Chapter visibility';
  end if;
  if _join_policy not in ('open', 'request', 'invite', 'closed') then
    raise exception using errcode = '22023', message = 'Choose a valid join policy';
  end if;
  if _clean_country_code is not null and not exists (
    select 1
    from public.geo_countries as country
    where country.country_code = _clean_country_code and country.active
  ) then
    raise exception using errcode = '22023', message = 'Choose a supported country';
  end if;

  update public.chapters as chapter
  set description = _clean_description,
      city = nullif(pg_catalog.btrim(_city), ''),
      country = nullif(pg_catalog.btrim(_country), ''),
      country_code = _clean_country_code,
      visibility = _visibility,
      join_policy = _join_policy,
      state_version = chapter.state_version + 1,
      updated_at = now()
  where chapter.id = _chapter_id and chapter.state_version = _expected_version
  returning * into _updated;

  if not found then
    raise exception using errcode = '40001', message = 'Chapter changed; refresh and try again';
  end if;

  update public.conversation_spaces as space
  set description = _updated.description,
      visibility = case when _updated.visibility = 'private' then 'private' else _updated.visibility end,
      join_policy = _updated.join_policy,
      updated_at = now()
  where space.chapter_id = _chapter_id;

  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    _actor_id,
    'chapter.details_updated',
    'chapter',
    _chapter_id,
    pg_catalog.jsonb_build_object('version', _updated.state_version)
  );

  return _updated;
end;
$$;

create or replace function public.approve_chapter_proposal(_proposal_id uuid)
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
  if _actor_id is null or not (
    public.has_role(_actor_id, 'admin'::public.app_role)
    or private.has_admin_capability(_actor_id, 'programs.manage')
  ) then
    raise exception using errcode = '42501', message = 'Programme authority is required to approve Chapter proposals';
  end if;

  select proposal.* into _proposal
  from public.chapter_proposals as proposal
  where proposal.id = _proposal_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Chapter proposal not found';
  end if;
  if _proposal.status not in ('pending', 'submitted') then
    raise exception using errcode = '22023', message = 'Chapter proposal is not awaiting review';
  end if;
  if nullif(pg_catalog.btrim(_proposal.city), '') is null
    or nullif(pg_catalog.btrim(_proposal.country), '') is null then
    raise exception using errcode = '22023', message = 'Chapter proposals require a city and country';
  end if;

  insert into public.chapters (
    name,
    city,
    country,
    country_code,
    region_id,
    place_id,
    description,
    created_by,
    source_proposal_id,
    lifecycle_state,
    visibility,
    join_policy,
    activated_at
  ) values (
    pg_catalog.btrim(_proposal.proposed_name),
    pg_catalog.btrim(_proposal.city),
    pg_catalog.btrim(_proposal.country),
    _proposal.country_code,
    _proposal.region_id,
    _proposal.place_id,
    pg_catalog.left(pg_catalog.btrim(_proposal.rationale), 5000),
    _proposal.proposer_id,
    _proposal.id,
    'active',
    _proposal.visibility,
    _proposal.join_policy,
    now()
  ) returning id into _chapter_id;

  insert into public.chapter_members (
    chapter_id,
    user_id,
    role,
    membership_state,
    decided_by,
    decided_at
  ) values (
    _chapter_id,
    _proposal.proposer_id,
    'lead',
    'active',
    _actor_id,
    now()
  );

  perform private.bootstrap_conversation_space('chapter', _chapter_id, _actor_id);

  update public.chapter_proposals as proposal
  set status = 'approved',
      approved_chapter_id = _chapter_id,
      reviewed_at = now(),
      reviewed_by = _actor_id,
      decision_reason = null,
      state_version = proposal.state_version + 1,
      updated_at = now()
  where proposal.id = _proposal.id;

  insert into public.notifications (user_id, type, message, link)
  values (
    _proposal.proposer_id,
    'chapter_approved',
    'Your Chapter proposal was approved. Its Space is ready.',
    '/app/chapters/' || _chapter_id::text
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

create or replace function public.reject_chapter_proposal(_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _proposal public.chapter_proposals%rowtype;
begin
  if _actor_id is null or not (
    public.has_role(_actor_id, 'admin'::public.app_role)
    or private.has_admin_capability(_actor_id, 'programs.manage')
  ) then
    raise exception using errcode = '42501', message = 'Programme authority is required to reject Chapter proposals';
  end if;

  select proposal.* into _proposal
  from public.chapter_proposals as proposal
  where proposal.id = _proposal_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Chapter proposal not found';
  end if;
  if _proposal.status not in ('pending', 'submitted') then
    raise exception using errcode = '22023', message = 'Chapter proposal is not awaiting review';
  end if;

  update public.chapter_proposals as proposal
  set status = 'rejected',
      reviewed_at = now(),
      reviewed_by = _actor_id,
      decision_reason = 'Not approved in the current programme review.',
      state_version = proposal.state_version + 1,
      updated_at = now()
  where proposal.id = _proposal.id;

  insert into public.notifications (user_id, type, message, link)
  values (
    _proposal.proposer_id,
    'chapter_rejected',
    'Your Chapter proposal was not approved in the current review.',
    '/app/chapters'
  );

  insert into public.audit_log (actor_id, action, target_type, target_id)
  values (_actor_id, 'chapter.proposal_rejected', 'chapter_proposal', _proposal.id);
end;
$$;

create or replace function public.create_my_conversation_thread(
  _room_id uuid,
  _parent_message_id uuid,
  _title text,
  _visibility text,
  _client_request_id uuid
)
returns public.conversation_threads
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _existing public.conversation_threads%rowtype;
  _created public.conversation_threads%rowtype;
begin
  if _actor_id is null or not private.can_post_conversation_room(_room_id) then
    raise exception using errcode = '42501', message = 'Thread creation is not allowed in this Room';
  end if;
  if _client_request_id is null then
    raise exception using errcode = '22004', message = 'Client request ID is required';
  end if;
  if _visibility not in ('room', 'private') then
    raise exception using errcode = '22023', message = 'Choose a valid Thread visibility';
  end if;
  if _title is not null and (
    pg_catalog.char_length(pg_catalog.btrim(_title)) = 0
    or pg_catalog.char_length(pg_catalog.btrim(_title)) > 160
  ) then
    raise exception using errcode = '22023', message = 'Thread title must be at most 160 characters';
  end if;
  if _parent_message_id is not null and not exists (
    select 1
    from public.conversation_messages as message
    where message.id = _parent_message_id
      and message.room_id = _room_id
      and message.deleted_at is null
  ) then
    raise exception using errcode = '22023', message = 'Parent message does not belong to this Room';
  end if;

  select thread.* into _existing
  from public.conversation_threads as thread
  where thread.created_by = _actor_id
    and thread.client_request_id = _client_request_id;

  if found then
    if _existing.room_id <> _room_id
      or _existing.parent_message_id is distinct from _parent_message_id
      or _existing.visibility <> _visibility then
      raise exception using errcode = '22023',
        message = 'Client request ID was already used for another Thread';
    end if;
    return _existing;
  end if;

  insert into public.conversation_threads (
    room_id, parent_message_id, title, visibility, created_by, client_request_id
  ) values (
    _room_id,
    _parent_message_id,
    nullif(pg_catalog.btrim(_title), ''),
    _visibility,
    _actor_id,
    _client_request_id
  ) returning * into _created;

  if _visibility = 'private' then
    insert into public.conversation_thread_members (thread_id, user_id, added_by)
    values (_created.id, _actor_id, _actor_id);
  end if;

  return _created;
end;
$$;

create or replace function public.send_my_conversation_message(
  _room_id uuid,
  _thread_id uuid,
  _content text,
  _client_request_id uuid
)
returns public.conversation_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _clean_content text := nullif(pg_catalog.btrim(_content), '');
  _existing public.conversation_messages%rowtype;
  _created public.conversation_messages%rowtype;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if _client_request_id is null then
    raise exception using errcode = '22004', message = 'Client request ID is required';
  end if;
  if public.is_suspended(_actor_id) or not private.can_post_conversation_room(_room_id) then
    raise exception using errcode = '42501', message = 'Posting is not allowed in this Room';
  end if;
  if _clean_content is null or pg_catalog.char_length(_clean_content) > 4000 then
    raise exception using errcode = '22023', message = 'Message must be 1 to 4,000 characters';
  end if;
  if _thread_id is not null and not exists (
    select 1
    from public.conversation_threads as thread
    where thread.id = _thread_id
      and thread.room_id = _room_id
      and thread.archived_at is null
      and thread.locked_at is null
      and private.can_access_conversation_thread(thread.id)
  ) then
    raise exception using errcode = '42501', message = 'Thread is unavailable for posting';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('space-message:' || _actor_id::text, 0)
  );

  select message.* into _existing
  from public.conversation_messages as message
  where message.author_id = _actor_id
    and message.client_request_id = _client_request_id;

  if found then
    if _existing.room_id <> _room_id
      or _existing.thread_id is distinct from _thread_id
      or _existing.content <> _clean_content then
      raise exception using errcode = '22023',
        message = 'Client request ID was already used for another message';
    end if;
    return _existing;
  end if;

  if (
    select count(*)
    from public.conversation_messages as message
    where message.author_id = _actor_id
      and message.created_at >= now() - interval '1 minute'
  ) >= 30 then
    raise exception using errcode = 'P0001', message = 'Message rate limit exceeded; try again shortly';
  end if;

  insert into public.conversation_messages (
    room_id, thread_id, author_id, content, client_request_id
  ) values (
    _room_id, _thread_id, _actor_id, _clean_content, _client_request_id
  ) returning * into _created;

  if _thread_id is not null then
    update public.conversation_threads
    set updated_at = now()
    where id = _thread_id;
  end if;

  insert into private.conversation_outbox (
    event_key, event_type, aggregate_type, aggregate_id, payload
  ) values (
    'conversation.message_created:' || _created.id::text,
    'conversation.message_created',
    'conversation_message',
    _created.id,
    pg_catalog.jsonb_build_object(
      'room_id', _room_id,
      'thread_id', _thread_id,
      'author_id', _actor_id
    )
  ) on conflict (event_key) do nothing;

  return _created;
end;
$$;

create or replace function public.mark_my_conversation_room_read(
  _room_id uuid,
  _message_id uuid
)
returns public.conversation_read_states
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _message_created_at timestamptz;
  _state public.conversation_read_states%rowtype;
begin
  if _actor_id is null or not private.can_access_conversation_room(_room_id) then
    raise exception using errcode = '42501', message = 'Room access is required';
  end if;

  if _message_id is not null then
    select message.created_at into _message_created_at
    from public.conversation_messages as message
    where message.id = _message_id and message.room_id = _room_id;

    if not found then
      raise exception using errcode = '22023', message = 'Read cursor does not belong to this Room';
    end if;
  end if;

  insert into public.conversation_read_states (
    user_id, room_id, last_read_message_id, last_read_at, updated_at
  ) values (
    _actor_id,
    _room_id,
    _message_id,
    coalesce(_message_created_at, now()),
    now()
  )
  on conflict (user_id, room_id) do update
  set last_read_message_id = case
        when conversation_read_states.last_read_at <= excluded.last_read_at
          then excluded.last_read_message_id
        else conversation_read_states.last_read_message_id
      end,
      last_read_at = greatest(conversation_read_states.last_read_at, excluded.last_read_at),
      updated_at = now()
  returning * into _state;

  return _state;
end;
$$;

-- Keep the historical Mission progress feed safe while the Room-based evidence
-- surface is introduced. Left, removed or suspended memberships cannot post or
-- receive the derived update notification.
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

  select update_row.* into _existing
  from public.mission_updates as update_row
  where update_row.author_id = _actor_id
    and update_row.client_request_id = _client_request_id;

  if found then
    if _existing.mission_id <> _mission_id or _existing.content <> _clean_content then
      raise exception using errcode = '22023',
        message = 'Client request ID was already used for another Mission update';
    end if;
    return _existing;
  end if;

  select mission.title into _mission_title
  from public.missions as mission
  where mission.id = _mission_id
    and mission.lifecycle_state in (
      'draft', 'submitted_for_review', 'needs_information', 'approved',
      'recruiting', 'active', 'paused'
    );

  if not found then
    raise exception using errcode = 'P0002', message = 'Writable Mission not found';
  end if;
  if public.is_suspended(_actor_id) or not exists (
    select 1
    from public.mission_members as member
    where member.mission_id = _mission_id
      and member.user_id = _actor_id
      and member.membership_state = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Active Mission membership is required to post progress';
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
    'New progress in Mission: ' || _mission_title,
    '/app/missions/' || _mission_id::text
  from public.mission_members as member
  where member.mission_id = _mission_id
    and member.user_id <> _actor_id
    and member.membership_state = 'active';

  return _created;
end;
$$;

revoke all privileges on function public.create_my_chapter_proposal(
  text, text, text, text, text, text, text, integer, text, text, uuid
) from public, anon, authenticated;
revoke all privileges on function public.create_managed_chapter(
  text, text, text, text, text, text, uuid
) from public, anon, authenticated;
revoke all privileges on function public.create_my_mission(
  text, text, text, uuid, text, text, uuid
) from public, anon, authenticated;
revoke all privileges on function public.request_my_space_membership(uuid, text, text, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.leave_my_conversation_space(uuid, bigint)
  from public, anon, authenticated;
revoke all privileges on function public.decide_space_membership(uuid, uuid, text, text, text, bigint)
  from public, anon, authenticated;
revoke all privileges on function public.set_managed_space_lead(uuid, uuid, boolean, bigint, text)
  from public, anon, authenticated;
revoke all privileges on function public.transition_managed_chapter(uuid, text, bigint, text)
  from public, anon, authenticated;
revoke all privileges on function public.transition_my_mission(uuid, text, text, bigint)
  from public, anon, authenticated;
revoke all privileges on function public.update_my_chapter_details(
  uuid, text, text, text, text, text, text, bigint
) from public, anon, authenticated;
revoke all privileges on function public.approve_chapter_proposal(uuid)
  from public, anon, authenticated;
revoke all privileges on function public.reject_chapter_proposal(uuid)
  from public, anon, authenticated;
revoke all privileges on function public.create_my_conversation_thread(
  uuid, uuid, text, text, uuid
) from public, anon, authenticated;
revoke all privileges on function public.send_my_conversation_message(uuid, uuid, text, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.mark_my_conversation_room_read(uuid, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.post_my_mission_update(uuid, text, uuid)
  from public, anon, authenticated;

grant execute on function public.create_my_chapter_proposal(
  text, text, text, text, text, text, text, integer, text, text, uuid
) to authenticated;
grant execute on function public.create_managed_chapter(
  text, text, text, text, text, text, uuid
) to authenticated;
grant execute on function public.create_my_mission(
  text, text, text, uuid, text, text, uuid
) to authenticated;
grant execute on function public.request_my_space_membership(uuid, text, text, uuid)
  to authenticated;
grant execute on function public.leave_my_conversation_space(uuid, bigint)
  to authenticated;
grant execute on function public.decide_space_membership(uuid, uuid, text, text, text, bigint)
  to authenticated;
grant execute on function public.set_managed_space_lead(uuid, uuid, boolean, bigint, text)
  to authenticated;
grant execute on function public.transition_managed_chapter(uuid, text, bigint, text)
  to authenticated;
grant execute on function public.transition_my_mission(uuid, text, text, bigint)
  to authenticated;
grant execute on function public.update_my_chapter_details(
  uuid, text, text, text, text, text, text, bigint
) to authenticated;
grant execute on function public.approve_chapter_proposal(uuid)
  to authenticated;
grant execute on function public.reject_chapter_proposal(uuid)
  to authenticated;
grant execute on function public.create_my_conversation_thread(
  uuid, uuid, text, text, uuid
) to authenticated;
grant execute on function public.send_my_conversation_message(uuid, uuid, text, uuid)
  to authenticated;
grant execute on function public.mark_my_conversation_room_read(uuid, uuid)
  to authenticated;
grant execute on function public.post_my_mission_update(uuid, text, uuid)
  to authenticated;

comment on table public.conversation_spaces is
  'Chapter/Mission collaboration projection. Domain membership remains authoritative for access.';
comment on table public.conversation_rooms is
  'Typed Indus Orbit Rooms bootstrapped from versioned Chapter and Mission blueprints.';
comment on table public.conversation_messages is
  'Durable human/system/agent/artifact timeline. Browser mutation is caller-bound through RPCs.';
comment on table private.conversation_outbox is
  'Content-free service outbox for conversation fan-out and delivery workers.';
comment on function public.create_my_mission(text, text, text, uuid, text, text, uuid) is
  'Caller-bound atomic Mission creation: Mission, lead membership, Space, roles and default Rooms commit together.';
