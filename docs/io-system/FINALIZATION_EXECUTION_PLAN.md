# Indus Orbit full finalization execution plan

Status: active, evidence-gated plan updated 24 August 2026. The hosted project has 89 migrations. The router, OpenAI-compatible API, OpenCode client, collaboration controls, independent Trust operations and financial control-plane schema are Released; external provider and payment activation remain policy-gated. Production readiness is not claimed.

This plan covers the whole product: public brand site, identity, Community, conversation, I/O Port, terminal/OpenCode, admin, data, operations and commercial readiness. “Done” means code, authorization, data migration, browser behavior, deployment and operating evidence all agree. A source file or attractive UI alone is not completion.

Execution update, 19 August 2026: the Released I/O controls remain unchanged. Direct-history keyset pagination, terminal cancellation/time/size bounds, gateway response caps and strict admin route matching are **Verified locally**. A clean replay now passes 68 migrations and 550 assertions; member/admin checks and dependency audits pass. The alias-safe migration-68 dry run made no hosted change because direct database transport failed on the current IPv6 network. Provider routing remains disabled.

Execution update, 24 August 2026: the member I/O shell navigation and visibility repair is **Verified locally** by typecheck and 59/59 unit tests. Overview, Sessions, Terminal, Model routes, Capacity, Evidence, Usage ledger and Safety are now distinct query-backed views with active navigation and refresh continuity; invalid view values fail to Overview. The light I/O workspace now establishes its own foreground/design-token scope, eliminating the inherited parchment-on-grey contrast failure. This is checked-in UI behavior, not hosted-production or provider-activation evidence; authenticated browser accessibility and visual-regression journeys remain an exit gate.

Execution update, 24 August 2026 (Trust and finance): the hosted database now includes separate report triage, scanner-evidence attachment review and independent appeals; the member app has its own notice/appeal surface. The finance foundation now includes versioned buyer profiles, second-person GST/tax and FX policy approval, immutable invoice issuance, exact nanos/minor-unit accounting, payment/refund state, signed/deduplicated Razorpay adapters, provider-statement reconciliation and a downloadable issued-invoice representation. Twenty-four advisor-identified foreign-key indexes were added; no new release-table foreign key remains unindexed. `orbit-attachment-scan-webhook` v2, `io-payments` v1 and `io-payment-webhook` v1 are active. Payment execution remains inert because there is no approved live processor or tax policy. The separate admin repository passes its 22-test/build gate and is pushed through GitHub at `76a04f6`.

Execution update, 24 August 2026 (authenticated I/O audit): the signed-in production app now passes an eight-destination sidebar and refresh-continuity audit, and the visibility repair is observable on the deployed surface. Hosted migration `20260824223000_fix_io_member_history_and_key_listing.sql` removes an ambiguous joined `provider_cost_nanos` reference from member usage history. The corresponding member API-key read is moved from a security-invoker view to a caller-bound, membership-checked RPC with no browser grant on the credential table. This is migration 89; the database repair is active and the client RPC switch follows the normal GitHub-to-Netlify deployment.

## Current release checkpoint

Completed in the demo environment:

- provider registry/control-plane foundation and Released `io-gateway` v24, including no-dispatch route preflight;
- latest endpoint-bound eligibility enforcement;
- notification table containment and vouch contract repairs;
- complete Loops browser retirement with service-only archive access;
- independent I/O access and explicit Community onboarding;
- consent-aware global location foundation;
- caller-bound, idempotent direct-message send/read boundary;
- removal of anonymous access to eight privileged functions;
- caller-bound domain mutations, retirement of generic notification execution and a private service-leased email outbox;
- Chapter/Mission Space schema, deterministic Room blueprints, membership projection and caller-bound lifecycle/message/read operations;
- clean local 78-migration replay with 700/700 assertions; the hosted project has the matching 78 migrations with direct-pagination, I/O API-key, transparent-fee, commercial-gate, workspace/key-policy, provider-conformance, private-conversation, terminal private-Broadcast and transactional Trust contracts;
- exact 5.5% provider-cost/fee/customer-total evidence, browser-origin persistent-key rejection and fail-closed written onward-access gates; OpenAI and DeepSeek remain `resale_pending`;
- five-provider/model/endpoint inventory with three capacity sources/grants, while route receipts and provider attempts remain zero.

Released after that checkpoint:

- explicit workspace consent before any CN-resident route is catalogued or selected;
- immutable beta-key limits: 30-day default, 20 requests/minute, 200/day, 2,000/month, USD 1/day and USD 10/month;
- atomic per-key spend reserve/settle/release in the same database transaction as workspace accounting;
- HMAC-derived OpenAI safety identifiers;
- operator-reasoned, confirmation-gated, discovery-first `io-chat-v1` conformance with an eight-token request and USD 0.01 maximum;
- hosted `io-provider-conformance` v3 plus four covering foreign-key indexes; no approval or paid call was created;
- hosted TypeScript schema contracts synchronized into the member repository;
- the standalone 23-file admin application published to private GitHub `main`;
- 57 member tests and 16 admin tests.

The product is still a release candidate foundation, not a finished production system.

## Phase 1 — make database delivery reproducible

Deliverables:

