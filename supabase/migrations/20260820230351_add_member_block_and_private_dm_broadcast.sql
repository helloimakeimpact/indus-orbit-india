-- Caller-owned member blocking plus authorized private Broadcast for direct
-- messages. Blocking is symmetric for message access: either participant can
-- stop new sends, history reads, read receipts and future broadcasts. The
-- blocked member is not given a browser-readable list of who blocked them.

create table public.member_blocks (
  blocker_id uuid not null references public.profiles(user_id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(user_id) on delete cascade,
  reason_category text not null default 'member_choice'
    check (reason_category in ('member_choice', 'safety', 'spam', 'harassment', 'privacy')),
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  constraint member_blocks_not_self_check check (blocker_id <> blocked_user_id)
);

create index member_blocks_blocked_user_idx
  on public.member_blocks (blocked_user_id, blocker_id);

alter table public.member_blocks enable row level security;

revoke all on table public.member_blocks from public, anon, authenticated;
grant select on table public.member_blocks to authenticated;
grant select, insert, update, delete on table public.member_blocks to service_role;

create policy member_blocks_owner_select
on public.member_blocks
for select
to authenticated
using (blocker_id = (select auth.uid()));

create or replace function private.has_member_block(
  _first_user_id uuid,
  _second_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.member_blocks as block
    where (block.blocker_id = _first_user_id and block.blocked_user_id = _second_user_id)
       or (block.blocker_id = _second_user_id and block.blocked_user_id = _first_user_id)
  );
$function$;

revoke all on function private.has_member_block(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.has_member_block(uuid, uuid)
  to authenticated, service_role;

create or replace function public.block_my_member(
  _blocked_user_id uuid,
  _reason_category text default 'member_choice'
)
returns public.member_blocks
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  block_row public.member_blocks%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if _blocked_user_id is null or _blocked_user_id = caller_id then
    raise exception 'Choose another member to block' using errcode = '22023';
  end if;
  if _reason_category not in ('member_choice', 'safety', 'spam', 'harassment', 'privacy') then
    raise exception 'Choose a valid block reason category' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles as profile where profile.user_id = _blocked_user_id
  ) then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member-block:' || caller_id::text, 0)
  );

  insert into public.member_blocks (blocker_id, blocked_user_id, reason_category)
  values (caller_id, _blocked_user_id, _reason_category)
  on conflict (blocker_id, blocked_user_id) do update
  set reason_category = excluded.reason_category
  returning * into block_row;

  insert into public.audit_log (actor_id, action, target_type, target_id)
  values (caller_id, 'member.blocked', 'profile', _blocked_user_id);

  return block_row;
end;
$function$;

create or replace function public.unblock_my_member(_blocked_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  removed boolean;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if _blocked_user_id is null or _blocked_user_id = caller_id then
    raise exception 'Choose another member to unblock' using errcode = '22023';
  end if;

  delete from public.member_blocks
  where blocker_id = caller_id and blocked_user_id = _blocked_user_id;
  removed := found;

  if removed then
    insert into public.audit_log (actor_id, action, target_type, target_id)
    values (caller_id, 'member.unblocked', 'profile', _blocked_user_id);
  end if;

  return removed;
end;
$function$;

revoke all on function public.block_my_member(uuid, text) from public, anon;
revoke all on function public.unblock_my_member(uuid) from public, anon;
grant execute on function public.block_my_member(uuid, text) to authenticated;
grant execute on function public.unblock_my_member(uuid) to authenticated;

drop policy if exists "Members view own direct messages" on public.direct_messages;
create policy "Members view unblocked direct messages"
on public.direct_messages
for select
to authenticated
using (
  (
    (select auth.uid()) = sender_id
    or (select auth.uid()) = recipient_id
  )
  and not private.has_member_block(sender_id, recipient_id)
);

create or replace function public.send_my_direct_message(
  _recipient_id uuid,
  _content text,
  _client_request_id uuid
)
returns public.direct_messages
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  message_content text := pg_catalog.btrim(_content);
  existing_message public.direct_messages%rowtype;
  created_message public.direct_messages%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if _recipient_id is null or _client_request_id is null then
    raise exception 'Recipient and client request ID are required' using errcode = '22004';
  end if;
  if _recipient_id = actor_id then
    raise exception 'You cannot message yourself' using errcode = '22023';
  end if;
  if message_content is null or pg_catalog.char_length(message_content) = 0 then
    raise exception 'Message cannot be empty' using errcode = '22023';
  end if;
  if pg_catalog.char_length(message_content) > 4000 then
    raise exception 'Message cannot exceed 4,000 characters' using errcode = '22023';
  end if;
  if private.has_member_block(actor_id, _recipient_id) then
    raise exception 'Messaging is unavailable for this member' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('direct-message:' || actor_id::text, 0)
  );

  select message.* into existing_message
  from public.direct_messages as message
  where message.sender_id = actor_id
    and message.client_request_id = _client_request_id;

  if found then
    if existing_message.recipient_id <> _recipient_id
      or existing_message.content <> message_content then
      raise exception 'Client request ID was already used for another message'
        using errcode = '22023';
    end if;
    return existing_message;
  end if;

  if public.is_suspended(actor_id) or public.is_suspended(_recipient_id) then
    raise exception 'Messaging is unavailable for this member' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.connection_requests as connection
    where connection.status = 'accepted'
      and (
        (connection.sender_id = actor_id and connection.recipient_id = _recipient_id)
        or (connection.sender_id = _recipient_id and connection.recipient_id = actor_id)
      )
  ) then
    raise exception 'You can only message connected members' using errcode = '42501';
  end if;
  if (
    select pg_catalog.count(*)
    from public.direct_messages as recent
    where recent.sender_id = actor_id
      and recent.created_at >= pg_catalog.statement_timestamp() - interval '1 minute'
  ) >= 30 then
    raise exception 'Message rate limit reached; please wait a minute' using errcode = 'P0001';
  end if;

  insert into public.direct_messages (sender_id, recipient_id, content, client_request_id)
  values (actor_id, _recipient_id, message_content, _client_request_id)
  returning * into created_message;

  insert into public.notifications (user_id, type, message, link)
  values (
    _recipient_id,
    'direct_message',
    'You have a new message.',
    '/app/messages?user=' || actor_id::text
  );

  return created_message;
