-- Optional event discussion uses the existing durable Room/message system.
-- No public guest identity or Chapter/Mission membership is projected into it.
alter table public.conversation_spaces add column event_id uuid unique references public.events(id) on delete cascade;
alter table public.conversation_spaces drop constraint conversation_spaces_source_type_check;
alter table public.conversation_spaces add constraint conversation_spaces_source_type_check check(source_type in ('chapter','mission','event'));
alter table public.conversation_spaces drop constraint conversation_spaces_source_check;
alter table public.conversation_spaces add constraint conversation_spaces_source_check check(
 (source_type='chapter' and chapter_id is not null and mission_id is null and event_id is null)
 or (source_type='mission' and mission_id is not null and chapter_id is null and event_id is null)
 or (source_type='event' and event_id is not null and chapter_id is null and mission_id is null and visibility='private' and join_policy='closed'));
create table private.event_discussions(
 event_id uuid primary key references public.events(id) on delete cascade,
 space_id uuid not null unique references public.conversation_spaces(id) on delete cascade,
 room_id uuid not null unique references public.conversation_rooms(id) on delete cascade,
 enabled boolean not null default false,
 version integer not null default 1 check(version>0),
 updated_at timestamptz not null default now()
);
alter table private.event_discussions enable row level security;
revoke all on private.event_discussions from public,anon,authenticated;

