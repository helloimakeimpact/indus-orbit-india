-- Cover the final three foreign-key paths identified by the hosted Supabase
-- performance advisor. PostgreSQL does not create referencing-column indexes
-- automatically; these indexes bound joins and parent-row checks without
-- changing any RLS, grants or application behavior.

create index if not exists admin_root_change_requests_requested_by_idx
  on private.admin_root_change_requests (requested_by);

create index if not exists admin_root_change_requests_decided_by_idx
  on private.admin_root_change_requests (decided_by);

create index if not exists account_privacy_requests_assigned_to_idx
  on public.account_privacy_requests (assigned_to);

