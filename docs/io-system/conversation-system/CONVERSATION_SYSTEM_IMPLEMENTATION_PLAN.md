# Indus Orbit conversation and Discord-like system plan

Status: active code-level plan, reviewed 1 August 2026. Direct-message P0 hardening is deployed to the demo project. Local notification-table containment and its pgTAP suite are Verified but not Released. The first P1 shared-client extraction is implemented in the web app; event-specific notification/email boundaries, the shared spatial shell, pagination, message RPC boundary and private Broadcast remain planned. The I/O nested shell is a branded preview, not the completed shared Discord-like system. This extends the existing conversation product; it does not authorize a Discord clone or a replacement social system.

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

| Area                   | Current implementation                                                        | Required correction                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Message route          | `src/routes/app.messages.tsx` + shared conversation hooks                     | Now uses the shared contact/history/send/realtime hooks. Add cursor pagination before message volume grows.                                                                               |
| Quick chat             | `src/components/app/ChatDropdown.tsx` + shared conversation hooks             | Now uses the same hooks and Realtime unread reconciliation; no 15-second unread polling. A cross-surface cache/store remains the next extraction.                                         |
| Data access            | `src/server/messages.functions.ts`                                            | Treat this as browser-facing data access; keep privileged actions in RPC/Edge Functions only.                                                                                             |
| Durable data           | `public.direct_messages`                                                      | Keep it as the canonical one-to-one human message source. Add no I/O prompt/tool content here.                                                                                            |
| Realtime               | Shared Postgres Changes subscriptions, locally filtered by participants       | The P1 proof uses a stable `dm:<sorted-user-ids>` subscription name, durable-row deduplication and read acknowledgement. Move to authorized private Broadcast after the RLS/proof phase.  |
| Existing authorization | Client checks accepted connections before insert                              | **Fixed in demo:** the RLS policy now requires an accepted relationship, distinct sender/recipient and active accounts. The future RPC adds rate limits and atomic notification handling. |
| Read updates           | Recipient had a broad row-update policy                                       | **Fixed in demo:** table-wide UPDATE is revoked and authenticated users receive only `read_at` column privilege. The future RPC centralises audit and rate-limit behavior.                |
| Existing query shape   | Full two-way history query with per-column indexes                            | Add a canonical conversation key/index and cursor paging after migration/profiling.                                                                                                       |
| Migration history      | Current remote message schema is not fully represented by local migrations    | Reconcile and generate a fresh schema baseline before adding conversation DDL.                                                                                                            |
| Notification table     | Generic owner UI plus a caller-controlled `send_notification` RPC             | Local Verified migration removes anonymous table access and limits members to owner reads/`is_read` updates. Replace the generic RPC with domain events before Release.                   |
| Email delivery         | Deployed `resend-email-dispatcher` accepts browser-provided recipient/content | **Critical:** replace it with a service-only outbox worker using fixed templates; ordinary user JWTs must receive 403 and arbitrary subject/HTML must never enter the contract.           |

### 2.1 Immediate notification containment

`20260801152820_contain_notification_privileges.sql` is locally replayed and tested. It deliberately preserves the generic RPC only for compatibility while the seven browser callers are replaced. It:

- removes all anonymous table privileges;
- gives authenticated clients only `SELECT` and `UPDATE (is_read)`;
- enforces owner-bound SELECT and UPDATE policies with both `USING` and `WITH CHECK`;
- adds owner/recent and owner/unread indexes;
- removes direct browser execution from notification trigger helpers;
- marks `send_notification(uuid,text,text,text)` as deprecated/high risk.

This is containment, not completion. The deployed email dispatcher remains a critical release blocker until removed or replaced, and generic notification injection remains a high-risk blocker until authenticated execution is revoked after caller cutover.

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

The first migration was created through the Supabase CLI and deployed as `20260730170917_harden_direct_messages.sql`. The next conversation migration must:

1. preserve the deployed insert policy that requires:
   - caller owns `sender_id`;
   - sender and recipient differ;
   - an accepted `connection_requests` relationship exists in either direction;
2. replace direct browser sends and read-receipt access with `send_direct_message()` and `mark_direct_message_read()` RPCs that enforce connection, suspension/block state, recipient validity, message length and rate limits in one transaction;
3. preserve sender/recipient read access but keep content and participants immutable after insertion;
4. test the relationship predicate with the actual RLS behavior of `connection_requests` before deployment;
5. add a canonical, generated conversation pair/key and an index suitable for cursor pagination only after confirming existing data migration/backfill behavior;
6. add a migration test matrix for sender, recipient, disconnected member, blocked/suspended member, anonymous actor and cross-device actor.

The send RPC must emit `direct_message.received` through the private outbox in the same transaction. It must not call the generic notification RPC or accept caller-authored notification text/link fields.

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

Create the narrow RPC boundary for send and read state. It gives one atomic place for anti-abuse checks, notification enqueue and audit. The client must optimistically render only a message carrying a stable client-generated idempotency key; confirm it from the durable row and deduplicate incoming events by message ID.

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

After legacy DM security and shared-client work are stable, introduce a generic conversation core for group collaboration:

```text
conversations                 -- dm | io_workspace | mission | chapter | system
conversation_members          -- role, notification preference, last-read pointer
conversation_messages         -- author type, body, safe structured metadata, moderation state
conversation_artifacts        -- explicitly shared safe evidence/receipt/artifact links
conversation_reactions
conversation_mentions
conversation_member_blocks
```

Start with I/O workspace views named **Sessions**, **Evidence**, **Capacity** and **Announcements**—not copied Discord server/channel labels. Reuse I/O workspace, mission and Chapter membership for authorization; `conversation_members` adds only per-conversation role and notification state. Existing DMs render as a virtual conversation over `direct_messages` in this phase. Do not dual-write DMs. A later migration can consolidate storage only after it has a compatibility read path, a tested backfill and a rollback plan.

`conversation_artifacts` may link to a safe I/O audit ID, route receipt, public evidence, mission work or a permitted file. It cannot become a backdoor that exposes raw terminal events, prompts, model responses, local paths or credentials.

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
3. Replace generic notification calls and the browser-controlled email dispatcher with atomic domain events, a private outbox and fixed-template service worker; then revoke authenticated `send_notification` execution.
4. Add a cross-surface cache/store, pagination, optimistic-idempotent sends and the RPC-backed unread/read path.
5. Prove private Broadcast in demo and migrate after load/security checks.
6. Introduce the shared shell around existing route content without changing data models.
7. Introduce scope-specific generic conversations for I/O, mission and Chapter collaboration—while keeping DMs virtual and single-write.
8. Add I/O session/handoff tables only once I/O session persistence exists.

This order protects existing member conversations while making the navigation system and I/O collaboration genuinely shared.
