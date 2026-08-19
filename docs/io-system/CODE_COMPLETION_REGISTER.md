# Indus Orbit code completion register

Status: whole-product code and release filing updated 20 August 2026. See `FULL_CODE_AUDIT_2026-08-19.md` for the cumulative verification record.

This is the canonical answer to “what is done, what needs improvement, and what is left?” It separates checked-in/local evidence from the hosted demo and from production. A migration, secret, provider row or UI preview is not a release by itself.

## Completion register

| System                                | State    | Implemented evidence                                                                                                                                                                                                                                                                                                                                                                        | Work still required                                                                                                                                                                                                                                    |
| ------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public brand and information site     | Partial  | Public routes cover the Indus Orbit story, work, members, skills, S.O.D.A., writing, contact and I/O Port with shared brand tokens/components.                                                                                                                                                                                                                                              | Approve claims/content/artwork, correct final metadata, connect evidence-backed publishing, complete accessibility/performance/analytics consent and release review.                                                                                   |
| Authentication and product onboarding | Partial  | A signed-in identity may use top-level `/io` without Community onboarding. `/app` requires explicit, versioned Community completion. Intent and optional location foundations are caller-bound.                                                                                                                                                                                             | Production email/OAuth, MFA/step-up for privileged users, session review/revocation, recovery/export/deletion, abuse protection and multi-persona browser tests.                                                                                       |
| Global location system                | Released | Optional, country-first, purpose-bound location foundation is deployed to the demo; browser access to private location records is denied and consent can be withdrawn.                                                                                                                                                                                                                      | Browser personas, operator-safe aggregate measurement, retention rules, translations and reviewed residency/location wording.                                                                                                                          |
| Profiles, directory and trust graph   | Partial  | Profiles, directory, connection, endorsement, role, verification and report foundations exist.                                                                                                                                                                                                                                                                                              | Central permissions, visibility/block/report state machines, atomic support/moderation RPCs, pagination/search, appeals and concurrency/persona tests.                                                                                                 |
| Vouch and mentorship                  | Partial  | Caller-bound vouch request/redemption and mentorship request/transition foundations exist.                                                                                                                                                                                                                                                                                                  | Authoritative issuance/hashing, complete rate/replay/appeal rules, calendar lifecycle, email worker and multi-persona tests.                                                                                                                           |
| Missions, Chapters and Spaces         | Partial  | Chapter/Mission lifecycle and membership foundations plus deterministic Space/Room projection, message/read boundary and first branded UI are Released to demo.                                                                                                                                                                                                                             | Threads, room/role administration, moderation, paging/search, attachments, programme metrics and hosted browser personas.                                                                                                                              |
| Learning, skills and knowledge        | Partial  | Courses, lessons, progress, quizzes, skills, S.O.D.A. and stories exist. Loops is removed from active product source and retained only as a service-role archive in demo.                                                                                                                                                                                                                   | Decide Loops archive retention, move correctness/scoring to trusted boundaries, finish authoring/provenance/search/accessibility/analytics and storage verification.                                                                                   |
| Events and opportunities              | Partial  | Event list/detail and RSVP surfaces exist.                                                                                                                                                                                                                                                                                                                                                  | Capacity/waitlist/time-zone/cancellation state, organizer commands, calendar/notification integration, abuse controls and tests.                                                                                                                       |
| Human conversations and notifications | Partial  | Direct-message send/read RPC boundary, trusted events/outbox, notifications, Space message/read boundary and caller-bound 50-row keyset history are Released. Both direct-conversation surfaces expose Load earlier.                                                                                                                                                                        | Add a shared conversation store, blocks, group collaboration, private Broadcast, attachments, dead-letter operations, email-worker deployment and E2E/load tests.                                                                                      |
| Discord-like branded spatial shell    | Partial  | The existing app has branded Space/Room geometry, durable timeline/composer and people inspector; I/O has its own branded control-room geometry.                                                                                                                                                                                                                                            | Extract reusable Orbit rail/context/workspace/inspector primitives across Messages, Missions, Chapters and I/O; add drawers, keyboard/a11y, attention semantics and visual tests. Do not copy Discord branding or merge human chat with terminal data. |
| Separate admin control plane          | Partial  | Independent `admin-indus-orbit` app, shared identity, scoped capabilities, audited duty changes, explicit fail-closed unknown/nested routes, provider switch/readiness and redacted evidence exist. Budget/circuit controls are Released; 11 tests and CI pass locally.                                                                                                                     | Host the admin app, add authenticated role personas, MFA/re-auth/two-person root change, conformance/evidence workflows, reconciliation and transactional trust/member/content/program commands.                                                       |
| I/O Port public/member UI             | Partial  | Public `/io-port`, authenticated `/io`, workspace/capacity/audit/receipt views, dynamic route/model selection, real budget status, durable local-terminal history and one-time test-key management are implemented. Their schema and server contracts are Released.                                                                                                                         | Deploy the updated member web build; add preflight/candidate explanation, credits/invoices, richer history/filters, live health detail and complete I/O-only/member/admin browser journeys.                                                            |
| I/O provider registry/control plane   | Partial  | Released demo registry contains five staged providers/models/endpoints/capabilities/prices/connections/runtime controls and three capacity sources/grants. Endpoint-bound freshness/conformance rules fail closed.                                                                                                                                                                          | Validate each secret reference/account, build and approve conformance, activate one route at a time, add evidence lifecycle, BYOK/owned/sponsored capacity and expand the researched inventory only with reviewed facts.                               |
| I/O gateway/model routing             | Partial  | Demo `io-gateway` v21 is Released with JWT, entitlement, deterministic selection, idempotency, hard reserve, bounded fallback, circuits, atomic settlement, redacted receipts and a 2 MiB validated success-body boundary. Browser and public API routes share this core.                                                                                                                   | Add streaming, tools, structured output, media, cancellation propagation, formal policy snapshots, cached pricing/FX and provider-specific conformance.                                                                                                |
| I/O accounting and budgets            | Partial  | Released integer-minor-unit budget versions, usage reservations/records and balanced double-entry route ledger implement `reserve → dispatch → settle once → release remainder`, including stale-hold expiry. Member and admin budget views are wired.                                                                                                                                      | Concurrency-test with controlled provider traffic; decide currencies/FX, credits/sponsorship expiry, fee/tax policy, invoices, payments/refunds/chargebacks and provider-bill reconciliation.                                                          |
| I/O health and circuit controls       | Partial  | Released endpoint samples, circuit state/events, automatic outcome recording, resolver exclusion and capability-checked admin manual open/close controls exist.                                                                                                                                                                                                                             | Add scheduled probes, latency/queue scoring, retry budgets, SLO alerts, automatic recovery policy and operator drills.                                                                                                                                 |
| Local terminal/OpenCode               | Partial  | Loopback/in-memory-password validation, health/session/prompt flow and Released safe durable metadata exist. Caller cancellation, 45-second timeout, input bounds, 1 MiB response limit and durable `stopped` lifecycle are Verified locally.                                                                                                                                               | Add event streaming, daemon-confirmed abort, resume/fork/tasks, approval enforcement, tools/commands, diffs/artifacts, explicit sharing/handoff, pairing and packaged clients.                                                                         |
| OpenAI-compatible I/O API             | Partial  | Hosted `io-openai` v2 provides scoped, expiring hash-only test keys, revocation, creator-membership revalidation, atomic 60-RPM default limiting, `/v1/models` and non-streaming `/v1/chat/completions`. It uses the same entitlement, budget, fallback, receipt and audit path as the web gateway. Invalid-key `401` and valid empty-catalog `200` were verified without provider traffic. | Add SSE streaming, Responses API, tools/structured output/media only after conformance, SDK/CLI examples, production key policy/quotas, distributed abuse controls and compatibility/load tests.                                                       |
| Hosted terminal/runners               | Planned  | Architecture and safety boundary are documented.                                                                                                                                                                                                                                                                                                                                            | Runner control plane, outbound attach, workload identity, isolation, network/filesystem/secrets policy, quotas, scheduling, artifact store, observability, recovery and funded operations.                                                             |
| Supabase platform/data integrity      | Partial  | Hosted project `jpwvgpnbkrktipwhvqss` has 69 migrations, `io-gateway` v21 and `io-openai` v2. Migrations 68–69 were applied atomically and verified through hosted grant/security and rolled-back functional contracts. The last clean local baseline remains 68 migrations/550 assertions; the local Docker database is presently unhealthy, so no 69-migration local replay is claimed.   | Repair/replace the local container runtime, run the authored 24-check API-key pgTAP file with the full suite, automate generated-type drift, retain alias-safe deployment, run personas/Advisors and establish staging/backup/restore.                 |
| Engineering quality and CI            | Partial  | Member unit suite passes 50/50; lint reports zero errors; the prior member build and admin 11-test/type/build/format baselines remain. Hosted API-key contracts and both deployed endpoint auth paths pass. Both production dependency audits previously reported zero vulnerabilities.                                                                                                     | Re-run member type/build/format after final documentation, restore the local database suite, require all checks in both repositories and add component/Playwright/accessibility/visual/load/soak coverage, bundle budgets and hosted contracts.        |
| Deployment/observability/operations   | Partial  | Cloudflare-oriented app config, Supabase functions/migrations, operator guidance and safe audit foundations exist.                                                                                                                                                                                                                                                                          | Choose production owners/hostnames, promotion/rollback pipeline, secret rotation, structured telemetry/redaction, SLO/alerts/dashboards, incident/support runbooks and disaster-recovery rehearsal.                                                    |
| Privacy/safety/legal/commercial       | Partial  | RLS, redacted evidence, location consent and people-centred product principles form the base. No prompt/output/secret is stored in I/O receipts or terminal metadata.                                                                                                                                                                                                                       | Independent review; data inventory/retention/export/deletion; DPAs/terms/residency claims; model evaluation/moderation; donated capacity consent; tax/payment/refund rules and named approvers.                                                        |

