-- Root platform authority must not be self-service browser data.
--
-- The former role-management screen inserted and deleted public.user_roles
-- directly. Keep role visibility for caller-bound authorization checks, but
-- remove browser DML. Scoped admin-team duties use admin_set_team_role(),
-- which validates a legacy super-admin caller and appends a private event.

revoke insert, update, delete on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.user_roles to service_role;

comment on table public.user_roles is
  'Platform roles. Browser roles may read only rows permitted by RLS; root-role mutation is service-side/out-of-band until the MFA and two-person approval workflow is implemented.';
