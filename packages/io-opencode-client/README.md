# @indus-orbit/opencode-client

Device-local, loopback-only OpenCode client used by I/O Terminal. It provides:

- in-memory Basic-auth pairing and a non-secret credential fingerprint;
- bounded JSON and SSE decoding with reconnect and `Last-Event-ID` support;
- continued prompts, task/child-session trees and full local diffs;
- pending-permission reconciliation and confirmation-bound once/reject replies.

The client never persists a password and never uploads prompts, output, code, paths or diffs. It is not a remote-shell client. Launch OpenCode on loopback with a strong `OPENCODE_SERVER_PASSWORD`, enter that password in the I/O page for the current tab, and configure the OpenCode CORS allowlist for the exact Indus Orbit origin.

Current OpenCode versions have had SSE regressions. Consumers must reconcile durable state through the REST methods after reconnect and may not treat an event as an execution authorization.
