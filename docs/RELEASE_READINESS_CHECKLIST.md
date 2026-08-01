# Indus Orbit Production v1 release readiness checklist

Status: active evidence tracker, updated 1 August 2026  
Release candidate: not assigned  
Release owner: unassigned  
Production target: not scheduled  
Source plan: `MASTER_IMPLEMENTATION_AND_RELEASE_PLAN.md`

## 1. How this checklist is used

This document is the release control record, not a wish list.

- Use `[ ]` until an item has current evidence and the named owner has approved it.
- Use `[x]` only when the **Evidence** entry links a commit, CI run, test report, migration result, screenshot, query, runbook drill, or signed decision.
- If an item is intentionally out of scope, record `Deferred`, the approving owner, reason, risk, and target release. Never delete it silently.
- Re-open an item when code, schema, infrastructure, provider configuration, legal terms, or operating conditions invalidate its evidence.
- A gate passes only when all required items are checked and its approvers sign the gate record.

Recommended evidence path:

```text
docs/release-evidence/<release>/<gate>/<artifact>
```

External CI, design, issue, and monitoring links may be used when access and retention are appropriate.

## 2. Current verified baseline — not release approval

| Check                             | Result on 1 August 2026                | Meaning                                                                                                             |
| --------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Production web build              | Pass                                   | The current bundle builds; it does not prove runtime workflows                                                      |
| TypeScript `--noEmit`             | Pass                                   | Current TypeScript compiles                                                                                         |
| Unit tests                        | Pass — 24/24                           | Browser configuration, conversation merge, OpenCode, gateway validation, provider adapter and routing fixtures pass |
| Formatting check                  | Pass                                   | Mechanical formatting drift has been removed                                                                        |
| Dependency audit (high and above) | Pass                                   | No critical, high, or moderate dependency advisory remains                                                          |
| Dependency audit (all severities) | 2 low advisories remain                | Babel/esbuild transitive advisories remain tracked                                                                  |
| GitHub quality workflow           | Configured; no remote run recorded yet | PR/push audit, format, lint, typecheck, unit test and production build are defined                                  |
| Repository lint                   | Pass — 0 errors                        | Local semantic lint gate passes; CI evidence and broader product/integration coverage remain incomplete             |
| Automated product/router tests    | Core selection coverage only           | New registry router/UI source is browser-build checked but still needs Deno, SQL/RLS and conformance tests          |
| Provider conformance records      | Zero                                   | No provider is production-certified                                                                                 |
| Supabase missing-history recovery | 21 migration files staged locally      | Replay and schema equivalence in a resettable non-production environment remain required                            |
| Supabase migration equivalence    | Not proven                             | Environment-reproducibility gate is open                                                                            |
| Supabase storage buckets          | Zero                                   | Education upload workflow is not operational                                                                        |

## 3. Blocker register

| ID    | Blocker                                                                                                                                 | Owner      | Status | Resolution evidence |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------- |
| B-001 | Local and deployed Supabase migration histories are not reconciled                                                                      | Unassigned | Open   | —                   |
| B-002 | Exposed `SECURITY DEFINER` functions require role and authorization audit                                                               | Unassigned | Open   | —                   |
| B-003 | Anonymous contact/newsletter insertion lacks production anti-abuse boundary                                                             | Unassigned | Open   | —                   |
| B-004 | Leaked-password protection is disabled                                                                                                  | Unassigned | Open   | —                   |
| B-005 | Education answer-key/scoring trust boundary is unsafe                                                                                   | Unassigned | Open   | —                   |
| B-006 | Required education storage bucket and policies do not exist                                                                             | Unassigned | Open   | —                   |
| B-007 | Vouch code remains browser-issued; Web Crypto reduces predictability but cannot enforce authoritative issuance, hashing, or rate limits | Unassigned | Open   | —                   |
| B-008 | Browser/server feature data boundaries are misleading and inconsistent                                                                  | Unassigned | Open   | —                   |
| B-009 | Automated product, integration, database-authorization coverage and executed CI evidence are incomplete                                 | Unassigned | Open   | —                   |
| B-010 | Public model/price/FX claims are hard-coded without evidence workflow                                                                   | Unassigned | Open   | —                   |
| B-011 | Five I/O providers are staged, but none has passed current endpoint-bound conformance and every runtime switch remains off              | Unassigned | Open   | —                   |
| B-012 | Operations, legal, privacy, support, backup, and incident approvals are incomplete                                                      | Unassigned | Open   | —                   |
| B-013 | Production build has a 647.86 kB minified JavaScript chunk; route/vendor splitting and measured performance budgets are not complete    | Unassigned | Open   | —                   |
| B-014 | I/O gateway is deployed to demo but lacks activation-grade conformance, budget reservation, idempotency and health/circuit controls     | Unassigned | Open   | —                   |

