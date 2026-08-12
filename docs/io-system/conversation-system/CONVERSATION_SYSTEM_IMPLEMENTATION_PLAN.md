# Indus Orbit conversation and Discord-like system plan

Status: active code-level plan, verified again 10 August 2026. Direct messages, trusted domain events, email claim hardening and the Chapter/Mission Space foundation are Released to demo. The first branded member surface is pushed to GitHub. A clean 66-migration replay, 516/516 database assertions, 43 unit tests, typecheck and build pass; the earlier hosted schema/RLS/RPC/Realtime contract remains the release evidence. Threads UI, browser personas, pagination, private Broadcast and wider collaboration remain Partial or Planned. This extends the existing conversation product; it does not authorize a Discord clone or a replacement social system.

## Current Chapter/Mission Space addendum

`20260809152439_create_chapter_mission_space_foundation.sql` changes P4 from a design-only phase to a Released foundation. It introduces Space roles/memberships, grouped typed Rooms, overrides, Threads, messages, revisions, mentions, reactions, attachments, pins, bookmarks, read state, preferences, reports, private moderation/outbox records and deterministic Chapter/Mission Room blueprints.

The application now has a first live `/app/spaces/$spaceId` route with Room navigation, durable timeline/composer, active People roster, Realtime insert reconciliation and Room read advancement. Chapter and Mission detail routes reveal that Space only to active members. Protected Chapter/Mission/member/admin mutations prefer caller-bound RPCs. Rolling fallbacks occur only for explicit missing-schema errors so the compatible frontend can be released before the hosted migration; authorization, validation and concurrency errors never fall back.

The precise delivered schema, safe hosted order and code-versus-owner split are maintained in `CHAPTER_MISSION_SPACE_SYSTEM_PLAN.md`. The frontend-first plus exact three-migration release is complete; hosted object/RLS/RPC/Realtime checks pass. Authenticated member/admin browser personas remain. Ordinary linked `db push` remains unsafe while the 26 historical timestamp aliases exist.

Operational cross-reference: `../io-port-system/IO_PORT_IMPLEMENTATION_STATUS.md` records the current done/partial/not-started boundary for I/O, terminal, and conversation integration. `DISCORD_LIKE_CAPABILITY_PLAN.md` expands the full intended collaboration feature set.

## 1. Product decision

Indus Orbit already has a durable human conversation product. Its code path is:

```text
/app/messages
  → src/routes/app.messages.tsx
  → src/server/messages.functions.ts
  → public.direct_messages
  → notifications + Supabase Realtime

Global quick chat
  → src/components/app/ChatDropdown.tsx
  → the same direct_messages table and notification writer
```

The Discord-like work must make this system easier to navigate, more coherent across spaces and more reliable in real time. It must not duplicate or replace current direct-message history, conflate people with agents, or copy Discord terminology, colours or engagement mechanics. A later generic conversation core is for scoped group collaboration; direct messages remain a virtual conversation type until a single, tested migration can replace their storage without dual-writing.

## 2. Evidence-backed baseline and corrections

