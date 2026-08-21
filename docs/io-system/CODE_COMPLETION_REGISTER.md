# Indus Orbit code completion register

Status: whole-product code and release filing updated 20 August 2026. See `FULL_CODE_AUDIT_2026-08-19.md` for the cumulative verification record.

This is the canonical answer to “what is done, what needs improvement, and what is left?” It separates checked-in/local evidence from the hosted demo and from production. A migration, secret, provider row or UI preview is not a release by itself.

## Completion register

| System                                | State    | Implemented evidence                                                                                                                                                                                                                                                                                                                                                                                  | Work still required                                                                                                                                                                                                                                    |
| ------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public brand and information site     | Partial  | Public routes cover the Indus Orbit story, work, members, skills, S.O.D.A., writing, contact and I/O Port with shared brand tokens/components.                                                                                                                                                                                                                                                        | Approve claims/content/artwork, correct final metadata, connect evidence-backed publishing, complete accessibility/performance/analytics consent and release review.                                                                                   |
| Authentication and product onboarding | Partial  | A signed-in identity may use top-level `/io` without Community onboarding. `/app` requires explicit, versioned Community completion. Intent and optional location foundations are caller-bound.                                                                                                                                                                                                       | Production email/OAuth, MFA/step-up for privileged users, session review/revocation, recovery/export/deletion, abuse protection and multi-persona browser tests.                                                                                       |
| Global location system                | Released | Optional, country-first, purpose-bound location foundation is deployed to the demo; browser access to private location records is denied and consent can be withdrawn.                                                                                                                                                                                                                                | Browser personas, operator-safe aggregate measurement, retention rules, translations and reviewed residency/location wording.                                                                                                                          |
| Profiles, directory and trust graph   | Partial  | Profiles, directory, connection, endorsement, role, verification and report foundations exist.                                                                                                                                                                                                                                                                                                        | Central permissions, visibility/block/report state machines, atomic support/moderation RPCs, pagination/search, appeals and concurrency/persona tests.                                                                                                 |
| Vouch and mentorship                  | Partial  | Caller-bound vouch request/redemption and mentorship request/transition foundations exist.                                                                                                                                                                                                                                                                                                            | Authoritative issuance/hashing, complete rate/replay/appeal rules, calendar lifecycle, email worker and multi-persona tests.                                                                                                                           |
| Missions, Chapters and Spaces         | Partial  | Chapter/Mission lifecycle and membership foundations plus deterministic Space/Room projection, message/read boundary and first branded UI are Released to demo.                                                                                                                                                                                                                                       | Threads, room/role administration, moderation, paging/search, attachments, programme metrics and hosted browser personas.                                                                                                                              |
| Learning, skills and knowledge        | Partial  | Courses, lessons, progress, quizzes, skills, S.O.D.A. and stories exist. Loops is removed from active product source and retained only as a service-role archive in demo.                                                                                                                                                                                                                             | Decide Loops archive retention, move correctness/scoring to trusted boundaries, finish authoring/provenance/search/accessibility/analytics and storage verification.                                                                                   |
| Events and opportunities              | Partial  | Event list/detail and RSVP surfaces exist.                                                                                                                                                                                                                                                                                                                                                            | Capacity/waitlist/time-zone/cancellation state, organizer commands, calendar/notification integration, abuse controls and tests.                                                                                                                       |
| Human conversations and notifications | Partial  | Direct-message send/read/block/unblock boundaries, owner-only block list, symmetric blocked-pair denial, participant-authorized private Broadcast, trusted events/outbox, notifications, Space message/read boundary and caller-bound 50-row keyset history are Released. Both direct-conversation surfaces expose Load earlier.                                                                      | Add a shared conversation store, group collaboration UI, attachments, dead-letter operations, email-worker deployment and E2E/load tests.                                                                                                              |
| Discord-like branded spatial shell    | Partial  | The existing app has branded Space/Room geometry, durable timeline/composer and people inspector; I/O has its own branded control-room geometry.                                                                                                                                                                                                                                                      | Extract reusable Orbit rail/context/workspace/inspector primitives across Messages, Missions, Chapters and I/O; add drawers, keyboard/a11y, attention semantics and visual tests. Do not copy Discord branding or merge human chat with terminal data. |
| Separate admin control plane          | Partial  | Independent `admin-indus-orbit` app is published to its private GitHub `main` branch with shared identity, scoped capabilities, audited duty changes, fail-closed routing, provider switch/readiness, redacted evidence and a reasoned/confirmed/USD 0.01-capped conformance control. Thirteen tests and CI configuration pass locally.                                                               | Host the admin app, run authenticated role personas, add MFA/re-auth/two-person root change, execute the first approved conformance run, and add reconciliation plus transactional trust/member/content/program commands.                              |
| I/O Port public/member UI             | Partial  | Public `/io-port`, authenticated `/io`, workspace/capacity/audit/receipt views, dynamic route/model selection, real budget status, durable local-terminal history and one-time test-key management are implemented. Explicit CN opt-in and exact key request/spend limits match the Released hosted policy.                                                                                           | Host the current member web build; add preflight/candidate explanation, credits/invoices, richer history/filters, live health detail and complete I/O-only/member/admin browser journeys.                                                              |
| I/O provider registry/control plane   | Partial  | Hosted registry contains five staged providers/models/endpoints/capabilities/prices/connections/runtime controls and three capacity sources/grants. Endpoint eligibility remains fail closed. The discovery-first, one-chat, USD 0.01-capped, single-use/CN-aware conformance lifecycle is Released as schema plus `io-provider-conformance` v1.                                                      | Validate the safety/provider secrets, explicitly run one approved test, activate one commercially authorized route at a time, then add evidence expiry, BYOK/owned/sponsored capacity and reviewed inventory expansion.                                |
| I/O gateway/model routing             | Partial  | Hosted `io-gateway` v23 is Released with JWT, entitlement, deterministic selection, idempotency, hard reserve, bounded fallback, circuits, exact 5.5% priced settlement, redacted receipts, a 2 MiB boundary, CN filtering, OpenAI HMAC safety IDs and atomic per-key spend reservations.                                                                                                             | Add streaming, tools, structured output, media, cancellation propagation, cached/cache-write usage, approved FX and broader provider conformance.                                                                                                      |
| I/O accounting and budgets            | Partial  | Released integer-minor-unit budget versions, usage reservations/records and balanced double-entry route ledger implement `reserve → dispatch → settle once → release remainder`, including stale-hold expiry. Member and admin budget views are wired.                                                                                                                                                | Concurrency-test with controlled provider traffic; decide currencies/FX, credits/sponsorship expiry, fee/tax policy, invoices, payments/refunds/chargebacks and provider-bill reconciliation.                                                          |
| I/O health and circuit controls       | Partial  | Released endpoint samples, circuit state/events, automatic outcome recording, resolver exclusion and capability-checked admin manual open/close controls exist.                                                                                                                                                                                                                                       | Add scheduled probes, latency/queue scoring, retry budgets, SLO alerts, automatic recovery policy and operator drills.                                                                                                                                 |
| Local terminal/OpenCode               | Partial  | Loopback/in-memory-password validation, health/session/prompt flow and Released safe durable metadata exist. Caller cancellation now also invokes OpenCode's session-abort endpoint on a best-effort basis, the completed run reads only a local changed-file count from the diff endpoint, and the 45-second timeout, input bounds, 1 MiB response limit and durable lifecycle are Verified locally. | Add event streaming and verified abort acknowledgement, resume/fork/tasks, approval enforcement, tools/commands, full diff review/artifacts, explicit sharing/handoff, pairing and packaged clients.                                                   |
| OpenAI-compatible I/O API             | Partial  | Hosted `io-openai` v4 provides scoped, expiring hash-only keys, revocation, membership revalidation, immutable 20/minute, 200/day, 2,000/month request limits, USD 1/day and USD 10/month spend caps, browser-origin key rejection, `/v1/models` and strict non-streaming `/v1/chat/completions`.                                                                                                     | Add SSE streaming, Responses API, capability-gated tools/media, SDK/CLI examples, configurable reviewed plan tiers, distributed abuse controls and compatibility/load tests.                                                                           |
| Hosted terminal/runners               | Planned  | Architecture and safety boundary are documented.                                                                                                                                                                                                                                                                                                                                                      | Runner control plane, outbound attach, workload identity, isolation, network/filesystem/secrets policy, quotas, scheduling, artifact store, observability, recovery and funded operations.                                                             |
| Supabase platform/data integrity      | Partial  | Hosted project `jpwvgpnbkrktipwhvqss` has 75 migrations, `io-gateway` v23, `io-openai` v4 and `io-provider-conformance` v1. The block/private-Broadcast, key/residency/conformance and FK-index migrations are verified; generated TypeScript contracts are synchronized. A clean local replay passes 75 migrations and 676 assertions.                                                               | Automate generated-type drift, retain alias-safe deployment, run hosted personas/contracts and establish staging/backup/restore.                                                                                                                       |
| Engineering quality and CI            | Partial  | Member unit suite passes 55/55 and the full database suite passes 676/676; admin passes 13/13. API/commercial contract drift discovered by the full replay was repaired.                                                                                                                                                                                                                              | Run final format/lint/type/build for this release, require all checks in both repositories and add component/Playwright/accessibility/visual/load/soak coverage plus bundle budgets.                                                                   |
| Deployment/observability/operations   | Partial  | Cloudflare-oriented app config, Supabase functions/migrations, operator guidance and safe audit foundations exist.                                                                                                                                                                                                                                                                                    | Choose production owners/hostnames, promotion/rollback pipeline, secret rotation, structured telemetry/redaction, SLO/alerts/dashboards, incident/support runbooks and disaster-recovery rehearsal.                                                    |
| Privacy/safety/legal/commercial       | Partial  | RLS, redacted evidence, location consent and people-centred product principles form the base. No prompt/output/secret is stored in I/O receipts or terminal metadata.                                                                                                                                                                                                                                 | Independent review; data inventory/retention/export/deletion; DPAs/terms/residency claims; model evaluation/moderation; donated capacity consent; tax/payment/refund rules and named approvers.                                                        |

