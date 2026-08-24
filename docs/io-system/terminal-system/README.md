# I/O Terminal and OpenCode system record

Status: durable metadata, exact private live timeline and approval records are **Released**; the packaged loopback client, strong in-memory pairing, global SSE consumer, continued prompts, bounded task trees and full local diff review are **Verified in source and tests**; a real-daemon authenticated browser journey and web deployment remain required, audited 24 August 2026.

## Product boundary

I/O Port and the Indus Orbit Community are separate products on the same identity. A person may sign up and use top-level `/io` without completing Community onboarding. The terminal is an I/O workspace capability; human discussion remains in the existing Community conversation system.

The application does not embed a full fork of OpenCode. It uses a reviewed browser connector plus the buildable `@indus-orbit/opencode-client` package for a user-run loopback OpenCode server and stores only safe lifecycle metadata in Supabase. Prompt text, generated content, commands, output, source code, file paths, passwords, endpoint URLs and provider credentials are never written to the terminal metadata tables.

## Verified local implementation

### Local OpenCode connector

- accepts only credential-free HTTP loopback origins;
- requires an OpenCode server password of 16–1,024 characters, keeps it in tab memory only and fingerprints the credential for pairing evidence without persisting it;
- propagates cancellation to `POST /session/:id/abort` after cancelling the browser request;
- reads `GET /session/:id/diff` after success only to display the local changed-file count; no diff body is uploaded;
- retains a validated origin/session binding only in the creating browser and reconnects to the exact session through `GET /session/:id`, `/session/status`, `/todo`, `/children`, `/diff` and `/permission`; raw local content is never synchronized;
- consumes OpenCode's global `/global/event` SSE endpoint with bounded frames, session filtering, `Last-Event-ID`, exponential reconnect and a finite reconnect budget;
- treats SSE as advisory and debounces authoritative REST reconciliation for tasks, diffs and permissions after each local event, because current OpenCode releases have documented event-stream regressions;
- continues the exact local OpenCode session, renders a bounded four-level/64-session child task tree and displays complete before/after diffs locally with a 128-file/4 MiB ceiling;
- records an exact, expiring, once-scoped approval and owner decision before replying to the matching OpenCode permission ID; blanket and remembered approvals are prohibited, and critical actions remain reject-only until step-up authentication exists;
- checks server health, creates a runtime session and sends one prompt with a 45-second default request timeout;
- validates returned health, session and message shapes;
- bounds prompt/title/password/server metadata, streams responses through a 1 MiB limit and composes caller cancellation with its timeout;
- emits `created`, `completed`, `failed` and `stopped` lifecycle callbacks plus safe `runtime.connected` and `prompt.accepted` metadata events;
- keeps I/O modes—Observe, Plan, Build and Run—inside the Indus Orbit UI;
- does not insert prompts or terminal output into `direct_messages` or safe audit metadata.

### Durable session metadata

Migration `20260810010415_create_io_terminal_session_foundation.sql` adds:

- `public.io_terminal_sessions`;
- `public.io_terminal_session_members`;
- `public.io_terminal_session_events`;
- `public.io_terminal_approval_requests`;
- `public.io_terminal_approval_decisions`;
- caller-bound create, complete and list RPCs.

The local browser flow creates a durable record when OpenCode creates its runtime session and marks it completed or failed when the local run settles. The runtime origin and runtime session reference are persisted only as SHA-256 hashes. The released slice is deliberately creator-only: the membership schema exists, but invitations and sharing are not exposed until explicit invite/revoke and permission tests exist.

Migration `20260812000100_add_io_terminal_timeline_and_approval_rpcs.sql` adds ordered, replay-safe `append_my_io_terminal_event` and paged `list_my_io_terminal_events` RPCs. Payload validation accepts only constrained runtime/prompt metadata; it rejects prompts, output, commands, paths, URLs and arbitrary JSON. The member UI displays that safe timeline only.

The same migration adds caller-bound approval request and owner-decision RPCs with bounded expiry, risk/scope classification and idempotent replay. The verified web flow now binds one pending local OpenCode permission ID to one cloud request/decision and sends `once` or `reject` to the local daemon only after the recorded decision. The database decision alone remains non-executable. Critical approvals fail closed until step-up authentication is released, and a real-daemon security journey is still required before this bridge can be called Released.

Migration `20260821120706_add_private_terminal_timeline_broadcast.sql` adds an exact `io-terminal:<session UUID>` private Broadcast topic, active-session-member authorization on `realtime.messages` and an insert trigger for the already allow-listed metadata event row. The member timeline re-subscribes after refresh and re-reads the caller-bound RPC on each event. This is cloud metadata continuity, not OpenCode output streaming.

### Evidence

- OpenCode lifecycle, daemon-abort propagation, device-local binding/reconnect, strong password, continued prompt, task-tree, complete-diff, exact permission and global-SSE contracts pass as part of the 65-test member suite.
- The terminal SQL contracts contribute 54 passing assertions to the 681-assertion fresh 76-migration database replay.
- Database lint reports no `public` or `private` schema errors.
- Member typecheck, production build and formatting pass.

These facts are **Released** to hosted project `jpwvgpnbkrktipwhvqss`: the three I/O migrations were applied through the exact-ledger alias-safe release helper, and the read-only release contract confirms the expected tables, RLS, grants and private-accounting containment. The browser app is still source-verified until its web build is deployed; no executable approval, provider traffic or terminal runtime content has been enabled.

## Remaining terminal code

The following capabilities are still **Planned** or **Partial**:

1. verify SSE reconnect, event reconciliation, continuation, task trees, diffs and permission decisions against pinned real OpenCode versions in authenticated browser tests; unit fixtures are Verified, not a production compatibility guarantee;
2. verify daemon-abort acknowledgement and process termination; Stop invokes the abort route but best-effort cleanup deliberately preserves the original failure;
3. add fork creation plus command, tool-output, MCP, LSP, formatter and repository-context views; tool permission prompts are visible, but unrestricted command output is intentionally absent;
4. add re-auth/step-up for high-risk actions, revoke/expiry races and a daemon capability handshake; critical actions remain blocked;
5. add checkpoint/revert, reviewed artifact export and safe download; complete local before/after diff review is Verified;
6. add explicit session invitations, role changes, revocation and human handoff;
7. add retention/deletion controls and support-safe diagnostics;
8. replace the long-lived OpenCode server password with a short-lived, origin/audience-bound pairing token and explicit revocation; current pairing is strong, loopback-only and memory-only but remains **Partial**;
9. package the local daemon/installers for supported operating systems; the TypeScript client library is buildable and documented, but an OS installer is not;
10. configure OpenCode to use the Released OpenAI-compatible I/O endpoint and run a real entitled route after commercial/provider approval;
11. build hosted runners with workload identity, isolation, network/filesystem policy, secrets, quotas, scheduling, observability and recovery.

Long-running agent execution must not run inside a Supabase Edge Function. Hosted execution requires a separate runner control plane and an outbound, authenticated attach protocol.

## Release sequence

1. Deploy the matching member application and run the authenticated I/O browser personas.
2. Add ordered event ingestion and creator-only resume/reconnect.
3. Add approval enforcement before exposing tools or commands.
4. Add artifacts/diffs and explicit sharing after cross-member denial tests.
5. Pair and package the local daemon.
6. Add the OpenAI-compatible I/O endpoint and hosted runners as separate reviewed releases.

The detailed feature-by-feature adoption plan remains in `OPENCODE_ADOPTION_PLAN.md`.
