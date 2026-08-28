-- Keyset-paged Space search keeps a stable relevance/created/id cursor while
-- rechecking Room, private-Thread and deletion visibility on every page.

create or replace function public.search_my_conversation_messages_v2(
  _space_id uuid,
  _query text,
  _limit integer default 30,
  _before_relevance real default null,
  _before_created_at timestamptz default null,
  _before_id uuid default null
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
  if not (
    (
      _before_relevance is null
      and _before_created_at is null
      and _before_id is null
    )
    or (
      _before_relevance is not null
      and _before_created_at is not null
      and _before_id is not null
    )
  ) then
    raise exception 'Search cursor is incomplete';
  end if;
  if _before_relevance is not null
    and _before_relevance::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Search cursor relevance is invalid';
  end if;

  _search_query := pg_catalog.plainto_tsquery('simple'::regconfig, _clean_query);
  if _search_query = ''::tsquery then
    return pg_catalog.jsonb_build_object(
      'query', _clean_query,
      'items', '[]'::jsonb,
      'hasMore', false,
      'nextCursor', null
    );
  end if;

  with ranked as (
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
  ), matched as (
    select ranked.*
    from ranked
    where _before_relevance is null
      or ranked.relevance < _before_relevance
      or (
        ranked.relevance = _before_relevance
        and (ranked.created_at, ranked.id) < (_before_created_at, _before_id)
      )
    order by ranked.relevance desc, ranked.created_at desc, ranked.id desc
    limit _limit + 1
  ), page as (
    select matched.*
    from matched
    order by matched.relevance desc, matched.created_at desc, matched.id desc
    limit _limit
  )
  select pg_catalog.jsonb_build_object(
    'query', _clean_query,
    'items', coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'messageId', page.id,
      'roomId', page.room_id,
      'roomName', page.room_name,
      'threadId', page.thread_id,
      'threadTitle', page.thread_title,
      'threadUpdatedAt', page.thread_updated_at,
      'threadLockedAt', page.thread_locked_at,
      'authorId', page.author_id,
      'authorDisplayName', page.author_display_name,
      'authorAvatarUrl', page.author_avatar_url,
      'excerpt', page.excerpt,
      'createdAt', page.created_at,
      'parentMessageId', page.parent_message_id,
      'parentAuthorId', page.parent_author_id,
      'parentAuthorDisplayName', page.parent_author_display_name,
      'parentAuthorAvatarUrl', page.parent_author_avatar_url,
      'parentContent', page.parent_content,
      'parentCreatedAt', page.parent_created_at,
      'replyCount', coalesce(page.reply_count, 0)
    ) order by page.relevance desc, page.created_at desc, page.id desc), '[]'::jsonb),
    'hasMore', (select count(*) > _limit from matched),
    'nextCursor', case when (select count(*) > _limit from matched) then (
      select pg_catalog.jsonb_build_object(
        'relevance', page.relevance,
        'createdAt', page.created_at,
        'id', page.id
      )
      from page
      order by page.relevance, page.created_at, page.id
      limit 1
    ) else null end
  ) into _result
  from page;

  return coalesce(
    _result,
    pg_catalog.jsonb_build_object(
      'query', _clean_query,
      'items', '[]'::jsonb,
      'hasMore', false,
      'nextCursor', null
    )
  );
end;
$function$;

revoke all on function public.search_my_conversation_messages_v2(
  uuid, text, integer, real, timestamptz, uuid
) from public, anon, authenticated;
grant execute on function public.search_my_conversation_messages_v2(
  uuid, text, integer, real, timestamptz, uuid
) to authenticated, service_role;

comment on function public.search_my_conversation_messages_v2(
  uuid, text, integer, real, timestamptz, uuid
) is 'Caller-bound keyset-paged Orbit history search ordered by relevance, creation time and message ID.';