## G0 — Scope, ownership, and control

Approvers: Product owner and engineering owner  
Decision: Not passed

- [ ] Production v1 scope and explicit deferrals are approved. Evidence: —
- [ ] Product, Design/Content, Web, Platform/Supabase, I/O, QA/Security, Operations/Legal, and Release owners are named. Evidence: —
- [ ] Every master-plan deliverable has an issue, owner, dependency, risk, and target release. Evidence: —
- [ ] Root setup/contribution documentation and architecture decision process exist. Evidence: —
- [ ] Main branch protection and required reviews are configured. Evidence: —
- [ ] Demo, staging, and production environments and data policies are documented. Evidence: —
- [ ] Active plans do not contradict current implementation status. Evidence: —
- [ ] Release evidence location and retention are agreed. Evidence: —

Gate approval:

| Approver          | Decision | Date | Evidence/notes |
| ----------------- | -------- | ---- | -------------- |
| Product owner     | Pending  | —    | —              |
| Engineering owner | Pending  | —    | —              |

## G1 — Reproducible environments and delivery

Approvers: Platform owner and release owner  
Decision: Not passed

- [ ] Missing remote migration history is recovered and reviewed without rewriting deployed history. Evidence: —
- [ ] Local filename-to-remote-version mapping is documented. Evidence: —
- [ ] Empty-database migration replay passes. Evidence: —
- [ ] Upgrade from a production-like snapshot passes. Evidence: —
- [ ] Resettable non-production schema matches the intended production schema, grants, RLS, functions, triggers, enums, extensions, and storage policies. Evidence: —
- [ ] Generated Supabase TypeScript types match the approved schema. Evidence: —
- [ ] Local setup produces a functioning application from documented commands. Evidence: —
- [ ] Node/package manager/dependency versions are pinned and deterministic. Evidence: —
- [ ] Pull-request CI runs format, lint, typecheck, unit, database, and build checks. Evidence: —
- [ ] Staging deploy and smoke tests are automated. Evidence: —
- [ ] Production deployment uses an immutable approved commit and migration set. Evidence: —
- [ ] Web, Edge Function, configuration, and database forward-fix rollback procedures are rehearsed. Evidence: —

Gate approval:

| Approver       | Decision | Date | Evidence/notes |
| -------------- | -------- | ---- | -------------- |
| Platform owner | Pending  | —    | —              |
| Release owner  | Pending  | —    | —              |

## G2 — Security, privacy, and authorization

Approvers: Security/privacy owner and platform owner  
Decision: Not passed

