# Demo Supabase release evidence — 9 August 2026

Status: thirteen-migration demo release set with Chapter/Mission Space and I/O evidence addenda remotely verified; production approval is not claimed.

## Scope and target

- Project: `jpwvgpnbkrktipwhvqss` (`Indus Orbit`)
- Region: `ap-south-1`
- Project health at deployment: `ACTIVE_HEALTHY`
- Target classification: demo, not production
- Deployment method: forward-only Supabase migrations through the linked CLI
- Provider spend: none; no provider completion or conformance call was made

## Migrations released

The following versions are recorded in the hosted migration ledger:

```text
20260801152819_enforce_latest_endpoint_conformance.sql
20260801152820_contain_notification_privileges.sql
20260801153734_fix_vouch_audit_contracts.sql
20260801155642_retire_loops_product_surface.sql
20260801195033_separate_io_and_community_product_access.sql
20260801195108_create_global_location_foundation.sql
20260808190000_create_direct_message_rpc_boundary.sql
20260809132035_revoke_anonymous_security_definer_access.sql
20260809142000_create_trusted_product_event_rpcs.sql
20260809150000_harden_email_delivery_claims.sql
20260809152439_create_chapter_mission_space_foundation.sql
20260809174030_create_admin_io_evidence_rpcs.sql
20260809182509_add_io_conformance_composite_index.sql
```

`20260628124500_seed_builder_courses_and_soda_ideas.sql` was deliberately excluded. It is a separate content seed, not a prerequisite for this release.

The historical hosted ledger was preserved. No migration-history repair, deletion, rename, re-application or database reset was performed. Deployment used an authoritative temporary view containing the exact fetched hosted versions plus only the approved pending migrations.

## Live release contract

`supabase/verification/demo_release_contract.sql` is the aggregate read-only gate and now contains 21 checks for all thirteen release versions. `supabase/verification/chapter_mission_space_release_contract.sql` and `supabase/verification/io_evidence_release_contract.sql` are the focused read-only addenda.

The Chapter/Mission Space contract passes:

- all three 9 August forward versions are recorded;
- no expected public Space table or caller-bound function is missing;
- all 19 public Space tables have RLS enabled;
- authenticated direct Chapter and Mission `INSERT`/`UPDATE` privileges are false;
- `conversation_messages` belongs to `supabase_realtime`;
- the backfill produced 9 Spaces and 57 Rooms; durable Space messages remain zero before member traffic;
- provider/model/endpoint/capability/price/runtime-control/connection counts are 5 each;
- capacity source/workspace grant counts are 3 each;
- route receipts and provider attempts remain zero.

The I/O evidence addendum confirms:

- `20260809174030` is recorded in the hosted ledger;
- `20260809182509` is recorded in the hosted ledger;
- `selected_currency_code` and `io_route_receipts_global_time_idx` exist;
- `io_provider_conformance_runs_endpoint_capability_idx` covers the provider-conformance composite relationship identified by the Performance Advisor;
- `admin_io_evidence_summary()` and `admin_io_recent_route_receipts(timestamptz, uuid, integer)` exist;
- anonymous execution is false for both functions;
- authenticated execution is true, with authority re-checked by `io.read` inside each function;
- route receipt and provider attempt counts remain zero, so no provider traffic or spend was created by this release.

The aggregate product contract establishes:

- 13/13 release versions are recorded;
- 11/11 release relations and 17/17 caller-bound functions exist;
- 249 active ISO country records exist;
- zero existing segmented profiles are missing completed Community state;
- zero invalid consent-bearing `legacy_unconfirmed` location rows exist;
- all seven new private state tables have RLS enabled;
- browser roles cannot directly read private product/location state;
- product and location RPCs deny anonymous execution and allow authenticated execution;
- direct messages allow RLS-scoped reads but deny browser `INSERT`, `UPDATE` and `DELETE`;
- no direct-message write policy remains;
- notification rows allow owner reads and `is_read` updates only; protected product events use RPC-only writes and generic authenticated `send_notification` execution is false;
- the private email outbox uses RLS, a covering recipient index and service-only leasing;
- Loops denies anonymous/authenticated reads and retains service-role archive read;
- all eight identified privileged functions deny anonymous execution;
- the I/O registry and route evidence boundaries exist; the later Space contract now records the non-empty five-provider inventory and still-zero traffic evidence.

## Advisor results

Hosted public-schema lint reports no error. The current Advisors attach no warning to a new `conversation_*` object.

The current Security Advisor reports 79 inherited notices: 61 warnings and 18 information notices. The first warning-level run had identified eight anonymously executable `SECURITY DEFINER` functions; `20260809132035_revoke_anonymous_security_definer_access.sql` removed those grants.

Authenticated definer and GraphQL exposure warnings require function/table classification. Caller-bound product, location, messaging and scoped admin RPCs are intentionally authenticated and tested, but inherited functions must not be granted a blanket waiver. Leaked-password protection is not reported by the current database advisor output; its hosted Auth setting still requires separate configuration evidence.

The current Performance Advisor reports an inherited product-wide backlog whose counts change as the schema evolves and must be re-read rather than treated as a fixed waiver. The missing composite I/O conformance index identified during this release was remediated by `20260809182509` and independently verified on the hosted project.

These are a product-wide optimization backlog, not evidence that the release has failed. Each affected policy still requires authorization review and representative query profiling before it is rewritten.

## Generated types and application gates

Public declarations were regenerated from the clean 64-migration schema and include the Space plus I/O evidence tables/functions. A repeatable hosted byte-for-byte generated-type drift gate remains release work; the vouch-target function argument intentionally permits `null` in the application declaration.

Current application checks:

| Gate             | Result                                       |
| ---------------- | -------------------------------------------- |
| Prettier         | Pass                                         |
| ESLint           | Pass with 0 errors and 147 existing warnings |
| TypeScript       | Pass                                         |
| Unit tests       | Pass, 38/38                                  |
| Production build | Pass                                         |
| Dependency audit | Pass, 0 known vulnerabilities                |

The production build still reports a 645.31 kB minified JavaScript chunk. Bundle splitting and a measured performance budget remain release work.

## Local verification

The current local stack replays all 64 checked-in migrations from zero and passes 446/446 assertions across 11 pgTAP files. TypeScript types were generated from that clean schema. This supersedes the earlier 58/269, 61/376 and 62/433 evidence while leaving a production-like snapshot upgrade as a separate requirement.

The fixed-template email worker source and three template tests are present, but the worker is not deployed and made no email-provider request. The former browser-composed `resend-email-dispatcher` was replaced in place by fail-closed version 14, which returns `410 Gone`; the currency-aware receipt writer is deployed as active `io-gateway` version 18 with JWT verification enabled.

## Immediate follow-up gates

1. Reconcile the 26 local/hosted timestamp aliases into a durable source strategy without rewriting the hosted ledger.
2. Keep the fresh 64-migration/446-assertion replay and public/private lint required in CI; add a production-like snapshot upgrade.
3. Complete the authenticated `SECURITY DEFINER` function authorization matrix.
4. Verify leaked-password protection and enable it if disabled; record Auth configuration evidence.
5. Work down the RLS advisor backlog with tests and query measurements.
6. Validate the five-provider registry/capacity records through the operator boundary, then keep routing disabled until conformance, budgets, idempotency and explicit spend approval pass.
7. Configure and deploy the email worker only after provider/sender-domain approval; add schedule, sandbox delivery and dead-letter operations evidence.
