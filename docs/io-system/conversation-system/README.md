# Conversation and branded spatial system record

Status: direct messages and the Chapter/Mission Space foundation are Released to demo; the first branded UI is pushed to GitHub, 9 August 2026.

## Current truth

Implemented:

- durable one-to-one human messages in `public.direct_messages`;
- full `/app/messages` surface and global quick-chat sheet;
- existing notification records and application notification surface;
- shared contacts, direct-conversation and unread hooks;
- event-driven realtime reconciliation and message-ID deduplication;
- demo RLS requiring an accepted connection for send;
- recipient-only `read_at` update privilege and content-length validation;
- remotely Verified caller-bound send/read RPCs; direct browser message INSERT/UPDATE/DELETE and write policies are revoked;
- sender-scoped idempotency, accepted-connection and suspension checks, a deterministic 30-per-minute sender limit, and fixed content-free notification creation in the send transaction;
- 38 focused pgTAP assertions covering grants, optimized RLS isolation, retries, notification privacy, invalid relationships, suspension, rate limiting and read ownership;
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
- rolling schema compatibility so the frontend can release before the hosted migration without hiding genuine authorization or validation errors.

Still left:

- configure an approved sender domain, deploy/schedule the fixed-template email worker and add redacted operator/dead-letter controls;
- add an explicit block relationship and safe metadata-only audit where operationally necessary;
- one cross-surface conversation store, cursor paging, retry/offline/reconnect and multi-device conflict handling;
- authorized private Realtime Broadcast topics;
- run hosted authenticated browser personas across proposal/approval, Chapter/Mission lifecycle, membership, Room send/read and outsider privacy;
- Threads UI, Thread membership/read behavior, Boards/forums and administrative Room/role configuration;
- presence, typing, reaction/mention UI, pins, bookmarks, attachment storage/scanning, search and notification controls;
- conversation moderation/report UI, retention/export/deletion and redacted operator tools;
- one reusable Indus Orbit rail/sidebar/workspace/inspector shell across product systems;
- I/O session collaboration that never leaks prompts, terminal output, files or tools through human messaging.

The exact delivered Space slice, deployment order and owner/code split are in `CHAPTER_MISSION_SPACE_SYSTEM_PLAN.md`. The complete feature comparison is in `DISCORD_LIKE_CAPABILITY_PLAN.md`; the wider engineering plan remains in `CONVERSATION_SYSTEM_IMPLEMENTATION_PLAN.md`; the released delivery contract is in `TRUSTED_NOTIFICATION_AND_EMAIL_BOUNDARY.md`.
