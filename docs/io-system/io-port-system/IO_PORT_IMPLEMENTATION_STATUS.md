# I/O Port implementation status and multi-provider readiness

Status: local code, UI, and deployed-database assessment, updated 1 August 2026.

This is the operational source of truth for the current I/O Port implementation. It separates what exists from what is only represented in a plan or preview. Cross-product dependencies and release gates are governed by `../../MASTER_IMPLEMENTATION_AND_RELEASE_PLAN.md` and `../../RELEASE_READINESS_CHECKLIST.md`. Product direction remains in `IO_PORT_IMPLEMENTATION_PLAN.md`; the detailed delivery sequence remains in `IO_PORT_CODE_LEVEL_ROADMAP.md`; the OpenRouter comparison is in `OPENROUTER_CAPABILITY_AND_CAPACITY_PLAN.md`.

## 1. Executive verdict

I/O Port is **not operationally routing external provider traffic yet**, but its multi-provider foundation is now deployed to the demo project. The route-receipt/resolver migration, five-provider seed and `io-gateway` v17 are live. OpenAI, SpaceXAI/xAI, Gemini, DeepSeek and Groq are staged with separate private connection records and secret references. Every connection remains `testing`, every capability proof remains `draft`, and every provider/endpoint remains in `conformance`, so the resolver returns zero ready routes.

The deployed gateway resolves approved registry connections through a service-role-only resolver, allows only approved `IO_PROVIDER_*_API_KEY` secret references, evaluates entitled candidates across providers, supports provider-aware OpenAI-compatible and Gemini-native request adapters, performs bounded fallback for safe upstream failures, and writes a redacted route receipt plus per-provider attempts. The browser can request latest-affordable, lowest-cost, or an approved explicit model and display the completed receipt. None of this by itself activates a provider or sends traffic.

Provider API keys by themselves do not make a provider routable. The verified deployed cohort counts are:

| Deployed record                        | Count |
| -------------------------------------- | ----: |
| staged direct `io_providers`           |     5 |
| staged `io_models`                     |     5 |
| staged `io_model_endpoints`            |     5 |
| draft capability versions              |     5 |
| published evidence-backed price cards  |     5 |
| testing endpoint connections           |     5 |
| `private.io_provider_conformance_runs` |     0 |
| ready resolver results                 |     0 |
| `io_route_receipts`                    |     0 |
| `io_provider_attempts`                 |     0 |
| `io_route_policies`                    |     0 |
| `io_audit_events`                      |     0 |

The demo deployment contains metadata and secret references, not key values. No provider completion or billable conformance call was made. The remaining work is no-cost contract testing, trusted operator/conformance workflow, deliberately approved bounded live tests, individual provider activation, idempotency/health/budget controls, billing ledger, OpenRouter/other capacity partnerships and a fuller live control room.

## 2. What “I/O Port” must mean

A port is not one provider hidden behind one endpoint. It is a governed exchange with multiple possible capacity sources:

```mermaid
flowchart LR
  U["Member, team, app, or terminal"] --> P["I/O policy and budget boundary"]
  P --> R["Multi-provider route decision"]
  R --> A["Direct provider APIs"]
  R --> B["I/O-rented or owned capacity"]
  R --> C["Member BYOK connections"]
  R --> D["Opt-in sponsored or donated capacity"]
  R --> L["Local OpenCode or local model"]
  A --> E["Normalized answer and route receipt"]
  B --> E
  C --> E
  D --> E
  L --> E
```

The member must be able to understand which model, provider, serving region, data policy, capacity class, price card, and fallback rule applied. “Latest and affordable” is one selection strategy inside this larger policy boundary; it is not the whole router.

## 3. Implemented and verified

### 3.1 Product and UI foundation

