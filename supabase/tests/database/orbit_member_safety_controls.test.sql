begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(15);

select has_function(
  'public',
  'list_managed_conversation_space_members',
  array['uuid'],
  'Space managers have a bounded member-control roster'
);
select has_function(
  'public',
  'set_managed_conversation_member_timeout',
  array['uuid', 'uuid', 'integer', 'text', 'bigint', 'uuid'],
  'Space timeout mutation has an explicit contract'
);
select has_function(
  'public',
  'decide_space_membership',
  array['uuid', 'uuid', 'text', 'text', 'text', 'bigint'],
  'source-aware membership decisions remain canonical'
);
select has_function(
  'public',
  'send_my_conversation_message',
  array['uuid', 'uuid', 'text', 'uuid'],
  'Room sends retain the canonical caller-bound contract'
);

select ok(
  has_function_privilege('authenticated', 'public.list_managed_conversation_space_members(uuid)', 'EXECUTE'),
  'authenticated managers can reach the roster command'
);
select ok(
  has_function_privilege('authenticated', 'public.set_managed_conversation_member_timeout(uuid,uuid,integer,text,bigint,uuid)', 'EXECUTE'),
  'authenticated managers can reach the timeout command'
);
select ok(
  not has_function_privilege('anon', 'public.list_managed_conversation_space_members(uuid)', 'EXECUTE'),
  'anonymous callers cannot inspect the managed roster'
);
select ok(
  not has_function_privilege('anon', 'public.set_managed_conversation_member_timeout(uuid,uuid,integer,text,bigint,uuid)', 'EXECUTE'),
  'anonymous callers cannot mutate timeout state'
);
select ok(
  not has_table_privilege('authenticated', 'private.conversation_moderation_actions', 'SELECT')
    and not has_table_privilege('authenticated', 'private.conversation_moderation_actions', 'INSERT'),
  'browser roles cannot bypass the moderation RPC boundary'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'conversation_messages_author_created_idx'
  ),
  'global member rate windows have a covering index'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'private' and indexname = 'conversation_moderation_active_timeout_idx'
  ),
  'active timeout checks have a covering index'
);
select ok(
  position('Space timeout is active' in pg_get_functiondef(
    'public.send_my_conversation_message(uuid,uuid,text,uuid)'::regprocedure
  )) > 0,
  'Room sends enforce active Space timeouts'
);
select ok(
  position('Message burst limit exceeded' in pg_get_functiondef(
    'public.send_my_conversation_message(uuid,uuid,text,uuid)'::regprocedure
  )) > 0
  and position('Repeated-message limit exceeded' in pg_get_functiondef(
    'public.send_my_conversation_message(uuid,uuid,text,uuid)'::regprocedure
  )) > 0,
  'Room sends enforce bounded burst and duplicate controls'
);
select ok(
  position('source_membership_version <> _expected_membership_version' in pg_get_functiondef(
    'public.set_managed_conversation_member_timeout_serialized(uuid,uuid,integer,text,bigint,uuid)'::regprocedure
  )) > 0
  and position('pg_advisory_xact_lock' in pg_get_functiondef(
    'public.set_managed_conversation_member_timeout(uuid,uuid,integer,text,bigint,uuid)'::regprocedure
  )) > 0
  and not has_function_privilege(
    'authenticated',
    'public.set_managed_conversation_member_timeout_serialized(uuid,uuid,integer,text,bigint,uuid)',
    'EXECUTE'
  ),
  'timeouts serialize and reject stale member state'
);
select ok(
  position('Remove elevated source authority before' in pg_get_functiondef(
    'public.decide_space_membership(uuid,uuid,text,text,text,bigint)'::regprocedure
  )) > 0,
  'membership removal protects elevated source roles'
);

select * from finish();
rollback;
