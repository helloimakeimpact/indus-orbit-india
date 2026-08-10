# I/O Terminal and OpenCode system record

Status: durable metadata foundation and local OpenCode lifecycle are **Verified locally**; hosted release and advanced terminal operations remain open, 10 August 2026.

## Product boundary

I/O Port and the Indus Orbit Community are separate products on the same identity. A person may sign up and use top-level `/io` without completing Community onboarding. The terminal is an I/O workspace capability; human discussion remains in the existing Community conversation system.

The application does not embed a full fork of OpenCode. It uses a reviewed browser connector in `src/features/io/opencode.ts` for a user-run loopback OpenCode server and stores only safe lifecycle metadata in Supabase. Prompt text, generated content, commands, output, source code, file paths, passwords, endpoint URLs and provider credentials are never written to the terminal metadata tables.

## Verified local implementation

### Local OpenCode connector

- accepts only credential-free HTTP loopback origins;
- keeps the optional OpenCode password in memory;
- checks server health, creates a runtime session and sends one prompt;
- validates returned health, session and message shapes;
- emits `created`, `completed` and `failed` lifecycle callbacks;
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

Approval tables are present as a schema foundation, but browsers cannot directly create decisions. A trusted decision RPC, step-up policy and approval UI are still required before this becomes an executable approval system.

### Evidence

- OpenCode lifecycle and validation unit tests pass as part of the 43-test member suite.
- The terminal SQL contract contributes 24 passing assertions to the 516-assertion fresh database replay.
- Database lint reports no `public` or `private` schema errors.
- Member typecheck, production build and formatting pass.

These facts are **Verified**, not **Released**: the two new migrations and the updated gateway have not yet been applied to hosted project `jpwvgpnbkrktipwhvqss` because the Supabase CLI has no active access token in this environment.

## Remaining terminal code

The following capabilities are still **Planned** or **Partial**:

1. ordered event ingestion and realtime/SSE timeline rendering;
2. resume, reconnect, abort, fork, child sessions and task tree;
3. command, tool, MCP, LSP, formatter and repository-context UI;
4. trusted approval request/decision RPCs, expiry, step-up and execution enforcement;
5. diff, review, revert, artifact and safe download flows;
6. explicit session invitations, role changes, revocation and human handoff;
7. retention/deletion controls and support-safe diagnostics;
8. short-lived authenticated daemon pairing, origin binding, revocation and version negotiation;
9. packaged local clients for supported operating systems;
10. an OpenAI-compatible I/O API usable by OpenCode through the same policy, budget and receipt path;
11. hosted runners with workload identity, isolation, network/filesystem policy, secrets, quotas, scheduling, observability and recovery.

Long-running agent execution must not run inside a Supabase Edge Function. Hosted execution requires a separate runner control plane and an outbound, authenticated attach protocol.

## Release sequence

1. Apply and verify the terminal migration in the hosted Supabase project.
2. Deploy the matching member application only after the schema exists.
3. Add ordered event ingestion and creator-only resume/reconnect.
4. Add approval enforcement before exposing tools or commands.
5. Add artifacts/diffs and explicit sharing after cross-member denial tests.
6. Pair and package the local daemon.
7. Add the OpenAI-compatible I/O endpoint and hosted runners as separate reviewed releases.

The detailed feature-by-feature adoption plan remains in `OPENCODE_ADOPTION_PLAN.md`.
