# Indus Orbit full finalization execution plan

Status: active, evidence-gated plan updated 9 August 2026. Demo database release is complete; production readiness is not.

This plan covers the whole product: public brand site, identity, Community, conversation, I/O Port, terminal/OpenCode, admin, data, operations and commercial readiness. “Done” means code, authorization, data migration, browser behavior, deployment and operating evidence all agree. A source file or attractive UI alone is not completion.

Execution update, 10 August 2026: I/O request idempotency, hard budgets, reserve/settle ledger, endpoint health/circuits, member budget UI, admin budget/circuit UI and safe durable terminal metadata are **Verified locally**. They are not **Released** until migrations `20260810002754` and `20260810010415` plus the updated gateway are applied and verified in hosted project `jpwvgpnbkrktipwhvqss`. Hosted release is **Blocked** only by missing Supabase CLI authentication in the current environment.

## Current release checkpoint

Completed in the demo environment:

- provider registry/control-plane foundation and Released `io-gateway` v18;
- latest endpoint-bound eligibility enforcement;
- notification table containment and vouch contract repairs;
- complete Loops browser retirement with service-only archive access;
- independent I/O access and explicit Community onboarding;
- consent-aware global location foundation;
- caller-bound, idempotent direct-message send/read boundary;
- removal of anonymous access to eight privileged functions;
- caller-bound domain mutations, retirement of generic notification execution and a private service-leased email outbox;
- Chapter/Mission Space schema, deterministic Room blueprints, membership projection and caller-bound lifecycle/message/read operations;
- clean 66-migration replay with 516/516 assertions plus the previously verified hosted schema/RLS/RPC/Realtime and I/O evidence contracts;
- five-provider/model/endpoint inventory with three capacity sources/grants, while route receipts and provider attempts remain zero.

The product is still a release candidate foundation, not a finished production system.

## Phase 1 — make database delivery reproducible

Deliverables:

1. Preserve the hosted ledger and document or baseline the 26 timestamp aliases so ordinary `supabase db push` works without a temporary migration view.
2. Decide whether the separate builder/course/S.O.D.A. seed belongs in demo only; never mix that decision into schema deployment.
3. **Verified:** all 64 migrations replay from an empty database.
4. **Verified locally:** all 446 pgTAP assertions and public/private lint pass; keep these and the GitHub database workflow required in CI.
5. Add an automated generated-public-types drift gate.
6. Verify the owner-scoped managed `realtime.messages` policy in its real owner environment.
7. Prove an upgrade from a production-like snapshot, not only an empty reset.

Exit criteria:

- a clean checkout can reset, test and lint without manual file staging;
- linked migration list has an approved explanation for every local/remote version;
- CI evidence is retained and no history repair is required;
- schema, grants, policies, functions, triggers, enums, extensions, Realtime and generated types are compared.

User input needed: approve the long-term migration strategy and the content-seed scope. No paid Supabase branch is required unless separately approved.

## Phase 2 — finish identity, onboarding, location and conversion evidence

Deliverables:

1. Run Playwright personas for I/O-only sign-up, Community opt-in, existing Community member, interrupted/resumed onboarding and suspended access.
2. Cover location Skip, private country, members-country, public-country, purpose changes and immediate withdrawal.
3. Configure production email confirmation, OAuth redirects, recovery, session revocation and privileged MFA/re-auth; verify leaked-password protection and enable it if disabled.
4. Move trusted onboarding/workspace lifecycle events into transactional RPCs.
5. Build aggregate-only conversion reporting with consent-off defaults and small-cohort suppression.
6. Run an A/A instrumentation test before any product experiment.

Exit criteria:

- Community never blocks I/O and visiting Community never silently starts onboarding;
- location is never inferred or required for authentication/I/O;
- every persona passes desktop/mobile accessibility checks;
- funnel denominators reconcile and contain no prompts, email, IP, city or arbitrary payload.

User input needed: approve production Auth domains/providers, consent copy and measurement owner.

## Phase 3 — close notification, email and inherited security boundaries

Deliverables:

