-- Lightweight DM contracts retain the existing canonical message history.
-- New browser calls bind the expected account; no missing-RPC write fallback.
-- No new persistent personal-data table or structured-Spaces activation.

create index direct_messages_unread_pair_idx
  on public.direct_messages(recipient_id,sender_id) where read_at is null;

-- This predicate also covers externally soft-deleted Auth identities that
-- do not yet have an application closure record. It protects raw table reads.
create function private.dm_pair_available(_first uuid,_second uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select _first is not null and _second is not null and _first<>_second
    and not public.is_suspended(_first) and not public.is_suspended(_second)
    and not exists(select 1 from private.account_closures where user_id in (_first,_second))
    and (select count(*) from auth.users where id in (_first,_second) and deleted_at is null)=2;
$$;
revoke all on function private.dm_pair_available(uuid,uuid) from public,anon,authenticated;
grant execute on function private.dm_pair_available(uuid,uuid) to authenticated;

create function private.require_dm_actor(_expected_user_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null or actor is distinct from _expected_user_id then
    raise exception using errcode='42501',message='Your account changed. Reopen Messages.';
  end if;
  if not private.account_access_open() or public.is_suspended(actor) or not exists(select 1 from auth.users where id=actor and deleted_at is null) then
    raise exception using errcode='42501',message='Messaging is unavailable for this account';
  end if;
  return actor;
end;
$$;
revoke all on function private.require_dm_actor(uuid) from public,anon,authenticated;

create function private.require_dm_pair(_expected_user_id uuid,_other_user_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_dm_actor(_expected_user_id);
begin
  if _other_user_id is null or _other_user_id=actor then
    raise exception using errcode='22023',message='Another member is required';
  end if;
  if public.is_suspended(_other_user_id) or exists(select 1 from private.account_closures where user_id=_other_user_id) or private.has_member_block(actor,_other_user_id)
    or not exists(select 1 from auth.users where id=_other_user_id and deleted_at is null) then
    raise exception using errcode='42501',message='Messaging is unavailable for this member';
  end if;
  return actor;
end;
$$;
revoke all on function private.require_dm_pair(uuid,uuid) from public,anon,authenticated;

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
  perform 1 from auth.users where id in (actor_id,_recipient_id) order by id for key share;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'dm-pair:'||least(actor_id::text,_recipient_id::text)||':'||greatest(actor_id::text,_recipient_id::text),0));
  perform private.require_dm_pair(actor_id,_recipient_id);
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

  insert into public.direct_messages (sender_id, recipient_id, content, client_request_id, created_at)
  values (actor_id, _recipient_id, message_content, _client_request_id,
    greatest(pg_catalog.clock_timestamp(),coalesce((select max(m.created_at)+interval '1 microsecond'
      from public.direct_messages m where (m.sender_id=actor_id and m.recipient_id=_recipient_id)
      or (m.sender_id=_recipient_id and m.recipient_id=actor_id)),'-infinity'::timestamptz)))
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


create function private.send_my_direct_message_v2(_expected_user_id uuid,_recipient_id uuid,_content text,_client_request_id uuid)
returns public.direct_messages language plpgsql security definer set search_path='' as $$
begin
  perform private.require_dm_pair(_expected_user_id,_recipient_id);
  return public.send_my_direct_message(_recipient_id,_content,_client_request_id);
end;
$$;

create function private.list_my_direct_messages_v2(
  _expected_user_id uuid,_other_user_id uuid,_cursor_created_at timestamptz,_cursor_id uuid,
  _forward boolean,_limit integer default 50)
returns setof public.direct_messages language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_dm_pair(_expected_user_id,_other_user_id);
begin
  if _limit is null or _limit<1 or _limit>100 then
    raise exception using errcode='22023',message='Conversation page limit must be between 1 and 100';
  end if;
  if (_cursor_created_at is null)<>(_cursor_id is null) or (_forward and _cursor_id is null) then
    raise exception using errcode='22023',message='Conversation cursor must include timestamp and message ID';
  end if;
  return query select m.* from public.direct_messages m
    where ((m.sender_id=actor and m.recipient_id=_other_user_id) or (m.recipient_id=actor and m.sender_id=_other_user_id))
    and (_cursor_id is null or (_forward and (m.created_at,m.id)>(_cursor_created_at,_cursor_id))
      or (not _forward and (m.created_at,m.id)<(_cursor_created_at,_cursor_id)))
    order by case when _forward then m.created_at end asc,case when _forward then m.id end asc,
      case when not _forward then m.created_at end desc,case when not _forward then m.id end desc
    limit _limit+1;
end;
$$;

create function private.mark_my_direct_conversation_read_v2(
  _expected_user_id uuid,_other_user_id uuid,_through_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid; updated_count integer; through_created_at timestamptz;
begin
  perform 1 from auth.users where id in (auth.uid(),_other_user_id) order by id for key share;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'dm-pair:'||least(auth.uid()::text,_other_user_id::text)||':'||greatest(auth.uid()::text,_other_user_id::text),0));
  actor:=private.require_dm_pair(_expected_user_id,_other_user_id);
  select m.created_at into through_created_at from public.direct_messages m where m.id=_through_id
    and ((m.sender_id=actor and m.recipient_id=_other_user_id) or (m.sender_id=_other_user_id and m.recipient_id=actor));
  if _through_id is null or through_created_at is null then
    raise exception using errcode='22023',message='Choose a visible message from this conversation';
  end if;
  update public.direct_messages m set read_at=pg_catalog.statement_timestamp()
    where m.recipient_id=actor and m.sender_id=_other_user_id and m.read_at is null
      and (m.created_at,m.id)<=(through_created_at,_through_id);
  get diagnostics updated_count=row_count;
  return updated_count;
