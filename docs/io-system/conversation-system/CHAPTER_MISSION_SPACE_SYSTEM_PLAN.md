# Chapter, Mission and Space system plan

Status: database foundation Released to the demo project and first member web surface pushed to GitHub; hosted browser personas remain, updated 9 August 2026.

## 1. Product meaning

A Chapter is a place-based or purpose-based community. A Mission is a bounded action programme. A Space is the collaboration projection that gives either domain a Discord-like spatial structure without turning Indus Orbit into a Discord clone.

The domain record remains authoritative:

- Chapter lifecycle, geography, purpose and membership belong to Chapters;
- Mission lifecycle, outcome, Chapter relationship and membership belong to Missions;
- Space membership is projected from those domain memberships;
- Rooms, Threads, messages, read state and collaboration preferences belong to the Space;
- platform administration does not silently make an operator a member of every Space.

The member experience is deliberately people-centred. It helps a person understand where they are, what the group is doing, who is present and what needs attention. It must not manufacture engagement pressure, disguise agents as people or copy private I/O terminal content into human conversation.

## 2. Evidence states

- **Released**: deployed and verified in the named hosted environment.
- **Verified**: implemented and proved by local tests/build, but not yet verified in the hosted environment.
- **Partial**: a useful slice exists but material behavior remains.
- **Planned**: designed but not yet operating.
- **Blocked**: cannot progress without a named owner decision or external access.

## 3. What is Released or Verified in code

### Database and authority

Migration `20260809152439_create_chapter_mission_space_foundation.sql` is a forward-only Released foundation. It adds:

- explicit Chapter, proposal, Mission and membership lifecycle fields;
- normalized location references and version counters;
- caller-bound idempotency for Chapter and Mission creation;
- Space, role, role-member, membership, context-group and Room records;
- Room permission overrides;
- Thread and Thread-member records;
- durable messages and message revisions;
- mentions, reactions and attachments;
- pins, private bookmarks and per-member read state;
- notification preferences and reports;
- private moderation actions and delivery outbox records;
- RLS on exposed tables, explicit grants and private-schema isolation;
- covering indexes for every new/modified foreign key;
- Realtime publication of durable Space messages.

Direct authenticated writes to protected Chapter/Mission/proposal/membership tables are revoked by the new contract. Mutations move through narrowly scoped, caller-bound functions instead of trusting browser-authored owner IDs, role fields or lifecycle values.

### Caller-bound operations

Verified functions cover:

- proposing a Chapter;
- creating a managed Chapter as an authorized programme operator;
- approving or rejecting a Chapter proposal;
- updating Chapter details;
- changing Chapter lifecycle between active, paused and archived;
- assigning or demoting a Chapter lead with last-lead protection;
- creating a Mission;
- changing Mission lifecycle;
- requesting, accepting, declining and leaving Space membership;
- creating a Thread;
- sending a Room message;
- advancing Room read state.

These functions derive the caller from `auth.uid()`, validate authority at the database boundary and reject stale optimistic versions. Retryable creation uses client request IDs so network retries do not create duplicate Chapters or Missions.

### Deterministic Space structure

Every approved/managed Chapter receives seven ordered Rooms. Every Mission receives six. The migration owns the blueprint so web, mobile and future admin clients cannot create inconsistent default structures.

The initial Room types cover the minimum collaboration journey:

- orientation and announcements;
- general conversation;
- planning and work coordination;
- evidence, updates or outcomes;
- resources/help;
- member context where appropriate.

The exact labels remain brand language rather than Discord vocabulary.

### Member web surface

The first `/app/spaces/$spaceId` route is Verified in the production build. It provides:

- grouped Room navigation;
- the selected Room timeline;
- a durable RPC-backed composer;
- active People roster;
- Chapter/Mission context and back-link;
- membership-gated Room content;
- Realtime reconciliation for inserted messages;
- caller-bound read advancement;
- responsive one-column fallback for narrower screens;
- explicit loading, empty, access and error states.

Chapter and Mission detail pages resolve their associated Space and expose **Open Space** only to active members. Before the hosted migration exists, explicit missing-schema errors trigger a compatibility path; authentication, authorization, validation and conflict errors never fall back to insecure writes.

### Verification evidence

- clean local replay of all 62 checked-in migrations;
- 433/433 pgTAP assertions across 11 database test files;
- Chapter/Mission/Space test coverage for schema, grants, RLS, blueprints, joins, messages, read state, privacy, Realtime publication and positive/negative function behavior;
- 38/38 TypeScript unit tests;
- TypeScript check passes;
- production application build passes;
- generated Supabase TypeScript declarations match the clean local schema;
- no missing covering foreign-key index in the new Chapter/Mission/Space schema.
- hosted ledger contains all three forward migrations;
- hosted contract has no missing Space table/function and all 19 public Space tables use RLS;
- hosted direct Chapter/Mission browser INSERT/UPDATE privileges are false;
- hosted Space messages belong to the Realtime publication;
- hosted backfill contains 9 Spaces and 57 deterministic Rooms;
- hosted public-schema lint has no error and Advisors attach no warning to a new `conversation_*` object.

## 4. What is still only Partial or Planned

