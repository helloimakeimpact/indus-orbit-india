-- Keep admin-control-plane foreign-key lookups and cascades index-backed.
-- Partial indexes avoid storing rows where the optional actor is unknown.

create index if not exists admin_team_assignments_assigned_by_idx
  on private.admin_team_assignments (assigned_by);

create index if not exists admin_team_assignments_revoked_by_idx
  on private.admin_team_assignments (revoked_by)
  where revoked_by is not null;

create index if not exists admin_team_events_actor_time_idx
  on private.admin_team_events (actor_user_id, occurred_at desc);

create index if not exists io_provider_runtime_controls_updated_by_idx
  on private.io_provider_runtime_controls (updated_by)
  where updated_by is not null;

create index if not exists io_provider_control_events_actor_time_idx
  on private.io_provider_control_events (actor_user_id, occurred_at desc);
