# I/O Terminal and OpenCode system record

Status: safe local proof implemented; advanced OpenCode-derived terminal system remains partial, 1 August 2026.

## Current truth

The Indus Orbit web application does not contain a full fork or embedded copy of OpenCode. It contains a small browser client in `src/features/io/opencode.ts` and controls in `src/features/io/IoOverview.tsx` that can reach a user-run loopback OpenCode server.

Implemented now:

- only credential-free HTTP loopback origins are accepted;
- an optional OpenCode password is kept in memory rather than persisted;
- the client checks health, creates a session and submits a prompt;
- safe I/O audit data records a completion/session reference without copying prompt, response, shell output or files into human messages;
- the UI expresses Indus Orbit modes: Observe, Plan, Build and Run.

Not implemented now:

- durable I/O session/timeline/membership state;
- OpenCode event streaming, resume, abort, fork, child sessions or task tree;
- agent/subagent configuration and permission translation;
- command, tool, MCP, LSP, formatter or repository-context UI;
- diff/review/revert, approval history, artifacts or handoffs;
- an I/O OpenAI-compatible endpoint usable as an OpenCode provider;
- authenticated local daemon registration or remote attachment;
- hosted runners, isolation, quotas, networks, secrets or recovery.

The detailed feature-by-feature plan is in `OPENCODE_ADOPTION_PLAN.md`.
