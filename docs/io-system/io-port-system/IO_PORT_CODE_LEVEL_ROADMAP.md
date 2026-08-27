# I/O Port code-level roadmap

Status: active implementation roadmap, updated 24 August 2026 after the collaboration, Trust and finance releases. It distinguishes source work from deployed proof and from policy/provider work required before a private or paid beta. The current operational verdict is in `IO_PORT_IMPLEMENTATION_STATUS.md`.

Latest code-level checkpoint: Chat JSON/SSE and the stateless Responses subset, capability-gated tools/structured output/HTTPS image input, client-to-provider cancellation propagation, richer usage/credit/invoice history, the packaged OpenCode client with global SSE/continued prompts/task trees/approval enforcement/full diffs/secure loopback pairing, and the member control-room views are implemented. The hosted finance schema now covers verified buyer identity, GST/tax/FX evidence, immutable issuance, payment/refund records, provider reconciliation and member invoice PDFs. The reviewed payment functions are deployed but remain inert: no approved tax policy or live processor exists, so collection still fails closed until policy and merchant approval.

Related documents:

- `IO_PORT_IMPLEMENTATION_PLAN.md` — product, design and commercial direction.
- `IO_PORT_IMPLEMENTATION_STATUS.md` — verified done/partial/not-started assessment and the corrected multi-provider credential/architecture plan.
- `IO_PORT_OPERATIONS_GUIDE.md` — what is actually deployed in the demo project and how to activate it safely.
- `IO_PORT_PROVIDER_INVENTORY.md` — the 20-provider research inventory and the ordered implementation gates for converting it into routable capacity.
- `../conversation-system/CONVERSATION_SYSTEM_IMPLEMENTATION_PLAN.md` — the shared Indus Orbit conversation and Discord-like shell plan.
- `../../SUPABASE_SCHEMA_RECONCILIATION.md` — remote/local migration-history evidence and recovery sequence.

## 1. Current implemented proof

The demo project has an RLS-protected I/O control plane, three clearly labelled demo capacity sources, custom-authenticated `io-gateway` v27, custom-key `io-openai` v9 and custom-authenticated `io-provider-conformance` v3. Released web source moves the authenticated product to `/io`; it uses its own shell and does not require Community onboarding. Provider traffic remains off.

The existing people-messaging system is also now hardened in the demo project: only accepted, non-suspended connections can insert a direct message, recipients can update only `read_at`, and new messages are capped at 4,000 characters.

The shared-message client extraction in `src/features/conversations/` provides contacts, caller-bound cursor-paginated direct history and event-driven unread hooks for the full Messages route and quick chat. A common cache/store and private Broadcast remain deliberate follow-on work.

| Concern                  | Current code                                                          | Truthful status                                                                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web control room         | `src/features/io/IoOverview.tsx`                                      | Member UI with local/OpenCode, provider catalogue, route/model selection, budget status, settled cost and safe session/receipt history.                                                  |
| Local terminal connector | `src/features/io/opencode.ts`                                         | Loopback-only health → session → prompt with durable lifecycle, cancellation, time/input/1 MiB response bounds. Daemon-confirmed abort and Realtime remain.                              |
| Provider gateway         | `supabase/functions/io-gateway/index.ts`                              | Demo v27 is Released with bounded SSE/JSON transport, strict validation, transparent fee settlement, client-to-provider cancellation and a shared execution core used by `io-openai` v9. |
| Browser data access      | `src/features/io/io.client.ts`                                        | Browser-facing I/O data access, explicitly separated from privileged Edge/RPC work.                                                                                                      |
| Control-plane schema     | `supabase/migrations/20260730155210_create_io_port_control_plane.sql` | Workspaces, memberships, sources, grants, policy records, key metadata and safe audit events.                                                                                            |
| I/O nested shell         | `src/features/io/IoWorkspaceShell.tsx`                                | Working in-page context navigation and evidence guide; preview-only workspace/health/activity claims are removed.                                                                        |

## 2. Non-negotiable boundaries

1. **Human conversations stay in the existing message system.** Do not duplicate `direct_messages` or mix I/O prompts into human DMs.
2. **Terminal sessions are distinct records.** I/O events, tool approvals, diffs, artifacts and handoffs belong in session tables, not in chat rows.
3. **No browser-supplied provider destination or credential.** The Edge Function selects a registered endpoint and reads its secret server-side.
4. **No paid traffic before a reserve-and-settle ledger.** UI totals are never the billing source of truth.
5. **Preview signals may not look live.** Replace static activity/health/counts before a beta, or label them as illustrative.
6. **Share system primitives, not access gates.** I/O owns its top-level product shell; Discord-like means persistent spaces, context and inspectable activity—never copied Discord vocabulary or a dependency on Community onboarding.