1. **Released:** every former generic `send_notification` caller now uses a domain-owned event RPC.
2. **Released/Verified:** the private idempotent outbox, leases, retries and dead-letter state exist; the fixed-template worker source is locally Verified. Provider configuration, deployment, scheduling and operator controls remain.
3. **Released:** authenticated generic notification execution is revoked and arbitrary browser recipient/subject/HTML email requests are removed from source.
4. Audit every current authenticated `SECURITY DEFINER` warning for caller binding, capability checks, fixed empty `search_path`, grants, validation and audit; classify GraphQL and permissive-policy findings separately. The post-Space Security Advisor currently reports 61 warnings and 18 information notices in total.
5. Add abuse protection for contact, newsletter, auth, recovery, vouch, messaging and uploads.
6. Move vouch issuance/hashing and education quiz correctness fully behind trusted server boundaries.
7. Add the education storage bucket with ownership, type, size, signing and lifecycle policies.

Exit criteria:

- no browser can choose another member’s notification/email payload;
- every privileged function has positive and negative role tests;
- no unresolved critical/high trust-boundary finding remains.

User input needed: choose/verify the transactional email provider and sender domain, then nominate security/privacy ownership. Current worker source targets Resend but is not deployed.

## Phase 4 — finish the people-centred Discord-like Community system

Deliverables:

1. Extract one branded Orbit rail/context sidebar/workspace/inspector shell for Messages, Missions, Chapters and I/O.
2. Add a shared conversation cache/store, cursor pagination, deterministic retries, reconnect and multi-device unread resolution.
3. Implement explicit block/unblock state and make it revoke messaging and realtime immediately.
4. Replace Postgres Changes proof subscriptions with authorized private Broadcast topics.
5. **Released foundation:** Chapter/Mission Spaces, grouped Rooms, role-aware membership projection, Threads/message/read schema and first branded web surface exist. Complete Thread/role/Room administration, Boards and hosted browser personas without copying Discord branding or engagement mechanics.
6. Add presence, typing, mentions, reactions, pins, bookmarks, attachments, search, retention/export/deletion, reports and moderation in evidence-gated slices.
7. Keep prompts, terminal output, files and tools outside human-message storage; handoffs carry permissioned references only.

Exit criteria:

- two-session send/read/retry/reconnect/block tests pass;
- participant removal immediately revokes database and Realtime access;
- responsive, keyboard, screen-reader and visual-regression gates pass;
- load tests establish pagination and realtime limits.

User input needed: approve the first group-collaboration scope and moderation/retention rules.

## Phase 5 — make I/O Port activation-grade

Deliverables:

1. Build the operator conformance runner and evidence UI; validate chat, streaming, tools, structured output, usage, errors, cancellation and safety one provider at a time.
2. **Verified locally:** request idempotency, hard workspace budgets, reserve/settle accounting, retry-cost reservation, circuit breakers and outcome sampling. Still required: hosted release, scheduled health/latency probes, distributed retry/rate budgets and kill-switch drills.
3. Complete dynamic model refresh with evidence timestamps, region/residency labels that are never inferred, price versions and approved FX snapshots.
4. Validate and expand the live five-provider registry toward the reviewed 20-provider inventory using partnership, owned/rented and donated-capacity adapters.
5. Add OpenAI-compatible partner and local endpoints while preserving provider-specific adapters where semantics differ.
6. Add member usage, credit, sponsorship, estimate, receipt and failure/offline UI.
7. Activate one provider at a time only after contract tests; make one bounded live conformance call only with explicit spend approval.

Exit criteria:

- no unverified or stale endpoint can route;
- a retried request cannot double-charge or duplicate an upstream call;
- reserve, settle, refund and receipt totals reconcile;
- provider disablement is immediate and audited;
- published model/price/residency claims have current evidence.

User input needed: provider partnership terms, permitted regions, spend ceiling, activation order, commercial pricing and donated-capacity rules.

## Phase 6 — complete the I/O terminal and OpenCode system

Deliverables:

