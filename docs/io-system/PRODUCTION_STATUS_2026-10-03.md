# Production completion report — 3 October 2026

Work stopped at the owner's explicit request on 3 October 2026. Current source is saved as a **local checkpoint**, with no push. This is a work-in-progress commit, not a production release candidate. The GitHub main comparison before the checkpoint was exactly `04e10e5f754b219c6774a8da6b5159183e38fe7c`, with zero local/remote commits differing. The checkpoint adds local work above that remote base.

Overall: **Partial**. This is a concrete event-focused code increment and launch ledger, not approval of a full public production launch. Read the accompanying evidence and runbooks before rollout.

## Completed source work in this increment

| Capability                                      | State and boundary                                                                                                                                                                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simpler public-form verification                | **Verified** local Turnstile handler and intercepted-browser behavior; **Partial** overall until real keys, function and INSERT boundary are delivered. hCaptcha source is replaced.                                                                                      |
| Public event/community discovery                | **Verified** safe projections, bounded search/date/format queries and original branded UI in local replay/browser evidence; hosted APIs are unapplied.                                                                                                                    |
| Native free registration                        | **Partial** current source. The native event checkpoint passed 941 assertions and the guest core passed 34 separate assertions; latest full replay/types/profile/mixed-race/browser refinements remain unverified. Genuine staging/production personas remain unverified. |
| Host publication and review                     | **Verified** explicit host approvals, pending new-host submissions, chapter review, operator MFA and protection of legacy admin publication paths locally.                                                                                                                |
| Host guest operations                           | **Verified** scoped guest pages, host approvals, check-in and cancellation source/contract behavior locally. Cohost/QR/team workflows remain **Planned**.                                                                                                                 |
| Invitation continuity                           | **Verified** original covers, clear facts/status/access, calendar export, signin/onboarding return and account/focus reconciliation where stated in evidence. Genuine auth email and real-device acceptance remain **Partial**.                                           |
| Prior signed-in continuity/admin/security fixes | Retained from the earlier published increment; no new admin-repository code change in this pass. Earlier evidence does not become genuine production acceptance by reuse.                                                                                                 |
| Living documentation                            | Updated Community direction, design philosophy, completion register, execution plan, owner actions and release evidence in the same increment.                                                                                                                            |

## Verification at the stop

- **195 unit tests passed**, including 13 Turnstile/public-form contracts and 11 guest-handler contracts.
- Earlier native-event database checkpoint: **123 migrations replayed; 941 assertions passed**. Guest extension core: **34 separate assertions passed**. These are distinct checkpoints and must not be added together as a completed final suite.
- Earlier public/member production browser: **29 passed / 2 intentionally skipped**; intercepted Turnstile **2 passed**; guest core desktop/mobile **2 passed**. New same-link/anchor checks and response guards still need a full rerun.
- Latest local **production build and bundle budgets passed**: largest JS 377.12 KiB / 500; CSS 219.04 KiB / 250.
- Final 124-migration replay and type generation did not finish. The latest configured browser attempt had a **20-second initial page-load timeout** before the extended guest path; it recorded one Turnstile pass before being stopped. A passing final suite or its cause cannot be inferred.
- The new public-profile projection/three assertions, attendance-cancellation addition, mixed account/guest race and full final gates are the first engineering steps on resume. GitHub CI for this checkpoint is pending because it has not been pushed.

See the exact [verification record](../release-evidence/events-2026-10-03/verification.md) and saved logs. All browser identities/events were synthetic. Real hosted data, emails, providers and payments were not changed.

## Local, GitHub and hosted status

| Surface                     | Current status                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Main repository             | Local checkpoint of current work; remote base `04e10e5f754b219c6774a8da6b5159183e38fe7c`; no push in this pass.                                                                                        |
| Admin repository            | No file changes in this pass. Local HEAD `b46a815c7a9652ddd2ef6191f2ccd018f7ce9b4a`. Last recorded remote source tree matched despite different commit history; remote was not refreshed at this stop. |
| Hosted Supabase             | No change made here. Six source forward migrations remain pending reviewed hosted delivery; staging/production identity is unresolved.                                                                 |
| Live site                   | No new source delivery from this checkpoint. New native APIs and guest function are not deployed.                                                                                                      |
| Identity assets             | No image/logo files changed. Original dawn/lotus/banyan/pixel assets and approved line retained.                                                                                                       |
| Local verification services | Task-owned previews/runners/replay stopped at the owner's request. Other projects were not stopped.                                                                                                    |

## Earlier completed source retained

