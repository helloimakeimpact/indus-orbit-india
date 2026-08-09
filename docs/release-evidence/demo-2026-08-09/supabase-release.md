# Demo Supabase release evidence — 9 August 2026

Status: deployed and remotely verified; production approval is not claimed.

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
```

`20260628124500_seed_builder_courses_and_soda_ideas.sql` was deliberately excluded. It is a separate content seed, not a prerequisite for this release.

The historical hosted ledger was preserved. No migration-history repair, deletion, rename, re-application or database reset was performed. Deployment used an authoritative temporary view containing the exact fetched hosted versions plus only the approved pending migrations.

## Live release contract

`supabase/verification/demo_release_contract.sql` is a read-only, repeatable contract that returns booleans and aggregate counts only. All 17 checks passed after the final migration:

- 8/8 release versions are recorded;
- 10/10 release relations and 9/9 caller-bound functions exist;
- 249 active ISO country records exist;
- zero existing segmented profiles are missing completed Community state;
- zero invalid consent-bearing `legacy_unconfirmed` location rows exist;
- all seven new private state tables have RLS enabled;
- browser roles cannot directly read private product/location state;
- product and location RPCs deny anonymous execution and allow authenticated execution;
- direct messages allow RLS-scoped reads but deny browser `INSERT`, `UPDATE` and `DELETE`;
- no direct-message write policy remains;
- notification rows allow owner reads and `is_read` updates only;
- Loops denies anonymous/authenticated reads and retains service-role archive read;
- all eight identified privileged functions deny anonymous execution;
- zero of five provider runtime controls is enabled;
- route receipts and provider attempts both remain zero.

## Advisor results

The hosted project has zero error-level Security or Performance Advisor findings.

The first warning-level security run identified eight anonymously executable `SECURITY DEFINER` functions. `20260809132035_revoke_anonymous_security_definer_access.sql` removed those grants. The post-migration advisor reports:

- anonymous `SECURITY DEFINER` warnings: 0;
- authenticated `SECURITY DEFINER` warnings: 40;
- leaked-password-protection warnings: 1.

Authenticated definer warnings require function-by-function classification. Caller-bound product, location, messaging and scoped admin RPCs are intentionally authenticated and tested, but inherited functions must not be granted a blanket waiver. Leaked-password protection is a hosted Auth configuration action.

The warning-level Performance Advisor reports 209 inherited policy findings:

- `auth_rls_initplan`: 112;
- `multiple_permissive_policies`: 97.

These are a product-wide optimization backlog, not evidence that the release has failed. Each affected policy still requires authorization review and representative query profiling before it is rewritten.

## Generated types and application gates

Fresh public-schema types were generated from the hosted project, formatted with the repository configuration, and compared byte-for-byte with `src/integrations/supabase/types.ts`. The checked-in file now matches; its SHA-256 is `f24cf5a0d23b92b3cf775d8c149784a0e5cb96ec0bf9666f9e03c612c7b57b35`.

Current application checks:

| Gate             | Result                                       |
| ---------------- | -------------------------------------------- |
| Prettier         | Pass                                         |
| ESLint           | Pass with 0 errors and 147 existing warnings |
| TypeScript       | Pass                                         |
| Unit tests       | Pass, 34/34                                  |
| Production build | Pass                                         |
| Dependency audit | Pass, 0 known vulnerabilities                |

The production build still reports a 645.40 kB minified JavaScript chunk. Bundle splitting and a measured performance budget remain release work.

## Local verification limitation

The 8 August baseline remains valid: 58 migrations replayed from zero, 269/269 pgTAP assertions passed, and public/private schema lint reported no errors.

On 9 August, the local reset replayed all SQL through the 59th migration, including the anonymous privilege hardening. The CLI then exited non-zero because the upgraded local Storage container remained unhealthy; Postgres terminated before the full pgTAP suite and schema lint could rerun. A direct database attempt was made once and failed because that Postgres process had already terminated. The hosted one-file pgTAP attempt also stopped before tests because the existing hosted pgTAP extension did not expose `plan()` on the local test search path.

These environment failures do not invalidate the live 17-check contract or hosted advisor result, but the 59-migration empty replay and full 285-assertion CI run are still required evidence.

## Immediate follow-up gates

1. Reconcile the 26 local/hosted timestamp aliases into a durable source strategy without rewriting the hosted ledger.
2. Repair or recreate the local Supabase stack and run all 59 migrations, 285 pgTAP assertions and public/private lint in CI.
3. Complete the authenticated `SECURITY DEFINER` function authorization matrix.
4. Enable leaked-password protection and record Auth configuration evidence.
5. Work down the RLS advisor backlog with tests and query measurements.
6. Keep provider routing disabled until conformance, budgets, idempotency and explicit spend approval pass.
