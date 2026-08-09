-- Read-only verification contract for the Indus Orbit demo Supabase project.
--
-- Run only against the linked demo project after an approved migration push:
--   supabase db query --linked --file supabase/verification/demo_release_contract.sql
--
-- The result contains booleans and aggregate counts only. It deliberately
-- returns no member, message, prompt, provider-secret or audit-record data.

with release_versions(version) as (
  values
    ('20260801152819'),
    ('20260801152820'),
    ('20260801153734'),
    ('20260801155642'),
    ('20260801195033'),
    ('20260801195108'),
    ('20260808190000'),
    ('20260809132035'),
    ('20260809142000'),
    ('20260809150000'),
    ('20260809152439'),
    ('20260809174030'),
    ('20260809182509')
),
checks(check_name, passed, detail) as (
  select
    'release migrations recorded',
    count(*) = 13,
    format('%s of 13 versions present', count(*))
  from supabase_migrations.schema_migrations as migration
  join release_versions as expected on expected.version = migration.version

  union all

  select
    'release relations exist',
    bool_and(relation_name is not null),
    format('%s of 11 relations present', count(relation_name))
  from (
    values
      (to_regclass('private.community_onboarding_state')),
      (to_regclass('private.product_measurement_preferences')),
      (to_regclass('private.product_measurement_events')),
      (to_regclass('private.product_client_operations')),
      (to_regclass('public.geo_countries')),
      (to_regclass('public.geo_regions')),
      (to_regclass('public.geo_places')),
      (to_regclass('private.member_location_preferences')),
      (to_regclass('public.member_location_shares')),
      (to_regclass('private.member_location_consent_events')),
      (to_regclass('private.email_delivery_outbox'))
  ) as relations(relation_name)

  union all

  select
    'email outbox recipient lookup is indexed',
    to_regclass('private.email_delivery_outbox_recipient_user_idx') is not null,
    'recipient foreign key has a covering index'

  union all

  select
    'anonymous SECURITY DEFINER surface closed',
    not has_function_privilege(
      'anon',
      'public.admin_resolve_vouch_request(uuid,boolean,text)',
      'EXECUTE'
    )
      and not has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
      and not has_function_privilege(
        'anon',
        'public.lead_approve_event(uuid)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.lead_approve_story(uuid)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.lead_reject_event(uuid,text)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.lead_reject_story(uuid,text)',
        'EXECUTE'
      )
      and not coalesce(
        has_function_privilege(
          'anon',
          to_regprocedure('public.lead_remove_chapter_member(uuid,uuid)'),
          'EXECUTE'
        ),
        false
      )
      and not coalesce(
        has_function_privilege(
          'anon',
          to_regprocedure('public.lead_remove_mission_member(uuid,uuid)'),
          'EXECUTE'
        ),
        false
      )
      and not has_function_privilege(
        'anon',
        'public.create_my_connection_request(uuid,text,text,uuid)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.respond_to_my_connection_request(uuid,text)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.request_my_mentor_session(uuid,text,integer,uuid)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.transition_my_mentor_session(uuid,text,text,timestamptz)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.post_my_mission_update(uuid,text,uuid)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.request_my_vouch(text,uuid,uuid)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.approve_chapter_proposal(uuid)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.reject_chapter_proposal(uuid)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.admin_io_evidence_summary()',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.admin_io_recent_route_receipts(timestamptz,uuid,integer)',
        'EXECUTE'
      ),
    '18 privileged functions deny anonymous execution'

  union all

  select
    'caller-bound RPCs exist',
    bool_and(function_name is not null),
    format('%s of 19 functions present', count(function_name))
  from (
    values
      (to_regprocedure('public.get_my_product_access()')),
      (to_regprocedure('public.start_my_community_onboarding(integer,uuid)')),
      (to_regprocedure('public.complete_my_community_onboarding(integer,uuid)')),
      (to_regprocedure('public.set_my_measurement_consent(boolean,uuid)')),
      (to_regprocedure('public.record_my_product_event(text,text,uuid)')),
      (to_regprocedure('public.get_my_location_preferences()')),
      (to_regprocedure('public.withdraw_my_location_consent(text,uuid)')),
      (to_regprocedure('public.send_my_direct_message(uuid,text,uuid)')),
      (to_regprocedure('public.mark_my_direct_conversation_read(uuid)')),
      (to_regprocedure('public.create_my_connection_request(uuid,text,text,uuid)')),
      (to_regprocedure('public.respond_to_my_connection_request(uuid,text)')),
      (to_regprocedure('public.request_my_mentor_session(uuid,text,integer,uuid)')),
      (to_regprocedure('public.transition_my_mentor_session(uuid,text,text,timestamptz)')),
      (to_regprocedure('public.post_my_mission_update(uuid,text,uuid)')),
      (to_regprocedure('public.request_my_vouch(text,uuid,uuid)')),
      (to_regprocedure('public.approve_chapter_proposal(uuid)')),
      (to_regprocedure('public.reject_chapter_proposal(uuid)')),
      (to_regprocedure('public.admin_io_evidence_summary()')),
      (to_regprocedure('public.admin_io_recent_route_receipts(timestamptz,uuid,integer)'))
  ) as functions(function_name)

  union all

  select
    'I/O evidence schema released',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'io_route_receipts'
        and column_name = 'selected_currency_code'
    )
      and to_regclass('public.io_route_receipts_global_time_idx') is not null
      and to_regclass(
        'private.io_provider_conformance_runs_endpoint_capability_idx'
      ) is not null
      and has_function_privilege(
        'authenticated',
        'public.admin_io_evidence_summary()',
        'EXECUTE'
      )
      and has_function_privilege(
        'authenticated',
        'public.admin_io_recent_route_receipts(timestamptz,uuid,integer)',
        'EXECUTE'
      ),
    'currency/receipt/conformance indexes present; authenticated capability-checked RPC execution=true'

  union all

  select
    'ISO country catalogue complete',
    count(*) = 249,
    format('%s active countries', count(*))
  from public.geo_countries
  where active

  union all

  select
    'existing community members backfilled',
    count(*) = 0,
    format('%s segmented profiles missing completed state', count(*))
  from public.profiles as profile
  left join private.community_onboarding_state as state
    on state.user_id = profile.user_id
    and state.status = 'completed'
  where profile.orbit_segment is not null
    and state.user_id is null

  union all

  select
    'legacy location remains unconsented',
    count(*) = 0,
    format('%s invalid legacy preference rows', count(*))
  from private.member_location_preferences as preference
  where preference.source = 'legacy_unconfirmed'
    and (
      preference.consented_at is not null
      or preference.consent_version is not null
      or preference.use_for_scheduling
      or preference.use_for_recommendations
    )

  union all

  select
    'new private tables use RLS',
    count(*) = 7 and bool_and(class.relrowsecurity),
    format('%s of 7 relations have RLS enabled', count(*) filter (where class.relrowsecurity))
  from pg_catalog.pg_class as class
  join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
  where (namespace.nspname, class.relname) in (
    ('private', 'community_onboarding_state'),
    ('private', 'product_measurement_preferences'),
    ('private', 'product_measurement_events'),
    ('private', 'product_client_operations'),
    ('private', 'member_location_preferences'),
    ('private', 'member_location_consent_events'),
    ('private', 'member_location_operations')
  )

  union all

  select
    'private product and location rows are not browser-readable',
    not has_table_privilege(
      'authenticated',
      'private.community_onboarding_state',
      'SELECT'
    )
      and not has_table_privilege(
        'authenticated',
        'private.product_measurement_preferences',
        'SELECT'
      )
      and not has_table_privilege(
        'authenticated',
        'private.member_location_preferences',
        'SELECT'
      ),
    'authenticated has no direct SELECT on private state'

  union all

  select
    'product RPCs require authentication',
    not has_function_privilege(
      'anon',
      'public.get_my_product_access()',
      'EXECUTE'
    )
      and has_function_privilege(
        'authenticated',
        'public.get_my_product_access()',
        'EXECUTE'
      ),
    'anon=false, authenticated=true'

  union all

  select
    'location RPCs require authentication',
    not has_function_privilege(
      'anon',
      'public.get_my_location_preferences()',
      'EXECUTE'
    )
      and has_function_privilege(
        'authenticated',
        'public.get_my_location_preferences()',
        'EXECUTE'
      ),
    'anon=false, authenticated=true'

  union all

  select
    'direct messages use RPC-only writes',
    has_table_privilege('authenticated', 'public.direct_messages', 'SELECT')
      and not has_table_privilege('authenticated', 'public.direct_messages', 'INSERT')
      and not has_table_privilege('authenticated', 'public.direct_messages', 'UPDATE')
      and not has_table_privilege('authenticated', 'public.direct_messages', 'DELETE')
      and not has_function_privilege(
        'anon',
        'public.send_my_direct_message(uuid,text,uuid)',
        'EXECUTE'
      )
      and has_function_privilege(
        'authenticated',
        'public.send_my_direct_message(uuid,text,uuid)',
        'EXECUTE'
      ),
    'browser reads own rows; authenticated writes through caller-bound RPCs'

  union all

  select
    'direct-message write policies removed',
    count(*) = 0,
    format('%s direct write policies remain', count(*))
  from pg_catalog.pg_policies as policy
  where policy.schemaname = 'public'
    and policy.tablename = 'direct_messages'
    and policy.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')

  union all

  select
    'notification table privileges contained',
    has_table_privilege('authenticated', 'public.notifications', 'SELECT')
      and has_column_privilege(
        'authenticated',
        'public.notifications',
        'is_read',
        'UPDATE'
      )
      and not has_column_privilege(
        'authenticated',
        'public.notifications',
        'message',
        'UPDATE'
      )
      and not has_table_privilege('authenticated', 'public.notifications', 'INSERT')
      and not has_table_privilege('authenticated', 'public.notifications', 'DELETE'),
    'authenticated can read and update only is_read'

  union all

  select
    'product events use trusted RPC-only writes',
    has_table_privilege('authenticated', 'public.connection_requests', 'SELECT')
      and not has_table_privilege('authenticated', 'public.connection_requests', 'INSERT')
      and not has_table_privilege('authenticated', 'public.connection_requests', 'UPDATE')
      and has_table_privilege('authenticated', 'public.mentor_sessions', 'SELECT')
      and not has_table_privilege('authenticated', 'public.mentor_sessions', 'INSERT')
      and not has_table_privilege('authenticated', 'public.mentor_sessions', 'UPDATE')
      and not has_table_privilege('authenticated', 'public.mission_updates', 'INSERT')
      and not has_table_privilege('authenticated', 'public.vouch_requests', 'INSERT')
      and not has_table_privilege('authenticated', 'public.vouch_requests', 'UPDATE')
      and not has_table_privilege('authenticated', 'public.chapter_proposals', 'UPDATE')
      and not has_function_privilege(
        'authenticated',
        'public.send_notification(uuid,text,text,text)',
        'EXECUTE'
      ),
    'browser retains scoped reads; event writes and notifications are server-derived'

  union all

  select
    'email outbox is private and service-leased',
    (
      select class.relrowsecurity
      from pg_catalog.pg_class as class
      where class.oid = 'private.email_delivery_outbox'::regclass
    )
      and not has_table_privilege(
        'authenticated',
        'private.email_delivery_outbox',
        'SELECT'
      )
      and not has_function_privilege(
        'authenticated',
        'public.claim_email_delivery_batch(integer)',
        'EXECUTE'
      )
      and has_function_privilege(
        'service_role',
        'public.claim_email_delivery_batch(integer)',
        'EXECUTE'
      ),
    'RLS=true; browser=false; service worker claim=true'

  union all

  select
    'Loops browser surface retired',
    not has_table_privilege('anon', 'public.loops', 'SELECT')
      and not has_table_privilege('authenticated', 'public.loops', 'SELECT')
      and has_table_privilege('service_role', 'public.loops', 'SELECT'),
    'browser=false, service archive read=true'

  union all

  select
    'provider runtime remains disabled',
    count(*) filter (where routing_enabled) = 0,
    format(
      '%s enabled of %s runtime controls',
      count(*) filter (where routing_enabled),
      count(*)
    )
  from private.io_provider_runtime_controls

  union all

  select
    'provider traffic evidence remains empty',
    receipt_count = 0 and attempt_count = 0,
    format('%s route receipts; %s provider attempts', receipt_count, attempt_count)
  from (
    select
      (select count(*) from public.io_route_receipts) as receipt_count,
      (select count(*) from public.io_provider_attempts) as attempt_count
  ) as traffic
)
select check_name, passed, detail
from checks
order by check_name;
