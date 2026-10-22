# Lightweight direct-message contracts

Updated 21 October 2026. State: **Verified** for the source contracts and targeted
local tests below. Hosted delivery, genuine two-member Realtime acceptance and
production capacity evidence remain **Partial**.

## History and identity

`public.direct_messages` remains the only durable one-to-one history. This change
adds no message table, presence history or persistent draft data. Human messages
remain separate from I/O prompts, tool events and terminal records. The separately
held structured-Spaces release is not activated by this migration.

Source migration:
`20261020162931_lightweight_direct_message_contracts.sql`.

Every new RPC takes `_expected_user_id` and checks it against `auth.uid()`.
Caller checks independently reject suspended, closed and Auth-deleted identities;
closed/suspended/deleted peers are also unavailable. Symmetric blocks hide history,
inbox and contact-picker results. Owner-only block-management results do not
reveal blocks created by another person.

The browser adapter also captures the synchronous account owner and generation
before its first asynchronous step. An A→B→A transition invalidates the original
operation even though the account UUID eventually matches again. It checks this
boundary before dispatch and after awaited results. Missing v2 RPCs produce an
error; they never trigger a legacy/direct-table write fallback.

## Browser contracts

| Public RPC                                   | Result and bounds                                                                                                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `send_my_direct_message_v2`                  | One canonical row. Stable sender-scoped client request ID, accepted-connection authority, 4,000 characters, existing 30/minute sender limit and fixed content-free notification.                      |
| `list_my_direct_conversation_v2`             | Latest/earlier rows descending by `(created_at,id)`, default 50 plus one lookahead.                                                                                                                   |
| `list_my_direct_conversation_after_v2`       | Forward rows ascending after a complete `(created_at,id)` cursor, default 50 plus one lookahead. Resume until no next page to close a longer offline gap.                                             |
| `mark_my_direct_conversation_read_v2`        | Validates a durable message ID in the exact caller/peer pair; resolves its timestamp on the server and acknowledges only through that tuple. Newer rows remain unread.                                |
| `list_my_direct_inbox_v2`                    | Actual conversations ordered by latest permitted `(created_at,id,peer_id)`, with preview, sender, time and caller-owned unread count. Default 50 plus one lookahead; no per-contact history requests. |
| `list_my_direct_contacts_v2`                 | Accepted connections with bounded name search, deterministic name/user cursor and optional exact peer lookup for deep links. Default 50 plus one lookahead.                                           |
| `list_my_blocked_direct_contacts_v2`         | At most 100 blocks created by the caller; no reverse-block disclosure.                                                                                                                                |
| `block_my_member_v2`, `unblock_my_member_v2` | Expected-account wrappers around audited caller-owned block controls.                                                                                                                                 |

The database maximum page size is 100. Browser adapters use 50, consume the
lookahead and expose the last returned row as the next cursor. Structured response
parsers reject foreign-pair rows, malformed IDs/dates, unbounded pages and invalid
inbox evidence. Supabase error codes remain available to the client so authority
denials can clear private cached state while ordinary network failures preserve
recoverable drafts/history.

Requests have a 20-second RPC/read timeout with an `AbortController` passed to
PostgREST's actual `abortSignal()` builder method. Session checks have a 10-second
maximum wait; the installed Auth SDK does not expose cancellation for
`getSession()`, so its late result is ignored and remains account-generation
bound. Timers clear after success/failure. A timeout uses `NETWORK_TIMEOUT`, not an
authority-denial code, and does not prove whether a send committed. Retry retains
the original request ID; it never creates a second message merely because the
response was uncertain.

Read visibility is a client responsibility: the UI must acknowledge only an open,
visible conversation with a seen durable boundary. Server validation establishes
ownership and ordering; it does not establish that a human looked at the screen.
A successful send establishes server acceptance, not recipient-device delivery.
No end-to-end encryption guarantee is introduced.

## Concurrency and legacy access

Sends, block/release and read acknowledgements serialize on the deterministic pair
lock. Sends take Auth row locks against account closure and retain the sender lock
for rate limiting/idempotency. Pair message timestamps advance monotonically after
that lock, preserving forward-cursor ordering for new RPC sends. Existing history
is not rewritten.

Legacy send/read/history signatures remain callable for compatibility, with the
new unavailable-account checks. The legacy read signature retains its historical
mark-through-latest meaning; the new browser uses only the visible-boundary RPC.
Direct browser message writes remain revoked. A restrictive SELECT policy also
hides unavailable pairs, including externally Auth-soft-deleted identities without
an application closure record.

Private topic joins check both participants' availability. The database broadcast
trigger suppresses message fan-out for blocked/suspended/closed pairs. Supabase
Realtime evaluates private-channel policies at join, so an already joined channel
must not be represented as immediate complete permission revocation. In particular,
real staged revocation and ephemeral-signal behaviour need acceptance evidence.

## Local evidence and remaining gates

Targeted isolated synthetic PostgreSQL verification passes:

- 61 new lightweight-DM assertions;
- 47 existing direct-message RPC assertions;
- 26 existing block/Broadcast assertions;
- four existing typing/privacy assertions;
- eight response-parser/account-generation unit tests, four request-timeout tests
  and scoped ESLint.

The tests cover longer-than-one-page catch-up, tied cursors, bounded many-peer
inbox/contact pages, exact read boundaries, unseen unread rows, retries, foreign
expected identities, block privacy, closure, suspension and externally soft-deleted
Auth identities. SQL data fixtures are synthetic and every contract rolls back.
No hosted database or service was mutated by this verification.

The integrated release still needs a fresh full migration replay, generated-type
comparison preserving the held Spaces differences, shared-client/UI gates and
exact release evidence. Before **Released**, prove genuine two-member/two-device
Auth and private Realtime behaviour, revocation, hidden-tab unread semantics,
reconnect, failed/uncertain sends and load/capacity on staging.
