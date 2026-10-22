# @indus-orbit/opencode-client

Device-local, loopback-only OpenCode client used by I/O Terminal. It provides:

- in-memory Basic-auth pairing and a non-secret credential fingerprint;
- bounded JSON and SSE decoding with reconnect and `Last-Event-ID` support;
- OpenAPI capability negotiation with fail-closed advanced actions;
- continued prompts, task/child-session trees, bounded message/tool/command trails and full local diffs;
- bounded command/agent catalogue decoding plus exact, five-minute, one-time reviewed command execution;
- acknowledged abort, local fork and checkpoint revert/restore operations;
- pending-permission reconciliation and confirmation-bound once/reject replies.

Every JSON request has a 45-second deadline covering both the fetch and the bounded response-body read. A caller can set `requestTimeoutMs` to an integer from 1 to 120,000 milliseconds when constructing the client. Cancellation aborts the actual fetch signal, cancels an active response reader and releases its lock. The returned operation still settles if an injected transport ignores abort; a late response body is cancelled. Successful requests clear their deadline. SSE subscriptions are separate, long-lived, caller-cancelled streams with bounded frames and reconnect reconciliation.

A timed-out write has an uncertain daemon outcome. The client does not retry it, change its session identifier or replay its prompt/command. Reconcile daemon state before deciding whether another action is needed. A timeout is never an acknowledgement that execution stopped.

The client never persists a password and never uploads prompts, output, code, paths or diffs. It is not a remote-shell client. Launch OpenCode on loopback with a strong `OPENCODE_SERVER_PASSWORD`, enter that password in the I/O page for the current tab, and configure the OpenCode CORS allowlist for the exact Indus Orbit origin.

Current OpenCode versions have had SSE regressions. Consumers must reconcile durable state through the REST methods after reconnect and may not treat an event as an execution authorization.

Mutation methods require the daemon's documented success acknowledgement. A browser cancellation is not represented as a stopped daemon session unless `/session/:id/abort` returns `true`. Fork, revert and command controls should be exposed only after `negotiateCapabilities()` confirms the exact OpenAPI operations. A command must exist in the live `/command` catalogue, use a visible `/agent`, match the exact reviewed payload and execute once before its five-minute review expires. This review is a user-experience invariant; actual filesystem, shell and network authority must still be enforced by OpenCode's permission system.

Permission classification uses exact reviewed names from the [official OpenCode permission registry](https://opencode.ai/docs/permissions/) and [tool registry](https://opencode.ai/docs/tools/) (reviewed 22 October 2026), plus explicit legacy aliases. Unrecognized/custom/composite names and the `doom_loop` safety guard are critical and reject-only; they cannot inherit read access from a substring or from a caller-supplied lower risk. External-directory requests are also reject-only in this client. Both the product policy and the final permission reply enforce this boundary.
