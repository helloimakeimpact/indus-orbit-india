# Finalization verification — 8 October 2026

Overall: **Partial** for full public production. Event communications and education safety source are **Verified locally**.

## Final source gates

| Gate                  | Result and boundary                                                                                                                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Migration replay      | **127 source files passed** into an independent empty application database in the dedicated container; source manifest is retained.                                                                                                                                                                    |
| Database contracts    | **34 files / 1,092 assertions passed**, no failed assertions; synthetic fixtures rolled back. Includes payload freezing/recipient checks, retries/leases/stale suppression, immutable file paths and deleted-account denial.                                                                           |
| Worker unit contracts | **19 passed**; intercepted mail/scanner fetches and dependencies, no actual supplier request.                                                                                                                                                                                                          |
| Full application gate | **Passed**: full formatting/lint/types, **214 units**, three local packages, production build and bundle budgets. Revalidated 12 October in `verify-revalidated-2026-10-12.log` after the temporary 8 October log expired. The 12 October build took 1m 53s; JS 377.12 KiB/500 and CSS 219.04 KiB/250. |
| Public type contract  | Passed against generated public types with exactly **97 reviewed hash-bound held Spaces differences**; no broad overwrite/allowance.                                                                                                                                                                   |
| Schema lint           | Final `public,private` error-level lint exits zero.                                                                                                                                                                                                                                                    |
| Worker entry points   | Strict TypeScript with installed SDK **2.111.0**, matching pinned imports, and a minimal Deno env/serve ambient declaration. Native Deno is not installed locally; actual Edge compilation/HTTP acceptance remains due in staging.                                                                     |

Final engine: `supabase_db_indus-launch-finalize-20261007`, database `indus_release_verified_20261008`, port 55562, image `public.ecr.aws/supabase/postgres:17.6.1.156`. The bootstrap uses local schema-only Auth/Storage/Realtime definitions with no user/application data, drops inherited application policies/triggers, supplies normal Realtime/default privileges, and removes a vendor privileged logging override only in the test bootstrap. Application migration source is unchanged by that setup. Explicit BEGIN/COMMIT files retain their transaction boundaries; the failed uncommitted payload-expression iteration was rolled back before replaying its corrected file and the final tail. All 127 resulting records/source hashes are checked.

This verifies application contracts. It does not substitute for a production snapshot upgrade, exact hosted grants/ownership, genuine Auth/Realtime/Storage/Supplier personas or actual email/scanner delivery. The earlier 3 October browser/race evidence remains dated; those browser journeys were not rerun in this continuation.

## Repaired findings and environmental attempts

- Initial separate-container startup exceeded readiness; standard bootstrap dependencies were supplied explicitly. Failed attempts are not passing replay evidence.
- A denied SQL set-returning wrapper triggered a shared local engine backend segmentation fault and automatic recovery. Further testing moved to the dedicated container. Public claim wrappers use non-inlined PL/pgSQL; denied-call contracts now pass there. No hosted crash/write occurred.
- Stale expired leases were counted as dead letters; stale suppression now takes precedence.
- Complete email sender/subject/text/HTML/recipient snapshots are persisted before sending, preventing idempotency conflicts across renderer/configuration changes.
- Signed URLs authorize paths. Browser mutation/removal/reuse is denied; the app requests five-minute links and attachment removal removes only its reference. Existing URLs are not claimed instantly revoked.
- Deleted account JWTs cannot obtain new education links/status.
- Return-field order was aligned to generated types. A data-modifying fixture CTE and a payload-bound expression were repaired; final contracts and type checks pass.

## External boundary

Fresh read-only metadata confirms member GitHub main `04e10e5`, admin main `20b5940`, and healthy Indus Orbit project `jpwvgpnbkrktipwhvqss` at PostgreSQL 17.6.1.104, 116 migration records and ten functions. Four candidate functions are absent hosted. Nine reviewed forward migrations and coordinated frontend/function delivery remain pending; held Spaces/historical aliases remain separate.

No source commit/push, hosted write, real email/scan/model/payment request or real personal-data deletion occurred. Owner retention rules remain pending; no proposed 90-day purge is enabled.

Read [the finalization report](../../io-system/PRODUCTION_STATUS_2026-10-08.md) and [retention worksheet](../../io-system/PRIVACY_RETENTION_WORKSHEET.md).

## 12 October retained handoff

All 127 migration, 34 contract and twelve application file hashes still match their saved manifests. No new SQL pass is claimed; the full app gate passed again and its log is retained directly in this folder. Fresh remote metadata remains member main `04e10e5`, healthy project `jpwvgpnbkrktipwhvqss`, 116 migrations and ten active functions. See `external-refresh-2026-10-12.json`. The dedicated container is stopped and the task-created database in the shared local engine was removed. No source commit/push or hosted change occurred.
