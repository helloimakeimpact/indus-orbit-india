# I/O Port code-level roadmap

Status: active implementation roadmap, 30 July 2026. It distinguishes the deployed demo proof from work required before a private or paid beta.

Related documents:

- `IO_PORT_IMPLEMENTATION_PLAN.md` — product, design and commercial direction.
- `IO_PORT_OPERATIONS_GUIDE.md` — what is actually deployed in the demo project and how to activate it safely.
- `IO_PORT_PROVIDER_INVENTORY.md` — the 20-provider research inventory and the ordered implementation gates for converting it into routable capacity.
- `CONVERSATION_SYSTEM_IMPLEMENTATION_PLAN.md` — the shared Indus Orbit conversation and Discord-like shell plan.
- `SUPABASE_SCHEMA_RECONCILIATION.md` — remote/local migration-history evidence and recovery sequence.

## 1. Current implemented proof

The demo project has an RLS-protected I/O control plane, three clearly labelled demo capacity sources, a verified-JWT `io-gateway` Edge Function, and the authenticated `/app/io` web UI.

The existing people-messaging system is also now hardened in the demo project: only accepted, non-suspended connections can insert a direct message, recipients can update only `read_at`, and new messages are capped at 4,000 characters.

The first shared-message client extraction is now in the web app as well: `src/features/conversations/` provides shared contacts, direct-conversation and event-driven unread hooks for both the full Messages route and compact quick chat. A common cache/store, cursor pagination and private Broadcast remain deliberate follow-on work in the companion plan.

| Concern                  | Current code                                                          | Truthful status                                                                                                           |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Web control room         | `src/features/io/IoOverview.tsx`                                      | Member-facing demo UI; direct local/OpenCode and partner-path selection work.                                             |
| Local terminal connector | `src/features/io/opencode.ts`                                         | Loopback-only health → session → prompt proof. It is not yet a resumable terminal timeline.                               |
| Provider gateway         | `supabase/functions/io-gateway/index.ts`                              | One secure, server-secret-backed OpenAI-compatible partner route. It is not a multi-provider router yet.                  |
| Browser data access      | `src/features/io/io.client.ts`                                        | Browser-facing I/O data access, explicitly separated from privileged Edge/RPC work.                                       |
| Control-plane schema     | `supabase/migrations/20260730155210_create_io_port_control_plane.sql` | Workspaces, memberships, sources, grants, policy records, key metadata and safe audit events.                             |
| I/O nested shell         | `src/features/io/IoWorkspaceShell.tsx`                                | Layout proof only. Static workspace, health, counts and activity are explicitly labelled preview, not live operator data. |

## 2. Non-negotiable boundaries

1. **Human conversations stay in the existing message system.** Do not duplicate `direct_messages` or mix I/O prompts into human DMs.
2. **Terminal sessions are distinct records.** I/O events, tool approvals, diffs, artifacts and handoffs belong in session tables, not in chat rows.
3. **No browser-supplied provider destination or credential.** The Edge Function selects a registered endpoint and reads its secret server-side.
4. **No paid traffic before a reserve-and-settle ledger.** UI totals are never the billing source of truth.
5. **Preview signals may not look live.** Replace static activity/health/counts before a beta, or label them as illustrative.
6. **Use the existing app shell.** Discord-like means persistent spaces, context and inspectable activity—never a copied Discord interface or vocabulary.

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

No provider key is required for P0–P5. A real provider is needed only for the final provider-conformance and activated-route tests.

## 4. P0 — contracts and trustworthy state

### 4.1 Refactor the gateway before adding providers

**Implemented and deployed in `io-gateway` version 3:** policy-independent code now lives outside the HTTP entry point:

```text
supabase/functions/_shared/io/
  auth.ts                 membership and role checks
  validation.ts           Zod request and provider-response schemas
  audit.ts                redacted, append-only audit writer
  policy.ts               pure candidate eligibility and decision types
  provider-adapter.ts     OpenAI-compatible adapter interface
  errors.ts               stable public error taxonomy
  types.ts                request, receipt and trace contracts
supabase/functions/io-gateway/index.ts  thin HTTP/CORS/action handler
```

The deployed boundary validates request shape, workspace UUIDs, modes, message limits, local loopback origin/session data and typed public errors before dispatch. It performs membership and entitlement checks separately, audits every requested/completed provider route and attempts a safe failure audit without retaining prompt/response text. It also checks audit-write errors rather than silently continuing.

Still required before any broad provider rollout: client idempotency keys, a registry-driven endpoint allowlist, capped retries, cancellation semantics, detailed timeout classification, streaming/SSE and provider-conformance tests. The current adapter remains intentionally non-streaming and supports only the one approved server-secret partner route.

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

Connect `IoWorkspaceShell` to real workspace/capacity/audit data. Static health/activity/count fixtures are now labelled preview; disabled navigation becomes a route only when its data and authorization model exist.

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

