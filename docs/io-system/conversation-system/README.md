# Conversation and branded spatial system record

Status: secure direct-message RPC boundary and shared-client proof exist locally; full Discord-like collaboration system remains partial, 8 August 2026.

## Current truth

Implemented:

- durable one-to-one human messages in `public.direct_messages`;
- full `/app/messages` surface and global quick-chat sheet;
- existing notification records and application notification surface;
- shared contacts, direct-conversation and unread hooks;
- event-driven realtime reconciliation and message-ID deduplication;
- demo RLS requiring an accepted connection for send;
- recipient-only `read_at` update privilege and content-length validation;
- locally Verified caller-bound send/read RPCs; direct browser message INSERT/UPDATE is revoked;
- sender-scoped idempotency, accepted-connection and suspension checks, a deterministic 30-per-minute sender limit, and fixed content-free notification creation in the send transaction;
- 38 focused pgTAP assertions covering grants, optimized RLS isolation, retries, notification privacy, invalid relationships, suspension, rate limiting and read ownership;
- a branded I/O preview with rail, context navigation, main workspace and inspector geometry.

Still left:

- deploy and remotely verify the locally proven message RPC boundary;
- replace remaining generic notification callers and the browser-controlled email dispatcher with event-specific contracts, a private outbox and fixed-template worker;
- add an explicit block relationship and safe metadata-only audit where operationally necessary;
- one cross-surface conversation store, cursor paging, retry/offline/reconnect and multi-device conflict handling;
- authorized private Realtime Broadcast topics;
- scoped group spaces, rooms, channels, announcements, threads, forums and member roles;
- presence, typing, mentions, reactions, pins, bookmarks, attachments, search and notification controls;
- conversation moderation, reports, retention/export/deletion and operator tools;
- one reusable Indus Orbit rail/sidebar/workspace/inspector shell across product systems;
- I/O session collaboration that never leaks prompts, terminal output, files or tools through human messaging.

The complete feature comparison and phased design is in `DISCORD_LIKE_CAPABILITY_PLAN.md`. The detailed original engineering plan remains in `CONVERSATION_SYSTEM_IMPLEMENTATION_PLAN.md`.
