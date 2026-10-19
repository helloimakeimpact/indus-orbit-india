# Source verification — 18 October 2026

Status: **Verified** within the local scopes below; hosted release **Partial**. The owner authorized source commit/push and Docker Desktop restart. No production migrations, functions, Auth operations, file deletion, messages or paid requests occurred.

- Member `npm run verify`: formatting, lint, types, 236 units, three package builds, production build and budgets. Final security-patched gate is recorded in publication evidence after completion.
- Admin `npm run verify`: 35 units, formatting, zero-warning lint, types, production build and budgets. Eight intercepted admin journeys pass, including current-version deletion approval/stale recovery.
- Member browser: 13 intercepted signed-in journeys, including owned-artifact download and discard of a late signing result after account change; tab return/token refresh preserve drafts. Public checks after the security update are recorded in publication evidence. An earlier simultaneous two-server run was invalidated by server shutdown/connection failures; do not count it as passing evidence.
- SQL: all 38 rollback-only files / 1,237 assertions pass. The corrected account-closure contract has 39; export has 28; retention has 27. The closed-account policy covers active RLS tables independently of environment default/column grants, and leaves archived Loops without new browser policies. The Data API hook is a public invoker wrapper that permits anonymous requests while enforcing private checks for authenticated requests.
- Source replay: all 130 migrations applied to an empty local application schema, reconstructing the managed Auth/Storage/Realtime bootstrap objects and ownership required by a database-only container. This is not an actual full Supabase CLI reset, production upgrade or external service acceptance. Canonical managed-stack replay remains a source CI gate.
- Public/private lint returns zero errors. Browser declarations match local generated types plus 97 exact hash-bound held Spaces differences. No wholesale generated-type replacement occurred.
- Three new Edge entrypoints pass TypeScript with pinned Supabase SDK 2.111.0 and a minimal Deno declaration. Worker handlers have 20 dependency-injected tests. These checks do not prove deployment, real Auth/Storage calls or scheduling.
- Refreshed audits found the TanStack critical XSS advisory after the previous checkpoint. Source remediation pins the compatible patched Start/router/plugin graph and preserves Prettier 3.8.2. Final audit and package versions are recorded separately.

## Commands and fixture boundaries

`npm run verify` in each checkout; `npm run test:e2e:member-ui -- --workers=2`; admin `npm run test:e2e:admin-ui -- --workers=2`; public `npm run test:e2e -- --workers=2`; `node node_modules/typescript/bin/tsc -p` against a temporary edge-entrypoint config; CLI `supabase db lint --db-url <synthetic-loopback-db> --schema public,private --level error --fail-on error`; CLI `supabase gen types --db-url <synthetic-loopback-db> --schema public`; `npm run check:supabase-types -- --generated <local-generated-file> --replay-boundary`.

Database files were piped sequentially through local container `psql -X -v ON_ERROR_STOP=1 -At`; the harness rejects SQL errors and pgTAP `not ok`, not merely a zero process exit. Individual tests roll back. Storage metadata and Auth deleted-at confirmation in these tests are synthetic API-confirmation fixtures, not deletion of live bytes/accounts. Native GoTrue, Storage, managed Realtime, actual AAL2, suppliers and restore acceptance remain in the runbook.

See the source manifests, sanitized hosted refresh and [current production report](../../io-system/PRODUCTION_STATUS_2026-10-18.md). Publication records are appended only after actual commits/remote checks; source publication alone never establishes Released.

## Final local gate — 19 October

The final compatible security-patched graph passes the complete member and admin application gates. All 49 browser journeys pass: member 13, public 20, configured guest/Turnstile four, admin eight and admin public four. Audits report zero findings. The router error component now accepts the patched library’s unknown-error type and narrows debug rendering to Error instances. See `local-final-gates-2026-10-19.json`. Earlier interrupted/simultaneous server attempts are superseded; they are not counted as passes.

## Managed-stack CI follow-up — 19 October

The first published member/admin application workflows pass. Database CI successfully replays all 130 migrations and matches the exact type boundary, then exposes three fixture differences: profile table grants are absent in the clean stack, and current Storage blocks direct metadata DELETE. The follow-up tests grant only the inspected profile column inside their rollback transaction and model the Storage API’s transaction flag without removing its protection trigger (the same pattern already used by education quarantine tests). Production workers still use the Storage API exclusively.

The closure migration now guards every active RLS table independently of table/column ACL defaults, while preserving the archived Loops zero-policy contract. This protects tables that gain scoped column access in the target environment. Hosted application of either privacy migration remains pending. Final managed-stack pass/fail is recorded only after the follow-up commit finishes CI.
