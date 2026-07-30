# Supabase schema-reconciliation record

Status: evidence-backed reconciliation in progress, 30 July 2026.

## What was verified

The connected demo database contains more historical migrations than the local `supabase/migrations` directory. The missing history is recoverable: the remote `supabase_migrations.schema_migrations` table retains each version, name and original SQL statement array.

This explains two facts discovered during the I/O and conversation work:

- the remote database has `direct_messages`, notification work, Chapters, Missions and `app_role` values not represented in the checked-in migration files;
- several local baseline migration timestamps differ by a few seconds from the versions recorded remotely, so a local migration replay cannot yet be considered equivalent to the demo project.

The remote history was inspected read-only. No historical migration was re-applied, rewritten or deleted.

## Additive changes now deployed to the demo project

| Versioned local file                                        | Remote migration                         | Purpose                                                                                      | Verification                                                                                                   |
| ----------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `20260730155210_create_io_port_control_plane.sql`           | `create_io_port_control_plane`           | I/O workspace boundary, membership, capacity, policy, key-metadata and audit schema.         | RLS-protected web proof and gateway deployment verified.                                                       |
| `20260730225000_add_io_control_plane_fk_indexes.sql`        | `add_io_control_plane_fk_indexes`        | Covers I/O foreign-key access paths.                                                         | Deployed before UI integration.                                                                                |
| `20260730170917_harden_direct_messages.sql`                 | `harden_direct_messages`                 | Connection-gated direct-message insertion, read-only receipt updates, 4,000-character limit. | RLS role simulation: connected send passes; unconnected send fails; read receipt passes; content update fails. |
| `20260730171132_validate_direct_message_content_length.sql` | `validate_direct_message_content_length` | Validates the length constraint after confirming zero legacy violations.                     | Remote constraint is validated.                                                                                |
| `20260730172452_create_io_workspace_rpc.sql`                | `create_io_workspace_rpc`                | Atomic, idempotent personal I/O workspace + owner membership + safe audit event RPC.         | Authenticated-role creation and recovery paths passed inside rolled-back transactions; counts unchanged.       |

These are additive hardening migrations. They do not modify or delete existing message rows.

## Safe recovery sequence for the remaining history

1. Export each missing historical migration from `supabase_migrations.schema_migrations.statements` into a matching checked-in file, preserving its remote version and original statement text.
2. Make a version mapping for the locally present baseline files whose timestamps differ from remote by a few seconds. Do not rename or rewrite deployed migration history in place.
3. Create a disposable Supabase development branch, replay the reconciled local history there, and compare schema, grants, policies, functions, triggers, extensions and enum values with the demo project.
4. Generate fresh `src/integrations/supabase/types.ts` from the reconciled branch/database and run application type checks.
5. Only after the branch comparison is clean, make local history the source of truth for future migrations and add CI migration-replay checks.

## Guardrails

- New feature migrations remain forward-only and receive a fresh CLI-generated version.
- The database records the actual apply time as its migration version. Keep the local filename → remote-name mapping above; do not rename either side to manufacture timestamp equality.
- Do not use a schema dump as a substitute for policy/function review; RLS, grants, triggers and Security Definer functions must be compared deliberately.
- Do not backfill or consolidate direct messages while conversation history is being reconciled. The current hardening migration is intentionally independent of that work.
- Branch creation may have a platform cost and needs an explicit cost confirmation before it is created.
