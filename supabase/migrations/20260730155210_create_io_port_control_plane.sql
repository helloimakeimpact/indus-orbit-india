-- I/O Port control plane: first safe, additive slice.
--
-- This migration is intentionally local-only until the remote migration history
-- has been reconciled. It creates tenant boundaries, capacity provenance,
-- versioned routing policy, hashed API-key metadata, and append-only audit data.
-- It does not store raw I/O keys, provider credentials, provider endpoints, or
-- confidential commercial terms.

create schema if not exists private;

-- The private schema must not be added to the Supabase Data API exposed schemas.
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.io_workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  -- Soft links are upgraded to foreign keys below when the corresponding tables
  -- exist. They remain nullable because an I/O workspace need not be governed by
  -- a chapter or mission.
  chapter_id uuid,
  mission_id uuid,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_workspaces_slug_format_check check (
    char_length(slug) between 3 and 63
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint io_workspaces_name_length_check check (char_length(btrim(name)) between 2 and 120),
  constraint io_workspaces_description_length_check check (
    description is null or char_length(description) <= 2000
  ),
  constraint io_workspaces_status_check check (
    status in ('active', 'suspended', 'archived')
  ),
  constraint io_workspaces_slug_key unique (slug)
);

comment on table public.io_workspaces is
  'Tenant boundary for I/O Port. A workspace can optionally belong to an existing Indus Orbit chapter or mission.';

-- Local migration history currently does not create chapters/missions even
-- though the connected schema and generated types contain them. Conditional
-- constraints allow a clean local replay while preserving referential integrity
-- on a reconciled/live schema where those tables exist.
do $migration$
begin
  if to_regclass('public.chapters') is not null then
    alter table public.io_workspaces
      add constraint io_workspaces_chapter_id_fkey
      foreign key (chapter_id) references public.chapters(id) on delete set null;
  end if;

  if to_regclass('public.missions') is not null then
    alter table public.io_workspaces
      add constraint io_workspaces_mission_id_fkey
      foreign key (mission_id) references public.missions(id) on delete set null;
  end if;
end
$migration$;

create table public.io_workspace_members (
  workspace_id uuid not null references public.io_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'developer',
  status text not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  constraint io_workspace_members_role_check check (
    role in ('owner', 'admin', 'developer', 'analyst', 'billing', 'viewer')
  ),
  constraint io_workspace_members_status_check check (
    status in ('pending', 'active', 'suspended')
  )
);

comment on table public.io_workspace_members is
  'Workspace-scoped I/O roles. Platform roles remain in public.user_roles and are not duplicated here.';

create table public.io_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  status text not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_projects_slug_format_check check (
    char_length(slug) between 2 and 63
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint io_projects_name_length_check check (char_length(btrim(name)) between 2 and 120),
  constraint io_projects_description_length_check check (
    description is null or char_length(description) <= 2000
  ),
  constraint io_projects_status_check check (status in ('active', 'paused', 'archived')),
  constraint io_projects_workspace_slug_key unique (workspace_id, slug),
  constraint io_projects_id_workspace_key unique (id, workspace_id)
);

create table public.io_environments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete cascade,
  project_id uuid not null,
  slug text not null,
  name text not null,
  environment_type text not null default 'development',
  status text not null default 'active',
  monthly_budget_inr numeric(14, 2),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_environments_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.io_projects(id, workspace_id)
    on delete cascade,
  constraint io_environments_slug_format_check check (
    char_length(slug) between 2 and 63
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint io_environments_name_length_check check (char_length(btrim(name)) between 2 and 120),
  constraint io_environments_type_check check (
    environment_type in ('development', 'preview', 'staging', 'production', 'custom')
  ),
  constraint io_environments_status_check check (status in ('active', 'paused', 'archived')),
  constraint io_environments_monthly_budget_check check (
    monthly_budget_inr is null or monthly_budget_inr >= 0
  ),
  constraint io_environments_project_slug_key unique (project_id, slug),
  constraint io_environments_id_workspace_key unique (id, workspace_id),
  constraint io_environments_id_project_workspace_key unique (id, project_id, workspace_id)
);