- Public `/io-port` accurately describes the gateway and control room as private beta and the terminal as next. It does not claim that providers or public capacity are live.
- Authenticated `/app/io` exists inside the existing Indus Orbit shell and keeps the visual language indigo, parchment, saffron, and people-centred.
- The working overview can create/select a workspace, display entitled capacity sources and safe audit events, select Observe/Plan/Build/Run, and choose between local OpenCode and a provider-partnership path.
- The provider path calls a safe catalogue action and presents `Latest + affordable`, `Lowest cost`, and an explicit reviewed-model selector. It remains disabled until the gateway returns an entitled reviewed route.
- The nested I/O shell provides the intended context navigation and activity-inspector geometry. Its static counts, health, workspace label, and activity cards are visibly labelled preview.

### 3.2 Supabase control plane

- RLS-protected workspaces, memberships, projects, environments, capacity sources, workspace grants, route-policy records, API-key metadata, and append-only audit-event foundations exist.
- Personal workspace creation is an authenticated atomic RPC instead of a browser-controlled multi-table write.
- Capacity provenance distinguishes local/owned, partner, and sponsored sources.
- Provider, model, endpoint, versioned capability, and versioned pricing tables exist.
- Endpoint connection details and conformance runs are kept in the private schema rather than exposed through the browser Data API.
- The dynamic-model migration adds reviewed release dates and `economy`/`balanced`/`premium` automatic-route tiers.

### 3.3 Deployed gateway foundation

- `io-gateway` verifies a user token, active workspace membership, active capacity entitlement, request shape, message limits, and CORS origin.
- Provider credentials remain server-side.
- Requests and outcomes write redacted audit metadata without prompt or response text.
- The selector fails closed unless an entitled provider, model, endpoint, verified chat capability, active capacity source, and effective member-visible price card are eligible.
- It supports `latest_affordable`, `lowest_cost`, and an explicit reviewed model. Automatic selection has a configurable tier, freshness window and affordability band; mixed currencies fail closed until reviewed FX conversion exists.
- An approved connection can resolve only an allowlisted `IO_PROVIDER_*_API_KEY` secret name. The browser receives neither endpoint URL nor credential.
- The adapter currently normalizes non-streaming OpenAI-compatible Chat Completions and Gemini native `generateContent`; it validates response shapes and normalizes token use and a safe provider request ID.
- The deployed forward-only migration introduces append-only `io_route_receipts` and `io_provider_attempts`. They exclude prompts, generated text, credentials, headers and raw upstream errors.
- A follow-up migration covers every receipt/attempt provider, model, endpoint and capacity foreign key used for operator history and reconciliation; the Performance Advisor reports no remaining unindexed foreign key in the new I/O evidence tables.

### 3.4 Local terminal and conversation foundation

- The browser can connect only to a credential-free loopback OpenCode origin over HTTP; an optional OpenCode password is held in memory.
- The proof performs OpenCode health, session creation, prompt delivery, and safe completion audit by session ID.
- Existing direct messages remain the human conversation source. I/O prompts and terminal work are not inserted into `direct_messages`.
- Direct-message RLS/read permissions were hardened, and both the full Messages surface and compact chat now reuse shared hooks and event-driven unread reconciliation.

### 3.5 Repository verification

| Check                                  | Result          | Interpretation                                                                             |
| -------------------------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| `npm run build`                        | Pass            | The current web application produces a production bundle.                                  |
| `npm run typecheck`                    | Pass            | Current browser/server TypeScript compiles.                                                |
| `npm run format:check`                 | Pass            | Mechanical formatting drift has been removed.                                              |
| `npm run test:unit`                    | Pass — 9/9      | Browser config, route selection and five-provider request-shape fixtures have coverage.    |
| `npm run audit:high`                   | Pass            | No critical, high or moderate dependency advisory remains.                                 |
| I/O-focused ESLint run                 | Pass            | `src/features/io` and I/O routes pass current lint rules.                                  |
| Repository-wide `npm run lint --quiet` | Pass — 0 errors | The local semantic lint gate now passes across the repository.                             |
| Automated I/O router tests             | 6/6 pass        | Four selection tests plus OpenAI/xAI/DeepSeek/Groq and Gemini request-contract tests pass. |
| Provider conformance tests             | None recorded   | No provider is operationally certified.                                                    |

