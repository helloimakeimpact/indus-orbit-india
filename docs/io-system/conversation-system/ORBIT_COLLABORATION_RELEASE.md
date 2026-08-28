# Orbit collaboration release

Status: hosted database boundary **Released**, including private Thread audiences through 28 August 2026; member web experience **Verified locally** and awaiting the next web deployment.

The existing branded Chapter/Mission Space shell is now backed by working collaboration commands rather than dormant tables or visual affordances.

## Released database boundary

- caller-bound Room and Thread feeds with 1–100 row keyset pages;
- one public Room Thread per parent message, continued replies and lock enforcement;
- four purposeful, deduplicated reactions: acknowledge, support, question and complete;
- idempotent member reports without copying message content into the report description automatically;
- scoped Room name, description and posting-policy administration;
- database-enforced Room slow mode with twelve bounded intervals from off through one hour, idempotent retry preservation, exact retry evidence and an explicit Space-manager bypass;
- role/member Room permission overrides, with explicit deny precedence;
- moderator-only content restriction/restoration and Thread lock/reopen actions;
- private moderation evidence with actor, reason, target and retry-safe client operation IDs;
- a private `orbit-attachments` Storage bucket with author-scoped object paths, 10 MB/object and five files/message limits;
- PDF, plain text, Markdown, JPEG, PNG and WebP allowlisting;
- attachment metadata/object size and MIME reconciliation after upload;
- quarantine-first attachment visibility: the author may inspect a pending upload, while other members receive it only after `scan_status = clean` is set by a trusted scanner;
- no direct anonymous or authenticated mutation privilege on messages, Threads, reactions, attachments, reports or moderation records.
- atomic private Thread audiences capped at thirty Room-eligible people; only the creator or a Space manager may replace the list and the creator cannot be removed;
- private Thread summaries and idempotent create/reuse results are withheld from Room members outside the explicit audience.