end;
$$;

create function private.list_my_direct_inbox_v2(
  _expected_user_id uuid,_before_created_at timestamptz default null,_before_id uuid default null,
  _before_peer_id uuid default null,_limit integer default 50)
returns table(user_id uuid,display_name text,avatar_url text,headline text,last_message_id uuid,
  last_message_content text,last_message_at timestamptz,last_sender_id uuid,unread_count bigint)
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_dm_actor(_expected_user_id);
begin
  if _limit is null or _limit<1 or _limit>100 then raise exception using errcode='22023',message='Inbox page limit must be between 1 and 100'; end if;
  if ((_before_created_at is null)::integer+(_before_id is null)::integer+(_before_peer_id is null)::integer) not in (0,3) then
    raise exception using errcode='22023',message='Inbox cursor is incomplete';
  end if;
  return query with peers as (
    select m.recipient_id peer from public.direct_messages m where m.sender_id=actor
    union select m.sender_id from public.direct_messages m where m.recipient_id=actor
  ) select p.user_id,p.display_name,p.avatar_url,p.headline,recent.id,recent.content,recent.created_at,recent.sender_id,
    (select count(*) from public.direct_messages unread where unread.recipient_id=actor and unread.sender_id=p.user_id and unread.read_at is null)
  from peers join public.profiles p on p.user_id=peers.peer
  join auth.users u on u.id=p.user_id and u.deleted_at is null
  cross join lateral (select m.* from public.direct_messages m where (m.sender_id=actor and m.recipient_id=p.user_id)
      or (m.recipient_id=actor and m.sender_id=p.user_id) order by m.created_at desc,m.id desc limit 1) recent
  where not private.has_member_block(actor,p.user_id) and not public.is_suspended(p.user_id)
    and (_before_id is null or (recent.created_at,recent.id,p.user_id)<(_before_created_at,_before_id,_before_peer_id))
  order by recent.created_at desc,recent.id desc,p.user_id desc limit _limit+1;
end;
$$;

create function private.list_my_direct_contacts_v2(
  _expected_user_id uuid,_search text default '',_after_display_name text default null,
  _after_user_id uuid default null,_limit integer default 50,_only_user_id uuid default null)
