# Event communications delivery

Implementation: **Verified locally**, 8 October 2026. Production release remains **Partial**. Exact gates are in [finalization evidence](../release-evidence/finalization-2026-10-08/verification.md).

## Source

- `20261007175816_durable_event_communications.sql`
- `supabase/functions/event-email-worker/index.ts`
- `supabase/functions/_shared/events/email-worker.ts` and `email-template.ts`
- `supabase/tests/database/event_communications.test.sql`

The existing initial guest email proof link stays in `event-guest-session`. This increment supplies subsequent transactional event mail.

## Transactional contract

Registration inserts/status changes enqueue a fixed registration message in the same transaction, including pending, confirmed, waitlisted, cancelled and rejected states. Waitlist promotion advances the registration communication version. Check-in and identity binding do not create duplicate status messages.

Event edit-history insertion queues updated invitation notices for active registrations and future reminders. Event cancellation queues an explicit cancellation notice. Confirmed registrations receive 24-hour and one-hour reminders if the threshold is still in the future; no old reminder is caught up. Existing confirmed registrations receive future reminders on migration delivery, without backfilled confirmation emails.

A unique registration/kind/status-version/event-revision key prevents repeated enqueue. Parent event and registration contracts retain their existing authority and capacity locks. An event email grants no private access.

## Worker and privacy

The private outbox uses RLS, revoked browser privileges, service-only invoker RPC wrappers and a private implementation. A worker claims at most ten jobs per invocation (SQL maximum twenty), with a five-minute lease, five total attempts and retry backoff. Missing recipients fail closed.

Claims snapshot the verified account or guest email, public invitation facts and status. They exclude private venue/join credentials, guest names, bearer tokens and raw change reasons. Retries keep the same immutable payload and provider idempotency key. Immediately before sending, a fresh RPC suppresses changed/cancelled/ineligible registrations, old event revisions, withdrawn reminder eligibility and changed recipient addresses. A final external HTTP race cannot be eliminated; current invitation/access RPCs remain authoritative.

Resend's idempotency window is [24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys), reviewed 7 October 2026. Automatic retries stop after twenty hours from the first attempt. Crashed final attempts become dead letters. Ambiguous old jobs are not automatically resent. Manual investigation must distinguish an acknowledged provider send from an unknown outcome before any separate replacement notification.

The provider call has an eight-second timeout. Provider bodies/errors are not logged or copied into durable errors. Operational errors use fixed codes; worker responses contain counts only. A failed acknowledgement is separately counted so the scheduler can alert/retry.

Guest emails point to the normal invitation. They explain how to use the original verified registration email or request another secure link. These status/reminder messages do not mint or distribute new bearer credentials and do not subscribe anyone to marketing.

## Required release setup

1. Deliver the reviewed event/edit/communication migrations in staging.
2. Configure `EVENT_PUBLIC_ORIGIN=https://indusorbit.com`, `IO_EMAIL_FROM=Indus Orbit <events@indusorbit.com>` and server-only `RESEND_API_KEY` after sender/domain verification.
3. Deploy `event-email-worker` with gateway JWT verification disabled only because the handler checks a server-only Supabase secret. Browser publishable/anon keys must fail. Preserve `event-guest-session` separately.
4. Configure a one-minute internal POST schedule using Vault-held server credentials. Never put a service key in the browser or a public cron URL. [Official scheduling guide](https://supabase.com/docs/guides/functions/schedule-functions), reviewed 7 October.
5. Rehearse actual confirmed/pending/waitlisted/declined/cancelled member and guest mail, waitlist promotion, edit/cancel before claim and between claim/preflight, provider failure, missing/moved account email, expired lease and dead letters.
6. Verify actual delivery and alerting, sender identity, links, mobile/desktop timezone copy and duplicate suppression before promotion.

Service diagnostics use `private.event_delivery_outbox`; show only state/kind/attempt/error counts to ordinary operators. The worker cannot prove mailbox delivery from an accepted Resend request. No scheduler, hosted migration, provider secret or real email is activated by this source change.

## Retention

The service-only preparation contract freezes the complete provider payload, including sender, recipient, subject, text and HTML, before the first request. Retries reuse that stored payload even when templates or sender settings change. Extra recipients/fields and invalid headers are rejected. Staleness is checked again during preparation. Private venue credentials and guest bearer tokens are not included.

The owner chose to provide different retention rules on 7 October; the proposed 90 days is not approved. Recipient/template payload and delivery history need explicit retention/export/deletion rules with the wider data inventory. No new personal-data purge runs automatically in this increment.
