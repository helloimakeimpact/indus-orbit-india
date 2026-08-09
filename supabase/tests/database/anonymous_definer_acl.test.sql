begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(24);

-- Every hosted function in this list must deny anonymous execution. Two
-- lead-removal RPCs are hosted-history additions that may be absent from a
-- clean recovered replay; the forward migration contains them when present.
select ok(
  not coalesce(
    has_function_privilege(
      'anon',
      pg_catalog.to_regprocedure(signature),
      'EXECUTE'
    ),
    false
  ),
  signature || ' denies anonymous execution'
)
from (
  values
    ('public.admin_resolve_vouch_request(uuid,boolean,text)'),
    ('public.approve_chapter_proposal(uuid)'),
    ('public.create_my_connection_request(uuid,text,text,uuid)'),
    ('public.handle_new_user()'),
    ('public.lead_approve_event(uuid)'),
    ('public.lead_approve_story(uuid)'),
    ('public.lead_reject_event(uuid,text)'),
    ('public.lead_reject_story(uuid,text)'),
    ('public.lead_remove_chapter_member(uuid,uuid)'),
    ('public.lead_remove_mission_member(uuid,uuid)')
    ,('public.post_my_mission_update(uuid,text,uuid)')
    ,('public.reject_chapter_proposal(uuid)')
    ,('public.request_my_mentor_session(uuid,text,integer,uuid)')
    ,('public.request_my_vouch(text,uuid,uuid)')
    ,('public.respond_to_my_connection_request(uuid,text)')
    ,('public.transition_my_mentor_session(uuid,text,text,timestamptz)')
) as privileged_functions(signature);

-- The seven browser-facing RPCs retain their authenticated contract when the
-- function exists in the replayed history.
select ok(
  pg_catalog.to_regprocedure(signature) is null
    or has_function_privilege(
      'authenticated',
      pg_catalog.to_regprocedure(signature),
      'EXECUTE'
    ),
  signature || ' retains authenticated execution when present'
)
from (
  values
    ('public.admin_resolve_vouch_request(uuid,boolean,text)'),
    ('public.lead_approve_event(uuid)'),
    ('public.lead_approve_story(uuid)'),
    ('public.lead_reject_event(uuid,text)'),
    ('public.lead_reject_story(uuid,text)'),
    ('public.lead_remove_chapter_member(uuid,uuid)'),
    ('public.lead_remove_mission_member(uuid,uuid)')
) as authenticated_functions(signature);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.handle_new_user()',
    'EXECUTE'
  ),
  'auth trigger helper denies direct authenticated execution'
);

select * from finish();

rollback;