| Area                   | Current implementation                                                                                                                                                                                 | Required correction                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Message route          | `src/routes/app.messages.tsx` + shared conversation hooks                                                                                                                                              | Now uses the shared contact/history/send/realtime hooks. Add cursor pagination before message volume grows.                                                                              |
| Quick chat             | `src/components/app/ChatDropdown.tsx` + shared conversation hooks                                                                                                                                      | Now uses the same hooks and Realtime unread reconciliation; no 15-second unread polling. A cross-surface cache/store remains the next extraction.                                        |
| Data access            | `src/server/messages.functions.ts`                                                                                                                                                                     | Browser reads remain RLS-scoped; send/read mutations now call caller-bound RPCs. Keep all later privileged actions in similarly narrow RPC/Edge Function contracts.                      |
| Durable data           | `public.direct_messages`                                                                                                                                                                               | Keep it as the canonical one-to-one human message source. Add no I/O prompt/tool content here.                                                                                           |
| Realtime               | Shared Postgres Changes subscriptions, locally filtered by participants                                                                                                                                | The P1 proof uses a stable `dm:<sorted-user-ids>` subscription name, durable-row deduplication and read acknowledgement. Move to authorized private Broadcast after the RLS/proof phase. |
| Existing authorization | Client formerly checked accepted connections before insert                                                                                                                                             | **Locally Verified:** the send RPC owns sender identity and enforces distinct participants, accepted relationship, suspension, length, sender idempotency and a 30-per-minute limit.     |
| Read updates           | Recipient formerly had a broad row-update policy                                                                                                                                                       | **Locally Verified:** direct browser UPDATE is revoked; a caller-bound RPC marks only unread rows received by the caller from one selected member.                                       |
| Existing query shape   | Full two-way history query; new recent-pair and recipient-unread indexes                                                                                                                               | Profile the two-way predicate, then add cursor paging and only introduce a canonical conversation key if evidence shows it is needed.                                                    |
| Migration history      | All 67 migrations are hosted through the exact-ledger alias-safe release helper; a clean 67-migration local replay passes 541/541 and Space, I/O evidence and I/O operational/terminal contracts pass. | Retain the 26-alias guardrail, automate the safe release view/types drift check, run browser personas and add production-like snapshot-upgrade CI.                                       |
| Notification table     | Owner UI plus domain-owned event writers; retired generic RPC remains only as non-executable history                                                                                                   | **Released:** members read own rows/update `is_read`; product actions cannot choose arbitrary recipients/content. Add operator observability and wider event categories deliberately.    |
| Email delivery         | Private fixed-template outbox is Released; service worker source is Verified locally                                                                                                                   | Configure sender/provider secrets, deploy and schedule the service-only worker, then prove sandbox delivery/retry/dead-letter behavior.                                                  |

### 2.1 Immediate notification containment

`20260801152820_contain_notification_privileges.sql` is Released to demo and remotely verified. It deliberately preserves the generic RPC only for compatibility while remaining browser callers are replaced. It:

- removes all anonymous table privileges;
- gives authenticated clients only `SELECT` and `UPDATE (is_read)`;
- enforces owner-bound SELECT and UPDATE policies with both `USING` and `WITH CHECK`;
- adds owner/recent and owner/unread indexes;
- removes direct browser execution from notification trigger helpers;
- marks `send_notification(uuid,text,text,text)` as deprecated/high risk.

This migration was the containment step. The later trusted-event migration completes the browser cutover: the generic RPC is no longer executable by authenticated clients and the former browser email invocation is removed.

### 2.2 Direct-message mutation boundary

`20260808190000_create_direct_message_rpc_boundary.sql` is Released to demo and retains 38 focused local pgTAP assertions. It:

- adds a sender-scoped client request ID and unique partial index for idempotent retries;
- exposes only `send_my_direct_message(recipient, content, client_request_id)` and `mark_my_direct_conversation_read(other_user_id)` to authenticated callers;
- owns the sender/recipient mutation fields at the trusted boundary and validates accepted relationship, suspension, message length and a serialised 30-per-minute sender limit;
- creates one fixed `direct_message` notification in the same transaction without copying message content;
- revokes authenticated direct `INSERT`, `UPDATE` and `DELETE` on message rows while retaining RLS-scoped reads;
- rewrites the member read policy with scalar `auth.uid()` subqueries so caller identity is not recomputed for every row;
- adds focused recent-conversation and unread-recipient indexes.

Direct-message notifications and the other migrated domain events no longer use `send_notification`. `20260809142000_create_trusted_product_event_rpcs.sql` adds the private outbox and removes authenticated generic execution. Worker activation and operator delivery controls remain before production email can be called complete.

