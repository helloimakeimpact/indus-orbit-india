# Production status — 18 October 2026

Superseded for current publication/CI by [19 October status](PRODUCTION_STATUS_2026-10-19.md). This dated source checkpoint is retained.

Overall **Partial** for full public production. This increment completes and verifies the bounded privacy source paths. It does not establish hosted release or whole-product production acceptance.

## Completed source

- Owner-delegated retention defaults replace the earlier pending worksheet. See [policy and exact limits](PRIVACY_EXECUTION_POLICY.md).
- Service-only portable JSON exports over 34 explicit datasets, private seven-day artifacts, bounded five-minute links, request/version/lease checks, safe retry and assisted oversized requests.
- Member Settings download, account-bound submission and late-link rejection after account changes; normal navigation/drafts survive tab return and token refresh.
- MFA/capability/version-bound deletion approval, seven-day cancellation minimum, access freeze, ordinary-data erasure, confirmed physical Storage cleanup, then confirmed Auth soft deletion. Shared/legal/financial references retain a documented pseudonymous shell.
- Subject/event holds with expiry/review date, audited placement/release and admin controls; started deletion recovery requires an explicit versioned decision.
- Bounded guest identity/mail payload retention, expired export cleanup and orphan education-file cleanup. Retiring file paths cannot be replaced or newly referenced. Missing file/Auth confirmation never counts as completion.
- Canonical documentation, generated RPC types and three new database contracts. Original brand/assets and **Intelligence, built together.** remain unchanged.

## Verification

Local evidence: **236 member unit tests**, **35 admin unit tests**, **13 member browser journeys**, **8 admin browser journeys**, **38 SQL contracts / 1,237 assertions**, public/private schema lint, generated type boundary, application builds and bundle budgets. Privacy worker handlers contribute 20 unit checks. Edge entrypoints pass TypeScript against the installed pinned SDK with a minimal Deno declaration; this is not an actual deployed Edge invocation.

All **130 source migrations** replayed from an empty local application schema. The database-only container required reconstruction of managed Auth/Storage/Realtime bootstrap objects and owner grants; this is a synthetic source replay, not a production upgrade or full managed-service acceptance. The existing 97 exact, hash-bound held Spaces type differences remain separately reviewed. Source CI on the eventual published commits is the canonical managed-stack replay gate; publication evidence records its result separately.

Docker Desktop was restarted with explicit owner permission after its API hung. Only the isolated Indus database was manually started for these checks. No hosted migration/function or real data deletion was performed.

## Security dependency refresh

The 18 October audit found five critical dependency findings from [the TanStack reflected-XSS advisory](https://github.com/advisories/GHSA-qx66-fv34-fjm8). The source graph now pins patched Start 1.168.60/server-core 1.169.39 with router 1.170.41/plugin 1.168.42, preserving Vite 7 compatibility and one router context. Prettier remains pinned to the previously verified 3.8.2. Final audit and CI results belong to the publication evidence. The 19 October audit has zero findings; the router error component accepts the patched unknown-error contract and narrows debug rendering to Error instances.

## External state observed today

- GitHub member main before publication: `8780d026ecfde611a34979325995e28a9146ee51`; admin main: `c01358e950058916551b68684b57afc567af4280`. Both branch metadata responses report protection disabled. Source changes in this increment are recorded by the publication evidence/next commits, not assumed live from these baseline heads.
- Correct Supabase project: **Indus Orbit / jpwvgpnbkrktipwhvqss**, ACTIVE_HEALTHY, ap-south-1, PostgreSQL 17.6.1.104. Read-only ledger still has **116 migrations**, latest `20260907090226`; **ten active functions**. The separately listed JRI Backup Replica is inactive; it is not an approved ready staging environment.
- **Twelve explicitly reviewed forward migrations** and **seven new functions** await staged delivery. The seven are `public-form-submit`, `event-guest-session`, `event-email-worker`, `education-file-scan-worker`, `account-privacy-worker`, `privacy-retention-worker`, `account-deletion-worker`. Source count versus hosted count is not a deployment command.
- Netlify/indusorbit.com remain the chosen public hosting path. A source push can trigger Netlify; exact deployed SHA and backend compatibility require acceptance.

## Remaining work

### Owner setup

1. Arrange an approved separate staging backend/site and team access. Existing production identity is verified; no need to send database passwords in chat.
2. Configure Turnstile for the approved domains, verify Resend `events@indusorbit.com`, and configure Auth SMTP/confirmation/recovery. Choose the upload malware scanner and region; OpenAI/DeepSeek do not replace that scanner.
3. Onboard your real account with MFA as first host/reviewer; nominate a second independent root operator, admin hostname, privacy/support/incident/release owners and first real event schedule.
4. Complete OpenAI/DeepSeek account, current model/data/commercial approvals and any finance scope actually exposed. Razorpay event tickets remain later scope.
5. Participate in genuine member/host/admin, mobile/accessibility, supplier-failure and recovery acceptance, then approve launch.

### Engineering and operations

- Rehearse and deliver the twelve-file/seven-function backend release, pair both frontends, preserve existing hooks and verify Data API access closure, actual Auth/Storage cleanup, worker schedules and monitoring. Backfill legacy education scans before granting file access.
- Complete assisted exports/deletions and documented handling of retained financial/security/case data; verify backup retention and restore replay. The ordinary JSON export excludes binary files and is not an automated full DSAR.
- Deliver the applicable regulated retention/archive profile before **13 May 2027**; current code deliberately blocks automated closure from that date. Security/finance expiry remains reviewed operating work, not an implemented universal purge.
- Verify provider/runtime/payment boundaries for exposed launch scope, branch protection, real operator recovery, exact Netlify deployment, public/legal claims and named sign-off.

These are six launch workstreams: staging/delivery, service setup, operator acceptance, privacy/recovery, AI/runtime/finance, and final production sign-off. A defensible completion percentage cannot be inferred from test counts. Cohosts, QR check-in, follows, recurring series, uploaded covers and larger event paging are Planned product enhancements, separate from launch gates.
