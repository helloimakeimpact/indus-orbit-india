# Selective 9router adoption for I/O Port

Status: **Phases 0–2 Verified at their local package boundaries and Phase 3 Partial locally on 9 September 2026.** The upstream source was
reviewed at pinned commit `eb712ca821f0ba6bc41043fbd14494c5af5daba5`
(`v0.5.69`). A dependency-free I/O transport package contains the selected,
adapted and attributed primitives. A separate private execution-adapter package
contains a fail-closed streaming network kernel. Neither package is wired
to a live route. No 9router provider credential, OAuth flow, dashboard,
database, route, price or paid request is active in I/O.

## Decision

Do not replace I/O Port with 9router and do not deploy 9router as the I/O cloud
gateway. Reuse a small reviewed subset as an internal transport kernel beneath
I/O's existing control plane and, later, inside the packaged local I/O client.

The product boundary is:

```text
I/O client
  -> I/O identity, workspace, policy, entitlement and budget boundary
    -> private I/O execution adapter
      -> allow-listed translation/SSE adapter
        -> commercially approved provider endpoint
    <- authoritative provider usage
  <- atomic settlement, receipt, evidence and safe response
```

In personal-relay mode, the final two steps run on the member's device. The I/O
service receives only explicitly shared, redacted lifecycle/evidence metadata;
it never receives the member's local provider credential, prompt, output, code
or terminal password.

## Why selective adoption is correct

9router is a capable local router. Its own architecture describes one
OpenAI-compatible endpoint, request/response translation, streaming, provider
executors, account/model fallback, local persistence and optional cloud sync.
Those are useful implementation references. They are not a substitute for I/O's
workspace authorization, residency/retention policy, commercial approval,
pre-dispatch budget reservation, integer-nano settlement, 5.5% fee evidence,
RLS, audit and member/admin separation.

The reviewed translator tree is also not a standalone library. Its barrel and
stream path import provider registries, session/signature stores, account state,
proxy behavior and `usageDb`. Copying the directory wholesale would silently
import product and security decisions that conflict with I/O.

## Exact selection matrix

| Upstream area                                                | Decision                           | I/O destination                                    | Required change before use                                                                                                                      |
| ------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `open-sse/translator/schema/*` and `formats.js`              | Adopt concepts                     | `packages/io-transport-core`                       | Convert to strict TypeScript, remove globals, treat unknown values as unknown rather than success.                                              |
| `translator/concerns/finishReason.js`                        | Adapted in Phase 0                 | `normalizeFinishReason`                            | Preserve refusal/filter and unknown outcomes; never convert an unfamiliar provider failure to `stop`.                                           |
| `translator/concerns/usage.js`                               | Adapted in Phase 0                 | `normalizeTransportUsage`                          | Keep input, output, cache-read, cache-write and reasoning units separate; no price or total-cost assumption in the translator.                  |
| `utils/streamHelpers.js` and narrow SSE framing ideas        | Adapted in Phase 0                 | `SseFrameDecoder` and `decodeJsonSseFrame`         | Incremental CRLF-safe framing, byte bounds, no console/body logging, strict malformed-frame failure.                                            |
| OpenAI Chat ↔ Anthropic request/response translators         | Adapted in Phase 1; unregistered   | versioned translator descriptors                   | Loss-aware pure transforms now cover text/tools/images/system/developer roles and terminal events; conformance and loss-policy approval remain. |
| OpenAI Chat ↔ Responses translators                          | Adapted in Phase 1; unregistered   | versioned translator descriptors                   | Remote/base64 input images, tool lifecycle, refusal, usage and ordered terminal events are covered; item-ID loss is explicit.                   |
| OpenAI Chat ↔ Gemini translators                             | Select with conditions for Phase 2 | Gemini native adapter                              | Remove session/signature global stores; inject request-scoped state; require official Gemini conformance and exact usage evidence.              |
| Ollama translation                                           | Select for local Phase 3           | packaged personal relay                            | Loopback-only, local credentials/configuration, explicit capability discovery and no cloud credential sync.                                     |
| `utils/stream.js`                                            | Do not copy wholesale              | none                                               | It imports app usage/logging and combines transport with persistence. Port only independently tested pure state machines.                       |
| `translator/index.js`                                        | Do not copy wholesale              | none                                               | It imports provider/session/cloaking behavior. I/O uses an explicit duplicate-free allow-list registry instead.                                 |
| `executors/default.js`                                       | Design reference only              | private Node execution adapter                     | Rebuild with I/O timeouts, abort, URL allow-list, service identity, bounded bodies and redacted errors.                                         |
| provider-specific executors                                  | Deferred per provider              | separate adapter modules                           | One contract/terms/security review and conformance suite per provider; no blanket activation.                                                   |
| provider registry/model/pricing files                        | Discovery seed only                | review queue, never runtime truth                  | Official source, observed/effective date, reviewer and contract state are mandatory before activation.                                          |
| combo/account fallback                                       | Reject as policy source            | existing I/O route selector/circuit                | I/O retries only classified transient failures and reserves worst-case cost before dispatch. Client/4xx errors cannot poison accounts.          |
| OAuth, browser-cookie and subscription pooling               | Reject for managed I/O             | none                                               | MIT covers code, not provider terms, token resale or onward access.                                                                             |
| SQLite/JSON API-key, token, usage and request-log stores     | Reject                             | Supabase server boundaries/local OS keychain later | No plaintext cloud token store and no prompt/body log. Money remains integer nanos.                                                             |
| dashboard, Next routes, sync/tunnel and host-process helpers | Reject                             | none                                               | I/O retains its branded member/admin surfaces and separate deployment architecture.                                                             |
| RTK/headroom content reduction                               | Deferred, local opt-in only        | packaged client experiment                         | It changes content semantics. Any use must be visible, reversible and recorded as transformed content; never the managed default.               |

