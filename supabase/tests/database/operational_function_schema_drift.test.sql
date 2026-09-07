begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

select ok(
  position('message.content' in pg_get_functiondef(
    'public.admin_trust_case_queue(text,text,boolean,timestamptz,uuid,integer)'::regprocedure
  )) > 0,
  'trust queue reads the current conversation message content column'
);
select ok(
  position('message.body' in pg_get_functiondef(
    'public.admin_trust_case_queue(text,text,boolean,timestamptz,uuid,integer)'::regprocedure
  )) = 0,
  'trust queue contains no legacy conversation message body reference'
);
select ok(
  position($$intent.state = 'failed'$$ in pg_get_functiondef(
    'public.admin_io_payment_queue(integer)'::regprocedure
  )) > 0,
  'payment queue derives a failure timestamp from current payment state'
);
select ok(
  position('intent.failed_at' in pg_get_functiondef(
    'public.admin_io_payment_queue(integer)'::regprocedure
  )) = 0,
  'payment queue contains no removed failed_at reference'
);
select ok(
  position('event.actor_id = actor_id' in pg_get_functiondef(
    'public.reorder_managed_conversation_rooms(uuid,uuid[],uuid)'::regprocedure
  )) = 0,
  'Room reorder replay lookup has no ambiguous actor reference'
);
select ok(
  position('event.actor_id = actor_id' in pg_get_functiondef(
    'public.set_managed_conversation_room_archive(uuid,boolean,text,uuid)'::regprocedure
  )) = 0,
  'Room archive replay lookup has no ambiguous actor reference'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.admin_trust_case_queue(text,text,boolean,timestamptz,uuid,integer)',
    'EXECUTE'
  ),
  'anonymous callers cannot execute the trust queue'
);
select ok(
  not has_function_privilege('anon', 'public.admin_io_payment_queue(integer)', 'EXECUTE'),
  'anonymous callers cannot execute the payment queue'
);

select * from finish();
rollback;