## 3. Delivery order

```text
P0 contracts + trustworthy state
  → P1 registry + deterministic policy routing
  → P2 usage/budget ledger
  → P3 operator console
  → P4 durable terminal sessions
  → P5 shared application shell + conversations
  → P6 privacy, test and beta gates
```

No provider key is required for schema, policy, receipt, ledger, UI, and simulated-adapter work. A non-production provider key is required for provider conformance and end-to-end route tests; keys now in the secret store are not themselves activation evidence.

## 4. P0 — contracts and trustworthy state

### 4.1 Refactor the gateway before adding providers

**Partially implemented and deployed:** gateway concerns now live outside the HTTP entry point, but the modules are not yet the final production contracts:

```text
supabase/functions/_shared/io/
  auth.ts                 authentication and workspace-membership checks
  validation.ts           manual request shape and limit guards
  audit.ts                redacted, append-only audit writer
  policy.ts               generic partner-gateway entitlement check
  provider-adapter.ts     registry resolver, candidate selection, secret-reference validation and OpenAI/Gemini adapters
  receipt.ts              append-only route-receipt and provider-attempt writer
  errors.ts               stable public error taxonomy
  types.ts                current request, selection and result types
supabase/functions/io-gateway/index.ts  thin HTTP/CORS/action handler
```

The boundary validates request shape, workspace UUIDs, modes, route strategy/model IDs, message limits, local loopback origin/session data and typed public errors before dispatch. It performs membership and entitlement checks separately, audits every requested/completed provider route and writes a safe failure audit without retaining prompt/response text. It validates normalized OpenAI-compatible and Gemini response shapes before returning them. Gateway version 26 and its currency-aware receipt writer are deployed to the demo.

**Released after demo v18:** the client sends an idempotency key; `operations.ts` calls the reserve/finalize/outcome RPC boundary; the resolver excludes open circuits; and the gateway settles/releases exactly once. SQL tests cover budget isolation, idempotency, balanced ledger, stale holds and health/circuit behavior. The hosted release contract confirms the schema/grants; real provider concurrency is still untested.

Chat JSON/SSE, the stateless Responses subset, function tools, strict structured output and HTTPS image input are implemented behind exact capability gates. Released incoming-request cancellation aborts the provider fetch, releases the reserved accounting path, stops fallback and does not degrade provider health. Still required before broad provider rollout: formal route-policy activation/retirement commands, scheduled health/latency probes, distributed abuse/rate controls, direct upstream token streaming and provider-specific conformance for every enabled advanced capability. Unsupported modalities continue to fail closed.

### 4.2 Make workspace creation atomic

**Implemented in the demo migration:** `public.create_my_io_workspace()` is the single authenticated RPC for personal-workspace creation. It accepts no client-controlled fields, serialises the caller's default workspace creation, creates the workspace + immutable owner membership + safe audit event in one transaction, and repairs an older partial owner membership if it finds one. Direct browser workspace INSERT is revoked; membership management remains separately authorised for owners/admins.

**Implemented in the I/O overview:** the page lists every active workspace available through RLS, shows the active one explicitly, and lets a multi-workspace member switch it before loading capacity/audit data or dispatching a run. It deliberately holds selection in page state for now; persist a member preference only when its cross-device semantics and deletion fallback are designed.

Recommended files:

```text
src/features/io/io.client.ts
src/features/io/IoWorkspaceProvider.tsx
src/features/io/IoWorkspaceSwitcher.tsx
supabase/migrations/*_io_workspace_creation_rpc.sql
```

### 4.3 Remove false live state

**Implemented:** the shell has working anchors for the member-owned sections, and preview workspace/health/activity claims were replaced by a stable evidence guide. Real workspace, capacity, safe audit and RLS-scoped route-receipt data load in the working surface. Future dedicated routes still require their own data and authorization contracts.

## 5. P1 — provider registry and policy router

Create one additive migration for the non-secret registry:

```text
io_providers
io_provider_connections             -- secret-manager reference, never the secret
io_models
io_model_endpoints
io_endpoint_pricing_versions
io_endpoint_capability_versions
io_endpoint_health_samples
io_route_definitions
io_route_receipts
io_provider_attempts
```

**Implemented in the demo project:** `supabase/migrations/20260731113000_create_io_provider_registry.sql` establishes the provider, model, endpoint, versioned capability and versioned price-card records. It keeps endpoint URLs, secret-manager references and conformance-run details in the non-exposed `private` schema; public tables contain only member-appropriate catalogue/evidence data and use RLS plus explicit Data API grants. `20260731123500_add_io_provider_registry_fk_indexes.sql` completes the foreign-key indexes identified by the post-deployment Performance Advisor. `20260731150000_add_io_dynamic_model_selection.sql` adds the reviewed release date and automatic-routing tier needed to select a model dynamically rather than bake a model ID into an Edge Function secret. Five providers are staged in testing/conformance with runtime routing disabled; no provider is certified for traffic.

