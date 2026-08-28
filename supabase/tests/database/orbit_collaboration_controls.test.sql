begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(43);

select has_function('public', 'list_my_conversation_room_feed', array['uuid','uuid','integer','timestamptz','uuid']);
select has_function('public', 'toggle_my_conversation_reaction', array['uuid','text']);
select has_function('public', 'report_my_conversation_message', array['uuid','text','text','uuid']);
select has_function('public', 'update_managed_conversation_room', array['uuid','text','text','text']);
select has_function('public', 'update_managed_conversation_room_v2', array['uuid','text','text','text','integer']);
select has_function('public', 'set_managed_conversation_room_permission', array['uuid','uuid','uuid','text','text']);
select has_function('public', 'moderate_conversation_message', array['uuid','text','text','uuid']);
select has_function('public', 'set_managed_conversation_thread_lock', array['uuid','boolean','text','uuid']);
select has_function('public', 'prepare_my_conversation_attachment', array['uuid','text','text','bigint','text','uuid']);
select has_function('public', 'finalize_my_conversation_attachment', array['uuid']);
select has_function('private', 'can_moderate_conversation_room', array['uuid']);
select has_function('private', 'can_create_conversation_thread', array['uuid']);
select has_function('public', 'get_my_conversation_thread_controls', array['uuid']);
select has_function('public', 'replace_managed_conversation_thread_members', array['uuid','uuid[]']);
select has_function('public', 'search_my_conversation_messages_v2', array['uuid','text','integer','real','timestamptz','uuid']);

select has_column('public', 'conversation_reports', 'client_request_id');
select has_column('public', 'conversation_rooms', 'slow_mode_seconds');
select has_column('private', 'conversation_moderation_actions', 'target_message_id');
select has_column('private', 'conversation_moderation_actions', 'target_thread_id');
select has_column('private', 'conversation_moderation_actions', 'client_request_id');

select ok(
  exists (select 1 from storage.buckets where id = 'orbit-attachments' and public = false),
  'Orbit attachment bucket is private'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'orbit_attachments_insert_own_pending'
  ),
  'attachment insertion is policy gated'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'orbit_attachments_select_author_or_clean_member'
  ),
  'attachment reads require authorship or a clean member-visible object'
);

select ok(
  not has_table_privilege('anon', 'public.conversation_messages', 'INSERT')
    and not has_table_privilege('anon', 'public.conversation_reactions', 'INSERT')
    and not has_table_privilege('anon', 'public.conversation_attachments', 'INSERT')
    and not has_table_privilege('anon', 'public.conversation_reports', 'INSERT'),
  'anonymous callers cannot mutate collaboration tables'
);
select ok(
  not has_table_privilege('authenticated', 'public.conversation_messages', 'INSERT')
    and not has_table_privilege('authenticated', 'public.conversation_reactions', 'INSERT')
    and not has_table_privilege('authenticated', 'public.conversation_attachments', 'INSERT')
    and not has_table_privilege('authenticated', 'public.conversation_reports', 'INSERT'),
  'authenticated browsers cannot bypass collaboration RPCs'
);
select ok(
  not has_table_privilege('authenticated', 'private.conversation_moderation_actions', 'SELECT')
    and not has_table_privilege('authenticated', 'private.conversation_moderation_actions', 'INSERT'),
  'private moderation evidence is unavailable to browser roles'
);

select ok(has_function_privilege('authenticated', 'public.list_my_conversation_room_feed(uuid,uuid,integer,timestamptz,uuid)', 'EXECUTE'), 'members can execute the caller-bound feed');
select ok(has_function_privilege('authenticated', 'public.toggle_my_conversation_reaction(uuid,text)', 'EXECUTE'), 'members can execute reaction toggle');
select ok(has_function_privilege('authenticated', 'public.report_my_conversation_message(uuid,text,text,uuid)', 'EXECUTE'), 'members can execute message reporting');
select ok(has_function_privilege('authenticated', 'public.update_managed_conversation_room(uuid,text,text,text)', 'EXECUTE'), 'authenticated managers can reach the room command');
select ok(has_function_privilege('authenticated', 'public.update_managed_conversation_room_v2(uuid,text,text,text,integer)', 'EXECUTE'), 'authenticated managers can configure Room slow mode');
select ok(has_function_privilege('authenticated', 'public.get_my_conversation_thread_controls(uuid)', 'EXECUTE'), 'members can read caller-bound Thread controls');
select ok(has_function_privilege('authenticated', 'public.replace_managed_conversation_thread_members(uuid,uuid[])', 'EXECUTE'), 'authorized creators and managers can reach atomic Thread membership replacement');
select ok(has_function_privilege('authenticated', 'public.search_my_conversation_messages_v2(uuid,text,integer,real,timestamptz,uuid)', 'EXECUTE'), 'members can execute keyset-paged permission-filtered search');
select ok(not has_function_privilege('anon', 'public.list_my_conversation_room_feed(uuid,uuid,integer,timestamptz,uuid)', 'EXECUTE'), 'anonymous callers cannot execute the feed');
select ok(not has_function_privilege('anon', 'public.get_my_conversation_thread_controls(uuid)', 'EXECUTE'), 'anonymous callers cannot inspect private Thread membership');
select ok(not has_function_privilege('anon', 'public.replace_managed_conversation_thread_members(uuid,uuid[])', 'EXECUTE'), 'anonymous callers cannot replace private Thread membership');
select ok(not has_function_privilege('anon', 'public.search_my_conversation_messages_v2(uuid,text,integer,real,timestamptz,uuid)', 'EXECUTE'), 'anonymous callers cannot page Space search');
select ok(not has_function_privilege('anon', 'public.update_managed_conversation_room_v2(uuid,text,text,text,integer)', 'EXECUTE'), 'anonymous callers cannot configure Room slow mode');
select ok(not has_function_privilege('anon', 'public.moderate_conversation_message(uuid,text,text,uuid)', 'EXECUTE'), 'anonymous callers cannot execute moderation');
select ok(not has_function_privilege('anon', 'public.prepare_my_conversation_attachment(uuid,text,text,bigint,text,uuid)', 'EXECUTE'), 'anonymous callers cannot reserve attachment paths');
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'conversation_threads_parent_message_key'
  ),
  'one parent message maps to at most one Thread'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'conversation_messages_room_author_created_idx'
  ),
  'Room slow mode has an author/time covering index'
);

select * from finish();
rollback;
