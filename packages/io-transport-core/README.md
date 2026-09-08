# I/O transport core

This private package is the first code boundary for selectively adopting useful,
MIT-licensed translation patterns from 9router without adopting its product,
credential store, dashboard, commercial assumptions or fallback policy.

It currently provides:

- a bounded incremental SSE frame decoder;
- strict JSON and terminal-frame decoding;
- loss-aware finish-reason normalization;
- provider-native usage normalization that keeps cached, cache-created and
  reasoning dimensions separate; and
- typed, allow-listed translator descriptors for a future execution adapter.

The package deliberately performs no network access, credential handling,
routing, billing, persistence, logging or retries. Those remain owned by the I/O
gateway and its policy, entitlement, budget, settlement, receipt and circuit
boundaries.

See `docs/io-system/io-port-system/NINEROUTER_SELECTIVE_ADOPTION.md` for the
selection matrix and rollout gates.