create function private.event_discussion_host(_event_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.account_access_open() and not public.is_suspended(auth.uid())
 and exists(select 1 from public.events e join auth.users u on u.id=e.organizer_id where e.id=_event_id and e.organizer_id=auth.uid()
 and u.deleted_at is null and private.event_can_manage(e.id,auth.uid()));
$$;
create function private.event_discussion_eligible(_event_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.account_access_open() and not public.is_suspended(auth.uid())
 and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null)
 and exists(select 1 from public.events e where e.id=_event_id and e.status='approved' and e.lifecycle='scheduled'
 and (private.event_discussion_host(e.id) or exists(select 1 from private.event_registrations r where r.event_id=e.id and r.user_id=auth.uid()
 and r.status='confirmed' and r.identity_erased_at is null and private.event_registration_eligible(r.id))));
$$;
create function private.event_discussion_access(_space_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.event_discussions d join public.conversation_space_memberships m on m.space_id=d.space_id
 where d.space_id=_space_id and d.enabled and m.user_id=auth.uid() and m.membership_state='active' and private.event_discussion_eligible(d.event_id));
$$;
revoke all on function private.event_discussion_host(uuid),private.event_discussion_eligible(uuid),private.event_discussion_access(uuid) from public,anon,authenticated;

create or replace function private.can_access_conversation_space(_space_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not public.is_suspended(auth.uid()) and private.account_access_open() and exists(
 select 1 from public.conversation_spaces s where s.id=_space_id and s.lifecycle_state<>'archived' and (
 (s.source_type='chapter' and exists(select 1 from public.chapter_members m where m.chapter_id=s.chapter_id and m.user_id=auth.uid() and m.membership_state='active'))
 or (s.source_type='mission' and exists(select 1 from public.mission_members m where m.mission_id=s.mission_id and m.user_id=auth.uid() and m.membership_state='active'))
 or (s.source_type='event' and private.event_discussion_access(s.id))));
$$;
create or replace function private.can_manage_conversation_space(_space_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not public.is_suspended(auth.uid()) and private.account_access_open() and exists(
 select 1 from public.conversation_spaces s where s.id=_space_id and (
 (s.source_type='chapter' and exists(select 1 from public.chapter_members m where m.chapter_id=s.chapter_id and m.user_id=auth.uid() and m.membership_state='active' and m.role in ('lead','steward')))
 or (s.source_type='mission' and exists(select 1 from public.mission_members m where m.mission_id=s.mission_id and m.user_id=auth.uid() and m.membership_state='active' and m.role in ('lead','coordinator')))
 or (s.source_type='event' and private.event_discussion_host(s.event_id) and private.event_discussion_access(s.id))));
$$;

-- Dynamic event authority is checked at INSERT even for the existing generic
-- send RPC. Lock order matches registration/cancellation (event then row).
create function private.guard_event_discussion_message() returns trigger language plpgsql security definer set search_path='' as $$
declare eid uuid; finish timestamptz;
begin
 select s.event_id into eid from public.conversation_rooms r join public.conversation_spaces s on s.id=r.space_id where r.id=new.room_id and s.source_type='event';
 if eid is null then return new; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('privacy-subject:'||new.author_id::text,0));
 perform 1 from auth.users where id=new.author_id for key share;
 select e.end_time into finish from public.events e where e.id=eid for update;
 if auth.uid() is distinct from new.author_id or not private.can_access_conversation_room(new.room_id) or now()>finish+interval '7 days' then
 raise exception using errcode='42501',message='Event discussion is unavailable for posting'; end if;
 return new;
end;
$$;
revoke all on function private.guard_event_discussion_message() from public,anon,authenticated;
create trigger guard_event_discussion_message before insert on public.conversation_messages for each row execute function private.guard_event_discussion_message();

create function private.get_event_discussion(_event_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d private.event_discussions%rowtype; host boolean; eligible boolean; joined boolean; can_link boolean:=false; finish timestamptz;
begin
 if auth.uid() is null or not private.account_access_open() or public.is_suspended(auth.uid()) then raise exception using errcode='42501',message='Sign in to your active account'; end if;
 select * into d from private.event_discussions where event_id=_event_id;
 select end_time into finish from public.events where id=_event_id;
 host:=private.event_discussion_host(_event_id); eligible:=private.event_discussion_eligible(_event_id);
 joined:=coalesce(private.event_discussion_access(d.space_id),false);
 if not eligible and d.enabled then
 select exists(select 1 from private.event_registrations r join auth.users u on lower(u.email)=r.guest_email
 join public.events e on e.id=r.event_id where r.event_id=_event_id and r.user_id is null and r.status='confirmed' and r.identity_erased_at is null
 and u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null and e.status='approved' and e.lifecycle='scheduled'
 and private.event_registration_eligible(r.id) and not exists(select 1 from private.event_registrations own where own.event_id=e.id and own.user_id=auth.uid())) into can_link;
 end if;
 return jsonb_build_object('eventId',_event_id,'enabled',coalesce(d.enabled,false),'version',coalesce(d.version,0),'canManage',host,
 'canJoin',coalesce(d.enabled,false) and (eligible or can_link),'joined',joined,'roomId',case when joined then d.room_id end,
 'canPost',joined and now()<=finish+interval '7 days','postingClosesAt',case when joined then finish+interval '7 days' end);
end;
$$;

create function private.set_event_discussion(_event_id uuid,_enabled boolean,_expected_version integer,_expected_user_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.events%rowtype; d private.event_discussions%rowtype; sid uuid; rid uuid;
begin
 if auth.uid() is null or auth.uid() is distinct from _expected_user_id or _enabled is null or _expected_version is null then raise exception using errcode='42501',message='Account changed; reopen this event'; end if;
 select * into e from public.events where id=_event_id for update;
 if not private.event_discussion_host(e.id) or e.status<>'approved' or e.lifecycle<>'scheduled' then raise exception using errcode='42501',message='Approved event host required'; end if;
 select * into d from private.event_discussions where event_id=e.id for update;
 if coalesce(d.version,0)<>_expected_version then raise exception using errcode='40001',message='Discussion changed; refresh before saving'; end if;
 if d.event_id is null then
 if not _enabled then return private.get_event_discussion(e.id); end if;
 insert into public.conversation_spaces(source_type,event_id,display_name,description,visibility,join_policy,blueprint_key,created_by)
 values('event',e.id,e.title,'Private discussion for confirmed event attendees','private','closed','event-discussion-v1',auth.uid()) returning id into sid;
 insert into public.conversation_rooms(space_id,system_key,display_name,room_type,visibility,posting_policy,created_by)
 values(sid,'event_discussion','Event discussion','conversation','members','members',auth.uid()) returning id into rid;
 insert into private.event_discussions(event_id,space_id,room_id,enabled) values(e.id,sid,rid,true) returning * into d;
 else update private.event_discussions set enabled=_enabled,version=version+1,updated_at=now() where event_id=e.id returning * into d; end if;
 insert into public.conversation_space_memberships(space_id,user_id,domain_role,membership_state,joined_at)
 values(d.space_id,auth.uid(),'host','active',now()) on conflict(space_id,user_id) do update set membership_state='active',left_at=null;
 insert into public.audit_log(actor_id,action,target_type,target_id) values(auth.uid(),case when _enabled then 'event.discussion_enabled' else 'event.discussion_disabled' end,'event',e.id);
 return private.get_event_discussion(e.id);
end;
$$;

create function private.join_event_discussion(_event_id uuid,_expected_user_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.event_discussions%rowtype; r private.event_registrations%rowtype; email_text text;
begin
 if auth.uid() is null or auth.uid() is distinct from _expected_user_id or not private.account_access_open() or public.is_suspended(auth.uid()) then raise exception using errcode='42501',message='Account changed; reopen this event'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('privacy-subject:'||auth.uid()::text,0));
 perform 1 from auth.users where id=auth.uid() for key share;
 perform 1 from public.events where id=_event_id for update;
 select * into d from private.event_discussions where event_id=_event_id and enabled;
 if not found then raise exception using errcode='42501',message='Discussion is not available'; end if;
 if not exists(select 1 from public.profiles where user_id=auth.uid()) then raise exception using errcode='42501',message='Complete your account before joining'; end if;
 if not private.event_discussion_eligible(_event_id) then
 select lower(email) into email_text from auth.users where id=auth.uid() and email_confirmed_at is not null and deleted_at is null;
 if not exists(select 1 from private.event_registrations where event_id=_event_id and user_id=auth.uid()) then
 select * into r from private.event_registrations where event_id=_event_id and user_id is null and guest_email=email_text and status='confirmed' and identity_erased_at is null for update;
 if found and private.event_registration_eligible(r.id) then update private.event_registrations set user_id=auth.uid(),updated_at=now() where id=r.id; end if;
 end if;
 end if;
 if not private.event_discussion_eligible(_event_id) then raise exception using errcode='42501',message='A confirmed eligible registration is required'; end if;
 insert into public.conversation_space_memberships(space_id,user_id,domain_role,membership_state,joined_at)
 values(d.space_id,auth.uid(),case when private.event_discussion_host(_event_id) then 'host' else 'attendee' end,'active',now())
 on conflict(space_id,user_id) do update set membership_state='active',joined_at=coalesce(public.conversation_space_memberships.joined_at,now()),left_at=null;
 return private.get_event_discussion(_event_id);
end;
$$;

create function private.revoke_event_discussion_registration() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.user_id is not null and (tg_op='DELETE' or new.user_id is distinct from old.user_id or new.status<>'confirmed' or new.identity_erased_at is not null) then
 update public.conversation_space_memberships set membership_state='left',left_at=now() where user_id=old.user_id and space_id in(select space_id from private.event_discussions where event_id=old.event_id);
 end if;
 return null;
end;
$$;
revoke all on function private.revoke_event_discussion_registration() from public,anon,authenticated;
create trigger revoke_event_discussion_registration after update or delete on private.event_registrations for each row execute function private.revoke_event_discussion_registration();

create function private.list_my_community_chat_links() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(links) order by links.title,links.id),'[]'::jsonb) from (
 select s.id,s.display_name as title,s.source_type as kind,s.id as "spaceId",r.id as "roomId",s.event_id as "eventId"
 from public.conversation_spaces s join lateral(select room.id from public.conversation_rooms room where room.space_id=s.id and room.archived_at is null and private.can_access_conversation_room(room.id) order by room.position,room.id limit 1) r on true
 where private.can_access_conversation_space(s.id) and s.source_type in ('chapter','mission','event') order by s.display_name,s.id limit 24) links;
$$;

-- Public wrappers keep the privileged implementation outside the exposed schema.
revoke all on function private.get_event_discussion(uuid),private.set_event_discussion(uuid,boolean,integer,uuid),private.join_event_discussion(uuid,uuid),private.list_my_community_chat_links() from public,anon,authenticated;
grant execute on function private.get_event_discussion(uuid),private.set_event_discussion(uuid,boolean,integer,uuid),private.join_event_discussion(uuid,uuid),private.list_my_community_chat_links() to authenticated;
create function public.get_event_discussion(_event_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$ begin return private.get_event_discussion(_event_id); end; $$;
create function public.set_event_discussion(_event_id uuid,_enabled boolean,_expected_version integer,_expected_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$ begin return private.set_event_discussion(_event_id,_enabled,_expected_version,_expected_user_id); end; $$;
create function public.join_event_discussion(_event_id uuid,_expected_user_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$ begin return private.join_event_discussion(_event_id,_expected_user_id); end; $$;
create function public.list_my_community_chat_links() returns jsonb language plpgsql security invoker set search_path='' as $$ begin return private.list_my_community_chat_links(); end; $$;
revoke all on function public.get_event_discussion(uuid),public.set_event_discussion(uuid,boolean,integer,uuid),public.join_event_discussion(uuid,uuid),public.list_my_community_chat_links() from public,anon,authenticated;
grant execute on function public.get_event_discussion(uuid),public.set_event_discussion(uuid,boolean,integer,uuid),public.join_event_discussion(uuid,uuid),public.list_my_community_chat_links() to authenticated;

create function private.send_event_discussion_message(_event_id uuid,_expected_user_id uuid,_content text,_client_request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; message public.conversation_messages%rowtype;
begin
 if auth.uid() is null or auth.uid() is distinct from _expected_user_id then raise exception using errcode='42501',message='Account changed; reopen this discussion'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('privacy-subject:'||auth.uid()::text,0));
 perform 1 from auth.users where id=auth.uid() for key share;
 perform 1 from public.events where id=_event_id for update;
 select room_id into rid from private.event_discussions where event_id=_event_id and enabled;
 if rid is null then raise exception using errcode='42501',message='Discussion is not available'; end if;
 select * into message from public.send_my_conversation_message(rid,null,_content,_client_request_id);
 return message.id;
end;
$$;
revoke all on function private.send_event_discussion_message(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function private.send_event_discussion_message(uuid,uuid,text,uuid) to authenticated;
create function public.send_event_discussion_message(_event_id uuid,_expected_user_id uuid,_content text,_client_request_id uuid) returns uuid language plpgsql security invoker set search_path='' as $$ begin return private.send_event_discussion_message(_event_id,_expected_user_id,_content,_client_request_id); end; $$;
revoke all on function public.send_event_discussion_message(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.send_event_discussion_message(uuid,uuid,text,uuid) to authenticated;

create function private.mark_event_discussion_read(_event_id uuid,_expected_user_id uuid,_message_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare rid uuid;
begin
 if auth.uid() is null or auth.uid() is distinct from _expected_user_id then raise exception using errcode='42501',message='Account changed; reopen this discussion'; end if;
 select room_id into rid from private.event_discussions where event_id=_event_id and enabled;
 if rid is null or not private.can_access_conversation_room(rid) then raise exception using errcode='42501',message='Discussion is not available'; end if;
 perform public.mark_my_conversation_room_read(rid,_message_id);
end;
$$;
revoke all on function private.mark_event_discussion_read(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function private.mark_event_discussion_read(uuid,uuid,uuid) to authenticated;
create function public.mark_event_discussion_read(_event_id uuid,_expected_user_id uuid,_message_id uuid) returns void language plpgsql security invoker set search_path='' as $$ begin perform private.mark_event_discussion_read(_event_id,_expected_user_id,_message_id); end; $$;
revoke all on function public.mark_event_discussion_read(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.mark_event_discussion_read(uuid,uuid,uuid) to authenticated;

-- An inclusive upper anchor refreshes an older visible window without jumping
-- to the latest page. The shared Room feed remains the sole history projection.
create function private.list_event_discussion_feed(_event_id uuid,_expected_user_id uuid,_limit integer default 50,_before_created_at timestamptz default null,_before_id uuid default null,_through_created_at timestamptz default null,_through_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rid uuid; boundary public.conversation_messages%rowtype; payload jsonb; newer boolean:=false;
begin
 if auth.uid() is null or auth.uid() is distinct from _expected_user_id then raise exception using errcode='42501',message='Account changed; reopen this discussion'; end if;
 if _limit is null or _limit not between 1 and 100 or (_before_created_at is null)<>(_before_id is null)
 or (_through_created_at is null)<>(_through_id is null) or (_before_id is not null and _through_id is not null) then
 raise exception using errcode='22023',message='Invalid discussion history page'; end if;
 select room_id into rid from private.event_discussions where event_id=_event_id and enabled;
 if rid is null or not private.can_access_conversation_room(rid) then raise exception using errcode='42501',message='Discussion is not available'; end if;
 if _through_id is not null then
 select * into boundary from public.conversation_messages where room_id=rid and thread_id is null and (created_at,id)>(_through_created_at,_through_id) order by created_at,id limit 1;
 newer:=found;
 if newer then _before_created_at:=boundary.created_at; _before_id:=boundary.id; end if;
 end if;
 payload:=public.list_my_conversation_room_feed(rid,null,_limit,_before_created_at,_before_id);
 return payload||jsonb_build_object('newerAvailable',newer);
end;
$$;
revoke all on function private.list_event_discussion_feed(uuid,uuid,integer,timestamptz,uuid,timestamptz,uuid) from public,anon,authenticated;
grant execute on function private.list_event_discussion_feed(uuid,uuid,integer,timestamptz,uuid,timestamptz,uuid) to authenticated;
create function public.list_event_discussion_feed(_event_id uuid,_expected_user_id uuid,_limit integer default 50,_before_created_at timestamptz default null,_before_id uuid default null,_through_created_at timestamptz default null,_through_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$ begin return private.list_event_discussion_feed(_event_id,_expected_user_id,_limit,_before_created_at,_before_id,_through_created_at,_through_id); end; $$;
revoke all on function public.list_event_discussion_feed(uuid,uuid,integer,timestamptz,uuid,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.list_event_discussion_feed(uuid,uuid,integer,timestamptz,uuid,timestamptz,uuid) to authenticated;
