# Source publication and CI follow-up — 13 October 2026

Full public production: **Partial**. Source publication is authorized; hosted service delivery and launch acceptance remain pending.

## Published source

- Member source: [e568135](https://github.com/helloimakeimpact/indus-orbit-india/commit/e568135c663cda39999bf1b4b800bdcf3e5eb7cd), including the preceding local checkpoint e63290c.
- Admin source: [bdcc6c2](https://github.com/helloimakeimpact/admin-indus-orbit/commit/bdcc6c28d7a0d7e4201a86abe94550a5a4b4f7f3). Local commit 03d8d3c and the published commit have the same tree, `6d7cc1d68fcc81542a8e0ad3346c7370c45394ab`. The connected GitHub app preserved remote parent 20b5940 with a non-forced, expected-head update. The repositories already had different local/remote admin commit histories; no history was reset.

The 13 October read-only hosted snapshot remains 116 migrations and ten active functions. The ten reviewed forward releases and four candidate functions in the handoff have not been deployed by this pass. A GitHub main push may trigger the connected Netlify build; it does not establish hosted backend acceptance.

## CI findings and source remediation

The first member Quality run stopped at dependency audit (15 findings, including ten high and one critical). Admin Quality stopped at one high finding. Database Quality replayed all 128 source migrations and passed the exact public type boundary, then stopped at the education test fixture's direct metadata DELETE: the current Storage runtime enforces a statement-level deletion guard. That first run did not pass the complete SQL gate.

The follow-up removes unused `@cloudflare/vite-plugin` and `@lovable.dev/vite-tanstack-config` packages. The active Vite configuration already uses its own TanStack, React, Tailwind and path plugins. This removes 99 unused transitive packages and their vulnerable chains. Seroval is patched to 1.6.9 and source-map-js to 1.2.2; the admin lockfile also updates source-map-js to 1.2.2. No framework major upgrade or audit exception is introduced. Both refreshed audits report zero findings.

Official advisory evidence: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [Seroval callable handling](https://github.com/advisories/GHSA-p6vx-979v-rg4c), [Seroval typed arrays](https://github.com/advisories/GHSA-jp82-f5mq-hwhp), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), and [sharp/librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w). Reviewed 13 October 2026.

Public canonical/Open Graph metadata, robots and sitemap now use **https://indusorbit.com** instead of the old Lovable hostname. The sitemap has 34 unique approved-domain URLs, including Events and Communities. Original artwork, brand identity and approved wording remain retained.

## Storage fixture boundary

The synthetic rollback-only education contract sets `storage.allow_delete_query` only around its two metadata DELETE statements and restores it immediately. This allows the fixture to test the browser RLS denial and perform privileged synthetic cleanup under the current Storage API context. It does not remove the vendor guard, alter application grants or change production migrations. Real physical cleanup must use the Storage API after approved retention and hold checks, as required by [Storage schema guidance](https://supabase.com/docs/guides/storage/schema/design).

## Follow-up verification

The full member gate passes 214 unit tests, three package builds, formatting, lint, types and bundle budgets (1m40s). The full admin gate passes 33 unit tests, formatting, zero-warning lint, types, build and budgets (53.09s). Both dependency audits report zero findings. Exact follow-up source hashes, logs, Storage assertions and publication/CI outcomes are filed under `docs/release-evidence/finalization-2026-10-13/` separately from the initial source checkpoint.

Privacy export/deletion workers and physical cleanup still await the owner's alternative retention/inventory rules. The proposed 90 days is not approved. Real suppliers, MFA/personas, staging delivery, recovery and public launch sign-off remain required; see [the handoff](PRODUCTION_STATUS_2026-10-13.md) and [owner actions](PRODUCTION_OWNER_ACTIONS.md).