- [ ] Central role/capability matrix covers all public, member, lead, editor, investor, expert, admin, suspended, and service operations. Evidence: —
- [ ] Protected routes enforce authentication and onboarding before protected content is returned. Evidence: —
- [ ] Invitation/request-access rules are enforced at the trusted mutation boundary. Evidence: —
- [ ] Every exposed table has deliberate grants and RLS policies with positive and negative role tests. Evidence: —
- [ ] Every `SECURITY DEFINER` function has reviewed roles, `search_path`, internal authorization, validation, audit, and tests. Evidence: —
- [ ] Unnecessary `PUBLIC` and `anon` function execution has been revoked. Evidence: —
- [ ] Service-role and provider secrets are absent from browser bundles, logs, source, and database-exposed schemas. Evidence: —
- [ ] Supabase publishable/secret key rotation and revocation are documented and tested. Evidence: —
- [ ] Privileged roles require MFA and session revocation works. Evidence: —
- [ ] Leaked-password protection, redirect allowlists, email confirmation, OTP expiry, and recovery are production-configured. Evidence: —
- [ ] Auth, recovery, contact, newsletter, access request, messaging, vouch, upload, and I/O endpoints have rate limits/abuse controls. Evidence: —
- [ ] Blocking, suspension, deletion, and access revocation immediately affect browser, API, storage, and realtime access. Evidence: —
- [ ] Private Realtime Broadcast authorization passes subscriber-isolation tests. Evidence: —
- [ ] Upload paths validate ownership, type, size, access, and unsafe content strategy. Evidence: —
- [ ] Personal, message, prompt, audit, and financial data retention/export/deletion rules are implemented. Evidence: —
- [ ] Security Advisor findings are resolved or formally justified with tests and owners. Evidence: —
- [ ] Dependency, secret, static-analysis, and manual high-risk-flow reviews pass. Evidence: —
- [ ] No open critical/high finding remains for in-scope paths. Evidence: —

Gate approval:

| Approver               | Decision | Date | Evidence/notes |
| ---------------------- | -------- | ---- | -------------- |
| Security/privacy owner | Pending  | —    | —              |
| Platform owner         | Pending  | —    | —              |

## G3 — Data integrity, transactions, and recovery

Approvers: Platform owner and domain owners  
Decision: Not passed

- [ ] Multi-table mutations for trust, messaging, action, learning, admin, and I/O are atomic. Evidence: —
- [ ] Retried mutations use idempotency keys or equivalent uniqueness guarantees. Evidence: —
- [ ] Concurrent decisions use explicit locking/version semantics and tests. Evidence: —
- [ ] Constraints protect invariants independently of UI validation. Evidence: —
- [ ] Audit events are append-only, actor/target/reason/correlation aware, and privacy-safe. Evidence: —
- [ ] Vouch codes are cryptographically issued server-side, protected at rest, rate-limited, expiring, and single-use. Evidence: —
- [ ] Quiz answer keys are not readable by learners and grading/results are server-authoritative. Evidence: —
- [ ] Notifications/email use an idempotent outbox with retries and dead-letter handling. Evidence: —
- [ ] Storage object ownership and lifecycle stay consistent with database records. Evidence: —
- [ ] I/O reservations, settlements, refunds, sponsored credits, and route receipts reconcile exactly. Evidence: —
- [ ] Foreign-key indexes and RLS performance findings are resolved or benchmark-justified. Evidence: —
- [ ] Backup configuration is verified and restore drill meets approved RPO/RTO. Evidence: —
- [ ] Export/deletion and legal-retention separation pass test fixtures. Evidence: —

Gate approval:

| Approver       | Decision | Date | Evidence/notes |
| -------------- | -------- | ---- | -------------- |
| Platform owner | Pending  | —    | —              |
| Domain owners  | Pending  | —    | —              |

## G4 — Full feature acceptance

Approvers: Product owner, QA owner, and domain owners  
Decision: Not passed

### Public and access

- [ ] Visitor can navigate the approved public site on mobile and desktop. Evidence: —
- [ ] Request access, invitation, sign-up/sign-in, OAuth, confirmation, reset, logout, and recovery journeys pass. Evidence: —
- [ ] Onboarding completion, interruption, resume, and rejected/suspended states pass. Evidence: —

### People and trust

