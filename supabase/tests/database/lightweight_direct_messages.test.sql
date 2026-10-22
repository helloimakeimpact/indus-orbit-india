begin;
set local search_path=public,extensions;
select plan(61);

select ok((select bool_and(not p.prosecdef) from pg_proc p where p.oid in (
  'public.send_my_direct_message_v2(uuid,uuid,text,uuid)'::regprocedure,
  'public.list_my_direct_conversation_v2(uuid,uuid,timestamptz,uuid,integer)'::regprocedure,
  'public.list_my_direct_conversation_after_v2(uuid,uuid,timestamptz,uuid,integer)'::regprocedure,
  'public.mark_my_direct_conversation_read_v2(uuid,uuid,uuid)'::regprocedure,
  'public.list_my_direct_inbox_v2(uuid,timestamptz,uuid,uuid,integer)'::regprocedure,
  'public.list_my_direct_contacts_v2(uuid,text,text,uuid,integer,uuid)'::regprocedure
)), 'new browser contracts are invoker wrappers');
select ok(not has_function_privilege('anon','public.send_my_direct_message_v2(uuid,uuid,text,uuid)','execute'),'anonymous send is denied');
select ok(not has_function_privilege('anon','public.list_my_direct_inbox_v2(uuid,timestamptz,uuid,uuid,integer)','execute'),'anonymous inbox is denied');
select ok(not has_function_privilege('authenticated','private.require_dm_actor(uuid)','execute'),'private identity helper is not a browser endpoint');
select ok(not has_table_privilege('authenticated','public.direct_messages','insert'),'new UI cannot bypass sends with table inserts');
select ok(to_regclass('public.direct_messages_unread_pair_idx') is not null,'inbox counts have a recipient-peer partial index');

