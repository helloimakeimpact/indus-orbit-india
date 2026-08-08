BEGIN;

SET LOCAL search_path = public, extensions;

SELECT plan(38);

SELECT ok(
  (
    SELECT relation.relrowsecurity
    FROM pg_catalog.pg_class AS relation
    WHERE relation.oid = 'public.direct_messages'::regclass
  ),
  'direct messages keep row-level security enabled'
);

SELECT has_column(
  'public',
  'direct_messages',
  'client_request_id',
  'direct messages carry a caller idempotency key'
);

SELECT ok(
  pg_catalog.to_regclass('public.direct_messages_sender_client_request_key') IS NOT NULL,
  'sender idempotency key has a unique partial index'
);
SELECT ok(
  pg_catalog.to_regclass('public.direct_messages_conversation_recent_idx') IS NOT NULL,
  'conversation history has a recent-message index'
);
SELECT ok(
  pg_catalog.to_regclass('public.direct_messages_recipient_unread_idx') IS NOT NULL,
  'recipient unread lookup has a partial index'
);

SELECT has_function(
  'public',
  'send_my_direct_message',
  ARRAY['uuid', 'text', 'uuid'],
  'caller-bound direct-message send RPC exists'
);
SELECT has_function(
  'public',
  'mark_my_direct_conversation_read',
  ARRAY['uuid'],
  'caller-bound read receipt RPC exists'
);

SELECT ok(
  (
    SELECT pg_catalog.bool_and(proc.prosecdef)
    FROM pg_catalog.pg_proc AS proc
    WHERE proc.oid IN (
      'public.send_my_direct_message(uuid,text,uuid)'::regprocedure,
      'public.mark_my_direct_conversation_read(uuid)'::regprocedure
    )
  ),
  'direct-message RPCs use definer execution'
);

SELECT ok(
  (
    SELECT pg_catalog.count(*) = 2
      AND pg_catalog.bool_and(
        pg_catalog.replace(pg_catalog.split_part(setting, '=', 2), '"', '') = ''
      )
    FROM pg_catalog.pg_proc AS proc
    CROSS JOIN LATERAL pg_catalog.unnest(proc.proconfig) AS setting
    WHERE proc.oid IN (
      'public.send_my_direct_message(uuid,text,uuid)'::regprocedure,
      'public.mark_my_direct_conversation_read(uuid)'::regprocedure
    )
      AND pg_catalog.split_part(setting, '=', 1) = 'search_path'
  ),
  'direct-message RPCs pin an empty search path'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.send_my_direct_message(uuid,text,uuid)',
    'EXECUTE'
  ),
  'authenticated members can call the send RPC'
);
SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.mark_my_direct_conversation_read(uuid)',
    'EXECUTE'
  ),
  'authenticated members can call the read RPC'
);
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.send_my_direct_message(uuid,text,uuid)',
    'EXECUTE'
  ),
  'anonymous clients cannot call the send RPC'
);
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.mark_my_direct_conversation_read(uuid)',
    'EXECUTE'
  ),
  'anonymous clients cannot call the read RPC'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.direct_messages', 'INSERT'),
  'authenticated clients cannot insert message rows directly'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.direct_messages', 'UPDATE'),
  'authenticated clients cannot update message rows directly'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.direct_messages', 'SELECT'),
  'authenticated clients retain RLS-scoped message reads'
);

SELECT ok(
  (
    SELECT pg_catalog.strpos(
      pg_catalog.pg_get_expr(policy.polqual, policy.polrelid),
      'SELECT auth.uid()'
    ) > 0
    FROM pg_catalog.pg_policy AS policy
    WHERE policy.polrelid = 'public.direct_messages'::regclass
      AND policy.polname = 'Members view own direct messages'
  ),
  'message read policy caches caller identity with a scalar subquery'
);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  (
    '31000000-0000-4000-8000-000000000001'::uuid,
    'message-member-a@example.test',
    '{"display_name":"Message Member A"}'::jsonb
  ),
  (
    '31000000-0000-4000-8000-000000000002'::uuid,
    'message-member-b@example.test',
    '{"display_name":"Message Member B"}'::jsonb
  ),
  (
    '31000000-0000-4000-8000-000000000003'::uuid,
    'message-member-c@example.test',
    '{"display_name":"Message Member C"}'::jsonb
  ),
  (
    '31000000-0000-4000-8000-000000000004'::uuid,
    'message-member-d@example.test',
    '{"display_name":"Message Member D"}'::jsonb
  );

