-- Release the existing Orbit Space schema as a caller-bound collaboration
-- system. The branded shell already exists; this migration adds authoritative
-- feed, reaction, report, attachment, room-administration and moderation
-- commands without granting direct browser mutation of conversation tables.

create unique index conversation_threads_parent_message_key
  on public.conversation_threads (room_id, parent_message_id)
  where parent_message_id is not null;

alter table private.conversation_moderation_actions
  add column target_message_id uuid references public.conversation_messages(id) on delete set null,
  add column target_thread_id uuid references public.conversation_threads(id) on delete set null,
  add column client_request_id uuid;

alter table public.conversation_reports
  add column client_request_id uuid;

create unique index conversation_reports_reporter_request_key
  on public.conversation_reports (reporter_id, client_request_id)
  where client_request_id is not null;

create unique index conversation_moderation_actor_request_key
  on private.conversation_moderation_actions (actor_id, client_request_id)
  where client_request_id is not null;
create index conversation_moderation_message_idx
  on private.conversation_moderation_actions (target_message_id, created_at desc)
  where target_message_id is not null;
create index conversation_moderation_thread_idx
  on private.conversation_moderation_actions (target_thread_id, created_at desc)
  where target_thread_id is not null;

create or replace function private.can_moderate_conversation_room(_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.conversation_rooms as room
    where room.id = _room_id
      and private.can_access_conversation_room(room.id)
      and not exists (
        select 1
        from public.conversation_room_permission_overrides as denied
        left join public.conversation_space_role_members as denied_member
          on denied_member.role_id = denied.role_id
          and denied_member.user_id = auth.uid()
        where denied.room_id = room.id
          and denied.capability = 'message.moderate'
          and denied.effect = 'deny'
          and (denied.user_id = auth.uid() or denied_member.user_id is not null)
      )
      and (
        private.can_manage_conversation_space(room.space_id)
        or exists (
          select 1
          from public.conversation_room_permission_overrides as allowed
          left join public.conversation_space_role_members as allowed_member
            on allowed_member.role_id = allowed.role_id
            and allowed_member.user_id = auth.uid()
          where allowed.room_id = room.id
            and allowed.capability = 'message.moderate'
            and allowed.effect = 'allow'
            and (allowed.user_id = auth.uid() or allowed_member.user_id is not null)
        )
      )
  );
$$;

revoke all on function private.can_moderate_conversation_room(uuid)
  from public, anon, service_role;
grant execute on function private.can_moderate_conversation_room(uuid)
  to authenticated;