create table public.io_capacity_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  display_name text not null,
  operator_name text not null,
  provenance text not null,
  procurement_model text not null,
  access_mode text not null default 'pooled',
  status text not null default 'onboarding',
  region_code text,
  data_residency_country text,
  valid_from timestamptz,
  valid_until timestamptz,
  -- Only non-secret facts suitable for a member-facing provenance card belong
  -- here (for example accelerator family, renewable-energy claim, or unit count).
  public_capacity_metadata jsonb not null default '{}'::jsonb,
  public_notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_capacity_sources_key_format_check check (
    char_length(source_key) between 3 and 80
    and source_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint io_capacity_sources_display_name_check check (
    char_length(btrim(display_name)) between 2 and 120
  ),
  constraint io_capacity_sources_operator_name_check check (
    char_length(btrim(operator_name)) between 2 and 160
  ),
  constraint io_capacity_sources_provenance_check check (
    provenance in (
      'partner_provider',
      'owned_server',
      'rented_server',
      'donated_server',
      'donated_capacity',
      'sponsored_capacity'
    )
  ),
  constraint io_capacity_sources_procurement_model_check check (
    procurement_model in (
      'revenue_share',
      'committed_spend',
      'pay_as_you_go',
      'owned',
      'donated',
      'sponsored',
      'grant_funded'
    )
  ),
  constraint io_capacity_sources_access_mode_check check (
    access_mode in ('pooled', 'dedicated', 'reserved', 'burst')
  ),
  constraint io_capacity_sources_status_check check (
    status in ('planned', 'onboarding', 'active', 'degraded', 'paused', 'retired')
  ),
  constraint io_capacity_sources_region_code_check check (
    region_code is null or char_length(region_code) between 2 and 32
  ),
  constraint io_capacity_sources_country_check check (
    data_residency_country is null
    or data_residency_country ~ '^[A-Z]{2}$'
  ),
  constraint io_capacity_sources_dates_check check (
    valid_until is null or valid_from is null or valid_until > valid_from
  ),
  constraint io_capacity_sources_metadata_object_check check (
    jsonb_typeof(public_capacity_metadata) = 'object'
  ),
  constraint io_capacity_sources_public_notes_check check (
    public_notes is null or char_length(public_notes) <= 2000
  )
);

comment on table public.io_capacity_sources is
  'Non-secret provenance for partner, owned, rented, donated, and sponsored compute/API capacity. Credentials, endpoints, confidential rates, and contracts must live in a server-side secret/contract store.';

comment on column public.io_capacity_sources.provenance is
  'How capacity entered the I/O pool: commercial provider partnership, owned/rented hardware, or donated/sponsored server capacity.';

comment on column public.io_capacity_sources.status is
  'Operational lifecycle only. planned/onboarding are not routable; degraded may be routed by an explicit policy; paused/retired are not routable.';

create table public.io_workspace_capacity_grants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete cascade,
  capacity_source_id uuid not null references public.io_capacity_sources(id) on delete restrict,
  grant_kind text not null,
  status text not null default 'pending',
  priority smallint not null default 100,
  routing_weight numeric(8, 5) not null default 1,
  quota_amount numeric(20, 6),
  quota_unit text,
  valid_from timestamptz,
  valid_until timestamptz,
  sponsor_label text,
  public_terms_note text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_workspace_capacity_grants_kind_check check (
    grant_kind in (
      'commercial_entitlement',
      'internal_allocation',
      'donation',
      'sponsorship',
      'grant_funded'
    )
  ),
  constraint io_workspace_capacity_grants_status_check check (
    status in ('pending', 'active', 'exhausted', 'suspended', 'expired')
  ),
  constraint io_workspace_capacity_grants_priority_check check (priority between 1 and 1000),
  constraint io_workspace_capacity_grants_weight_check check (routing_weight >= 0),
  constraint io_workspace_capacity_grants_quota_check check (
    (quota_amount is null and quota_unit is null)
    or (
      quota_amount is not null
      and quota_amount >= 0
      and quota_unit in ('requests', 'input_tokens', 'output_tokens', 'compute_seconds', 'credits_inr')
    )
  ),
  constraint io_workspace_capacity_grants_dates_check check (
    valid_until is null or valid_from is null or valid_until > valid_from
  ),
  constraint io_workspace_capacity_grants_sponsor_label_check check (
    sponsor_label is null or char_length(sponsor_label) <= 160
  ),
  constraint io_workspace_capacity_grants_public_terms_check check (
    public_terms_note is null or char_length(public_terms_note) <= 2000
  )
);

