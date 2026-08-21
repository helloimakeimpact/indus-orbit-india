begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(26);

select has_table('public', 'member_blocks', 'member block table exists');
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.member_blocks'::regclass),
  'member block table has RLS enabled'
);
select ok(
  has_table_privilege('authenticated', 'public.member_blocks', 'SELECT')
    and not has_table_privilege('authenticated', 'public.member_blocks', 'INSERT')
    and not has_table_privilege('authenticated', 'public.member_blocks', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.member_blocks', 'DELETE'),
  'browser members can only read caller-owned block rows'
);
select has_function(
  'public', 'block_my_member', array['uuid', 'text'], 'caller-bound block RPC exists'
);
select has_function(
  'public', 'unblock_my_member', array['uuid'], 'caller-bound unblock RPC exists'
);
select ok(
  has_function_privilege('authenticated', 'public.block_my_member(uuid,text)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.block_my_member(uuid,text)', 'EXECUTE'),
  'only authenticated members can call the block RPC'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.direct_messages'::regclass
      and tgname = 'broadcast_direct_message_change'
      and not tgisinternal
  ),
  'direct-message changes have a private Broadcast trigger'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_policy
    where polrelid = 'realtime.messages'::regclass
      and polname = 'Members receive private direct-message broadcasts'
  ),
  'Realtime Broadcast has a participant-scoped read policy'
);
select ok(
  not exists (
    select 1
    from pg_catalog.pg_policy
    where polrelid = 'realtime.messages'::regclass
      and polname = 'DM participants can subscribe'
  ),
  'legacy substring-based Realtime policy is removed'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '41000000-0000-4000-8000-000000000001',
    'block-member-a@example.test',
    '{"display_name":"Block Member A"}'::jsonb
  ),
  (
    '41000000-0000-4000-8000-000000000002',
    'block-member-b@example.test',
    '{"display_name":"Block Member B"}'::jsonb
  ),
  (
    '41000000-0000-4000-8000-000000000003',
    'block-member-c@example.test',
    '{"display_name":"Block Member C"}'::jsonb
  );

insert into public.connection_requests (
  id, sender_id, recipient_id, reason, note, status
) values (
  '42000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000002',
  'collab',
  'Accepted member-block fixture.',
  'accepted'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$
    select public.send_my_direct_message(
      '41000000-0000-4000-8000-000000000002',
      'Visible before block',
      '43000000-0000-4000-8000-000000000001'
    )
  $$,
  'connected member can send before blocking'
);
select is(
  (public.block_my_member('41000000-0000-4000-8000-000000000002', 'safety')).reason_category,
  'safety',
  'caller can create a categorized block'
);
select results_eq(
  $$select blocked_user_id from public.member_blocks$$,
  $$values ('41000000-0000-4000-8000-000000000002'::uuid)$$,
  'blocker sees only their caller-owned block row'
);
select results_eq(
  $$select count(*)::bigint from public.direct_messages$$,
  array[0::bigint],
  'existing direct-message history is hidden immediately after blocking'
);
select throws_ok(
  $$
    select public.send_my_direct_message(
      '41000000-0000-4000-8000-000000000002',
      'Blocked outbound',
      '43000000-0000-4000-8000-000000000002'
    )
  $$,
  '42501',
  'Messaging is unavailable for this member',
  'blocker cannot send while the block is active'
);
select throws_ok(
  $$select * from public.list_my_direct_conversation('41000000-0000-4000-8000-000000000002')$$,
  '42501',
  'Messaging is unavailable for this member',
  'blocker cannot bypass block through history RPC'
);
select ok(
  private.can_receive_dm_broadcast(
    'dm:41000000-0000-4000-8000-000000000001:41000000-0000-4000-8000-000000000002'
  ) = false,
  'active block denies the private direct-message topic'
);

set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000002';

select results_eq(
  $$select count(*)::bigint from public.member_blocks$$,
  array[0::bigint],
  'blocked member is not told who blocked them through table reads'
);
select results_eq(
  $$select count(*)::bigint from public.direct_messages$$,
  array[0::bigint],
  'blocked member cannot read the existing direct-message history'
);
select throws_ok(
  $$
    select public.send_my_direct_message(
      '41000000-0000-4000-8000-000000000001',
      'Blocked inbound',
      '43000000-0000-4000-8000-000000000003'
    )
  $$,
  '42501',
  'Messaging is unavailable for this member',
  'blocked member cannot send in the reverse direction'
);
select throws_ok(
  $$select public.mark_my_direct_conversation_read('41000000-0000-4000-8000-000000000001')$$,
  '42501',
  'Messaging is unavailable for this member',
  'blocked member cannot mutate read receipts'
);

set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000003';

select ok(
  private.can_receive_dm_broadcast(
    'dm:41000000-0000-4000-8000-000000000001:41000000-0000-4000-8000-000000000002'
  ) = false,
  'unrelated member cannot join another pair private topic'
);
select ok(
  private.can_receive_dm_broadcast('room:not-a-dm-topic') = false,
  'malformed private topics fail closed'
);

set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000001';

select is(
  public.unblock_my_member('41000000-0000-4000-8000-000000000002'),
  true,
  'blocker can remove their block'
);
select results_eq(
  $$select count(*)::bigint from public.direct_messages$$,
  array[1::bigint],
  'unblocking restores caller access to existing history'
);
select ok(
  private.can_receive_dm_broadcast(
    'dm:41000000-0000-4000-8000-000000000001:41000000-0000-4000-8000-000000000002'
  ),
  'unblocking restores participant authorization for the private topic'
);
select is(
  public.unblock_my_member('41000000-0000-4000-8000-000000000002'),
  false,
  'unblock is idempotent when no block remains'
);

select * from finish();
rollback;
