# I/O Port: 20-provider implementation inventory

Status: operator research inventory and next-phase implementation plan, updated 1 August 2026. Current deployed readiness and the corrected multi-provider architecture are tracked in `IO_PORT_IMPLEMENTATION_STATUS.md`.

This is an **evaluation inventory**, not a public model catalogue and not an activation list. Five direct providers now have one staged model, endpoint, testing connection, draft capability certificate and published evidence-backed price card in the demo registry, but no external provider is routable and no conformance run exists. The other inventory entries remain research only. A secret is credential material, not activation evidence. Prices, model lists, limits and deployment regions change often; a linked provider page is evidence for research, not a substitute for a signed agreement or an immutable I/O price card.

## 1. How to read the inventory

I/O Port is India-first, not India-only by assertion. Each eventual route must make these facts visible to the member:

1. the exact model revision and its licence/provenance;
2. the physical/contractual serving region, not a provider's headquarters;
3. data retention/training terms and the version of evidence behind them;
4. capacity class: direct partner, member BYOK, I/O-rented/owned, or opt-in donated commons;
5. the versioned execution price, I/O fee, FX treatment and tax treatment.

`Research` below means that the public interface and commercial signal are useful enough to investigate. `Conformance first` means the adapter must prove the stated features before any user traffic. `Partnership first` means no self-serve I/O integration should be promised. **All 20 entries are presently in Research status.** OpenAI, xAI, Gemini and DeepSeek keys can form a first global engineering/conformance cohort, but they do not replace the India direct/capacity cohort and must not be labelled India-resident without endpoint evidence.

### Model-origin guardrail

The inventory contains examples from multiple model creators, including Chinese-origin model families such as Qwen, DeepSeek and GLM where a provider publicly offers them. This does **not** enable those models or send data to China. Model-origin, provider legal entity, serving region and subprocessor region are four different facts. Every model revision will carry origin and licence metadata; every endpoint will carry verified physical/contractual-region and retention metadata. A member's India-only, India-preferred, global, BYOK and model-origin choices are evaluated before dispatch, and a policy must never silently relax them.

## 2. Inventory snapshot