- [ ] Profile create/edit/visibility/public-view rules pass. Evidence: —
- [ ] Directory search/filter/pagination and privacy rules pass. Evidence: —
- [ ] Connection request/accept/reject/cancel/remove/block/unblock pass. Evidence: —
- [ ] Endorsement and report creation/review/revocation pass. Evidence: —
- [ ] Vouch issue/redeem/expire/replay/abuse/appeal pass. Evidence: —
- [ ] Mentorship request/accept/schedule/complete/cancel/notify pass. Evidence: —

### Conversation and notifications

- [ ] Direct send/read/paginate/retry/reconnect/unread flows pass across two sessions. Evidence: —
- [ ] Connection loss, blocking, suspension, and participant removal revoke messaging/realtime access correctly. Evidence: —
- [ ] Notification preferences, outbox, delivery, retry, read, and dead-letter flows pass. Evidence: —
- [ ] Scoped group/workspace conversation flows pass if included in Production v1. Evidence: —

### Action and community

- [ ] Mission create/join/leave/update/approve/archive flows pass. Evidence: —
- [ ] Chapter propose/approve/join/leave/manage/archive flows pass. Evidence: —
- [ ] Event create/review/publish/RSVP/cancel/remind flows pass with time-zone handling. Evidence: —
- [ ] Story create/review/publish/correct/archive and safe rendering pass. Evidence: —
- [ ] Board/investor visibility and publication rules pass. Evidence: —

### Learning and knowledge

- [ ] Course/module/lesson navigation, progress, completion, quiz, retry, and correction pass. Evidence: —
- [ ] Education upload/signed-download/expiry/permission flows pass. Evidence: —
- [ ] Skills, Loop, and SODA browse/search/detail/provenance/moderation pass. Evidence: —
- [ ] Stale/unavailable content is truthfully represented. Evidence: —

### Administration and support

- [ ] Every admin queue supports authorised list/filter/assign/decide/reason/audit operations. Evidence: —
- [ ] High-impact and bulk operations require confirmation and fail safely. Evidence: —
- [ ] Operators can handle recovery, suspension, consent, notification, export/deletion, content, and I/O receipt support without direct SQL. Evidence: —
- [ ] Feature flag and kill-switch operations are authorised, audited, and rehearsed. Evidence: —

### I/O Port

- [ ] Reviewed providers, models, endpoints, capabilities, prices, connections, and policies can be onboarded without source changes. Evidence: —
- [ ] At least two independent routes pass conformance and controlled failover. Evidence: —
- [ ] Explicit selection and latest/affordable/quality/latency/reliability policies obey hard constraints. Evidence: —
- [ ] Streaming, cancellation, retry, bounded fallback, errors, tool calls, and usage normalisation pass for supported capabilities. Evidence: —
- [ ] Route estimate, reservation, attempts, actual settlement, refund/release, and immutable receipt pass. Evidence: —
- [ ] Member API-key creation/revocation and scoped access pass if included. Evidence: —
- [ ] Web control room shows authorised capacity, policies, candidates/choice explanation, health, budgets, usage, and receipts. Evidence: —
- [ ] Terminal create/resume/run/approve/cancel/reconnect/diff/artifact/local-privacy journeys pass. Evidence: —
- [ ] Provider, model, origin, region, data policy, capacity class, price, and fallback disclosures match the receipt. Evidence: —

Gate approval:

| Approver      | Decision | Date | Evidence/notes |
| ------------- | -------- | ---- | -------------- |
| Product owner | Pending  | —    | —              |
| QA owner      | Pending  | —    | —              |
| Domain owners | Pending  | —    | —              |

## G5 — Experience, accessibility, performance, content, and SEO

Approvers: Design/content owner and QA owner  
Decision: Not passed

