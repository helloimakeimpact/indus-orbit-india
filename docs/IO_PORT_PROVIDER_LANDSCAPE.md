# I/O Port provider and capacity landscape

Status: research and onboarding decision record, 31 July 2026. Prices, catalogues and capacity claims change quickly; treat linked provider pages as the source of truth at the time of contracting. This document does not activate a provider, imply resale rights, or claim data residency without a contract.

## 1. Decision frame

I/O Port is not a generic model catalogue. It is a people-centred routing layer that makes five facts visible before and after a run:

1. the model and exact revision requested;
2. the provider and physical/contracted route selected;
3. the data-retention and residency evidence supporting that selection;
4. the capacity class: partner, user key, I/O-rented/owned, or donated commons;
5. the exact versioned price card and route receipt.

"India-first" therefore means an India-only route is available where contracted and verified. It must never silently degrade into a global route. A member can instead choose **India-preferred**, **global-price**, **sovereign-EU**, **BYOK only**, or **local device**; each has distinct policy and consent semantics.

## 2. Recommended onboarding sequence

| Priority | Provider / capacity lane                                                                                                                                 | Why it fits I/O Port                                                                                                                                                                                                                                                 | Contract and proof gate before it is routable                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | [Sarvam AI](https://docs.sarvam.ai/api-reference/authentication) direct API                                                                              | OpenAI-compatible Indian-language chat/voice direction, INR token pricing and a VPC/on-prem enterprise path. Sarvam's current model and plan information is published in its [pricing](https://www.sarvam.ai/api-pricing).                                           | Written India-region/residency, no-training/retention, resale, rate-limit and support terms. Do not infer residency from an India-first product position.         |
| 1        | [E2E TIR](https://docs.e2enetworks.com/docs/tir/Inference/ModelEndpoints/QuickStartGuide/) dedicated endpoints                                           | OpenAI-compatible endpoints, vLLM/SGLang/custom-container support, autoscaling and documented Delhi/Chennai deployment make this the strongest first I/O-rented or I/O-owned open-weight lane.                                                                       | I/O project/account, endpoint health and regional placement evidence, commercial model licence, GPU cost card, support/on-call terms.                             |
| 2        | [Krutrim AI Studio](https://docs.cloud.olakrutrim.com/basics/ai-studio/ai-jobs/inferencing)                                                              | OpenAI-compatible API, Indian currency billing, catalogue metadata and dedicated deployment/fine-tuning options. Its [published billing](https://docs.cloud.olakrutrim.com/basics/ai-studio/billing-for-ai-studio) makes it useful as a catalog/API partner.         | Same residency, retention and resale verification as Sarvam. Licence shown in a catalogue does not by itself grant I/O the right to resell hosted inference.      |
| 2        | [GroqCloud](https://console.groq.com/docs/openai)                                                                                                        | Fast OpenAI-compatible hosted routes for selected open-weight models, suitable for an explicitly global, interactive/coding policy.                                                                                                                                  | Feature-conformance evidence and a global-route consent. It must not appear under India-only or India-preferred unless a contracted placement supports it.        |
| 2        | [Together AI](https://docs.together.ai/docs/inference/openai-compatibility) or [Fireworks AI](https://docs.fireworks.ai/tools-sdks/openai-compatibility) | Broad open-weight catalogues, tools/vision options and a path from serverless to dedicated capacity. Together bills serverless per token and dedicated endpoints per minute; Fireworks combines token-priced serverless with GPU-priced on-demand/Reserved capacity. | Region/DPA confirmation, model capability receipts, price-card ingestion and rate-limit/incident terms. Neither public documentation establishes India residency. |
| 3        | [Neysa Velocis](https://neysa.ai/neysa-velocis/inference-endpoint/) + Pipeshift                                                                          | India-deployed, single-tenant and hybrid reserved/on-demand open-weight endpoints make this a promising regulated-volume partnership rather than a first self-serve integration.                                                                                     | Negotiated endpoint, exact region, DPA, SLA, commercial price card and failure/exit procedure.                                                                    |
| 3        | [Yotta Shakti](https://yotta.com/shakticloud/Home.html)                                                                                                  | Sovereign GPU and endpoint capacity partnership candidate. Public material supports an India-hosted positioning, but not an equivalent self-serve inference contract.                                                                                                | Partnership API/control-plane scope, placement, billing, support and security review before an adapter is written.                                                |

The first implementation set should be **Sarvam + E2E TIR + one global open-weight partner (Groq, Together or Fireworks)**. That gives Indian-language value, a real India-hosted open-weight lane, and broad global capacity without pretending one supplier can satisfy every route constraint.

## 3. Open-source, open-weight and local capacity

These categories must remain separate:

| Category                                  | Safe interpretation                                                                                                                                                                                                      | I/O Port decision                                                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open-source serving infrastructure        | [vLLM](https://docs.vllm.ai/en/v0.23.0/serving/online_serving/openai_compatible_server/) and [SGLang](https://docs.sglang.io/) are Apache-2.0 OpenAI-compatible serving systems.                                         | Use vLLM as the initial owned/rented fleet runtime; keep the I/O control plane, billing and policy layer independent of either runtime.                                                         |
| User-owned local inference                | [Ollama](https://docs.ollama.com/api/openai-compatibility) exposes a local OpenAI-compatible API.                                                                                                                        | A valid I/O Terminal option, but not a multi-tenant capacity pool. It keeps models/files on the member's device.                                                                                |
| Commercially clean Indian-language models | [AI4Bharat IndicTrans2](https://github.com/AI4Bharat/IndicTrans2) is MIT-licensed and covers all 22 scheduled Indian languages; [BharatGen Patram](https://huggingface.co/bharatgenai/patram-7b-instruct) is Apache-2.0. | Candidate self-hosted translation and document-VLM lanes after evaluation and security review.                                                                                                  |
| Restricted open weights                   | BharatGen Param2 is non-commercial, Sarvam-1 is non-commercial, and Krutrim models use a Community Licence.                                                                                                              | Block paid/user-serving self-hosting until a written commercial hosting, redistribution and sublicensing grant is recorded.                                                                     |
| Donated/community capacity                | A volunteer GPU is neither free nor automatically safe.                                                                                                                                                                  | Allow only opt-in, clearly labelled low-SLA work after operator identity, isolation, health, retention, licence and settlement checks. Never send sensitive work to untrusted donated capacity. |

Open-weight does not mean unrestricted commercial hosting. Every registry entry needs a model revision and licence evidence; every provider entry needs its independently versioned terms, data handling and price evidence.

## 4. Router and control-plane references

| Reference                                                                                    | Relevant verified pattern                                                                                                                                                 | What I/O should learn                                                      | What I/O should avoid                                                                            |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [OpenRouter](https://openrouter.ai/docs/guides/routing/provider-selection)                   | Provider selection/fallbacks, retention filters and route metadata. Its published [credit/BYOK policy](https://openrouter.ai/docs/faq) explains its current fees.         | Deterministic candidate selection and a receipt showing the actual route.  | A generic "best" route that hides region, retention, fallback or price choices.                  |
| [Mesh API](https://developers.meshapi.ai/docs/infrastructure/architecture)                   | OpenAI-compatible catalogue, rate/spend caps, caching, auto-routing and partner-key fallback. Its [pricing](https://meshapi.ai/pricing) emphasises INR-friendly payments. | Prepaid INR/UPI ergonomics and budget controls.                            | Savings or zero-markup marketing without a route-level unit-price, tax and capacity explanation. |
| [LiteLLM](https://www.litellm.ai/pricing)                                                    | Open-source self-hosted gateway plus teams, budgets, rate limits and logs.                                                                                                | The control-plane patterns; it can be a useful interoperability reference. | Treating a community model price map as I/O's billing source of truth.                           |
| [Portkey](https://portkey.ai/docs/product/ai-gateway)                                        | Routing rules, retries, circuit breaking, observability, guards and MCP gateway.                                                                                          | Capability-specific routing and operational safeguards.                    | Depending on a pre-release/open-source roadmap instead of I/O's tested policy/ledger boundary.   |
| [Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers/en/index) | Provider policies such as fastest/cheapest/preferred and published model metadata.                                                                                        | A model-capability catalogue and explicit route policy vocabulary.         | Adding another opaque router/data path before I/O can itself issue route receipts.               |

## 5. Scientific pricing model — proposal for approval

Do not publish a flat "token price" without showing the route cost source. Every completed route must calculate from immutable cards:

```text
external execution cost
  = input units × input price
  + cached-input units × cached-input price
  + output units × output price
  + tool/media/batch units × corresponding price

owned or reserved capacity recovery
  = directly metered GPU seconds × versioned INR/GPU-second rate
  + explicit reserved-capacity allocation

member price before tax
  = execution/recovery cost
  + clearly labelled I/O routing fee
  + separately disclosed payment-processing charge (only where applicable)

final invoice
  = member price before tax + applicable tax determined after tax review
```

Store all money in paise and use a versioned FX card whenever an upstream price is quoted in a foreign currency. Reserve the member budget before dispatch; settle actual metered usage exactly once; release the remainder. A provider's catalogue price, an exchange rate displayed in the UI, and a browser total are never the billing record.

Initial commercial lanes to validate with members and partners:

| Member lane               | Proposed charge principle                                                                                                                                 | Required disclosure                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Local device              | ₹0 I/O execution charge; the member runs their own hardware.                                                                                              | Device-local boundary; I/O receives only approved audit metadata.                                  |
| BYOK                      | No hidden provider mark-up. During private beta, keep variable routing fee at ₹0 or a visibly priced workspace plan.                                      | Provider is the member's choice; explain data path and any I/O operational fee.                    |
| I/O metered partner       | Exact upstream card plus a single visible routing fee. Begin testing at an 8% variable fee, with a ₹0.05 minimum only if payment/ledger costs require it. | Model/provider/region, input-cached-output unit prices, route fee, FX card and tax line.           |
| Team/workspace            | Exact execution card plus a lower 5% routing fee and a separately priced operations/audit workspace plan.                                                 | Budgets, caps, receipts, invoice owner and any committed-capacity allocation.                      |
| Dedicated/owned capacity  | Cost recovery from metered GPU seconds plus an explicit managed-capacity/support margin; never invent a token mark-up that conceals low utilisation.      | GPU type, contracted price card, utilisation/allocation method, queue/SLA and outage-credit terms. |
| Donated/sponsored commons | Member price can be ₹0, but the subsidy must be a ledger grant—not an invisible "free model" claim.                                                       | Sponsor/eligibility, capacity limit, queue/availability, retention class and low-SLA warning.      |

The percentage and minimum are a calibration hypothesis, not a public commitment. Validate them against payment costs, observed support burden, provider terms and a 30–40% gross-margin target on the I/O-operated service layer; do not add a fee both when credits are purchased and again when execution is settled.

## 6. Required registry and conformance work

Before a provider is marked routable, introduce the registry planned in `IO_PORT_CODE_LEVEL_ROADMAP.md` and require at least:

```text
provider: terms_version, contracted_region, residency_evidence,
          DPA/retention/training class, resale_rights, incident_contact
model:    revision, licence, commercial_hosting_rights, modalities,
          tool/JSON/streaming support, context and deprecation policy
endpoint: capacity_mode (direct_api | user_key | dedicated_endpoint |
          i_o_owned | community), region, health, queue, rate limits,
          metering_basis and versioned price card
route:    explicit policy, consent class, fallback eligibility and max price
receipt:  candidate set, chosen endpoint, attempts, units, FX/tax/fee cards,
          data policy and timestamp
```

Provider conformance must prove `/models` where offered, chat, streaming, tools, structured output, usage receipt, 429/5xx mapping, idempotency behaviour, cancellation and region evidence. Mark an endpoint **India-hosted** only after contractual and operational verification—not a marketing assertion.

## 7. Immediate next action once a key or partnership is chosen

1. Record the provider decision, commercial/residency evidence and immutable price card in the operator registry.
2. Configure the server-side secret only; never place it in the browser, demo data or migration.
3. Run the conformance suite against a non-production workspace.
4. Activate a deterministic single-provider policy and a small, capped capacity grant.
5. Inspect route receipts and ledger reconciliation before enabling fallback, shared capacity or paid traffic.
