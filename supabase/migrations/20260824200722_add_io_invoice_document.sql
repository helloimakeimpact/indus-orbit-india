create or replace function public.get_my_io_invoice_document(_invoice_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  invoice_row public.io_invoices%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into invoice_row from public.io_invoices where id = _invoice_id;
  if not found
    or not private.io_workspace_has_role(invoice_row.workspace_id, null)
    or invoice_row.state = 'draft' then
    raise exception 'Issued invoice access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', invoice_row.id,
    'invoiceNumber', invoice_row.invoice_number,
    'currencyCode', invoice_row.currency_code,
    'periodStart', invoice_row.period_start,
    'periodEnd', invoice_row.period_end,
    'state', invoice_row.state,
    'paymentState', invoice_row.payment_state,
    'providerCostNanos', invoice_row.provider_cost_nanos::text,
    'serviceFeeNanos', invoice_row.service_fee_nanos::text,
    'subtotalNanos', invoice_row.subtotal_nanos::text,
    'creditAppliedNanos', invoice_row.credit_applied_nanos::text,
    'taxNanos', invoice_row.tax_nanos::text,
    'roundingNanos', invoice_row.rounding_nanos::text,
    'totalNanos', invoice_row.total_nanos::text,
    'amountDueNanos', invoice_row.amount_due_nanos::text,
    'paidNanos', invoice_row.paid_nanos::text,
    'refundedNanos', invoice_row.refunded_nanos::text,
    'taxStatus', invoice_row.tax_status,
    'supplyKind', invoice_row.supply_kind,
    'seller', invoice_row.seller_snapshot,
    'buyer', invoice_row.buyer_snapshot,
    'taxEvidenceUrl', invoice_row.tax_evidence_url,
    'issuedAt', invoice_row.issued_at,
    'dueAt', invoice_row.due_at,
    'voidedAt', invoice_row.voided_at,
    'voidReason', invoice_row.void_reason,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', line.id::text,
        'providerKey', line.provider_key,
        'modelKey', line.model_key,
        'providerCostNanos', line.provider_cost_nanos::text,
        'serviceFeeNanos', line.service_fee_nanos::text,
        'customerChargeNanos', line.customer_charge_nanos::text,
        'creditAppliedNanos', line.credit_applied_nanos::text,
        'amountDueNanos', line.amount_due_nanos::text,
        'inputTokens', line.input_tokens,
        'outputTokens', line.output_tokens,
        'usageRecordedAt', line.usage_recorded_at
      ) order by line.id)
      from public.io_invoice_lines as line
      where line.invoice_id = invoice_row.id
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.get_my_io_invoice_document(uuid) from public, anon;
grant execute on function public.get_my_io_invoice_document(uuid) to authenticated, service_role;

comment on function public.get_my_io_invoice_document(uuid) is
  'Returns the immutable issued invoice representation and redacted usage lines to an active workspace member; drafts are never represented as tax invoices.';
