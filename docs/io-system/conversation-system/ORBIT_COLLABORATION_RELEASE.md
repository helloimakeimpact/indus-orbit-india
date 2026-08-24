# Orbit collaboration release

Status: hosted database boundary **Released** on 24 August 2026; member web experience **Verified locally** and awaiting the next web deployment.

The existing branded Chapter/Mission Space shell is now backed by working collaboration commands rather than dormant tables or visual affordances.

## Released database boundary

- caller-bound Room and Thread feeds with 1–100 row keyset pages;
- one public Room Thread per parent message, continued replies and lock enforcement;
- four purposeful, deduplicated reactions: acknowledge, support, question and complete;
- idempotent member reports without copying message content into the report description automatically;
- scoped Room name, description and posting-policy administration;
- role/member Room permission overrides, with explicit deny precedence;
- moderator-only content restriction/restoration and Thread lock/reopen actions;
- private moderation evidence with actor, reason, target and retry-safe client operation IDs;
- a private `orbit-attachments` Storage bucket with author-scoped object paths, 10 MB/object and five files/message limits;
- PDF, plain text, Markdown, JPEG, PNG and WebP allowlisting;
- attachment metadata/object size and MIME reconciliation after upload;
- quarantine-first attachment visibility: the author may inspect a pending upload, while other members receive it only after `scan_status = clean` is set by a trusted scanner;
- no direct anonymous or authenticated mutation privilege on messages, Threads, reactions, attachments, reports or moderation records.

The Supabase security advisor reports authenticated `security definer` RPC notices. These are intentional callable product boundaries: every RPC derives `auth.uid()`, checks Room/Space authority, validates shapes and uses an empty `search_path`. Private moderation tables intentionally have RLS with no browser policies because direct browser privileges are revoked. See the [Supabase linter notice](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Locally Verified web behavior

The Chapter/Mission Space surface now provides:

- chronological Room history with Load earlier;
- a Thread inspector, continued replies, reply counts and moderator lock/reopen;
- accessible reaction buttons with counts and caller state;
- report dialog with category and explanation;
- moderator restrict/restore actions with stable tombstones;
- Room administration for the display name, description and posting policy;
- composer attachment selection, private upload and honest security-review state;
- signed ten-minute downloads only when Storage policy permits them;
- Realtime message/reaction reconciliation followed by an authoritative feed fetch;
- the existing grouped Room rail, main workspace and people/thread inspector geometry.

The pure feed decoder is regression-tested for ordering, cursors, tombstones, reaction allowlisting and malformed rows. Member format, TypeScript, ESLint and all 67 unit tests pass.

## Deliberately not claimed as complete

- No trusted malware/content scanner worker is connected. Pending files are not shared with other members.
- Room permission-override commands exist, but a complete role/permission editor and view-as-role simulator are not in the member UI.
- Report triage, moderator assignment, appeals and attachment scan decisions belong in the separate admin application and are not yet released there.
- Thread membership/follow/unread controls, mentions, pins, bookmarks, search, presence/typing, Boards, slow mode and notification preferences remain.
- Messages, Chapter/Mission Spaces and I/O share the Indus Orbit navigation language and spatial pattern, but have not yet been refactored onto one reusable React frame/store.
- Authenticated multi-persona, mobile, accessibility and visual-regression browser journeys remain required after web deployment.

## Evidence

- Hosted project: `jpwvgpnbkrktipwhvqss` (`Indus Orbit`, `ap-south-1`).
- Migration: `20260824190000_release_orbit_collaboration_controls.sql`.
- Hosted verification: ten public product RPCs, private bucket, two Storage policies, zero direct browser table writes and zero existing collaboration content.
- Database contract: `orbit_collaboration_controls.test.sql` adds 29 schema/ACL/storage assertions for the next complete replay.
