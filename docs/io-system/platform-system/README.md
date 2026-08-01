# Wider Indus Orbit platform system record

Status: filing for all systems outside the specialist I/O Port, Terminal and Conversation records, 1 August 2026.

The Indus Orbit product is broader than I/O. The checked-in application includes public publishing, auth/onboarding, profiles and directory, connections, vouch, mentorship, missions, Chapters, events, education, skills, Loops, S.O.D.A., stories, notifications, investor and administration surfaces.

The exact done/partial/left boundary is maintained in `../CODE_COMPLETION_REGISTER.md`. Product-wide implementation order is in `../../MASTER_IMPLEMENTATION_AND_RELEASE_PLAN.md`.

## Domain groups

| Domain                          | Existing source anchors                                                                              | Current state                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Public identity and publishing  | `src/routes/index.tsx`, `about.tsx`, `our-work.tsx`, `what-is-indus-orbit.tsx`, writing/story routes | Partial product with substantial UI; content operations, evidence, metadata, accessibility and release review remain. |
| Identity, profile and directory | auth/onboarding/profile/directory/settings routes plus Supabase Auth/profiles                        | Partial; production auth hardening, privacy and authoritative access contracts remain.                                |
| Trust and relationships         | connections, endorsements, vouch, mentorship and admin surfaces                                      | Partial; server authority, safety state machines and comprehensive tests remain.                                      |
| Action                          | Missions, Chapters, events and related admin routes                                                  | Partial; lifecycle/permissions/concurrency, notifications and programme operations remain.                            |
| Learning and public knowledge   | education, skills, Loops, S.O.D.A., stories and admin routes                                         | Partial; storage, assessment integrity, provenance, authoring workflow and accessibility remain.                      |
| Operations and governance       | admin audit/content/education/hubs/queue/reports/roles and other admin routes                        | Partial; least-privilege contracts, moderation/support procedures, telemetry and release operations remain.           |

## Cross-system rule

Every domain must eventually enter the shared branded spatial shell without collapsing its authorization boundary. A Mission, Chapter, conversation room and I/O workspace may link to one another, but membership and privileges remain domain-specific and are checked at the trusted boundary.