comment on table public.io_workspace_capacity_grants is
  'Member-visible entitlement connecting a workspace to capacity. Confidential partnership pricing and legal terms are intentionally excluded.';

create table public.io_route_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete cascade,
  environment_id uuid not null,
  version integer not null,
  name text not null,
  description text,
  state text not null default 'draft',
  policy_document jsonb not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  activated_by uuid references auth.users(id) on delete restrict,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint io_route_policies_environment_workspace_fkey
    foreign key (environment_id, workspace_id)
    references public.io_environments(id, workspace_id)
    on delete cascade,
  constraint io_route_policies_version_check check (version > 0),
  constraint io_route_policies_name_check check (char_length(btrim(name)) between 2 and 120),
  constraint io_route_policies_description_check check (
    description is null or char_length(description) <= 2000
  ),
  constraint io_route_policies_state_check check (state in ('draft', 'active', 'retired')),
  constraint io_route_policies_document_object_check check (
    jsonb_typeof(policy_document) = 'object'
  ),
  constraint io_route_policies_activation_check check (
    (state = 'draft' and activated_by is null and activated_at is null)
    or (state in ('active', 'retired') and activated_by is not null and activated_at is not null)
  ),
  constraint io_route_policies_environment_version_key unique (environment_id, version)
);

comment on table public.io_route_policies is
  'Immutable-by-convention policy versions. Browser clients may edit drafts; activation/retirement must be an audited server transaction.';

create table public.io_api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.io_workspaces(id) on delete cascade,
  project_id uuid,
  environment_id uuid,
  name text not null,
  -- key_prefix is a non-secret lookup/display prefix. The random secret suffix is
  -- returned once by the server and never persisted in this database.
  key_prefix text not null unique,
  last_four text not null,
  key_hash bytea not null unique,
  hash_algorithm text not null default 'sha256',
  hash_version smallint not null default 1,
  scopes text[] not null default array['inference:invoke']::text[],
  status text not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint io_api_keys_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.io_projects(id, workspace_id)
    on delete cascade,
  constraint io_api_keys_environment_project_workspace_fkey
    foreign key (environment_id, project_id, workspace_id)
    references public.io_environments(id, project_id, workspace_id)
    on delete cascade,
  constraint io_api_keys_name_check check (char_length(btrim(name)) between 2 and 120),
  constraint io_api_keys_prefix_check check (
    char_length(key_prefix) between 12 and 80
    and key_prefix ~ '^io_(test|live)_[A-Za-z0-9_-]+$'
  ),
  constraint io_api_keys_last_four_check check (
    char_length(last_four) = 4 and last_four ~ '^[A-Za-z0-9_-]{4}$'
  ),
  constraint io_api_keys_hash_check check (octet_length(key_hash) = 32),
  constraint io_api_keys_hash_algorithm_check check (hash_algorithm = 'sha256'),
  constraint io_api_keys_hash_version_check check (hash_version > 0),
  constraint io_api_keys_scopes_check check (
    cardinality(scopes) between 1 and 32
    and array_position(scopes, null) is null
    and scopes <@ array[
      'inference:invoke',
      'models:read',
      'usage:read',
      'sessions:read',
      'sessions:write'
    ]::text[]
  ),
  constraint io_api_keys_status_check check (status in ('active', 'revoked', 'expired')),
  constraint io_api_keys_scope_hierarchy_check check (
    environment_id is null or project_id is not null
  ),
  constraint io_api_keys_expiry_check check (expires_at is null or expires_at > created_at),
  constraint io_api_keys_revocation_check check (
    (status = 'revoked' and revoked_at is not null)
    or (status <> 'revoked' and revoked_at is null)
  )
);