## Phase 0 — provenance and transport boundary

State: **Verified locally.** Implemented now:

- `packages/io-transport-core` is independently buildable and performs no
  network, credential, routing, billing, persistence, retry or logging work;
- bounded incremental SSE framing and strict JSON terminal-frame decoding;
- loss-aware finish-reason and separate-dimension usage normalization;
- explicit typed transport descriptors and a duplicate-free allow-list;
- a packaged MIT notice pinned to the reviewed upstream commit; and
- loss-aware OpenAI Chat → Anthropic/Responses request translators plus
  Anthropic/Responses JSON and stream → OpenAI Chat translators that remain
  deliberately unregistered until loss-policy review/conformance is complete;
  and
- 28 focused regression tests plus inclusion in the root verification gate.

Exit evidence: package build and 28/28 focused contracts pass. This is not yet a
production provider adapter and therefore does not change hosted traffic.

## Phase 1 — pure Chat, Responses and Anthropic translators

State: **Verified locally at the pure-translation boundary.** The Anthropic and Chat/Responses request, JSON response and
response-stream state machines, tool mapping, image-input preservation, refusal,
separate cache/reasoning usage dimensions, deterministic output and explicit
loss reports are implemented. Fatal incremental UTF-8 decoding is exercised at
every byte split, and the explicit loss policy fails closed. Bounded iterative
JSON validation rejects oversized/deep structures, cycles/aliases, sparse
arrays, accessors, symbols, class instances and non-finite values. Versioned,
immutable descriptors remain deliberately unregistered. Provider conformance
and approval of each declared loss remain activation gates, not missing pure
translator code.

Code work and state:

1. **Done for both selected pairs:** bounded request, content-part, tool-call and
   stream-event validation.
2. **Done:** pure OpenAI Chat → Anthropic/Responses requests and
   Anthropic/Responses JSON/SSE → OpenAI Chat transforms. Descriptor registration
   remains deliberately off.
3. **Done at the transform boundary:** machine-readable loss reports for source
   features with no safe target representation plus an explicit allow-list
   enforcement function that rejects every unapproved loss.
4. **Done:** deterministic fixtures cover text, developer/system roles,
   tool calls/results, JSON schema, remote image preservation, refusals, usage,
   terminal order, every UTF-8 byte split, malformed/oversized streams and
   adversarial nested JSON. Cancellation belongs to the execution adapter rather
   than a side-effect-free transform.
5. **Done at this boundary:** the Responses image-loss regression has a direct
   fixture. Provider failure classification belongs to the outer execution
   boundary; the new adapter distinguishes rate limits, provider/client and
   provider/server outcomes without choosing fallback.

Exit criteria: round-trip invariants pass where lossless; intentional losses are
declared; zero network/persistence side effects; mutation and fuzz tests cover
frame boundaries and adversarial JSON.

## Phase 2 — private I/O execution adapter

State: **Verified locally at the isolated package boundary.**
`packages/io-execution-adapter` implements a small injected-fetch kernel with 15
focused contracts. It issues and verifies
short-lived HMAC route grants that bind workspace/request/policy/provider/
endpoint/model/capabilities/content type/body hash and maximum cost; resolves
credentials only through an injected server-side resolver; enforces exact-host
HTTPS, no redirects, byte/time/cancel/concurrency limits and authority/header
separation; consumes each grant through an atomic replay-store interface;
streams bounded response bytes with timeout/caller/consumer cancellation; and
returns fixed redacted error classes. It makes no route, retry, fallback,
billing, receipt, persistence or logging decision.

Code work:

1. **Done at package boundary:** the independently buildable Node 22 streaming
   kernel exists. A deployable HTTP/process wrapper remains environment work.
2. **Done at package boundary:** body-bound route grants, workload assertions
   and an atomic one-use replay-store interface exist. Production must supply a
   shared durable replay-store implementation and independent signing service.