## New code verified on 19 August 2026

### Audit finalization

- Direct conversation history is keyset-paginated through a caller-bound RPC and both conversation surfaces expose Load earlier.
- The OpenCode connector has abort/timeout/input/response bounds and a durable stopped lifecycle.
- Gateway v21 retains the bounded/validated provider parser and shares the route transaction with `io-openai` v2; deployed authentication boundaries pass.
- The separate admin app fails closed for every unregistered route and has a repository quality workflow.
- A clean 68-migration replay, 550 database assertions, 46 member tests, 11 admin tests and both dependency audits pass.

The hosted ledger now contains 69 migrations. Direct-message pagination is Released as `20260819225550_add_direct_message_pagination_rpc.sql`. The I/O API foundation is Released as `20260819232624_add_io_openai_api_foundation.sql`; its raw-key, hash, scope, rate, revocation and audit behavior passed a rolled-back hosted functional contract.

### OpenAI-compatible API foundation

- `io-openai` v2 is active with custom I/O-key authentication; Supabase JWT interception is disabled only for this function.
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

- The last completed clean local baseline remains 68 migrations and 550 assertions. The new migration has a 24-check pgTAP file, but the local Docker database became unhealthy before it could run; hosted contracts cover the released migration meanwhile.
- Supabase schema lint passes at error level.
- Member unit suite: 50/50. Repository lint reports zero errors; final type/build/format reruns are recorded at handoff.
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
- `io-gateway` v21 and its matching shared reserve/finalize/circuit plus bounded response code.
- The read-only I/O operational/terminal release contract: no missing migration/table, expected RLS/grants and private-table containment pass.

Additional hosted releases on 20 August 2026:

- `20260819225550_add_direct_message_pagination_rpc.sql`;
- `20260819232624_add_io_openai_api_foundation.sql`;
- `io-gateway` v21 with the shared route-execution core;
- `io-openai` v2 with custom scoped-key authentication.

The historical ledger still has timestamp aliases, so standard linked `db push` remains unsafe. The connected project migration API provided an atomic release path for migrations 68–69 without rewriting history. The member and admin browser builds still need hosting and persona testing.

## Remaining code sequence

1. Build provider conformance/evidence approval and activate exactly one bounded provider route with explicit spend permission.
2. Add terminal event/resume/approval/tool/artifact/handoff slices.
3. Extend the released OpenAI-compatible subset with streaming/Responses/SDK conformance, and add authenticated local daemon pairing.
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