comment on table public.io_api_keys is
  'I/O key metadata and SHA-256 hashes of cryptographically random, high-entropy keys. Raw keys are never stored. Provider credentials never belong here.';

comment on column public.io_api_keys.key_hash is
  'Exactly 32 bytes: SHA-256 of a server-generated random key. Only trusted server code may read this column.';

create table public.io_audit_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.io_workspaces(id) on delete restrict,
  project_id uuid,
  environment_id uuid,
  actor_kind text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  api_key_id uuid references public.io_api_keys(id) on delete set null,
  event_type text not null,
  request_id uuid,
  source_ip_hash text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint io_audit_events_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.io_projects(id, workspace_id)
    on delete restrict,
  constraint io_audit_events_environment_project_workspace_fkey
    foreign key (environment_id, project_id, workspace_id)
    references public.io_environments(id, project_id, workspace_id)
    on delete restrict,
  constraint io_audit_events_actor_kind_check check (
    actor_kind in ('user', 'api_key', 'system', 'provider')
  ),
  constraint io_audit_events_actor_check check (
    (actor_kind = 'user' and actor_user_id is not null)
    or (actor_kind = 'api_key' and api_key_id is not null)
    or (actor_kind in ('system', 'provider'))
  ),
  constraint io_audit_events_type_check check (
    char_length(event_type) between 3 and 100
    and event_type ~ '^[a-z][a-z0-9_.-]+$'
  ),
  constraint io_audit_events_source_ip_hash_check check (
    source_ip_hash is null or char_length(source_ip_hash) between 32 and 128
  ),
  constraint io_audit_events_payload_object_check check (jsonb_typeof(payload) = 'object'),
  constraint io_audit_events_scope_hierarchy_check check (
    environment_id is null or project_id is not null
  )
);

comment on table public.io_audit_events is
  'Append-only control-plane audit events. Authentication material, prompts, model responses, and raw IP addresses must not be placed in payload.';

-- Foreign-key, authorization-path, and primary access-pattern indexes.
create index io_workspaces_created_by_idx on public.io_workspaces (created_by);
create index io_workspaces_chapter_id_idx on public.io_workspaces (chapter_id) where chapter_id is not null;
create index io_workspaces_mission_id_idx on public.io_workspaces (mission_id) where mission_id is not null;
create index io_workspace_members_user_active_idx
  on public.io_workspace_members (user_id, workspace_id, role)
  where status = 'active';
create index io_workspace_members_invited_by_idx
  on public.io_workspace_members (invited_by)
  where invited_by is not null;
create index io_projects_created_by_idx on public.io_projects (created_by);
create index io_projects_workspace_status_idx on public.io_projects (workspace_id, status, created_at desc);
create index io_environments_created_by_idx on public.io_environments (created_by);
create index io_environments_workspace_status_idx
  on public.io_environments (workspace_id, status, created_at desc);
create index io_capacity_sources_created_by_idx on public.io_capacity_sources (created_by);
create index io_capacity_sources_routable_idx
  on public.io_capacity_sources (status, provenance, data_residency_country)
  where status in ('active', 'degraded');
create index io_workspace_capacity_grants_source_status_idx
  on public.io_workspace_capacity_grants (capacity_source_id, status, workspace_id);
create index io_workspace_capacity_grants_workspace_status_idx
  on public.io_workspace_capacity_grants (workspace_id, status, priority, created_at desc);
