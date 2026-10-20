# Indus Orbit — detailed completion and production status

Observed **20 October 2026**. Overall public production state: **Partial**. Completed source is published and its recorded CI passes. Hosted rollout, genuine supplier/operator acceptance and the remaining operating/assisted-work boundaries are separate.

## 1. Local and GitHub comparison

Both local working trees were clean before this documentation update. No unpublished product code was found.

| Repository     | Published main checked today               | Local comparison                                                                                                          |
| -------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Member/backend | `f659553fb33b42d0afdddc43e658c08829367614` | Same commit and exact tree `eb422f5c1c3798e7075534d8757d6c7ee5b2ecc0`                                                     |
| Separate admin | `e30a3eca30fbc49524e04af5e894b91902f8af0f` | Local commit `220f0649bd5dad9f37fcc42c50d3839ff78a25d0` has the identical tree `b8cbe23fbd3b98bb8c0fad1fbd030075624b50cb` |

Admin commit history differs because earlier publication preserved the remote parent through the connected GitHub app. The files match; no code merge or force-push is required. These heads describe the comparison before this report’s documentation-only commit. The next commit adds the refreshed report, evidence and corrected current runbooks.

## 2. Work completed in source

### A. Brand and public website

**Verified** in source and the stated public UI evidence:

- Core company definition: **The General Intelligence Company of India**.
- Approved short line: **Intelligence, built together.** The retired “Made of Many Minds” direction remains retired.
- Original pixel mark and dawn/lotus/banyan artwork, indigo/parchment/saffron palette, selective Fraunces editorial type and Inter working type are retained. No Neo/neon identity was reintroduced in the recent pass.
- Design philosophy is documented: people first, visible evidence, calm hierarchy, India in the details, continuity of work and inclusive interaction.
- Public navigation, named main/skip links, mobile focus-trapped drawers, short-screen layouts, reduced motion and storage acknowledgement have source/test coverage. The notice works when persistence is blocked.
- Events and communities have clearer public routes and primary actions. There are explicit empty/unavailable/private states; fabricated attendance or events are not used as proof.

The broader premium design rollout and real-device/usability/claim acceptance remain **Partial**. The philosophy is finalized; that does not mean every planned visual pattern has been applied across every screen. Today’s audit did not establish the live Netlify deployed commit.

### B. Signed-in continuity and navigation

**Verified** with controlled member and admin journeys:

- Returning to a tab and same-account token/auth refresh preserve the mounted workspace and unsent draft.
- Internal member navigation preserves the shared shell instead of deliberately resetting it for each route.
- Account changes clear the previous account’s private state; obsolete asynchronous access results cannot restore it.
- Access-service failures have a recoverable state. Confirmed loss of access and sign-out close the boundary.
- I/O-only access remains separate from Community onboarding, with named mobile navigation/inspector dialogs and keyboard recovery.

Real token-expiry, sleep/wake, independent accounts and actual mobile/Realtime acceptance still belong in staging. Unsent drafts are not guaranteed to survive a full browser reload.

### C. Community and native free events

**Verified** source implements the approved Luma-inspired interaction structure in Indus Orbit’s own brand:

- Public event discovery with bounded search/date/format filters, invitation pages, community homes and original cover templates.
- Public name/email guest registration by default, private email proof links and explicit confirmation; hosts can choose Community/chapter restrictions.
- Confirmed, pending, waitlisted, cancelled and rejected registration states; capacity locking and eligible waitlist promotion.
- Approved member hosts, review for new hosts, host workspace, authorized guest lists and manual check-in.
- Event editing/rescheduling with revision history. Host/chapter/admin decisions use the inspected revision; stale decisions require refresh.
- Cancellation withdraws the invitation and queues guest notices. Cancelled invitations cannot be republished through an older review path.
- Calendar export, timezone display and separation of public invitation facts from private address/join credentials.

Genuine hosted guest/host/reviewer acceptance and initial host bootstrap remain **Partial**. Cohosts/QR, follows/subscriptions, recurring series, uploaded custom covers and larger host/review paging are **Planned** enhancements. Razorpay event tickets remain later scope.

### D. Event email and public-form protection

**Verified** source includes:

