# Conversation and branded spatial system record

Status: secure direct-message and trusted domain-notification boundaries are Released to demo; full Discord-like collaboration system remains partial, 9 August 2026.

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
- a branded I/O preview with rail, context navigation, main workspace and inspector geometry.

Still left:

- configure an approved sender domain, deploy/schedule the fixed-template email worker and add redacted operator/dead-letter controls;
- add an explicit block relationship and safe metadata-only audit where operationally necessary;
- one cross-surface conversation store, cursor paging, retry/offline/reconnect and multi-device conflict handling;
- authorized private Realtime Broadcast topics;
- scoped group spaces, rooms, channels, announcements, threads, forums and member roles;
- presence, typing, mentions, reactions, pins, bookmarks, attachments, search and notification controls;
- conversation moderation, reports, retention/export/deletion and operator tools;
- one reusable Indus Orbit rail/sidebar/workspace/inspector shell across product systems;
- I/O session collaboration that never leaks prompts, terminal output, files or tools through human messaging.

The complete feature comparison and phased design is in `DISCORD_LIKE_CAPABILITY_PLAN.md`. The detailed engineering plan remains in `CONVERSATION_SYSTEM_IMPLEMENTATION_PLAN.md`; the released delivery contract is in `TRUSTED_NOTIFICATION_AND_EMAIL_BOUNDARY.md`.