create index io_workspace_capacity_grants_created_by_idx
  on public.io_workspace_capacity_grants (created_by);
create unique index io_workspace_capacity_grants_one_active_idx
  on public.io_workspace_capacity_grants (workspace_id, capacity_source_id)
  where status = 'active';
create index io_route_policies_workspace_idx
  on public.io_route_policies (workspace_id, environment_id, created_at desc);
create index io_route_policies_created_by_idx on public.io_route_policies (created_by);
create index io_route_policies_activated_by_idx
  on public.io_route_policies (activated_by)
  where activated_by is not null;
create unique index io_route_policies_one_active_idx
  on public.io_route_policies (environment_id)
  where state = 'active';
create index io_api_keys_workspace_status_idx
  on public.io_api_keys (workspace_id, status, created_at desc);
create index io_api_keys_project_id_idx on public.io_api_keys (project_id) where project_id is not null;
create index io_api_keys_environment_id_idx
  on public.io_api_keys (environment_id)
  where environment_id is not null;
create index io_api_keys_created_by_idx on public.io_api_keys (created_by);
create index io_audit_events_workspace_time_idx
  on public.io_audit_events (workspace_id, occurred_at desc, id desc);
create index io_audit_events_project_time_idx
  on public.io_audit_events (project_id, occurred_at desc)
  where project_id is not null;
create index io_audit_events_environment_time_idx
  on public.io_audit_events (environment_id, occurred_at desc)
  where environment_id is not null;
create index io_audit_events_actor_user_time_idx
  on public.io_audit_events (actor_user_id, occurred_at desc)
  where actor_user_id is not null;
create index io_audit_events_api_key_time_idx
  on public.io_audit_events (api_key_id, occurred_at desc)
  where api_key_id is not null;
create index io_audit_events_request_id_idx
  on public.io_audit_events (request_id)
  where request_id is not null;

-- Security-definer is required here to avoid recursive RLS on the membership
-- table. It can only answer whether the caller's own auth.uid() has a role; it
-- cannot inspect another user. The schema is not exposed through PostgREST.
create or replace function private.io_workspace_has_role(
  _workspace_id uuid,
  _roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.io_workspace_members as membership
      where membership.workspace_id = _workspace_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and (_roles is null or membership.role = any (_roles))
    );
$function$;

revoke all on function private.io_workspace_has_role(uuid, text[]) from public, anon;
grant execute on function private.io_workspace_has_role(uuid, text[]) to authenticated;

-- Preserve the membership that represents the immutable workspace creator.
-- This is an invoker trigger, not a privilege-escalating function.
create or replace function private.io_protect_creator_membership()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  creator_user_id uuid;
begin
  select workspace.created_by
    into creator_user_id
  from public.io_workspaces as workspace
  where workspace.id = old.workspace_id;

  if old.user_id = creator_user_id then
    if new.user_id is distinct from old.user_id
      or new.workspace_id is distinct from old.workspace_id
      or new.role <> 'owner'
      or new.status <> 'active'
    then
      raise exception 'The workspace creator membership must remain an active owner.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function private.io_protect_creator_membership() from public, anon, authenticated;

create trigger io_workspace_members_protect_creator
before update on public.io_workspace_members
for each row execute function private.io_protect_creator_membership();

-- Reuse the existing invoker updated_at trigger used throughout Indus Orbit.
create trigger io_workspaces_set_updated_at
before update on public.io_workspaces
for each row execute function public.update_updated_at_column();

create trigger io_workspace_members_set_updated_at
before update on public.io_workspace_members
for each row execute function public.update_updated_at_column();

create trigger io_projects_set_updated_at
before update on public.io_projects
for each row execute function public.update_updated_at_column();

create trigger io_environments_set_updated_at
before update on public.io_environments
for each row execute function public.update_updated_at_column();

create trigger io_capacity_sources_set_updated_at
before update on public.io_capacity_sources
for each row execute function public.update_updated_at_column();