- [ ] Shared Indus Orbit shell and components are used consistently. Evidence: —
- [ ] Workspace rail, contextual navigation, content canvas, inspector, and mobile drawers behave consistently. Evidence: —
- [ ] Every critical screen has reviewed loading, empty, error, offline/retry, success, and permission-denied states. Evidence: —
- [ ] Keyboard-only and screen-reader journeys pass for critical workflows. Evidence: —
- [ ] Focus, contrast, zoom, reduced motion, touch targets, labels, headings, landmarks, and announcements meet WCAG 2.2 AA. Evidence: —
- [ ] Automated accessibility checks and manual audits have no critical failures. Evidence: —
- [ ] Critical route bundle and Core Web Vitals budgets pass on representative mobile conditions. Evidence: —
- [ ] Query/API/realtime/I/O latency targets pass under representative beta load. Evidence: —
- [ ] Public and in-app copy is approved, accurate, and free of unlabelled preview/demo data. Evidence: —
- [ ] Canonicals, metadata, social cards, structured data, sitemap, and robots rules pass. Evidence: —
- [ ] Legacy-domain, placeholder, broken, and unapproved links are removed. Evidence: —
- [ ] Models/pricing/benchmark/FX/provider claims show source, method, date, and correction path. Evidence: —
- [ ] Visual regression review passes for critical routes and target breakpoints. Evidence: —

Gate approval:

| Approver             | Decision | Date | Evidence/notes |
| -------------------- | -------- | ---- | -------------- |
| Design/content owner | Pending  | —    | —              |
| QA owner             | Pending  | —    | —              |

## G6 — Reliability, observability, and operations

Approvers: Operations owner and engineering owner  
Decision: Not passed

- [ ] Service-level indicators/objectives exist for web, API, auth, database, realtime, email, storage, and I/O. Evidence: —
- [ ] Logs, metrics, traces, correlation IDs, uptime checks, and dashboards cover critical journeys. Evidence: —
- [ ] Telemetry redaction tests confirm secrets and protected content are not collected. Evidence: —
- [ ] Alerts have severity, threshold, route, responder, escalation, and runbook. Evidence: —
- [ ] Load tests cover public traffic, auth, directory, messaging, notifications, admin queues, learning, and I/O. Evidence: —
- [ ] Realtime reconnect/fan-out and provider timeout/rate-limit/failover tests pass. Evidence: —
- [ ] Background jobs are idempotent, observable, retryable, and bounded. Evidence: —
- [ ] Provider cost/usage reconciliation and anomaly alerts pass. Evidence: —
- [ ] Web, function, provider, email, database, storage, and security incident runbooks are rehearsed. Evidence: —
- [ ] Backup restoration, rollback, and kill switches meet approved objectives. Evidence: —
- [ ] Support queue, hours, ownership, escalation, and status communications are ready. Evidence: —

Gate approval:

| Approver          | Decision | Date | Evidence/notes |
| ----------------- | -------- | ---- | -------------- |
| Operations owner  | Pending  | —    | —              |
| Engineering owner | Pending  | —    | —              |

## G7 — Commercial, provider, legal, and governance readiness

Approvers: Business/legal owner and product owner  
Decision: Not passed

- [ ] User types, entitlements, free allocation, paid usage, team budgets, BYOK, sponsored credit, refunds, expiry, and fair-use rules are approved. Evidence: —
- [ ] Scientific pricing model uses measured provider, infrastructure, support, payment, fraud, tax, and FX inputs. Evidence: —
- [ ] Receipts separate provider cost, I/O fee, subsidy/discount, tax, FX, and settlement status. Evidence: —
- [ ] Provider and donor due diligence covers security, privacy, jurisdiction, model origin, availability, incident notice, audit, and exit. Evidence: —
- [ ] Sponsored/donated capacity is opt-in and cannot expose member identity/content to sponsors beyond approved aggregate reporting. Evidence: —
- [ ] Terms, Privacy, Cookie/Storage, Acceptable Use, Community Guidelines, AI/Model, and Sponsored Capacity disclosures are approved and published. Evidence: —
- [ ] Consent versions and change notices are recorded. Evidence: —
- [ ] Complaint, moderation appeal, takedown, billing dispute, breach, outage, and lawful-request processes are approved. Evidence: —
- [ ] Tax, payment, consumer, privacy/data-transfer, intermediary/platform, AI, accessibility, copyright, and employment/volunteer implications receive appropriate review. Evidence: —
- [ ] Support and incident communication commitments match available staffing. Evidence: —