1. **Verified locally:** safe creator-only sessions, member/event/approval schema foundations and create/complete/list lifecycle. Still required: ordered runtime event ingestion, executable approval/tool contracts, artifacts and handoffs.
2. Add resumable streaming timelines, task trees, commands, diffs/revert, abort/recovery and explicit approval states.
3. Authenticate the local daemon with short-lived pairing, origin binding and revocation instead of an in-memory password alone.
4. Package the local client and define compatibility/version negotiation with OpenCode.
5. Keep local execution local; the hosted service stores only deliberate, permissioned session metadata/artifacts.
6. Design hosted runners separately with workload identity, sandboxing, network/filesystem policy, secret isolation, quotas and funded operations.

Exit criteria:

- refresh/reconnect resumes a durable session without replaying tools;
- dangerous actions cannot execute without recorded approval;
- another workspace/member cannot read session data;
- local daemon compromise and disconnect recovery have tested runbooks.

User input needed: supported operating systems, local-only versus hosted v1 scope and approval policy.

## Phase 7 — complete the separate admin application

Deliverables:

1. Deploy and host `admin-indus-orbit` against the shared identity and capability projection.
2. Add privileged MFA/re-auth, session review/revocation and two-person root-role changes.
3. Replace legacy direct-table member/content/program mutations with capability-checked transactional RPCs.
4. Add redacted cursor-paginated audit, queue assignment, reasons, confirmations and safe bulk-operation limits.
5. Provider runtime/receipt evidence is Released; budget and manual circuit controls are Verified locally. Still add hosted release, evidence/conformance approval, scheduled health, reconciliation and incident workflows without exposing provider secrets.
6. Remove or redirect obsolete member-app admin surfaces after parity and role-negative tests pass.

Exit criteria:

- every admin duty is least-privilege and independently testable;
- ordinary authenticated users receive no privileged data;
- root/provider changes are re-authenticated, reasoned and audited;
- support workflows do not require direct SQL.

User input needed: admin hostname, initial operators, duty assignments and two-person approval policy.

## Phase 8 — finish inherited product domains and web quality

Deliverables:

1. Complete state/permission/concurrency contracts for profiles, connections, mentorship, Missions, Chapters, events, learning, skills, S.O.D.A. and stories.
2. Replace hard-coded/public claims with approved, evidence-backed content and correct canonical metadata.
3. Resolve the 147 lint warnings, beginning with missing Hook dependencies; split component-only exports where it improves reliability.
4. Split the 645.31 kB chunk and set measured Core Web Vitals and bundle budgets.
5. Add component, Playwright, accessibility, visual, load and recovery coverage.
6. Decide Loops archive retention/export/deletion with backup evidence; do not restore it as a product surface.

Exit criteria:

- full feature acceptance matrix passes for each in-scope domain;
- no unsafe scoring/upload/content-publication boundary remains;
- public pages meet approved accessibility, performance and content standards.

User input needed: Production v1 domain scope, content/design approval and Loops retention decision.

## Phase 9 — operations, commercial and production launch

Deliverables:

1. Establish preview, demo/staging and production projects with immutable promotion and rollback procedures.
2. Add structured redacted telemetry, SLOs, alerts, dashboards, provider cost alarms and incident/support runbooks.
3. Verify backups and rehearse restore to approved RPO/RTO.
4. Complete data inventory, retention, export/deletion, DPAs, provider terms, India/residency claims, moderation, tax, invoices, refunds and chargebacks.
5. Approve prepaid/credit/BYOK/sponsored pricing rules and a double-entry ledger.
6. Run security/privacy review, staged beta, kill-switch drill and final release gate sign-off.

Exit criteria:

- every release-checklist blocker has evidence, owner and decision;
- no critical/high finding remains;
- operational and financial reconciliation drills pass;
- production activation uses an approved immutable commit and migration set.

User input needed: legal entity/billing decisions, production budget, launch cohort, support commitments and named release approvers.

## Execution order

The critical path is Phase 1 → Phase 2/3 → Phase 4/5/6/7 → Phase 8 → Phase 9. Phases 4–7 can proceed in parallel after the data/auth boundary is stable, but provider traffic remains off until Phase 5 gates pass. Every phase ends with a commit, remote push, document update and retained evidence artifact.