## 4. Implemented, but requires improvement

| Area                      | What exists                                                                                                | Why it is insufficient                                                                                                       | Required improvement                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Provider connection       | Five deployed private connection records use distinct provider-specific secret references                  | All remain testing and no conformance result exists                                                                          | Add audited conformance workflow, then activate one approved connection at a time                         |
| Dynamic model selection   | Local source compares entitled, priced candidates across connections                                       | It does not yet apply formal route-policy versions, health, latency, budget, FX, cached pricing, or user policy              | Add hard policy filters and versioned scoring inputs before activation                                    |
| Provider registry         | Sound public/private schema split plus five staged providers/models/endpoints/prices/connections           | The seed is operator-reviewed inventory, not automated onboarding or live availability                                       | Add operator onboarding, evidence refresh, deprecation and lifecycle workflows                            |
| Provider adapter          | Local source has OpenAI-compatible and Gemini-native non-streaming adapters                                | No streaming, tools, structured output, multimodal, cancellation, or conformance matrix                                      | Add tested adapter capabilities one provider at a time                                                    |
| Request validation        | Strict request and normalized response validation                                                          | Streaming frames and provider-specific error schemas are not versioned                                                       | Add schemas and contract tests for each supported feature                                                 |
| Reliability               | 45-second timeout, rate-limit classification, bounded ordered fallback and attempt records                 | No idempotency, circuit breaker, health sampling, retry budget, queue state, or cancellation                                 | Add these controls before beta traffic                                                                    |
| Audit                     | Deployed migration defines immutable receipts and per-provider attempts                                    | No live route has produced one; policy/health/budget snapshots remain incomplete                                             | Add SQL/RLS tests, then verify a bounded conformance receipt and reconcile with the eventual ledger       |
| Cost estimate             | Character-count token approximation and input/output list price                                            | This is not billing and ignores cached input, tools/media, provider-specific units, FX, fee, tax, and actual settlement      | Add versioned estimation plus reserve-and-settle ledger in integer minor units                            |
| Capacity truth            | Three labelled demo sources and grants                                                                     | The generic partner/sponsored demo records currently carry `IN` region/residency metadata without provider-specific evidence | Change unknown facts to unknown; attach India claims only to a certified endpoint and evidence version    |
| Auth runtime              | JWT check with legacy anon/service-role environment variables                                              | It works, but newer publishable/secret key rotation and narrower privileged access should be planned                         | Move to current Supabase key conventions and keep admin client use inside the smallest possible functions |
| Web control room          | Workspace, terminal, route-strategy picker, approved-model picker, receipt facts, capacity and audit cards | No pre-run cost, candidate explanation, health, budget, usage or operator inspector                                          | Add authorised live route/usage/health APIs after the control plane is verified                           |
| Local OpenCode            | One browser-local run and safe audit                                                                       | No resume, timeline, tool/approval view, diff, artifacts, task tree, attach/detach, or recovery                              | Add durable I/O session metadata while keeping local content local unless explicitly shared               |
| Conversation client       | Shared hooks and better DM RLS                                                                             | Separate hook instances, no cursor paging, no common store, no private Broadcast, no I/O workspace conversations             | Complete the shared store/RPC/realtime plan before adding group collaboration                             |
| Operational documentation | Plans and provider inventory exist                                                                         | Earlier secret guidance could be read as multi-provider activation, which is incorrect                                       | Treat this document and the corrected operating guide as the current source of truth                      |

## 5. Entirely left to implement

### 5.1 Multi-provider route transaction

The following production transaction does not exist yet:

