# Chapter, Mission and Space system plan

Status: collaboration foundation and current database controls Released to the demo project; replay-safe Space send recovery Verified locally; hosted web deployment/personas remain, updated 28 August 2026.

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

The current member route also provides explicit offline state and a privacy-preserving manual retry boundary. Room messages, Thread replies and attachment reservations keep their original client request IDs after an uncertain response. A retry therefore resolves the original database record instead of creating another message; if a message succeeded before its file failed, the retry resumes at the attachment step. Draft text and `File` objects remain only in React memory for the open tab and are never placed in local or session storage.

Chapter and Mission detail pages resolve their associated Space and expose **Open Space** only to active members. Before the hosted migration exists, explicit missing-schema errors trigger a compatibility path; authentication, authorization, validation and conflict errors never fall back to insecure writes.

### Verification evidence

- the connected Indus Orbit project is healthy with 107 recorded migrations; latest is `20260828181552_harden_orbit_role_mention_replay`;
- the last recorded full database suite passes 733/733 assertions, with later collaboration contracts and hosted rollback-safe personas recorded separately;
- Chapter/Mission/Space test coverage for schema, grants, RLS, blueprints, joins, messages, read state, privacy, Realtime publication and positive/negative function behavior;
- 90/90 TypeScript unit tests, including stable replay-key generation and conflict-safe attachment recovery;
- TypeScript check passes;
- production application build passes;
- generated Supabase TypeScript declarations match the clean local schema;
- no missing covering foreign-key index in the new Chapter/Mission/Space schema.
- hosted ledger contains the current collaboration migration chain through private Threads, paged permission-filtered search and Room slow mode;
- hosted contract has no missing Space table/function and all 19 public Space tables use RLS;
- hosted direct Chapter/Mission browser INSERT/UPDATE privileges are false;
- hosted Space messages belong to the Realtime publication;
- hosted backfill contains 9 Spaces and 57 deterministic Rooms;
- hosted release contracts preserve all 19 Space RLS boundaries and revoked protected direct writes. Remaining Security/Performance Advisor notices are classified inherited or explicitly reviewed; production readiness is not inferred from a clean release contract.

## 4. What is still only Partial or Planned

| Capability               | State    | Remaining work                                                                                                                                                                                                                                                                                                         |
| ------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted schema            | Released | All three forward migrations and the read-only schema/RLS/RPC/Realtime contract pass on `jpwvgpnbkrktipwhvqss`; 26 historical timestamp aliases still prohibit ordinary future `db push`.                                                                                                                              |
| Space member journey     | Partial  | Add invite links, richer request reason, role explanation, notification defaults and complete leave/rejoin UX.                                                                                                                                                                                                         |
| Threads                  | Partial  | Timeline, follow/unfollow, lock/reopen, unread state and atomic creator/manager private membership are Released. Replay-safe in-tab reply recovery is Verified locally. Archive lifecycle, multi-device reconciliation and hosted multi-persona browser evidence remain.                                               |
| Roles and Room overrides | Partial  | Manager allow/deny/inherit editor and database-enforced Room slow mode are Released; add source-role assignment/hierarchy where domain policy permits, effective-permission explanation and view-as-role tests.                                                                                                        |
| Reactions and mentions   | Partial  | Reactions, explicit person mentions and manager-only Room/public-Thread role mentions are Released with bounded visibility and preference-aware scheduling; replaying one role-mentioned message cannot duplicate its mention, in-app notification or outbox evidence. Add worker delivery and abuse/persona evidence. |
| Attachments              | Partial  | Private quarantine-first uploads, type/size checks and signed downloads are Released; the client now resumes a failed upload/finalization against the original reservation without duplicating the message. Connect a trusted scanner, then add alt-text editing, expiry and download audit.                           |
| Pins and bookmarks       | Partial  | Caller-bound private bookmarks and manager Room pins are Released with member UI; add consolidated saved-item search/export and authenticated curator personas.                                                                                                                                                        |
| Moderation and reports   | Partial  | Member reporting, audited restrict/restore, separate admin triage/attachment review/appeals and Room slow mode are Released; add mute/timeout/remove, automated spam controls and approved retention/export.                                                                                                           |
| Search                   | Released | Caller-bound indexed full-text Space search rechecks Room/private-Thread access, excludes deleted content, caps input/results and provides stable relevance/time/ID keyset pages with Load more. Run authenticated load personas before scale.                                                                         |
| Presence and typing      | Planned  | Privacy-aware, expiring private Broadcast events; never durable surveillance.                                                                                                                                                                                                                                          |
| Notifications            | Partial  | Preferences, quiet/digest scheduling, bounded person/manager-role mentions and private outbox foundations exist; add broader event projection, fixed-template worker deployment and operator retry/dead-letter controls.                                                                                               |
| Mobile/accessibility     | Partial  | Complete drawer navigation, focus restoration, keyboard paths, screen-reader announcements, reduced motion and visual regression.                                                                                                                                                                                      |
| Shared shell             | Partial  | Generalize the new Space geometry and existing I/O geometry into one branded rail/sidebar/workspace/inspector architecture.                                                                                                                                                                                            |
| I/O collaboration        | Planned  | Link permissioned I/O sessions/artifacts without copying prompts, terminal output, files, credentials or provider responses into human messages.                                                                                                                                                                       |

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
- direct-message/cross-surface reconnect, multi-device reconciliation and a shared conversation store;
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
3. **Completed in code/database:** Threads, private audiences, role/Room overrides, slow mode, mentions, reactions, pins, bookmarks, attention preferences, private attachments, moderation/reporting and paged permission-filtered search.
4. **Verified locally:** explicit offline state plus replay-safe Room/Thread/attachment manual recovery using the released idempotency contracts.
5. Prove the current collaboration journey with hosted member/manager/outsider personas and load evidence.
6. Connect trusted attachment scanning and fixed-template notification delivery.
7. Deliver Boards, source-role hierarchy/view-as-role and saved-item aggregation.
8. Extract the shared branded shell and finish mobile/accessibility/cross-surface reconnect.
9. Add I/O handoffs only through deliberate references after the separate terminal permission boundary passes real-daemon evidence.