1. Preserve the hosted ledger and document or baseline the 26 timestamp aliases. Until a separately reviewed reconciliation, continue to use the exact-ledger temporary release view rather than ordinary linked `supabase db push`.
2. Decide whether the separate builder/course/S.O.D.A. seed belongs in demo only; never mix that decision into schema deployment.
3. **Verified:** all 78 migrations replay from an empty database.
4. **Verified locally:** all 700 pgTAP assertions and public/private lint pass; keep these and the GitHub database workflow required in CI.
5. Add an automated generated-public-types drift gate. The current hosted generation confirms the I/O terminal RPC contract; its file-wide generator-version diff is not yet an automated CI check.
6. **Verified hosted:** managed `realtime.messages` has exact participant/member authorization for DM and terminal topics; the inherited permissive substring policy is removed.
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

User input needed: choose/verify the transactional email provider and sender domain, then nominate security/privacy ownership. The fixed-template worker is deployed but remains inactive until its server secrets and service-only schedule are configured.

## Phase 4 — finish the people-centred Discord-like Community system

Deliverables:

1. Extract one branded Orbit rail/context sidebar/workspace/inspector shell for Messages, Missions, Chapters and I/O.
2. Add a shared conversation cache/store, cursor pagination, deterministic retries, reconnect and multi-device unread resolution.
3. **Released:** explicit caller-owned block/unblock state revokes direct-message history, send/read mutations and future broadcasts in both directions while exposing the block list only to its owner.
4. **Released:** direct-message Postgres Changes subscriptions are replaced by participant-authorized private Broadcast topics with database-side blocked-pair suppression.
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

1. **Released:** the first operator conformance runner/evidence UI covers model discovery, bounded text chat, usage, response shape, cost, reason, CN acknowledgement and redacted evidence for staged OpenAI/DeepSeek endpoints. Execute one explicitly approved run; streaming, tools, structured output, cancellation and media remain separate future suites.
2. **Released to demo:** request idempotency, hard workspace budgets, reserve/settle accounting, retry-cost reservation, circuit breakers and outcome sampling. Still required: controlled hosted concurrency evidence, scheduled health/latency probes, distributed retry/rate budgets and kill-switch drills.
3. Complete dynamic model refresh with evidence timestamps, region/residency labels that are never inferred, price versions and approved FX snapshots.
4. Validate and expand the live five-provider registry toward the reviewed 20-provider inventory using partnership, owned/rented and donated-capacity adapters.
5. Add OpenAI-compatible partner and local endpoints while preserving provider-specific adapters where semantics differ.
6. Add member usage, credit, sponsorship, estimate, receipt and failure/offline UI.
   **Released slice:** authenticated users can run a no-dispatch preflight that returns the chosen route, candidate evidence, capability/price versions, residency and provider-cost plus 5.5% estimate without reserving budget or contacting a provider.
   **Verified local slice:** the I/O rail resolves to eight focused, URL-backed views with refresh-safe state, active semantics and corrected light-surface contrast. Hosted visual/accessibility personas remain required before release.
7. Activate one provider at a time only after contract tests; the first live conformance call requires an explicit admin reason/confirmation and is capped at USD 0.01.
8. **Released foundation:** versioned 5.5% fee settlement, non-cash credits, immutable invoice snapshots, verified billing identity, GST/tax/FX policy versions, payment/refund evidence, provider-invoice reconciliation and written onward-access activation gates. Still required: approved business policies, payment-provider activation, runtime reconciliation evidence and any provider-specific cached/tools/media/storage/regional billing dimensions not reported by upstream usage.

Exit criteria:

- no unverified or stale endpoint can route;
- a retried request cannot double-charge or duplicate an upstream call;
- reserve, settle, refund and receipt totals reconcile;
- provider disablement is immediate and audited;
- published model/price/residency claims have current evidence.

User input needed: verify/add the safety-identifier secret, obtain written OpenAI/DeepSeek onward-access decisions, choose OpenAI data controls, explicitly execute the first capped conformance check, assign production API DNS/TLS ownership and approve donated-capacity rules. The fee is fixed at 5.5% for policy version 1; the first conformance ceiling is USD 0.01.

## Phase 6 — complete the I/O terminal and OpenCode system

Deliverables:

1. **Released to demo:** safe creator-only sessions, lifecycle, replay-safe ordered metadata events and non-executable request/owner-decision boundaries. Still required: realtime delivery, executable approval/tool contracts, artifacts and handoffs.
2. **Released/Verified slice:** browser cancellation propagates to OpenCode session abort; completed runs expose only a local changed-file count; private terminal metadata Broadcast resumes the safe timeline; and a validated device-local binding reconnects to the exact OpenCode session for status/task/diff counts. Still add OpenCode SSE ingestion, continued prompts, task trees, commands, full diff/revert, verified abort/recovery and daemon-enforced approval states.
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
3. **Released Trust and Member Support slices:** the separate app uses a privacy-minimised cursor queue and a reasoned, row-locked, idempotent action/dismiss command with explicit browser denial and private append-only evidence. It now also has privacy-minimised member lookup, reasoned expected-state suspension/lift and verification, protected administrative targets, plus private operation evidence. Still add Trust assignment, account/content actions, appeals and legacy content/program replacements.
4. **Released Audit slice:** `audit.read` receives a redacted cursor-paginated cross-domain queue with reviewed domain filters. Still add step-up-authorized export, retention, queue assignment, safe bulk-operation limits and authenticated browser role personas.
5. Provider runtime/receipt/budget/circuit database controls are Released; still add evidence/conformance approval, scheduled health, reconciliation and incident workflows without exposing provider secrets. The separate admin browser app still needs hosting deployment.
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
3. **Verified:** member ESLint now passes with zero errors and zero warnings. Missing Hook dependencies were repaired with stable callbacks; TanStack route and reusable UI modules are classified explicitly instead of producing structurally false Fast Refresh warnings.
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
