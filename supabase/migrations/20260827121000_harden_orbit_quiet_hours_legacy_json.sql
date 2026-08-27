-- Legacy quiet_hours values were unconstrained JSON. Keep the resolver
-- fail-safe if an older row contains malformed boolean or integer text.

create or replace function private.resolve_conversation_notification_delivery(
  _user_id uuid,
  _space_id uuid,
  _room_id uuid,
  _at timestamptz default statement_timestamp()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  _preference text := 'default';
  _quiet jsonb := '{}'::jsonb;
  _timezone text := 'UTC';
  _quiet_enabled boolean := false;
  _quiet_start time;
  _quiet_end time;
  _digest_hour integer := 8;
  _local_now timestamp;
  _local_target timestamp;
  _quiet_active boolean := false;
  _next_delivery_at timestamptz;
  _digest_at timestamptz;
begin
  select preference.preference, preference.quiet_hours
  into _preference, _quiet
  from public.conversation_notification_preferences as preference
  where preference.user_id = _user_id
    and preference.space_id = _space_id
    and (preference.room_id = _room_id or preference.room_id is null)
  order by (preference.room_id is not null) desc, preference.updated_at desc
  limit 1;

  _preference := coalesce(_preference, 'default');
  _quiet := case
    when pg_catalog.jsonb_typeof(coalesce(_quiet, '{}'::jsonb)) = 'object'
      then coalesce(_quiet, '{}'::jsonb)
    else '{}'::jsonb
  end;
  _timezone := coalesce(nullif(_quiet ->> 'timezone', ''), 'UTC');
  if not exists (
    select 1 from pg_catalog.pg_timezone_names as zone where zone.name = _timezone
  ) then
    _timezone := 'UTC';
  end if;
  _quiet_enabled := coalesce(_quiet ->> 'enabled', 'false') = 'true';
  _digest_hour := case
    when coalesce(_quiet ->> 'digestHour', '') ~ '^[0-9]{1,2}$'
      then greatest(0, least(23, (_quiet ->> 'digestHour')::integer))
    else 8
  end;
  _local_now := _at at time zone _timezone;

  if _quiet_enabled
     and coalesce(_quiet ->> 'start', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     and coalesce(_quiet ->> 'end', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    _quiet_start := (_quiet ->> 'start')::time;
    _quiet_end := (_quiet ->> 'end')::time;
    if _quiet_start < _quiet_end then
      _quiet_active := _local_now::time >= _quiet_start and _local_now::time < _quiet_end;
      _local_target := _local_now::date + _quiet_end;
    else
      _quiet_active := _local_now::time >= _quiet_start or _local_now::time < _quiet_end;
      _local_target := _local_now::date + _quiet_end
        + case when _local_now::time >= _quiet_start then interval '1 day' else interval '0' end;
    end if;
    if _quiet_active then
      _next_delivery_at := _local_target at time zone _timezone;
    end if;
  end if;

  if _preference = 'digest' then
    _local_target := _local_now::date + pg_catalog.make_interval(hours => _digest_hour);
    if _local_target <= _local_now then
      _local_target := _local_target + interval '1 day';
    end if;
    _digest_at := _local_target at time zone _timezone;
    _next_delivery_at := case
      when _next_delivery_at is null then _digest_at
      else greatest(_next_delivery_at, _digest_at)
    end;
  end if;

  return pg_catalog.jsonb_build_object(
    'preference', _preference,
    'quietHours', _quiet,
    'quietActive', _quiet_active,
    'nextDeliveryAt', _next_delivery_at
  );
end;
$function$;