- Turnstile server verification for contact/newsletter and guest-proof requests, replacing the earlier hCaptcha/browser arithmetic direction. Browser-only checks and direct inserts are not trusted substitutes.
- Origin/action/token/payload checks and clear failure states; configured browser journeys preserve drafts after rejection.
- Durable event status mail for registration/approval/waitlist/cancellation/rejection, edited invitations and future 24-hour/one-hour reminders.
- Immutable recipient/template snapshots, provider idempotency, bounded leases/retries, obsolete-job suppression and dead-letter handling.
- Resend sender choice `events@indusorbit.com` under the owner’s delegation.

Actual Turnstile domain/key setup, Resend domain/sender verification, Auth SMTP/recovery and real delivery/schedules remain **Partial**.

### E. Learning, uploads and trusted actions

**Verified** source includes:

- Trusted vouch issuance and quiz grading/answer-key boundaries rather than trusting browser-supplied results.
- Private education-file access tied to authorized references; quarantine pending a current clean scanner verdict.
- Version/digest/lease checks, signed-path replacement/reuse prevention and deleted-account download denial.
- Service-only scanner workers and file-cleanup paths with bounded retries and redacted operational responses.

The scanner supplier/region and actual integration are not configured by choosing OpenAI/DeepSeek. Legacy-file scan backfill and real scanner/Storage acceptance remain **Partial**. Pending/blocked files must not be opened to bypass this gate.

### F. Account privacy and retention

**Verified** bounded source includes:

- Portable JSON export over **34 explicit datasets**, with file metadata, credential/other-account exclusions and an assisted path for oversized requests.
- Private artifacts with seven-day expiry and signed links bounded to five minutes. Settings downloads preserve the workspace and discard late results after account changes.
- Account-bound submissions; request/version/lease checks; cancellation and expiry invalidate further work/new authorization.
- MFA/capability-reviewed deletion with a minimum seven-day cancellation window, account freeze, ordinary-data cleanup, confirmed physical Storage removal and then confirmed Auth soft deletion.
- A public invoker Data API hook for authenticated closure checks; restrictive policies on active RLS tables; the archived Loops zero-policy contract is preserved.
- Subject/event safety/legal holds with expiry/review date, audited placement/release and explicit recovery of a started failed deletion.
- Bounded guest identity/mail-payload retention, expired export cleanup and orphan education-file cleanup. Missing physical/Auth confirmation never counts as completion.

The owner’s **15 October “use best practice”** instruction resolved the earlier retention worksheet. The selected defaults and limits are in [the policy](PRIVACY_EXECUTION_POLICY.md). This is not a complete automated legal access-request service: binary/financial/security/case supplements and large requests need assisted delivery. Shared/legal/financial records retain a documented pseudonymous shell. Already issued signed links may survive for their remaining five-minute lifetime.

Production privacy execution remains **Partial** until trusted deployment/configuration and real acceptance. Backup erasure is not immediate. Security/financial expiry is reviewed operating work, not an implemented universal purge. The applicable regulated archive/retention profile is still engineering work before **13 May 2027**; source deliberately blocks automated closure from that date.

### G. Separate admin control plane

**Verified** source includes:

- Separate admin access with server-owned capabilities, AAL2 plus a verified factor, background access checks and stale/account-switch denial.
- Trust/member/content/programme operations, revision-bound event decisions and redacted audit views.
- Privacy review, deletion scheduling/recovery and subject/event hold controls. A browser cannot declare exports ready or deletion complete.
- Two-person, fresh-auth/MFA boundaries for root changes.
- Finance/tax/FX/reconciliation interfaces and provider operational controls as documented foundations.

Independent hosting/recovery, genuine scoped/root operators and full operating acceptance remain **Partial**. A role shown in the browser is not authorization by itself.

### H. I/O, terminal, messaging and finance foundations

The source/recorded backend contains workspaces and key metadata, provider registry/routing, capability gates, budget reserve/settle receipts, usage/credits/invoice history, Chat/Responses transport subsets, conformance/health controls and the OpenCode/terminal client foundation. These do not establish commercially activated OpenAI/DeepSeek routes or a production hosted execution service.

Messaging/collaboration work includes caller-bound direct-message history, pagination/reconnect/presence, safety/moderation and room/thread/attention controls where documented. Held structured Spaces work remains a separate rollout decision; the 97 reviewed type differences must not be silently applied as an unrelated release.

Finance foundations cover verified billing identity, approved tax/FX policy, issuance, payment/refund evidence and reconciliation. Activation and merchant/accountant/runtime evidence remain **Partial**. No paid provider call or payment was performed by this status pass.

### I. Security, quality and documentation

