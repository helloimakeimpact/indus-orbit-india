# I/O transport core

This private package is the first code boundary for selectively adopting useful,
MIT-licensed translation patterns from 9router without adopting its product,
credential store, dashboard, commercial assumptions or fallback policy.

It currently provides:

- a bounded incremental SSE frame decoder;
- fatal incremental UTF-8 byte decoding across arbitrary network boundaries;
- strict JSON and terminal-frame decoding;
- loss-aware finish-reason normalization;
- fail-closed translation loss-policy enforcement;
- provider-native usage normalization that keeps cached, cache-created and
  reasoning dimensions separate;
- loss-aware OpenAI Chat to Anthropic Messages and stateless Responses request
  translators, plus Anthropic/Responses JSON and SSE to OpenAI Chat translators;
- iterative, recursion-safe JSON validation with depth, node, container and
  UTF-8 string-byte limits; and
- typed, immutable, versioned translator descriptor factories for a future
  execution adapter.

The reviewed descriptor factory returns only `unregistered` descriptors. The
registry rejects those descriptors, and this package exports no live or default
registry. Provider conformance and strict loss-policy review must produce an
explicitly `approved` descriptor before it can enter an execution allow-list.
Translation results retain their loss records; callers must pass them through
the fail-closed loss-policy enforcement boundary. The response stream state
machines cover role, text, refusal, tool-call, usage, terminal and invalid-order
events. Chat-to-Responses preserves remote and base64 image inputs instead of
silently dropping them.

Untrusted translator payloads reject cyclic or aliased objects, accessors,
symbols, sparse arrays, class instances, non-finite numbers and inputs beyond
the configured structural limits. Individual translated strings are bounded by
UTF-8 bytes rather than JavaScript code units.

The package deliberately performs no network access, credential handling,
routing, billing, persistence, logging or retries. Those remain owned by the I/O
gateway and its policy, entitlement, budget, settlement, receipt and circuit
boundaries.

See `docs/io-system/io-port-system/NINEROUTER_SELECTIVE_ADOPTION.md` for the
selection matrix and rollout gates.
