begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(23);

select has_column('public', 'io_payment_intents', 'provider_receipt', 'payment receipt is retained');
select has_column('public', 'io_payment_intents', 'checkout_payment_id', 'verified checkout payment is retained');
select has_column('public', 'io_payment_intents', 'checkout_signature_sha256', 'only checkout signature hash is retained');
select has_column('public', 'io_payment_intents', 'checkout_verified_at', 'checkout verification time is retained');
select has_column('private', 'io_payment_events', 'environment', 'payment events are environment-bound');

select has_column('public', 'io_invoices', 'source_currency_code', 'invoice records source currency');
select has_column('public', 'io_invoices', 'fx_rate_version_id', 'invoice records approved FX version');
select has_column('public', 'io_invoices', 'fx_rate_numerator', 'invoice snapshots FX numerator');
select has_column('public', 'io_invoices', 'fx_rate_denominator', 'invoice snapshots FX denominator');
select has_column('public', 'io_invoice_lines', 'source_amount_due_nanos', 'invoice lines preserve source amount');

select ok(
  to_regprocedure('public.get_my_io_payment_verification_context(uuid)') is not null,
  'caller-bound checkout verification context exists'
);
select ok(
  to_regprocedure('public.record_io_checkout_verification(uuid,text,text,text)') is not null,
  'service-only checkout verification recorder exists'
);
select ok(
  to_regprocedure('public.record_io_payment_provider_event(text,text,text,text,text,text,text,bigint,text,text,timestamptz)') is not null,
  'environment-bound provider event recorder exists'
);
select ok(
  to_regprocedure('public.admin_io_create_fx_draft_invoice(uuid,text,text,uuid,timestamptz,timestamptz,text)') is not null,
  'approved-FX invoice draft function exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_my_io_payment_verification_context(uuid)',
    'execute'
  ),
  'authenticated caller can obtain only their checkout verification context'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.record_io_checkout_verification(uuid,text,text,text)',
    'execute'
  ),
  'browser caller cannot record server verification evidence'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.record_io_checkout_verification(uuid,text,text,text)',
    'execute'
  ),
  'payment service can record verified checkout evidence'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.io_convert_nanos(bigint,bigint,bigint)',
    'execute'
  ),
  'browser caller cannot invoke private FX arithmetic directly'
);

select ok(
  exists (
    select 1 from pg_catalog.pg_indexes
    where schemaname = 'public'
      and indexname = 'io_payment_intents_one_open_per_invoice'
      and indexdef like '%WHERE (state = ANY%'
  ),
  'one-open-checkout partial unique index exists'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_indexes
    where schemaname = 'private'
      and indexname = 'io_payment_events_one_capture_per_payment'
  ),
  'captured-payment semantic idempotency index exists'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_indexes
    where schemaname = 'private'
      and indexname = 'io_payment_events_one_processed_per_refund'
  ),
  'processed-refund semantic idempotency index exists'
);

select ok(
  not has_table_privilege('authenticated', 'public.io_payment_intents', 'insert')
    and not has_table_privilege('authenticated', 'public.io_payment_intents', 'update'),
  'browser callers cannot mutate payment intents directly'
);
select ok(
  not has_table_privilege('authenticated', 'private.io_payment_events', 'select')
    and not has_table_privilege('authenticated', 'private.io_payment_events', 'insert'),
  'browser callers cannot read or write signed provider events'
);

select * from finish();
rollback;
