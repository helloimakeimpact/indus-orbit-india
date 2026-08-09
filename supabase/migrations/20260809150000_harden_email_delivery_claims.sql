-- Close two operational edge cases discovered by the post-release advisors:
-- index the outbox recipient foreign key and prevent jobs without a deliverable
-- account email from being leased until their retry budget is exhausted.

create index if not exists email_delivery_outbox_recipient_user_idx
  on private.email_delivery_outbox (recipient_user_id);

create or replace function public.respond_to_my_connection_request(
  _request_id uuid,
  _status text
)
returns public.connection_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := auth.uid();
  _request public.connection_requests%rowtype;
begin
  if _actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if _status is null or _status not in ('accepted', 'declined', 'withdrawn') then
    raise exception using errcode = '22023', message = 'Choose a valid request response';
  end if;

  select request.*
  into _request
  from public.connection_requests as request
  where request.id = _request_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Connection request not found';
  end if;
  if _request.status <> 'pending' then
    if _request.status = _status
      and ((_status = 'withdrawn' and _request.sender_id = _actor_id)
        or (_status in ('accepted', 'declined') and _request.recipient_id = _actor_id)) then
      return _request;
    end if;
    raise exception using errcode = '22023', message = 'Connection request is already resolved';
  end if;

  if _status = 'withdrawn' and _request.sender_id <> _actor_id then
    raise exception using errcode = '42501', message = 'Only the sender can withdraw this request';
  end if;
  if _status in ('accepted', 'declined') and _request.recipient_id <> _actor_id then
    raise exception using errcode = '42501', message = 'Only the recipient can respond to this request';
  end if;

  update public.connection_requests as request
  set status = _status,
      responded_at = pg_catalog.statement_timestamp()
  where request.id = _request.id
  returning * into _request;

  if _status = 'accepted' then
    insert into public.notifications (user_id, type, message, link)
    values (
      _request.sender_id,
      'connection_accepted',
      'Your connection request was accepted.',
      '/app/directory'
    );
  end if;

  return _request;
end;
$$;

create or replace function public.claim_email_delivery_batch(
  _limit integer default 10
)
returns table (
  id uuid,
  lease_token uuid,
  recipient_email text,
  template_key text,
  template_data jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;

  update private.email_delivery_outbox as outbox
  set status = 'dead',
      last_error = 'Recipient has no deliverable email address',
      lease_token = null,
      leased_at = null,
      updated_at = pg_catalog.statement_timestamp()
  from auth.users as user_row
  where user_row.id = outbox.recipient_user_id
    and user_row.email is null
    and outbox.status in ('pending', 'processing');

  return query
  with due as (
    select outbox.id
    from private.email_delivery_outbox as outbox
    join auth.users as user_row on user_row.id = outbox.recipient_user_id
    where user_row.email is not null
      and (
        (outbox.status = 'pending' and outbox.next_attempt_at <= pg_catalog.statement_timestamp())
        or (outbox.status = 'processing'
          and outbox.leased_at < pg_catalog.statement_timestamp() - interval '10 minutes')
      )
      and outbox.attempt_count < 5
    order by outbox.next_attempt_at, outbox.created_at
    for update of outbox skip locked
    limit greatest(1, least(coalesce(_limit, 10), 50))
  ), claimed as (
    update private.email_delivery_outbox as outbox
    set status = 'processing',
        attempt_count = outbox.attempt_count + 1,
        lease_token = gen_random_uuid(),
        leased_at = pg_catalog.statement_timestamp(),
        updated_at = pg_catalog.statement_timestamp()
    from due
    where outbox.id = due.id
    returning outbox.*
  )
  select
    claimed.id,
    claimed.lease_token,
    user_row.email::text,
    claimed.template_key,
    claimed.template_data
  from claimed
  join auth.users as user_row on user_row.id = claimed.recipient_user_id;
end;
$$;

comment on function public.claim_email_delivery_batch(integer) is
  'Service-only, leased fixed-template email claims. Missing-email recipients fail closed as dead jobs.';
