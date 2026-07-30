-- Atomic, idempotent personal I/O workspace creation.
--
-- The browser must not coordinate workspace, owner-membership and audit-event
-- inserts. This function accepts no caller-controlled destination, owner or
-- audit payload: all three are derived from auth.uid() and either commit or
-- roll back together.

create or replace function public.create_my_io_workspace()
returns public.io_workspaces
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_user_id uuid := auth.uid();
  workspace_row public.io_workspaces%rowtype;
begin
  if actor_user_id is null then
    raise exception 'Sign in to create an I/O workspace.' using errcode = '42501';
  end if;

  -- Serialise only this member's default-workspace creation. This prevents two
  -- tabs from producing separate personal workspaces without imposing a global
  -- lock or restricting future invited/shared workspace membership.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(actor_user_id::text, 0)
  );

  select workspace.*
    into workspace_row
  from public.io_workspaces as workspace
  where workspace.created_by = actor_user_id
    and workspace.status = 'active'
  order by workspace.created_at asc, workspace.id asc
  limit 1;

  if found then
    -- Recover a legacy partial browser creation if one exists. The creator's
    -- membership is always the immutable active owner membership.
    insert into public.io_workspace_members (
      workspace_id,
      user_id,
      role,
      status,
      invited_by
    )
    values (workspace_row.id, actor_user_id, 'owner', 'active', null)
    on conflict (workspace_id, user_id) do update
      set role = 'owner',
          status = 'active',
          invited_by = null;

    return workspace_row;
  end if;

  insert into public.io_workspaces (
    slug,
    name,
    description,
    created_by
  )
  values (
    'io-' || left(replace(actor_user_id::text, '-', ''), 12),
    'My I/O workspace',
    'Personal I/O Port workspace',
    actor_user_id
  )
  returning * into workspace_row;

  insert into public.io_workspace_members (
    workspace_id,
    user_id,
    role,
    status,
    invited_by
  )
  values (workspace_row.id, actor_user_id, 'owner', 'active', null);

  insert into public.io_audit_events (
    workspace_id,
    actor_kind,
    actor_user_id,
    event_type,
    payload
  )
  values (
    workspace_row.id,
    'user',
    actor_user_id,
    'workspace.created',
    jsonb_build_object('creation_path', 'create_my_io_workspace')
  );

  return workspace_row;
end;
$function$;

revoke all on function public.create_my_io_workspace() from public, anon, authenticated;
grant execute on function public.create_my_io_workspace() to authenticated;

-- Creation now has one public write boundary: the authenticated RPC above.
-- Existing member-management insertion remains available to owner/admin flows.
drop policy if exists "I/O users create workspaces" on public.io_workspaces;
revoke insert on table public.io_workspaces from authenticated;