**Implemented and Released to demo:** `20260801003835_io_route_receipts_and_registry_router.sql` adds a service-role-only resolver for ready private connection rows plus append-only `io_route_receipts` and `io_provider_attempts`. The gateway considers active/listed/non-deprecated, entitled candidates with verified chat capability and a current member-visible price card; automatic routes are limited to a configured tier, freshness window and affordability multiple. It supports `latest_affordable`, `lowest_cost` and a reviewed explicit model. Cross-currency automatic comparison fails closed pending reviewed FX data. Candidate selection is deterministic, response handling supports OpenAI-compatible and Gemini-native chat, safe upstream/rate-limit failures can fall back in order, and a receipt ID reaches the web UI. Secret lookup accepts only operator-approved references matching `IO_PROVIDER_[A-Z0-9_]+_API_KEY`.

This replaces the legacy `IO_PARTNER_*` contract. The migration and Edge Function are now deployed to the demo, with five reviewed inventory records staged in testing/conformance. No provider is routable until its paid conformance evidence is approved and its connection/capability/endpoint/provider states are deliberately activated.

Provider, model and endpoint records must capture the research gates before they can be activated: `terms_version`, `contracted_region`, `residency_evidence`, retention/training class, resale rights, model revision/licence, commercial-hosting rights, `capacity_mode`, `metering_basis`, health/queue signal, feature support and a versioned price card. See `IO_PORT_PROVIDER_LANDSCAPE.md` for evidence, licence constraints and the proposed commercial model.

The route request transaction is:

1. authenticate actor and active workspace;
2. validate request against a named policy version;
3. identify allowed endpoints from registry, capacity and data constraints;
4. reserve a budget (P2 dependency for an activated commercial route);
5. make one recorded provider attempt;
6. accept a fallback only when the policy explicitly allows that fallback class;
7. persist the route receipt and exact provider attempt outcome;
8. settle usage and return a receipt ID alongside the normalized response.

Create private activation functions—`private.activate_io_route_policy(...)` and `private.retire_io_route_policy(...)`—rather than treating policy JSON as immutable by convention. They must validate the shape, enforce owner/admin role, transition state atomically and write a safe audit event.

## 6. P2 — metering, budgets and billing

**Released to demo:** migration `20260810002754_create_io_operational_core.sql` adds the activation-grade core records:

```text
io_budget_limits
io_usage_reservations
io_usage_records
io_ledger_transactions
io_ledger_entries
```

It enforces hard reserve before dispatch, atomic settle/release once, stale-hold expiry and balanced ledger entries in integer minor units. The browser and admin app display these values but never become the source of truth.

The commercial records are now implemented and hosted:

```text
io_credit_grants / io_service_fee_policies
io_fx_rate_versions
io_invoices
io_invoice_lines
io_payment_intents
io_payment_events
io_refunds
io_provider_statements / reconciliation results
```

The member-visible price is derived from an immutable route receipt: usage/recovery cost plus one labelled 5.5% I/O routing fee, then separately disclosed payment/tax treatment. Invoice issuance freezes buyer, seller, tax and usage evidence. Drafts are not tax invoices; provider callbacks do not finalize payment state; signed and deduplicated webhooks do.

The required invariant is **reserve → dispatch → settle once → release remainder**. Provider bills, user invoices, sponsored grants and refunds must be derivable from ledger entries, never recomputed from UI aggregates.

## 7. P3 — operator console in the separate admin application

Keep I/O operations inside the separate admin repository, retaining the existing role system and enforcing every action server-side:

```text
admin-indus-orbit/src/App.tsx
admin-indus-orbit/src/admin-api.ts
admin-indus-orbit/src/contracts.ts
admin-indus-orbit/src/contracts.test.ts
```

**Current Released slice:** the separate `admin-indus-orbit` app manages the fail-closed provider runtime switch, readiness gates and capability-checked redacted route evidence.

**Released to demo:** immutable workspace budget configuration, budget snapshots, endpoint health/circuit snapshots and reasoned 15-minute manual circuit open/close. All authorization remains in database RPCs; browser state does not grant authority.

**Released to demo:** provider conformance approval/execution uses a single-use 30-minute authorization, non-billable discovery first, one bounded eight-token chat check, a USD 0.01 ceiling, a mandatory operator reason, explicit DeepSeek China-processing acknowledgement and redacted evidence. Separate Trust queues now cover report triage, attachment evidence and independent appeals. The finance surface covers billing verification, second-person tax/FX/processor approval, invoice issuance, payment/refund evidence and provider-statement reconciliation. No provider approval/run or finance activation exists yet. Remaining operator work is secret-reference rotation, capacity/grant lifecycle, scheduled health, retention/export policy and production personas.

