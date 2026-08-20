# OpenRouter capability and capacity plan for I/O Port

Status: researched capability gap and adoption decision, updated 20 August 2026. Official OpenRouter documentation, pricing, OAuth and current terms were rechecked on this date.

## 20 August commercial and browser-key correction

- OpenRouter's current FAQ describes provider inference price pass-through and a 5.5% fee, subject to a minimum, when credits are purchased. I/O's owner-approved 5.5% therefore has the same headline rate; the I/O difference is a separately recorded fee on settled provider usage, not a claim of undercutting a larger OpenRouter inference markup.
- OpenRouter OAuth PKCE can issue a user-controlled OpenRouter key to a browser-oriented application. This is not an upstream provider key and the documented bearer-key controls are not an origin-bound security boundary. I/O persistent keys remain server/CLI/local-agent only; browser web access uses the signed-in JWT gateway.
- OpenRouter's current standard terms prohibit using the service to resell API access or build a competing service. Its current enterprise terms allow product functionality for end customers but remain non-sublicensable and restrict rent/resale/third-party access. Consequently OpenRouter must not be added as a raw I/O upstream without bespoke written authorization.
- The 20 August database release encodes that rule generally: a provider cannot become endpoint-eligible or routing-enabled until `resale_authorized=true` is backed by reviewed evidence.