end;
$function$;

create or replace function public.mark_my_direct_conversation_read(_other_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  updated_count integer;
begin
  if actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if _other_user_id is null or _other_user_id = actor_id then
    raise exception 'Another member is required' using errcode = '22023';
  end if;
  if public.is_suspended(actor_id) or private.has_member_block(actor_id, _other_user_id) then
    raise exception 'Messaging is unavailable for this member' using errcode = '42501';
  end if;

  update public.direct_messages as message
  set read_at = pg_catalog.statement_timestamp()
  where message.recipient_id = actor_id
    and message.sender_id = _other_user_id
    and message.read_at is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$function$;

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
  if private.has_member_block(caller_id, _other_user_id) then
    raise exception 'Messaging is unavailable for this member' using errcode = '42501';
  end if;
  if bounded_limit < 1 or bounded_limit > 100 then
    raise exception 'Conversation page limit must be between 1 and 100' using errcode = '22023';
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
      or (message.sender_id = _other_user_id and message.recipient_id = caller_id)
    )
    and (
      _before_created_at is null
      or (message.created_at, message.id) < (_before_created_at, _before_id)
    )
  order by message.created_at desc, message.id desc
  limit bounded_limit + 1;
end;
$function$;

create or replace function private.can_receive_dm_broadcast(_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  first_user_id uuid;
  second_user_id uuid;
begin
  if caller_id is null or _topic !~ '^dm:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  first_user_id := pg_catalog.split_part(_topic, ':', 2)::uuid;
  second_user_id := pg_catalog.split_part(_topic, ':', 3)::uuid;
  return caller_id in (first_user_id, second_user_id)
    and not private.has_member_block(first_user_id, second_user_id);
exception when invalid_text_representation then
  return false;
end;
$function$;

revoke all on function private.can_receive_dm_broadcast(text)
  from public, anon, authenticated, service_role;
grant execute on function private.can_receive_dm_broadcast(text)
  to authenticated, service_role;

create policy "Members receive private direct-message broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and private.can_receive_dm_broadcast((select realtime.topic()))
);

create or replace function private.broadcast_direct_message_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  sender uuid := coalesce(new.sender_id, old.sender_id);
  recipient uuid := coalesce(new.recipient_id, old.recipient_id);
  topic text;
begin
  if private.has_member_block(sender, recipient) then
    return null;
  end if;
  topic := 'dm:' || least(sender::text, recipient::text) || ':' || greatest(sender::text, recipient::text);
  perform realtime.broadcast_changes(
    topic,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$function$;

revoke all on function private.broadcast_direct_message_change()
  from public, anon, authenticated, service_role;

drop trigger if exists broadcast_direct_message_change on public.direct_messages;
create trigger broadcast_direct_message_change
after insert or update or delete on public.direct_messages
for each row execute function private.broadcast_direct_message_change();

comment on table public.member_blocks is
  'Caller-owned member block state. Browser reads reveal only blocks created by the caller; either direction disables direct messaging.';
comment on function public.block_my_member(uuid, text) is
  'Idempotently blocks another member and immediately closes database messaging access in both directions.';
comment on function private.broadcast_direct_message_change() is
  'Sends direct-message changes only to the deterministic private participant topic and suppresses blocked pairs.';