Hiding a route through `useAuth().isAdmin` is only presentation. RLS and Edge/RPC checks must authorize every mutation.

## 8. P4 — durable I/O Terminal

The local OpenCode connector creates a runtime session and returns a final response. Migration `20260810010415_create_io_terminal_session_foundation.sql` provides Released creator-only durable metadata, and `20260812000100_add_io_terminal_timeline_and_approval_rpcs.sql` adds Released replay-safe ordered safe-metadata events plus non-executable approval request/owner-decision records:

```text
io_terminal_sessions
io_terminal_session_members
io_terminal_session_events
io_terminal_approval_requests
io_terminal_approval_decisions
```

The migrations store only safe lifecycle metadata and hashed origin/runtime references. Timeline payloads reject prompt, output, source code, commands, file paths, URLs and credentials. The packaged loopback client now provides secure pairing, global OpenCode SSE, continued prompts, task trees, daemon-confirmed permission replies and full diffs. The hosted timeline remains privacy-minimised metadata, so these collaborative records still require explicit product/data contracts before they can leave the member's device:

```text
io_session_artifacts
io_session_tasks
io_session_handoffs
```

Future hosted collaboration UI/routes:

```text
src/routes/app.io.sessions.tsx
src/routes/app.io.sessions.$sessionId.tsx
src/features/io/terminal/
```

Next add explicit artifact sharing, cross-person handoff and hosted session/task projections. The web app may attach only to an explicitly local, loopback-bound OpenCode instance; it must never expose an internet-listening shell or covertly proxy a member's files.

## 9. P5 — shared Discord-like system

The live Orbit Space slice now supplies rooms, memberships, threads/replies, reactions, private quarantined attachments, room administration and moderation. The I/O nested shell has URL-addressable views and its own product boundary. The remaining shell work is to generalize one responsive rail/context/inspector frame across Messages, Chapters, Missions and I/O without coupling I/O access to Community onboarding.

The data distinction is fixed:

| Surface              | Durable source                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Human discussion     | Existing `direct_messages` and notifications; later, scope-specific conversations for I/O, Mission and Chapter collaboration |
| Agent/terminal work  | I/O session, event, approval and artifact tables                                                                             |
| Operational evidence | Route receipt, provider attempt, ledger and audit records                                                                    |
| Context              | Selected space, workspace/project/session and permitted membership                                                           |
| Inspector            | People, files/diff, approvals, route evidence and cost                                                                       |

## 10. P6 — privacy, testing and release gates

The repository currently passes 81 unit/contract tests, TypeScript, formatting and the production build/bundle budget; the last dependency audit reported zero vulnerabilities. The database release has its RLS/ACL and foreign-key-index evidence verified against the hosted project. Remaining beta evidence should add:

```text
supabase/tests/io_rls.sql
supabase/tests/io_gateway.sql
supabase/tests/io_ledger.sql
src/features/io/**/*.test.tsx
supabase/functions/_shared/io/**/*.test.ts
```

Use Vitest + React Testing Library + MSW for web contracts, Deno tests for the pure Edge core, SQL RLS matrices and Playwright smoke/accessibility flows. Introduce CI gates for typecheck, lint, build, migration replay, generated database types and Supabase advisors.

Private-beta acceptance requires:

- no cross-workspace data access in RLS matrix tests;
- deterministic policy-choice and receipt tests;
- no double charge under retries/concurrency;
- provider regular, streaming, timeout, malformed usage and tool-call conformance tests;
- key issue/revoke/scope tests;
- local OpenCode URL, permission, resume and handoff tests;
- retained human-message/unread regression coverage;
- retention/redaction/deletion tests;
- static preview values replaced or visibly labelled.

## 11. Immediate next release/code slice

Execute in this order:

1. host the separate admin application and run authenticated member/operator/negative-role browser personas without a provider call;
2. configure the attachment scanner callback and exercise clean/infected/error/retry evidence;
3. approve accountant-reviewed GST/FX/refund rules and complete Razorpay test-mode capture, duplicate webhook, partial refund and reconciliation evidence;
4. authorize and execute one discovery-first, USD 0.01-capped provider conformance run; DeepSeek additionally requires explicit China-hosted processing acknowledgement;
5. keep provider activation disabled until conformance passes **and** reviewed written onward-access authorization exists;
6. add explicit artifact sharing/handoff, provider-specific advanced-capability suites and the generalized shared Orbit shell.

No provider call or paid traffic is needed for steps 1–3. Step 4 is the only provider-billable step and requires the operator's explicit confirmation; conformance never activates a route.