create trigger io_workspace_capacity_grants_set_updated_at
before update on public.io_workspace_capacity_grants
for each row execute function public.update_updated_at_column();

create trigger io_route_policies_set_updated_at
before update on public.io_route_policies
for each row execute function public.update_updated_at_column();

-- RLS is enabled before any Data API privileges are granted.
alter table public.io_workspaces enable row level security;
alter table public.io_workspace_members enable row level security;
alter table public.io_projects enable row level security;
alter table public.io_environments enable row level security;
alter table public.io_capacity_sources enable row level security;
alter table public.io_workspace_capacity_grants enable row level security;
alter table public.io_route_policies enable row level security;
alter table public.io_api_keys enable row level security;
alter table public.io_audit_events enable row level security;

-- Workspace policies.
create policy "I/O members read workspaces"
on public.io_workspaces for select
to authenticated
using (
  created_by = (select auth.uid())
  or (select private.io_workspace_has_role(id, null))
);

create policy "I/O users create workspaces"
on public.io_workspaces for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "I/O admins update workspaces"
on public.io_workspaces for update
to authenticated
using (
  created_by = (select auth.uid())
  or (select private.io_workspace_has_role(id, array['owner', 'admin']::text[]))
)
with check (
  created_by = (select auth.uid())
  or (select private.io_workspace_has_role(id, array['owner', 'admin']::text[]))
);

-- Membership policies use the private caller-bound helper to avoid self-policy
-- recursion. All active members may see the active roster; owners/admins may
-- also see pending or suspended members.
create policy "I/O members read workspace roster"
on public.io_workspace_members for select
to authenticated
using (
  user_id = (select auth.uid())
  or (
    status = 'active'
    and (select private.io_workspace_has_role(workspace_id, null))
  )
  or (select private.io_workspace_has_role(workspace_id, array['owner', 'admin']::text[]))
);

create policy "I/O admins add workspace members"
on public.io_workspace_members for insert
to authenticated
with check (
  (
    user_id = (select auth.uid())
    and role = 'owner'
    and status = 'active'
    and invited_by is null
    and exists (
      select 1
      from public.io_workspaces as workspace
      where workspace.id = workspace_id
        and workspace.created_by = (select auth.uid())
    )
  )
  or (
    (invited_by is null or invited_by = (select auth.uid()))
    and (
      (select private.io_workspace_has_role(workspace_id, array['owner']::text[]))
      or (
        role <> 'owner'
        and (select private.io_workspace_has_role(workspace_id, array['admin']::text[]))
      )
    )
  )
);

create policy "I/O admins update workspace members"
on public.io_workspace_members for update
to authenticated
using (
  (select private.io_workspace_has_role(workspace_id, array['owner']::text[]))
  or (
    role <> 'owner'
    and (select private.io_workspace_has_role(workspace_id, array['admin']::text[]))
  )
)
with check (
  (select private.io_workspace_has_role(workspace_id, array['owner']::text[]))
  or (
    role <> 'owner'
    and (select private.io_workspace_has_role(workspace_id, array['admin']::text[]))
  )
);

-- Project policies.
create policy "I/O members read projects"
on public.io_projects for select
to authenticated
using ((select private.io_workspace_has_role(workspace_id, null)));

create policy "I/O developers create projects"
on public.io_projects for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.io_workspace_has_role(workspace_id, array['owner', 'admin', 'developer']::text[]))
);

create policy "I/O developers update projects"
on public.io_projects for update
to authenticated
using ((select private.io_workspace_has_role(workspace_id, array['owner', 'admin', 'developer']::text[])))
with check ((select private.io_workspace_has_role(workspace_id, array['owner', 'admin', 'developer']::text[])));

-- Environment policies.
create policy "I/O members read environments"
on public.io_environments for select
to authenticated
using ((select private.io_workspace_has_role(workspace_id, null)));

create policy "I/O developers create environments"
on public.io_environments for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.io_workspace_has_role(workspace_id, array['owner', 'admin', 'developer']::text[]))
);

