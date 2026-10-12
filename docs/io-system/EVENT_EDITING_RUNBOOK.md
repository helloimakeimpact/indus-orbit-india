# Event editing and rescheduling

Implementation: **Verified** at the stated local evidence boundary; release remains **Partial**. The 3 October [resume record](../release-evidence/resume-2026-10-03/verification.md) covers editing/main review. The 13 October [review increment](../release-evidence/finalization-2026-10-13/verification.md) covers chapter/separate-admin version checks. No hosted migration is applied.

## Implemented contract

Migration `20261003100000_version_host_event_edits.sql` follows the native event and public guest migrations.

- A caller-bound draft contains current private access details and the latest ten change records. Another member cannot retrieve it. Raw history remains private with browser table privileges revoked.
- An active member can edit their pending invitation. Changing a published invitation requires approved host authority (and chapter leadership for chapter publication), or a scoped content reviewer with MFA. Editing cannot approve an event, change organizer/chapter, revive cancellation or alter registration scope, capacity, visibility or approval conditions.
- Upcoming scheduled invitations may change title, description, dates, display timezone, format, public location label, original cover template and private access fields. Existing confirmed/pending/waitlisted registrations remain.
- The editor locks the same parent row as reservation/cancellation. Expected revisions reject stale overwrites; per-actor request UUIDs/fingerprints make lost-response retries idempotent and reject reuse for changed content. A bounded change reason and audit event are required.
- History contains field names and safe title/time/public-location summaries. Private join/venue values are not copied into summaries. Actor references can be cleared by account erasure; the retention worker must still handle reasons/event records according to the approved inventory.
- Rescheduling updates still-active verified guest receipts to seven days after the new end. Expired credentials stay expired; unconfirmed 15-minute email challenges are not extended. Event cancellation still closes access independently of expiry.
- Main hosting and chapter review submit the inspected revision through `review_event_revision`. Chapter queue details and revision share a statement snapshot, expose only another host's pending submission in an active led chapter, and include the complete invitation/private access fields. Editing a pending invitation makes an earlier review stale; the chapter page offers an explicit refresh.
- Migration `20261012220739_require_event_review_versions.sql` adds `admin_content_queue_revision` and `admin_transition_event_revision`. Separate admin decisions check both revision and publication state under the parent lock, preserving the lifecycle graph, MFA/capability checks and private reason audit. The queue retains bounded summaries; invalid/missing revision evidence disables decisions. Accepted admin decisions record revision evidence privately.
- The old `lead_approve_event`/`lead_reject_event` commands refuse a missing inspected revision. `admin_transition_content` retains non-event support but refuses event decisions. Direct browser execution of the original private event/lifecycle implementation is revoked. No legacy fallback restores versionless publication.
- Admin withdrawal of an approved invitation changes its lifecycle to `cancelled` in the same transaction as publication withdrawal. Existing lifecycle triggers enqueue guest cancellation notices and close further access/registration. The confirmation explains this effect. Admin review cannot return a cancelled invitation to pending/approved; versioned host/chapter approval also refuses cancellation. A cancelled pending submission can still be declined. A new gathering requires a new invitation.
- Device-local date entry is distinguished from invitation display timezone. Registration settings are disabled in the editor. Rejection retains the draft; closing restores focus to the original edit button despite asynchronous loading. Clearing a chapter only changes a chapter-only restriction, preserving the public registration default.

## Delivery

Deliver the reviewed migrations before both member and separate-admin frontends in staging. Verify real host, revoked-host/lead, chapter lead, MFA reviewer and unauthorized member behavior, registration preservation, timezone entry, active/expired receipts, stale edits/reviews and retry behavior. The review migration is the tenth explicitly reviewed forward release; do not blanket-apply historical source migrations to production. A frontend rollback must retain versioned review or pause event decisions, rather than re-enable the legacy command. Complete guest communication and rollback acceptance before public rollout.

## Communications increment — 8 October 2026

Automatic registration/change/cancellation/waitlist/reminder mail now has a transactional outbox and service worker in source. See [communications delivery](EVENT_COMMUNICATIONS_RUNBOOK.md). It remains Partial until database verification, configuration, hosted delivery and real Resend acceptance are complete. The direct initial guest proof link remains separate.

## Remaining product scope

Capacity/access-policy changes, recurring series, cohost/check-in teams/QR credentials, follows, custom uploaded covers and larger host/review paging remain separate product work. Razorpay event tickets remain later by instruction.