| #   | Provider and capacity class                                                                                                                | Current public implementation signal                                                                                                              | Relevant model examples for I/O evaluation                                                                              | Current public commercial / operating signal                                                                                                                                                                                              | Initial I/O status                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [Sarvam AI](https://docs.sarvam.ai/api-reference/authentication) — direct Indian API partner                                               | OpenAI-compatible chat/streaming direction and Indian-language focus.                                                                             | Sarvam-30B, Sarvam-105B; language, voice and document capabilities should be separately certified.                      | Sarvam-30B: ₹2.5 input / ₹1.5 cached input / ₹10 output per million tokens; 105B: ₹4 / ₹2.5 / ₹16. Published plans include 60, 200 and 1,000 RPM tiers. [Pricing](https://docs.sarvam.ai/api/getting-started/pricing)                     | **First conformance candidate.** Obtain written hosting/resale, India placement, retention/no-training and support terms.             |
| 2   | [E2E TIR](https://docs.e2enetworks.com/docs/tir/Inference/ModelEndpoints/QuickStartGuide/) — I/O-rented or owned Indian fleet              | Documents OpenAI-compatible endpoints plus vLLM, SGLang, Triton and custom containers; autoscaling can reach zero.                                | I/O-approved open weights: GPT-OSS, Llama, Mistral, Gemma, IndicTrans2 or Patram, subject to per-weight licence review. | Public GPU page lists example hourly cards including L4 ₹49, L40S ₹102, A100 ₹179 and H100 ₹362; deployment selection and capacity must be contracted. [GPU cloud](https://www.e2enetworks.com/gpu-cloud)                                 | **First India capacity candidate.** Create a dedicated non-production endpoint and benchmark it before any rate-card commitment.      |
| 3   | [Krutrim AI Studio](https://docs.cloud.olakrutrim.com/basics/ai-studio/ai-jobs/inferencing) — direct API / dedicated deployment            | Documents OpenAI-compatible inference, model catalogue and dedicated/fine-tuning options.                                                         | Krutrim 2; catalogue-approved third-party models only after licence review.                                             | Published examples: Krutrim 2 ₹6.6/M input and output; DeepSeek 8B ₹3/M; dedicated H100 ₹213/hour. [Billing](https://docs.cloud.olakrutrim.com/basics/ai-studio/billing-for-ai-studio)                                                    | **First/second direct candidate.** Contract for region, resale and retention; catalogue licence alone is insufficient.                |
| 4   | [Neysa Velocis](https://neysa.ai/neysa-velocis/inference-endpoint/) — negotiated Indian dedicated capacity                                 | Managed inference endpoints and partnership-led deployment, rather than a proven retail API catalogue.                                            | I/O-approved tenant-specific Llama, Mistral, GPT-OSS or Indic models.                                                   | Commercial terms and exact capacity pricing are negotiated. Public materials are useful technical evidence, not a price card.                                                                                                             | **Partnership first.** Suitable for single-tenant/regulated workloads after DPA, SLA, exit and region proof.                          |
| 5   | [Yotta Shakti Cloud](https://yotta.com/shakticloud/Home.html) — Indian infrastructure partnership                                          | GPU cloud, Kubernetes, API integrations and customer model/application infrastructure; no equivalent public inference contract has been verified. | I/O-operated vLLM/SGLang deployments of approved weights.                                                               | Example on-demand H100 80 GB card is $4.99/GPU-hour, with lower contract rates; other H100, L40S, L4 and A100 configurations are published. [Pricing](https://yotta.com/shakticloud/Pricing.html)                                         | **Partnership first.** Capacity source, not public model router; verify exact DC, support and settlement.                             |
| 6   | [GroqCloud](https://console.groq.com/docs/openai) — global direct API                                                                      | Mostly OpenAI-compatible endpoint with fast hosted open-weight models.                                                                            | GPT-OSS-20B/120B, Llama, Qwen; model-version/capability lookup is mandatory.                                            | GPT-OSS-120B is listed at $0.15/M input and $0.60/M output; 20B at $0.075/M and $0.30/M. Batch is advertised at 50% lower cost. [Models](https://console.groq.com/docs/models)                                                            | **First global benchmark.** Explicit global-route consent only; capability differences are adapter flags.                             |
| 7   | [Together AI](https://docs.together.ai/docs/inference/openai-compatibility) — global direct/dedicated API                                  | Broad OpenAI-compatible open-model API; serverless, dedicated endpoints, own weights and managed containers.                                      | Llama, Mistral, Qwen, DeepSeek and vision/tool-capable catalog entries after exact discovery.                           | Serverless is token-priced, dedicated endpoints are time-priced and selected batch work is 50% discounted. [Pricing](https://docs.together.ai/docs/inference/pricing)                                                                     | **First full-featured adapter candidate.** Contract region, DPA and resale before activation.                                         |
| 8   | [Fireworks AI](https://docs.fireworks.ai/tools-sdks/openai-compatibility) — global serverless/dedicated API                                | OpenAI-compatible catalogue plus serverless, on-demand and reserved GPU deployments.                                                              | Llama, DeepSeek, Qwen, Mistral and fine-tuned/own weights, per model card.                                              | Serverless is token-priced; dedicated/on-demand is GPU-priced with scale-to-zero. Published serverless starts at $0.10/M for models under 4B and $0.20/M for 4–16B. [Pricing](https://docs.fireworks.ai/serverless/pricing)               | **Second global adapter candidate.** Public docs show US, Europe and APAC, not verified India residency.                              |
| 9   | [DeepInfra](https://docs.deepinfra.com/) — global API / private deployment                                                                 | OpenAI-compatible API with more than 100 models and isolated private endpoints for owned/fine-tuned weights.                                      | Llama, Qwen, DeepSeek, Mistral and private approved model deployments.                                                  | Shared service is token-priced with no idle fee; private endpoint capacity is GPU-hour billed. [Private models](https://docs.deepinfra.com/private-models/overview)                                                                       | **Cost benchmark/fallback candidate.** Do not put on an India-residency policy; public material identifies US infrastructure.         |
| 10  | [Nebius Token Factory](https://dev.nebius.com/) — global/EU direct, batch and dedicated API                                                | OpenAI-compatible real-time and batch API with dedicated endpoints and production SLAs.                                                           | GPT-OSS-20B/120B and current approved open model catalogue.                                                             | GPT-OSS-120B is listed at $0.15/M input and $0.60/M output; 20B at $0.05/M and $0.20/M; batch is 50% of base. [Price list](https://nebius.com/token-factory/prices)                                                                       | **EU/global capacity candidate.** Verify selected endpoint region, retention and provider terms.                                      |
| 11  | [Scaleway Generative APIs](https://www.scaleway.com/en/docs/generative-apis/) — European sovereign API / dedicated                         | OpenAI-compatible serverless and dedicated deployment of published open-weight models.                                                            | GPT-OSS (published Apache-2.0), Mistral and other model cards with licence metadata.                                    | Serverless is token-priced and dedicated deployment is infrastructure-priced; model licences are disclosed with catalog entries. [Supported models](https://www.scaleway.com/en/docs/generative-apis/reference-content/supported-models/) | **Sovereign-EU candidate.** Explicitly not an India-local route.                                                                      |
| 12  | [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/) — edge/global API               | OpenAI-compatible chat, Responses and embeddings API over an edge platform.                                                                       | GPT-OSS, Llama, Qwen and embedding candidates from the live catalog.                                                    | 10,000 free neurons/day, then $0.011/1,000 neurons; pricing page publishes model-specific equivalents. [Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)                                                          | **Overflow/edge evaluation.** Global distribution does not itself prove a user-data residency guarantee.                              |
| 13  | [Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers/en/index) — multi-provider reference, optional upstream | Hosted inference router with documented fastest/cheapest/preferred policies and model metadata.                                                   | More than 200 catalog models; use it to compare capability metadata and routing policy.                                 | Says pricing passes through from providers without HF markup. [Pricing](https://huggingface.co/docs/inference-providers/en/pricing)                                                                                                       | **Reference first, upstream later.** A second router increases opacity and data paths; I/O must still issue its own receipt.          |
| 14  | [Cerebras Inference](https://inference-docs.cerebras.ai/models/overview) — high-throughput global direct API                               | Public model metadata includes capability, context, price and model discovery fields.                                                             | GPT-OSS-120B (~3,000 tokens/s public signal), Llama 3.1 8B; current catalogue exposes more preview/dedicated options.   | Public model API lists GPT-OSS-120B at $0.35/M input and $0.75/M output with 131,072 context. [Model metadata](https://inference-docs.cerebras.ai/api-reference/models/public-models)                                                     | **Performance benchmark.** Capability, rate limit and global-route consent must be conformed.                                         |
| 15  | [SambaNova](https://docs.sambanova.ai/sambastudio/latest/api-ref-landing.html) — enterprise global/managed capacity                        | SambaStudio documents an OpenAI-compatible API for supported CoE and vision models, while some models remain on another API.                      | Customer-created CoE, Samba-1 Turbo and approved vision models; discover exact IDs during partnership.                  | Pricing and deployment are enterprise/contract-led in the material reviewed.                                                                                                                                                              | **Conformance first.** Compatibility is model-class-specific, so the registry cannot mark the provider universally OpenAI-compatible. |
| 16  | [Baseten](https://docs.baseten.co/inference/model-apis/overview) — direct API / dedicated self deployment                                  | Managed Model APIs are OpenAI- and Anthropic-compatible; custom endpoints can be deployed with Truss.                                             | Catalog currently includes DeepSeek, GLM and Kimi examples; own approved models can be deployed separately.             | Million-token pricing with automatic cache accounting; authenticated `/v1/models` returns exact live model, price, context and feature metadata.                                                                                          | **Capability-rich evaluation.** Global only until region/resale/retention evidence exists.                                            |
| 17  | [Replicate](https://replicate.com/docs/topics/models/official-models) — model execution API                                                | General prediction API for more than 100 official, warm, stable-API models; not a universal Chat Completions substitute.                          | FLUX, Llama, image/video and specialised model APIs; evaluate multimodal routes independently.                          | Public models are typically GPU-second billed; official models use predictable output/input units. Prediction creation is limited to 600 RPM by default. [Pricing](https://replicate.com/pricing)                                         | **Specialist modality adapter.** Keep outside the initial text/chat provider interface.                                               |
| 18  | [Runpod Serverless](https://docs.runpod.io/serverless/vllm/openai-compatibility) — deploy-your-own global capacity                         | vLLM workers expose OpenAI-compatible endpoints, scale automatically and support model-specific tool/reasoning parsers.                           | I/O-approved Llama, Mistral, Qwen, Gemma, DeepSeek, Phi or GPT-OSS weights; each licence reviewed.                      | Per-second billing. Example H100 Flex is $0.00116/s and Active $0.00093/s; active workers trade cost for warm latency. [Pricing](https://docs.runpod.io/serverless/pricing)                                                               | **Own-model/capacity benchmark.** Do not assume region, retention or model feature support.                                           |
| 19  | [Mistral AI](https://docs.mistral.ai/resources/migration-guides) — direct global/EU API plus open weights                                  | Chat Completions is OpenAI-client compatible; public API includes model discovery, streaming, tools and spend limits.                             | Mistral Large 3, Mistral Small, Devstral and other current catalogue models; some weights are Apache-2.0.               | Mistral Large 3 is currently listed at $0.50/M input and $1.50/M output; its model page records Apache-2.0 for that weight. [Model guide](https://docs.mistral.ai/models/model-selection-guide?models=mistral-medium-3-1-25-08)           | **Global/EU direct candidate.** Documentation says the API is EU-served by default; never present it as India-local.                  |
| 20  | [Modal](https://modal.com/docs/examples/vllm_inference) — code-defined rented capacity                                                     | Provides an example of running a vLLM server in OpenAI-compatible mode; I/O owns the serving configuration and weight choice.                     | Approved Gemma, GPT-OSS, Llama, Mistral or Indic weights, pinned to a reviewed revision.                                | Serverless compute is usage-priced with no reservation or minimum time increment; its published pricing is the only billable source. [Billing](https://modal.com/docs/guide/billing)                                                      | **Engineering/capacity candidate.** Model-runtime observability, warm-up and regional placement are I/O responsibilities.             |

## 3. What the 20 entries tell us

The inventory is deliberately not twenty interchangeable “OpenAI-compatible” buttons.

| I/O lane                              | Candidate set                                                  | Why it exists                                                                                | Non-negotiable gate                                                                             |
| ------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| India language and direct partnership | Sarvam, Krutrim                                                | Indian-language relevance, INR pricing and local commercial relationship.                    | Written serving region, no-training/retention, resale and support evidence.                     |
| India controlled capacity             | E2E TIR, Neysa, Yotta                                          | I/O can determine approved weights, runtime and capacity policy.                             | GPU contract, model commercial rights, deployment/egress controls, operational on-call.         |
| Global low-latency open-weight API    | Groq, Together, Fireworks, Cerebras, Baseten                   | Diverse performance, modalities and model breadth.                                           | Explicit global policy, capability conformance and immutable provider price card.               |
| European/sovereignty alternative      | Nebius, Scaleway, Mistral                                      | A distinct sovereign-EU option, not a disguised India route.                                 | Verified selected region, DPA and retention semantics.                                          |
| Infrastructure / special modality     | DeepInfra, Cloudflare, HF, SambaNova, Replicate, Runpod, Modal | Cost comparisons, edge/embedding paths, specialist multimedia and I/O-managed fleet options. | Route-specific adapter, licence approval, accuracy/latency test and policy-specific disclosure. |

### First activation cohort — intentionally small

This is the intended product/capacity activation cohort. OpenAI, xAI, Gemini and DeepSeek can be used earlier as a separate global engineering/conformance cohort because their keys are available; passing those tests does not make them India-local product routes.

Build adapters for only four patterns before approaching the full list:

1. **Sarvam direct API** — Indian-language direct partner pattern.
2. **E2E TIR controlled endpoint** — I/O-managed open-weight capacity pattern.
3. **Groq or Together direct API** — global OpenAI-compatible token-metered pattern.
4. **Member local/OpenCode/Ollama** — no-provider-key, device-local pattern.

Every later provider should pass the same contract, capability and billing gates. This produces a real router rather than twenty shallow integrations.

## 4. Implementation plan to turn inventory into a working router

### Phase 1 — provider registry, evidence and operator workflow

**Goal:** turn this document into database state without storing a single secret in the browser or repository.

Add an additive Supabase migration for these records:

```text
io_providers
  id, slug, display_name, legal_entity, support_tier, lifecycle
  terms_version, terms_url, data_processing_version, review_due_at

io_models
  provider_id, canonical_model_id, revision, creator, origin_country_code
  licence_id, commercial_hosting_rights, commercial_redistribution_rights
  modalities, context_limit, deprecation_at

io_model_endpoints
  provider_id, model_id, capacity_mode, endpoint_region, region_evidence
  retention_class, training_use_class, supports_byok, active_state

io_endpoint_capability_versions
  endpoint_id, version, chat, streaming, tools, structured_output, vision
  audio, embeddings, batch, usage_receipt, cancellation, tested_at

io_endpoint_pricing_versions
  endpoint_id, version, currency, meter, input_minor_per_million
  cached_input_minor_per_million, output_minor_per_million
  gpu_minor_per_second, effective_from, evidence_url, source_checked_at

io_provider_connections
  provider_id, secret_reference, account_scope, connection_state
  -- stores a server-side secret reference only, never the value
```

Add tables for `io_route_definitions`, `io_route_receipts` and `io_provider_attempts` as described in `IO_PORT_CODE_LEVEL_ROADMAP.md`. RLS should let members read only their eligible public model metadata and their own receipts; only I/O operators may draft/approve a provider or endpoint.

**Definition of done:** an operator can enter an evidence URL, terms version, pricing card and model licence; a route cannot activate until every required gate is recorded.

### Phase 2 — conformance harness before credentials become production traffic

**Goal:** prove that a provider behaves as the registry says.

Create a restricted internal runner (not a browser button) which receives a provider connection ID and endpoint ID, then writes test results into the capability version table. It must test:

1. model discovery and exact returned model ID;
2. normal and streaming Chat Completions, including cancellation;
3. tool calls, JSON schema/structured output, vision/embedding/audio only if advertised;
4. usage unit receipt and token-count discrepancy;
5. idempotency, retry safety, 429, 5xx and timeout mapping;
6. rate-limit response headers, queue/cold-start behaviour and health check;
7. independently supplied serving-region/retention evidence;
8. licence/terms/price card review performed by an operator.

The result must be **fail closed**: an untested capability is `false`, not assumed because the provider says “OpenAI-compatible.”

**Definition of done:** Sarvam, E2E and one global endpoint have a recorded test run, source evidence and a capability matrix, but still no broad member route.

### Phase 3 — gateway registry adapter and deterministic routing

**Goal:** evolve the existing secure `io-gateway` from its present one-provider proof into a registry-led router.

1. Replace the hard-coded `partner-gateway` lookup with a server-only registry query of active endpoints.
2. Define one normalized internal request/response contract. Adapters may translate provider field names, usage receipts, errors and streaming frames; no provider URL, policy or key can arrive from the browser.
3. Evaluate member policy in this order: entitlement → permitted capacity class → data region/retention → model-origin preference → required capability → maximum price → deterministic ordered fallback.
4. Record every candidate and attempt. A fallback is allowed only when the member’s named policy permits its capacity, region and retention class.
5. Return a receipt ID, selected model revision and policy result with each normalized response.

The first policies should be explicit and small:

```text
local-device-only
india-only-no-retention
india-preferred-then-explicit-global-fallback
global-price-capped
byok-only
community-capacity-opt-in-low-sla
```

**Definition of done:** a single policy selects one known-good endpoint deterministically and emits an auditable route receipt. “Automatic best model” remains disabled.

### Phase 4 — reserve, settle and receipt before paid or sponsored traffic

**Goal:** make the price calculation reproducible.

Add append-only `io_usage_reservations`, `io_usage_records`, `io_ledger_transactions`, `io_ledger_entries`, `io_credit_grants`, `io_fee_rule_versions`, `io_fx_rate_versions` and invoice tables. Store INR in paise. The only valid flow is:

```text
price-card snapshot → reserve maximum budget → dispatch once
→ collect provider usage → settle once → release unused reserve → issue receipt
```

For a direct API, the calculation is input + cached input + output + media/tool/batch units. For managed capacity, it is metered GPU seconds plus a separately disclosed reserved-capacity allocation. I/O's routing fee is a single versioned, visible line; payment and applicable tax are separate lines. A sponsored/free route writes a grant ledger entry—never an invisible zero price.

**Definition of done:** an operator can reconcile an upstream bill sample to I/O receipts without looking at the web UI.

### Phase 5 — people-centred I/O Port UI and the existing conversation shell

**Goal:** expose the decision, not just the model name.

Extend the current `/app/io` UI and its Discord-like persistent-space shell with:

1. a policy selector explaining India-only, India-preferred, global, local device and BYOK in plain language;
2. a model chooser showing revision, creator/origin, licence, capabilities, price-card version and endpoint region evidence;
3. pre-run price/range and remaining workspace budget;
4. post-run route receipt: selected endpoint, all allowed fallbacks, actual units, cost/fee/FX/tax and privacy/retention class;
5. a clear boundary between human messages and I/O terminal session events—never put prompts, tool approvals or artefacts into direct-message rows;
6. a local terminal card for OpenCode/Ollama that shows device-local status and grants only user-approved audit metadata;
7. opt-in, visually distinct donated-capacity notices: sponsor, SLA, capacity limit and retention policy.

No preview count, price or health signal may look live unless it is backed by the registry/receipt data.

### Phase 6 — partnerships, I/O-operated fleet and donated capacity

**Goal:** create legitimate capacity lanes rather than a collection of API keys.

For each partnership, record white-label/resale permission, billing/commitments, model licence, DPA, support escalation, incident reporting, planned region, outage credits, price-change/deprecation notice and export/exit process. For I/O-owned/rented capacity, deploy approved models on vLLM first and keep SGLang as a tested alternate. For donated capacity, require:

1. identified operator and signed capacity grant;
2. hardware/runtime and network isolation attestation;
3. no prompt persistence, restricted telemetry and revocation path;
4. live health/queue telemetry and test traffic before routing;
5. explicit member opt-in and exclusion from sensitive or India-only workloads unless all evidence supports it;
6. licence and commercial use approval for every served model revision.

## 5. Ordered next decisions

1. Choose the first direct partner: **Sarvam or Krutrim**.
2. Choose the first India capacity partner: **E2E TIR** is recommended.
3. Choose one global benchmark endpoint: **Groq** for latency, or **Together** for broader feature coverage.
4. Approve the registry migration and the route-receipt/ledger data model before keys are supplied.
5. Collect a non-production credential and written terms for only the three chosen providers.
6. Run the conformance harness, review the receipts, then enable a single capped beta policy.

The 17 remaining providers remain valuable comparisons and contingency lanes, but none should delay a correct, transparent first route.
