-- Composite indexes required by the I/O control-plane foreign-key paths.
--
-- The Supabase CLI is not available in this workspace, so this versioned
-- migration is created as a verified fallback after reviewing the remote
-- Performance Advisor output.

create index if not exists io_environments_project_workspace_idx
  on public.io_environments (project_id, workspace_id);

create index if not exists io_route_policies_environment_workspace_idx
  on public.io_route_policies (environment_id, workspace_id);

create index if not exists io_api_keys_project_workspace_idx
  on public.io_api_keys (project_id, workspace_id);

create index if not exists io_api_keys_environment_project_workspace_idx
  on public.io_api_keys (environment_id, project_id, workspace_id);

create index if not exists io_audit_events_project_workspace_idx
  on public.io_audit_events (project_id, workspace_id);

create index if not exists io_audit_events_environment_project_workspace_idx
  on public.io_audit_events (environment_id, project_id, workspace_id);