## Commercial/provider release addendum — 20 August 2026

- Released migrations `20260820001339_add_io_transparent_service_fee.sql` and `20260820023501_add_io_commercial_fk_indexes.sql` to the hosted Indus Orbit project.
- Released `io-gateway` v22 and `io-openai` v3.
- Added exact integer-nano provider cost, 5.5% service fee and customer-total settlement with fee-policy evidence and no charge on failed routes.
- Added fail-closed provider commercial states, written-evidence requirements, endpoint eligibility enforcement and routing-enable trigger. OpenAI and DeepSeek remain `resale_pending`.
- Added the separate admin commercial projection, admin activation gate and terms evidence display.
- Member checks pass 54/54 plus format/type/build. Admin checks pass 13/13 plus format/type/build.
- Detailed production addresses, key boundary, pricing correction and provider research are in `io-port-system/PRODUCTION_API_COMMERCIAL_AND_PROVIDER_POLICY.md`.

## Provider/API hardening hosted release — 20 August 2026

- `20260820140000_harden_io_workspace_and_api_key_policy.sql` adds explicit workspace consent before CN routes, immutable per-key minute/day/month request limits and atomic daily/monthly customer-charge reservations.
- `20260820150000_add_io_provider_conformance_workflow.sql` adds single-use operator approval, USD 0.01 maximum provider cost, CN acknowledgement, exact capability binding and allow-listed redacted evidence.
- `20260820193000_add_io_conformance_fk_indexes.sql` covers the four conformance audit foreign keys identified by the post-DDL performance advisor.
- `io-gateway` and `io-openai` apply the workspace policy; OpenAI requests use an HMAC safety identifier; `io-provider-conformance` performs discovery before one eight-token chat check.
- Member UI shows the CN decision and exact key limits. Admin UI requires a reason, browser confirmation and DeepSeek CN acknowledgement.
- Member checks pass 54/54; admin checks pass 13/13.
- State is **Released to the hosted control plane**: hosted versions `20260820191501`, `20260820191544` and `20260820191815`; `io-gateway` v23, `io-openai` v4 and `io-provider-conformance` v1 are active. Provider routes, API keys and approvals remain zero, and no paid provider call was made.