insert into auth.users(id,email,raw_user_meta_data)
select ('61000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,
  'lightweight-dm-'||g||'@example.test',jsonb_build_object('display_name','Contact '||lpad(g::text,3,'0'))
from generate_series(1,60) g;
insert into public.connection_requests(sender_id,recipient_id,reason,note,status)
select '61000000-0000-4000-8000-000000000001'::uuid,
  ('61000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,'collab','Synthetic bounded DM contact','accepted'
from generate_series(2,58) g;
-- More than one page of offline incoming messages; tied timestamps prove ID
-- tie-breaking, with unrelated third-party content in a separate pair.
insert into public.direct_messages(id,sender_id,recipient_id,content,created_at)
select ('62000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,
 '61000000-0000-4000-8000-000000000002'::uuid,'61000000-0000-4000-8000-000000000001'::uuid,
 'Backfill '||g,'2026-10-19T12:00:00Z'::timestamptz+(g/10)*interval '1 second'
from generate_series(1,121) g;
insert into public.direct_messages(id,sender_id,recipient_id,content,created_at) values
 ('62000000-0000-4000-8000-000000000201','61000000-0000-4000-8000-000000000003','61000000-0000-4000-8000-000000000001','Latest other peer','2026-10-20T12:00:00Z'),
 ('62000000-0000-4000-8000-000000000202','61000000-0000-4000-8000-000000000003','61000000-0000-4000-8000-000000000004','Outsider secret','2026-10-20T13:00:00Z');

set local role authenticated;
set local "request.jwt.claim.sub"='61000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role"='authenticated';

select throws_ok($$select public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000002')$$,'42501','Your account changed. Reopen Messages.','foreign expected inbox account is rejected');
select throws_ok($$select public.list_my_direct_conversation_v2('61000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000003')$$,'42501','Your account changed. Reopen Messages.','foreign expected history account is rejected');
select throws_ok($$select public.send_my_direct_message_v2('61000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000003','wrong account','63000000-0000-4000-8000-000000000001')$$,'42501','Your account changed. Reopen Messages.','foreign expected send cannot submit under the new account');
select throws_ok($$select public.mark_my_direct_conversation_read_v2('61000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000003','62000000-0000-4000-8000-000000000201')$$,'42501','Your account changed. Reopen Messages.','foreign expected read account is rejected');
select is((select count(*)::integer from public.list_my_direct_conversation_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002')),51,'history uses 50 plus one lookahead');
select is((select id from public.list_my_direct_conversation_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002') limit 1),'62000000-0000-4000-8000-000000000121'::uuid,'history starts at deterministic newest row');
select is((select count(*)::integer from public.list_my_direct_conversation_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000004')),0,'third-party conversation is never returned');
select throws_ok($$select public.list_my_direct_conversation_after_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002',null,null)$$,'22023','Conversation cursor must include timestamp and message ID','forward reconciliation requires a complete boundary');
select throws_ok($$select public.list_my_direct_conversation_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002',null,null,101)$$,'22023','Conversation page limit must be between 1 and 100','history rejects unbounded pages');
select is((select count(*)::integer from public.list_my_direct_conversation_after_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','2026-10-19T12:00:00Z','62000000-0000-4000-8000-000000000001')),51,'forward catch-up has a bounded lookahead page');
select is((select id from public.list_my_direct_conversation_after_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','2026-10-19T12:00:00Z','62000000-0000-4000-8000-000000000001') limit 1),'62000000-0000-4000-8000-000000000002'::uuid,'forward catch-up starts after the tied timestamp and ID');
select is((select count(*)::integer from public.list_my_direct_conversation_after_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','2026-10-19T12:00:10Z','62000000-0000-4000-8000-000000000101')),20,'forward catch-up reaches the final remainder without a fifty-row gap');
select is((select count(*)::integer from public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000001')),2,'inbox lists actual conversations, not all connections');
select is((select user_id from public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000001') limit 1),'61000000-0000-4000-8000-000000000003'::uuid,'inbox orders by last durable activity');
select is((select unread_count from public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000001') where user_id='61000000-0000-4000-8000-000000000002'),121::bigint,'inbox supplies caller-owned peer unread count');
select is((select last_message_content from public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000001') where user_id='61000000-0000-4000-8000-000000000002'),'Backfill 121','inbox preview matches the latest permitted message');
select is((select count(*)::integer from public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000001','2026-10-20T12:00:00Z','62000000-0000-4000-8000-000000000201','61000000-0000-4000-8000-000000000003')),1,'inbox keyset advances without repeating the boundary');
select throws_ok($$select public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000001',null,'62000000-0000-4000-8000-000000000201',null)$$,'22023','Inbox cursor is incomplete','partial inbox cursor is rejected');
select is((select count(*)::integer from public.list_my_direct_contacts_v2('61000000-0000-4000-8000-000000000001')),51,'contact picker fetches fifty plus lookahead');
select is((select count(*)::integer from public.list_my_direct_contacts_v2('61000000-0000-4000-8000-000000000001','','Contact 051','61000000-0000-4000-8000-000000000051')),7,'contact picker advances through accepted connections');
select is((select count(*)::integer from public.list_my_direct_contacts_v2('61000000-0000-4000-8000-000000000001','Contact 058')),1,'contact search can find a peer outside the first page');
select is((select count(*)::integer from public.list_my_direct_contacts_v2('61000000-0000-4000-8000-000000000001','',null,null,1,'61000000-0000-4000-8000-000000000058')),1,'cold deep link resolves one accepted connection');
select is((select count(*)::integer from public.list_my_direct_contacts_v2('61000000-0000-4000-8000-000000000001','',null,null,1,'61000000-0000-4000-8000-000000000059')),0,'cold deep link cannot expose an unconnected profile');
select throws_ok($$select public.list_my_direct_contacts_v2('61000000-0000-4000-8000-000000000001',repeat('x',81))$$,'22023','Choose a shorter search and valid contact page limit','contact search has a bounded query');
select throws_ok($$select public.mark_my_direct_conversation_read_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000202')$$,'22023','Choose a visible message from this conversation','read boundary rejects another pair message');
select throws_ok($$select public.mark_my_direct_conversation_read_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-999999999999')$$,'22023','Choose a visible message from this conversation','read boundary rejects unknown optimistic or forged identity');
select is(public.mark_my_direct_conversation_read_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000050'),50,'visible read advances only through the exact durable boundary');
select is((select unread_count from public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000001') where user_id='61000000-0000-4000-8000-000000000002'),71::bigint,'newer unseen messages stay unread');
select is(public.mark_my_direct_conversation_read_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000050'),0,'read boundary is replay-safe');
select lives_ok($$select public.send_my_direct_message_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','  one server message  ','63000000-0000-4000-8000-000000000001')$$,'expected-account send accepts and trims text');
select lives_ok($$select public.send_my_direct_message_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','one server message','63000000-0000-4000-8000-000000000001')$$,'uncertain-response retry reuses the same request');
select is((select count(*)::integer from public.direct_messages where client_request_id='63000000-0000-4000-8000-000000000001'),1,'retry creates one durable row');
select throws_ok($$select public.send_my_direct_message_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','different text','63000000-0000-4000-8000-000000000001')$$,'22023','Client request ID was already used for another message','request keys cannot be reused for different text');
select throws_ok($$select public.send_my_direct_message_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000059','not connected','63000000-0000-4000-8000-000000000002')$$,'42501','You can only message connected members','send still requires an accepted connection');

-- Other-side block hides both inbox and connection results without revealing
-- who blocked the caller in the owner-only block-management list.
set local "request.jwt.claim.sub"='61000000-0000-4000-8000-000000000003';
select lives_ok($$select public.block_my_member_v2('61000000-0000-4000-8000-000000000003','61000000-0000-4000-8000-000000000001')$$,'peer can block the conversation');
set local "request.jwt.claim.sub"='61000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000001')),1,'symmetric block removes inbox preview');
select is((select count(*)::integer from public.list_my_direct_contacts_v2('61000000-0000-4000-8000-000000000001','Contact 003')),0,'symmetric block removes picker result');
select is((select count(*)::integer from public.list_my_blocked_direct_contacts_v2('61000000-0000-4000-8000-000000000001')),0,'block list does not disclose another persons block');
select throws_ok($$select public.list_my_direct_conversation_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000003')$$,'42501','Messaging is unavailable for this member','blocked pair history fails closed');
select ok(not private.can_receive_dm_broadcast('dm:61000000-0000-4000-8000-000000000001:61000000-0000-4000-8000-000000000003'),'blocked pair cannot join private Broadcast');

-- Exercise inbox paging beyond the first fifty peers, with tied activity
-- timestamps. These are synthetic metadata fixtures, never real member sends.
reset role;
insert into public.direct_messages(id,sender_id,recipient_id,content,created_at)
select ('62000000-0000-4000-8000-'||lpad((300+g)::text,12,'0'))::uuid,
 ('61000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,'61000000-0000-4000-8000-000000000001'::uuid,
 'Inbox peer '||g,statement_timestamp()+interval '1 day' from generate_series(4,58) g;
set local role authenticated;
select is((select count(*)::integer from public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000001')),51,'many-peer inbox is bounded to fifty plus lookahead');
select is((select count(*)::integer from public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000001',
 (select created_at from public.direct_messages where id='62000000-0000-4000-8000-000000000309'),
 '62000000-0000-4000-8000-000000000309','61000000-0000-4000-8000-000000000009')),6,'inbox cursor reaches every remaining peer without repeating tied boundary');

reset role;
insert into private.account_closures(user_id,request_id,phase) values('61000000-0000-4000-8000-000000000001','64000000-0000-4000-8000-000000000001','frozen');
set local role authenticated;
select throws_ok($$select public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000001')$$,'42501','Messaging is unavailable for this account','closed caller cannot read inbox with a still-valid JWT');
select throws_ok($$select public.list_my_direct_conversation('61000000-0000-4000-8000-000000000002')$$,'42501','Messaging is unavailable for this account','legacy history cannot bypass account closure');
select throws_ok($$select public.send_my_direct_message('61000000-0000-4000-8000-000000000002','one server message','63000000-0000-4000-8000-000000000001')$$,'42501','Messaging is unavailable for this account','legacy idempotent replay cannot bypass account closure');
select is((select count(*)::integer from public.direct_messages),0,'direct table RLS rejects closed caller independent of API pre-hook');
select ok(not private.can_receive_dm_broadcast('dm:61000000-0000-4000-8000-000000000001:61000000-0000-4000-8000-000000000002'),'closed pair cannot join Broadcast');
reset role;
delete from private.account_closures where user_id='61000000-0000-4000-8000-000000000001';
insert into private.account_closures(user_id,request_id,phase) values('61000000-0000-4000-8000-000000000002','64000000-0000-4000-8000-000000000002','frozen');
set local role authenticated;
select throws_ok($$select public.list_my_direct_conversation_v2('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002')$$,'42501','Messaging is unavailable for this member','closed peer history is unavailable');
select is((select count(*)::integer from public.list_my_direct_inbox_v2('61000000-0000-4000-8000-000000000001') where user_id='61000000-0000-4000-8000-000000000002'),0,'closed peer is absent from inbox');
select is((select count(*)::integer from public.direct_messages where sender_id='61000000-0000-4000-8000-000000000002'),0,'raw table reads cannot bypass closed-peer history denial');
reset role;
delete from private.account_closures where user_id='61000000-0000-4000-8000-000000000002';
update auth.users set deleted_at=now() where id='61000000-0000-4000-8000-000000000058';
set local role authenticated;
select is((select count(*)::integer from public.list_my_direct_contacts_v2('61000000-0000-4000-8000-000000000001','Contact 058')),0,'Auth-deleted peer is absent from picker even without closure record');
select is((select count(*)::integer from public.direct_messages where sender_id='61000000-0000-4000-8000-000000000058'),0,'raw reads also hide externally Auth-deleted peers');
reset role;
insert into public.member_suspensions(user_id,reason,actor_id)
values ('61000000-0000-4000-8000-000000000001','Synthetic DM suspension','61000000-0000-4000-8000-000000000004');
set local role authenticated;
select throws_ok($$select public.list_my_direct_contacts_v2('61000000-0000-4000-8000-000000000001')$$,'42501','Messaging is unavailable for this account','suspended caller cannot use contact picker');
select throws_ok($$select public.mark_my_direct_conversation_read('61000000-0000-4000-8000-000000000002')$$,'42501','Messaging is unavailable for this account','legacy read cannot bypass suspension');
select is((select count(*)::integer from public.direct_messages),0,'direct table RLS also rejects suspended caller');
reset role;
select * from finish();
rollback;
