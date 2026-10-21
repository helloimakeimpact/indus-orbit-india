# Event discussion delivery and operating boundary

Updated **21 October 2026**. State: **Partial**. The shared Room foundation and the first fifty event SQL assertions are **Verified** on a synthetic local database. Fourteen event units, five intercepted browser journeys, TypeScript and scoped lint pass. The final safety/export increment extends the event SQL contract to sixty-seven assertions; Docker's local API stalled before its targeted execution. The combined fresh migration replay, final SQL contracts, schema/type/advisor evidence and hosted acceptance are separate gates. No hosted event discussion has been activated by this work.

## Product and authority

An approved event's actual host can opt in to **Event discussion** from the invitation. The host joins when enabling it. A confirmed attendee must explicitly choose **Join event discussion**. Before joining, the page discloses that the person's name is visible to the group. Existing group history becomes available after joining.

An email-only registration may be linked only to a signed-in account whose **managed Auth email is confirmed** and matches the existing guest registration. Browser email input and editable user metadata are never identity evidence. A current account registration takes precedence over an email-only record, so a rejected or waitlisted account cannot claim a different guest record to bypass its decision. Public registration/proof links remain independent of chat access. Joining does not grant Community, Chapter or Mission membership.

Only the actual eligible event host can enable/close discussion or use host message restriction/restoration. General event reviewers and platform operators do not silently become conversation participants. A member report enters the existing private safety workflow with a user-supplied explanation; the UI does not automatically copy message content into that explanation. Host restriction/restoration requires a reason and produces private audit evidence. Request IDs are bound to their original report or moderation action.

Posting ends **seven days after the event ends**, as an operating default. Existing authorized history remains readable afterward; no new thirty-day chat purge or access cutoff is invented. Current registration/account eligibility, host closure, event cancellation and the existing retention/deletion policy continue to control access. A new registration decision after revocation requires joining again. Closing and reopening reuses the same Room and history.

## Existing storage and held work

The forward event migration adds `event` as an explicit `conversation_spaces` source, with an `event_id` invariant, private visibility and closed join policy. One private `event_discussions` configuration points to one existing Room. Messages, cursor history, read state, moderation and reports reuse the existing conversation records and operations. No direct-message history is migrated, duplicated or dual-written.

Chapter/Mission source authority is preserved. The broad structured-Spaces release remains held; event discussion neither applies it nor relies on its role hierarchy, Boards, Room lifecycle or saved-work increment. Event links open the event invitation's discussion section, rather than pretending its source is a Chapter or Mission in the generic Space route.

## Delivery and revocation

Expected-account public invoker wrappers call private privileged implementations. Discussion history rechecks current authority before delegating to the shared Room feed. The inclusive upper cursor refreshes an older viewport without introducing a reconnect gap. Client windows contain at most **200** messages; server pages default to **50**, with a hard ceiling of **100**. Earlier paging preserves the visible message anchor and exposes an explicit return-to-latest action. Latest refresh replaces a contiguous window rather than splicing a stale page onto a new page across missing history.

Event message delivery uses **Postgres Changes with the existing message-row RLS**, rather than relying on a cached private Broadcast join. Registration removal, cancellation, suspension and account closure deny message SELECT RLS as well as feed/send operations. Genuine two-device delivery and revoked-session acceptance must still be proved in staging. Data already legitimately received by another person's device cannot be recalled.

Event send/join and the generic event-message insert guard use the privacy subject lock and managed Auth row before the event lock, matching the account-closure ordering. Event cancellation/registration decisions serialize on the event. The generic Room insertion path cannot bypass the post-event deadline. Public event discovery never exposes the private discussion Room or history.

## Retry, memory and performance

The event panel is lazy loaded only for a signed-in invitation viewer. Inbox Community conversations load behind the explicit Groups action. Neither public event discovery nor the public shell eagerly opens group timelines.

Uncertain sends retain their original request ID, text and recipient event. The tab saves at most **one pending operation per event**, across at most **ten events**, with at most **4,000 characters** each. A same-tab reload restores that operation for an explicit retry; it does not automatically resend. Storage denial/corruption/full capacity has visible recovery feedback. Every Auth owner transition clears foreign recovery keys synchronously even when the lazy panel is absent; initial Auth restoration may retain only that same owner's valid namespace. Sign-out clears event retry recovery. Ordinary unsent drafts are kept in the open component's memory.

No chat SDK, calling stack, contact import, durable last-seen tracker or additional messaging backend is introduced. The initial event panel supports text, read-only history, reporting and host restriction/restoration. File sharing remains the existing quarantine-first Room capability and is not exposed in this event panel. It must not be advertised as working until the approved scanner and genuine Storage acceptance exist. No end-to-end encryption claim is made.

## Privacy inventory

The new private discussion configuration has no attendee name/email fields. Authored event messages, owned attachment metadata, read states and canonical registration records remain covered by the existing shared privacy inventory. The forward safety/privacy migration explicitly adds **only the caller's** `conversation_space_memberships` rows, including their join/leave/state, as the **thirty-fifth** reviewed dataset. Other participants' membership rows are excluded. The existing **10,000-record per dataset** and conservative **five-million-byte** SQL bounds remain; binary and larger supplements stay assisted.

Account erasure revokes the person's group membership, removes authored text/revisions and owned file bytes through the shared trusted flow, and retains a documented pseudonymous shared structure. Event/subject safety holds apply before erasure. Host configuration/audit/case supplements continue through reviewed assistance. Group UI, new export coverage and source policy do not activate hosted erasure or alter the delegated retention periods.

## Release gates

1. Rehearse the exact alias-safe backend release in approved separate staging. Apply the event source migration and then its safety/privacy forward migration after their reviewed privacy/Room prerequisites. Do not use blanket `db push`, rewrite historical aliases or silently apply held Spaces.
2. Pass the fresh combined replay, all database contracts, bounded generated-type review and public/private schema/advisor checks. Confirm no unapproved source-role or held-work drift.
3. Deliver the paired member frontend; prove host/confirmed member/verified guest/waitlisted/outsider behaviour with genuine Auth and independently scoped operators. Verify expected-account races and actual revoked recipient delivery.
4. Verify long history, more than fifty missed messages, older-scroll anchoring, account changes, sign-out, denied storage, interrupted sends, duplicate retries, mobile keyboard/focus and report/moderation recovery on real devices.
5. Configure the existing safety queue's responsible operators and escalation/recovery process. Prove account export/deletion/hold, actual Storage/Auth cleanup and backup restore under the broader privacy runbook. Activate only after named release sign-off.

The owner still provides staging/team access, real MFA/operator personas and service setup through dashboards. Engineering owns the source, exact release manifest, genuine supplier/Realtime rehearsal and recovery evidence. Choosing a visual chat reference does not replace those checks.