The earlier published work restored the original branding and approved line, repaired signed-in workspace/auth/tab continuity, strengthened admin session/MFA boundaries, and added trusted vouch/quiz and private education-storage source controls. Existing I/O provider/routing/conformance and terminal foundations remain. Their hosted delivery, commercial authorization, scanner/privacy-worker and genuine operating acceptance limits remain in the completion register; none are closed merely by this new checkpoint.

## How much remains

There are **six substantial launch workstreams**. These mix missing code, owner decisions and delivery evidence, so a percentage or exact launch date would be misleading.

1. **Final verification, environment and database delivery.** Finish the stopped local/CI checks first. Name staging/production and authorize a reviewed rollout. Six forward migrations remain unapplied in the hosted project: identity/legacy removal; trusted vouch/quiz; education storage; verified forms; native events; public guest credentials. Decide held Spaces separately. Reconcile hosted generated types, ACLs and real operator read paths. Source/browser publication is not this delivery.
2. **Event operations code and acceptance.** Finish edit/reschedule, transactional confirmation/cancellation/waitlist/reminder messages, host team/QR operations where exposed, and community follow/calendar continuity. Rehearse with real hosts/guests/chapter reviewers. Razorpay event tickets are explicitly later; they do not block a free-event release.
3. **Identity and public communication setup.** Configure Turnstile public/server keys and exact origins, deploy the function and close direct form inserts. Approve domains/Auth redirects, production SMTP/sender identity and recovery/notification workers. Prove real challenge, signup, email confirmation, recovery and actual delivery.
4. **Privacy and file safety.** Approve the retention/export/delete matrix and scanner supplier. Complete real privacy export/purge workers and education upload quarantine/scanning; test failure/retry/infected-file behavior. Private bucket rules alone are not malware protection or a completed erasure workflow.
5. **I/O commercial and runtime readiness.** Provide the first provider account, written onward-access rights, real model/price/capability review and an explicitly bounded conformance authorization. Choose terminal/runtime hosting. Complete provider/worker/operator acceptance and any exposed billing/refund/reconciliation workflows. No provider route was activated or customer charged in this pass.
6. **Production operations and independent acceptance.** Set protected branches/environments and separate admin deployment/root operators; perform genuine role/MFA/member/device acceptance, backup and Storage recovery drills, monitoring/alert/support rehearsal and a production rollback. Review remaining security/performance advisors deliberately.

## Code still to finish after the checkpoint

1. Close the named verification gaps before calling this a release candidate.
2. Complete event edit/reschedule with change history and durable confirmation/change/cancellation/waitlist/reminder delivery. Email-proof links exist; status-change/reminder delivery is not completed.
3. Finish privacy export/purge workers and the chosen scanner's quarantine/delivery integration after the required owner policies/supplier are available.
4. Finish real provider/worker/operator/runtime acceptance and any finance/refund/reconciliation flows exposed at launch.
5. Community follows/subscriptions, cohost/check-in team/QR credentials, recurring series, uploaded covers and workspace pagination beyond the current latest-100 bound remain documented product work. Set a deliberate first-release scope for these; do not advertise an unfinished capability. Razorpay event tickets remain later work by instruction.

## Owner actions, in order

- Confirm production/staging project identities and domain/admin hostname. Give team access through the service invitations.
- Create real managed Turnstile keys: public `VITE_TURNSTILE_SITE_KEY`; server-only `TURNSTILE_SECRET_KEY`; exact `PUBLIC_FORM_ALLOWED_ORIGINS`. Use the [Turnstile runbook](PUBLIC_FORMS_TURNSTILE_RUNBOOK.md).
- The latest Luma choice is resolved: public name/email guests by default with optional community-only events. Name the first approved hosts/reviewers; approve the guest email sender/domain, rate controls and guest retention. See [guest registration delivery](EVENT_GUEST_REGISTRATION_RUNBOOK.md).
- Approve a production SMTP/sender supplier and attachment scanner; supply secrets through their service interfaces. Confirm event transactional communication expectations.
- Supply privacy retention/export/delete policy, provider commercial evidence, terminal operating choice, finance/support/recovery owners. See the full [owner worksheet](PRODUCTION_OWNER_ACTIONS.md).
- Review the concrete local migrations/diffs and staging runbooks before authorizing hosted delivery. Source commit/push authorization persists, but no hosted migration/function/provider/payment activation is inferred.

## Release boundary

Do not describe this as production ready. The free event engine now has useful verified foundations; the broader Community/I/O product still needs the workstreams above. Live forms and native event APIs remain unavailable until the matching environment configuration and database/function delivery. Existing historical release evidence remains dated and separate from this increment.
