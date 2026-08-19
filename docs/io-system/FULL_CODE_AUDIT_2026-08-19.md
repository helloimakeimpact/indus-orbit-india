# Indus Orbit full code audit and finalization record

Status: completed 19 August 2026. This record covers the member/public application, the separate admin application, the shared Supabase data plane, I/O Port, the local OpenCode terminal connector and the branded conversation system.

The words in this record are deliberate:

- **Released** — deployed to the linked demo and checked there.
- **Verified** — implemented and checked locally, but not yet proved in the hosted environment.
- **Partial** — useful implementation exists, but the named production contract is incomplete.
- **Planned** — design exists but the operational feature does not.
- **Blocked** — a named external dependency prevents the next safe step.

## Executive result

The codebase is a substantial, coherent demo platform, not a production-complete service. Its strongest foundations are product separation, caller-bound Supabase RPCs and RLS, the provider registry and deterministic gateway, reserve/settle accounting, durable safe terminal metadata, Chapter/Mission Spaces, and a separate scoped admin control plane.

This audit closed five high-impact gaps:

1. Unknown and nested admin URLs now fail closed instead of inheriting access accidentally.
2. Direct-message history now has a caller-bound, deterministic keyset-pagination RPC instead of loading the complete relationship history into the browser.
3. The local OpenCode connector now has caller cancellation, a 45-second default timeout, bounded inputs and a 1 MiB response limit. A cancelled request is durably recorded as `stopped` when a session already exists.
4. Provider success responses are streamed through a 2 MiB limit and must contain valid JSON. Provider error bodies are not parsed or exposed.
5. Both repositories now have reproducible quality evidence; the admin repository also has a GitHub Actions quality gate and unknown-route contract tests.

No paid provider request, provider activation, secret read or destructive hosted database operation was performed.

## Audited state by system

| System                          | State    | Evidence                                                                                                                                                                    | Remaining boundary                                                                                                                               |
| ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public site and brand           | Partial  | Public information, people, work, writing, S.O.D.A., contact and I/O Port routes share the Indus Orbit design system.                                                       | Final editorial/legal claims, metadata, accessibility, analytics consent and production hosting.                                                 |
| Identity and product separation | Partial  | A new account can use `/io` without Community onboarding; Community onboarding remains an explicit opt-in for `/app`.                                                       | Production auth providers, recovery, session controls, abuse protection, privileged MFA and browser personas.                                    |
| Global location                 | Released | Optional country-first, purpose-bound location data is in the demo with private records and consent withdrawal.                                                             | Retention, translations, safe aggregate operations and jurisdiction review.                                                                      |
| Community and trust             | Partial  | Profiles, connections, endorsements, reports, Chapters, Missions and member foundations exist.                                                                              | Central visibility/block state, transactional operator commands, appeal/concurrency behavior and E2E personas.                                   |
| Chapter/Mission Spaces          | Partial  | Branded Space/Room shell, messages, memberships, read state and supporting collaboration schema are Released.                                                               | Threads UI, Boards, role/Room administration, attachments, moderation, search/paging and browser personas.                                       |
| Direct conversations            | Verified | Send/read boundary and Realtime reconciliation are Released; bounded 50-row keyset history and Load earlier UI pass local migration and contract tests.                     | Deploy migration `20260819141915`; then add blocks, shared cross-surface cache, private Broadcast, attachments, retention and E2E/load tests.    |
| I/O Port member UI              | Partial  | Separate public and authenticated surfaces, workspaces, dynamic route/model choice, budgets, receipts, audit and terminal history exist.                                    | Host the web build; add preflight/candidate explanation, richer history, credits/invoices, health detail and browser journeys.                   |
| Provider registry/router        | Partial  | Five staged providers and normalized model/endpoint/capability/price/control records are Released; routing is deterministic and fail closed.                                | Conformance runner and approval evidence, one-at-a-time activation, live probes, policy snapshots and reviewed provider/legal facts.             |
| I/O gateway                     | Partial  | Hosted v20 has JWT, entitlement, idempotency, hard reserve, bounded fallback, atomic settlement, circuits, redacted receipts and bounded/validated provider success bodies. | Add streaming, tool/structured/media contracts, cancellation propagation and provider conformance.                                               |
| Accounting and capacity         | Partial  | Integer-minor-unit budgets, reservations, usage, balanced ledger, expiry and member/admin views are Released.                                                               | Controlled concurrency evidence, invoices/credits/refunds/tax/FX, donated-capacity policy and provider-bill reconciliation.                      |
| Local OpenCode terminal         | Partial  | Loopback/password boundary, health/session/message flow, safe durable lifecycle/timeline/approval metadata, cancellation and size/time bounds exist.                        | Actual daemon-side abort proof, resumable event streaming, enforced approvals, tools/diffs/artifacts, pairing, sharing and packaged clients.     |
| OpenAI-compatible public API    | Planned  | The gateway/provider normalization is reusable.                                                                                                                             | API keys/scopes, rate limits, `/v1/models`, chat/responses compatibility, SSE, policy/budget parity, SDK/CLI and conformance suite.              |
| Hosted runners                  | Planned  | Architecture and isolation principles are documented.                                                                                                                       | Scheduler, workload identity, outbound attach, filesystem/network/secrets isolation, quotas, artifact storage and funded operations.             |
| Separate admin app              | Partial  | Shared identity, scoped duties, fail-closed paths, provider/evidence, budgets and circuits exist; 11 contracts and CI pass.                                                 | Hosting, authenticated role personas, MFA/re-auth/two-person root, conformance workflow and transactional trust/member/content/program commands. |
| Supabase platform               | Partial  | Project `jpwvgpnbkrktipwhvqss` has the first 67 migrations. All 68 replay locally; 550 database assertions and lint pass.                                                   | Migration 68 is Blocked for hosted release by the current direct database IPv6 transport; aliases still require the exact-ledger helper.         |
| Release engineering             | Partial  | Member and admin dependency audits report zero vulnerabilities; type, unit, DB, lint, format and production builds pass.                                                    | Required CI for the member app, component/Playwright/a11y/visual/load coverage, generated-type drift, staging, rollback and backup rehearsal.    |