The hosted Security Advisor reports both RPCs as authenticated `SECURITY DEFINER` functions. That exposure is deliberate and bounded: direct table writes are revoked, each function binds the caller with `auth.uid()`, pins an empty `search_path`, owns all protected row fields and is exercised by positive and negative pgTAP cases. They remain entries in the function-by-function authorization matrix, not a blanket advisor waiver.

## 3. Data taxonomy: do not blur these boundaries

| Intent                | Durable system                                | Example                                          |
| --------------------- | --------------------------------------------- | ------------------------------------------------ |
| Private human message | `direct_messages`                             | “Can you review this plan?”                      |
| I/O work event        | `io_session_events` (new)                     | Tool started, route selected, artifact generated |
| Approval              | `io_session_approvals` (new)                  | “Approve this local git commit?”                 |
| Handoff               | `io_session_handoffs` (new) plus notification | “Join this authorized I/O session”               |
| System notice         | existing notifications                        | New message, mention, approval needed            |
| Live presence/typing  | authorized private Realtime Broadcast         | “Member is typing”, “local session attached”     |

An I/O handoff is a permissioned link to an I/O session. It does not copy the prompt, model response, shell output or private files into a direct message.

## 4. P0 — secure the message boundary

### 4.1 Database migration design

The first migration was created through the Supabase CLI and deployed as `20260730170917_harden_direct_messages.sql`. The second is Released as `20260808190000_create_direct_message_rpc_boundary.sql` and now:

1. preserve the deployed insert policy that requires:
   - caller owns `sender_id`;
   - sender and recipient differ;
   - an accepted `connection_requests` relationship exists in either direction;
2. replaces direct browser sends and read-receipt access with `send_my_direct_message()` and `mark_my_direct_conversation_read()` RPCs that enforce connection, suspension, recipient validity, message length, idempotency and a sender rate limit;
3. preserve sender/recipient read access but keep content and participants immutable after insertion;
4. tests the relationship predicate, direct-write revocation, cross-member RLS, retry behavior, fixed notification, suspension, rate limiting and read ownership before deployment;
5. add a canonical, generated conversation pair/key and an index suitable for cursor pagination only after confirming existing data migration/backfill behavior;
6. leaves explicit block state, cross-device browser personas and load evidence for the next slice.

The current send RPC creates a fixed content-free notification in the same transaction and does not call the generic notification RPC or accept caller-authored notification fields. The next delivery migration must project the same event into a private outbox without changing the public send signature.

Use explicit `TO authenticated` policies plus ownership predicates. Do not use user-editable JWT metadata for roles. If a privileged helper is genuinely required, keep it in `private`, fix `search_path`, revoke `PUBLIC` execution and make its authorization rule explicit; a `SECURITY DEFINER` function is not a shortcut around RLS.

### 4.2 Safe send interface

Keep a single public TypeScript contract:

```text
src/features/conversations/contracts.ts
  ConversationContact
  DirectMessage
  ConversationPage
  SendMessageInput
  ConversationEvent
```

The narrow RPC boundary for send and read state is implemented. It gives one atomic place for anti-abuse checks and fixed notification creation. The current client waits for the durable row and deduplicates incoming events by message ID; stable optimistic rendering and retry reuse of the same client request ID remain a UI improvement.

## 5. P1 — one shared conversation client

The first extraction is implemented. Both `/app/messages` and `ChatDropdown` now consume these shared hooks while retaining their current presentation:

```text
src/features/conversations/
  types.ts                      shared contact and direct-message contracts
  useConversationContacts.ts    shared accepted-connection query
  useDirectConversation.ts      durable history, send, deduplication and Realtime lifecycle
  useUnreadMessageCount.ts      event-driven unread reconciliation
```

The history hook subscribes before its initial query and merges both sources by message ID, which avoids losing a message that arrives during loading. It receives insert/update events for both participants, so a member's other browser tab can reconcile a self-sent message. Incoming messages acknowledge read state through the existing single mutation function. The dropdown's unread count now reacts to database changes rather than a timer.