- Patched the critical TanStack Start dependency finding; aligned Start/router/plugin versions with Vite 7 and one router context.
- Kept the prior formatter version pinned, updated the lockfile and adapted the router’s unknown-error contract safely.
- Tested the complete managed Supabase replay, exact generated types, privileged API boundaries and current Storage protection.
- Maintained source/hash manifests, publication evidence, deployment/rollback runbooks, privacy policy and owner instructions. Secrets are not stored in these artifacts.

## 3. Verification checked today

The files match the source covered by the passing 19 October runs; today’s report refresh is documentation-only. No whole suite was needlessly rerun for an unchanged code tree.

| Gate                          | Recorded result                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Member units                  | 236 pass                                                                                           |
| Admin units                   | 35 pass                                                                                            |
| Browser journeys              | 49 pass across both applications                                                                   |
| Fresh managed database replay | All 130 source migrations pass                                                                     |
| Database contracts            | 38 files / 1,237 assertions pass                                                                   |
| Schema/types                  | Public/private lint passes; 97 exact hash-bound held Spaces differences remain reviewed separately |
| Build quality                 | Formatting, types, lint, package/application builds and bundle budgets pass                        |
| Dependency evidence           | 19 October audits report zero findings; CI audit gate passes on the checked member head            |

Passing workflows, re-read on 20 October: [member Quality](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/39253652684), [Admin quality](https://github.com/helloimakeimpact/admin-indus-orbit/actions/runs/39253745412), [Database quality](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/39252910170). SQL replay/tests are not proof of a hosted upgrade; intercepted browser personas are not genuine Auth/supplier acceptance.

## 4. Hosted state checked today

Correct connected project: **Indus Orbit / jpwvgpnbkrktipwhvqss**, **ACTIVE_HEALTHY**, ap-south-1, PostgreSQL **17.6.1.104**.

- Hosted ledger: **116 migrations**, latest `20260907090226_add_final_fk_covering_indexes`.
- Hosted functions: **ten ACTIVE**. The newly prepared form/event/education/privacy functions remain absent.
- Separate `JRI Backup Replica` remains **INACTIVE**; it is not an approved ready staging backend.
- Both GitHub branches report protection disabled. The exact live Netlify deployed SHA and production backend compatibility have not been established by this check.
- **Twelve explicitly reviewed forward migrations and seven new functions** await staged delivery. Source-file subtraction is not a deployment plan; historical aliases/held Spaces need their separate treatment.

Pending functions: `public-form-submit`, `event-guest-session`, `event-email-worker`, `education-file-scan-worker`, `account-privacy-worker`, `privacy-retention-worker`, `account-deletion-worker`.

## 5. What remains before public launch

| Workstream              | Owner action                                                                                                                               | Engineering/operating completion                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staging and rollout     | Approve a separate staging backend/site and grant team access through dashboards                                                           | Rehearse the exact twelve-file/seven-function sequence, backup/upgrade/rollback and paired frontends; no blanket push/history repair                                                                          |
| Service configuration   | Configure approved Turnstile domains, Resend sender/domain/Auth SMTP and a malware-scanner supplier/region                                 | Verify actual challenge/mail/scan success, expiry/replay, outages, retries and legacy scan backfill                                                                                                           |
| Operators and community | Use your real MFA account; nominate a second root operator, admin hostname, support/privacy/incident/release owners and first hosts/events | Trusted host bootstrap, scoped/revoked/root recovery acceptance and operational handoff                                                                                                                       |
| Privacy and recovery    | Name the responsible privacy operator and accept accurate public disclosures                                                               | Activate and prove real Auth/Storage workers, schedules/monitoring, assisted requests/handovers, retained-record review and restore tombstones; deliver the applicable archive profile before the dated guard |
| AI/runtime/finance      | Confirm OpenAI/DeepSeek accounts, intended data/commercial controls and exposed finance approvals                                          | Current evidence, authorized bounded conformance, runtime/reconciliation and failure acceptance before activation                                                                                             |
| Final acceptance        | Review genuine guest/member/host/admin, device/accessibility and support journeys; give named sign-off                                     | Exact Netlify/backend deployed-version acceptance, required branch checks, real supplier/recovery evidence and release approval                                                                               |

Your next practical step is staging access plus service/operator setup status. Do not send secrets in chat. You do not need to redesign the core brand or supply another retention worksheet.

Six launch workstreams remain; a reliable production-completion percentage cannot be inferred from test counts. This report makes no claim that all remaining work is configuration: assisted privacy, recovery, applicable archive work and actual operating acceptance still require engineering and operations.
