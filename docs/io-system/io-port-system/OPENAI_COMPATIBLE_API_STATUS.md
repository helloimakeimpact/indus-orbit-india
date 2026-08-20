# OpenAI-compatible I/O API status

Status: **Partial**, with the bounded v1 foundation, transparent fee/commercial gate, multi-window key limits, per-key spend cap, CN workspace policy and HMAC safety identifier **Released** to the hosted Indus Orbit control plane on 20 August 2026. Provider routing remains disabled, so no paid model traffic was created.

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

| Endpoint                 | Scope required     | Released behavior                                                                                                                                                         |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /models`            | `models:read`      | Returns `io/latest-affordable`, `io/lowest-cost` and explicit `provider/model` IDs only for ready connections backed by capacity entitled to the key's workspace.         |
| `POST /chat/completions` | `inference:invoke` | Strict non-streaming text-chat subset. It accepts system/user/assistant string messages and routes through the same budget, fallback, receipt, settlement and audit core. |

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

Every chat request uses `executePartnerRoute`, shared with `io-gateway` v23. The common path performs:

1. active workspace capacity-entitlement lookup;
2. ready/provider/model/capability/price/health/circuit filtering;
3. deterministic latest-affordable, lowest-cost or explicit selection;
4. caller-isolated idempotency fingerprinting;
5. conservative budget reservation for all allowed attempts;
6. bounded provider fallback and health evidence;
7. atomic receipt, usage, provider-cost plus exact 5.5% service-fee settlement/release and balanced ledger finalization;
8. redacted audit evidence that stores no prompt or model response.

The response includes standard Chat Completions fields plus `x-io-request-id`, `x-io-receipt-id`, `x-io-provider`, `x-io-capacity-source`, `x-io-service-fee-bps` and rate-limit headers. Unknown, expired, revoked, wrong-scope and membership-invalid keys fail closed.

The Released beta-key policy defaults to 30-day expiry, 20 requests/minute, 200/day, 2,000/month, USD 1/day and USD 10/month. Minute/day/month request counters and daily/monthly customer-charge reservations are atomic. Standard minute headers remain, and I/O-specific daily/monthly limit, remaining and reset headers are added. Browser-origin requests remain rejected.

Every CN-resident endpoint is excluded from both the member catalogue and API-key catalogue unless the workspace owner/admin accepts China processing/storage and possible training use together. OpenAI requests use a dedicated HMAC safety-identifier secret and never send a raw member ID or email.

## Deliberately unsupported in v1

The endpoint rejects rather than silently ignores streaming, tools/functions, response formats, reasoning controls, sampling controls, multiple choices, log probabilities, media/audio and provider-specific generation fields. It also does not yet implement `/responses`, embeddings, images, audio or batches.

This boundary prevents a broad “OpenAI-compatible” claim from hiding semantic differences. Each feature will be enabled only after its route/provider capability is represented in the registry and passes conformance.

## Verification evidence

- hosted migration ledger contains 73 entries, including `20260820191501` (workspace/key policy), `20260820191544` (provider conformance) and `20260820191815` (conformance FK indexes);
- function grants, private-table containment, security-definer and empty-search-path contracts passed on the hosted project;
- a rolled-back hosted functional transaction passed raw-key shape, hash-only storage, allow/rate-limit behavior, counter bound, revocation and exactly-once audit checks;
- `io-gateway` v23 is active with JWT verification;
- `io-openai` v4 is active with custom-key verification and browser-origin key rejection;
- `io-provider-conformance` v1 is active with JWT verification, while approvals/runs remain zero;
- a live browser-origin invalid-key probe returned `403`; the equivalent server-shaped invalid-key probe returned `401`; neither loaded provider capacity or made inference traffic;
- the hosted 550-basis-point policy, fee-rounding boundary, commercial trigger, admin projection, OpenAI Luna price v2 and DeepSeek CN disclosure were verified;
- an invalid test key returned `401` with an OpenAI-shaped authentication error;
- a temporary valid `models:read` key returned `200`, rate headers and an empty entitled catalogue, then was deleted;
- provider receipts/attempts remain zero and no provider call was made;
- 54/54 TypeScript unit tests pass in the release candidate, including API parser/key/idempotency, browser-origin, precise-fee, provider discovery, safety-identifier and CN-policy tests;
- the authored local commercial pgTAP file contains 26 checks, but the local Docker database remains unhealthy before product migrations run. Hosted evidence is Released; the local full-suite rerun remains open.

The post-migration Security Advisor reports expected notices on private deny-by-default tables and authenticated `SECURITY DEFINER` boundaries whose bodies enforce caller membership/capability and use empty search paths. Explicit grants were verified. Four new conformance foreign-key notices were closed by hosted migration `20260820191815`. Re-evaluate these intentional notices whenever the boundary changes; see the [Supabase database linter guidance](https://supabase.com/docs/guides/database/database-linter).

## Remaining implementation

1. Repair or replace the local Supabase container runtime and run all database files from an empty 73-migration replay.
2. Add safe SSE streaming with disconnect/cancellation propagation and settlement on every terminal path.
3. Add an OpenAI Responses subset only after versioned request/response/error compatibility tests.
4. Publish curl, OpenAI SDK and OpenCode configuration examples without exposing keys in browser storage or Git.
5. Add anomaly suspension, rotation reminders, reviewed plan-tier limits and operator suspension evidence around the Released conservative key policy.
6. Add production live-key policy only after terms, abuse, support, billing and incident ownership are approved; the database now blocks provider activation without written onward-access evidence.
7. Have an authorized operator explicitly run one USD 0.01-capped test through the Released conformance workflow; until a run passes and commercial authorization is recorded, `/models` may correctly be empty.
8. Add streaming/tools/structured output/media one capability at a time, with exact model and endpoint evidence.

Full production/domain, browser-key, pricing and OpenAI/DeepSeek evidence is maintained in `PRODUCTION_API_COMMERCIAL_AND_PROVIDER_POLICY.md`.

## Owner input required

- approve the actual OpenAI/DeepSeek conformance click; the coded maximum is USD 0.01 per run;
- provision the selected public API hostname `api.indusorbit.com` in front of the current function URL;
- approve any future widening beyond the conservative beta policy; the initial values are already chosen and coded;
- whether a future short-lived browser-session token class should be researched; persistent keys remain server/CLI/local-agent only;
- retention, moderation and support policy for API traffic;
- compatibility priority: SSE Chat Completions first or Responses first.