create or replace function private.can_create_conversation_thread(_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_post_conversation_room(_room_id)
    and not exists (
      select 1
      from public.conversation_room_permission_overrides as denied
      left join public.conversation_space_role_members as denied_member
        on denied_member.role_id = denied.role_id
        and denied_member.user_id = auth.uid()
      where denied.room_id = _room_id
        and denied.capability = 'thread.create'
        and denied.effect = 'deny'
        and (denied.user_id = auth.uid() or denied_member.user_id is not null)
    )
    and (
      not exists (
        select 1 from public.conversation_room_permission_overrides as scoped
        where scoped.room_id = _room_id and scoped.capability = 'thread.create'
      )
      or exists (
        select 1
        from public.conversation_room_permission_overrides as allowed
        left join public.conversation_space_role_members as allowed_member
          on allowed_member.role_id = allowed.role_id
          and allowed_member.user_id = auth.uid()
        where allowed.room_id = _room_id
          and allowed.capability = 'thread.create'
          and allowed.effect = 'allow'
          and (allowed.user_id = auth.uid() or allowed_member.user_id is not null)
      )
      or exists (
        select 1 from public.conversation_rooms as room
        where room.id = _room_id and private.can_manage_conversation_space(room.space_id)
      )
    );
$$;

revoke all on function private.can_create_conversation_thread(uuid)
  from public, anon, service_role;
grant execute on function private.can_create_conversation_thread(uuid)
  to authenticated;

create or replace function public.create_my_conversation_thread(
  _room_id uuid,
  _parent_message_id uuid,
  _title text,
  _visibility text,
  _client_request_id uuid
)
returns public.conversation_threads
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  existing public.conversation_threads%rowtype;
  created public.conversation_threads%rowtype;
begin
  if actor_id is null or not private.can_create_conversation_thread(_room_id) then
    raise exception 'Thread creation is not allowed in this Room' using errcode = '42501';
  end if;
  if _client_request_id is null or _visibility not in ('room', 'private') then
    raise exception 'Thread request is invalid';
  end if;
  if _title is not null and char_length(btrim(_title)) not between 1 and 160 then
    raise exception 'Thread title must be 1 to 160 characters';
  end if;
  if _parent_message_id is not null and not exists (
    select 1 from public.conversation_messages as message
    where message.id = _parent_message_id
      and message.room_id = _room_id and message.thread_id is null
      and message.deleted_at is null
  ) then raise exception 'Parent message does not belong to this Room'; end if;

  select thread.* into existing from public.conversation_threads as thread
  where thread.created_by = actor_id and thread.client_request_id = _client_request_id;
  if found then return existing; end if;
  if _parent_message_id is not null then
    select thread.* into existing from public.conversation_threads as thread
    where thread.room_id = _room_id and thread.parent_message_id = _parent_message_id;
    if found then return existing; end if;
  end if;
  insert into public.conversation_threads (
    room_id, parent_message_id, title, visibility, created_by, client_request_id
  ) values (
    _room_id, _parent_message_id, nullif(btrim(_title), ''), _visibility,
    actor_id, _client_request_id
  ) returning * into created;
  if _visibility = 'private' then
    insert into public.conversation_thread_members (thread_id, user_id, added_by)
    values (created.id, actor_id, actor_id);
  end if;
  return created;
end;
$function$;

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
          where thread.room_id = _room_id and thread.parent_message_id = message.id
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

create or replace function public.toggle_my_conversation_reaction(
  _message_id uuid,
  _reaction_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  message_room_id uuid;
  removed boolean := false;
begin
  if _reaction_key not in ('acknowledge', 'support', 'question', 'complete') then
    raise exception 'Reaction is invalid';
  end if;
  select message.room_id into message_room_id
  from public.conversation_messages as message
  where message.id = _message_id and message.deleted_at is null;
  if caller_id is null or message_room_id is null
    or not private.can_access_conversation_room(message_room_id) then
    raise exception 'Message access is required' using errcode = '42501';
  end if;

  delete from public.conversation_reactions
  where message_id = _message_id and user_id = caller_id and reaction_key = _reaction_key;
  removed := found;
  if not removed then
    insert into public.conversation_reactions (message_id, user_id, reaction_key)
    values (_message_id, caller_id, _reaction_key);
  end if;
  return jsonb_build_object('active', not removed);
end;
$function$;

create or replace function public.report_my_conversation_message(
  _message_id uuid,
  _category text,
  _description text,
  _client_request_id uuid
)
returns public.conversation_reports
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  message_row public.conversation_messages%rowtype;
  room_space_id uuid;
  existing public.conversation_reports%rowtype;
  created public.conversation_reports%rowtype;
begin
  if caller_id is null or _client_request_id is null then
    raise exception 'Authentication and client request ID are required' using errcode = '42501';
  end if;
  if _category not in ('harassment', 'spam', 'privacy', 'safety', 'misinformation', 'other') then
    raise exception 'Report category is invalid';
  end if;
  if char_length(btrim(coalesce(_description, ''))) not between 10 and 2000 then
    raise exception 'Report description must be 10 to 2,000 characters';
  end if;
  select message.* into message_row from public.conversation_messages as message
  where message.id = _message_id;
  if not found or not private.can_access_conversation_room(message_row.room_id) then
    raise exception 'Message access is required' using errcode = '42501';
  end if;
  select room.space_id into room_space_id from public.conversation_rooms as room
  where room.id = message_row.room_id;

  select report.* into existing
  from public.conversation_reports as report
  where report.reporter_id = caller_id and report.client_request_id = _client_request_id;
  if found then
    if existing.message_id <> _message_id or existing.category <> _category then
      raise exception 'Client request ID was already used for another report';
    end if;
    return existing;
  end if;

  insert into public.conversation_reports (
    reporter_id, space_id, room_id, message_id, category, description, client_request_id
  ) values (
    caller_id, room_space_id, message_row.room_id, _message_id,
    _category, btrim(_description), _client_request_id
  ) returning * into created;
  return created;
end;
$function$;

create or replace function public.update_managed_conversation_room(
  _room_id uuid,
  _display_name text,
  _description text,
  _posting_policy text
)
returns public.conversation_rooms
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  room_row public.conversation_rooms%rowtype;
begin
  select room.* into room_row from public.conversation_rooms as room
  where room.id = _room_id for update;
  if caller_id is null or not found
    or not private.can_manage_conversation_space(room_row.space_id) then
    raise exception 'Space management access is required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(_display_name, ''))) not between 1 and 100
    or char_length(coalesce(_description, '')) > 1000
    or _posting_policy not in ('read_only', 'owners', 'stewards', 'members') then
    raise exception 'Room settings are invalid';
  end if;
  update public.conversation_rooms
  set display_name = btrim(_display_name),
      description = btrim(coalesce(_description, '')),
      posting_policy = _posting_policy,
      updated_at = now()
  where id = _room_id returning * into room_row;
  return room_row;
end;
$function$;

create or replace function public.set_managed_conversation_room_permission(
  _room_id uuid,
  _role_id uuid,
  _user_id uuid,
  _capability text,
  _effect text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  room_space_id uuid;
  override_id uuid;
begin
  select room.space_id into room_space_id from public.conversation_rooms as room
  where room.id = _room_id;
  if caller_id is null or room_space_id is null
    or not private.can_manage_conversation_space(room_space_id) then
    raise exception 'Space management access is required' using errcode = '42501';
  end if;
  if ((_role_id is not null)::integer + (_user_id is not null)::integer) <> 1
    or _capability not in ('room.view', 'message.create', 'thread.create', 'message.moderate', 'room.manage')
    or _effect not in ('allow', 'deny') then
    raise exception 'Room permission is invalid';
  end if;
  if _role_id is not null and not exists (
    select 1 from public.conversation_space_roles as role
    where role.id = _role_id and role.space_id = room_space_id
  ) then raise exception 'Role does not belong to this Space'; end if;
  if _user_id is not null and not exists (
    select 1 from public.conversation_space_memberships as member
    where member.space_id = room_space_id and member.user_id = _user_id
      and member.membership_state = 'active'
  ) then raise exception 'Member does not belong to this Space'; end if;

  delete from public.conversation_room_permission_overrides
  where room_id = _room_id and capability = _capability
    and role_id is not distinct from _role_id and user_id is not distinct from _user_id;
  insert into public.conversation_room_permission_overrides (
    room_id, role_id, user_id, capability, effect, created_by
  ) values (_room_id, _role_id, _user_id, _capability, _effect, caller_id)
  returning id into override_id;
  return jsonb_build_object('id', override_id);
end;
$function$;

create or replace function public.moderate_conversation_message(
  _message_id uuid,
  _action text,
  _reason text,
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  message_row public.conversation_messages%rowtype;
  room_space_id uuid;
  existing_action private.conversation_moderation_actions%rowtype;
begin
  if _client_request_id is null or _action not in ('content_restrict', 'restore')
    or char_length(btrim(coalesce(_reason, ''))) not between 8 and 500 then
    raise exception 'Moderation request is invalid';
  end if;
  select action.* into existing_action
  from private.conversation_moderation_actions as action
  where action.actor_id = caller_id and action.client_request_id = _client_request_id;
  if found then return jsonb_build_object('action', existing_action.action_type); end if;

  select message.* into message_row from public.conversation_messages as message
  where message.id = _message_id for update;
  if caller_id is null or not found
    or not private.can_moderate_conversation_room(message_row.room_id) then
    raise exception 'Room moderation access is required' using errcode = '42501';
  end if;
  if message_row.author_id = caller_id then
    raise exception 'Use member editing controls for your own content';
  end if;
  select room.space_id into room_space_id from public.conversation_rooms as room
  where room.id = message_row.room_id;

  if _action = 'content_restrict' then
    update public.conversation_messages set deleted_at = coalesce(deleted_at, now())
    where id = _message_id;
  else
    update public.conversation_messages set deleted_at = null where id = _message_id;
  end if;
  insert into private.conversation_moderation_actions (
    space_id, target_user_id, target_message_id, action_type, reason,
    actor_id, client_request_id
  ) values (
    room_space_id, message_row.author_id, message_row.id, _action,
    btrim(_reason), caller_id, _client_request_id
  );
  return jsonb_build_object('action', _action);
end;
$function$;

create or replace function public.set_managed_conversation_thread_lock(
  _thread_id uuid,
  _locked boolean,
  _reason text,
  _client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  thread_row public.conversation_threads%rowtype;
  room_space_id uuid;
begin
  if _client_request_id is null or char_length(btrim(coalesce(_reason, ''))) not between 8 and 500 then
    raise exception 'Thread moderation request is invalid';
  end if;
  select thread.* into thread_row from public.conversation_threads as thread
  where thread.id = _thread_id for update;
  if caller_id is null or not found
    or not private.can_moderate_conversation_room(thread_row.room_id) then
    raise exception 'Room moderation access is required' using errcode = '42501';
  end if;
  select room.space_id into room_space_id from public.conversation_rooms as room
  where room.id = thread_row.room_id;
  update public.conversation_threads
  set locked_at = case when _locked then coalesce(locked_at, now()) else null end,
      updated_at = now()
  where id = _thread_id;
  insert into private.conversation_moderation_actions (
    space_id, target_thread_id, action_type, reason, actor_id, client_request_id
  ) values (
    room_space_id, thread_row.id,
    case when _locked then 'content_restrict' else 'restore' end,
    btrim(_reason), caller_id, _client_request_id
  ) on conflict (actor_id, client_request_id) where client_request_id is not null do nothing;
  return jsonb_build_object('locked', _locked);
end;
$function$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'orbit-attachments', 'orbit-attachments', false, 10485760,
  array['image/jpeg','image/png','image/webp','application/pdf','text/plain','text/markdown']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.prepare_my_conversation_attachment(
  _message_id uuid,
  _file_name text,
  _content_type text,
  _byte_size bigint,
  _alt_text text,
  _client_request_id uuid
)
returns public.conversation_attachments
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  message_row public.conversation_messages%rowtype;
  attachment_row public.conversation_attachments%rowtype;
  safe_name text;
  object_path text;
begin
  if caller_id is null or _client_request_id is null then
    raise exception 'Authentication and client request ID are required' using errcode = '42501';
  end if;
  select message.* into message_row from public.conversation_messages as message
  where message.id = _message_id;
  if not found or message_row.author_id <> caller_id
    or not private.can_access_conversation_room(message_row.room_id) then
    raise exception 'Only the message author can attach a file' using errcode = '42501';
  end if;
  if _content_type not in ('image/jpeg','image/png','image/webp','application/pdf','text/plain','text/markdown')
    or _byte_size not between 1 and 10485760
    or char_length(btrim(coalesce(_file_name, ''))) not between 1 and 180
    or (_alt_text is not null and char_length(_alt_text) > 500) then
    raise exception 'Attachment metadata is invalid';
  end if;
  if (select count(*) from public.conversation_attachments where message_id = _message_id) >= 5 then
    raise exception 'A message can have at most five attachments';
  end if;
  safe_name := regexp_replace(btrim(_file_name), '[^A-Za-z0-9._-]+', '-', 'g');
  safe_name := left(coalesce(nullif(safe_name, ''), 'attachment'), 100);
  object_path := caller_id::text || '/' || _message_id::text || '/' || _client_request_id::text || '-' || safe_name;

  select attachment.* into attachment_row from public.conversation_attachments as attachment
  where attachment.storage_bucket = 'orbit-attachments' and attachment.storage_path = object_path;
  if found then return attachment_row; end if;
  insert into public.conversation_attachments (
    message_id, uploaded_by, storage_bucket, storage_path, file_name,
    content_type, byte_size, scan_status, alt_text
  ) values (
    _message_id, caller_id, 'orbit-attachments', object_path, btrim(_file_name),
    _content_type, _byte_size, 'pending', nullif(btrim(_alt_text), '')
  ) returning * into attachment_row;
  return attachment_row;
end;
$function$;

create or replace function public.finalize_my_conversation_attachment(_attachment_id uuid)
returns public.conversation_attachments
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  attachment_row public.conversation_attachments%rowtype;
  object_size bigint;
  object_type text;
begin
  select attachment.* into attachment_row from public.conversation_attachments as attachment
  where attachment.id = _attachment_id and attachment.uploaded_by = caller_id for update;
  if caller_id is null or not found then
    raise exception 'Attachment ownership is required' using errcode = '42501';
  end if;
  select (object.metadata ->> 'size')::bigint,
         coalesce(object.metadata ->> 'mimetype', object.metadata ->> 'contentType')
  into object_size, object_type
  from storage.objects as object
  where object.bucket_id = attachment_row.storage_bucket
    and object.name = attachment_row.storage_path;
  if not found or object_size is distinct from attachment_row.byte_size
    or object_type is distinct from attachment_row.content_type then
    raise exception 'Uploaded object does not match the reserved attachment';
  end if;
  -- Security review remains explicit. A browser upload cannot mark itself clean.
  return attachment_row;
end;
$function$;

create policy orbit_attachments_insert_own_pending
on storage.objects for insert to authenticated
with check (
  bucket_id = 'orbit-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.conversation_attachments as attachment
    where attachment.storage_bucket = bucket_id
      and attachment.storage_path = name
      and attachment.uploaded_by = (select auth.uid())
      and attachment.scan_status = 'pending'
  )
);

create policy orbit_attachments_select_author_or_clean_member
on storage.objects for select to authenticated
using (
  bucket_id = 'orbit-attachments'
  and exists (
    select 1
    from public.conversation_attachments as attachment
    join public.conversation_messages as message on message.id = attachment.message_id
    where attachment.storage_bucket = bucket_id
      and attachment.storage_path = name
      and (
        attachment.uploaded_by = (select auth.uid())
        or (
          attachment.scan_status = 'clean'
          and private.can_access_conversation_room(message.room_id)
        )
      )
  )
);

revoke all on function public.list_my_conversation_room_feed(uuid, uuid, integer, timestamptz, uuid) from public, anon;
revoke all on function public.toggle_my_conversation_reaction(uuid, text) from public, anon;
revoke all on function public.report_my_conversation_message(uuid, text, text, uuid) from public, anon;
revoke all on function public.update_managed_conversation_room(uuid, text, text, text) from public, anon;
revoke all on function public.set_managed_conversation_room_permission(uuid, uuid, uuid, text, text) from public, anon;
revoke all on function public.moderate_conversation_message(uuid, text, text, uuid) from public, anon;
revoke all on function public.set_managed_conversation_thread_lock(uuid, boolean, text, uuid) from public, anon;
revoke all on function public.prepare_my_conversation_attachment(uuid, text, text, bigint, text, uuid) from public, anon;
revoke all on function public.finalize_my_conversation_attachment(uuid) from public, anon;

grant execute on function public.list_my_conversation_room_feed(uuid, uuid, integer, timestamptz, uuid) to authenticated, service_role;
grant execute on function public.toggle_my_conversation_reaction(uuid, text) to authenticated, service_role;
grant execute on function public.report_my_conversation_message(uuid, text, text, uuid) to authenticated, service_role;
grant execute on function public.update_managed_conversation_room(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.set_managed_conversation_room_permission(uuid, uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.moderate_conversation_message(uuid, text, text, uuid) to authenticated, service_role;
grant execute on function public.set_managed_conversation_thread_lock(uuid, boolean, text, uuid) to authenticated, service_role;
grant execute on function public.prepare_my_conversation_attachment(uuid, text, text, bigint, text, uuid) to authenticated, service_role;
grant execute on function public.finalize_my_conversation_attachment(uuid) to authenticated, service_role;

comment on function public.list_my_conversation_room_feed(uuid, uuid, integer, timestamptz, uuid) is
  'Caller-bound, keyset-paged Orbit Room or Thread feed with reaction, attachment and Thread summaries.';
comment on function public.prepare_my_conversation_attachment(uuid, text, text, bigint, text, uuid) is
  'Reserves a private, author-owned object path. Upload remains quarantined until a trusted scanner marks it clean.';
