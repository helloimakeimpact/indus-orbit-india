# Supabase schema-reconciliation record

Status: the linked Indus Orbit demo has 93 hosted migrations. The local directory has 94 files because `20260628124500_seed_builder_courses_and_soda_ideas.sql` remains an intentional local/demo-only seed. The newest workspace/key, conformance, finance, schema-advisor and Orbit-attention migrations were applied through the connected Supabase project API and verified there. The last retained clean local baseline predates the current 94-file chain; historical aliases remain, updated 26 August 2026.

## 26 August 2026 Orbit attention controls

Hosted versions `20260826142300` and `20260826143056` release caller-bound Thread follows/read pointers, Room notification preferences, personal bookmarks and manager-only Room pins. Browser table access remains SELECT-only: every write rechecks authentication and current Space/Room/Thread access inside a narrow RPC. The follow table has RLS, owner-only SELECT, a composite primary key and covering indexes for user activity and last-read message cleanup. Matching generated client contracts are checked in.

The post-release hosted advisors report zero uncovered foreign keys and zero tables without primary keys. The remaining notices are 116 legacy auth-RLS initialization plans, 49 multiple-permissive-policy overlaps, 253 unused-index observations, 52 intentionally private RLS tables with no browser policy, 141 authenticated security-definer execution reviews and one project-level leaked-password-protection setting. They are retained for explicit policy-by-policy review; no broad automated RLS rewrite is approved.

## 26 August 2026 schema-advisor closure

The connected API recorded `finalize_schema_advisor_indexes` at hosted version `20260826135924`; its local source is `20260825194943_finalize_schema_advisor_indexes.sql`. It adds nineteen indexes covering all twenty previously reported foreign-key paths—the composite `geo_places(region_id, country_code)` index covers both related constraints—and stable UUID primary keys to `conversation_mentions` and `conversation_notification_preferences` without weakening their existing business-key uniqueness.

Hosted verification found all nineteen indexes, both primary keys and zero null row identifiers. The Performance Advisor now reports zero uncovered foreign keys and zero tables without a primary key. Remaining notices are 116 inherited RLS init-plan opportunities, 49 multiple-permissive-policy notices and workload-dependent unused-index information. The local Docker stack was unavailable, so no new empty-replay claim is made.

## Current addendum — exact hosted/local boundary

The linked project is `jpwvgpnbkrktipwhvqss` (`Indus Orbit`). `supabase/config.toml`, `supabase/.temp/project-ref` and the linked-project record agree. The authenticated CLI previously read the hosted migration ledger/schema/inventory successfully. Browser login is not required while that session remains valid.

The following source migrations were Released through the alias-safe temporary deployment view after an exact dry run:

- `20260809142000_create_trusted_product_event_rpcs.sql`;
- `20260809150000_harden_email_delivery_claims.sql`;
- `20260809152439_create_chapter_mission_space_foundation.sql`.
- `20260809174030_create_admin_io_evidence_rpcs.sql`.
- `20260810002754_create_io_operational_core.sql`.
- `20260810010415_create_io_terminal_session_foundation.sql`.
- `20260812000100_add_io_terminal_timeline_and_approval_rpcs.sql`.

The connected project migration API then released:

- `20260819225550_add_direct_message_pagination_rpc.sql` — caller-bound, 50-row maximum keyset pagination. Hosted checks prove the function, definer/empty-search-path contract, authenticated-only execution, no authenticated direct insert and the conversation index.
- `20260819232624_add_io_openai_api_foundation.sql` — owner/admin test-key issuance, revocation, service-only hash authentication, scope enforcement and atomic fixed-minute counters. Hosted grants and a rolled-back functional transaction proved key shape/hash, first-request allow, rate rejection, bounded counter, revocation and exactly-once audits.
- `20260820001339_add_io_transparent_service_fee.sql` — versioned 550-basis-point pricing, provider-cost/fee/customer-total evidence, atomic priced finalization, provider commercial states, written-evidence eligibility and the separate admin commercial projection.
- `20260820023501_add_io_commercial_fk_indexes.sql` — covering indexes for both new reviewer/creator foreign-key paths identified by Performance Advisor.
- `20260820140000_harden_io_workspace_and_api_key_policy.sql` — explicit CN workspace policy, immutable minute/day/month key request caps and atomic daily/monthly key spend reservations while preserving the deployed defaulted RPC signature.
- `20260820150000_add_io_provider_conformance_workflow.sql` — single-use 30-minute/USD 0.01 approval, CN acknowledgement, discovery-first execution and redacted evidence.
- `20260820193000_add_io_conformance_fk_indexes.sql` — covers four conformance audit foreign keys found by the post-DDL advisor.