returns table(user_id uuid,display_name text,avatar_url text,headline text)
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_dm_actor(_expected_user_id); query text:=coalesce(pg_catalog.btrim(_search),'');
begin
  if char_length(query)>80 or _limit is null or _limit<1 or _limit>100 then
    raise exception using errcode='22023',message='Choose a shorter search and valid contact page limit';
  end if;
  if (_after_display_name is null)<>(_after_user_id is null) then raise exception using errcode='22023',message='Contact cursor is incomplete'; end if;
  return query with connected as (
    select c.recipient_id peer from public.connection_requests c where c.sender_id=actor and c.status='accepted'
    union select c.sender_id from public.connection_requests c where c.recipient_id=actor and c.status='accepted'
  ) select p.user_id,p.display_name,p.avatar_url,p.headline
  from connected join public.profiles p on p.user_id=connected.peer join auth.users u on u.id=p.user_id and u.deleted_at is null
  where (_only_user_id is null or p.user_id=_only_user_id)
    and not private.has_member_block(actor,p.user_id) and not public.is_suspended(p.user_id)
    and (query='' or position(lower(query) in lower(coalesce(p.display_name,'Member')))>0)
    and (_after_user_id is null or (coalesce(p.display_name,'Member') collate "C",p.user_id)>(_after_display_name collate "C",_after_user_id))
  order by coalesce(p.display_name,'Member') collate "C",p.user_id limit _limit+1;
end;
$$;

create function private.list_my_blocked_direct_contacts_v2(_expected_user_id uuid)
returns table(user_id uuid,display_name text,avatar_url text,headline text)
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_dm_actor(_expected_user_id);
begin
  return query select p.user_id,p.display_name,p.avatar_url,p.headline from public.member_blocks b
    join public.profiles p on p.user_id=b.blocked_user_id where b.blocker_id=actor
    order by b.created_at desc,b.blocked_user_id limit 100;
end;
$$;

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

  perform 1 from auth.users where id in (caller_id,_blocked_user_id) order by id for key share;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'dm-pair:'||least(caller_id::text,_blocked_user_id::text)||':'||greatest(caller_id::text,_blocked_user_id::text),0));
  perform private.require_dm_actor(caller_id);
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

  perform 1 from auth.users where id in (caller_id,_blocked_user_id) order by id for key share;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'dm-pair:'||least(caller_id::text,_blocked_user_id::text)||':'||greatest(caller_id::text,_blocked_user_id::text),0));
  perform private.require_dm_actor(caller_id);
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


