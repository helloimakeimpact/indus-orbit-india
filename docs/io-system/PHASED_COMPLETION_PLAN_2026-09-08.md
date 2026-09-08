# Indus Orbit phased completion plan — 8 September 2026

Status: active handoff plan. This is the short current sequence across the
member app, I/O Port, Community, packaged client, Supabase and separate admin
app. Detailed historical evidence remains in `FINALIZATION_EXECUTION_PLAN.md`
and `FINAL_CODE_LEVEL_AUDIT_2026-09-06.md`.

## Current verified/released baseline

| Area                  | Current state                                                  | Evidence at this checkpoint                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity/test session | Released identity; local acceptance Verified                   | Supabase project `jpwvgpnbkrktipwhvqss` is healthy; the primary Google-auth account loads both the deployed baseline and current local member shell. The backup password account exists, is confirmed and was not used because the primary session is sufficient.                                                                                                        |
| I/O member shell      | Released baseline; current local UI Verified; zero live routes | The current local repository build—not the older `indusorbit.com` deployment—is the acceptance target for this change. All eight rail buttons reach distinct canonical URLs/headings; Terminal survives reload; browser console showed no errors. Production has zero routable connections.                                                                              |
| I/O gateway           | Released foundation                                            | `io-gateway` v28, `io-openai` v12 and conformance v3 are active. Chat/Responses JSON/SSE, tools/structured output/vision gates, budgets, exact 5.5% settlement, receipts, credits/invoices and Razorpay boundaries exist but provider/payment activation is fail-closed.                                                                                                 |
| Orbit Community       | Partial                                                        | The current local build rendered Home, Board, Saved work, Messages, Safety/appeals, Missions, Chapters, Network and Settings for the primary account against hosted data with no browser console errors. The shared shell/store and broad collaboration code exist; structured Spaces remain locally Verified pending owner release approval and multi-persona evidence. |
| OpenCode client       | Verified locally                                               | Independently buildable client includes bounded pairing, SSE/reconciliation, continued prompts, tasks, diffs, reviewed commands, approval modes, cancellation/revert and local handoffs. Real daemon and signed installers remain external gates.                                                                                                                        |
| 9router adoption      | Phase 0 Verified locally                                       | Pinned source review, selection/rejection matrix, MIT notice and the new dependency-free `io-transport-core` package with seven focused contracts. No production traffic changed.                                                                                                                                                                                        |
| Admin app             | Verified locally/published source                              | Separate least-privilege control plane includes provider, Trust, content, programme, member-support, privacy, finance, attachment, appeal, notification and audit surfaces with AAL2/two-person root designs. It still needs its own Netlify site/hostname and real operator personas.                                                                                   |
| Database              | Released plus held migration                                   | 116 hosted migration records through `20260907090226`; zero routable provider connections. The broad structured-Spaces migration remains intentionally unapplied.                                                                                                                                                                                                        |

Verification at this checkpoint: member formatting, repository-wide lint,
typecheck, 114/114 unit contracts, both package builds, production build/bundle
budgets and 6/6 public Playwright checks pass. Admin formatting, lint, typecheck,
32/32 contracts, production build/budgets and 4/4 public Playwright checks pass.
The admin browser currently offers password sign-in only, so the primary
Google-only test identity cannot provide authenticated admin evidence without a
reviewed OAuth addition or a separate admin password identity.

## Phase 1 — close the current repository change

Engineering:

1. Build and test `io-transport-core`.
2. Run the complete member verification gate and review the repository diff.
3. Update the canonical I/O, completion and finalization records.
4. Commit the member repository and push only after the full gate passes.

Exit: clean tracked worktree, reproducible green gate and remote commit. No
database or provider change is part of this phase.

Owner input: none.

## Phase 2 — authenticate the full product with deliberate personas

Engineering:

1. Retain the current primary account for member/I/O happy paths.
2. Use the backup account only when a second identity is required.
3. Add dedicated ordinary-member, Space manager, removed/timed-out member,
   scoped admin, finance admin and two independent root-admin test identities.
4. Run desktop/mobile Playwright journeys for I/O, Community opt-in, DM two
   devices, Rooms/Threads/attachments, permissions/view-as-role, privacy export
   requests, AAL2 and two-person root changes.
5. Preserve short-lived storage state outside Git; never commit passwords,
   refresh tokens or TOTP seeds.

Exit: positive and negative journeys prove both access and denial; reconnect,
unread, typing expiry, offline replay and refresh continuity pass.

Owner input: permission to create/use the required test identities and two real
TOTP-enrolled root operators. Joining Chapters/Missions or creating test content
also requires explicit approval because it changes hosted member data.

## Phase 3 — adopt the selected 9router transport layer

Engineering:

1. Finish Phase 1 translators, loss reports and adversarial fixtures from
   `io-port-system/NINEROUTER_SELECTIVE_ADOPTION.md`.
2. Build the private execution adapter and service-identity route grant.
3. Shadow current vs new transforms on non-billable fixtures.
4. Canary one approved provider/model/capability; retain immediate rollback.
5. Add the same core to the signed personal relay only after the server boundary
   proves stable.

Exit: provider-specific conformance, exact usage reconciliation, no-body logs,
SSRF/cancel/failure tests, soak evidence and one-action rollback.

Owner input: runtime hosting decision; written provider authorization; the first
capped conformance call; supported local operating systems and signing identity.