The connected API recorded the commercial source files at hosted apply versions `20260820023411` and `20260820023513`, then the three hardening files at `20260820191501`, `20260820191544` and `20260820191815`. These are documented local-file/hosted-ledger timestamp mappings; no migration history was repaired or rewritten.

The clean local database previously replayed 68 migrations and passed 550 assertions across 14 pgTAP files. Source includes API-key and 26-check commercial pgTAP contracts. A local rebuild failed because the Supabase database container's managed `_supabase` database and internal role credentials did not match during service bootstrap, before product migrations ran; this is not recorded as a product SQL failure and no 71-migration local pass is claimed. The unhealthy local stack was stopped with backup; the hosted Indus Orbit project was not reset or replaced.

The hosted I/O inventory is not empty. The latest read-only inventory has 5 providers, 5 models, 5 endpoints, 5 endpoint capability versions, 5 price versions, 5 runtime controls, 5 endpoint connections, 3 capacity sources and 3 workspace capacity grants. It has 0 route receipts and 0 provider attempts. Inventory or stored secret-reference names are not proof of provider conformance or permission to create paid traffic.

Because 26 historical versions use different local/hosted timestamps, ordinary linked `db push` from the repository remains unsafe. Each release uses an isolated view containing the exact fetched hosted ledger plus only approved forward migrations. `scripts/supabase/prepare-alias-safe-io-release.sh` now accepts an explicit validated filename list, preventing unrelated forward migrations from entering a release candidate. No seed, role file, repair, reset or historical replay ran. Do not use migration repair to manufacture equality.

### Hosted post-release evidence

The read-only `chapter_mission_space_release_contract.sql` result is:

- missing migrations: `[]`;
- missing public Space tables: `[]`;
- missing expected caller-bound functions: `[]`;
- public Space tables with RLS: `19/19`;
- authenticated direct Chapter/Mission INSERT/UPDATE privileges: all `false`;
- `conversation_messages` in `supabase_realtime`: `true`;
- backfilled Spaces/Rooms/messages: `9 / 57 / 0`;
- providers/models/endpoints/capabilities/prices/runtime controls/connections: `5` each;
- capacity sources/workspace grants: `3` each;
- route receipts/provider attempts: `0 / 0`.
- I/O evidence release: migration/column/index/two functions present; anonymous execution false and authenticated execution true.
- I/O operational/terminal release: the three migrations are present; all fourteen expected new I/O tables have RLS; direct authenticated writes to terminal events/reservations are false; anonymous execution of terminal RPCs is false; authenticated execution is true; private ledger/idempotency tables are not browser-readable; expected indexes are present; usage/session/event/approval counts are `0`.

`io-gateway` is active at version `23` with JWT verification and a shared priced route-execution core. `io-openai` is active at version `4` with custom API-key authentication, browser-origin rejection and JWT interception disabled only for that boundary. `io-provider-conformance` v1 is active with JWT verification. The active fee policy is version 1 / 550 basis points; both provider commercial states are `resale_pending`; runtime controls, active API keys, conformance approvals and running conformance runs remain zero. No provider key was read and no provider traffic was created.

