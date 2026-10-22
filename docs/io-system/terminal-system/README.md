# I/O Terminal and OpenCode system record

Status updated **22 October 2026: Partial**. Durable safe metadata/RLS records have prior hosted release evidence. The typed connector, request deadlines, cancellation, local inspection and permission classification have source-test evidence. **Runtime mode enforcement is not complete.** The web UI now pauses execution, continuation, grants, commands, fork and checkpoint mutations until a pinned runtime policy is bound and verified; inspection, private handoff and rejection remain available. See [the current code remainder](../CODE_LEVEL_REMAINDER_2026-10-22.md). Earlier fixture tests did not establish runtime enforcement or full real-version compatibility.

The latest owner direction makes **Messaging + Terminal the two main offerings**. The DeepSeek Harness fork is a separate native Terminal workstream, updated to official `dsh-v0.2.1-rc.2` (`687f282e8625c6b8d11ff58211a90524be2e4317`) in an isolated checkout. It does not speak the existing OpenCode web protocol by implication. Branded source is not a signed public installer.

## Product boundary

I/O Port and the Indus Orbit Community are separate products on the same identity. A person may sign up and use top-level `/io` without completing Community onboarding. The terminal is an I/O workspace capability; human discussion remains in the existing Community conversation system.

The application does not embed a full fork of OpenCode. It uses a reviewed browser connector plus the buildable `@indus-orbit/opencode-client` package for a user-run loopback OpenCode server and stores only safe lifecycle metadata in Supabase. Prompt text, generated content, commands, output, source code, file paths, passwords, endpoint URLs and provider credentials are never written to the terminal metadata tables.

## Connector source and historical fixture evidence

### Local OpenCode connector

- accepts only credential-free HTTP loopback origins;
- requires an OpenCode server password of 16–1,024 characters, keeps it in tab memory for at most 15 minutes and fingerprints the credential for pairing evidence without persisting it;
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
- filters emitted permission requests against intended Observe/Plan/Build/Run profiles; this does **not** constrain a daemon that already allows a tool. Unknown/composite/critical/external requests fail closed, and the current web execution pause prevents granting any request until runtime enforcement is verified;
- reads the live daemon command and visible-agent catalogues, pins configured command agents, requires an exact one-time confirmation that expires after five minutes, and consumes the review before calling `POST /session/:id/command`;
- offers an explicit private JSON handoff download containing the locally visible task tree, timeline and full diffs; the member is warned that it contains private code/output and no handoff content is uploaded to Supabase;
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

### Historical evidence - 7 September checkpoint

- OpenCode lifecycle, daemon-abort propagation, device-local binding/reconnect, expiring in-memory credential, mode policy, continued prompt, task-tree, complete-diff, exact permission, reviewed-command and global-SSE contracts pass as part of the 107-test member suite.
- The complete fresh local database replay applies 118 migrations and passes 25 pgTAP files/830 assertions.
- Database lint reports no `public` or `private` schema errors.
- Member typecheck, production build and formatting pass.

These durable facts are **Released** to hosted project `jpwvgpnbkrktipwhvqss`: the three I/O migrations were applied through the exact-ledger alias-safe release helper, and the read-only release contract confirms the expected tables, RLS, grants and private-accounting containment. The member web app is deployed and the URL-backed Terminal surface was manually verified to survive reload on 6 September. Real-daemon approval/abort behavior remains test-verified rather than production-verified; no provider traffic or terminal runtime content has been enabled.

## Remaining terminal code

[The current finite engineering plan](../CODE_LEVEL_REMAINDER_2026-10-22.md) is authoritative. Launch priorities are:

1. Bind/verify actual runtime/session policy across initial prompts, continuation, commands, child tasks, forks and config races; prove denied operations have no effect with a real pinned runtime.
2. Correct real OpenAPI path-parameter and diff-shape compatibility; run real health/auth/SSE/output/permission/abort/command journeys.
3. Implement owned, expiring origin-bound pairing/revocation, then review desktop identity, update/service endpoints, packaging/signing, platform/recovery tests and a real download manifest.
4. Integrate an authorized provider route and keep raw local prompts/output/code/credentials outside the cloud metadata plane.
5. Complete assisted privacy/recovery, explicit session sharing only with its own authorization tests, and any advertised advanced tools. Hosted runners remain separately scoped.

The 15-minute browser credential lease and the application execution pause are limited controls. Neither is daemon-issued policy enforcement, a sandbox around independently operated software, nor proof of a signed installer.

Long-running agent execution must not run inside a Supabase Edge Function. Hosted execution requires a separate runner control plane and an outbound, authenticated attach protocol.

## Release sequence

Finish runtime policy and protocol work before enabling execution. Review/test the native Harness independently, publish truthful source-preview/download labels, rehearse genuine services/personas on staging, and promote matching application/backend versions after release review. Preserve the [historical adoption plan](OPENCODE_ADOPTION_PLAN.md) for provenance; its old enforcement assertions are superseded by this audit and the current code remainder.
