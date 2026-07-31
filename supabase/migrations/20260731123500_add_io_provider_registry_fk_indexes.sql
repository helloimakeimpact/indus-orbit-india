-- Cover every provider-registry foreign key not already covered by the
-- catalogue/endpoint indexes introduced with the base registry migration.

create index io_providers_created_by_idx
  on public.io_providers (created_by);

create index io_models_created_by_idx
  on public.io_models (created_by);

create index io_model_endpoints_created_by_idx
  on public.io_model_endpoints (created_by);

create index io_endpoint_capability_versions_verified_by_idx
  on public.io_endpoint_capability_versions (verified_by)
  where verified_by is not null;

create index io_endpoint_pricing_versions_recorded_by_idx
  on public.io_endpoint_pricing_versions (recorded_by)
  where recorded_by is not null;

create index io_provider_conformance_runs_capability_version_idx
  on private.io_provider_conformance_runs (capability_version_id)
  where capability_version_id is not null;

create index io_provider_conformance_runs_run_by_idx
  on private.io_provider_conformance_runs (run_by)
  where run_by is not null;
