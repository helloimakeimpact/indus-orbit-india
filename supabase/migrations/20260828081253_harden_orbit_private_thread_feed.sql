-- Security hardening: a private Thread summary must not leak into the parent
-- Room feed for a caller who cannot open that Thread.

create or replace function public.list_my_conversation_room_feed(
  _room_id uuid,
  _thread_id uuid default null,
  _limit integer default 50,
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
  caller_id uuid := (select auth.uid());
  result jsonb;
begin
  if caller_id is null or not private.can_access_conversation_room(_room_id) then
    raise exception 'Room access is required' using errcode = '42501';
  end if;
  if _limit not between 1 and 100 then
    raise exception 'Feed limit must be between 1 and 100';
  end if;
  if (_before_created_at is null) <> (_before_id is null) then
    raise exception 'Feed cursor is incomplete';
  end if;
  if _thread_id is not null and not exists (
    select 1 from public.conversation_threads as thread
    where thread.id = _thread_id
      and thread.room_id = _room_id
      and private.can_access_conversation_thread(thread.id)
  ) then
    raise exception 'Thread access is required' using errcode = '42501';
  end if;

  with matched as (
    select message.*
    from public.conversation_messages as message
    where message.room_id = _room_id
      and message.thread_id is not distinct from _thread_id
      and (
        _before_created_at is null
        or (message.created_at, message.id) < (_before_created_at, _before_id)
      )
    order by message.created_at desc, message.id desc
    limit _limit + 1
  ), page as (
    select * from matched order by created_at desc, id desc limit _limit
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', message.id,
        'roomId', message.room_id,
        'threadId', message.thread_id,
        'authorId', message.author_id,
        'authorDisplayName', coalesce(profile.display_name, 'Member'),
        'authorAvatarUrl', profile.avatar_url,
        'messageType', message.message_type,
        'content', case when message.deleted_at is null then message.content else null end,
        'createdAt', message.created_at,
        'editedAt', message.edited_at,
        'deletedAt', message.deleted_at,
        'reactions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'key', grouped.reaction_key,
            'count', grouped.reaction_count,
            'reactedByMe', grouped.reacted_by_me
          ) order by grouped.reaction_key)
          from (
            select reaction.reaction_key,
              count(*)::integer as reaction_count,
              bool_or(reaction.user_id = caller_id) as reacted_by_me
            from public.conversation_reactions as reaction
            where reaction.message_id = message.id
            group by reaction.reaction_key
          ) as grouped
        ), '[]'::jsonb),
        'attachments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', attachment.id,
            'bucket', attachment.storage_bucket,
            'path', attachment.storage_path,
            'fileName', attachment.file_name,
            'contentType', attachment.content_type,
            'byteSize', attachment.byte_size,
            'scanStatus', attachment.scan_status,
            'altText', attachment.alt_text
          ) order by attachment.created_at, attachment.id)
          from public.conversation_attachments as attachment
          where attachment.message_id = message.id
            and (attachment.scan_status = 'clean' or attachment.uploaded_by = caller_id)
        ), '[]'::jsonb),
        'thread', case when _thread_id is null then (
          select jsonb_build_object(
            'id', thread.id,
            'title', thread.title,
            'replyCount', (
              select count(*)::integer from public.conversation_messages as reply
              where reply.thread_id = thread.id
            ),
            'updatedAt', thread.updated_at,
            'lockedAt', thread.locked_at
          )
          from public.conversation_threads as thread
          where thread.room_id = _room_id
            and thread.parent_message_id = message.id
            and thread.archived_at is null
            and private.can_access_conversation_thread(thread.id)
          limit 1
        ) else null end
      ) order by message.created_at, message.id)
      from page as message
      left join public.profiles as profile on profile.user_id = message.author_id
    ), '[]'::jsonb),
    'hasMore', (select count(*) > _limit from matched),
    'nextCursor', case when (select count(*) > _limit from matched) then (
      select jsonb_build_object('createdAt', message.created_at, 'id', message.id)
      from page as message order by message.created_at, message.id limit 1
    ) else null end,
    'canManage', private.can_manage_conversation_space((
      select room.space_id from public.conversation_rooms as room where room.id = _room_id
    )),
    'canModerate', private.can_moderate_conversation_room(_room_id)
  ) into result;
  return result;
end;
$function$;

revoke all on function public.list_my_conversation_room_feed(
  uuid, uuid, integer, timestamptz, uuid
) from public, anon, authenticated;
grant execute on function public.list_my_conversation_room_feed(
  uuid, uuid, integer, timestamptz, uuid
) to authenticated, service_role;

comment on function public.list_my_conversation_room_feed(
  uuid, uuid, integer, timestamptz, uuid
) is 'Caller-bound Room/Thread feed. Private Thread summaries are visible only to their explicit audience.';
