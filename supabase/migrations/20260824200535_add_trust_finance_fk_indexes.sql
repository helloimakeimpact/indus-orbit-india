-- Cover foreign keys added by the trust and finance releases. Besides join
-- speed, these keep parent-row updates/deletes from scanning whole child tables.
create index if not exists conversation_attachment_scan_events_attachment_idx
  on private.conversation_attachment_scan_events (attachment_id);
create index if not exists io_payment_events_intent_idx
  on private.io_payment_events (payment_intent_id);
create index if not exists io_payment_processor_configs_created_by_idx
  on private.io_payment_processor_configs (created_by);
create index if not exists io_payment_processor_configs_approved_by_idx
  on private.io_payment_processor_configs (approved_by)
  where approved_by is not null;

create index if not exists conversation_attachments_reviewed_by_idx
  on public.conversation_attachments (reviewed_by)
  where reviewed_by is not null;
create index if not exists conversation_moderation_appeals_decided_by_idx
  on public.conversation_moderation_appeals (decided_by)
  where decided_by is not null;
create index if not exists io_billing_profiles_verified_by_idx
  on public.io_billing_profiles (verified_by)
  where verified_by is not null;
create index if not exists io_fx_rate_versions_created_by_idx
  on public.io_fx_rate_versions (created_by);
create index if not exists io_fx_rate_versions_approved_by_idx
  on public.io_fx_rate_versions (approved_by)
  where approved_by is not null;
create index if not exists io_payment_intents_created_by_idx
  on public.io_payment_intents (created_by);
create index if not exists io_payment_intents_processor_config_idx
  on public.io_payment_intents (processor_config_id);
create index if not exists io_provider_reconciliation_results_attempt_idx
  on public.io_provider_reconciliation_results (attempt_id)
  where attempt_id is not null;
create index if not exists io_provider_reconciliation_results_receipt_idx
  on public.io_provider_reconciliation_results (receipt_id)
  where receipt_id is not null;
create index if not exists io_provider_reconciliation_results_statement_line_idx
  on public.io_provider_reconciliation_results (statement_line_id);
create index if not exists io_provider_reconciliation_runs_run_by_idx
  on public.io_provider_reconciliation_runs (run_by);
create index if not exists io_provider_reconciliation_runs_statement_idx
  on public.io_provider_reconciliation_runs (statement_id);
create index if not exists io_provider_statements_imported_by_idx
  on public.io_provider_statements (imported_by);
create index if not exists io_refunds_payment_intent_idx
  on public.io_refunds (payment_intent_id);
create index if not exists io_refunds_workspace_idx
  on public.io_refunds (workspace_id);
create index if not exists io_tax_policy_versions_created_by_idx
  on public.io_tax_policy_versions (created_by);
create index if not exists io_tax_policy_versions_approved_by_idx
  on public.io_tax_policy_versions (approved_by)
  where approved_by is not null;
