# OpenAI-compatible I/O API status

Status: **Partial**, with the bounded v1 foundation, transparent fee/commercial gate, multi-window key limits, per-key spend cap, CN workspace policy and HMAC safety identifier **Released** to the hosted Indus Orbit control plane. On 24 August 2026, `io-openai` v8 released the stateless Responses endpoint, SSE response transport, and fail-closed request/response contracts for function tools, strict JSON output and HTTPS image input; v9 added provider-fetch cancellation. Provider routing remains disabled, so no paid model traffic was created and advanced provider behavior is not yet end-to-end Released.

## Released contract

Base URL:

```text
https://jpwvgpnbkrktipwhvqss.supabase.co/functions/v1/io-openai/v1
```

The member web application displays this URL and lets a workspace owner/admin create a 30-day test key. A raw key is returned once in this form:

```text
io_test_<16-character-lookup>.<43-character-secret>
```

Only its SHA-256 hash, display prefix, last four characters, scopes and lifecycle metadata are stored. Raw keys and provider credentials are different things: member I/O keys authenticate callers; provider secrets remain operator-only Edge Function secrets.

Released endpoints:

| Endpoint                 | Scope required     | Released behavior                                                                                                                                                                                                                    |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /models`            | `models:read`      | Returns `io/latest-affordable`, `io/lowest-cost` and explicit `provider/model` IDs only for ready connections backed by capacity entitled to the key's workspace.                                                                    |
| `POST /chat/completions` | `inference:invoke` | Non-streaming JSON or OpenAI-shaped SSE. Supports bounded function tools/tool results, `json_object`/strict `json_schema`, and credential-free HTTPS image inputs when the selected endpoint has exact verified capability evidence. |
| `POST /responses`        | `inference:invoke` | Stateless `store:false` Responses subset with text/message/function-call input, instructions, function tools, structured text format, HTTPS images, JSON responses and typed SSE events.                                             |

`io/latest-affordable` is the default product route. It means the newest reviewed model inside the configured affordability band and tier; it does not mean the newest model advertised anywhere. `io/lowest-cost` is deterministic within one reviewed currency. Explicit `provider/model` IDs resolve to the internal reviewed model UUID and cannot escape the entitled catalogue.

## Security and operations

Migration `20260819232624_add_io_openai_api_foundation.sql` provides:

- owner/admin-only test-key issuance and revocation;
- maximum 90-day test-key expiry, with the UI defaulting to 30 days;
- explicit scopes and service-role-only key consumption;
- creator active-membership revalidation on every request;
- immutable per-key 20/minute, 200/day and 2,000/month request limits plus USD 1/day and USD 10/month spend caps; the legacy request-limit argument remains compatible but can no longer widen a key snapshot;
- expired/revoked-key rejection without identity disclosure;
- content-free creation, revocation and route audits;
- no browser read/write privilege on private rate windows.

`io-openai` has Supabase JWT verification disabled because an I/O API key is not a Supabase JWT. The function itself rejects any request carrying a browser `Origin`, validates the exact Bearer-key shape, hashes the supplied value, calls the service-only authentication/rate RPC and checks the required scope before loading any catalogue or route. Persistent I/O keys are only for servers, CLIs and local agents. The signed-in web product uses the JWT-protected gateway instead.

Every inference request uses `executePartnerRoute`, shared with `io-gateway` v27. The signed-in member gateway also exposes a no-dispatch preflight for route/cost explanation. The common execution path performs:

1. active workspace capacity-entitlement lookup;
2. ready/provider/model/capability/price/health/circuit filtering;
3. deterministic latest-affordable, lowest-cost or explicit selection;
4. caller-isolated idempotency fingerprinting;
5. conservative budget reservation for all allowed attempts;
6. bounded provider fallback and health evidence;
7. atomic receipt, usage, provider-cost plus exact 5.5% service-fee settlement/release and balanced ledger finalization;
8. redacted audit evidence that stores no prompt or model response.

Responses include protocol-standard bodies/events plus `x-io-request-id`, `x-io-receipt-id`, `x-io-provider`, `x-io-capacity-source`, `x-io-service-fee-bps` and rate-limit headers. Unknown, expired, revoked, wrong-scope and membership-invalid keys fail closed. SSE is emitted only after the shared route has settled, so direct upstream token forwarding remains Partial. Request cancellation does propagate through the in-flight provider fetch, releases accounting, stops fallback and leaves provider health unchanged.

The Released beta-key policy defaults to 30-day expiry, 20 requests/minute, 200/day, 2,000/month, USD 1/day and USD 10/month. Minute/day/month request counters and daily/monthly customer-charge reservations are atomic. Standard minute headers remain, and I/O-specific daily/monthly limit, remaining and reset headers are added. Browser-origin requests remain rejected.

Every CN-resident endpoint is excluded from both the member catalogue and API-key catalogue unless the workspace owner/admin accepts China processing/storage and possible training use together. OpenAI requests use a dedicated HMAC safety-identifier secret and never send a raw member ID or email.

## Deliberately bounded in the current release

The endpoint rejects rather than silently ignores unsupported reasoning controls, sampling controls, multiple choices, log probabilities, inline/base64 images, files, audio, embeddings, image generation and batches. Responses are deliberately stateless: `store:true`, `previous_response_id`, Conversations and background mode are not accepted. Function tools are schema-bounded; arbitrary built-in provider tools and remote MCP tools are not accepted through this compatibility boundary.

This boundary prevents a broad “OpenAI-compatible” claim from hiding semantic differences. Each feature will be enabled only after its route/provider capability is represented in the registry and passes conformance.

## Verification evidence

- hosted migration ledger contains 89 entries, including `20260820191501` (workspace/key policy), `20260820191544` (provider conformance), `20260820191815` (conformance FK indexes) and the later collaboration, Trust, finance and I/O-history releases;
- function grants, private-table containment, security-definer and empty-search-path contracts passed on the hosted project;
- a rolled-back hosted functional transaction passed raw-key shape, hash-only storage, allow/rate-limit behavior, counter bound, revocation and exactly-once audit checks;
- `io-gateway` v27 is active with custom JWT verification, no-dispatch route preflight and provider-fetch cancellation;
- `io-openai` v9 is active with custom-key verification, browser-origin key rejection, Chat SSE, the stateless Responses endpoint and provider-fetch cancellation;
- `io-provider-conformance` v3 is active with its reviewed custom authentication boundary, while approvals/runs remain zero;
- a live browser-origin invalid-key probe returned `403`; the equivalent server-shaped invalid-key probe returned `401`; neither loaded provider capacity or made inference traffic;
- the hosted 550-basis-point policy, fee-rounding boundary, commercial trigger, admin projection, OpenAI Luna price v2 and DeepSeek CN disclosure were verified;
- an invalid test key returned `401` with an OpenAI-shaped authentication error;
- a temporary valid `models:read` key returned `200`, rate headers and an empty entitled catalogue, then was deleted;
- provider receipts/attempts remain zero and no provider call was made;
- 68/68 TypeScript unit tests pass in the release candidate, including Chat/Responses parsing, streaming options, bounded tools, structured output, HTTPS media, key/idempotency, preflight validation, browser-origin, precise-fee, provider discovery, safety-identifier, CN-policy and provider-cancellation tests;
- hosted migration `expose_io_route_capabilities` exposes the exact verified capability flags to the server-only resolver; a post-apply query returned zero routable endpoints, preserving the commercial/conformance gate;
- no-secret hosted probes reached the active gateway and API after the cancellation deployment; both returned the expected `401` contract without entering provider routing;
- the last clean 75-migration I/O-slice replay passed 676 pgTAP assertions and the last recorded full hosted suite passed 733/733; a retained empty-database replay of the current 89-migration chain remains required.

The post-migration Security Advisor reports expected notices on private deny-by-default tables and authenticated `SECURITY DEFINER` boundaries whose bodies enforce caller membership/capability and use empty search paths. Explicit grants were verified. Four new conformance foreign-key notices were closed by hosted migration `20260820191815`. Re-evaluate these intentional notices whenever the boundary changes; see the [Supabase database linter guidance](https://supabase.com/docs/guides/database/database-linter).

## Remaining implementation

1. Run the current 89-migration chain and database contracts from an empty database in retained CI evidence.
2. Replace post-settlement SSE chunking with direct upstream token streaming and settlement on every streaming terminal path. Client cancellation already propagates through the Released in-flight provider fetch.
3. Expand the stateless Responses subset only after versioned request/response/error compatibility tests; do not enable stored continuation implicitly.
4. Publish curl, OpenAI SDK and OpenCode configuration examples without exposing keys in browser storage or Git.
5. Add anomaly suspension, rotation reminders, reviewed plan-tier limits and operator suspension evidence around the Released conservative key policy.
6. Add production live-key policy only after terms, abuse, support, billing and incident ownership are approved; the database now blocks provider activation without written onward-access evidence.
7. Have an authorized operator explicitly run one USD 0.01-capped test through the Released conformance workflow; until a run passes and commercial authorization is recorded, `/models` may correctly be empty.
8. Run streaming/tools/structured-output/vision conformance one capability at a time; code support does not make an endpoint eligible without exact evidence.

Full production/domain, browser-key, pricing and OpenAI/DeepSeek evidence is maintained in `PRODUCTION_API_COMMERCIAL_AND_PROVIDER_POLICY.md`.

## Owner input required

- approve the actual OpenAI/DeepSeek conformance click; the coded maximum is USD 0.01 per run;
- provision the selected public API hostname `api.indusorbit.com` in front of the current function URL;
- approve any future widening beyond the conservative beta policy; the initial values are already chosen and coded;
- whether a future short-lived browser-session token class should be researched; persistent keys remain server/CLI/local-agent only;
- retention, moderation and support policy for API traffic;
- approve which stored Responses/continuation features, if any, fit the privacy and retention policy; the released endpoint is stateless by design.
