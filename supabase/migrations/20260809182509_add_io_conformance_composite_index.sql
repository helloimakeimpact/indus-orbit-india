-- Cover the composite endpoint/capability foreign key used to bind provider
-- conformance evidence. The single-column capability index cannot support the
-- full referential lookup order reported by the hosted Performance Advisor.

create index if not exists io_provider_conformance_runs_endpoint_capability_idx
  on private.io_provider_conformance_runs (endpoint_id, capability_version_id);
