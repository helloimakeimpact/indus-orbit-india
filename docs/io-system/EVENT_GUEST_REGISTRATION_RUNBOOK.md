# Public event guest registration

> Owner stop checkpoint, 3 October 2026: development and active verification stopped as requested. Source is saved locally without a push. Latest complete replay/types/browser refinements remain pending; see [the status report](PRODUCTION_STATUS_2026-10-03.md) and its evidence boundary before rollout.

Status: **Partial**, 3 October 2026. Source implements the owner's explicit choice: public name/email guest registration by default; hosts may require active Indus Orbit Community or chapter membership. This supersedes the earlier mandatory-membership decision. Actual email delivery and hosted deployment remain unverified.

## Product contract

The guest has no platform account created for them. They enter name/email, receive a private link, and explicitly confirm registration. Opening the link alone does not allocate a seat. The shared event capacity/approval/waitlist engine determines confirmed, pending or waitlisted status. A confirmed guest can access the private venue/join URL; pending/waitlisted/declined/cancelled guests cannot. Hosts see scoped names and attendance states; guest emails are not public or returned in the host guest-list RPC.

New events default to public registration. Existing events keep their previous explicit Community restriction; an operator must review them before changing it. Discovery visibility and registration permission are separate. Members-only visibility cannot be used to publish a publicly registrable invitation in the creation RPC.

This adapts [Luma's name/email guest registration](https://help.luma.com/p/event-registration-process) and [optional calendar membership restrictions](https://help.luma.com/p/calendar-memberships), observed 3 October 2026. Indus Orbit uses its own Community/chapter identities, artwork and review authority. Paid tickets/Razorpay remain later work.

## Security and data contract

Migration: `20261002224602_public_event_guest_registration.sql`, after the native event migration. It does not change existing restrictions silently.

- `event-guest-session` has JWT gateway verification disabled because guests have no platform JWT. It checks an exact allowed browser origin and verifies the Turnstile action `event_registration` and hostname for email requests. Origins do not substitute for authorization; only a 256-bit random private credential authorizes receipts, confirmation and cancellation.
- Guest RPCs are service-only invoker wrappers around private privileged functions. Browser roles cannot call them or read guest identities/credentials directly. The service key never reaches browser code.
- Only SHA-256 credential hashes are stored. Initial links expire after 15 minutes; explicit confirmation extends that link until seven days after the event ends. Links stay scoped to a single event and registration. The browser removes the fragment and retains the credential only in event-scoped session storage, with an in-memory fallback if storage is unavailable. The credential is never put in a URL query, shared invitation, calendar export or API log by source code. Treat receipt links as private bearer credentials.
- Request responses are identical for throttling, unavailable/restricted events and accepted requests. The database serializes three requests per email per hour and a global 100 requests per minute. Monitor this deliberately bounded default before expanding it; configure gateway abuse controls for deployment.
- Guest verification and authenticated registration share the parent event lock. Matching verified account/email paths reuse a registration instead of allocating twice. Suspended accounts cannot bypass restrictions by using their email as a public guest. Community/chapter events still require active membership.
- Attendance cannot be erased by guest cancellation. Event cancellation withdraws access. Focus/visibility checks reconcile the receipt without page reload and hide private credentials during revalidation.
- No newsletter/marketing enrollment occurs. Name/email and attendance are operational personal data; the owner must approve their retention/export/delete scope before launch. `prune_expired_event_guest_links()` is service-only and deletes expired links after one further day; schedule it daily in the reviewed environment. This does not purge registrations or replace the approved privacy workflow.

## Delivery steps

1. Name staging/production, approve the paired migrations and review existing events. Apply the event and guest migrations only in the explicitly authorized environment.
2. Configure server secrets `TURNSTILE_SECRET_KEY`, `PUBLIC_FORM_ALLOWED_ORIGINS`, `EVENT_PUBLIC_ORIGIN` (exact approved HTTPS origin), `RESEND_API_KEY`, `IO_EMAIL_FROM`. Configure browser `VITE_TURNSTILE_SITE_KEY`. No supplier account or secret is committed. This reuses the existing Resend integration; supplier/domain activation still requires the owner's account and approved sender.
3. Deploy `event-guest-session` with the checked-in function configuration. Configure real challenge hostname restrictions, provider sender/domain verification and email-link tracking disabled so private URLs are not rewritten or exposed to analytics. The source uses the fixed [Resend Email API](https://resend.com/docs/api-reference/emails/send-email) and [Supabase's email-function pattern](https://supabase.com/docs/guides/functions/examples/send-emails).
4. Schedule the service-only expiry cleanup, configure abuse/delivery monitoring, approve retention and rehearse revocation/support procedures. Lost/expired links are recovered by requesting a new email link; sharing a link grants its holder control until expiry.
5. Verify on real desktop/mobile mail clients: name/email request, deliverability, link scanner behavior, explicit confirmation, re-opened receipt, pending/approval/waitlist transitions, cancellation, simultaneous last-seat requests, account/email deduplication, chapter/community denials and expired-link recovery. Local interception does not prove deliverability.

The request handler sends an email link directly, with a bounded provider timeout and idempotency header; provider rejection is reported as failure. A network failure may consume the request budget and require a later retry. Email acceptance by Resend is not delivery to the inbox. The wider event status-change/reminder outbox remains separate launch work; this increment does not claim those messages are delivered.
