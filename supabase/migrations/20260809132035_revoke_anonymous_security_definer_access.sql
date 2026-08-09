-- Close inherited anonymous execution on privileged admin, lead and trigger
-- helpers reported by the hosted Security Advisor.
--
-- Two lead-removal functions exist in the hosted ledger but not in the
-- recovered local source history. Resolve every signature conditionally so a
-- fresh local replay remains deterministic while the hosted functions are
-- still contained. Authenticated callers retain the seven member/admin RPCs;
-- the auth trigger helper has no Data API execution grant.

do $migration$
declare
  function_signature text;
  function_reference regprocedure;
begin
  foreach function_signature in array array[
    'public.admin_resolve_vouch_request(uuid,boolean,text)',
    'public.handle_new_user()',
    'public.lead_approve_event(uuid)',
    'public.lead_approve_story(uuid)',
    'public.lead_reject_event(uuid,text)',
    'public.lead_reject_story(uuid,text)',
    'public.lead_remove_chapter_member(uuid,uuid)',
    'public.lead_remove_mission_member(uuid,uuid)'
  ]
  loop
    function_reference := pg_catalog.to_regprocedure(function_signature);

    if function_reference is null then
      raise notice 'Function % is absent; no privilege change required.',
        function_signature;
      continue;
    end if;

    execute pg_catalog.format(
      'revoke execute on function %s from public, anon, authenticated',
      function_reference
    );

    if function_signature <> 'public.handle_new_user()' then
      execute pg_catalog.format(
        'grant execute on function %s to authenticated',
        function_reference
      );
    end if;
  end loop;
end;
$migration$;

comment on function public.handle_new_user() is
  'Auth trigger helper. Direct Data API execution is revoked from public, anon and authenticated roles.';
