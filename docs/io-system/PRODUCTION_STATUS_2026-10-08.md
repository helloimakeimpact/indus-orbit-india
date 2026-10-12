# Production finalization — 8 October 2026

> Read [the 12 October handoff](PRODUCTION_STATUS_2026-10-12.md) for retained app revalidation, refreshed external metadata and current owner actions. This report preserves the implementation/database checkpoint.

Overall: **Partial**. The event communications and education upload safety increments are **Verified locally**. Work remains local and uncommitted above checkpoint `e63290c`; nothing was pushed or deployed.

## Completed code

- Transactional registration/approval/waitlist, edit and cancellation mail, plus future 24-hour/one-hour reminders.
- Service-only leases, retries/dead letters and fresh state/recipient checks. The complete provider payload is frozen before sending, preserving idempotency across sender/template changes.
- Education quarantine tied to current object identity/version, clean verdicts and existing publication/ownership/suspension rules.
- Immutable browser upload paths: no overwriting or delete/recreate behind existing signed links. The app requests five-minute links; issued URLs remain bearer capabilities until expiry. Trusted cleanup must never reuse keys.
- Deleted-account denial and clear pending/unavailable feedback. Attachment removal removes the lesson reference; physical cleanup waits for trusted service work and approved retention/holds.
- Exact public types and source quality coverage for the new contracts.

Original brand/assets remain retained. Public name/email guest registration with optional community restrictions, reviewed hosts and free events first remain approved. Initial guest proof-link mail stays separate.

Read [communications](EVENT_COMMUNICATIONS_RUNBOOK.md), [scanning](EDUCATION_UPLOAD_SCANNING_RUNBOOK.md) and [editing](EVENT_EDITING_RUNBOOK.md).

## Verification

Final evidence is in [the 8 October record](../release-evidence/finalization-2026-10-08/verification.md):

- **127 source migration files** replayed.
- **34 database files / 1,092 passing assertions**, no failed assertions.
- **19 new worker unit contracts** pass; the final full app gate is recorded in the evidence.
- Generated public types retain exactly **97 hash-bound held Spaces differences**, without widening the allowance.
- Schema lint, formatting/lint/types/packages/production build/budgets are recorded at their exact checkpoints.
- Entry-point types use pinned SDK 2.111.0 and a minimal Deno ambient declaration. Native Deno execution and real Edge deployment remain staging acceptance.

The final database is independent in the dedicated local test container, with schema-only Auth/Storage/Realtime bootstrap, no copied application data and synthetic rolled-back fixtures. It verifies application source, not a hosted upgrade.

Earlier startup/bootstrap attempts failed. A shared local backend crashed during a denied SQL set-returning wrapper and recovered automatically. Remaining tests moved to the dedicated container; claim wrappers use non-inlined PL/pgSQL and negative-call checks pass there. Tests also repaired stale-message/dead-letter precedence and verified complete payload freezing, immutable paths and deleted-account denial. Failed iterations are not counted as passing gates.

## GitHub and hosted — checked 8 October

| Surface       | Current state                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Member        | GitHub main `04e10e5f754b219c6774a8da6b5159183e38fe7c`; local checkpoint `e63290c` is one commit ahead, plus uncommitted work.               |
| Admin         | GitHub main `20b594081394ecbfec41e9a053aaf7ea3f243ce1`; clean local source tree matches.                                                     |
| Supabase      | **Indus Orbit `jpwvgpnbkrktipwhvqss`**, ACTIVE_HEALTHY, ap-south-1, PostgreSQL 17.6.1.104, **116 migration records / ten active functions**. |
| New functions | `public-form-submit`, `event-guest-session`, `event-email-worker` and `education-file-scan-worker` are absent hosted.                        |

Nine reviewed forward migrations remain pending: the prior seven plus `20261007175816_durable_event_communications.sql` and `20261008094623_education_upload_quarantine.sql`. Historical aliases and held structured Spaces remain separate; do not blanket-apply every differing source file. GitHub CI has not run the unpublished increment.

## Code still left

**Privacy export/deletion and orphan-file cleanup remain unfinished.** The owner will provide different retention rules; 90 days is not approved. Complete [the policy worksheet](PRIVACY_RETENTION_WORKSHEET.md) so engineering can implement actual export scopes, deletion/anonymization, holds and cleanup. Execution remains disabled.

Cohosts/QR, follows, recurring series, uploaded event covers and larger paging remain Planned scope. Razorpay event tickets remain later. They must not be advertised as implemented.

## Before full public production

1. Supply retention/export/deletion/hold rules across guest, attendance, email payload, account/content/upload and audit/finance data.
2. Verify Resend sender/Auth SMTP/recovery and real Turnstile settings; choose/configure the malware scanner and processing region. Secret presence is unverified, not assumed absent.
3. Establish staging; review and coordinate the nine migrations, four functions and Netlify delivery. Test actual roles/challenges/mail/scans and legacy-file backfill before promotion.
4. Bind the owner's actual host/reviewer account, MFA and trusted initial host approval; finish admin hosting/recovery, protected branches, monitoring/support and genuine device/persona checks.
5. Complete chosen OpenAI/DeepSeek account/model/data/commercial evidence and authorized bounded conformance; terminal/runtime and any exposed finance acceptance.
6. Rehearse database/Storage recovery and rollback, production permissions/types and database minor-upgrade review; repeat denial paths on the actual staging engine.

Domain/Netlify, Resend supplier, owner host/reviewer, initial providers and free guest-access choices are resolved. Intended sender remains `events@indusorbit.com`, pending actual verification.

No real email/scanner/model/payment request, personal-data purge, hosted write, supplier provisioning, commit or push occurred. **Locally verified code is not full public production readiness.**