3. **Verified in package:** provider secrets resolve server-side; exact-host
   HTTPS, no redirects, byte/time/cancel/concurrency limits and header-authority
   separation are enforced. Production additionally needs DNS/IP egress
   enforcement outside application code.
4. **Partial:** bounded direct byte streaming and fixed error classes exist;
   translator event wiring, authoritative provider-usage adapters and upstream
   request-ID normalization remain at integration/provider layers.
5. **Maintained:** entitlement, route choice, retry, budget, billing and receipts
   stay in the existing I/O outer gateway.

Exit criteria: mTLS or rotating HMAC service-auth tests, SSRF-negative tests,
disconnect/cancel tests, no-body log inspection and failure-injection evidence.

## Phase 3 — gateway integration without changing commercial truth

State: **Partial locally and off by default.** The current Edge-direct and
translation versions are added to route audit/receipt policy evidence. A strict
provider/capability fixture-shadow flag and content-free comparator exist for
already materialized, explicitly non-billable fixtures. No function invokes a
candidate translator or network shadow path, and no live route changed.

Code work:

1. Add `execution_adapter_version` and `translation_version` to conformance and
   receipt evidence.
2. Put the adapter behind a provider/capability-scoped feature flag.
3. Shadow only non-billable fixtures first; compare the current and new
   translators without returning shadow output to members.
4. Canary one commercially authorized provider/model/capability at a time.
5. Preserve no-fallback-after-first-byte, exact-once settlement, no-charge on
   failure and existing circuit behavior.

Exit criteria: identical policy/budget decisions, reconciled usage and invoices,
provider-specific conformance, rollback in one operator action and a soak test.

## Phase 4 — packaged local personal relay

Code work:

1. Add the transport core to the existing `io-opencode-client` package or a
   sibling signed runtime after the package boundary stabilizes.
2. Store provider credentials in the OS keychain, never browser storage or I/O
   cloud. Bind a daemon-issued, short-lived token to loopback origin and session.
3. Offer explicit modes: local model/Ollama, personal provider API key, or I/O
   managed capacity. The UI must show which boundary is active before execution.
4. Reuse the existing OpenCode SSE, task-tree, diff and approval client without
   mixing provider stream events into terminal audit records.
5. Add signed macOS/Windows/Linux installers and a pinned OpenCode/runtime matrix.

Exit criteria: real-daemon journey on each supported OS, keychain and revocation
tests, offline recovery, updater-signature verification and no cloud secret leak.

## Phase 5 — provider and modality expansion

Expand only through provider-specific contracts:

- OpenAI and DeepSeek first, after written onward-access approval and the capped
  conformance run;
- then Gemini, Groq and xAI using official API-key/partnership routes;
- Anthropic-compatible translation after its own agreement and conformance;
- Ollama/self-hosted/donated capacity only through an attested local or isolated
  capacity boundary; and
- embeddings, image, audio, transcription and search as separate capability and
  billing dimensions, not a generic chat flag.

Every activation requires contract status, permitted customer/processing/storage
regions, retention/no-training basis, price version, capability version, health,
circuit, quota, settlement and rollback evidence.

## Phase 6 — upkeep and upstream intake

- Pin upstream commits; never import from a moving branch.
- Run a scheduled upstream diff report, dependency/security scan and license
  notice check, but require a human-reviewed patch queue.
- Re-run all translator fixtures before accepting an upstream change.
- Keep I/O-specific security fixes in small patches that can be compared and
  retired when upstream becomes safe.
- Do not claim official affiliation with 9router.

## Responsibilities

| Work                                      | Engineering can do                            | Owner/external input                                                                                      |
| ----------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Pure transport/translation code and tests | Yes                                           | None after this architecture is accepted.                                                                 |
| Managed provider network adapter          | Yes                                           | Production runtime/hosting budget and security owner before launch.                                       |
| Provider activation                       | Only fail-closed scaffolding                  | Written onward-access terms, regions/retention/no-training approval, secret and one capped call approval. |
| Local personal relay                      | Client code and fixtures                      | Supported operating systems, signing identities and exact provider terms for personal-account use.        |
| Pricing/billing                           | Normalize usage and enforce approved versions | Provider price evidence, accountant/legal tax/FX/refund approval and Razorpay credentials.                |
| Donated capacity                          | Isolation and attestation code                | Donor agreement, acceptable-use, privacy, quota and incident ownership.                                   |

## Explicit non-goals

- no 9router iframe, dashboard reskin or wholesale replacement;
- no shared provider subscription-token pool in I/O cloud;
- no browser JavaScript provider secrets;
- no fallback based only on unknown error text;
- no pricing or model availability copied into the live registry without
  official, dated evidence; and
- no claim that an MIT software license authorizes provider resale.
