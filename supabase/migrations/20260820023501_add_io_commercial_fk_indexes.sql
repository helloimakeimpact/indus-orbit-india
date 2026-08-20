create index io_providers_commercial_terms_reviewed_by_idx
  on public.io_providers (commercial_terms_reviewed_by)
  where commercial_terms_reviewed_by is not null;

create index io_service_fee_policies_created_by_idx
  on private.io_service_fee_policies (created_by)
  where created_by is not null;