## Security and correctness findings

### Closed in this audit

- Admin routing uses an explicit path-to-capability map. Unregistered and nested paths return false even for an otherwise authorised scoped operator.
- Direct-message reads execute inside `list_my_direct_conversation(...)`. The function derives one participant from `auth.uid()`, requires matching cursor fields, caps a page at 100 and uses `(created_at, id)` as the stable keyset.
- The pagination function is `SECURITY DEFINER` with an empty `search_path`; `PUBLIC` and `anon` execution are revoked and only `authenticated` and `service_role` are granted.
- Direct table `SELECT` remains temporarily available because the current Realtime Postgres Changes proof channel depends on it. RLS remains the authorization layer.
- OpenCode accepts loopback HTTP(S) only, keeps the optional password in memory, caps prompt/title/password/server metadata, and composes caller cancellation with a bounded timeout.
- Stopping the browser request records `stopped`; it must not be described as proof that a remote daemon process was terminated.
- Provider success bodies are capped before JSON parsing. Invalid/empty/oversized success bodies normalize to a safe upstream failure and provider error content does not enter the public response.
- Both production dependency graphs currently audit with zero reported npm vulnerabilities.

### Retained and tracked

- Legacy `src/routes/app.admin.*` source files still contain direct-table admin workflows. The parent `/app/admin` route redirects unconditionally to the separate admin app and the children are code-split, so they are not a reachable authority surface. Delete them only after capability parity and owner approval.
- Browser authorization is not database authorization. Every privileged transition must remain inside a caller-bound RPC or server-only boundary.
- Historical hosted/local migration timestamps are aliased. Ordinary linked `supabase db push` is unsafe; only the exact-ledger release helper may be used until the history is formally reconciled.
- Existing Supabase Advisor notices need a separately reviewed remediation programme; this audit did not make broad policy/index changes without workload evidence.

## Verification matrix

| Check                                   | Result                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Member TypeScript                       | Passed                                                                  |
| Member unit contracts                   | 46 passed                                                               |
| Member lint                             | Passed with zero errors                                                 |
| Member production build                 | Passed                                                                  |
| Member formatting                       | Passed                                                                  |
| Admin TypeScript/contracts/build/format | Passed; 11 tests                                                        |
| Clean Supabase replay                   | Passed; 68 migrations                                                   |
| Database contracts                      | Passed; 14 files, 550 assertions                                        |
| Public/private database lint            | Passed at error level                                                   |
| Member npm production audit             | Passed; 0 vulnerabilities                                               |
| Admin npm production audit              | Passed; 0 vulnerabilities                                               |
| Hosted migration 68                     | Blocked; no hosted mutation occurred                                    |
| Hosted gateway v20                      | Released; deployment succeeded and unauthenticated access returns `401` |
| Paid/live provider traffic              | Not run; explicit spend and conformance approval required               |
| Authenticated browser personas          | Not run; hosting/accounts are owner work                                |

## Remaining code sequence

1. Release and verify direct-message migration 68 when an IPv4-capable database path is available.
2. Build a provider conformance runner that records redacted, immutable eligibility evidence; activate one bounded provider only after owner spend approval.
3. Complete terminal event streaming, daemon-confirmed abort, approval enforcement, tools/diffs/artifacts and local pairing.
4. Ship the OpenAI-compatible API with scoped keys, rate limits, models, streaming, accounting parity and conformance tests.
5. Finish the conversation store, Threads, moderation, blocks, attachments, private Broadcast and responsive/a11y shell.
6. Replace remaining admin domain mutations with transactional capability-checked commands and full negative-role tests.
7. Add payments/credits/invoice/reconciliation, scheduled health operations and owned/partner/donated capacity controls.
8. Add member/admin browser E2E, accessibility/visual/load tests, observability, staging, rollback and disaster-recovery evidence.

## Owner and external work

- Provide an IPv4-capable Supabase database release path or run the reviewed alias-safe migration release from such a network.
- Choose production hostnames and deployment owners for the member and admin builds.
- Nominate the first super-admin/scoped operators and approve MFA, re-authentication and two-person root-change policy.
- Approve a small provider conformance spend ceiling, activation order, data-region rules and provider terms.
- Decide pricing currency, platform fee, taxes, credits/sponsorship expiry, refunds and donated-capacity consent.
- Approve terminal v1 operating systems, local-only versus hosted-runner scope, and the legal/privacy/retention language.

## Final interpretation

All safe owner-independent work identified by this audit is implemented and verified. “Code complete” should not be used for the whole product yet: the remaining items include major product features, live provider evidence and production operations—not merely keys or deployment clicks.
