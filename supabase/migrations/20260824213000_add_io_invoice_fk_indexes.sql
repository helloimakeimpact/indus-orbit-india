-- Complete the covering-index set for invoice authority/evidence foreign keys.
-- These are separate from the workspace/state indexes because parent user or
-- tax-policy changes otherwise require a full invoice-table scan.
create index if not exists io_invoices_created_by_idx
  on public.io_invoices (created_by);
create index if not exists io_invoices_issued_by_idx
  on public.io_invoices (issued_by)
  where issued_by is not null;
create index if not exists io_invoices_tax_policy_version_idx
  on public.io_invoices (tax_policy_version_id)
  where tax_policy_version_id is not null;
