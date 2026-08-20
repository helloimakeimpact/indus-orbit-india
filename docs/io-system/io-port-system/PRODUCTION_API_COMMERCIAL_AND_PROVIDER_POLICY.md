# I/O production API, commercial and provider policy

Status: **Partial**. The code and hosted database controls described below are live on the Indus Orbit demo project as of 20 August 2026, including workspace residency, API-key quota/spend and bounded conformance. No external provider is commercially approved or routing production traffic.

This is the decision record for the first I/O production lane: OpenAI and DeepSeek, an OpenAI-compatible Indus Orbit API, a transparent 5.5% I/O service fee, and a separate admin control plane. Public provider documentation establishes technical and data-handling facts; it does not by itself establish permission to resell raw API access.

## 1. Production address map

| Address                         | Purpose                                                                   | State                                                             |
| ------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `https://indusorbit.com/`       | Public, people-centred Indus Orbit brand                                  | Existing hosting/DNS must be reconciled before production cutover |
| `https://indusorbit.com/io`     | Signed-in I/O web workspace using the member's Supabase session           | Released in the member application                                |
| `https://indusorbit.com/app`    | Community product; onboarding begins only after explicit Community opt-in | Released foundation                                               |
| `https://api.indusorbit.com/v1` | Public OpenAI-compatible API for servers, CLIs and local agents           | Target production hostname; DNS/TLS/proxy are not yet provisioned |
| `https://admin.indusorbit.com`  | Separate admin-team application                                           | Code is published to private GitHub `main`; hosting remains       |
| `https://docs.indusorbit.com`   | API, model, policy and SDK documentation                                  | Planned                                                           |
| `https://status.indusorbit.com` | Provider/API incident and availability status                             | Planned                                                           |

`www.indusorbit.com` should permanently redirect to the apex. I/O and Community remain separate products on the same member origin so they can share one safe sign-in session without making Community onboarding a condition of I/O. The API and admin control plane use separate origins because their authentication, exposure and operating duties differ.

Until the public API hostname is provisioned, the released technical base is:

```text
https://jpwvgpnbkrktipwhvqss.supabase.co/functions/v1/io-openai/v1
```

The production proxy must preserve `Authorization`, `Idempotency-Key`, response request/receipt headers, status codes and streaming semantics when streaming is later released. It must not log bearer keys, prompts or responses.

## 2. Browser and secret boundary

### Released I/O rule

Persistent I/O API keys are for server, CLI and local-agent use. They must never be embedded in browser JavaScript, a public bundle, HTML, analytics, `localStorage`, screenshots or Git. The signed-in I/O web application calls the JWT-protected `io-gateway`; it does not call `io-openai` with a persistent I/O key. OpenAI and DeepSeek provider keys are always server-side Edge Function secrets and are never returned to any member.

The released `io-openai` function rejects every request carrying an `Origin` header before key authentication. This is intentionally stricter than CORS: CORS is a browser response-sharing mechanism, not protection for a bearer secret. A stolen bearer key can be used outside a browser regardless of its CORS configuration.

### What OpenRouter does

OpenRouter's OAuth PKCE flow can exchange a short-lived single-use code for a user-controlled OpenRouter key. That makes browser use possible within OpenRouter's user-account/key model; it does not expose an upstream provider key and does not turn `HTTP-Referer` attribution into an authentication boundary. OpenRouter's key API documents limits, expiry and disablement, but not an origin-bound bearer-key guarantee.

I/O will not copy that behavior into persistent keys. A later browser-direct API mode may be considered only as a separate key class with all of these properties:

- explicit opt-in after sign-in and PKCE;
- I/O-issued, never a provider credential;
- 5–15 minute expiry;
- exact audience, origin and capability scopes;
- strict request and spend caps;
- revocable server-side state and anomaly detection;
- memory-only browser storage;
- exact-origin CORS and CSP.

