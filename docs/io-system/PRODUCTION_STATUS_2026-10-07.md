# Current production status — 7 October 2026

Overall: **Partial**. This is a status audit of the current local checkout, both GitHub repositories, the connected Supabase account and the public website. Product source was not changed, committed, pushed or deployed in this audit. Documentation is updated locally.

## What has changed since the last review

The event work is present. The member application has one unpublished checkpoint commit from 3 October, plus the uncommitted event editing/rescheduling increment recorded later that day. No newer commit on either GitHub main branch or newer recorded Supabase migration/function deployment was found.

All **125 migration files and 32 database contract files** match the exact hashes recorded in the final 3 October replay. The uncommitted application diff contains the documented edit dialog, host workspace, event client and generated type changes. This confirms the work remains available locally; it does not establish a new test pass or a hosted release.

## Local, GitHub and live environments

| Surface                | State and evidence observed on 7 October                                                                                                                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Member local           | **Partial delivery:** main at `e63290c85bfab9dcdbd591aa87bf488e803f6611`, one commit ahead of GitHub main, with additional uncommitted event editing source, migration, tests and documents.                                                                                                                                 |
| Member GitHub          | Main remains `04e10e5f754b219c6774a8da6b5159183e38fe7c` from 2 October. Its Quality workflow passed; the latest applicable Database quality workflow passed at `8b5adee`. Neither verifies the unpublished event checkpoint/editing increment.                                                                               |
| Admin local and GitHub | Local checkout is clean at `b46a815c7a9652ddd2ef6191f2ccd018f7ce9b4a`; GitHub main is `20b594081394ecbfec41e9a053aaf7ea3f243ce1`. Their source trees are identical: `5e1ef524d10d6fb2986ab7ff7c6c8785acbe332e`. Admin Quality passed at the remote commit. Different commit histories do not imply a source difference here. |
| Public site            | [indusorbit.com](https://indusorbit.com) returns HTTP 200 with Netlify headers and the approved company title. Public entry script remains `/assets/index-CYYVv5k3.js` and identifies Supabase project `jpwvgpnbkrktipwhvqss`. Exact deployed Git commit and Netlify dashboard settings were not verified.                   |
| Supabase               | **Indus Orbit**, `jpwvgpnbkrktipwhvqss`, is ACTIVE_HEALTHY in ap-south-1, PostgreSQL 17.6.1.104. It has 116 migration records and ten active Edge Functions. Seven reviewed forward migrations remain pending.                                                                                                               |
| New event/form backend | The new event edit/review RPCs queried are absent. `public-form-submit` and `event-guest-session` are absent from the hosted function inventory. The local native event system is not released to this backend.                                                                                                              |
| Staging                | No separate Indus Orbit staging project was returned by the connected account. The other project is an inactive JRI backup and is not used for this release.                                                                                                                                                                 |
| AI providers           | OpenAI and DeepSeek records remain `conformance`, `resale_pending`, with `routing_enabled=false`. They are chosen suppliers; production routing is not active.                                                                                                                                                               |

The old open GitHub PR #1, “Troubleshooting a 404 error on a deployed site”, was last updated in April. It does not contain a new October release. No additional active worktree attachment was found for this chat.

## Work already implemented

### Previously published source retained

- Original Indus Orbit brand direction and artwork: **The General Intelligence Company of India** and **Intelligence, built together.**
- Signed-in workspace/tab continuity and account/session safety fixes.
- Separate admin session/MFA hardening.
- Existing Community, conversations, I/O routing/control-plane and terminal foundations.

Published source and past local checks are separate from genuine production acceptance. Some source controls still await their forward database release.

### Current event increment, local only

- Luma-inspired discovery and invitation presentation using Indus Orbit branding.
- Native free events, reviewed new hosts and scoped host/reviewer controls.
- Public name/email guest registration by default, with optional Community/chapter restrictions.
- Approval, capacity, waitlist, check-in and cancellation foundations; private venue details and calendar export.
- Turnstile public-form and guest verification integration, replacing hCaptcha in source.
- Event editing/rescheduling with private history, required reasons, revision guards and retry protection.
- Active verified guest receipt expiry reconciled after rescheduling; stale reviewer decisions rejected.
- Dialog focus restoration and clearer device/display timezone wording.

Saving an edit does **not** yet send an attendee update email. Initial guest email proof-link sending exists in source; durable event confirmation/change/cancellation/waitlist/reminder delivery remains unfinished. Cohost/QR workflows, follows, recurring series, uploaded covers and larger host-workspace pagination remain Planned product work. Razorpay event tickets are intentionally later.

No public image/logo asset changes were found in the current uncommitted diff.

## Verification boundary

The latest full local verification remains **3 October**, not 7 October:

- Fresh replay: **125 migrations**.
- Database contracts: **32 files / 1,014 passing assertions**.
- Unit suite: **195 passing tests**.
- Current production member browser: **ten passing scenarios**, with synthetic identities.
- Configured guest/Turnstile browser: **four passing desktop/mobile cases**, using intercepted services.
- Member and mixed member/guest capacity races passed.
- Type contract, schema lint, source lint/types, production build and bundle budgets passed at the recorded checkpoints.

Read [the exact 3 October evidence](../release-evidence/resume-2026-10-03/verification.md). Today compared SQL source hashes and refreshed external metadata; heavy test suites were not rerun. Real Cloudflare challenges, email delivery, hosted guest/host personas and production recovery have not been accepted by these local tests.

GitHub evidence: [member Quality](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/37050086207), [Database quality](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/37049116821), [admin Quality](https://github.com/helloimakeimpact/admin-indus-orbit/actions/runs/37020079978).

## What remains before full public production

| Priority | Remaining work                                                                                                                                                                                                                                | Owner                                            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1        | Durable event email outbox: confirmations, changes, cancellations, waitlist transitions and reminders; retries, dead letters and stale-message suppression.                                                                                   | Engineering                                      |
| 2        | Approved data inventory/retention rules, privacy export/deletion workers and malware scanner/quarantine integration; withhold uploads if scanner delivery is not ready.                                                                       | Owner policy/supplier + engineering              |
| 3        | Establish staging; review and deliver seven forward migrations, matching functions and frontend; reconcile hosted types/permissions and rehearse rollback. The held structured-Spaces migration needs a separate release decision.            | Engineering + reviewed release authorization     |
| 4        | Real Turnstile keys/origins; verified Resend sender, Auth SMTP/redirects/recovery and worker schedules; actual challenge/signup/guest-link/email acceptance.                                                                                  | Service access/configuration + engineering       |
| 5        | OpenAI/DeepSeek launch model/account/data/commercial evidence and bounded live conformance; terminal/runtime and any exposed finance acceptance.                                                                                              | Owner account/activation decisions + engineering |
| 6        | Bind the owner's actual account to initial host/reviewer duties with MFA and trusted host bootstrap; admin hosting/recovery operators, protected branches, monitoring/support, real device/persona checks and backup/Storage recovery drills. | Owner identity/operations + engineering          |

The seven pending forward files are:

1. `20261002110000_reconcile_proposal_identity_and_retire_legacy_member_removal.sql`
2. `20261002120000_trust_vouch_issuance_and_education_grading.sql`
3. `20261002130000_scope_private_education_files.sql`
4. `20261002180809_require_verified_public_form_submissions.sql`
5. `20261002201815_secure_community_event_discovery_and_registration.sql`
6. `20261002224602_public_event_guest_registration.sql`
7. `20261003100000_version_host_event_edits.sql`

125 local files versus 116 hosted records is not a list of nine straightforward pending migrations: historical version reconciliation and the intentionally held Spaces change must be handled separately. Use the reviewed release runbooks rather than applying every differing historical file.

## Owner choices already resolved

The public domain/Netlify delivery, Resend supplier, initial owner host/reviewer, OpenAI/DeepSeek, free events first and public guest registration defaults are settled. Intended event sender is **events@indusorbit.com**, selected under the owner's “as needed” delegation; its Resend verification/configuration remains unverified. No new secrets or service settings were inspected in this audit.

The proposed 90-day guest contact retention is still a proposal, not an approved or enforced rule. Scanner supply is separate from AI provider selection.

See [setup and connections](LAUNCH_SETUP_AND_CONNECTIONS.md), [owner actions](PRODUCTION_OWNER_ACTIONS.md), [event editing](EVENT_EDITING_RUNBOOK.md) and [event release](EVENTS_RELEASE_RUNBOOK.md).

## Audit outcome

**Full public production remains Partial.** Useful locally verified event work is present, but publication, hosted delivery, engineering completion and genuine service/operating acceptance are still required. No commit, push, hosted write, provider activation or real email was performed in this audit.

Sanitized read-only observations are saved in [the 7 October snapshot](../release-evidence/status-2026-10-07/snapshot.json).
