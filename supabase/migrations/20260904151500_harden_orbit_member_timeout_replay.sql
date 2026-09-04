-- Serialize the same actor/request key before the timeout mutation checks for
-- an existing command. This closes the narrow concurrent-replay race while
-- keeping the released command signature stable.

alter function public.set_managed_conversation_member_timeout(
  uuid, uuid, integer, text, bigint, uuid
) rename to set_managed_conversation_member_timeout_serialized;

revoke all on function public.set_managed_conversation_member_timeout_serialized(
  uuid, uuid, integer, text, bigint, uuid
) from public, anon, authenticated, service_role;

create function public.set_managed_conversation_member_timeout(
  _space_id uuid,
  _target_user_id uuid,
  _duration_seconds integer,
  _reason text,
  _expected_membership_version bigint,
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or _client_request_id is null then
    raise exception 'Member timeout command is invalid' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'space-timeout-command:' || (select auth.uid())::text || ':' || _client_request_id::text,
      0
    )
  );

  return public.set_managed_conversation_member_timeout_serialized(
    _space_id,
    _target_user_id,
    _duration_seconds,
    _reason,
    _expected_membership_version,
    _client_request_id
  );
end;
$function$;

revoke all on function public.set_managed_conversation_member_timeout(
  uuid, uuid, integer, text, bigint, uuid
) from public, anon;
grant execute on function public.set_managed_conversation_member_timeout(
  uuid, uuid, integer, text, bigint, uuid
) to authenticated, service_role;

comment on function public.set_managed_conversation_member_timeout_serialized(
  uuid, uuid, integer, text, bigint, uuid
) is 'Internal timeout mutation; callable only through the same-request serialization wrapper.';
comment on function public.set_managed_conversation_member_timeout(
  uuid, uuid, integer, text, bigint, uuid
) is 'Serializes actor/request replay before applying the bounded, hierarchy-aware and audited Space timeout mutation.';