Gate approval:

| Approver             | Decision | Date | Evidence/notes |
| -------------------- | -------- | ---- | -------------- |
| Business/legal owner | Pending  | —    | —              |
| Product owner        | Pending  | —    | —              |

## G8 — Integrated private beta

Approvers: cross-functional release council  
Decision: Not passed

- [ ] Beta cohort, consent, support channel, capacity caps, feature flags, and exit criteria are approved. Evidence: —
- [ ] Synthetic and beta data are clearly separated; no production personal data is copied to lower environments. Evidence: —
- [ ] All G0–G7 required beta-scope items pass. Evidence: —
- [ ] Beta has completed the approved soak period. Evidence: —
- [ ] Severity 0/1 issues are closed and severity 2 issues meet the approved threshold. Evidence: —
- [ ] Member journey success, accessibility, latency, reliability, cost, abuse, moderation, and support metrics meet targets. Evidence: —
- [ ] Provider failover, backup restore, rollback, security incident, and support escalation drills pass. Evidence: —
- [ ] Beta feedback, incident results, and corrections are documented. Evidence: —
- [ ] Production data migration and launch communications are approved. Evidence: —

Gate approval:

| Approver         | Decision | Date | Evidence/notes |
| ---------------- | -------- | ---- | -------------- |
| Product          | Pending  | —    | —              |
| Engineering      | Pending  | —    | —              |
| Security/privacy | Pending  | —    | —              |
| Design/content   | Pending  | —    | —              |
| Operations/legal | Pending  | —    | —              |

## G9 — Production release and controlled expansion

Approvers: named release owner and cross-functional release council  
Decision: Not passed

- [ ] Immutable commit, dependency lockfile, migrations, Edge Function versions, environment configuration, and provider registry versions are recorded. Evidence: —
- [ ] Final staging smoke, end-to-end, accessibility, load, security, migration, and recovery checks pass. Evidence: —
- [ ] Backups, dashboards, alerts, status/support channels, on-call ownership, and rollback authority are active. Evidence: —
- [ ] Production secrets are present, scoped, rotated as required, and independently verified without exposing values. Evidence: —
- [ ] Capacity, budget, rate, provider, and feature-flag limits start conservatively. Evidence: —
- [ ] Legal pages, pricing, provider/model evidence, status, support, and incident contact are current. Evidence: —
- [ ] Launch decision and known accepted risks are signed. Evidence: —
- [ ] 24-hour, 72-hour, 7-day, and 30-day reviews are scheduled with owners. Evidence: —
- [ ] Rollback/hold/expand criteria are explicit and monitored. Evidence: —

Gate approval:

| Approver        | Decision | Date | Evidence/notes |
| --------------- | -------- | ---- | -------------- |
| Release owner   | Pending  | —    | —              |
| Release council | Pending  | —    | —              |

## 4. Release decision record

Complete this only after G0–G9 have the required approvals.

| Field                      | Value         |
| -------------------------- | ------------- |
| Candidate commit           | —             |
| Database migration range   | —             |
| Web deployment version     | —             |
| Edge Function versions     | —             |
| Provider registry snapshot | —             |
| Policy/pricing snapshot    | —             |
| Approved release time      | —             |
| Release owner              | —             |
| Rollback owner             | —             |
| Decision                   | Pending       |
| Accepted risks             | None recorded |
| Next review                | —             |
