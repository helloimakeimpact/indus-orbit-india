-- Cover conformance audit foreign keys used by retention, deletion checks, and
-- operator investigations. Keep this as a follow-up migration so hosted schema
-- history remains append-only after the conformance workflow release.

create index if not exists io_provider_conformance_approvals_capability_version_idx
  on private.io_provider_conformance_approvals (capability_version_id);

create index if not exists io_provider_conformance_events_actor_user_idx
  on private.io_provider_conformance_events (actor_user_id);

create index if not exists io_provider_conformance_events_approval_idx
  on private.io_provider_conformance_events (approval_id);

create index if not exists io_provider_conformance_events_endpoint_idx
  on private.io_provider_conformance_events (endpoint_id);

