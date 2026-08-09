# Trusted notification and email boundary

Status: database and browser cutover Released to the active demo project; email worker source Verified locally but not deployed, updated 9 August 2026.

This record defines what now owns cross-member notifications and email. It replaces the former pattern in which browser code could choose a notification recipient, category, message, link, email subject and HTML. That former contract is no longer executable by authenticated users.

## Released database boundary

`20260809142000_create_trusted_product_event_rpcs.sql` and its operational hardening follow-up `20260809150000_harden_email_delivery_claims.sql` are recorded in the demo migration ledger. They provide these transactional product contracts:

| Product action                     | Trusted contract                   | Database-owned effects                                                                                                          |
| ---------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Send connection request            | `create_my_connection_request`     | caller identity, validation, idempotency, request row and fixed recipient notification                                          |
| Accept/decline/withdraw connection | `respond_to_my_connection_request` | participant role, legal transition, response timestamp and fixed acceptance notification                                        |
| Request mentorship                 | `request_my_mentor_session`        | verified booker, duration/message validation, idempotency, session row and expert notification                                  |
| Transition mentorship              | `transition_my_mentor_session`     | participant authority, legal state transition, HTTPS meeting link, recipient notification and fixed-template email outbox event |
| Post mission update                | `post_my_mission_update`           | membership/admin check, idempotency, update row and server-derived member fan-out                                               |
| Request a vouch                    | `request_my_vouch`                 | requester identity, verified target check, idempotency, audit row and target/admin notification                                 |
| Approve Chapter proposal           | `approve_chapter_proposal`         | admin check, locked proposal, Chapter, lead membership, status, audit and proposer notification                                 |
| Reject Chapter proposal            | `reject_chapter_proposal`          | admin check, locked transition, audit and proposer notification                                                                 |

The browser retains RLS-scoped reads. Direct `INSERT`/`UPDATE` grants are revoked for the protected event-producing mutations. Mission leads retain the narrow `is_pinned` update column. `send_notification(uuid,text,text,text)` still exists only as retired schema history; `authenticated`, `anon` and `PUBLIC` cannot execute it.

Every idempotent creation uses a caller-scoped `client_request_id` and unique partial index. Retries with the same payload return the existing row; reuse for another payload fails closed.

## Private email outbox

`private.email_delivery_outbox` is Released to demo with RLS and no browser read/write grant. The mentorship acceptance transaction enqueues one `mentor_session_accepted` event when the recipient has email enabled. The queue stores only:

- a unique database-owned event key;
- recipient user ID;
- an allowlisted template key;
- scalar template variables such as mentor name, scheduled time and HTTPS meeting URL;
- lease, attempt, retry, dead-letter and provider receipt state.

It never accepts a caller-authored subject or HTML body.

`claim_email_delivery_batch` and `complete_email_delivery` are executable only by `service_role`. Claims use `FOR UPDATE SKIP LOCKED`, bounded batches, a lease token, a ten-minute stale-lease recovery window, five attempts and exponential retry capped at one hour. Missing-email recipients fail closed as operator-visible dead jobs. Completion must present the matching lease. Successful jobs become immutable delivery evidence; exhausted jobs become `dead` for operator review. The recipient foreign key has a covering index.

## Worker source and activation state

`supabase/functions/notification-email-worker/index.ts` and the fixed Indus Orbit template renderer are Verified locally. The worker:

- accepts service credentials only and is not callable with an ordinary user JWT;
- claims service-leased jobs instead of accepting browser recipients/content;
- renders allowlisted, HTML-escaped templates;
- uses the outbox job ID as the provider idempotency key;
- records success/provider ID or a redacted bounded error through the lease-completion RPC.

The worker is intentionally **not deployed**. No email/provider request was made. The formerly deployed browser-composed `resend-email-dispatcher` was replaced in place by a `410 Gone` tombstone at version 14, so stale callers cannot send through the retired contract. Activation of the new worker requires these Supabase Edge Function secrets and a reviewed service-only schedule:

```text
RESEND_API_KEY=<provider API key>
IO_EMAIL_FROM=Indus Orbit <notifications@approved-domain>
```

`SUPABASE_URL` and Supabase backend keys are managed platform secrets and must never be copied into browser or GitHub source. The sender domain must be verified with the chosen provider before deployment.

## Verification evidence

- All 83 trusted-product-event pgTAP assertions pass locally.
- The complete current local database suite passes 376/376 assertions.
- Thirty notification ACL assertions pass after retirement of generic authenticated execution.
- The hosted read-only release contract passes 20/20 aggregate checks.
- Hosted checks prove 17 caller-bound functions exist, the product tables use RPC-only event writes, the outbox is private/service-leased, provider routing remains disabled and provider traffic evidence remains zero.
- The fixed email renderer has three unit tests covering the approved template, HTML escaping/unsafe URL rejection and fail-closed unknown templates.

## Remaining before production

1. Choose and verify the transactional email provider and sender domain.
2. Deploy the worker only after its secrets are present; invoke it with a service/secret key, never from the browser.
3. Add a scheduler, redacted operator queue/dead-letter screen, alerting and a no-send dry-run environment.
4. Run provider sandbox delivery, retry, duplicate, preference-off and dead-letter tests.
5. Add transactional email categories only through a reviewed template migration and matching tests.
6. Complete contact/newsletter/auth abuse limits and the remaining authenticated `SECURITY DEFINER` review.

Production email delivery is therefore **Partial**: the trusted code and database queue exist, while provider configuration, worker deployment and operational evidence remain Planned.
