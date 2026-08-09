BEGIN;

SET LOCAL search_path = public, extensions;

SELECT plan(30);

SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_catalog.pg_class
    WHERE oid = 'public.notifications'::regclass
  ),
  'notifications has row-level security enabled'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.notifications', 'SELECT'),
  'anonymous clients cannot select notifications'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.notifications', 'INSERT'),
  'anonymous clients cannot insert notifications'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.notifications', 'UPDATE'),
  'anonymous clients cannot update notifications'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.notifications', 'DELETE'),
  'anonymous clients cannot delete notifications'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.notifications', 'SELECT'),
  'authenticated clients can select notifications subject to RLS'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.notifications', 'INSERT'),
  'authenticated clients cannot insert notifications directly'
);
SELECT ok(
  has_column_privilege('authenticated', 'public.notifications', 'is_read', 'UPDATE'),
  'authenticated clients can update the read marker'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.notifications', 'message', 'UPDATE'),
  'authenticated clients cannot rewrite notification content'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.notifications', 'user_id', 'UPDATE'),
  'authenticated clients cannot transfer notification ownership'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.notifications', 'DELETE'),
  'authenticated clients cannot delete notifications'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.sync_notification_category()', 'EXECUTE'),
  'anonymous clients cannot invoke the category trigger helper'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.sync_notification_category()', 'EXECUTE'),
  'authenticated clients cannot invoke the category trigger helper'
);
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.notify_admins_on_open_vouch_request()',
    'EXECUTE'
  ),
  'anonymous clients cannot invoke the vouch notification trigger helper'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.notify_admins_on_open_vouch_request()',
    'EXECUTE'
  ),
  'authenticated clients cannot invoke the vouch notification trigger helper'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.send_notification(uuid,text,text,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot invoke the retired arbitrary notification RPC'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.send_notification(uuid,text,text,text)', 'EXECUTE'),
  'anonymous clients cannot invoke the legacy notification RPC'
);
SELECT ok(
  pg_catalog.strpos(
    COALESCE(
      pg_catalog.obj_description(
        'public.send_notification(uuid,text,text,text)'::regprocedure,
        'pg_proc'
      ),
      ''
    ),
    'RETIRED'
  ) > 0,
  'legacy notification RPC is explicitly documented as retired'
);

SELECT ok(
  pg_catalog.to_regclass('public.notifications_user_created_at_idx') IS NOT NULL,
  'recent owner notification index exists'
);
SELECT ok(
  pg_catalog.to_regclass('public.notifications_user_unread_created_at_idx') IS NOT NULL,
  'unread owner notification index exists'
);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  (
    '10000000-0000-4000-8000-000000000001'::uuid,
    'notification-owner-a@example.test',
    '{"display_name":"Notification Owner A"}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000002'::uuid,
    'notification-owner-b@example.test',
    '{"display_name":"Notification Owner B"}'::jsonb
  );

INSERT INTO public.notifications (id, user_id, type, message, link)
VALUES
  (
    '20000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000001'::uuid,
    'test_owner_a',
    'Owner A notification',
    '/app/notifications'
  ),
  (
    '20000000-0000-4000-8000-000000000002'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    'test_owner_b',
    'Owner B notification',
    '/app/notifications'
  );

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

SELECT results_eq(
  $$SELECT count(*)::bigint FROM public.notifications$$,
  ARRAY[1::bigint],
  'owner A sees only their notification'
);
SELECT results_eq(
  $$
    SELECT count(*)::bigint
    FROM public.notifications
    WHERE id = '20000000-0000-4000-8000-000000000002'::uuid
  $$,
  ARRAY[0::bigint],
  'owner A cannot read owner B notification'
);

SELECT lives_ok(
  $$
    UPDATE public.notifications
    SET is_read = true
    WHERE id = '20000000-0000-4000-8000-000000000001'::uuid
  $$,
  'owner A can mark their notification read'
);
SELECT results_eq(
  $$
    SELECT is_read
    FROM public.notifications
    WHERE id = '20000000-0000-4000-8000-000000000001'::uuid
  $$,
  ARRAY[true],
  'owner A read marker was persisted'
);
SELECT is_empty(
  $$
    UPDATE public.notifications
    SET is_read = true
    WHERE id = '20000000-0000-4000-8000-000000000002'::uuid
    RETURNING id
  $$,
  'owner A cannot mark owner B notification read'
);
SELECT throws_ok(
  $$
    UPDATE public.notifications
    SET message = 'rewritten'
    WHERE id = '20000000-0000-4000-8000-000000000001'::uuid
  $$,
  '42501',
  'permission denied for table notifications',
  'owner A cannot rewrite notification content'
);
SELECT throws_ok(
  $$
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      '10000000-0000-4000-8000-000000000001'::uuid,
      'forged',
      'forged notification'
    )
  $$,
  '42501',
  'permission denied for table notifications',
  'owner A cannot insert even a self-addressed notification directly'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.send_notification(uuid,text,text,text)',
    'EXECUTE'
  ),
  'legacy authenticated notification RPC remains unavailable during runtime checks'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

SELECT results_eq(
  $$SELECT count(*)::bigint FROM public.notifications$$,
  ARRAY[1::bigint],
  'owner B sees only their seed row after legacy cutover'
);
SELECT results_eq(
  $$
    SELECT count(*)::bigint
    FROM public.notifications
    WHERE user_id = '10000000-0000-4000-8000-000000000001'::uuid
  $$,
  ARRAY[0::bigint],
  'owner B cannot read owner A notification'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