| Capability               | State    | Remaining work                                                                                                                                                                            |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted schema            | Released | All three forward migrations and the read-only schema/RLS/RPC/Realtime contract pass on `jpwvgpnbkrktipwhvqss`; 26 historical timestamp aliases still prohibit ordinary future `db push`. |
| Space member journey     | Partial  | Add invite links, richer request reason, role explanation, notification defaults and complete leave/rejoin UX.                                                                            |
| Threads                  | Partial  | Schema and create function exist; build Thread timeline, follow/unfollow, lock/archive, private membership and unread UI.                                                                 |
| Roles and Room overrides | Partial  | Schema exists; add audited operator UI, effective-permission explanation and view-as-role tests.                                                                                          |
| Reactions and mentions   | Partial  | Durable records exist; add composer parsing, bounded fan-out, preferences, abuse controls and accessible UI.                                                                              |
| Attachments              | Partial  | Metadata exists; create private Storage buckets/policies, signed upload flow, type/size rules, malware scanning, alt text and download audit.                                             |
| Pins and bookmarks       | Partial  | Records exist; add curator/private-member UI and permission tests.                                                                                                                        |
| Moderation and reports   | Partial  | Records exist; add member reporting, evidence-safe moderator queue, mute/timeout/remove actions, appeals and retention rules.                                                             |
| Search                   | Planned  | Permission-filtered full-text search with safe snippets, cursor pagination and deletion/retention behavior.                                                                               |
| Presence and typing      | Planned  | Privacy-aware, expiring private Broadcast events; never durable surveillance.                                                                                                             |
| Notifications            | Partial  | Preferences and private outbox foundations exist; add event projection, digest/quiet hours, fixed-template worker deployment and operator dead-letter controls.                           |
| Mobile/accessibility     | Partial  | Complete drawer navigation, focus restoration, keyboard paths, screen-reader announcements, reduced motion and visual regression.                                                         |
| Shared shell             | Partial  | Generalize the new Space geometry and existing I/O geometry into one branded rail/sidebar/workspace/inspector architecture.                                                               |
| I/O collaboration        | Planned  | Link permissioned I/O sessions/artifacts without copying prompts, terminal output, files, credentials or provider responses into human messages.                                          |

## 5. Safe hosted rollout

The repository and hosted migration history have 26 historical timestamp aliases. A normal linked `supabase db push` from the ordinary checkout is therefore not an acceptable deployment mechanism.

Use this order:

1. **Release compatible frontend code.** The application prefers the new RPC/schema and falls back only when PostgreSQL/PostgREST explicitly reports that the new object does not exist.
2. **Apply trusted product events.** Deploy `20260809142000_create_trusted_product_event_rpcs.sql` through an exact forward-migration operation.
3. **Apply email claim hardening.** Deploy `20260809150000_harden_email_delivery_claims.sql` the same way.
4. **Apply the Space foundation.** Deploy `20260809152439_create_chapter_mission_space_foundation.sql` only after steps 1–3.
5. **Verify hosted contracts.** Confirm migration ledger entries, objects, grants, policies, functions, publication membership and member/admin negative personas.
6. **Run hosted application personas.** Create/propose/approve a Chapter, open its Space, create a Mission, join, send/read a Room message, archive safely and prove outsider privacy.
7. **Review Advisors.** Triage new security/performance findings separately from inherited warnings.
8. **Remove rolling fallbacks later.** After the hosted release is stable, delete legacy direct-write fallbacks in a separate hardening release.

The rollout does not require a paid Supabase branch and must not rewrite or repair historical hosted migrations merely to make timestamp lists look alike.

## 6. Code work versus owner input

### Code team can continue without credentials

- Threads UI and Thread read/follow behavior;
- reaction, mention, pin and bookmark UI;
- role/Room effective-permission evaluator and admin surfaces;
- report/moderation queue and audited actions;
- pagination, offline/retry states and shared conversation store;
- component, route, RLS persona, accessibility and load tests;
- shared branded spatial shell extraction;
- attachment client contracts and Storage migration source without activating a production bucket;
- notification event contracts and worker observability UI;
- removal of compatibility fallbacks after hosted verification.

### Owner input is required

- approve the exact hosted migration window and confirm whether the linked project remains a demo/non-production environment;
- confirm which web hosting deployment owns the frontend release and its rollback path;
- approve sender domain/provider before the email worker sends real mail;
- approve attachment content policy, file limits and retention;
- name moderation owners, escalation times and appeal policy;
- approve any provider conformance calls that may create billable I/O traffic;
- restore access to the separate `admin-indus-orbit` GitHub remote if its repository remains unavailable to the authenticated account.

## 7. Definition of code-level completion

The Chapter/Mission Space system is code-complete for a public release only when:

- all protected mutations are caller-bound and have positive/negative database tests;
- effective permissions are deterministic and explained in the admin UI;
- every timeline is cursor-paginated and handles retry/offline/reconnect;
- Threads, mentions, reactions, attachments, pins, bookmarks and notification preferences have accessible member UI;
- reports and moderation have audited, content-minimizing operator workflows;
- mobile, keyboard and screen-reader personas pass;
- hosted schema and generated types show no drift;
- load tests establish safe message/read/realtime limits;
- the release includes telemetry, alerts, backup/restore and rollback evidence;
- human conversation, system notices, agent output and I/O terminal events remain visibly and structurally separate.

## 8. Next execution sequence

1. **Completed:** commit and push the rolling-compatible frontend and locally Verified migration/test package.
2. **Completed:** apply and verify the three forward migrations through the alias-safe deployment view.
3. Prove the core hosted Chapter/Mission/Space personas.
4. Deliver Threads plus role/Room administration.
5. Deliver mentions, reactions, pins, bookmarks and notification preferences.
6. Deliver private attachments and moderation/reporting.
7. Extract the shared branded shell and finish mobile/accessibility.
8. Add I/O handoffs only after durable I/O sessions and their separate permissions exist.
