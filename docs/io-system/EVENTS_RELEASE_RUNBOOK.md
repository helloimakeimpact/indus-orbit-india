# Native Community events — implementation and rollout

Updated **20 October 2026**. Core source: **Verified** by the recorded application and managed database gates. Hosted event delivery and full public production: **Partial**. Read [the full current report](PRODUCTION_STATUS_2026-10-20.md), [publication evidence](SOURCE_PUBLICATION_2026-10-19.md), [guest registration](EVENT_GUEST_REGISTRATION_RUNBOOK.md), [editing/review](EVENT_EDITING_RUNBOOK.md) and [communications](EVENT_COMMUNICATIONS_RUNBOOK.md).

## Approved product and brand

Indus Orbit remains **The General Intelligence Company of India**, with **Intelligence, built together.**, the original pixel/dawn/lotus/banyan art, indigo/parchment/saffron and Fraunces/Inter. Community adapts date-led discovery, clear host/date/location facts, expressive original covers, a distinct registration panel and continuing community homes.

Public discovery and **public name/email guest registration are the default**. Hosts can choose Community/chapter restrictions. The earlier membership question is resolved; no new membership decision is pending. Hosting requires approved member authority, with review for new hosts. Free native events come first; Razorpay tickets remain Planned later scope.

Routes: `/events`, `/events/:id`, `/communities`, `/communities/:id`, `/app/events`, `/app/events/:id`, `/app/events/hosting`. Search/date/format filters, explicit empty/outage/private states, original cover templates, timezone display and safe calendar export exist. Private access credentials are excluded from public projection/calendar output.

## Verified source boundaries

- Anonymous callers use bounded discovery/invitation projections, not raw event rows or guest identities. Public, unlisted and membership-restricted invitations have distinct access rules.
- Private address/join details live separately. Existing addresses are not guessed into public city labels. Only eligible confirmed guests or authorized hosts/operators get private access.
- Browser event/legacy RSVP writes are revoked. Caller identity and expected account are checked in trusted transactions; submission IDs bind to content fingerprints. Legacy RSVP history is retained rather than converted into confirmed seats.
- New hosts submit pending events. Approved hosts can publish in their authority; chapter publication needs active chapter lead authority or review. Content operators require capability, non-suspension and AAL2; self-approval does not bootstrap host authority.
- Confirmed/pending/waitlisted/cancelled/rejected states, event-row capacity locks and eligible waitlist promotion are implemented. Guest lists/manual check-in require current host/operator authority. Workspace/guest-list pages are bounded; larger paging is not implied.
- Email proof links require explicit confirmation and share the same capacity engine as members. A guest need not create a platform account. Registration does not subscribe anyone to marketing.
- Editing/rescheduling has private revision history. Chapter/admin decisions identify the inspected revision; admin also checks publication state. Unversioned older decisions fail closed. Cancellation withdraws publication and queues notices; a cancelled invitation cannot be republished through an older review path.
- Transactional status/update/cancellation/reminder outbox and worker source is implemented, with immutable provider payloads, bounded retries/idempotency and obsolete-job suppression. It is not marked live before actual Resend/schedule acceptance.
- Private access revalidates on relevant account/event/focus changes without treating stale credentials as authorized. Private state is cleared on identity/event changes. Failed checks have explicit recovery.

## Coordinated delivery

1. Existing production is `jpwvgpnbkrktipwhvqss`; arrange an approved separate staging project/site. The inactive backup replica is not assumed ready. Public domain/Netlify, Resend, the owner as first host/reviewer and OpenAI/DeepSeek choices are resolved.
2. Review the current **twelve exact forward files and seven functions** in [the manifest](../release-evidence/finalization-2026-10-18/reviewed-forward-release-manifest.json). Treat historical aliases and held Spaces separately; never blanket push/repair history from counts.
3. Configure actual Turnstile/Resend/Auth SMTP/scanner services and backups. Rehearse the approved backend sequence, preserve data, backfill quarantine scans, then pair both frontends. A GitHub push may trigger Netlify but does not supply missing database APIs.
4. Bootstrap initial approved hosts through trusted authorized review. Check real pending invitations, public labels and private access details. Host approval and event approval remain distinct.
5. Exercise genuine guest/member/host/chapter/operator/suspended personas, concurrency/waitlists, revision races, cancellation/mail, access withdrawal, calendar files, real devices and assistive use. Verify direct REST denials and actual supplier failures.
6. Activate monitored service-only schedules only after staging evidence. Rehearse recovery/rollback, verify the exact deployed versions, then obtain production sign-off. Privacy policy is owner-delegated and implemented in bounded source; [privacy execution](PRIVACY_EXECUTION_RUNBOOK.md) still has actual-service and operating gates.

## Verification and remaining scope

The full source gate replays 130 migrations and passes 38 SQL contracts / 1,237 assertions, exact types and schema lint. Application gates cover 236 member units, 35 admin units and 49 browser journeys. The 97 held Spaces differences remain separately hash-bound. This does not establish a hosted upgrade or genuine Auth/mail/scan/operator acceptance.

Editing, revision-aware review and transactional mail source are implemented; older descriptions listing them as missing are superseded. Remaining Planned product enhancements include cohosts/check-in staff, QR credentials, durable follows/calendar subscriptions, recurring series, custom uploaded covers and larger host/review paging. These are distinct from the required real-service/recovery/release gates above.