1. accept an idempotent normalized request with workspace, project, policy, capability, quality, budget, data, origin, and fallback constraints;
2. load all active, entitled, contractually approved connections;
3. hard-filter by capacity class, model origin, serving region, retention/training class, capability, context, model lifecycle, budget, and provider health;
4. snapshot the exact policy, registry, capability, health, and price versions;
5. estimate each remaining candidate and select deterministically;
6. reserve the maximum allowed budget;
7. dispatch one recorded provider attempt;
8. retry only when safe and fall back only within the member-approved fallback class;
9. normalize content, usage, provider request reference, and error;
10. settle actual usage, release unused reserve, and emit an immutable route receipt;
11. return the answer plus receipt ID, selected model revision, provider/capacity disclosure, cost, region/retention disclosure, and fallback outcome.

### 5.2 Missing durable records

At minimum, production routing still needs:

```text
io_route_definitions
io_endpoint_health_samples
io_idempotency_records
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

Durable terminal work still needs `io_sessions`, session members, events, approvals, artifacts, tasks, handoffs, and retention controls. Long-running agent execution must not be placed inside a Supabase Edge Function.

### 5.3 Missing operational surfaces

- operator provider/connection/model/endpoint/evidence/price onboarding;
- conformance runner and signed review/activation flow;
- live provider and endpoint health/status page;
- member policy, provider/model, BYOK, budget, and fallback controls;
- pre-run estimate and post-run route receipt;
- usage, credits, invoice, export, and reconciliation views;
- on-call dashboards, alerts, SLOs, incident playbooks, key rotation, and provider kill switches;
- API/CLI contracts, versioning, rate limits, API key issuance, and SDK documentation.

## 6. The API keys already added

Do not paste or commit any key. Keep each provider under a unique Supabase Edge Function secret name.

The deployed registry/gateway contract uses one unique secret per provider:

```text
IO_PROVIDER_OPENAI_API_KEY
IO_PROVIDER_XAI_API_KEY
IO_PROVIDER_GEMINI_API_KEY
IO_PROVIDER_DEEPSEEK_API_KEY
IO_PROVIDER_GROQ_API_KEY
IO_PROVIDER_SARVAM_API_KEY       # only after partnership/conformance
IO_PROVIDER_OPENROUTER_API_KEY   # only if OpenRouter capacity is contracted
```

The first five names exist in the Supabase Edge Function secret store. Their values were not read, copied or exposed during registry deployment. Additional provider and owned-capacity secrets follow the same unique-name rule. Canonical endpoint URLs, provider identity, account scope, and the secret **name** belong in `private.io_endpoint_connections`; the secret value remains only in the Edge Function secret store.

The deployed gateway reads a provider-specific value only after the service-role-only registry resolver approves its connection and the reference matches `IO_PROVIDER_[A-Z0-9_]+_API_KEY`. The current five rows use the five exact first-cohort names above, but they remain testing and therefore resolve to no route.

Legacy `IO_PARTNER_BASE_URL`, `IO_PARTNER_API_KEY` and `IO_PARTNER_PROVIDER_KEY` values, if still present, are no longer the current multi-provider contract. Do not overwrite one legacy name repeatedly to add providers.

GitHub repository secrets are not used by the current runtime because this repository has no workflow that synchronizes them into Supabase. Production provider credentials belong in Supabase Edge Function secrets unless a narrowly scoped deployment workflow is deliberately added later.

The credential resolver must not accept an arbitrary environment-variable name from a browser request. Only operator-approved connection rows, restricted secret-name patterns, and allowlisted adapter types may cause a secret lookup.

## 7. First useful provider cohort

The keys already available make a practical engineering cohort, not an India-residency cohort:

| Lane                                       | Initial connection                              | Purpose                                                       | Mandatory disclosure                                                          |
| ------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Global commercial                          | OpenAI                                          | Baseline quality/tool/structured-output adapter               | Actual endpoint terms, serving/data policy, price version                     |
| Global commercial                          | xAI                                             | Independent provider and failure-domain comparison            | Same, without implying India residency                                        |
| Global commercial                          | Gemini                                          | Native adapter/conformance path                               | Same, with exact model and API surface                                        |
| Global commercial / model-origin-sensitive | DeepSeek                                        | Affordable model/provider comparison only when policy permits | Model origin, provider, serving region, retention, and explicit opt-in policy |
| Local                                      | OpenCode and later approved local models        | Device-local agent and coding route                           | What remains local and what audit metadata is shared                          |
| India direct/capacity                      | Sarvam plus an approved Indian capacity partner | India-language, economic, and placement lane                  | Written region, retention, commercial/resale, support, and price evidence     |

No global connection may satisfy an `india-only` policy merely because the Supabase control plane is in Mumbai. The inference endpoint's verified serving and data-processing facts govern the route.

## 8. Required router architecture

### 8.1 Connection resolution

Implemented locally in `20260801003835_io_route_receipts_and_registry_router.sql`: a restricted service-role-only resolver returns eligible connection records:

```text
provider_id
endpoint_id
adapter_kind
base_url
secret_reference
account_scope
connection_state
conformance_state
last_verified_at
```

The gateway resolves `secret_reference` only after the connection and endpoint pass operator activation, conformance, entitlement, and policy checks.

### 8.2 Adapter interface

The first stable interface should cover:

```text
discoverModels()
createChat()
streamChat()
cancel()
normalizeUsage()
normalizeError()
healthCheck()
```

Each adapter publishes tested capabilities rather than claiming universal compatibility. Begin with an OpenAI-compatible adapter family and a Gemini-native adapter. Add modality-specific adapters only after chat routing is reliable.

### 8.3 Candidate evaluation

Hard constraints are boolean and run before scoring:

```text
membership and entitlement
capacity class and BYOK ownership
serving region and retention/training policy
model origin and licence policy
required capabilities and context
model/endpoint lifecycle
maximum estimated cost
connection/conformance state
circuit and health state
```

Only eligible candidates are scored. Score weights must be policy-versioned and explainable. Recommended dimensions are expected quality for the request class, price, recent latency, recent success rate, freshness, and India/partnership preference. Reliability and policy are never silently traded for a lower price.

### 8.4 Fallback and safety

- A retry is the same endpoint and is permitted only for a classified transient failure and an idempotent request.
- A fallback changes endpoint/provider and must be listed in the policy and route receipt.
- India-only, local-only, BYOK-only, no-retention, or model-origin exclusions survive every fallback.
- Circuit breakers stop sending traffic to a degraded endpoint.
- Per-workspace and per-provider rate limits prevent one tenant from exhausting shared capacity.
- Provider request identifiers are stored safely for reconciliation; raw provider errors and secrets are never returned to the browser.

## 9. Ordered implementation phases and exit criteria

### Phase A — truthful state and credential contract

**Deployment progress:** items 1 and 3 are deployed. Five connections coexist safely, but the exit criterion remains open until diagnostics and conformance workflow exist.

1. Preserve provider-specific secrets and stop treating `IO_PARTNER_*` as the target contract. Deployed code accepts only restricted `IO_PROVIDER_*_API_KEY` references from approved connection rows.
2. Correct generic demo residency/region fields to unknown until endpoint evidence exists.
3. Add a server-only connection resolver with a strict secret-reference allowlist.
4. Add current-state/admin diagnostics that report configured connection names and states, never secret values.

Exit: four provider connections can coexist in private records without any being member-routable.

### Phase B — conformance and provider activation

**Local source progress:** item 1 is implemented for non-streaming chat; no conformance result exists.

1. Implement normalized OpenAI-compatible and Gemini-native adapters.
2. Build recorded tests for model discovery, non-streaming/streaming, cancellation, tools/structured output where advertised, usage, 401/403/429/5xx/timeout mapping, and provider request IDs.
3. Record exact model revisions, capabilities, serving/retention evidence, and effective prices.
4. Require operator review before activation.

Exit: each activated endpoint has a passing conformance run and immutable evidence/price versions.

### Phase C — multi-provider router and receipts

**Local source progress:** receipts/attempts, registry candidate loading, deterministic selection, bounded failure fallback, normalized errors, receipt response and web display are implemented. Route definitions, idempotency, health/circuit state, policy snapshots and a full policy engine remain open.

1. Add named route definitions, idempotency records, health samples, receipts, and attempts. Receipts/attempts are in the new local migration.
2. Replace `readPartnerConfig()` with registry candidate loading across providers. Implemented locally.
3. Apply policy hard filters, then dynamic score/selection. Entitlement, lifecycle, capability, context, tier and price filters plus deterministic selection are local; broader policy filters remain.
4. Add bounded retry, approved fallback, circuit breakers, and normalized errors. Ordered fallback and normalized errors are local; retries/circuit breakers need policy/idempotency.
5. Return and display route receipt IDs. Implemented locally.

Exit: one request can deterministically choose among at least three providers, survive a simulated provider failure without violating policy, and explain the decision.

### Phase D — member web UI and API

**Local source progress:** items 1 and the completed-route part of item 3 are implemented; they depend on the new gateway/catalogue to become live.

1. Replace the generic Provider partnership button with policy-first Auto route plus explicit model/provider choices.
2. Show model origin, provider, serving region, retention, capacity class, capability, current price version, health, and estimated range before execution.
3. Show selected route, attempts/fallbacks, actual usage, and receipt after execution.
4. Connect the context sidebar and inspector to live authorized data; remove preview fixtures as their real counterparts land.
5. Publish a versioned OpenAI-compatible I/O API only after the same policy and receipt path is used by the web UI.

Exit: a member can make an informed choice and inspect the result without operator/database access.

### Phase E — budgets, pricing, and capacity classes

1. Implement reserve-and-settle in paise with versioned upstream price, FX, I/O fee, credits, and tax lines.
2. Add BYOK ownership and isolation.
3. Add I/O-rented/owned capacity metering and opt-in sponsored/donated grants.
4. Reconcile sample I/O receipts against provider invoices before paid beta.

Exit: no paid or sponsored dispatch can occur without a reservation, settlement, and balanced ledger transaction.

### Phase F — terminal, conversations, and beta operations

1. Add durable terminal session metadata, resume/attach, tool and approval timeline, diff/artifact/task views, and explicit sharing.
2. Complete the shared conversation store, cursor paging, RPC send/read boundary, and private Realtime Broadcast.
3. Add I/O workspace conversations and session handoffs without copying private terminal content into human messages.
4. Add automated unit, integration, RLS, adapter-contract, router-failure, ledger-property, load, and end-to-end tests.
5. Establish SLOs, alerts, runbooks, key rotation, incident response, provider kill switches, backups, and external security review.

Exit: a capped private cohort can operate under measured reliability, spend, privacy, and support controls.

## 10. Immediate next code slice

The highest-leverage next slice is **Phase A plus the schema half of Phase C**:

1. migrate route definitions, idempotency records, receipts, attempts, and health samples;
2. formalize the private connection record and secret-reference restriction;
3. implement provider-specific credential resolution without dispatching traffic;
4. seed reviewed provider/model/endpoint records for the four available global keys, with region/retention left unverified until evidence is recorded;
5. implement conformance-only adapter calls;
6. add unit/integration tests for candidate filtering, secret isolation, response validation, and fallback invariants.

This turns the added keys into safe, simultaneous connections and creates the base on which the UI, pricing ledger, partnerships, and public API can honestly proceed.

## 11. Verification basis and limits

This assessment used the local source, migration history, build/type/lint checks, the running public `/io-port` page, and read-only inspection of the connected Supabase project, its tables, migrations, and Edge Functions.

The connected Supabase tools do not expose Edge Function secret names or values. Consequently this audit confirms what names the code reads and what provider records exist, but it cannot confirm which provider-specific secrets the operator added. No secret should be copied into an issue, chat, document, log, table, or repository to overcome that limitation.

The authenticated `/app/io` page redirected to invitation-only access in the available browser session, so its live member data was not exercised. Its routes, components, data client, and gateway calls were inspected directly, and the I/O-focused code passed build/type/lint verification. No database row, secret, Edge Function, or production configuration was changed during this assessment.