Sources: [FAQ](https://openrouter.ai/docs/faq), [OAuth PKCE](https://openrouter.ai/docs/guides/overview/auth/oauth), [API keys](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys), [standard terms](https://openrouter.ai/terms), [enterprise terms](https://openrouter.ai/terms-of-service-enterprise). Full first-provider evidence is in `PRODUCTION_API_COMMERCIAL_AND_PROVIDER_POLICY.md`.

## The important distinction

“OpenRouter-like” can mean two different things:

1. **Router capability:** one normalized API, model/provider catalogue, policy filters, dynamic selection, fallbacks, usage and observability.
2. **Router capacity:** access to an aggregator’s commercial provider accounts and settlement system.

I/O Port currently owns a partial router capability. It does not consume OpenRouter shared capacity. The live registry contains five direct provider/model/endpoint connections and three capacity sources/grants; these records and configured secret names remain non-routable until operator validation, conformance and spend approval.

OpenRouter’s official quickstart describes a unified API across hundreds of models with fallback and cost-aware selection. Its provider-routing controls include order/allow/ignore lists, fallbacks, required-parameter filtering, data-collection and ZDR filters, quantization, maximum price, latency and throughput preferences. Its BYOK system prioritizes member/provider keys and may fall back to shared OpenRouter capacity. Its model fallback, auto-router, workspace, presets and optional router-metadata surfaces fill out a mature gateway baseline.

Official references:

- [OpenRouter quickstart](https://openrouter.ai/docs/quickstart)
- [Provider selection](https://openrouter.ai/docs/guides/routing/provider-selection)
- [Model fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks)
- [Auto Router](https://openrouter.ai/docs/guides/routing/routers/auto-router)
- [BYOK](https://openrouter.ai/docs/guides/overview/auth/byok)
- [Models API and capability metadata](https://openrouter.ai/docs/guides/overview/models)
- [Router metadata](https://openrouter.ai/docs/guides/features/router-metadata)
- [Workspaces](https://openrouter.ai/docs/guides/features/workspaces/overview)
- [Presets](https://openrouter.ai/docs/guides/features/presets)

These links describe OpenRouter; they are not evidence that I/O Port already provides the feature.

## Capability comparison

| Capability expected from an advanced router | I/O Port now                                                                                                                                                                      | Completion required                                                                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unified OpenAI-compatible public API        | Partial: Released external `/v1/models` and strict non-streaming `/v1/chat/completions`, with scoped hash-only test keys, rate limits, idempotency and shared accounting/receipts | Add SSE, Responses, tools/structured output only after conformance, SDK examples, production quotas and compatibility/load tests.                                                    |
| Dynamic model catalogue                     | Partial: governed five-model registry                                                                                                                                             | Build operator sync/review workflow, aliases and deprecations; never copy unreviewed upstream facts directly into member-visible truth.                                              |
| Multiple provider endpoints per model       | Schema supports it; cohort is one endpoint/model                                                                                                                                  | Add provider-endpoint discovery, verified capability/version records, health, region, data terms and deterministic endpoint choice.                                                  |
| Automatic model selection                   | Partial: latest-affordable, lowest-cost and explicit reviewed model                                                                                                               | Add task/capability classification, quality evidence, allowed pools, stickiness, user policy and explanation. Preserve an explicit-model path.                                       |
| Provider ordering and allow/deny            | Planned                                                                                                                                                                           | Version route policy with per-workspace/provider allow/deny/order, capacity class, origin, region and data-handling filters.                                                         |
| Automatic fallback                          | Partial: bounded fallback on selected safe failures                                                                                                                               | Formalize error taxonomy, fallback classes, retry budget, per-attempt overrides, quality/data/cost boundaries, idempotency and cancellation.                                         |
| Price routing and max-price ceiling         | Partial static published price comparison                                                                                                                                         | Add cached-input/media/request units, provider fees, current effective prices, FX, maximum request budget and actual settlement.                                                     |
| Latency/throughput/availability routing     | Not implemented                                                                                                                                                                   | Collect rolling endpoint health and performance percentiles with sample confidence; add circuit breakers and user policy.                                                            |
| Parameter/capability compatibility          | Partial chat flag and two adapter families                                                                                                                                        | Record tools, structured output, media, reasoning, streaming and sampling support by endpoint version; require parameters before selection.                                          |
| Data collection/ZDR/residency policy        | Schema fields, mostly unknown                                                                                                                                                     | Collect contractual evidence; hard-filter by member/workspace policy; distinguish storage, transit, serving and training.                                                            |
| Quantization/hardware variants              | Not implemented                                                                                                                                                                   | Add endpoint precision/quantization/hardware metadata for open models with quality evidence and explicit user disclosure.                                                            |
| BYOK                                        | Not implemented for members                                                                                                                                                       | Add encrypted member/workspace connection lifecycle, least-privileged use, validation, rotation, deletion, quota and no-fallback option. Never return keys to browser after storage. |
| Shared pooled capacity                      | Not implemented                                                                                                                                                                   | Contract with direct providers and/or add OpenRouter as one aggregator connection; define merchant, tax, credits, reconciliation and support obligations.                            |
| Owned/rented inference                      | Not implemented                                                                                                                                                                   | Provision serving stack, model licensing, autoscaling, queue, observability, patching, evaluation and incident ownership.                                                            |
| Sponsored/donated capacity                  | Demo source only                                                                                                                                                                  | Add donor consent/contract, agent identity, attestation, workload policy, isolation, health, revocation, scheduling, provenance and impact accounting.                               |
| Workspaces, virtual keys and limits         | Workspace schema exists; no issued gateway keys                                                                                                                                   | Add projects/environments, hashed key issuance, scoped permissions, quotas, rotation/revocation, per-key analytics and audit.                                                        |
| Presets/policies                            | Route-policy record foundation                                                                                                                                                    | Version provider/model/data/budget/fallback/parameter presets with preview, approval and immutable request snapshot.                                                                 |
| Guardrails and transforms                   | Not implemented                                                                                                                                                                   | Define opt-in/out safety pipeline, content handling, prompt-injection policy, context overflow behavior and clear receipt disclosure.                                                |
| Usage and router metadata                   | Partial redacted receipt/attempt records                                                                                                                                          | Return a member-safe receipt and operator trace with candidate, attempt, latency, route versions, usage, cost, fallback and policy stages.                                           |
| Credits, wallet and invoices                | Not implemented                                                                                                                                                                   | Build integer-unit double-entry ledger, reservations, settlement, adjustments, sponsorship expiry, GST/tax review, invoices and reconciliation.                                      |
| Observability and exports                   | Safe audit cards and records are partial                                                                                                                                          | Add request/correlation lookup, dashboards, SLOs, alerting, spend/usage exports, redaction controls and provider status.                                                             |

## How OpenRouter can be used without making I/O Port dependent on it

OpenRouter should be an optional `aggregator_api` capacity source, not the definition of I/O Port.

```text
Member/API/Terminal
  -> I/O policy, entitlement and budget
  -> I/O route candidates
       -> direct provider connection
       -> OpenRouter shared or BYOK connection
       -> Indian partner connection
       -> I/O-owned/rented endpoint
       -> sponsored/donated endpoint
       -> local OpenCode/local model
  -> normalized result + I/O route receipt
```

An OpenRouter connection would use a distinct secret such as `IO_PROVIDER_OPENROUTER_API_KEY`, an OpenAI-compatible base URL, a provider record with `provider_kind = aggregator`, and model mappings reviewed against OpenRouter’s Models API. This must not be added until an account/key and commercial authorization are available.

For every OpenRouter-backed response, I/O should capture the final upstream model and provider/attempt metadata where the contract exposes it. The member receipt must distinguish `I/O -> OpenRouter -> downstream provider` from `I/O -> direct provider`; otherwise capacity provenance becomes misleading.

## Capacity portfolio target

| Capacity lane                       | Why it exists                                                                   | V1 decision                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Direct founder/operator keys        | Fast controlled conformance and direct relationship                             | Stage now; activate individually after approval and hard budgets.                              |
| OpenRouter or comparable aggregator | Breadth, fallback and temporary coverage                                        | Optional partnership lane; useful for breadth but never sole upstream.                         |
| Indian providers/partners           | Language, speech, documents, India-specific policy and commercial relationships | Prioritize contracts and endpoint evidence; do not infer residency from provider identity.     |
| I/O-owned or rented servers         | Control, open models, predictable workloads and potential India serving         | Pilot after demand/economics evaluation and an operations owner.                               |
| Institutionally sponsored capacity  | Equitable access and public-interest programmes                                 | Add only with funding terms, quotas, workload policy and measurable impact.                    |
| Member/community donated capacity   | Voluntary capacity commons                                                      | Later experimental lane for non-sensitive best-effort work after isolation and trust controls. |
| Member BYOK/private endpoints       | Customer control and reduced pooled-credit risk                                 | High-priority business feature after secure connection management.                             |

## What “latest and affordable” must become

The current selector uses reviewed release date, route tier, price and a configurable freshness/affordability band. The production policy must perform hard filters before scoring:

1. workspace entitlement and key/capacity ownership;
2. requested capabilities and context;
3. allowed model origin, serving region, retention/training and workload class;
4. provider/model lifecycle and conformance;
5. health, latency and rate-limit state;
6. request and period budget;
7. quality/evaluation floor;
8. only then recency, estimated price, latency and preference scoring.

The selected route, rejected candidate reasons, fallback class and policy versions must be explainable. “Latest” is not automatically best, and “affordable” is not only token list price.

## Activation sequence

1. Keep all current providers non-routable while fixture-based adapter and SQL authorization tests are added.
2. Add operator conformance workflow and strict state transitions.
3. Add idempotency, workspace maximum cost, per-provider kill switch and actual usage recording.
4. Run one bounded live conformance call per direct provider only with explicit spend approval.
5. Activate one low-risk provider for one demo workspace; verify receipts, errors and cost.
6. Add OpenRouter as an optional sixth provider only after account, secret, data/commercial review and downstream-metadata proof.
7. Add member BYOK, then Indian partnerships, then owned/sponsored capacity pilots.
8. Implement wallet/ledger only after commercial, tax, payment and reconciliation decisions are signed.
