# Supabase schema-reconciliation record

Status: empty local replay verified; demo-schema comparison and owner-scoped Realtime verification remain pending, updated 8 August 2026.

## Empty local replay evidence — 8 August 2026

The locked project dependency `supabase@2.111.0` started a fresh local Supabase stack and replayed the complete checked-in migration chain from an empty Postgres database. No paid hosted branch was created and no hosted database was reset. The recovery checkpoint first applied all 51 migrations through `20260801130427_add_admin_control_plane_fk_indexes.sql`; the current phase gate applies all 58 migrations through `20260808190000_create_direct_message_rpc_boundary.sql` and passes 269/269 pgTAP assertions plus public/private schema lint. The earlier error-level Supabase security and performance advisor runs also reported no findings.

The first replay found three pieces of recovered or environment-specific history that could not execute on a clean CLI database. Each correction is explicitly commented in its source file; none was applied to or used to rewrite the remote migration ledger:

| File                                                      | Replay defect                                                                                                        | Recovery behaviour                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260427103400_fix_leads_rls_and_create_permissions.sql` | Policies referenced `missions.chapter_id`, but the recovered ledger did not contain the out-of-band column creation. | Restores the nullable chapter foreign key immediately before those policies.                                                                       |
| `20260505084656_6d71cafe-feeb-45dc-bbef-bbc7ec24e27c.sql` | The CLI migration role does not own managed `realtime.messages` and cannot assume its owner role.                    | Applies the recovered policy only when the runner has sufficient ownership; otherwise records a notice. Environment verification remains required. |
| `20260801121231_seed_io_direct_provider_registry.sql`     | Demo provider staging required out-of-band `indus-demo` workspace and `partner-gateway` rows.                        | Treats staging as optional demo data and exits with a notice when either prerequisite is absent.                                                   |

This proves that the local chain is replayable. It does **not** yet prove full equivalence with the demo project: schema/grant/function comparison, the managed Realtime policy, generated type drift, and upgrade replay from a production-like snapshot remain open gates.

## What was verified

The connected demo database contains more historical migrations than the local `supabase/migrations` directory. The missing history is recoverable: the remote `supabase_migrations.schema_migrations` table retains each version, name and original SQL statement array.

This explains two facts discovered during the I/O and conversation work:

- the remote database has `direct_messages`, notification work, Chapters, Missions and `app_role` values not represented in the checked-in migration files;
- several local baseline migration timestamps differ by a few seconds from the versions recorded remotely, so a local migration replay cannot yet be considered equivalent to the demo project.

The remote history was inspected read-only. No historical migration was re-applied, rewritten or deleted.

## Historical recovery staged on 31 July 2026

The 21 remote migrations that were absent from the repository have been recovered verbatim from the remote migration ledger into `supabase/migrations`. This is a source-control recovery only: none of the recovered SQL has been executed locally, in a resettable non-production environment, or against the demo project.

| Remote range     | Recovered migrations |
| ---------------- | -------------------: |
| 26 April 2026    |                    3 |
| 26–27 April 2026 |                   11 |
| 27–28 April 2026 |                    4 |
| 29–30 April 2026 |                    3 |
| **Total**        |               **21** |

Recovered filenames:

```text
20260426070606_synergy_s1_notifications.sql
20260426070909_synergy_s3_missions.sql
20260426071102_society_phase4.sql
20260426123031_fix_asks_offers_kind_constraint.sql
20260426133029_add_connection_requests_unique_constraint.sql
20260426145729_add_notification_prefs.sql
20260426145906_get_connection_email_rpc.sql
20260426151017_add_booking_url_to_profiles.sql
20260426151112_create_mission_updates_table.sql
20260426172717_create_direct_messages_table.sql
20260426172958_add_category_to_notifications.sql
20260426173049_fix_notification_trigger_search_path.sql
20260426185052_fix_mission_updates_fk.sql
20260427063143_fix_vouch_and_audit_rls.sql
20260427071927_platform_interdependency.sql
20260427103400_fix_leads_rls_and_create_permissions.sql
20260428072519_add_redeem_vouch_code_rpc.sql
20260428072600_add_vouch_directly_rpc.sql
20260429181105_create_contact_and_newsletter_tables.sql
20260429182257_fix_admin_policies.sql
20260430064549_add_source_to_contact_submissions.sql
```

The local directory now contains 51 migration files. The remaining concern is not missing named history: it is the timestamp mapping for baseline files and newer migrations whose local file names differ slightly from their recorded remote apply versions.

### Validation limitation

Supabase CLI `migration list --linked` could not complete because the CLI login role is unauthenticated (`401`). The connected Supabase project integration remains available and was used for the read-only migration-ledger recovery. Do not mistake this CLI authentication state for a database failure.

## Additive changes now deployed to the demo project

| Versioned local file                                        | Remote migration                         | Purpose                                                                                      | Verification                                                                                                   |
| ----------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `20260730155210_create_io_port_control_plane.sql`           | `create_io_port_control_plane`           | I/O workspace boundary, membership, capacity, policy, key-metadata and audit schema.         | RLS-protected web proof and gateway deployment verified.                                                       |
| `20260730225000_add_io_control_plane_fk_indexes.sql`        | `add_io_control_plane_fk_indexes`        | Covers I/O foreign-key access paths.                                                         | Deployed before UI integration.                                                                                |
| `20260730170917_harden_direct_messages.sql`                 | `harden_direct_messages`                 | Connection-gated direct-message insertion, read-only receipt updates, 4,000-character limit. | RLS role simulation: connected send passes; unconnected send fails; read receipt passes; content update fails. |
| `20260730171132_validate_direct_message_content_length.sql` | `validate_direct_message_content_length` | Validates the length constraint after confirming zero legacy violations.                     | Remote constraint is validated.                                                                                |
| `20260730172452_create_io_workspace_rpc.sql`                | `create_io_workspace_rpc`                | Atomic, idempotent personal I/O workspace + owner membership + safe audit event RPC.         | Authenticated-role creation and recovery paths passed inside rolled-back transactions; counts unchanged.       |
| `20260731113000_create_io_provider_registry.sql`            | `create_io_provider_registry`            | Public evidence/price catalogue plus private endpoint/conformance metadata.                  | Deployed with explicit RLS/grants; provider secrets remain external.                                           |
| `20260731123500_add_io_provider_registry_fk_indexes.sql`    | `add_io_provider_registry_fk_indexes`    | Covers provider-registry foreign-key paths used by policy/operator queries.                  | Performance Advisor covering-index check.                                                                      |
| `20260731150000_add_io_dynamic_model_selection.sql`         | `add_io_dynamic_model_selection`         | Reviewed model release dates and automatic route tiers.                                      | Local deterministic selection tests pass.                                                                      |
| `20260801120115_io_route_receipts_and_registry_router.sql`  | `io_route_receipts_and_registry_router`  | Service-only ready resolver plus append-only route/attempt evidence.                         | Ready resolver returns zero; receipt/attempt counts remain zero before live traffic.                           |
| `20260801121231_seed_io_direct_provider_registry.sql`       | `seed_io_direct_provider_registry`       | Stages five direct providers with unique secret references and reviewed inventory metadata.  | Five testing connections, five draft capability versions and no paid conformance call.                         |
| `20260801122329_add_io_route_evidence_fk_indexes.sql`       | `add_io_route_evidence_fk_indexes`       | Covers route-evidence provider/model/endpoint/capacity foreign keys.                         | Advisor reports no remaining unindexed foreign key in the new evidence tables.                                 |
| `20260801123802_create_admin_control_plane.sql`             | `create_admin_control_plane`             | Scoped admin-team authority, I/O operator snapshot and fail-closed provider runtime switch.  | Super-admin projection verified; five controls disabled; zero ready routes and zero scoped assignments.        |
| `20260801124706_harden_super_admin_role_management.sql`     | `harden_super_admin_role_management`     | Removes authenticated browser DML from root platform roles.                                  | `authenticated`: SELECT true; INSERT/UPDATE/DELETE false on `public.user_roles`.                               |
| `20260801130427_add_admin_control_plane_fk_indexes.sql`     | `add_admin_control_plane_fk_indexes`     | Covers assignment, audit-actor and provider-control foreign-key paths.                       | All nine foreign keys across the four affected private tables are index-backed; no missing path remains.       |

These are additive hardening migrations. They do not modify or delete existing message rows.

## Safe recovery sequence for the remaining history

1. Make a version mapping for the locally present baseline files whose timestamps differ from remote by a few seconds. Do not rename or rewrite deployed migration history in place.
2. The empty local replay now passes. Compare schema, grants, policies, functions, triggers, extensions and enum values with the demo project; separately verify the owner-scoped `realtime.messages` policy.
3. Generate fresh `src/integrations/supabase/types.ts` from the reconciled database and run application type checks.
4. Only after the comparison is clean, make local history the source of truth for future migrations and add CI migration-replay checks.

## Guardrails

- New feature migrations remain forward-only and receive a fresh CLI-generated version. The three commented historical amendments above are limited replay-recovery exceptions for source that had already diverged from the deployed environment.
- The database records the actual apply time as its migration version. Keep the local filename → remote-name mapping above; do not rename either side to manufacture timestamp equality.
- Do not use a schema dump as a substitute for policy/function review; RLS, grants, triggers and Security Definer functions must be compared deliberately.
- Do not backfill or consolidate direct messages while conversation history is being reconciled. The current hardening migration is intentionally independent of that work.
- A paid hosted branch is not required for this work and must not be created without separate explicit approval.
