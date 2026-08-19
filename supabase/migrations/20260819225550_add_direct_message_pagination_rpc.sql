-- Bound direct-conversation reads behind a caller-owned keyset cursor.
-- The timestamp matches the hosted migration ledger created through the
-- connected Supabase project API.
-- Direct table SELECT remains for the current Postgres Changes proof channel;
-- the application history path uses this RPC so it never downloads an
-- unbounded conversation.

create or replace function public.list_my_direct_conversation(
  _other_user_id uuid,
  _before_created_at timestamptz default null,
  _before_id uuid default null,
  _limit integer default 50
)
returns table (
  message_id uuid,
  sender_id uuid,
  recipient_id uuid,
  content text,
  client_request_id uuid,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  bounded_limit integer := coalesce(_limit, 50);
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if _other_user_id is null or _other_user_id = caller_id then
    raise exception 'Another member is required' using errcode = '22023';
  end if;
  if bounded_limit < 1 or bounded_limit > 100 then
    raise exception 'Conversation page limit must be between 1 and 100'
      using errcode = '22023';
  end if;
  if (_before_created_at is null) <> (_before_id is null) then
    raise exception 'Conversation cursor must include timestamp and message ID'
      using errcode = '22023';
  end if;

  return query
  select
    message.id,
    message.sender_id,
    message.recipient_id,
    message.content,
    message.client_request_id,
    message.created_at,
    message.read_at
  from public.direct_messages as message
  where (
      (message.sender_id = caller_id and message.recipient_id = _other_user_id)
      or
      (message.sender_id = _other_user_id and message.recipient_id = caller_id)
    )
    and (
      _before_created_at is null
      or (message.created_at, message.id) < (_before_created_at, _before_id)
    )
  order by message.created_at desc, message.id desc
  limit bounded_limit + 1;
end;
$function$;

revoke all on function public.list_my_direct_conversation(uuid, timestamptz, uuid, integer)
  from public, anon;
grant execute on function public.list_my_direct_conversation(uuid, timestamptz, uuid, integer)
  to authenticated, service_role;

comment on function public.list_my_direct_conversation(uuid, timestamptz, uuid, integer) is
  'Caller-bound keyset-paginated direct-message history. Returns at most limit plus one row so the client can detect an earlier page.';
