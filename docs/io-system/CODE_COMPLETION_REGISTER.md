# Indus Orbit code completion register

Status: whole-product code and release filing audited 19 August 2026. See `FULL_CODE_AUDIT_2026-08-19.md` for the verification record.

This is the canonical answer to “what is done, what needs improvement, and what is left?” It separates checked-in/local evidence from the hosted demo and from production. A migration, secret, provider row or UI preview is not a release by itself.

## Completion register

| System                                | State    | Implemented evidence                                                                                                                                                                                                                                                    | Work still required                                                                                                                                                                                                                                    |
| ------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public brand and information site     | Partial  | Public routes cover the Indus Orbit story, work, members, skills, S.O.D.A., writing, contact and I/O Port with shared brand tokens/components.                                                                                                                          | Approve claims/content/artwork, correct final metadata, connect evidence-backed publishing, complete accessibility/performance/analytics consent and release review.                                                                                   |
| Authentication and product onboarding | Partial  | A signed-in identity may use top-level `/io` without Community onboarding. `/app` requires explicit, versioned Community completion. Intent and optional location foundations are caller-bound.                                                                         | Production email/OAuth, MFA/step-up for privileged users, session review/revocation, recovery/export/deletion, abuse protection and multi-persona browser tests.                                                                                       |
| Global location system                | Released | Optional, country-first, purpose-bound location foundation is deployed to the demo; browser access to private location records is denied and consent can be withdrawn.                                                                                                  | Browser personas, operator-safe aggregate measurement, retention rules, translations and reviewed residency/location wording.                                                                                                                          |
| Profiles, directory and trust graph   | Partial  | Profiles, directory, connection, endorsement, role, verification and report foundations exist.                                                                                                                                                                          | Central permissions, visibility/block/report state machines, atomic support/moderation RPCs, pagination/search, appeals and concurrency/persona tests.                                                                                                 |
| Vouch and mentorship                  | Partial  | Caller-bound vouch request/redemption and mentorship request/transition foundations exist.                                                                                                                                                                              | Authoritative issuance/hashing, complete rate/replay/appeal rules, calendar lifecycle, email worker and multi-persona tests.                                                                                                                           |
| Missions, Chapters and Spaces         | Partial  | Chapter/Mission lifecycle and membership foundations plus deterministic Space/Room projection, message/read boundary and first branded UI are Released to demo.                                                                                                         | Threads, room/role administration, moderation, paging/search, attachments, programme metrics and hosted browser personas.                                                                                                                              |
| Learning, skills and knowledge        | Partial  | Courses, lessons, progress, quizzes, skills, S.O.D.A. and stories exist. Loops is removed from active product source and retained only as a service-role archive in demo.                                                                                               | Decide Loops archive retention, move correctness/scoring to trusted boundaries, finish authoring/provenance/search/accessibility/analytics and storage verification.                                                                                   |
| Events and opportunities              | Partial  | Event list/detail and RSVP surfaces exist.                                                                                                                                                                                                                              | Capacity/waitlist/time-zone/cancellation state, organizer commands, calendar/notification integration, abuse controls and tests.                                                                                                                       |
| Human conversations and notifications | Partial  | Direct-message send/read RPC boundary, trusted events/outbox, notifications and Space message/read boundary are Released. A caller-bound 50-row keyset history RPC and Load earlier UI are Verified locally.                                                            | Release migration 68, then add a shared conversation store, blocks, group collaboration, private Broadcast, attachments, dead-letter operations, email-worker deployment and E2E/load tests.                                                           |
| Discord-like branded spatial shell    | Partial  | The existing app has branded Space/Room geometry, durable timeline/composer and people inspector; I/O has its own branded control-room geometry.                                                                                                                        | Extract reusable Orbit rail/context/workspace/inspector primitives across Messages, Missions, Chapters and I/O; add drawers, keyboard/a11y, attention semantics and visual tests. Do not copy Discord branding or merge human chat with terminal data. |
| Separate admin control plane          | Partial  | Independent `admin-indus-orbit` app, shared identity, scoped capabilities, audited duty changes, explicit fail-closed unknown/nested routes, provider switch/readiness and redacted evidence exist. Budget/circuit controls are Released; 11 tests and CI pass locally. | Host the admin app, add authenticated role personas, MFA/re-auth/two-person root change, conformance/evidence workflows, reconciliation and transactional trust/member/content/program commands.                                                       |
| I/O Port public/member UI             | Partial  | Public `/io-port`, authenticated `/io`, workspace/capacity/audit/receipt views, dynamic route/model selection, real budget status and durable local-terminal session history are implemented; their schema and gateway contracts are Released to the demo.              | Deploy the member web build, add preflight/candidate explanation, credits/invoices, richer history/filters, live health detail and complete I/O-only/member/admin browser journeys.                                                                    |
| I/O provider registry/control plane   | Partial  | Released demo registry contains five staged providers/models/endpoints/capabilities/prices/connections/runtime controls and three capacity sources/grants. Endpoint-bound freshness/conformance rules fail closed.                                                      | Validate each secret reference/account, build and approve conformance, activate one route at a time, add evidence lifecycle, BYOK/owned/sponsored capacity and expand the researched inventory only with reviewed facts.                               |
| I/O gateway/model routing             | Partial  | Demo `io-gateway` v20 is Released with JWT, entitlement, deterministic selection, idempotency, hard reserve, bounded fallback, circuits, atomic settlement, redacted receipts and a 2 MiB validated success-body boundary.                                              | Add streaming, tools, structured output, media, cancellation propagation, formal policy snapshots, cached pricing/FX and provider-specific conformance.                                                                                                |
| I/O accounting and budgets            | Partial  | Released integer-minor-unit budget versions, usage reservations/records and balanced double-entry route ledger implement `reserve → dispatch → settle once → release remainder`, including stale-hold expiry. Member and admin budget views are wired.                  | Concurrency-test with controlled provider traffic; decide currencies/FX, credits/sponsorship expiry, fee/tax policy, invoices, payments/refunds/chargebacks and provider-bill reconciliation.                                                          |
| I/O health and circuit controls       | Partial  | Released endpoint samples, circuit state/events, automatic outcome recording, resolver exclusion and capability-checked admin manual open/close controls exist.                                                                                                         | Add scheduled probes, latency/queue scoring, retry budgets, SLO alerts, automatic recovery policy and operator drills.                                                                                                                                 |
| Local terminal/OpenCode               | Partial  | Loopback/in-memory-password validation, health/session/prompt flow and Released safe durable metadata exist. Caller cancellation, 45-second timeout, input bounds, 1 MiB response limit and durable `stopped` lifecycle are Verified locally.                           | Add event streaming, daemon-confirmed abort, resume/fork/tasks, approval enforcement, tools/commands, diffs/artifacts, explicit sharing/handoff, pairing and packaged clients.                                                                         |
| OpenAI-compatible I/O API             | Planned  | The web gateway and normalized provider adapter path provide reusable foundations.                                                                                                                                                                                      | Define API keys/scopes/rate limits, `/v1/models`, streaming chat/responses compatibility, policy/budget parity, SDK/CLI contracts and conformance tests.                                                                                               |
| Hosted terminal/runners               | Planned  | Architecture and safety boundary are documented.                                                                                                                                                                                                                        | Runner control plane, outbound attach, workload identity, isolation, network/filesystem/secrets policy, quotas, scheduling, artifact store, observability, recovery and funded operations.                                                             |
| Supabase platform/data integrity      | Partial  | Hosted project `jpwvgpnbkrktipwhvqss` has 67 migrations and gateway v20. All 68 migrations replay locally with 550 assertions and lint; migration 68 is not hosted.                                                                                                     | Restore an IPv4-capable release path, release/verify migration 68, automate generated-type drift, retain alias-safe deployment, run personas/Advisors and establish staging/backup/restore.                                                            |
| Engineering quality and CI            | Partial  | Member typecheck, 46 unit tests, lint/build/format pass. Admin 11 tests/typecheck/build/format and CI pass. Database suite passes 550 assertions. Both production dependency audits report zero vulnerabilities.                                                        | Require all checks in both repositories; add component/Playwright/accessibility/visual/load/soak coverage, bundle budgets, generated-type drift and hosted contracts.                                                                                  |
| Deployment/observability/operations   | Partial  | Cloudflare-oriented app config, Supabase functions/migrations, operator guidance and safe audit foundations exist.                                                                                                                                                      | Choose production owners/hostnames, promotion/rollback pipeline, secret rotation, structured telemetry/redaction, SLO/alerts/dashboards, incident/support runbooks and disaster-recovery rehearsal.                                                    |
| Privacy/safety/legal/commercial       | Partial  | RLS, redacted evidence, location consent and people-centred product principles form the base. No prompt/output/secret is stored in I/O receipts or terminal metadata.                                                                                                   | Independent review; data inventory/retention/export/deletion; DPAs/terms/residency claims; model evaluation/moderation; donated capacity consent; tax/payment/refund rules and named approvers.                                                        |