The Supabase security advisor reports authenticated `security definer` RPC notices. These are intentional callable product boundaries: every RPC derives `auth.uid()`, checks Room/Space authority, validates shapes and uses an empty `search_path`. Private moderation tables intentionally have RLS with no browser policies because direct browser privileges are revoked. See the [Supabase linter notice](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Locally Verified web behavior

The Chapter/Mission Space surface now provides:

- chronological Room history with Load earlier;
- a Thread inspector, continued replies, reply counts and moderator lock/reopen;
- accessible reaction buttons with counts and caller state;
- report dialog with category and explanation;
- moderator restrict/restore actions with stable tombstones;
- Room administration for the display name, description, posting policy and slow mode, with the active interval visible in the Room header;
- composer attachment selection, private upload and honest security-review state;
- signed ten-minute downloads only when Storage policy permits them;
- Realtime message/reaction reconciliation followed by an authoritative feed fetch;
- explicit person mention selection in Room and Thread composers, with removable chips and a ten-person limit;
- an attention dialog for Room preference, IANA timezone, cross-midnight quiet hours, digest hour, current quiet state and next scheduled delivery;
- a Space search dialog backed by an authenticated-only indexed RPC that rechecks Room/private-Thread access and excludes deleted content;
- relevance/time/ID keyset pagination with a Load more results control, cursor validation and client-side duplicate suppression;
- manager-only role selection in the Room composer, capped at three roles and thirty actually visible recipients while private Threads reject role fan-out;
- explicit private-Thread creation and creator/manager audience editing in the member UI, with creator retention and server-side Room eligibility enforcement;
- manager-only role selection in eligible public-Thread composers under the same three-role/thirty-visible-recipient policy; private Thread composers do not expose role fan-out;
- explicit offline status and replay-safe manual recovery for Room messages, Thread replies and attachment uploads; request IDs and file objects remain only in the open tab;
- manager Room access editing for role/member allow, deny and inherited policy across the five bounded Room capabilities, with direct self-lockout prevention;
- the existing grouped Room rail, main workspace and people/thread inspector geometry.

The pure feed/attention/mention/search/permission/Thread-control decoders are regression-tested for ordering, cursors, tombstones, reaction allowlisting, malformed rows, quiet-hour and slow-mode policy, bounded unique person/role mention IDs, creator-inclusive private audiences, complete paged search-result shapes and valid exclusive override subjects. Replay-key generation and conflict-safe attachment recovery are separately tested. Member format, TypeScript and ESLint pass; all 90 unit tests pass.

## Deliberately not claimed as complete

- No trusted malware/content scanner worker is connected. Pending files are not shared with other members.
- Room role/member allow/deny/inherit editing is Released. Source-role assignment/hierarchy explanation, effective-permission summaries and view-as-role simulation remain.
- Report triage, moderator assignment, appeals and attachment scan decisions are Released in the separate admin application; authenticated duty-persona and scanner-provider journeys remain.
- The fixed-template delivery worker/dead-letter operations, presence/typing, Boards and direct-message/cross-surface multi-device reconnect remain. Space Room/Thread/attachment in-tab retry is Verified; slow mode, search pagination, private Thread membership editing, eligible public-Thread role selection, Thread follow/read/unread, person mentions, manager-only Room role mentions, pins, bookmarks, permission-filtered Space search and validated Room preference/quiet/digest scheduling are Released.
- Messages, Chapter/Mission Spaces and I/O share the Indus Orbit navigation language and spatial pattern, but have not yet been refactored onto one reusable React frame/store.
- Authenticated multi-persona, mobile, accessibility and visual-regression browser journeys remain required after web deployment.

## Evidence

- Hosted project: `jpwvgpnbkrktipwhvqss` (`Indus Orbit`, `ap-south-1`).
- Migration: `20260824190000_release_orbit_collaboration_controls.sql`.
- Attention/mention migrations: `20260826160000_release_orbit_attention_controls.sql`, `20260826161500_index_orbit_thread_follow_read_message.sql` and `20260827110000_release_orbit_member_mentions.sql`.
- Quiet-hours migration: `20260827120000_release_orbit_quiet_hours.sql`.
- Permission-filtered search migration: `20260827130000_release_orbit_permission_filtered_search.sql`.
- Bounded role-mention migration: `20260827140000_release_orbit_bounded_role_mentions.sql`.
- Room permission-editor migration: `20260827150000_release_orbit_room_permission_editor.sql`.
- Private Thread migrations: `20260828080654_release_orbit_private_thread_controls.sql`, `20260828081253_harden_orbit_private_thread_feed.sql` and `20260828081747_harden_orbit_private_thread_reuse.sql`; hosted apply versions are `20260828081023`, `20260828081351` and `20260828081833`.
- Search pagination migration: `20260828082754_release_orbit_search_pagination.sql`; hosted apply version `20260828082858`.
- Room slow-mode migration: `20260828174751_release_orbit_room_slow_mode.sql`; hosted apply version `20260828175323`.
- Role-mention replay migration: `20260828181404_harden_orbit_role_mention_replay.sql`; hosted apply version `20260828181552`.
- Hosted verification: rolled-back creator/member/non-member personas prove atomic two-person private membership, creator retention, non-manager rejection, private feed-summary isolation and access-checked idempotent Thread reuse. Separate rolled-back fixtures prove stable two-page search without overlap, a slow-mode member first-send/idempotent-retry/second-send rejection plus manager bypass, and identical role-mentioned replay leaving exactly one message, mention, notification and outbox record. No fixture content or configuration was retained.
- Database contract: `orbit_collaboration_controls.test.sql` now contains 44 schema/ACL/storage/replay assertions for the next complete replay.
- Post-DDL Advisors: 209 security notices (52 private/no-policy informational notices, 156 intentionally callable authenticated security-definer reviews and one project-level password-protection setting) and 410 performance notices (116 inherited auth init-plan opportunities, 245 workload-dependent unused-index observations and 49 inherited permissive-policy overlaps). The replaced audience RPC produces the same one intentional authenticated security-definer review and no new performance finding, RLS, FK or primary-key defect. See the [security-definer review](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [database advisors](https://supabase.com/docs/guides/database/database-advisors).
