-- Close the currently reported uncovered foreign-key paths. These indexes are
-- intentionally additive and preserve the existing query and authorization
-- contracts.

create index if not exists member_location_preferences_country_idx
  on private.member_location_preferences (country_code)
  where country_code is not null;

create index if not exists events_chapter_idx
  on public.events (chapter_id)
  where chapter_id is not null;
create index if not exists events_mission_idx
  on public.events (mission_id)
  where mission_id is not null;
create index if not exists events_organizer_idx
  on public.events (organizer_id);

-- The leading region_id column also covers the single-column region foreign
-- key while the second column covers the composite region/country contract.
create index if not exists geo_places_region_country_idx
  on public.geo_places (region_id, country_code)
  where region_id is not null;

create index if not exists io_credit_accounts_created_by_idx
  on public.io_credit_accounts (created_by)
  where created_by is not null;

create index if not exists lesson_progress_lesson_idx
  on public.lesson_progress (lesson_id);

create index if not exists member_location_shares_country_idx
  on public.member_location_shares (country_code);
create index if not exists member_location_shares_region_country_idx
  on public.member_location_shares (region_id, country_code)
  where region_id is not null;
create index if not exists member_location_shares_place_country_idx
  on public.member_location_shares (place_id, country_code)
  where place_id is not null;

create index if not exists mentor_sessions_expert_idx
  on public.mentor_sessions (expert_id);
create index if not exists mission_updates_mission_idx
  on public.mission_updates (mission_id);
create index if not exists quiz_attempts_quiz_idx
  on public.quiz_attempts (quiz_id);

create index if not exists spotlights_featured_by_idx
  on public.spotlights (featured_by)
  where featured_by is not null;
create index if not exists spotlights_user_idx
  on public.spotlights (user_id);

create index if not exists stories_author_idx
  on public.stories (author_id);
create index if not exists stories_chapter_idx
  on public.stories (chapter_id)
  where chapter_id is not null;
create index if not exists stories_mission_idx
  on public.stories (mission_id)
  where mission_id is not null;

create index if not exists vouch_events_code_idx
  on public.vouch_events (code_id)
  where code_id is not null;

-- Both tables already have NULLS NOT DISTINCT business-key uniqueness. A
-- stable surrogate key gives replication, audit and client caches a simple row
-- identity without weakening those business constraints.
alter table public.conversation_mentions
  add column if not exists id uuid default gen_random_uuid();
update public.conversation_mentions
set id = gen_random_uuid()
where id is null;
alter table public.conversation_mentions
  alter column id set not null;
alter table public.conversation_mentions
  add constraint conversation_mentions_pkey primary key (id);

alter table public.conversation_notification_preferences
  add column if not exists id uuid default gen_random_uuid();
update public.conversation_notification_preferences
set id = gen_random_uuid()
where id is null;
alter table public.conversation_notification_preferences
  alter column id set not null;
alter table public.conversation_notification_preferences
  add constraint conversation_notification_preferences_pkey primary key (id);
