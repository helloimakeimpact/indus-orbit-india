# Conversation and branded spatial system record

## Candidate implementation — 21 October

[The current candidate](CHAT_RELEASE_CANDIDATE.md) implements shared lightweight private messaging, bounded inbox/recovery, premium common UI and event/community discussion integration. Local application and focused tests are recorded separately from the pending full managed database/schema gate. The release remains **Partial**; source is being prepared on a release branch because frontend/database delivery must be coordinated.

Status: **Partial** for the approved lightweight private/event/community chat experience, updated **20 October 2026**. Core direct messages, Space collaboration and member-safety controls retain their recorded demo release. Structured Boards/Rooms/roles/saved work remain locally Verified and held from hosted apply.

## Current execution plan — 20 October

[Lightweight chat finalization](LIGHTWEIGHT_CHAT_FINALIZATION_PLAN.md) is the current plan. The owner approved private messages plus event/community groups and keeping the current security model, with E2EE planned separately. Existing direct-message and Room histories remain authoritative. Event membership/verified guest-account linking requires a new explicit contract; public registration alone does not grant chat access.

Three independent reviews found competing page/sheet outboxes, missing stale-account guards, hidden-tab read acknowledgements, incomplete reconnect catch-up beyond fifty missed messages, cross-recipient drafts and missing recent-chat summaries. These are source work, not only hosted acceptance. The root Orbit store shares attention/connectivity; it does **not** yet provide one shared conversation cache/dispatcher. Two merge regressions are repaired locally with 12 focused tests: fresh queued rows appear immediately, and stale history cannot undo read evidence.

The last whole-product gate before this chat increment was 236 member units, 35 admin units, 49 browser journeys and 38 SQL files/1,237 assertions across 130 source migrations. These counts do not establish the new chat interactions. See [the whole-product report](../PRODUCTION_STATUS_2026-10-20.md) and the current plan's release evidence. Older counts below remain historical.

## Existing implementation inventory

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
- one root Orbit connectivity/attention store across Messages, Chapters, Missions, Spaces and I/O; each DM hook currently owns its own replay-safe session outbox and reconnect logic. Single-surface reload recovery and cross-tab attention exist, but shared queue ownership, throwing storage getters, complete catch-up and stale-account results need the current plan's fixes;
- locally Verified forum-style Board topics, manager Room create/reorder/archive, source-role inheritance/effective-permission explanation and private saved-work search/export;
- hosted scanner lease/retry/dead-letter and redacted notification queue operator controls, plus a deployed outbound scanner worker that remains fail-closed until provider configuration.
- manager-only active/removed roster, canonical source-membership remove/restore, bounded Space timeouts, elevated-role protection and database-enforced burst/hourly/repeated-message limits through hosted migration 113; migration 114 serializes concurrent timeout replays.

Still left (read alongside the current plan):

- configure an approved sender domain and schedule the fixed-template email worker; redacted retry/dead-letter controls are Released;
- implement shared conversation state/queue, account binding, visible read-through, full catch-up, bounded inbox and draft continuity before genuine two-device reconnect/offline/unread acceptance; server state remains authoritative across devices;
- run hosted authenticated browser personas across proposal/approval, Chapter/Mission lifecycle, membership, Room send/read and outsider privacy;
- explicitly approve and apply the broad structured-Spaces authorization migration before treating Boards, source-role hierarchy/explanation, manager Room lifecycle and saved work as Released;
- privacy-aware exact-pair typing is Released/Verified; trusted scanner provider configuration and worker scheduling remain;
- the export/deletion request and admin-review boundary is Released; bounded export/deletion/retention workers are Verified in source under the owner's delegated best-practice rules. Hosted API/scheduler/backup and assisted-privacy acceptance remain; new chat records need explicit inventory coverage. Additional automated spam classification needs a reviewed policy and appeal path;
- one reusable Indus Orbit rail/sidebar/workspace/inspector shell across product systems;
- I/O session collaboration that never leaks prompts, terminal output, files or tools through human messaging.

The core collaboration and migration-113/114 member-safety boundaries have a recorded hosted demo release with RLS, explicit grants and synchronized client contracts. The structured-Spaces migration is only locally Verified because its persistent apply was refused pending explicit authorization. The **7 September historical checkpoint** was 159 member units and 25 database files/830 assertions; use the current plan and whole-product report for later evidence. Migration `20260906120000_fix_operational_function_schema_drift.sql` also removes both ambiguous structured Room-admin replay references when this pending release is applied. Existing collaboration limits are in `ORBIT_COLLABORATION_RELEASE.md`. The original delivery split is in `CHAPTER_MISSION_SPACE_SYSTEM_PLAN.md`; the older spatial plan is `CONVERSATION_SYSTEM_IMPLEMENTATION_PLAN.md`, superseded for the current chat increment by `LIGHTWEIGHT_CHAT_FINALIZATION_PLAN.md`.
