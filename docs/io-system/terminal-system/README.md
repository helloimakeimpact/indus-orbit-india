# I/O Terminal and OpenCode system record

Status: durable metadata, safe timeline and approval foundations are **Released**; cancellation, timeout and size bounds are **Verified locally**; advanced terminal operations remain open, audited 19 August 2026.

## Product boundary

I/O Port and the Indus Orbit Community are separate products on the same identity. A person may sign up and use top-level `/io` without completing Community onboarding. The terminal is an I/O workspace capability; human discussion remains in the existing Community conversation system.

The application does not embed a full fork of OpenCode. It uses a reviewed browser connector in `src/features/io/opencode.ts` for a user-run loopback OpenCode server and stores only safe lifecycle metadata in Supabase. Prompt text, generated content, commands, output, source code, file paths, passwords, endpoint URLs and provider credentials are never written to the terminal metadata tables.

## Verified local implementation

### Local OpenCode connector

- accepts only credential-free HTTP loopback origins;
- keeps the optional OpenCode password in memory;
- propagates cancellation to `POST /session/:id/abort` after cancelling the browser request;
- reads `GET /session/:id/diff` after success only to display the local changed-file count; no diff body is uploaded;
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

The same migration adds caller-bound approval request and owner-decision RPCs with bounded expiry, risk/scope classification and idempotent replay. A decision is explicitly **not** an execution grant: no browser or database call can use it to run an OpenCode command. Step-up authentication, approval UI, daemon enforcement and tool/command controls remain required before any executable approval capability is exposed.

### Evidence

- OpenCode lifecycle, daemon-abort propagation, local diff count, timeout and validation unit tests pass as part of the 54-test member suite.
- The two terminal SQL contracts contribute 49 passing assertions to the 550-assertion fresh database replay.
- Database lint reports no `public` or `private` schema errors.
- Member typecheck, production build and formatting pass.

These facts are **Released** to hosted project `jpwvgpnbkrktipwhvqss`: the three I/O migrations were applied through the exact-ledger alias-safe release helper, and the read-only release contract confirms the expected tables, RLS, grants and private-accounting containment. The browser app is still source-verified until its web build is deployed; no executable approval, provider traffic or terminal runtime content has been enabled.

## Remaining terminal code

The following capabilities are still **Planned** or **Partial**:

1. realtime/SSE timeline delivery, runtime reconnect and bounded retention/compaction of the existing ordered metadata timeline;
2. resume, reconnect, verified daemon-abort acknowledgement, fork, child sessions and task tree; Stop now invokes OpenCode abort, but its best-effort cleanup deliberately preserves the original failure and therefore does not yet prove process termination;
3. command, tool, MCP, LSP, formatter and repository-context UI;
4. step-up, approval UI, daemon-side execution enforcement and revoke/expiry handling for the existing approval request/decision boundary;
5. diff, review, revert, artifact and safe download flows;
6. explicit session invitations, role changes, revocation and human handoff;
7. retention/deletion controls and support-safe diagnostics;
8. short-lived authenticated daemon pairing, origin binding, revocation and version negotiation;
9. packaged local clients for supported operating systems;
10. an OpenAI-compatible I/O API usable by OpenCode through the same policy, budget and receipt path;
11. hosted runners with workload identity, isolation, network/filesystem policy, secrets, quotas, scheduling, observability and recovery.

Long-running agent execution must not run inside a Supabase Edge Function. Hosted execution requires a separate runner control plane and an outbound, authenticated attach protocol.

## Release sequence

1. Deploy the matching member application and run the authenticated I/O browser personas.
2. Add ordered event ingestion and creator-only resume/reconnect.
3. Add approval enforcement before exposing tools or commands.
4. Add artifacts/diffs and explicit sharing after cross-member denial tests.
5. Pair and package the local daemon.
6. Add the OpenAI-compatible I/O endpoint and hosted runners as separate reviewed releases.

The detailed feature-by-feature adoption plan remains in `OPENCODE_ADOPTION_PLAN.md`.