## New code verified on 19 August 2026

### Audit finalization

- Direct conversation history is keyset-paginated through a caller-bound RPC and both conversation surfaces expose Load earlier.
- The OpenCode connector has abort/timeout/input/response bounds and a durable stopped lifecycle.
- Gateway v20 caps and validates provider success bodies before parsing; deployment succeeded and unauthenticated access returns `401`.
- The separate admin app fails closed for every unregistered route and has a repository quality workflow.
- A clean 68-migration replay, 550 database assertions, 46 member tests, 11 admin tests and both dependency audits pass.

The first 67 migrations remain Released. Migration `20260819141915_add_direct_message_pagination_rpc.sql` is only Verified: the alias-safe hosted dry run stopped before mutation because the current network cannot use the direct database IPv6 path.

### Operational routing core

Migration `20260810002754_create_io_operational_core.sql` and the matching gateway modules add:

- request idempotency with request fingerprints and replay-safe results;
- conservative total worst-case reservation across every allowed attempt before any provider dispatch;
- atomic finalization of reservation, usage, receipt, attempts and balanced ledger;
- release on terminal failure and automatic expiry of stale holds;
- endpoint outcome samples, circuit state/events and routable-endpoint exclusion;
- member budget status plus capability-checked admin budget/health/circuit RPCs.