create function private.block_my_member_v2(_expected_user_id uuid,_blocked_user_id uuid,_reason_category text default 'member_choice')
returns public.member_blocks language plpgsql security definer set search_path='' as $$
begin perform private.require_dm_actor(_expected_user_id); return public.block_my_member(_blocked_user_id,_reason_category); end;
$$;
create function private.unblock_my_member_v2(_expected_user_id uuid,_blocked_user_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin perform private.require_dm_actor(_expected_user_id); return public.unblock_my_member(_blocked_user_id); end;
$$;

-- Legacy history/read callers still work, with account/closure/suspension guards.
-- The legacy read signature deliberately preserves its historical mark-all
-- semantics; the new UI only calls the visible-boundary version above.
create or replace function public.mark_my_direct_conversation_read(_other_user_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_dm_pair(auth.uid(),_other_user_id); boundary public.direct_messages%rowtype;
begin
  select m.* into boundary from public.direct_messages m where (m.sender_id=actor and m.recipient_id=_other_user_id)
    or (m.sender_id=_other_user_id and m.recipient_id=actor) order by m.created_at desc,m.id desc limit 1;
  if boundary.id is null then return 0; end if;
  return private.mark_my_direct_conversation_read_v2(actor,_other_user_id,boundary.id);
end;
$$;
create or replace function public.list_my_direct_conversation(_other_user_id uuid,_before_created_at timestamptz default null,
  _before_id uuid default null,_limit integer default 50)
returns table(message_id uuid,sender_id uuid,recipient_id uuid,content text,client_request_id uuid,created_at timestamptz,read_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin return query select m.id,m.sender_id,m.recipient_id,m.content,m.client_request_id,m.created_at,m.read_at
  from private.list_my_direct_messages_v2(auth.uid(),_other_user_id,_before_created_at,_before_id,false,_limit) m; end;
$$;

create or replace function private.can_receive_dm_broadcast(_topic text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); first_user uuid;second_user uuid;
begin
  if actor is null or _topic !~ '^dm:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  first_user:=split_part(_topic,':',2)::uuid; second_user:=split_part(_topic,':',3)::uuid;
  return actor in (first_user,second_user) and first_user<>second_user and not private.has_member_block(first_user,second_user)
    and not public.is_suspended(first_user) and not public.is_suspended(second_user)
    and exists(select 1 from auth.users where id=first_user and deleted_at is null)
    and exists(select 1 from auth.users where id=second_user and deleted_at is null);
exception when invalid_text_representation then return false;
end;
$$;

revoke all on function private.list_my_direct_messages_v2(uuid,uuid,timestamptz,uuid,boolean,integer) from public,anon,authenticated;
grant execute on function private.list_my_direct_messages_v2(uuid,uuid,timestamptz,uuid,boolean,integer) to authenticated;

revoke all on function private.send_my_direct_message_v2(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function private.send_my_direct_message_v2(uuid,uuid,text,uuid) to authenticated;

create function public.send_my_direct_message_v2(_expected_user_id uuid,_recipient_id uuid,_content text,_client_request_id uuid)
returns public.direct_messages language plpgsql security invoker set search_path='' as $$
begin return private.send_my_direct_message_v2(_expected_user_id,_recipient_id,_content,_client_request_id); end;
$$;
revoke all on function public.send_my_direct_message_v2(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.send_my_direct_message_v2(uuid,uuid,text,uuid) to authenticated;

create function public.list_my_direct_conversation_v2(_expected_user_id uuid,_other_user_id uuid,_before_created_at timestamptz default null,_before_id uuid default null,_limit integer default 50)
returns setof public.direct_messages language plpgsql security invoker set search_path='' as $$
begin return query select * from private.list_my_direct_messages_v2(_expected_user_id,_other_user_id,_before_created_at,_before_id,false,_limit); end;
$$;
revoke all on function public.list_my_direct_conversation_v2(uuid,uuid,timestamptz,uuid,integer) from public,anon,authenticated;
grant execute on function public.list_my_direct_conversation_v2(uuid,uuid,timestamptz,uuid,integer) to authenticated;

create function public.list_my_direct_conversation_after_v2(_expected_user_id uuid,_other_user_id uuid,_after_created_at timestamptz,_after_id uuid,_limit integer default 50)
returns setof public.direct_messages language plpgsql security invoker set search_path='' as $$
begin return query select * from private.list_my_direct_messages_v2(_expected_user_id,_other_user_id,_after_created_at,_after_id,true,_limit); end;
$$;
revoke all on function public.list_my_direct_conversation_after_v2(uuid,uuid,timestamptz,uuid,integer) from public,anon,authenticated;
grant execute on function public.list_my_direct_conversation_after_v2(uuid,uuid,timestamptz,uuid,integer) to authenticated;

revoke all on function private.mark_my_direct_conversation_read_v2(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function private.mark_my_direct_conversation_read_v2(uuid,uuid,uuid) to authenticated;

create function public.mark_my_direct_conversation_read_v2(_expected_user_id uuid,_other_user_id uuid,_through_id uuid)
returns integer language plpgsql security invoker set search_path='' as $$
begin return private.mark_my_direct_conversation_read_v2(_expected_user_id,_other_user_id,_through_id); end;
$$;
revoke all on function public.mark_my_direct_conversation_read_v2(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.mark_my_direct_conversation_read_v2(uuid,uuid,uuid) to authenticated;

revoke all on function private.list_my_direct_inbox_v2(uuid,timestamptz,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function private.list_my_direct_inbox_v2(uuid,timestamptz,uuid,uuid,integer) to authenticated;

create function public.list_my_direct_inbox_v2(_expected_user_id uuid,_before_created_at timestamptz default null,_before_id uuid default null,_before_peer_id uuid default null,_limit integer default 50)
returns table(user_id uuid,display_name text,avatar_url text,headline text,last_message_id uuid,last_message_content text,last_message_at timestamptz,last_sender_id uuid,unread_count bigint) language plpgsql security invoker set search_path='' as $$
begin return query select * from private.list_my_direct_inbox_v2(_expected_user_id,_before_created_at,_before_id,_before_peer_id,_limit); end;
$$;
revoke all on function public.list_my_direct_inbox_v2(uuid,timestamptz,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.list_my_direct_inbox_v2(uuid,timestamptz,uuid,uuid,integer) to authenticated;

revoke all on function private.list_my_direct_contacts_v2(uuid,text,text,uuid,integer,uuid) from public,anon,authenticated;
grant execute on function private.list_my_direct_contacts_v2(uuid,text,text,uuid,integer,uuid) to authenticated;

create function public.list_my_direct_contacts_v2(_expected_user_id uuid,_search text default '',_after_display_name text default null,_after_user_id uuid default null,_limit integer default 50,_only_user_id uuid default null)
returns table(user_id uuid,display_name text,avatar_url text,headline text) language plpgsql security invoker set search_path='' as $$
begin return query select * from private.list_my_direct_contacts_v2(_expected_user_id,_search,_after_display_name,_after_user_id,_limit,_only_user_id); end;
$$;
revoke all on function public.list_my_direct_contacts_v2(uuid,text,text,uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.list_my_direct_contacts_v2(uuid,text,text,uuid,integer,uuid) to authenticated;

revoke all on function private.list_my_blocked_direct_contacts_v2(uuid) from public,anon,authenticated;
grant execute on function private.list_my_blocked_direct_contacts_v2(uuid) to authenticated;

create function public.list_my_blocked_direct_contacts_v2(_expected_user_id uuid)
returns table(user_id uuid,display_name text,avatar_url text,headline text) language plpgsql security invoker set search_path='' as $$
begin return query select * from private.list_my_blocked_direct_contacts_v2(_expected_user_id); end;
$$;
revoke all on function public.list_my_blocked_direct_contacts_v2(uuid) from public,anon,authenticated;
grant execute on function public.list_my_blocked_direct_contacts_v2(uuid) to authenticated;

revoke all on function private.block_my_member_v2(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.block_my_member_v2(uuid,uuid,text) to authenticated;

create function public.block_my_member_v2(_expected_user_id uuid,_blocked_user_id uuid,_reason_category text default 'member_choice')
returns public.member_blocks language plpgsql security invoker set search_path='' as $$
begin return private.block_my_member_v2(_expected_user_id,_blocked_user_id,_reason_category); end;
$$;
revoke all on function public.block_my_member_v2(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.block_my_member_v2(uuid,uuid,text) to authenticated;

revoke all on function private.unblock_my_member_v2(uuid,uuid) from public,anon,authenticated;
grant execute on function private.unblock_my_member_v2(uuid,uuid) to authenticated;

create function public.unblock_my_member_v2(_expected_user_id uuid,_blocked_user_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin return private.unblock_my_member_v2(_expected_user_id,_blocked_user_id); end;
$$;
revoke all on function public.unblock_my_member_v2(uuid,uuid) from public,anon,authenticated;
grant execute on function public.unblock_my_member_v2(uuid,uuid) to authenticated;

comment on function public.mark_my_direct_conversation_read_v2(uuid,uuid,uuid) is 'Acknowledges through an authorized durable message boundary. The client supplies visibility evidence; the server checks identity, pair and exact boundary.';

-- Direct browser reads and already-joined event streams remain fail-closed for
-- suspended/closed pairs, independently of the optional Data API pre-hook.
create policy "Unavailable accounts cannot read direct messages" on public.direct_messages
as restrictive for select to authenticated using (
  private.dm_pair_available(sender_id,recipient_id)
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
  if private.has_member_block(sender, recipient) or public.is_suspended(sender) or public.is_suspended(recipient) then
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

