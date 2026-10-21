-- Extend the explicit portable export with the caller own group opt-in.
-- Existing reviewed dataset limits and the metadata-only file contract remain.
create or replace function private.build_account_export(_request_id uuid,_lease_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare subject uuid; dataset record; rows jsonb; body jsonb := '{}'::jsonb;
begin
  if not private.account_export_current(_request_id,_lease_token) then
    raise exception using errcode='40001',message='Privacy request is no longer current';
  end if;
  select requester_id into subject from private.privacy_execution_jobs where request_id=_request_id;
  -- These identifiers, predicates and columns are reviewed source literals.
  -- No browser input participates in dynamic SQL and new columns are excluded.
  for dataset in select * from (values
('public.profiles','public','profiles','"id","user_id","display_name","headline","bio","city","country","avatar_url","linkedin_url","website_url","orbit_segment","is_public","created_at","updated_at","is_verified","verified_at","verified_by","segment_details","region","timezone","notification_prefs","booking_url","segment_details_text"','user_id = $1'),
('public.asks_offers','public','asks_offers','"id","author_id","kind","title","body","segment_target","region","sector","expires_at","status","created_at","updated_at"','author_id = $1'),
('public.chapter_members','public','chapter_members','"chapter_id","user_id","role","membership_state","requested_at","left_at","request_message"','user_id = $1'),
('public.chapter_proposals','public','chapter_proposals','"id","proposed_name","city","country","rationale","proposer_background","proposed_stewards","status","submitted_at"','proposer_id = $1'),
('public.connection_requests','public','connection_requests','"id","sender_id","recipient_id","note","status","created_at","responded_at"','sender_id = $1 or recipient_id = $1'),
('public.conversation_messages','public','conversation_messages','"id","author_id","room_id","thread_id","content","created_at","edited_at","deleted_at","reply_to_message_id"','author_id = $1'),
('public.conversation_bookmarks','public','conversation_bookmarks','"user_id","message_id","created_at"','user_id = $1'),
('public.conversation_reactions','public','conversation_reactions','"message_id","user_id","reaction_key","created_at"','user_id = $1'),
('public.conversation_notification_preferences','public','conversation_notification_preferences','"user_id","space_id","room_id","preference","quiet_hours","updated_at","id"','user_id = $1'),
('public.conversation_read_states','public','conversation_read_states','"user_id","room_id","last_read_message_id","last_read_at","updated_at"','user_id = $1'),
('public.conversation_thread_follows','public','conversation_thread_follows','"thread_id","user_id","followed_at","last_read_message_id","last_read_at","updated_at"','user_id = $1'),
('public.direct_messages','public','direct_messages','"id","sender_id","recipient_id","content","created_at","read_at"','sender_id = $1 or recipient_id = $1'),
('public.endorsements','public','endorsements','"id","endorser_id","endorsee_id","note","segment","created_at"','endorser_id = $1'),
('public.event_rsvps','public','event_rsvps','"id","event_id","user_id","status","note","created_at","updated_at"','user_id = $1'),
('public.events','public','events','"id","title","description","start_time","end_time","timezone","location_type","public_location","registration_scope","visibility","capacity","requires_approval","status","lifecycle"','organizer_id = $1'),
('private.event_registrations','private','event_registrations','"id","event_id","user_id","status","approved_at","checked_in_at","created_at","updated_at"','user_id = $1'),
('public.lesson_progress','public','lesson_progress','"user_id","lesson_id","completed_at"','user_id = $1'),
('public.quiz_attempts','public','quiz_attempts','"id","user_id","quiz_id","score","passed","answers","created_at"','user_id = $1'),
('public.mission_members','public','mission_members','"mission_id","user_id","role","membership_state","message","requested_at","left_at"','user_id = $1'),
('public.mission_updates','public','mission_updates','"id","mission_id","author_id","content","created_at","is_pinned","client_request_id"','author_id = $1'),
('public.mentor_sessions','public','mentor_sessions','"id","expert_id","booker_id","duration_mins","message","status","meeting_url","scheduled_for","created_at","updated_at","client_request_id"','booker_id = $1 or expert_id = $1'),
('public.notifications','public','notifications','"id","user_id","type","message","link","is_read","created_at","category"','user_id = $1'),
('public.stories','public','stories','"id","author_id","title","content","status","created_at","published_at","mission_id","chapter_id"','author_id = $1'),
('public.resources','public','resources','"id","title","description","category","tags","kind","url","file_path","file_name","mime_type","chapter_id","created_by","status","created_at","updated_at"','created_by = $1'),
('public.lesson_attachments','public','lesson_attachments','"id","lesson_id","file_name","file_path","file_size","mime_type","uploaded_by","created_at"','uploaded_by = $1'),
('public.conversation_attachments','public','conversation_attachments','"id","message_id","file_name","content_type","byte_size","storage_bucket","storage_path","created_at","scan_status"','uploaded_by = $1'),
('public.member_location_shares','public','member_location_shares','"user_id","audience","precision","country_code","region_id","place_id","region_label","city_label","consent_version","shared_at","updated_at"','user_id = $1'),
('private.member_location_preferences','private','member_location_preferences','"user_id","country_code","legacy_country_label","region_label","city_label","timezone_name","legacy_timezone_label","use_for_scheduling","use_for_recommendations","source","consent_version","consented_at","created_at","updated_at"','user_id = $1'),
('private.community_onboarding_state','private','community_onboarding_state','"user_id","status","current_step","version","started_at","paused_at","completed_at","created_at","updated_at"','user_id = $1'),
('public.io_api_keys','public','io_api_keys','"id","name","workspace_id","created_at","expires_at","revoked_at","status","scopes"','created_by = $1'),
('public.io_route_receipts','public','io_route_receipts','"id","request_id","workspace_id","created_at","completed_at","selected_provider_key","selected_model_key","input_tokens","output_tokens","provider_cost_nanos","service_fee_nanos","customer_charge_nanos","result_state"','actor_user_id = $1'),
('public.io_usage_records','public','io_usage_records','"id","workspace_id","request_id","recorded_at","input_tokens","output_tokens","currency_code","provider_cost_nanos","service_fee_nanos","customer_charge_nanos","amount_due_nanos"','actor_user_id = $1'),
('public.io_terminal_sessions','public','io_terminal_sessions','"id","workspace_id","title","mode","state","created_at","started_at","completed_at"','created_by = $1'),
('public.account_privacy_requests','public','account_privacy_requests','"id","request_type","state","member_note","operator_note","submitted_at","updated_at","completed_at"','requester_id = $1'),
('public.conversation_space_memberships','public','conversation_space_memberships','"space_id","user_id","domain_role","membership_state","source_membership_version","joined_at","left_at","synced_at"','user_id = $1')
  ) as inventory(dataset_key,schema_name,table_name,column_list,predicate) loop
    execute format('select coalesce(jsonb_agg(to_jsonb(selected)),''[]''::jsonb) from (select %s from %I.%I where %s limit 10001) selected',
      dataset.column_list,dataset.schema_name,dataset.table_name,dataset.predicate) into rows using subject;
    if jsonb_array_length(rows)>10000 then raise exception using errcode='54000',message='Privacy export requires assisted delivery'; end if;
    body := body||jsonb_build_object(dataset.dataset_key,rows);
    if octet_length(body::text)>5000000 then raise exception using errcode='54000',message='Privacy export requires assisted delivery'; end if;
  end loop;
  return jsonb_build_object('format','indus-orbit-account-export','format_version',1,'policy_version','2026-10-15.1',
    'generated_at',now(),'subject_user_id',subject,
    'coverage',jsonb_build_object('kind','portable_account_data','binary_files','metadata_only',
      'supplements','Contact the privacy team for financial, security/case or other access-request supplements. Other guests, credentials and internal case evidence are excluded.'),
    'datasets',body);
end;
$$;

create function private.event_discussion_safety_action(_event_id uuid,_expected_user_id uuid,_message_id uuid,_action text,_category text,_reason text,_client_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rid uuid; report public.conversation_reports%rowtype;
begin
 if auth.uid() is null or auth.uid() is distinct from _expected_user_id or _client_request_id is null then raise exception using errcode='42501',message='Account changed; reopen this discussion'; end if;
 select room_id into rid from private.event_discussions where event_id=_event_id and enabled;
 if rid is null or not private.can_access_conversation_room(rid) or not exists(select 1 from public.conversation_messages where id=_message_id and room_id=rid and thread_id is null) then
 raise exception using errcode='42501',message='Message access is required'; end if;
 if _action='report' then
 if exists(select 1 from public.conversation_reports r where r.reporter_id=auth.uid() and r.client_request_id=_client_request_id
 and (r.message_id is distinct from _message_id or r.category is distinct from _category or r.description is distinct from btrim(_reason))) then
 raise exception using errcode='22023',message='Safety request ID was used for another report'; end if;
 select * into report from public.report_my_conversation_message(_message_id,_category,_reason,_client_request_id);
 return jsonb_build_object('action','reported','id',report.id);
 elsif _action in ('content_restrict','restore') then
 if not private.event_discussion_host(_event_id) then raise exception using errcode='42501',message='Event host moderation required'; end if;
 -- Reject retry-ID reuse for a different target/action. The shared historical
 -- moderator RPC returns a previous actor action before checking its target.
 if exists(select 1 from private.conversation_moderation_actions a where a.actor_id=auth.uid() and a.client_request_id=_client_request_id
 and (a.target_message_id is distinct from _message_id or a.action_type is distinct from _action or a.reason is distinct from btrim(_reason))) then
 raise exception using errcode='22023',message='Safety request ID was used for another action'; end if;
 return public.moderate_conversation_message(_message_id,_action,_reason,_client_request_id);
 end if;
 raise exception using errcode='22023',message='Invalid discussion safety action';
end;
$$;
revoke all on function private.event_discussion_safety_action(uuid,uuid,uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function private.event_discussion_safety_action(uuid,uuid,uuid,text,text,text,uuid) to authenticated;
create function public.event_discussion_safety_action(_event_id uuid,_expected_user_id uuid,_message_id uuid,_action text,_category text,_reason text,_client_request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$ begin return private.event_discussion_safety_action(_event_id,_expected_user_id,_message_id,_action,_category,_reason,_client_request_id); end; $$;
revoke all on function public.event_discussion_safety_action(uuid,uuid,uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.event_discussion_safety_action(uuid,uuid,uuid,text,text,text,uuid) to authenticated;