### Durable terminal metadata

Migration `20260810010415_create_io_terminal_session_foundation.sql` adds safe creator-only sessions, membership/event/approval foundations and caller-bound create/complete/list RPCs. The local OpenCode connector records created/completed/failed lifecycle state without storing content or raw runtime identifiers.

Migration `20260812000100_add_io_terminal_timeline_and_approval_rpcs.sql` extends that foundation with replay-safe, ordered metadata-only timeline events and owner-decided approval records. It explicitly rejects prompt, output, command, URL, file-path and arbitrary JSON payloads; an approval decision is an audit state only and cannot execute a command.

### Verification evidence

- 68 migrations replay from an empty local Supabase database.
- 14 SQL contract files pass 550 assertions; operational core contributes 46 and the terminal foundations contribute 49.
- Supabase schema lint passes at error level.
- Member: typecheck, 46 unit tests, lint with zero errors, build and format check pass.
- Admin: typecheck, 11 contract tests, build and format check pass.

## Release truth

### Released to demo before this change

- Product separation, global location, direct-message boundary, trusted events/outbox and Chapter/Mission Space foundation.
- Provider registry, endpoint-bound conformance/eligibility, runtime switch, redacted receipts/evidence and `io-gateway` version 18.
- Five staged providers—OpenAI, xAI, Gemini, DeepSeek and Groq—remain non-routable until reviewed conformance and explicit activation.

### Released to the hosted demo in this change

- `20260810002754_create_io_operational_core.sql`.
- `20260810010415_create_io_terminal_session_foundation.sql`.
- `20260812000100_add_io_terminal_timeline_and_approval_rpcs.sql`.
- `io-gateway` v20 and its matching reserve/finalize/circuit plus bounded response code.
- The read-only I/O operational/terminal release contract: no missing migration/table, expected RLS/grants and private-table containment pass.

The historical ledger still has timestamp aliases, so standard linked `db push` remains unsafe. `scripts/supabase/prepare-alias-safe-io-release.sh` creates an isolated exact-ledger deployment view and now accepts an explicit validated migration list. It deployed the earlier three additive migrations without rewriting history; migration 68 remains local because its dry run could not establish the hosted direct database connection. The member and admin browser builds still need hosting and persona testing.

## Remaining code sequence

1. Build provider conformance/evidence approval and activate exactly one bounded provider route with explicit spend permission.
2. Add terminal event/resume/approval/tool/artifact/handoff slices.
3. Implement the OpenAI-compatible I/O API and authenticated local daemon pairing.
4. Complete shared conversation store/Threads/moderation/attachments and the reusable branded spatial shell.
5. Replace remaining admin trust/member/content/program direct-table work with transactional capability-checked commands.
6. Add provider/capacity/credit/invoice/reconciliation operations and hosted runner foundations.
7. Finish E2E/accessibility/performance/security/observability/staging/backup/commercial release gates.

## Decisions and access required from the owner

- Approve the long-term handling of the known hosted migration aliases; the current safe helper avoids history repair, but ordinary linked pushes remain intentionally disabled.
- Explicit small spend ceiling and activation order for real provider conformance calls.
- Provider terms, allowed regions/data policies and partnership/owned/donated-capacity rules.
- Production domains/hosting owner, initial admin operators and two-person root policy.
- Terminal v1 operating systems and local-only versus hosted-runner scope.
- Pricing currency, fees/tax/credits/refunds, legal/privacy approvers and launch cohort.

The detailed exit criteria remain in `FINALIZATION_EXECUTION_PLAN.md`; I/O specifics remain under `io-port-system/`; terminal specifics remain under `terminal-system/`.
