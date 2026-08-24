-- Keep the cross-domain audit reader aligned with the finance domain introduced
-- by the billing control plane. This remains a redacted, capability-checked view.
create or replace function public.admin_operation_event_queue(
  _domains text[] default null,
  _before_occurred_at timestamptz default null,
  _before_id bigint default null,
  _limit integer default 25
)
returns table (
  event_id bigint,
  actor_display_name text,
  capability text,
  domain text,
  action text,
  target_type text,
  target_id uuid,
  reason text,
  metadata jsonb,
  occurred_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  bounded_limit integer := coalesce(_limit, 25);
begin
  if not private.has_admin_capability(caller_id, 'audit.read') then
    raise exception 'Audit access required' using errcode = '42501';
  end if;
  if bounded_limit < 1 or bounded_limit > 100 then
    raise exception 'Audit queue limit must be between 1 and 100';
  end if;
  if (_before_occurred_at is null) <> (_before_id is null) then
    raise exception 'Audit queue cursor is incomplete';
  end if;
  if _domains is not null and (
    pg_catalog.cardinality(_domains) < 1
    or pg_catalog.cardinality(_domains) > 7
    or exists (
      select 1
      from pg_catalog.unnest(_domains) as selected_domain
      where selected_domain is null
        or selected_domain not in ('trust', 'members', 'content', 'programs', 'io', 'billing', 'team')
    )
  ) then
    raise exception 'Audit domain filter is invalid';
  end if;

  return query
  select
    event.id,
    coalesce(profile.display_name, 'Administrator'),
    event.capability,
    event.domain,
    event.action,
    event.target_type,
    event.target_id,
    event.reason,
    event.metadata,
    event.occurred_at
  from private.admin_operation_events as event
  left join public.profiles as profile on profile.user_id = event.actor_user_id
  where (_domains is null or event.domain = any (_domains))
    and (
      _before_occurred_at is null
      or (event.occurred_at, event.id) < (_before_occurred_at, _before_id)
    )
  order by event.occurred_at desc, event.id desc
  limit bounded_limit;
end;
$function$;

revoke all on function public.admin_operation_event_queue(text[], timestamptz, bigint, integer)
  from public, anon;
grant execute on function public.admin_operation_event_queue(text[], timestamptz, bigint, integer)
  to authenticated, service_role;

-- Payment identifiers are exposed only to finance operators so a refund can be
-- initiated from a selected captured payment instead of a copied arbitrary ID.
create or replace function public.admin_io_payment_queue(_limit integer default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if not private.has_admin_capability(caller_id, 'billing.read') then
    raise exception 'Billing read access required' using errcode = '42501';
  end if;
  if _limit not between 1 and 200 then
    raise exception 'Payment queue limit must be between 1 and 200';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'paymentIntentId', intent.id,
      'invoiceId', intent.invoice_id,
      'invoiceNumber', invoice.invoice_number,
      'workspaceId', intent.workspace_id,
      'workspaceName', workspace.name,
      'provider', intent.provider_key,
      'environment', intent.environment,
      'state', intent.state,
      'currencyCode', intent.currency_code,
      'amountNanos', intent.amount_nanos::text,
      'amountMinor', intent.amount_minor::text,
      'externalOrderId', intent.external_order_id,
      'externalPaymentId', intent.external_payment_id,
      'createdAt', intent.created_at,
      'capturedAt', intent.captured_at,
      'failedAt', intent.failed_at,
      'expiresAt', intent.expires_at
    ) order by intent.created_at desc, intent.id desc)
    from (
      select source.*
      from public.io_payment_intents as source
      order by source.created_at desc, source.id desc
      limit _limit
    ) as intent
    join public.io_invoices as invoice on invoice.id = intent.invoice_id
    join public.io_workspaces as workspace on workspace.id = intent.workspace_id
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.admin_io_payment_queue(integer) from public, anon;
grant execute on function public.admin_io_payment_queue(integer) to authenticated, service_role;

comment on function public.admin_io_payment_queue(integer) is
  'Finance-only payment evidence used for selected refunds and settlement review; no credentials or raw provider payloads are returned.';