This is a shared implementation, not yet a global cache: the full page and an open quick-chat sheet can still own separate hook instances. The next extraction adds a common cache/store and shared presentational primitives:

```text
src/features/conversations/
  conversation.client.ts       query and mutation adapters
  conversation.store.ts        cache, active conversation and unread state
  ConversationComposer.tsx
  ConversationList.tsx
  ConversationTimeline.tsx
  ConversationInspector.tsx
  realtime.ts
```

Required behavior:

- cursor pagination, newest-first fetch with chronological rendering;
- client-generated idempotency keys and stable optimistic sends (current durable send + incoming-event deduplication is implemented);
- read acknowledgement only after the selected conversation is visible (the current proof acknowledges after the conversation has loaded);
- shared cache/state for page and quick-chat instances;
- reconnection state with manual retry, not silent loss;
- cancellable requests and no update after unmount;
- error/retry UI in both full page and quick chat.

## 6. P2 — secure, scalable Realtime

Keep Postgres Changes only during the refactor proof. The planned production pattern is a private Broadcast topic with Realtime Authorization.

```text
dm:<sorted-user-id-a>:<sorted-user-id-b>
io-session:<session-id>
user:<user-id>:notifications
```

Before enabling it:

1. configure private-channel access and test it in the demo project;
2. add `realtime.messages` policies that authorize only actual conversation participants or I/O session members, separately for `SELECT` and `INSERT` broadcast extensions;
3. require client channels to use `{ config: { private: true } }` and refresh auth when tokens change;
4. broadcast a minimal event (`message_id`, version, time) then read the durable row through ordinary RLS—do not make Broadcast the durable message store;
5. load-test subscription joins, reconnects and policy-change behavior before deleting the Postgres Changes path.

The existing topic policy based on substring matching should not be extended for new product areas. Parseable, membership-backed topic checks are required for I/O session topics.

## 7. P3 — shared Indus Orbit spatial shell

The shared shell is the Discord-like work. It lives once at the AppShell level:

```text
src/components/app-shell/
  AppShellContext.tsx
  OrbitRail.tsx
  ContextSidebar.tsx
  WorkspaceInspector.tsx
  ResponsiveWorkspaceFrame.tsx
  AttentionState.tsx
```

Then progressively refactor these current files to use it:

```text
src/components/app/AppShell.tsx
src/components/app/AppSidebar.tsx
src/components/app/ChatDropdown.tsx
src/components/app/NotificationSheet.tsx
src/routes/app.messages.tsx
src/features/io/IoWorkspaceShell.tsx
```

### Layout contract

| Region          | Responsibility                       | Example in Messages              | Example in I/O                            |
| --------------- | ------------------------------------ | -------------------------------- | ----------------------------------------- |
| Orbit rail      | Switch durable product spaces        | People                           | I/O                                       |
| Context sidebar | Switch items within a selected space | Conversations, recent people     | Workspace, sessions, projects             |
| Main workspace  | Main task                            | Conversation timeline            | Session timeline/terminal controls        |
| Inspector       | Details/action requiring context     | Profile, mutual missions, safety | Approval, files/diff, route receipt, cost |

On mobile, present one primary pane with context and inspector as drawers. Preserve keyboard focus, escape behavior, visible focus, screen-reader landmarks and the app's reduced-motion preference.

### Brand constraints

- Human messages, system notices, agent work and approvals must remain distinguishable without colour alone.
- Indigo is structural; parchment is the working surface; saffron is intentional attention/action—not ambient decoration.
- Use current Indus Orbit typography and icons; do not import Discord labels such as guild/server/channel unless the data object is genuinely a channel.
- An attention count must always identify a meaningful actionable state; do not create reaction loops or engagement pressure.

## 8. P4 — scoped conversations for I/O, missions and Chapters

The Chapter/Mission group-collaboration core is now Released and deliberately remains separate from `direct_messages`:

