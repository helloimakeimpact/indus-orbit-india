# Final code-level audit — 6–7 September 2026

Status: **all safe owner-independent work discovered in this final pass is implemented, verified and filed**. This does not mean every production operation is activated: several boundaries correctly require contracts, credentials, policy approvals, two real operators or external infrastructure.

## What is complete in code

### Member app and Orbit

- One shared root Orbit state layer connects Messages, Chapters, Missions, Spaces and the separately bounded I/O product.
- Direct messages have caller-bound paging, private realtime reconciliation, cross-tab unread recovery, offline retry, blocking and privacy-aware ephemeral typing.
- Space collaboration includes Rooms, Threads, reactions, mentions, attachments, reports, settings, permission overrides, search, bookmarks, pins, quiet/digest controls, moderation, member removal/timeouts and bounded anti-spam enforcement.
- The structured Boards, Room lifecycle/reordering, source-role explanation and saved-work index are implemented and locally verified. Their broad authorization migration is intentionally not active in production.
- The public I/O page now describes the implemented private beta accurately instead of calling the gateway/terminal merely planned.

### I/O Port and OpenCode

- The signed-in rail has eight distinct URL-backed views; navigation uses the canonical query string, remains at the top of the workspace and survives refresh.
- The OpenAI-compatible gateway supports entitlement-filtered models, Chat JSON/SSE and stateless Responses JSON/SSE with direct upstream streaming, function-tool deltas, strict structured output and HTTPS images behind capability gates.
- Accounting reserves worst-case cost before dispatch, settles exactly once, releases unused holds, applies a transparent 5.5% service fee and records redacted receipts without prompts, output or credentials.
- Usage history, non-cash credits, invoice snapshots, Indian GST policy structures, approved-rate FX, Razorpay Order/Checkout/webhook/refund idempotency and provider-statement reconciliation are implemented and fail closed while policies/configuration remain unapproved.
- The packaged OpenCode client supports loopback-only connections, a memory-only credential lease, continued prompts, SSE plus REST reconciliation, task trees, complete bounded diffs, mode-specific approval enforcement, reviewed commands, abort/revert acknowledgement and private local handoff downloads.

### Admin app

- The separate admin application has a Netlify production build/SPA fallback and conservative browser headers.
- Capability-scoped provider, budget, circuit, conformance, Trust, attachment, appeal, notification, support, privacy, content, programme, finance and audit surfaces are implemented.
- AAL2/TOTP gates the control plane. Root changes use expiring two-person requests, prevent self-approval and protect the final two-root floor.
- Browser code contains no provider, Supabase service-role, scanner, Razorpay or webhook secret.

### Database and verification

- Production project: `jpwvgpnbkrktipwhvqss` (`Indus Orbit`, `ap-south-1`, `ACTIVE_HEALTHY`).
- Production has 116 migration records. The newest releases are hosted versions `20260906100111_fix_operational_function_schema_drift` and `20260907090226_add_final_fk_covering_indexes`.
- The source has 118 SQL migrations. A from-empty local replay applied all 118.
- All 25 pgTAP files pass: **830/830 assertions**.
- Supabase error-level lint returns zero findings for the application-owned `public,private` schemas.
- The hosted performance advisor now reports zero unindexed foreign keys.
- Member verification passes **107/107** unit contracts plus formatting, zero-error lint, typecheck, packaged-client build, production build and bundle budgets.
- Admin verification passes **32/32** contracts plus formatting, zero-warning lint, typecheck, production build and bundle budgets.
- Manual deployed check: Sessions navigates to `/io?view=sessions`; Terminal navigates to `/io?view=terminal`; reload retains the Terminal view. The automated authenticated journey now tests all eight button destinations rather than silently looking for absent links.

## Code that cannot honestly be completed without external inputs

These are real implementation dependencies, not unfinished ordinary coding:

1. **Provider activation:** written resale/partnership permission, allowed region/retention/training rules, validated secrets and an explicitly approved USD 0.01 conformance call for the first route.
2. **Structured Spaces production release:** explicit owner acceptance of the shared authorization scope, followed by hosted negative-role and multi-persona evidence.
3. **Real OpenCode boundary:** a pinned daemon/version matrix, daemon-issued short-lived pairing protocol, platform signing identities and target OS decisions for signed installers.
4. **Payments and tax activation:** accountant/legal approval of GST/SAC/place-of-supply/refund/FX rules, Razorpay merchant test/live credentials and retained sandbox settlement evidence.
5. **External workers:** a contracted attachment scanner and delivery provider, service credentials, schedules, alert channels and operator ownership.
6. **Privacy execution:** approved data inventory, retention/legal-hold matrix, export format/SLA and deletion-verification policy before the service-only artifact/purge workers may be written or scheduled.
7. **Hosted runners:** funded compute plus an approved isolation, workload identity, network/filesystem/secrets, quota, recovery and incident model. Long-running agents do not belong in an Edge Function.

## Remaining engineering after those inputs

- Run authenticated member/admin/two-device/source-role/AAL2/two-person personas with dedicated test accounts.
- Run provider-specific advanced conformance and load/soak tests against paid traffic; add billing dimensions only when the provider exposes authoritative usage and price evidence.
- Configure health/scanner/notification schedules and external alert delivery after eligible targets and credentials exist.
- Connect and verify the separate admin hostname; protect required GitHub checks; retain Netlify/GitHub deployment evidence.
- Rehearse staging promotion, rollback, backup/restore, secret rotation, incident response and disaster recovery.
- Address advisor warnings policy-by-policy. Do not mass-revoke authenticated RPCs or merge overlapping RLS rules without negative-role and query-plan evidence.

## Owner checklist

1. Choose the first commercially authorized provider and approve one capped conformance run.
2. Approve or defer the structured-Spaces production migration.
3. Connect the admin repository to its Netlify site and hostname.
4. Enroll two separate super-admins with TOTP.
5. Supply only server-side scanner/delivery/Razorpay secrets after the corresponding contracts are approved.
6. Name the legal/accounting/privacy approvers and approve their policy documents.
7. Choose OpenCode v1 operating systems and the exact daemon version(s) to support.

Until those inputs exist, the correct production posture is the current one: deployed surfaces, observable control planes and fail-closed external operations.