## New code verified on 19 August 2026

### Audit finalization

- Direct conversation history is keyset-paginated through a caller-bound RPC and both conversation surfaces expose Load earlier.
- The OpenCode connector has timeout/input/response bounds, propagates Stop to OpenCode's abort endpoint, records a durable stopped lifecycle and exposes a local changed-file count without uploading diff content.
- Gateway v22 retains the bounded/validated provider parser, exact fee settlement and shared route transaction with `io-openai` v3; deployed authentication boundaries pass.
- The separate admin app fails closed for every unregistered route and has a repository quality workflow.
- A clean 68-migration replay, 550 database assertions, 46 member tests, 11 admin tests and both dependency audits pass.

The hosted ledger now contains 73 migrations. Direct-message pagination, the I/O API-key foundation, transparent settlement, commercial activation evidence, residency/key limits, capped provider conformance and covering indexes are Released.

### OpenAI-compatible API foundation

- `io-openai` v3 is active with custom I/O-key authentication and browser-origin rejection; Supabase JWT interception is disabled only for this function.
- Owners/admins can create 30-day test keys and revoke them from the member UI. Raw keys are returned once; the database stores SHA-256 only.
- `/v1/models` is entitlement filtered. `/v1/chat/completions` is a strict non-streaming text subset and rejects unsupported fields instead of ignoring them.
- API and browser requests share `executePartnerRoute`, including entitlement, deterministic selection, idempotency, worst-case budget reservation, fallback, receipt, settlement and content-free audit behavior.
- A temporary scoped hosted key returned `200` with an empty model list, rate headers and zero provider traffic, then was deleted. A deliberately invalid key returned the expected OpenAI-shaped `401`.
- Provider activation remains zero; the API being live does not make any staged provider routable.

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