## Phase 4 — release structured Orbit collaboration

Engineering after approval:

1. Apply the reviewed additive structured-Spaces migration through the hosted
   migration API.
2. Re-run database contracts and security/performance advisors.
3. Run source-role, Room lifecycle/reorder/archive, Boards, saved items,
   remove/timeout and moderation personas.
4. Deploy the member build and verify Netlify production.
5. Connect the selected scanner and notification workers, schedules, retry and
   dead-letter alerting.

Exit: manager/member/removed/outsider tests pass; attachments stay quarantined
until a signed scanner verdict; notification retry/dead paths are observable.

Owner input: explicit structured-Spaces authorization approval; scanner and
delivery vendor selection/contracts/secrets; schedule and alert owners.

## Phase 5 — activate one managed I/O provider

Engineering after approval:

1. Register exact official model and price versions plus region, retention,
   training and capability evidence.
2. Validate the existing server-side secret reference without exposing it.
3. Execute the USD 0.01-capped conformance run.
4. Activate only the passed model/capability pair for one controlled workspace.
5. Exercise Chat/Responses streaming, cancellation, tools, structured output,
   vision if contracted, usage settlement, circuit opening/recovery and disable.
6. Reconcile the provider statement against I/O receipts before expansion.

Exit: no double charge/retry, no fallback after first byte, exact currency and
billing units, immediate audited kill switch and retained evidence.

Owner input: choose OpenAI or DeepSeek first; written onward-access/resale terms;
allowed regions/retention/no-training policy; approve the capped request. A China
hosted DeepSeek path stays explicit and opt-in at workspace policy level.

## Phase 6 — activate finance and commercial operations

Engineering after policy approval:

1. Configure separate Razorpay test/live server secrets and webhook endpoints.
2. Load the approved Indian GST/SAC/place-of-supply, FX, invoice numbering,
   refund/chargeback and credit-expiry policy versions.
3. Run retained sandbox order, signature, capture, duplicate webhook, failed
   payment, partial/full refund and invoice-credit-note journeys.
4. Reconcile Razorpay, I/O ledger, tax invoice and provider statement.
5. Enable live finance in a small cohort with alerts and rollback.

Exit: accountant-approved documents; immutable issued invoices; idempotent money
movement; refund and FX totals reconcile in minor units/nanos.

Owner input: Razorpay merchant credentials, legal entity/GST data, accountant,
treasury and refund-policy approvals.

## Phase 7 — finish local terminal distribution and optional hosted runners

Engineering:

1. Pin the supported OpenCode daemon versions and run the real-daemon matrix.
2. Replace the browser password lease with daemon-issued short-lived pairing,
   explicit revoke and step-up expiry/race tests.
3. Package the local transport/personal relay and OS-keychain credentials.
4. Sign, notarize and publish installers with signed updates and rollback.
5. Treat hosted runners as a separate service with workload identity, sandbox,
   network/filesystem/secrets policy, quota and incident model.

Exit: tested installs/upgrades/uninstall, safe command approvals, offline resume,
no local secret/content upload and real-daemon compatibility evidence.

Owner input: v1 operating systems, signing/notarization accounts and whether
hosted runners are funded/in scope.

## Phase 8 — deploy and exercise the separate admin app

Engineering:

1. Connect `helloimakeimpact/admin-indus-orbit` to its own Netlify site.
2. Add the same reviewed Supabase Google OAuth entry to the admin sign-in or
   provision dedicated password-based admin test identities; do not weaken the
   database capability/AAL2 checks.
3. Set only the Supabase URL, publishable browser key and member-app URL.
4. Assign the admin hostname and verify SPA/security headers.
5. Run scoped duty, AAL2, two-person root, Trust, attachment, appeal,
   notification, privacy, provider, budget, circuit, finance and audit personas.
6. Remove/redirect remaining member-app admin surfaces only after parity and
   negative-role evidence.

Exit: ordinary members receive no admin projection; each duty is independently
least-privilege; two roots and re-auth are proven; provider secrets remain absent
from the browser.

Owner input: admin hostname/Netlify access, sign-in method, initial operators and
duty grants.

## Phase 9 — production operating gate

Engineering and operations:

1. Rehearse staging promotion, rollback, backup/restore and secret rotation.
2. Establish redacted telemetry, SLOs, cost/health/security alerts and incident
   runbooks.
3. Complete manual accessibility, field performance, mobile, load/soak and
   disaster-recovery evidence.
4. Implement privacy export generation and deletion execution only after the
   approved data inventory, retention/legal-hold and verification policy.
5. Review remaining Supabase security-definer/RLS advisor warnings individually;
   do not mass-rewrite permissions without negative-role evidence.

Exit: named owners, approved launch cohort/budget/support SLA, zero unresolved
critical/high findings and an immutable release record.

Owner/external input: privacy/legal/security approvers, launch cohort, production
budget, support/incident ownership and RPO/RTO.

## What is ordinary code work versus correctly blocked work

Ordinary code work now: the pure 9router-derived translator phases, execution
adapter, fixtures, service-auth and packaging can proceed without exposing or
spending a provider secret.

Correctly blocked until input: hosted structured-Space authorization changes,
paid provider calls/activation, production payment/tax activation, external
scanner/delivery schedules, privacy purge workers, real two-person root proof and
signed installers. Implementing around those decisions would create a false or
unsafe production claim.
