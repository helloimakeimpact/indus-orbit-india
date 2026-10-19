# Source publication — 19 October 2026

Status: **Verified** for published source and CI; full public production **Partial**.

## Published code

- Member/backend [124de99](https://github.com/helloimakeimpact/indus-orbit-india/commit/124de9969478a136d49d62a6041afc5c54800e2e), with managed-stack follow-up [3a8a3be](https://github.com/helloimakeimpact/indus-orbit-india/commit/3a8a3bee5cf2fe8216dbc5e044005dadbc7dddbf).
- Admin [d765620](https://github.com/helloimakeimpact/admin-indus-orbit/commit/d765620f44146f0b4e372532ebd6256a66a372cd), exactly matching local a130ff9’s source tree `56bc4dc1b2f84c765ee5eba8b82e36ccfe1b9fa1`. Remote history is preserved through the connected GitHub app with a non-forced expected-head update; differing local history predates this increment.

The later publication-document commits contain documentation/evidence only. The links below establish the exact tested code boundary rather than assuming a source file or deployment trigger is live production acceptance.

## Passing gates

[Member Quality](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/39252910174), [Database quality](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/39252910170) and [Admin quality](https://github.com/helloimakeimpact/admin-indus-orbit/actions/runs/39222546225) all pass.

- 236 member units; 35 admin units; 49 browser journeys across public/mobile/accessibility, configured guest/Turnstile, signed-in continuity/download and admin/MFA flows.
- All 130 migrations replay from an empty managed Supabase stack; all 38 SQL files / 1,237 assertions pass. Exact generated types retain the same 97 reviewed/hash-bound held Spaces differences. Public/private schema lint passes.
- Both full application gates, production builds and bundle budgets pass. Dependency audits have zero findings after the compatible TanStack critical-XSS patch. SDK worker entrypoints have local TypeScript evidence; real deployed Edge/Auth/Storage acceptance remains separate.

The first database CI run passed replay/types but exposed fixture-only direct Storage deletion and missing default profile grants. The follow-up tests use the API transaction flag inside rollback fixtures, keep the Storage guard installed and grant only the tested profile column. Closure policies now guard active RLS tables independently of ACL defaults, excluding the retired Loops archive. These are verified against the full managed stack; no hosted migration or real deletion was performed.

## Production boundary

Correct existing backend: **Indus Orbit / jpwvgpnbkrktipwhvqss**, last read-only snapshot 18 October: healthy, 116 migrations and ten active functions. Twelve explicitly reviewed forward migrations and seven functions remain for staging/production delivery. No blanket push/history repair is authorized. Source pushes may trigger Netlify; exact deployed commit and backend compatibility still require acceptance.

Your retention choice is resolved under the 15 October delegation. The remaining work is [the current production report](PRODUCTION_STATUS_2026-10-19.md), [owner setup](PRODUCTION_OWNER_ACTIONS.md) and [privacy delivery/operations](PRIVACY_EXECUTION_RUNBOOK.md): staging, supplier configuration, actual operators/MFA, trusted worker activation, assisted privacy/recovery, applicable future archive work, provider/runtime/finance scope and launch sign-off.

[Exact publication metadata](../release-evidence/finalization-2026-10-18/publication.json), source manifests and local evidence preserve these boundaries. Source publication is not labelled Released.