INSERT INTO public.connection_requests (
  id,
  sender_id,
  recipient_id,
  reason,
  note,
  status
)
VALUES
  (
    '32000000-0000-4000-8000-000000000001'::uuid,
    '31000000-0000-4000-8000-000000000001'::uuid,
    '31000000-0000-4000-8000-000000000002'::uuid,
    'collab',
    'Accepted direct-message contract fixture.',
    'accepted'
  ),
  (
    '32000000-0000-4000-8000-000000000002'::uuid,
    '31000000-0000-4000-8000-000000000003'::uuid,
    '31000000-0000-4000-8000-000000000004'::uuid,
    'collab',
    'Accepted rate-limit contract fixture.',
    'accepted'
  );

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

SELECT throws_ok(
  $$
    INSERT INTO public.direct_messages (sender_id, recipient_id, content)
    VALUES (
      '31000000-0000-4000-8000-000000000001'::uuid,
      '31000000-0000-4000-8000-000000000002'::uuid,
      'forged direct insert'
    )
  $$,
  '42501',
  'permission denied for table direct_messages',
  'member cannot bypass the send RPC with a direct insert'
);

SELECT lives_ok(
  $$
    SELECT public.send_my_direct_message(
      '31000000-0000-4000-8000-000000000002'::uuid,
      '  A private hello  ',
      '33000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'connected active member can send through the RPC'
);

SELECT results_eq(
  $$
    SELECT
      sender_id,
      recipient_id,
      content,
      client_request_id
    FROM public.direct_messages
    WHERE client_request_id = '33000000-0000-4000-8000-000000000001'::uuid
  $$,
  $$
    VALUES (
      '31000000-0000-4000-8000-000000000001'::uuid,
      '31000000-0000-4000-8000-000000000002'::uuid,
      'A private hello'::text,
      '33000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'send RPC binds the sender and trims the message'
);

RESET ROLE;

SELECT results_eq(
  $$
    SELECT
      count(*)::bigint,
      bool_and(type = 'direct_message'),
      bool_and(message = 'You have a new message.'),
      bool_and(position('private hello' IN lower(message)) = 0)
    FROM public.notifications
    WHERE user_id = '31000000-0000-4000-8000-000000000002'::uuid
  $$,
  $$VALUES (1::bigint, true, true, true)$$,
  'send creates one fixed notification without message content'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

SELECT lives_ok(
  $$
    SELECT public.send_my_direct_message(
      '31000000-0000-4000-8000-000000000002'::uuid,
      'A private hello',
      '33000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'an identical retry with the same client request ID succeeds'
);
SELECT results_eq(
  $$SELECT count(*)::bigint FROM public.direct_messages$$,
  ARRAY[1::bigint],
  'an identical retry does not duplicate the message'
);

RESET ROLE;
SELECT results_eq(
  $$
    SELECT count(*)::bigint
    FROM public.notifications
    WHERE user_id = '31000000-0000-4000-8000-000000000002'::uuid
  $$,
  ARRAY[1::bigint],
  'an identical retry does not duplicate the notification'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

SELECT throws_ok(
  $$
    SELECT public.send_my_direct_message(
      '31000000-0000-4000-8000-000000000002'::uuid,
      'Different content',
      '33000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  '22023',
  'Client request ID was already used for another message',
  'reusing an idempotency key for another payload is rejected'
);
SELECT throws_ok(
  $$
    SELECT public.send_my_direct_message(
      '31000000-0000-4000-8000-000000000003'::uuid,
      'No accepted connection',
      '33000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  '42501',
  'You can only message connected members',
  'unconnected members cannot be messaged'
);
SELECT throws_ok(
  $$
    SELECT public.send_my_direct_message(
      '31000000-0000-4000-8000-000000000001'::uuid,
      'Self message',
      '33000000-0000-4000-8000-000000000003'::uuid
    )
  $$,
  '22023',
  'You cannot message yourself',
  'self messaging is rejected'
);
SELECT throws_ok(
  $$
    SELECT public.send_my_direct_message(
      '31000000-0000-4000-8000-000000000002'::uuid,
      '   ',
      '33000000-0000-4000-8000-000000000004'::uuid
    )
  $$,
  '22023',
  'Message cannot be empty',
  'blank messages are rejected'
);
SELECT throws_ok(
  $$
    SELECT public.send_my_direct_message(
      '31000000-0000-4000-8000-000000000002'::uuid,
      repeat('x', 4001),
      '33000000-0000-4000-8000-000000000005'::uuid
    )
  $$,
  '22023',
  'Message cannot exceed 4,000 characters',
  'oversized messages are rejected'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000002';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

SELECT lives_ok(
  $$
    SELECT public.send_my_direct_message(
      '31000000-0000-4000-8000-000000000001'::uuid,
      'Reply from B',
      '33000000-0000-4000-8000-000000000006'::uuid
    )
  $$,
  'the connected member can reply through the same contract'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

SELECT results_eq(
  $$
    SELECT public.mark_my_direct_conversation_read(
      '31000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  ARRAY[1],
  'recipient marks exactly one inbound message read'
);
SELECT results_eq(
  $$
    SELECT (read_at IS NOT NULL)
    FROM public.direct_messages
    WHERE client_request_id = '33000000-0000-4000-8000-000000000006'::uuid
  $$,
  ARRAY[true],
  'inbound message read marker is persisted'
);
SELECT results_eq(
  $$
    SELECT (read_at IS NULL)
    FROM public.direct_messages
    WHERE client_request_id = '33000000-0000-4000-8000-000000000001'::uuid
  $$,
  ARRAY[true],
  'read RPC cannot mark the caller outbound message read'
);
SELECT results_eq(
  $$
    SELECT public.mark_my_direct_conversation_read(
      '31000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  ARRAY[0],
  'read RPC is idempotent when no unread rows remain'
);
SELECT throws_ok(
  $$
    UPDATE public.direct_messages
    SET read_at = now()
    WHERE client_request_id = '33000000-0000-4000-8000-000000000001'::uuid
  $$,
  '42501',
  'permission denied for table direct_messages',
  'member cannot bypass the read RPC with a direct update'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000003';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

SELECT results_eq(
  $$SELECT count(*)::bigint FROM public.direct_messages$$,
  ARRAY[0::bigint],
  'unrelated member cannot read another conversation'
);

RESET ROLE;

INSERT INTO public.member_suspensions (user_id, actor_id, reason)
VALUES (
  '31000000-0000-4000-8000-000000000002'::uuid,
  '31000000-0000-4000-8000-000000000003'::uuid,
  'Direct-message suspension contract fixture.'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

SELECT throws_ok(
  $$
    SELECT public.send_my_direct_message(
      '31000000-0000-4000-8000-000000000002'::uuid,
      'Blocked by recipient suspension',
      '33000000-0000-4000-8000-000000000007'::uuid
    )
  $$,
  '42501',
  'Messaging is unavailable for this member',
  'a suspended recipient cannot receive a new message'
);

RESET ROLE;

INSERT INTO public.direct_messages (
  sender_id,
  recipient_id,
  content,
  client_request_id,
  created_at
)
SELECT
  '31000000-0000-4000-8000-000000000003'::uuid,
  '31000000-0000-4000-8000-000000000004'::uuid,
  'Rate fixture ' || series.value,
  pg_catalog.gen_random_uuid(),
  pg_catalog.statement_timestamp()
FROM pg_catalog.generate_series(1, 30) AS series(value);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '31000000-0000-4000-8000-000000000003';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

SELECT throws_ok(
  $$
    SELECT public.send_my_direct_message(
      '31000000-0000-4000-8000-000000000004'::uuid,
      'Rate limited message',
      '33000000-0000-4000-8000-000000000008'::uuid
    )
  $$,
  'P0001',
  'Message rate limit reached; please wait a minute',
  'per-sender minute rate limit is enforced at the trusted boundary'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
