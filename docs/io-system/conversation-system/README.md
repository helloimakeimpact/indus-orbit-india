# Conversation and branded spatial system record

Status: core direct messages, Space collaboration and member-safety controls are Released to demo; structured Boards/Rooms/roles/saved work are locally Verified and Blocked from hosted apply pending explicit owner approval, updated 4 September 2026.

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
- explicit person-mention composition for Rooms and Threads, with a ten-person ceiling, active membership/private-Thread authorization, idempotent records, mute/digest-aware content-free fan-out and fixed in-app notification copy;
- validated per-Room attention schedules with IANA timezone, optional cross-midnight quiet hours, daily digest hour, visible next delivery and database-derived outbox deferral;
- permission-filtered full-text Space history search with bounded input/results, indexed non-deleted content and Room/private-Thread authorization on every row;
- manager-only Room role mentions with three-role/thirty-visible-recipient caps, content-free delivery evidence and actual-visibility checks for both person and role recipients;
- replay-safe role-mention fan-out plus explicit in-tab Room/Thread/attachment retry that reuses the original database request/reservation IDs;
- manager-only public-Thread role selection under the same bounded audience policy; private Threads reject role fan-out;
- creator/Space-manager private Thread audience replacement, capped at thirty Room-eligible people with creator retention, plus non-member summary/reuse isolation;
- manager Room role/member permission editing across view, post, Thread, moderation and management capabilities, including inherited-policy removal and direct self-lockout prevention;
- four purposeful reaction toggles, member reporting, stable moderated-message tombstones and capability-checked restrict/restore evidence;
- manager-only Room name/description/posting controls plus a role/member permission-override RPC boundary;
- manager-configured, database-enforced Room slow mode with exact retry evidence, idempotent retry preservation and a visible active-policy badge;
- a private 10 MB quarantine-first attachment bucket, author-owned reservation/upload/finalization, MIME/size reconciliation and short signed downloads only for authorized objects;
- rolling schema compatibility so the frontend can release before the hosted migration without hiding genuine authorization or validation errors.
- one root Orbit connectivity/attention store across Messages, Chapters, Missions, Spaces and I/O, with replay-safe in-tab DM outbox, reconnect/focus/visibility reconciliation, cross-tab unread refresh and privacy-aware expiring typing;
- locally Verified forum-style Board topics, manager Room create/reorder/archive, source-role inheritance/effective-permission explanation and private saved-work search/export;
- hosted scanner lease/retry/dead-letter and redacted notification queue operator controls, plus a deployed outbound scanner worker that remains fail-closed until provider configuration.
- manager-only active/removed roster, canonical source-membership remove/restore, bounded Space timeouts, elevated-role protection and database-enforced burst/hourly/repeated-message limits through hosted migration 113; migration 114 serializes concurrent timeout replays.

Still left:

- configure an approved sender domain and schedule the fixed-template email worker; redacted retry/dead-letter controls are Released;
- run two-device authenticated reconnect/offline/multi-device unread evidence for the Released/Verified shared store;
- run hosted authenticated browser personas across proposal/approval, Chapter/Mission lifecycle, membership, Room send/read and outsider privacy;
- explicitly approve and apply the broad structured-Spaces authorization migration before treating Boards, source-role hierarchy/explanation, manager Room lifecycle and saved work as Released;
- privacy-aware exact-pair typing is Released/Verified; trusted scanner provider configuration and worker scheduling remain;
- the export/deletion request and admin-review boundary is Released; actual export/purge workers await approved retention/legal-hold rules. Additional automated spam classification needs a reviewed policy and appeal path;
- one reusable Indus Orbit rail/sidebar/workspace/inspector shell across product systems;
- I/O session collaboration that never leaks prompts, terminal output, files or tools through human messaging.

The core collaboration and migration-113/114 member-safety boundaries are Released to hosted Indus Orbit with RLS, explicit grants and synchronized client contracts. The structured-Spaces migration is only locally Verified because its persistent apply was refused pending explicit authorization. The member unit suite passes 102/102 and the member-safety SQL contract adds 15 passing assertions. Exact current behavior and limits are in `ORBIT_COLLABORATION_RELEASE.md`. The original delivery split is in `CHAPTER_MISSION_SPACE_SYSTEM_PLAN.md`; the wider engineering plan remains in `CONVERSATION_SYSTEM_IMPLEMENTATION_PLAN.md`.