- The last completed clean local baseline remains 68 migrations and 550 assertions. The API/commercial migrations have authored pgTAP contracts, but local Docker fails before product migrations can run; hosted contracts cover the released migrations meanwhile.
- Supabase schema lint passes at error level.
- Member: 54/54 unit tests plus format/type/build pass.
- Admin: 13/13 contract tests plus format/type/build pass.

## Release truth

### Released to demo before this change

- Product separation, global location, direct-message boundary, trusted events/outbox and Chapter/Mission Space foundation.
- Provider registry, endpoint-bound conformance/eligibility, runtime switch, redacted receipts/evidence and `io-gateway` version 18.
- Five staged providers—OpenAI, xAI, Gemini, DeepSeek and Groq—remain non-routable until reviewed conformance and explicit activation.

### Released to the hosted demo in this change

- `20260810002754_create_io_operational_core.sql`.
- `20260810010415_create_io_terminal_session_foundation.sql`.
- `20260812000100_add_io_terminal_timeline_and_approval_rpcs.sql`.
- `io-gateway` v22 and its matching shared reserve/finalize/circuit/fee plus bounded response code.
- The read-only I/O operational/terminal release contract: no missing migration/table, expected RLS/grants and private-table containment pass.

Additional hosted releases on 20 August 2026:

- `20260819225550_add_direct_message_pagination_rpc.sql`;
- `20260819232624_add_io_openai_api_foundation.sql`;
- `io-gateway` v22 with the shared route-execution core and exact fee evidence;
- `io-openai` v3 with custom scoped-key authentication and browser-origin rejection.

The historical ledger still has timestamp aliases, so standard linked `db push` remains unsafe. The connected project migration API provided an atomic release path for migrations 68–69 without rewriting history. The member and admin browser builds still need hosting and persona testing.

## Remaining code sequence

1. Configure/verify the safety HMAC secret, then explicitly run one capped conformance check; activation still requires written commercial authorization.
2. Add terminal event/resume/approval/tool/artifact/handoff slices.
3. Extend the released OpenAI-compatible subset with streaming/Responses/SDK conformance, and add authenticated local daemon pairing.
4. Complete shared conversation store/Threads/moderation/attachments and the reusable branded spatial shell.
5. Replace remaining admin trust/member/content/program direct-table work with transactional capability-checked commands.
6. Add provider/capacity/credit/invoice/reconciliation operations and hosted runner foundations.
7. Finish E2E/accessibility/performance/security/observability/staging/backup/commercial release gates.

## Decisions and access required from the owner

- Approve the long-term handling of the known hosted migration aliases; the current safe helper avoids history repair, but ordinary linked pushes remain intentionally disabled.
- Explicit execution/activation order for real provider conformance calls; the per-run code ceiling is USD 0.01.
- Provider terms, allowed regions/data policies and partnership/owned/donated-capacity rules.
- Production domains/hosting owner, initial admin operators and two-person root policy.
- Terminal v1 operating systems and local-only versus hosted-runner scope.
- Pricing currency, fees/tax/credits/refunds, legal/privacy approvers and launch cohort.

The detailed exit criteria remain in `FINALIZATION_EXECUTION_PLAN.md`; I/O specifics remain under `io-port-system/`; terminal specifics remain under `terminal-system/`.
