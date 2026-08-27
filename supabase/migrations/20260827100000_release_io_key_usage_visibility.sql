-- Expose caller-bound, browser-safe API-key usage windows without granting
-- access to service-only counters, reservations, raw keys or key hashes.

create or replace function public.list_my_io_api_key_usage(_workspace_id uuid)
returns table (
  api_key_id uuid,
  minute_request_count integer,
  day_request_count integer,
  month_request_count integer,
  day_reserved_nanos text,
  day_spent_nanos text,
  month_reserved_nanos text,
  month_spent_nanos text,
  minute_reset_at timestamptz,
  day_reset_at timestamptz,
  month_reset_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  minute_start timestamptz := pg_catalog.date_trunc('minute', statement_timestamp());
  day_start timestamptz := pg_catalog.date_trunc('day', statement_timestamp());
  month_start timestamptz := pg_catalog.date_trunc('month', statement_timestamp());
  day_started_on date := (statement_timestamp() at time zone 'UTC')::date;
  month_started_on date := pg_catalog.date_trunc(
    'month', statement_timestamp() at time zone 'UTC'
  )::date;
begin
  if (select auth.uid()) is null or not private.io_workspace_has_role(_workspace_id, null) then
    raise exception 'Active workspace membership required' using errcode = '42501';
  end if;

  return query
  select
    key.id,
    coalesce(minute_window.request_count, 0),
    coalesce(day_window.request_count, 0),
    coalesce(month_window.request_count, 0),
    coalesce(day_spend.reserved_nanos, 0)::text,
    coalesce(day_spend.spent_nanos, 0)::text,
    coalesce(month_spend.reserved_nanos, 0)::text,
    coalesce(month_spend.spent_nanos, 0)::text,
    minute_start + interval '1 minute',
    day_start + interval '1 day',
    month_start + interval '1 month'
  from public.io_api_keys as key
  left join private.io_api_key_request_windows_v2 as minute_window
    on minute_window.api_key_id = key.id
   and minute_window.period_kind = 'minute'
   and minute_window.period_started_at = minute_start
  left join private.io_api_key_request_windows_v2 as day_window
    on day_window.api_key_id = key.id
   and day_window.period_kind = 'day'
   and day_window.period_started_at = day_start
  left join private.io_api_key_request_windows_v2 as month_window
    on month_window.api_key_id = key.id
   and month_window.period_kind = 'month'
   and month_window.period_started_at = month_start
  left join private.io_api_key_spend_windows as day_spend
    on day_spend.api_key_id = key.id
   and day_spend.period_kind = 'day'
   and day_spend.period_started_on = day_started_on
   and day_spend.currency_code = key.spend_currency_code
  left join private.io_api_key_spend_windows as month_spend
    on month_spend.api_key_id = key.id
   and month_spend.period_kind = 'month'
   and month_spend.period_started_on = month_started_on
   and month_spend.currency_code = key.spend_currency_code
  where key.workspace_id = _workspace_id
  order by key.created_at desc, key.id desc;
end;
$function$;

revoke all on function public.list_my_io_api_key_usage(uuid) from public, anon;
grant execute on function public.list_my_io_api_key_usage(uuid) to authenticated, service_role;

comment on function public.list_my_io_api_key_usage(uuid) is
  'Caller-bound current request/spend windows for workspace API keys. No credential or request content is returned.';