```text
conversation_spaces
conversation_space_roles
conversation_space_memberships
conversation_space_role_members
conversation_context_groups
conversation_rooms
conversation_room_permission_overrides
conversation_threads
conversation_thread_members
conversation_messages
conversation_message_revisions
conversation_reactions
conversation_mentions
conversation_attachments
conversation_pins
conversation_bookmarks
conversation_read_states
conversation_notification_preferences
conversation_reports
private.conversation_moderation_actions
private.conversation_outbox
```

Chapter and Mission memberships remain authoritative and project active access into Space memberships. The first web surface renders grouped Rooms, messages, composer, read state and active members. Existing DMs remain single-write over `direct_messages`; no migration or dual-write was introduced.

The next P4 slices are Threads UI, roles/overrides administration, mentions/reactions, pins/bookmarks, private attachments, moderation/reporting, search, preferences and the shared shell. An I/O artifact may later link to a safe audit ID, route receipt, public evidence, mission work or permitted file. It cannot become a backdoor that exposes raw terminal events, prompts, model responses, local paths or credentials.

## 9. P5 — I/O collaboration without leaking terminal data

When durable I/O sessions land, add:

```text
io_sessions
io_session_members
io_session_events
io_session_approvals
io_session_artifacts
io_session_handoffs
```

The message composer can offer **Share I/O session** only after the owner selects recipients and an explicit handoff permission. The resulting human message contains a safe title and deep link; the recipient's access is checked again when opening the session. A recipient cannot infer prompt text, model content, local path, artifact or tool output unless the separate I/O session permissions allow it.

## 10. Test and release gates

### Database and security

- direct insert as a disconnected user must fail;
- sender, recipient and no-third-party read matrix;
- only recipient updates `read_at` and cannot modify sender/content;
- I/O session members cannot be inferred from direct-message membership;
- private Broadcast topic join/send matrix;
- RLS and performance advisors reviewed after each migration.
- ordinary authenticated users cannot choose another notification recipient, template, link, email subject or HTML body;
- notification ACL tests retain owner-only reads/updates and deny anonymous access and content rewrites;
- the email worker is service-only, idempotent, preference-aware and never logs recipient addresses or provider bodies.

### UI and realtime

- full page and quick chat render the same cached message after send/read;
- duplicate/reconnect/multi-tab events do not duplicate rows;
- unread counts reconcile from Postgres Changes rather than 15-second polling;
- pagination, retry and offline states work;
- mobile drawer, keyboard navigation, focus restoration and screen-reader announcements pass;
- an I/O handoff never exposes a session to an unauthorised account.

### Design validation

Test with builder/student, founder/team, expert/mentor, mission/Chapter lead and admin participants. Measure the ability to find Messages, return to a Mission, enter an I/O session, identify a human message versus an agent event, approve/reject an action, and explain route cost. Misidentifying human vs agent/system activity is a safety defect, not merely a visual issue.

## 11. Implementation sequence

1. **Done in demo:** fix message insertion authorization, update-column privilege and message length, with rolled-back RLS role tests.
2. **Started in code:** extract shared conversation contracts/hooks and retain the current UI. The page and quick chat now share contact, history, send, Realtime and unread-count behavior.
3. **Released:** trusted domain events, private outbox, email claims and the Chapter/Mission Space foundation; compatible frontend and exact three-migration rollout are complete.
4. Verify authenticated browser personas for Chapter proposal/approval, managed Chapter, Mission, membership, Room message/read, lifecycle and outsider/admin privacy.
5. Complete Threads, roles/Room administration, mentions/reactions, pins/bookmarks, preferences and moderation/reporting.
6. Add a cross-surface cache/store, cursor pagination, optimistic-idempotent sends and complete retry/offline/reconnect behavior.
7. Prove private Broadcast and attachment Storage in the hosted demo after security/load checks.
8. Introduce the shared shell around existing route content and finish mobile/accessibility behavior.
9. Add I/O session/handoff tables only once I/O session persistence exists.

This order protects existing member conversations while making the navigation system and I/O collaboration genuinely shared.
