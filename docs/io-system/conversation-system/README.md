# Conversation and branded spatial system record

Status: direct messages, caller-owned blocking, private Broadcast, bounded history, Chapter/Mission Spaces and the first Threads/reactions/reporting/Room-control layer are Released to demo, updated 24 August 2026.

## Current truth

Implemented:

- durable one-to-one human messages in `public.direct_messages`;
- full `/app/messages` surface and global quick-chat sheet;
- existing notification records and application notification surface;
- shared contacts, direct-conversation and unread hooks;
- caller-bound 50-row keyset history with deterministic `(created_at, id)` cursors and Load earlier controls in both message surfaces;
- participant-authorized private Realtime Broadcast reconciliation and message-ID deduplication; the database suppresses blocked-pair broadcasts;
- demo RLS requiring an accepted connection for send;
- recipient-only `read_at` update privilege and content-length validation;
- remotely Verified caller-bound send/read RPCs; direct browser message INSERT/UPDATE/DELETE and write policies are revoked;
- sender-scoped idempotency, accepted-connection and suspension checks, a deterministic 30-per-minute sender limit, and fixed content-free notification creation in the send transaction;
- caller-owned block/unblock UI and RPCs, symmetric immediate send/history/read-receipt denial, owner-only block-list visibility and reversible access;
- 73 focused direct-message/block pgTAP assertions covering grants, optimized RLS isolation, retries, notification privacy, private-topic authorization, invalid relationships, blocking, suspension, rate limiting, read ownership and history pagination;
- atomic connection, mentorship, mission-update, vouch-request and Chapter-decision RPCs with server-derived notification recipients/content;
- retired authenticated `send_notification` execution and no remaining browser call to the former arbitrary email dispatcher;
- private email delivery outbox with idempotency, leases, bounded retry/dead-letter state and locally Verified fixed-template worker source;
- a branded I/O preview with rail, context navigation, main workspace and inspector geometry;
- Released `conversation_spaces`, roles, memberships, context groups, typed Rooms, overrides, Threads, messages, revisions, mentions, reactions, attachments, pins, bookmarks, read state, preferences, reports, private moderation and outbox schema;
- Chapter and Mission domain memberships projected into Space access without replacing the authoritative domain records;
- deterministic seven-Room Chapter and six-Room Mission blueprints;
- caller-bound Chapter proposal/creation/approval/lifecycle/lead and Mission creation/lifecycle/member RPC boundaries with optimistic versioning and idempotency where creation is retryable;
- caller-bound Space join/leave/decision, Thread creation, Room message and read-state RPC boundaries;
- direct Chapter/Mission browser writes revoked by the new migration, with explicit RLS/grants and covering foreign-key indexes;
- a first responsive `/app/spaces/$spaceId` implementation with grouped Rooms, durable timeline/composer, People roster, Realtime message reconciliation and Chapter/Mission back-links;
- a caller-bound keyset-paged Room/Thread feed, one Thread per parent message, continued replies and moderator lock/reopen;
- four purposeful reaction toggles, member reporting, stable moderated-message tombstones and capability-checked restrict/restore evidence;
- manager-only Room name/description/posting controls plus a role/member permission-override RPC boundary;
- a private 10 MB quarantine-first attachment bucket, author-owned reservation/upload/finalization, MIME/size reconciliation and short signed downloads only for authorized objects;
- rolling schema compatibility so the frontend can release before the hosted migration without hiding genuine authorization or validation errors.

Still left:

- configure an approved sender domain, deploy/schedule the fixed-template email worker and add redacted operator/dead-letter controls;
- retain the Released `20260819225550_add_direct_message_pagination_rpc.sql`, then add one cross-surface conversation store, retry/offline/reconnect and multi-device conflict handling;
- run hosted authenticated browser personas across proposal/approval, Chapter/Mission lifecycle, membership, Room send/read and outsider privacy;
- Thread membership/follow/read behavior, Boards/forums and the full role/permission editor;
- presence, typing, mentions, pins, bookmarks, a trusted attachment scanner, search and notification controls;
- report triage/assignment/appeals, retention/export/deletion and redacted admin operator tools;
- one reusable Indus Orbit rail/sidebar/workspace/inspector shell across product systems;
- I/O session collaboration that never leaks prompts, terminal output, files or tools through human messaging.

The latest collaboration migration is Released to hosted Indus Orbit with RLS, explicit grants and synchronized client contracts. The member unit suite passes 67/67; the new database contract adds 29 assertions for the next full replay. Exact current behavior and limits are in `ORBIT_COLLABORATION_RELEASE.md`. The original delivery split is in `CHAPTER_MISSION_SPACE_SYSTEM_PLAN.md`; the wider engineering plan remains in `CONVERSATION_SYSTEM_IMPLEMENTATION_PLAN.md`.
