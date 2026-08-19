# OpenAI-compatible I/O API status

Status: **Partial**, with the bounded v1 foundation **Released** to the hosted Indus Orbit demo on 20 August 2026. Provider routing remains disabled, so this release creates no paid model traffic by itself.

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
- atomic fixed-minute counters, defaulting to 60 requests/minute and bounded to 1–600 by server configuration;
- expired/revoked-key rejection without identity disclosure;
- content-free creation, revocation and route audits;
- no browser read/write privilege on private rate windows.

`io-openai` has Supabase JWT verification disabled because an I/O API key is not a Supabase JWT. The function itself validates the exact Bearer-key shape, hashes the supplied value, calls the service-only authentication/rate RPC and checks the required scope before loading any catalogue or route. It exposes no browser CORS contract; keys are currently intended for server, CLI and local-agent use rather than client-side JavaScript.

Every chat request uses `executePartnerRoute`, shared with `io-gateway` v21. The common path performs:

1. active workspace capacity-entitlement lookup;
2. ready/provider/model/capability/price/health/circuit filtering;
3. deterministic latest-affordable, lowest-cost or explicit selection;
4. caller-isolated idempotency fingerprinting;
5. conservative budget reservation for all allowed attempts;
6. bounded provider fallback and health evidence;
7. atomic receipt, usage, settlement/release and balanced ledger finalization;
8. redacted audit evidence that stores no prompt or model response.

The response includes standard Chat Completions fields plus `x-io-request-id`, `x-io-receipt-id`, `x-io-provider`, `x-io-capacity-source` and rate-limit headers. Unknown, expired, revoked, wrong-scope and membership-invalid keys fail closed.

## Deliberately unsupported in v1

The endpoint rejects rather than silently ignores streaming, tools/functions, response formats, reasoning controls, sampling controls, multiple choices, log probabilities, media/audio and provider-specific generation fields. It also does not yet implement `/responses`, embeddings, images, audio or batches.

This boundary prevents a broad “OpenAI-compatible” claim from hiding semantic differences. Each feature will be enabled only after its route/provider capability is represented in the registry and passes conformance.

## Verification evidence

- hosted migration ledger contains version `20260819232624`;
- function grants, private-table containment, security-definer and empty-search-path contracts passed on the hosted project;
- a rolled-back hosted functional transaction passed raw-key shape, hash-only storage, allow/rate-limit behavior, counter bound, revocation and exactly-once audit checks;
- `io-gateway` v21 is active with JWT verification;
- `io-openai` v2 is active with custom-key verification;
- an invalid test key returned `401` with an OpenAI-shaped authentication error;
- a temporary valid `models:read` key returned `200`, rate headers and an empty entitled catalogue, then was deleted;
- provider receipts/attempts remain zero and no provider call was made;
- 50/50 TypeScript unit tests pass, including four API parser/key/idempotency tests;
- the authored local pgTAP file contains 24 checks, but the local Docker database was unhealthy before that file could run. Hosted evidence is Released; the local full-suite rerun remains open.

The post-migration Security Advisor reports three expected notices on this slice: the private rate table has no RLS policy, intentionally making it service-only, and the two authenticated key-lifecycle functions are `SECURITY DEFINER`, intentionally providing narrow owner/admin mutation boundaries. Explicit grants, empty search paths, `auth.uid()` and active-role checks were verified. There is no performance notice on the new objects. Re-evaluate these exceptions whenever the boundary changes; see the [Supabase database linter guidance](https://supabase.com/docs/guides/database/database-linter).

## Remaining implementation

1. Repair or replace the local Supabase container runtime and run all 15 database files from an empty 69-migration replay.
2. Add safe SSE streaming with disconnect/cancellation propagation and settlement on every terminal path.
3. Add an OpenAI Responses subset only after versioned request/response/error compatibility tests.
4. Publish curl, OpenAI SDK and OpenCode configuration examples without exposing keys in browser storage or Git.
5. Add per-plan/key quotas, burst and daily/monthly limits, anomaly controls, key rotation and operator suspension evidence.
6. Add production live-key policy only after terms, abuse, support, billing and incident ownership are approved.
7. Run provider-specific conformance and activate one bounded provider route with an explicit spend ceiling; until then `/models` may correctly be empty.
8. Add streaming/tools/structured output/media one capability at a time, with exact model and endpoint evidence.

## Owner input required

- first provider and maximum conformance spend;
- public API hostname (`api.indusorbit.com` or the current Supabase function URL behind a proxy);
- test/live key expiry and per-minute/day/month quotas by user plan;
- whether browser-origin calls are ever allowed; current safe default is server/CLI/local agent only;
- retention, moderation and support policy for API traffic;
- compatibility priority: SSE Chat Completions first or Responses first.