**Implemented in the demo project:** `supabase/migrations/20260731113000_create_io_provider_registry.sql` establishes the provider, model, endpoint, versioned capability and versioned price-card records. It keeps endpoint URLs, secret-manager references and conformance-run details in the non-exposed `private` schema; public tables contain only member-appropriate catalogue/evidence data and use RLS plus explicit Data API grants. `20260731123500_add_io_provider_registry_fk_indexes.sql` completes the foreign-key indexes identified by the post-deployment Performance Advisor. `20260731150000_add_io_dynamic_model_selection.sql` adds the reviewed release date and automatic-routing tier needed to select a model dynamically rather than bake a model ID into an Edge Function secret. The generated browser client types now include the public registry tables. No provider, model, endpoint, URL or credential has been seeded into this demo registry.

**Implemented in the gateway source, pending registry onboarding:** `io-gateway` accepts one server-secret provider connection but resolves its model dynamically from the registry. The default selector is `latest_affordable`: within one reviewed tier, it requires active/listed/non-deprecated models, an active member-visible endpoint, latest verified chat capability and a current published price card. It limits candidates to a configurable freshness window, keeps only those within a configurable cost multiple of the least expensive fresh candidate, then selects the newest surviving release. It records the selected model and strategy in the redacted audit event. It deliberately fails closed when the demo registry has no eligible model; it does not fall back to `IO_PARTNER_DEFAULT_MODEL`.

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

## 6. P2 — metering, INR budgets and billing

Before paid, sponsored or shared capacity, add append-only money and usage records:

```text
io_budget_limits
io_usage_reservations
io_usage_records
io_ledger_transactions
io_ledger_entries
io_credit_grants
io_fee_rule_versions
io_fx_rate_versions
io_invoice_runs
io_invoice_lines
io_payment_events
```

Store money in integer minor units (paise), not browser-formatted INR. The current `monthly_budget_inr numeric(14,2)` is acceptable as a demo display field but cannot be the billing source of truth.

The member-visible price must be derived from an immutable route receipt: usage/recovery cost plus one labelled I/O routing fee, then a separately disclosed payment/tax treatment. Do not take a hidden credit-purchase fee and a second execution mark-up for the same service.

The required invariant is **reserve → dispatch → settle once → release remainder**. Provider bills, user invoices, sponsored grants and refunds must be derivable from ledger entries, never recomputed from UI aggregates.

## 7. P3 — operator console inside existing Admin

Add I/O operations under the current admin namespace, retaining the existing role system and enforcing every action server-side:

```text
src/routes/app.admin.io.index.tsx
src/routes/app.admin.io.providers.tsx
src/routes/app.admin.io.capacity.tsx
src/routes/app.admin.io.grants.tsx
src/routes/app.admin.io.operations.tsx
src/routes/app.admin.io.ledger.tsx
src/routes/app.admin.io.retention.tsx
src/features/io/operator/
```

The console manages provider/endpoint readiness, secret-reference state, capacity source lifecycle, sponsorship terms, grants/quotas/expiry, policy review, route activation, emergency stop, failed requests, reconciliation, adjustments, retention jobs and audit export.

Hiding a route through `useAuth().isAdmin` is only presentation. RLS and Edge/RPC checks must authorize every mutation.

## 8. P4 — durable I/O Terminal

The present local OpenCode proof creates a session and returns a final response. The beta requires durable, resumable session state:

```text
io_sessions
io_session_members
io_session_events             -- per-session sequence number
io_session_approvals
io_session_artifacts
io_session_handoffs
```

New UI/routes:

```text
src/routes/app.io.sessions.tsx
src/routes/app.io.sessions.$sessionId.tsx
src/features/io/terminal/
```

Add local-server health, reconnect, session resume, event timeline, approval/reject, stop, diff/artifact display and authorized human handoff links. The web app may attach to an explicitly local, loopback-bound OpenCode instance; it must never expose an internet-listening shell or covertly proxy a member's files.

## 9. P5 — shared Discord-like system

The I/O nested shell is a useful prototype, but the lasting system belongs in the app shell so Messages, Missions, Learning and I/O gain the same spatial model. Implement the plan in `CONVERSATION_SYSTEM_IMPLEMENTATION_PLAN.md` through a shared `AppShellContext`, orbit rail, context sidebar and inspector.

The data distinction is fixed:

| Surface              | Durable source                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Human discussion     | Existing `direct_messages` and notifications; later, scope-specific conversations for I/O, Mission and Chapter collaboration |
| Agent/terminal work  | I/O session, event, approval and artifact tables                                                                             |
| Operational evidence | Route receipt, provider attempt, ledger and audit records                                                                    |
| Context              | Selected space, workspace/project/session and permitted membership                                                           |
| Inspector            | People, files/diff, approvals, route evidence and cost                                                                       |

## 10. P6 — privacy, testing and release gates

Add a dedicated retention/security migration plus test suites:

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

## 11. Immediate next code slice

Build P0 in this order:

1. **Implemented and deployed:** introduce I/O contracts and pure gateway modules;
2. **Implemented:** rename the browser I/O data module and add active-workspace context/switching;
3. **Implemented in demo:** create and test atomic workspace creation;
4. make `/app/io` shell values real or explicitly preview-only;
5. add the conversation security and shared-query work from the companion plan.

This creates the foundation for provider onboarding without making provider credentials or paid traffic a dependency.