create policy "I/O developers update environments"
on public.io_environments for update
to authenticated
using ((select private.io_workspace_has_role(workspace_id, array['owner', 'admin', 'developer']::text[])))
with check ((select private.io_workspace_has_role(workspace_id, array['owner', 'admin', 'developer']::text[])));

-- Platform administrator predicate is deliberately evaluated against the
-- current user's protected public.user_roles row; no user-editable JWT metadata
-- participates in authorization.
create policy "I/O entitled members read capacity provenance"
on public.io_capacity_sources for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = (select auth.uid())
      and user_role.role::text = 'admin'
  )
  or exists (
    select 1
    from public.io_workspace_capacity_grants as capacity_grant
    where capacity_grant.capacity_source_id = id
      and capacity_grant.status in ('pending', 'active', 'exhausted')
      and (select private.io_workspace_has_role(capacity_grant.workspace_id, null))
  )
);

create policy "I/O platform admins create capacity provenance"
on public.io_capacity_sources for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = (select auth.uid())
      and user_role.role::text = 'admin'
  )
);

create policy "I/O platform admins update capacity provenance"
on public.io_capacity_sources for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = (select auth.uid())
      and user_role.role::text = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = (select auth.uid())
      and user_role.role::text = 'admin'
  )
);

create policy "I/O members read capacity grants"
on public.io_workspace_capacity_grants for select
to authenticated
using (
  (select private.io_workspace_has_role(workspace_id, null))
  or exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = (select auth.uid())
      and user_role.role::text = 'admin'
  )
);

create policy "I/O platform admins create capacity grants"
on public.io_workspace_capacity_grants for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = (select auth.uid())
      and user_role.role::text = 'admin'
  )
);

create policy "I/O platform admins update capacity grants"
on public.io_workspace_capacity_grants for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = (select auth.uid())
      and user_role.role::text = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = (select auth.uid())
      and user_role.role::text = 'admin'
  )
);

-- Draft routing policies are client-editable. Activation and retirement are
-- intentionally service-side operations so a single transaction can validate
-- capacity entitlements and append an audit event.
create policy "I/O members read route policies"
on public.io_route_policies for select
to authenticated
using ((select private.io_workspace_has_role(workspace_id, null)));

create policy "I/O developers create draft route policies"
on public.io_route_policies for insert
to authenticated
with check (
  state = 'draft'
  and created_by = (select auth.uid())
  and (select private.io_workspace_has_role(workspace_id, array['owner', 'admin', 'developer']::text[]))
);

create policy "I/O developers update draft route policies"
on public.io_route_policies for update
to authenticated
using (
  state = 'draft'
  and (select private.io_workspace_has_role(workspace_id, array['owner', 'admin', 'developer']::text[]))
)
with check (
  state = 'draft'
  and (select private.io_workspace_has_role(workspace_id, array['owner', 'admin', 'developer']::text[]))
);

create policy "I/O admins delete draft route policies"
on public.io_route_policies for delete
to authenticated
using (
  state = 'draft'
  and (select private.io_workspace_has_role(workspace_id, array['owner', 'admin']::text[]))
);

-- API-key hashes remain unreadable to browsers. RLS still guards the table for
-- the security-invoker metadata view and for defense in depth.
create policy "I/O admins read API key metadata rows"
on public.io_api_keys for select
to authenticated
using ((select private.io_workspace_has_role(workspace_id, array['owner', 'admin', 'developer', 'analyst']::text[])));

-- Audit writes are service-only. Workspace members can inspect their own
-- workspace history, which supports a transparent, people-centred trust model.
create policy "I/O members read audit events"
on public.io_audit_events for select
to authenticated
using ((select private.io_workspace_has_role(workspace_id, null)));

