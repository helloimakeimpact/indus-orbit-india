begin;

select plan(4);

select is(
  (
    select count(*)::bigint
    from pg_catalog.pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'Members send private direct-message signals'
  ),
  1::bigint,
  'private direct-message typing has an explicit insert policy'
);

select is(
  (
    select cmd
    from pg_catalog.pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'Members send private direct-message signals'
  ),
  'INSERT',
  'the signal policy authorizes insert only'
);

select ok(
  pg_catalog.has_function_privilege(
    'authenticated',
    'private.can_receive_dm_broadcast(text)',
    'execute'
  ),
  'authenticated callers may evaluate exact DM topic access'
);

select results_eq(
  $$
    select count(*)::bigint
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('profiles', 'direct_messages')
      and column_name in ('last_seen_at', 'presence_status', 'typing_status')
  $$,
  array[0::bigint],
  'ephemeral direct-message signals add no durable presence history'
);

select * from finish();
rollback;