The new Advisor findings are bounded: private operational tables use RLS with no client policies as deny-by-default defense, and authenticated `SECURITY DEFINER` functions perform internal caller/capability checks with empty search paths. The four new conformance unindexed-FK notices were closed by hosted migration `20260820191815`. See the [Supabase database linter remediation index](https://supabase.com/docs/guides/database/database-linter).

Hosted `supabase db lint --level warning --schema public` reports no schema errors. Security Advisor reports 79 inherited notices (61 warnings, 18 information) and Performance Advisor reports 345 inherited notices (166 warnings, 179 information); neither contains a warning attached to a new `conversation_*` object. Advisor remediation remains tracked through the [Supabase database linter](https://supabase.com/docs/guides/database/database-advisors).

## Empty local replay evidence — 8 August 2026

The locked project dependency `supabase@2.111.0` started a fresh local Supabase stack and replayed the complete checked-in migration chain from an empty Postgres database. No paid hosted branch was created and no hosted database was reset. The 8 August phase gate applied all 58 migrations through `20260808190000_create_direct_message_rpc_boundary.sql` and passed 269/269 pgTAP assertions plus public/private schema lint.

On 9 August, the 59th privilege-hardening migration replayed successfully at the SQL stage before a temporary Storage/Postgres health failure interrupted that empty-reset run. The containers later recovered; migration 60 applied to the existing chain and all 372 assertions passed. The fresh-empty evidence remains the older 58/269 baseline, while the hosted demo is independently covered by the current 19-check contract.

The first replay found three pieces of recovered or environment-specific history that could not execute on a clean CLI database. Each correction is explicitly commented in its source file; none was applied to or used to rewrite the remote migration ledger:

| File                                                      | Replay defect                                                                                                        | Recovery behaviour                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260427103400_fix_leads_rls_and_create_permissions.sql` | Policies referenced `missions.chapter_id`, but the recovered ledger did not contain the out-of-band column creation. | Restores the nullable chapter foreign key immediately before those policies.                                                                       |
| `20260505084656_6d71cafe-feeb-45dc-bbef-bbc7ec24e27c.sql` | The CLI migration role does not own managed `realtime.messages` and cannot assume its owner role.                    | Applies the recovered policy only when the runner has sufficient ownership; otherwise records a notice. Environment verification remains required. |
| `20260801121231_seed_io_direct_provider_registry.sql`     | Demo provider staging required out-of-band `indus-demo` workspace and `partner-gateway` rows.                        | Treats staging as optional demo data and exits with a notice when either prerequisite is absent.                                                   |

This dated section records the earlier 58-migration evidence. It is superseded for local replay by the current clean 64-migration/446-assertion result. It still does **not** prove hosted equivalence: durable alias reconciliation, managed Realtime personas, a full schema-object comparison, generated-type drift automation and a production-like snapshot upgrade remain open gates.

## What was verified

The connected demo database contains more historical migrations than the local `supabase/migrations` directory. The missing history is recoverable: the remote `supabase_migrations.schema_migrations` table retains each version, name and original SQL statement array.

This explains two facts discovered during the I/O and conversation work:

- the remote database has `direct_messages`, notification work, Chapters, Missions and `app_role` values not represented in the checked-in migration files;
- several local baseline migration timestamps differ by a few seconds from the versions recorded remotely, so a local migration replay cannot yet be considered equivalent to the demo project.

The remote history was fetched and compared without changing the ledger. No historical migration was re-applied, rewritten or deleted.

## Hosted release and verification — 9 August 2026

The official browser/device login authenticated the CLI, linked project `jpwvgpnbkrktipwhvqss`, and confirmed the project is `ACTIVE_HEALTHY` in `ap-south-1`. A normal dry-run correctly refused to proceed while remote-only history versions were absent from the checkout. No `migration repair` was used.

`supabase migration fetch` recovered the exact hosted files into a temporary deployment view. The 26 hosted-only versions were compared with their local aliases. Most differences are timestamps and terminal semicolons; the remaining local differences are the documented clean-replay accommodations. Deployment preserved the exact hosted versions, removed duplicate local aliases only from the temporary view, excluded the unrelated content seed, and applied only approved forward migrations.

The timestamp pairs are:

| Local source version | Hosted ledger version | Local source version | Hosted ledger version |
| -------------------- | --------------------- | -------------------- | --------------------- |
| `20260420094425`     | `20260420094422`      | `20260421103755`     | `20260421103753`      |
| `20260424075330`     | `20260424075328`      | `20260425130136`     | `20260425130133`      |
| `20260503143359`     | `20260503143356`      | `20260504085656`     | `20260504085653`      |
| `20260504085759`     | `20260504085756`      | `20260505071736`     | `20260505071733`      |
| `20260505084656`     | `20260505084653`      | `20260529191533`     | `20260529191530`      |
| `20260617100341`     | `20260617100334`      | `20260618063730`     | `20260618063728`      |
| `20260624092812`     | `20260624092810`      | `20260625110006`     | `20260625110004`      |
| `20260727100240`     | `20260727100243`      | `20260730155210`     | `20260730161145`      |
| `20260730225000`     | `20260730162022`      | `20260730170917`     | `20260730171008`      |
| `20260730171132`     | `20260730171151`      | `20260730172452`     | `20260730172609`      |
| `20260731113000`     | `20260731144209`      | `20260731123500`     | `20260731144418`      |
| `20260731150000`     | `20260731145408`      | `20260801123802`     | `20260801124047`      |
| `20260801124706`     | `20260801124731`      | `20260801130427`     | `20260801130455`      |

The local-only `20260628124500` content seed is not an alias and was not deployed in this release.

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

The local directory now contains 74 migration files. The remaining concern is not missing named history: it is the timestamp mapping for baseline files and newer migrations whose local file names differ slightly from their recorded remote apply versions, plus the one intentionally local-only content seed.

### Validation status

Supabase CLI authentication and connected migration access work. The hosted ledger reports 73 entries through `20260820191815`. The ordinary checkout still displays the historical alias pairs above and therefore is not safe for a normal linked push without the reconciliation procedure.

## Additive changes now Released to the demo project

| Versioned local file                                          | Remote migration                         | Purpose                                                                                        | Verification                                                                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260730155210_create_io_port_control_plane.sql`             | `create_io_port_control_plane`           | I/O workspace boundary, membership, capacity, policy, key-metadata and audit schema.           | RLS-protected web proof and gateway deployment verified.                                                                                        |
| `20260730225000_add_io_control_plane_fk_indexes.sql`          | `add_io_control_plane_fk_indexes`        | Covers I/O foreign-key access paths.                                                           | Deployed before UI integration.                                                                                                                 |
| `20260730170917_harden_direct_messages.sql`                   | `harden_direct_messages`                 | Connection-gated direct-message insertion, read-only receipt updates, 4,000-character limit.   | RLS role simulation: connected send passes; unconnected send fails; read receipt passes; content update fails.                                  |
| `20260730171132_validate_direct_message_content_length.sql`   | `validate_direct_message_content_length` | Validates the length constraint after confirming zero legacy violations.                       | Remote constraint is validated.                                                                                                                 |
| `20260730172452_create_io_workspace_rpc.sql`                  | `create_io_workspace_rpc`                | Atomic, idempotent personal I/O workspace + owner membership + safe audit event RPC.           | Authenticated-role creation and recovery paths passed inside rolled-back transactions; counts unchanged.                                        |
| `20260731113000_create_io_provider_registry.sql`              | `create_io_provider_registry`            | Public evidence/price catalogue plus private endpoint/conformance metadata.                    | Deployed with explicit RLS/grants; provider secrets remain external.                                                                            |
| `20260731123500_add_io_provider_registry_fk_indexes.sql`      | `add_io_provider_registry_fk_indexes`    | Covers provider-registry foreign-key paths used by policy/operator queries.                    | Performance Advisor covering-index check.                                                                                                       |
| `20260731150000_add_io_dynamic_model_selection.sql`           | `add_io_dynamic_model_selection`         | Reviewed model release dates and automatic route tiers.                                        | Local deterministic selection tests pass.                                                                                                       |
| `20260801120115_io_route_receipts_and_registry_router.sql`    | `io_route_receipts_and_registry_router`  | Service-only ready resolver plus append-only route/attempt evidence.                           | Ready resolver returns zero; receipt/attempt counts remain zero before live traffic.                                                            |
| `20260801121231_seed_io_direct_provider_registry.sql`         | `seed_io_direct_provider_registry`       | Conditionally stages five direct providers when demo workspace/capacity prerequisites exist.   | Hosted inventory now contains five providers/models/endpoints/capability/price/control/connection records and three capacity sources/grants.    |
| `20260801122329_add_io_route_evidence_fk_indexes.sql`         | `add_io_route_evidence_fk_indexes`       | Covers route-evidence provider/model/endpoint/capacity foreign keys.                           | Advisor reports no remaining unindexed foreign key in the new evidence tables.                                                                  |
| `20260801123802_create_admin_control_plane.sql`               | `create_admin_control_plane`             | Scoped admin-team authority, I/O operator snapshot and fail-closed provider runtime switch.    | Contracts exist; five runtime controls/connections are present while provider traffic evidence remains zero.                                    |
| `20260801124706_harden_super_admin_role_management.sql`       | `harden_super_admin_role_management`     | Removes authenticated browser DML from root platform roles.                                    | `authenticated`: SELECT true; INSERT/UPDATE/DELETE false on `public.user_roles`.                                                                |
| `20260801130427_add_admin_control_plane_fk_indexes.sql`       | `add_admin_control_plane_fk_indexes`     | Covers assignment, audit-actor and provider-control foreign-key paths.                         | All nine foreign keys across the four affected private tables are index-backed; no missing path remains.                                        |
| `20260801152819_enforce_latest_endpoint_conformance.sql`      | same version                             | Makes current endpoint capability plus current bound conformance the only route eligibility.   | Live release contract passes; no current inventory can route.                                                                                   |
| `20260801152820_contain_notification_privileges.sql`          | same version                             | Restricts browser notification access to owner read and `is_read` update.                      | Live grant checks pass; the later event migration retires generic authenticated execution.                                                      |
| `20260801153734_fix_vouch_audit_contracts.sql`                | same version                             | Serialises vouch mutations and repairs UUID audit targets.                                     | Migration recorded; existing focused local contracts remain green from the 8 August baseline.                                                   |
| `20260801155642_retire_loops_product_surface.sql`             | same version                             | Removes browser Loops access while preserving a read-only service archive.                     | Anonymous/authenticated read false; service-role read true.                                                                                     |
| `20260801195033_separate_io_and_community_product_access.sql` | same version                             | Separates immediate authenticated I/O access from explicit Community completion.               | Nine caller-bound product/location functions exist; existing-member backfill has zero missing rows.                                             |
| `20260801195108_create_global_location_foundation.sql`        | same version                             | Adds private consent-aware location and explicit share projection.                             | 249 active countries; seven private tables use RLS; legacy rows remain unconsented.                                                             |
| `20260808190000_create_direct_message_rpc_boundary.sql`       | same version                             | Moves direct sends/read acknowledgement behind caller-bound RPCs.                              | Direct browser writes false; zero write policies; authenticated RPC execution true.                                                             |
| `20260809132035_revoke_anonymous_security_definer_access.sql` | same version                             | Revokes anonymous execution from eight privileged inherited functions.                         | Live contract passes and Security Advisor anonymous-definer warnings fall from eight to zero.                                                   |
| `20260809142000_create_trusted_product_event_rpcs.sql`        | same version                             | Adds atomic connection/mentor/mission/vouch/Chapter event RPCs and private email outbox.       | Released; expected functions exist and the protected product boundaries are verified.                                                           |
| `20260809150000_harden_email_delivery_claims.sql`             | same version                             | Hardens service-only email claim/lease behavior.                                               | Released; claim/complete functions exist while the worker remains intentionally undeployed.                                                     |
| `20260809152439_create_chapter_mission_space_foundation.sql`  | same version                             | Adds the caller-bound Chapter/Mission Space collaboration foundation and RLS/grants.           | Released; 19/19 public tables use RLS, 9 Spaces/57 Rooms were backfilled, direct protected writes are false and Realtime publication is true.   |
| `20260809174030_create_admin_io_evidence_rpcs.sql`            | same version                             | Adds receipt currency evidence and capability-checked admin aggregate/keyset route evidence.   | Released; migration/column/index/functions exist, anonymous execution is false, authenticated execution is true and traffic counts remain zero. |
| `20260820140000_harden_io_workspace_and_api_key_policy.sql`   | `20260820191501`                         | Adds workspace CN policy, immutable per-key request windows and atomic key spend reservations. | Defaults/ACLs/signature verify; active API keys and enabled controls remain zero.                                                               |
| `20260820150000_add_io_provider_conformance_workflow.sql`     | `20260820191544`                         | Adds bounded single-use provider conformance approval/execution/evidence.                      | Tables/functions/ACLs verify; approvals and running runs remain zero; function v1 is active with JWT.                                           |
| `20260820193000_add_io_conformance_fk_indexes.sql`            | `20260820191815`                         | Covers four conformance audit foreign-key paths.                                               | Post-DDL Performance Advisor reports no remaining conformance unindexed-FK notice.                                                              |

These are additive hardening migrations. They do not modify or delete existing message rows.

## Safe recovery sequence for the remaining history

1. Choose and review a durable baseline/alias strategy for the 26 mapped versions. Do not rename, delete or mark hosted history as reverted merely to make the lists look equal.
2. Keep the proven fresh 68-migration/550-assertion replay required in CI, restore the complete 73-migration replay and add a production-like snapshot upgrade before production.
3. Compare grants, policies, functions, triggers, extensions and enum values with the demo project; separately verify the owner-scoped `realtime.messages` policy.
4. Add a repeatable hosted drift gate; current declarations were regenerated directly from hosted migration 73 and include the latest I/O policy/conformance contracts.
5. Prove a production-like snapshot upgrade before making the reconciled chain the only supported deployment path.

## Guardrails

- New feature migrations remain forward-only and receive a fresh CLI-generated version. The three commented historical amendments above are limited replay-recovery exceptions for source that had already diverged from the deployed environment.
- The database records the actual apply time as its migration version. Keep the local filename → remote-name mapping above; do not rename either side to manufacture timestamp equality.
- Do not use a schema dump as a substitute for policy/function review; RLS, grants, triggers and Security Definer functions must be compared deliberately.
- Do not backfill or consolidate direct messages while conversation history is being reconciled. The current hardening migration is intentionally independent of that work.
- A paid hosted branch is not required for this work and must not be created without separate explicit approval.
