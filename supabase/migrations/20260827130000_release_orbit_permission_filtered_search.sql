-- Search is caller-bound at the database boundary. Results never cross Space,
-- Room, private-Thread or moderation visibility boundaries.

create index if not exists conversation_messages_search_idx
  on public.conversation_messages
  using gin (pg_catalog.to_tsvector('simple'::regconfig, content))
  where deleted_at is null;

create or replace function public.search_my_conversation_messages(
  _space_id uuid,
  _query text,
  _limit integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  _actor_id uuid := (select auth.uid());
  _clean_query text := pg_catalog.btrim(coalesce(_query, ''));
  _search_query tsquery;
  _result jsonb;
begin
  if _actor_id is null or not private.can_access_conversation_space(_space_id) then
    raise exception 'Space access is required' using errcode = '42501';
  end if;
  if pg_catalog.char_length(_clean_query) not between 2 and 100 then
    raise exception 'Search must contain between 2 and 100 characters';
  end if;
  if _limit not between 1 and 50 then
    raise exception 'Search limit must be between 1 and 50';
  end if;

  _search_query := pg_catalog.plainto_tsquery('simple'::regconfig, _clean_query);
  if _search_query = ''::tsquery then
    return pg_catalog.jsonb_build_object('query', _clean_query, 'items', '[]'::jsonb);
  end if;

  with matched as (
    select
      message.id,
      message.room_id,
      room.display_name as room_name,
      message.thread_id,
      thread.title as thread_title,
      thread.updated_at as thread_updated_at,
      thread.locked_at as thread_locked_at,
      message.author_id,
      coalesce(author_profile.display_name, 'Member') as author_display_name,
      author_profile.avatar_url as author_avatar_url,
      pg_catalog.left(message.content, 600) as excerpt,
      message.created_at,
      parent.id as parent_message_id,
      parent.author_id as parent_author_id,
      coalesce(parent_profile.display_name, 'Member') as parent_author_display_name,
      parent_profile.avatar_url as parent_author_avatar_url,
      case when parent.deleted_at is null then pg_catalog.left(parent.content, 600) else null end
        as parent_content,
      parent.created_at as parent_created_at,
      (
        select count(*)::integer
        from public.conversation_messages as reply
        where reply.thread_id = thread.id
      ) as reply_count,
      pg_catalog.ts_rank_cd(
        pg_catalog.to_tsvector('simple'::regconfig, message.content),
        _search_query
      ) as relevance
    from public.conversation_messages as message
    join public.conversation_rooms as room on room.id = message.room_id
    left join public.conversation_threads as thread on thread.id = message.thread_id
    left join public.conversation_messages as parent on parent.id = thread.parent_message_id
    left join public.profiles as author_profile on author_profile.user_id = message.author_id
    left join public.profiles as parent_profile on parent_profile.user_id = parent.author_id
    where room.space_id = _space_id
      and message.deleted_at is null
      and private.can_access_conversation_room(message.room_id)
      and (message.thread_id is null or private.can_access_conversation_thread(message.thread_id))
      and pg_catalog.to_tsvector('simple'::regconfig, message.content) @@ _search_query
    order by relevance desc, message.created_at desc, message.id desc
    limit _limit
  )
  select pg_catalog.jsonb_build_object(
    'query', _clean_query,
    'items', coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'messageId', matched.id,
      'roomId', matched.room_id,
      'roomName', matched.room_name,
      'threadId', matched.thread_id,
      'threadTitle', matched.thread_title,
      'threadUpdatedAt', matched.thread_updated_at,
      'threadLockedAt', matched.thread_locked_at,
      'authorId', matched.author_id,
      'authorDisplayName', matched.author_display_name,
      'authorAvatarUrl', matched.author_avatar_url,
      'excerpt', matched.excerpt,
      'createdAt', matched.created_at,
      'parentMessageId', matched.parent_message_id,
      'parentAuthorId', matched.parent_author_id,
      'parentAuthorDisplayName', matched.parent_author_display_name,
      'parentAuthorAvatarUrl', matched.parent_author_avatar_url,
      'parentContent', matched.parent_content,
      'parentCreatedAt', matched.parent_created_at,
      'replyCount', coalesce(matched.reply_count, 0)
    ) order by matched.relevance desc, matched.created_at desc, matched.id desc), '[]'::jsonb)
  ) into _result
  from matched;

  return coalesce(
    _result,
    pg_catalog.jsonb_build_object('query', _clean_query, 'items', '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.search_my_conversation_messages(uuid, text, integer)
  from public, anon;
grant execute on function public.search_my_conversation_messages(uuid, text, integer)
  to authenticated, service_role;

comment on function public.search_my_conversation_messages(uuid, text, integer) is
  'Caller-bound full-text Orbit history search. Every result rechecks Space, Room, private-Thread and deletion visibility.';