That mode is **Planned**, not part of the released API. Sources: [OpenRouter OAuth PKCE](https://openrouter.ai/docs/guides/overview/auth/oauth), [OpenRouter API-key creation](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys), [OpenRouter attribution](https://openrouter.ai/docs/app-attribution), [OpenAI authentication guidance](https://developers.openai.com/api/reference/overview#authentication), [DeepSeek Open Platform Terms](https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html).

### Released API-key beta policy

Migration `20260820140000_harden_io_workspace_and_api_key_policy.sql` snapshots conservative limits onto every key and enforces them in Postgres. A server environment variable can no longer widen a key after issuance.

| Limit                         | 30-day beta test key default  |
| ----------------------------- | ----------------------------- |
| Expiry                        | 30 days; hard maximum 90 days |
| Requests per minute           | 20                            |
| Requests per UTC day          | 200                           |
| Requests per UTC month        | 2,000                         |
| Customer charge per UTC day   | USD 1.00                      |
| Customer charge per UTC month | USD 10.00                     |

The request counters are atomic minute/day/month windows. Chat dispatch atomically reserves both the workspace budget and the key's daily/monthly customer-charge allowance; success settles the exact provider cost plus 5.5% fee and failure releases both reservations. Limits are deliberately low for the first beta and may only be widened through a new reviewed policy version, never by changing client input.

OpenAI calls also require `IO_SAFETY_IDENTIFIER_SECRET`, a separate random server-side secret of at least 32 characters. The gateway derives an HMAC identifier from the internal actor ID and sends no raw email or member identifier upstream. This follows OpenAI's current safety-identifier guidance; provider API keys remain separate secrets.

## 3. Transparent 5.5% price rule

The owner-approved policy is:

```text
provider metered charge + 5.5% I/O service fee
```

At the released input/output-token boundary:

```text
service_fee_nanos = ceil(provider_cost_nanos × 550 / 10,000)
customer_charge_nanos = provider_cost_nanos + service_fee_nanos
```

Money evidence is stored in integer currency nanos. The provider cost, I/O fee, customer total, fee-policy version, price-card version and route receipt are separate evidence. The customer total is converted to currency minor units only once, after the high-precision components reconcile. Failed routes settle at zero and release their reservation. Retries reserve conservatively, but only the successfully reported usage is settled; the system must never charge the same failed attempt twice.

Taxes, FX conversion, payment processing, credit expiry, refunds and chargebacks are separate disclosed rules. They are not hidden inside 5.5%. Cross-currency fallback currently fails closed because approved FX snapshots do not yet exist.

OpenRouter's current FAQ says provider inference prices are passed through without an inference markup and a 5.5% fee, subject to a minimum, is charged when credits are purchased. Therefore I/O's 5.5% is not accurately described as lower than a larger OpenRouter inference markup. The differentiator is the explicit per-route cost/fee/total receipt and the people-centred capacity policy. OpenRouter's BYOK documents and pricing page currently describe different allowance thresholds before a 5% fee; this inconsistency must not be copied into I/O. Sources: [OpenRouter FAQ](https://openrouter.ai/docs/faq), [OpenRouter BYOK](https://openrouter.ai/docs/guides/overview/auth/byok), [OpenRouter pricing](https://openrouter.ai/pricing).

### Released and remaining billing scope

| Capability                                                             | State                                                                                    |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Versioned 550-basis-point policy                                       | Released                                                                                 |
| Provider cost, fee and customer total in receipts/usage                | Released                                                                                 |
| Exact fee validation inside atomic finalization                        | Released                                                                                 |
| Hard reserve, settle/release and idempotency                           | Released                                                                                 |
| Input/output token price dimensions                                    | Released                                                                                 |
| Cached/cache-write token settlement                                    | Partial: price evidence can be stored; upstream usage parsing/settlement is not complete |
| Tools, media, storage and regional uplift dimensions                   | Planned                                                                                  |
| Tax, FX, invoices, credits, payment/refund and provider reconciliation | Planned                                                                                  |

## 4. Commercial activation is fail-closed

An API key proves authentication, not partnership or resale permission. Each provider has a commercial state:

- `unreviewed`
- `application_integration`
- `resale_pending`
- `resale_authorized`
- `self_hosted_licence`
- `suspended`
- `expired`

`resale_authorized=true` is valid only with a reviewed HTTPS evidence record, review time and accountable reviewer, and only for `resale_authorized` or `self_hosted_licence`. Endpoint eligibility, admin activation and runtime resolution all consume this same evidence. A database trigger blocks a privileged operator from enabling routing without it.

The separate admin application now shows commercial state and terms evidence as an eighth provider activation gate. It never reads raw provider keys.

## 5. First provider assessment

| Provider lane                | Technical state                                                                                                  | Data/region evidence                                                                                                        | Training/retention evidence                                                                                                                                                      | Commercial state                   | Activation decision                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI hosted API            | Adapter, HMAC safety identifier and `gpt-5.6-luna` price v2 are staged; key is server-side                       | India endpoint currently provides regional storage, not India-only processing; eligible residency controls require approval | API data is not used for training by default unless opted in; default abuse monitoring may retain content up to 30 days; MAM/ZDR require approval and endpoint exceptions remain | `resale_pending`                   | Do not route until written authorization for the aggregator/API-port model, selected region and retention controls are recorded                                                                                       |
| DeepSeek hosted API          | OpenAI-compatible adapter, CN registry fact and explicit workspace consent filter are staged; key is server-side | Public privacy terms identify processing/storage in China; registry records CN                                              | Public terms describe collection and training use with opt-out; no verified API ZDR, India residency or fixed API retention commitment was found                                 | `resale_pending`                   | Keep present as a global/China-disclosed lane, but exclude it from each workspace by default; route only after written onward-access permission and the workspace accepts China processing plus possible training use |
| DeepSeek self-hosted weights | Separate rented/owned-capacity adapter, not the hosted DeepSeek API                                              | Region is the actual I/O-controlled server location                                                                         | I/O owns serving logs/retention; model/serving licences and supply chain still require review                                                                                    | Planned `self_hosted_licence` lane | Candidate for I/O-rented/owned capacity after exact weight licence, runtime, safety, benchmark and infrastructure approval                                                                                            |
| OpenRouter upstream          | No key or route                                                                                                  | Downstream provider varies                                                                                                  | Provider policies vary; ZDR/filtering exist                                                                                                                                      | Not authorized                     | Do not use as a raw upstream. Current standard and enterprise terms restrict resale/sublicensing/competing access without bespoke written authorization                                                               |

OpenAI sources: [data controls](https://developers.openai.com/api/docs/guides/your-data#data-controls-in-the-openai-platform), [retention controls](https://developers.openai.com/api/docs/guides/your-data#data-retention-controls-for-abuse-monitoring), [regional controls](https://developers.openai.com/api/docs/guides/your-data#data-residency-controls), [regional support](https://developers.openai.com/api/docs/guides/your-data#support-by-region), [pricing](https://developers.openai.com/api/docs/pricing).

DeepSeek sources: [current API/model pricing](https://api-docs.deepseek.com/quick_start/pricing-details-usd/), [model discovery](https://api-docs.deepseek.com/api/list-models), [rate limits](https://api-docs.deepseek.com/quick_start/rate_limit), [privacy policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html), [Open Platform Terms](https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html), [DeepSeek V4 Pro model card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro).

OpenRouter sources: [standard terms](https://openrouter.ai/terms), [enterprise terms](https://openrouter.ai/terms-of-service-enterprise), [privacy/data collection](https://openrouter.ai/docs/guides/privacy/data-collection), [provider logging](https://openrouter.ai/docs/guides/privacy/provider-logging/), [ZDR](https://openrouter.ai/docs/guides/features/zdr).

## 6. Default model policy

`io/latest-affordable` remains dynamic. It is not a hard-coded promise that an upstream alias will never change. A candidate must first pass:

1. commercial authorization;
2. member capacity entitlement;
3. provider/model/endpoint active state;
4. current verified capability plus endpoint-bound conformance;
5. allowed region, residency, retention, training and origin policy;
6. healthy closed circuit;
7. active evidence-backed price card in one comparable currency;
8. workspace budget and spend limits;
9. newest approved release within the configured affordability band.

For the OpenAI lane, `gpt-5.6-luna` is the cost-sensitive candidate, `terra` is the balanced target and `sol` is the quality target, but model availability must come from the account's `/v1/models`; pricing must come from separately versioned official evidence. Aliases are convenient for discovery, while production routes should pin reviewed snapshots and run evals before changing defaults.

For the hosted DeepSeek lane, the current public catalogue identifies `deepseek-v4-flash` and `deepseek-v4-pro`. Model sync must retire old IDs rather than silently redirect them. Flash is the affordable candidate; Pro is an explicit quality candidate only after the same commercial, region and conformance gates.

## 7. Provider onboarding and approval record

Before either hosted provider becomes routable, the admin team must retain:

- legal provider entity and exact service/order form;
- written permission for Indus Orbit's end-user/API-port access and 5.5% fee model;
- countries where Indus Orbit customers may be located;
- processing, storage, failover and subprocessor regions;
- no-training basis, opt-out mechanism, abuse-log retention and ZDR/MAM availability;
- DPA, security, incident-notification and deletion/export terms;
- model/card price versions, rate limits, refund rules and invoice evidence;
- support/escalation contact and kill-switch owner;
- effective, expiry and next-review dates;
- one bounded conformance budget and an explicit activation decision.

The runtime must fail closed when evidence expires, a region becomes ineligible, price evidence is stale or the provider is suspended.

## 8. Ordered completion plan

### Code and hosted controls — Released

- reject persistent I/O API keys from browser-origin requests;
- keep provider credentials server-only;
- version the 5.5% fee and settle provider cost/fee/customer total atomically;
- prevent paid settlement on failure;
- add commercial state/evidence fields and a database activation trigger;
- include commercial authorization in canonical endpoint eligibility;
- expose capability-checked commercial evidence to the separate admin app;
- show provider cost, service fee and customer total in I/O receipts/results;
- update OpenAI Luna price evidence and DeepSeek CN disclosure;
- deploy `io-gateway` v23 and `io-openai` v4.

### Hardening released on 20 August 2026

- explicit workspace opt-in before any CN-resident endpoint enters catalogues or routing;
- versioned 20/minute, 200/day and 2,000/month request limits on each beta key;
- atomic USD 1/day and USD 10/month per-key spend reservations and settlement;
- HMAC-derived OpenAI `safety_identifier` with a dedicated server secret;
- admin-authorized `io-chat-v1` conformance: discovery first, one eight-token chat check, USD 0.01 maximum, CN acknowledgement and allow-listed redacted evidence only;
- only a passing run seals the endpoint's tested draft chat/model-listing/usage declaration as Verified; a failed run leaves it unroutable;
- member/admin UI for residency consent, visible key limits and capped conformance approval;
- 54 member and 13 admin tests pass locally.
- hosted migrations `20260820191501`, `20260820191544` and `20260820191815`, plus `io-provider-conformance` v1; routes/approvals/runs remain zero.

### Next code slices

1. Add upstream cached/cache-write token parsing and dimension-complete settlement tests.
2. Add provider model/price sync as reviewed drafts; never auto-publish external changes.
3. Add anomaly suspension, rotation reminders and a separately approved production live-key lifecycle.
4. Add streaming cancellation/settlement, then a tested Responses subset.
5. Build contract-expiry, price-staleness and incident controls in admin.
6. Add invoice/credit/FX/tax/refund/reconciliation journals and operator evidence.
7. Provision `api.indusorbit.com`, docs/status surfaces, monitoring, WAF/rate controls and redacted logs.

### Owner/legal/operations actions

1. Obtain written OpenAI and DeepSeek decisions for this exact raw API-port/aggregator model and fee treatment.
2. Choose the OpenAI data-control tier. China-hosted DeepSeek is retained as an explicit opt-in lane and never satisfies India-only routing.
3. Use the coded USD 0.01 single-run conformance ceiling unless a later reviewed suite deliberately changes it.
4. Use the coded conservative beta key defaults above; approve a new policy version before any increase.
5. Nominate privacy, security, billing, provider-operations and incident owners.
6. Provision DNS/TLS/proxy/hosting and deploy the connected separate admin repository.

No live provider traffic should be enabled merely because these actions have begun. Activation requires recorded evidence plus a passing conformance result.