-- Browser-facing API-key view excludes the key hash. security_invoker ensures
-- underlying io_api_keys RLS is evaluated as the signed-in caller.
create view public.io_api_key_metadata
with (security_invoker = true, security_barrier = true)
as
select
  id,
  workspace_id,
  project_id,
  environment_id,
  name,
  key_prefix,
  last_four,
  hash_algorithm,
  hash_version,
  scopes,
  status,
  created_by,
  expires_at,
  last_used_at,
  revoked_at,
  created_at
from public.io_api_keys;

comment on view public.io_api_key_metadata is
  'RLS-protected browser-safe API-key metadata. The key_hash column is deliberately absent.';

-- Explicit least-privilege Data API grants. Service-role access is unchanged.
revoke all on table
  public.io_workspaces,
  public.io_workspace_members,
  public.io_projects,
  public.io_environments,
  public.io_capacity_sources,
  public.io_workspace_capacity_grants,
  public.io_route_policies,
  public.io_api_keys,
  public.io_audit_events
from anon, authenticated;

revoke all on public.io_api_key_metadata from anon, authenticated;

grant select on public.io_workspaces to authenticated;
grant insert (slug, name, description, created_by, chapter_id, mission_id, status)
  on public.io_workspaces to authenticated;
grant update (slug, name, description, chapter_id, mission_id, status)
  on public.io_workspaces to authenticated;

grant select on public.io_workspace_members to authenticated;
grant insert (workspace_id, user_id, role, status, invited_by)
  on public.io_workspace_members to authenticated;
grant update (role, status) on public.io_workspace_members to authenticated;

grant select on public.io_projects to authenticated;
grant insert (workspace_id, slug, name, description, status, created_by)
  on public.io_projects to authenticated;
grant update (slug, name, description, status) on public.io_projects to authenticated;

grant select on public.io_environments to authenticated;
grant insert (
  workspace_id,
  project_id,
  slug,
  name,
  environment_type,
  status,
  monthly_budget_inr,
  created_by
) on public.io_environments to authenticated;
grant update (slug, name, environment_type, status, monthly_budget_inr)
  on public.io_environments to authenticated;

grant select on public.io_capacity_sources to authenticated;
grant insert (
  source_key,
  display_name,
  operator_name,
  provenance,
  procurement_model,
  access_mode,
  status,
  region_code,
  data_residency_country,
  valid_from,
  valid_until,
  public_capacity_metadata,
  public_notes,
  created_by
) on public.io_capacity_sources to authenticated;
grant update (
  source_key,
  display_name,
  operator_name,
  provenance,
  procurement_model,
  access_mode,
  status,
  region_code,
  data_residency_country,
  valid_from,
  valid_until,
  public_capacity_metadata,
  public_notes
) on public.io_capacity_sources to authenticated;

grant select on public.io_workspace_capacity_grants to authenticated;
grant insert (
  workspace_id,
  capacity_source_id,
  grant_kind,
  status,
  priority,
  routing_weight,
  quota_amount,
  quota_unit,
  valid_from,
  valid_until,
  sponsor_label,
  public_terms_note,
  created_by
) on public.io_workspace_capacity_grants to authenticated;
grant update (
  grant_kind,
  status,
  priority,
  routing_weight,
  quota_amount,
  quota_unit,
  valid_from,
  valid_until,
  sponsor_label,
  public_terms_note
) on public.io_workspace_capacity_grants to authenticated;

grant select, delete on public.io_route_policies to authenticated;
grant insert (
  workspace_id,
  environment_id,
  version,
  name,
  description,
  state,
  policy_document,
  created_by,
  activated_by,
  activated_at
) on public.io_route_policies to authenticated;
grant update (name, description, policy_document) on public.io_route_policies to authenticated;

grant select (
  id,
  workspace_id,
  project_id,
  environment_id,
  name,
  key_prefix,
  last_four,
  hash_algorithm,
  hash_version,
  scopes,
  status,
  created_by,
  expires_at,
  last_used_at,
  revoked_at,
  created_at
) on public.io_api_keys to authenticated;

grant select on public.io_api_key_metadata to authenticated;
grant select on public.io_audit_events to authenticated;
