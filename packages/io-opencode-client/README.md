# @indus-orbit/opencode-client

Device-local, loopback-only OpenCode client used by I/O Terminal. It provides:

- in-memory Basic-auth pairing and a non-secret credential fingerprint;
- bounded JSON and SSE decoding with reconnect and `Last-Event-ID` support;
- OpenAPI capability negotiation with fail-closed advanced actions;
- continued prompts, task/child-session trees, bounded message/tool/command trails and full local diffs;
- acknowledged abort, local fork and checkpoint revert/restore operations;
- pending-permission reconciliation and confirmation-bound once/reject replies.

The client never persists a password and never uploads prompts, output, code, paths or diffs. It is not a remote-shell client. Launch OpenCode on loopback with a strong `OPENCODE_SERVER_PASSWORD`, enter that password in the I/O page for the current tab, and configure the OpenCode CORS allowlist for the exact Indus Orbit origin.

Current OpenCode versions have had SSE regressions. Consumers must reconcile durable state through the REST methods after reconnect and may not treat an event as an execution authorization.

Mutation methods require the daemon's documented success acknowledgement. A browser cancellation is not represented as a stopped daemon session unless `/session/:id/abort` returns `true`. Fork and revert controls should be exposed only after `negotiateCapabilities()` confirms the exact OpenAPI operations.
