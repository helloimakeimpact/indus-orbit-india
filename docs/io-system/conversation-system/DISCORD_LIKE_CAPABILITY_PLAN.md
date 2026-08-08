# Discord-like capability plan, translated for Indus Orbit

Status: detailed intended-system and implementation-gap record, 8 August 2026.

## Product decision

“Discord-like” means spatial clarity, scoped communities, realtime collaboration and mature permission behavior. It does not mean copying Discord’s brand, server/guild vocabulary, visual identity, engagement loops or every entertainment feature.

Official Discord architecture demonstrates that a mature collaboration system combines server/channel resources, role and channel-level permission overrides, messages, threads with explicit membership/read state, realtime gateway events, presence, typing, reactions, scheduled events, webhooks and moderation. Those are reference capabilities, not claims about current Indus Orbit code.

Official references:

- [Discord server and channel management](https://docs.discord.com/developers/platform/server-and-channel-management)
- [Discord threads and permissions](https://docs.discord.com/developers/topics/threads)
- [Discord Gateway and realtime events](https://docs.discord.com/developers/events/gateway)
- [Discord scheduled events](https://docs.discord.com/developers/resources/guild-scheduled-event)
- [Discord forum channels](https://support.discord.com/hc/en-us/articles/6208479917079-Forum-Channels-FAQ)
- [Discord roles, permissions and moderation](https://support.discord.com/hc/en-us/sections/202856377-Roles-Permissions-and-Moderation)

## Indus Orbit vocabulary

| Reference concept | Indus Orbit concept  | Reason                                                                              |
| ----------------- | -------------------- | ----------------------------------------------------------------------------------- |
| Server/guild      | Space or Orbit space | A scoped collaborative home tied to a Chapter, Mission, programme or I/O workspace. |
| Category          | Context group        | Organises related rooms without becoming a permission shortcut by accident.         |
| Channel           | Room                 | Conversation, announcement, evidence, resource, help or work room.                  |
| Forum channel     | Board                | Structured long-lived topics with templates, tags and accepted outcomes.            |
| Thread            | Thread               | A bounded discussion under a message, topic or artifact.                            |
| Voice/stage       | Gathering            | Scheduled or live human session connected to an Event/Chapter/Mission.              |
| Bot               | Agent or integration | Clearly identified non-human participant with narrow permissions and provenance.    |

People, agents and system notices must be visually and semantically distinct. A human profile or vouch must never be assigned to an agent.

## Capability matrix: done and left

| Collaboration capability        | Current Indus Orbit state                                     | What must be built                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistent global rail          | Partial: app navigation plus I/O-specific rail preview        | Extract one Orbit rail for People, Learn, Action, Messages and I/O; live attention, keyboard navigation, responsive behavior and no duplicated shell state.                              |
| Context sidebar                 | Partial in app/I/O layouts                                    | Make the selected Space drive rooms, recent items, search and permissions; persist useful preference without hiding inaccessible content.                                                |
| Main workspace and inspector    | Partial I/O preview                                           | Shared responsive frame, focus restoration, loading/error/offline states and contextual inspector for profile, members, approvals, evidence or route receipt.                            |
| One-to-one DMs                  | Partial: trusted local RPC boundary plus working product      | Deploy/verify the caller-bound send/read RPCs, then add cursor paging, common cache, explicit blocks, robust reconnect, attachments and E2E/load tests.                                  |
| Group DMs                       | Not implemented                                               | Add bounded membership, invite/leave/remove, ownership, history visibility and notification rules after DM core is secure.                                                               |
| Spaces and membership           | Domain memberships exist separately                           | Define conversation Space projection over Chapter/Mission/I/O membership; do not duplicate authoritative domain membership; add space roles and lifecycle.                               |
| Rooms/channels/categories       | Not implemented                                               | Add typed rooms, order/grouping, create/archive, visibility, posting policy, slow mode and permission evaluation. Start with Announcements, Conversation, Evidence and Help.             |
| Threads                         | Not implemented                                               | Add parent link, membership/following, archive/lock, last-read cursor, notification state, permissions inherited plus explicit private-thread membership.                                |
| Boards/forums                   | S.O.D.A./stories are separate content types                   | Add structured topic templates, tags, sorting, accepted outcome and moderation only where discussion needs long-lived discoverability; link rather than copy existing content.           |
| Announcements                   | General notifications/content exist                           | Add read-only or role-limited rooms, following rules, acknowledgement and provenance. Avoid mass-notification abuse.                                                                     |
| Mentions                        | Not implemented as a conversation system                      | Add user/role/thread mentions with authorization, preference, bounded fan-out, outbox delivery and abuse controls.                                                                       |
| Reactions                       | Not implemented                                               | Add limited purposeful reactions, deduplication and permission/moderation rules; avoid engagement-pressure mechanics.                                                                    |
| Presence and typing             | Not implemented                                               | Add opt-in, block/privacy-aware ephemeral Broadcast; use coarse states and expiry, never durable surveillance.                                                                           |
| Read/unread                     | DM unread/read exists partially                               | Use per-member last-read pointers, deterministic reconciliation and meaningful attention states across rooms/threads/devices.                                                            |
| Search                          | Directory/content search exists; conversation search does not | Add permission-filtered full-text search, pagination, safe snippets, retention/deletion handling and no cross-space leakage.                                                             |
| Pins, bookmarks and saved items | Not implemented                                               | Separate room-level curated pins from private member bookmarks; record curator and provenance.                                                                                           |
| Files and link previews         | Not implemented for conversations                             | Virus/content scanning, type/size limits, storage authorization, expiry, alt text, download audit and explicit I/O artifact sharing.                                                     |
| Notifications                   | Notification table/surface exists                             | Add preference hierarchy by space/room/thread, mention overrides, digests, quiet hours, delivery attempts, retries and dead-letter handling.                                             |
| Roles and permissions           | Platform roles/domain memberships exist                       | Implement resource-scoped allow/deny evaluation, role hierarchy/ownership, channel overrides, view-as-role tests and audit. Avoid reusing broad platform admin as every-space authority. |
| Moderation and safety           | Reports/admin surfaces exist generally                        | Conversation report evidence, block/mute/timeout/remove, slow mode, spam limits, moderator queue, reasoned action, appeal and retention policy.                                          |
| Audit log                       | General audit and I/O audit exist                             | Add safe space/role/room/moderation audit entries without copying private content into general logs.                                                                                     |
| Events/gatherings               | Event/RSVP product exists                                     | Link rooms/gatherings to existing Events; add scheduled lifecycle, participant permissions, reminders and outcome artifacts.                                                             |
| Voice/video/stage               | Not implemented                                               | V1 should integrate a reviewed meeting provider or external link; native realtime media is a later specialist programme with consent, recording and moderation.                          |
| Agents and integrations         | I/O agent plan exists separately                              | Add explicit agent identity, scoped room permission, commands/actions, message provenance, human approval and kill switch. Never let a provider impersonate a person.                    |
| Webhooks/API                    | Not implemented                                               | Add signed inbound/outbound events, scoped credentials, idempotency, replay protection, allowlists, delivery logs and rate limits.                                                       |
| Onboarding/discovery            | Platform onboarding exists                                    | Add Space welcome, purpose, rules, role/request flow, recommended rooms and clear leave/mute controls.                                                                                   |
| Mobile and accessibility        | Responsive components exist unevenly                          | One-pane mobile navigation, drawer focus, keyboard/screen-reader semantics, contrast, reduced motion, touch targets and realtime announcements.                                          |

## Data architecture

Do not replace `direct_messages` immediately and do not dual-write. First build a generic group collaboration core and render existing DMs as a virtual type.

```text
conversation_spaces
conversation_space_roles
conversation_space_role_members
conversation_rooms
conversation_room_permission_overrides
conversation_members
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
conversation_moderation_actions
conversation_integrations
conversation_webhook_deliveries
```

Domain membership remains authoritative:

- Chapter Space access derives from `chapter_members`;
- Mission Space access derives from `mission_members`;
- I/O Space access derives from `io_workspace_memberships` plus I/O session membership;
- direct-message access derives from the participating people and accepted/blocked relationship rules.

A projection/outbox can synchronize membership changes into conversation access. Authorization must recheck the source domain; eventual realtime state is not a security boundary.

## Realtime architecture

Durable messages and read pointers belong in Postgres. Supabase private Broadcast delivers low-latency minimal events. Presence and typing are ephemeral. A client receiving an event fetches or reconciles the durable row through RLS.

```text
space:<space-id>
room:<room-id>
thread:<thread-id>
dm:<stable-conversation-id>
io-session:<session-id>
user:<user-id>:notifications
```

Topic authorization must use parsed identifiers and membership tables, not substring matching. Reconnect requires cursor/backfill, event deduplication and a visible degraded/offline state.

## I/O integration boundary

An I/O workspace can expose human rooms such as Conversation, Sessions, Evidence, Capacity and Announcements. The terminal/session timeline remains a separate I/O event system. Humans may share a safe route receipt, approved artifact or private session handoff into a room. They may not implicitly publish prompts, generated responses, shell output, local paths, secrets or files.

Agents appear as agents. Each agent message/action shows provider/model/route receipt or local-runtime provenance as applicable, the human/workspace authority, and whether it is a proposal or committed action.

## Delivery phases

1. **Secure DMs:** caller-bound send/read, sender idempotency, suspension/rate checks and 38 database assertions are locally Verified; deploy them, then add explicit blocks, paging and E2E/load tests.
2. **Shared client:** one store, timeline/composer primitives, retry/offline and multi-device reconciliation.
3. **Private realtime:** Broadcast authorization, durable backfill, presence/typing and load tests.
4. **Shared branded shell:** Orbit rail, context sidebar, main canvas and inspector across Messages and I/O.
5. **Spaces and rooms:** start with one Mission/Chapter pilot and typed Announcements/Conversation/Evidence rooms.
6. **Threads and boards:** membership/read state, tags, templates, search, pins and notification preferences.
7. **Trust and operations:** permission overrides, moderation, audit, export/delete, dashboards and support.
8. **I/O collaboration:** safe session links, approvals, artifacts, agent identity and route receipts.
9. **Integrations:** webhooks, commands, calendar/meeting links and reviewed connectors.
10. **Advanced gatherings:** evaluate native voice/video only after collaboration and safety foundations are mature.
