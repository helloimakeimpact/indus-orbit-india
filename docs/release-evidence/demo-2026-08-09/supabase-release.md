# Demo Supabase release evidence — 9 August 2026

Status: ten-migration demo release deployed and remotely verified; production approval is not claimed.

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
```

`20260628124500_seed_builder_courses_and_soda_ideas.sql` was deliberately excluded. It is a separate content seed, not a prerequisite for this release.

The historical hosted ledger was preserved. No migration-history repair, deletion, rename, re-application or database reset was performed. Deployment used an authoritative temporary view containing the exact fetched hosted versions plus only the approved pending migrations.

## Live release contract

`supabase/verification/demo_release_contract.sql` is a read-only, repeatable contract that returns booleans and aggregate counts only. All 20 checks passed after the final migration:

- 10/10 release versions are recorded;
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
- provider/model/endpoint/capacity/runtime-control inventory and ready-route counts are zero;
- route receipts and provider attempts both remain zero.

## Advisor results

The hosted project has zero error-level Security or Performance Advisor findings.

The first warning-level security run identified eight anonymously executable `SECURITY DEFINER` functions. `20260809132035_revoke_anonymous_security_definer_access.sql` removed those grants. The post-migration advisor reports:

- authenticated `SECURITY DEFINER` warnings: 45;
- GraphQL table-exposure warnings: 47 (`anon`: 6; `authenticated`: 41);
- always-true policy warnings: 2;
- intentional private RLS-with-no-policy information notices: 16.

Authenticated definer and GraphQL exposure warnings require function/table classification. Caller-bound product, location, messaging and scoped admin RPCs are intentionally authenticated and tested, but inherited functions must not be granted a blanket waiver. Leaked-password protection is not reported by the current database advisor output; its hosted Auth setting still requires separate configuration evidence.

The Performance Advisor reports 211 warning-level inherited policy findings and 118 information-level index findings:

- `auth_rls_initplan`: 134;
- `multiple_permissive_policies`: 77;
- `unindexed_foreign_keys`: 25 information notices;
- `unused_index`: 93 information notices.

These are a product-wide optimization backlog, not evidence that the release has failed. Each affected policy still requires authorization review and representative query profiling before it is rewritten.

## Generated types and application gates

Public declarations were refreshed for the trusted-event columns and functions. A repeatable byte-for-byte generated-type drift gate remains release work; the vouch-target function argument intentionally permits `null` in the application declaration.

Current application checks:

| Gate             | Result                                       |
| ---------------- | -------------------------------------------- |
| Prettier         | Pass                                         |
| ESLint           | Pass with 0 errors and 147 existing warnings |
| TypeScript       | Pass                                         |
| Unit tests       | Pass, 37/37                                  |
| Production build | Pass                                         |
| Dependency audit | Pass, 0 known vulnerabilities                |

The production build still reports a 645.31 kB minified JavaScript chunk. Bundle splitting and a measured performance budget remain release work.

## Local verification limitation

The 8 August baseline remains valid: 58 migrations replayed from zero, 269/269 pgTAP assertions passed, and public/private schema lint reported no errors.

On 9 August, the local reset replayed all SQL through the 59th migration, including the anonymous privilege hardening. The CLI then exited non-zero because the upgraded local Storage container remained unhealthy; Postgres terminated before the full pgTAP suite and schema lint could rerun. A direct database attempt was made once and failed because that Postgres process had already terminated. The hosted one-file pgTAP attempt also stopped before tests because the existing hosted pgTAP extension did not expose `plan()` on the local test search path.

The local containers later recovered. Both trusted-event migrations applied to the existing local chain and all ten pgTAP files passed 376/376. This does not replace the still-required fresh 61-migration empty replay and production-like snapshot upgrade.

The fixed-template email worker source and three template tests are present, but the worker is not deployed and made no email-provider request. The former browser-composed `resend-email-dispatcher` was replaced in place by fail-closed version 14, which returns `410 Gone`; `io-gateway` remains version 17.

## Immediate follow-up gates

1. Reconcile the 26 local/hosted timestamp aliases into a durable source strategy without rewriting the hosted ledger.
2. Run a fresh 61-migration/376-assertion empty replay and public/private lint in CI; retain the current upgraded-local pass as separate evidence.
3. Complete the authenticated `SECURITY DEFINER` function authorization matrix.
4. Verify leaked-password protection and enable it if disabled; record Auth configuration evidence.
5. Work down the RLS advisor backlog with tests and query measurements.
6. Provision reviewed provider registry/capacity records through the operator boundary, then keep routing disabled until conformance, budgets, idempotency and explicit spend approval pass.
7. Configure and deploy the email worker only after provider/sender-domain approval; add schedule, sandbox delivery and dead-letter operations evidence.
