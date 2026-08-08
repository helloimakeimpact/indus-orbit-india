# Wider Indus Orbit platform system record

Status: filing for all systems outside the specialist I/O Port, Terminal and Conversation records, updated 8 August 2026.

The Indus Orbit product is broader than I/O. The checked-in application includes public publishing, auth/onboarding, profiles and directory, connections, vouch, mentorship, missions, Chapters, events, education, skills, S.O.D.A., stories, notifications, investor and administration surfaces. The former Loops content product is retired from active source; its rows are retained only as a service-role-readable archive pending an explicit retention decision.

The exact done/partial/left boundary is maintained in `../CODE_COMPLETION_REGISTER.md`. Product-wide implementation order is in `../../MASTER_IMPLEMENTATION_AND_RELEASE_PLAN.md`. `PRODUCT_BOUNDARIES_LOCATION_AND_CONVERSION_PLAN.md` defines the shared-identity split between public Indus Orbit, I/O Port, the opt-in community app and the separate admin application, together with the consent-aware global location and measurement contract.

## Domain groups

| Domain                          | Existing source anchors                                                                                                  | Current state                                                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public identity and publishing  | `src/routes/index.tsx`, `about.tsx`, `our-work.tsx`, `what-is-indus-orbit.tsx`, writing/story routes                     | Partial product with substantial UI; content operations, evidence, metadata, accessibility and release review remain.                                                                            |
| Identity, profile and directory | `/auth`, top-level `/io`, opt-in `/onboarding`, `/app`, profile/directory/settings and caller-bound access/location RPCs | Partial; the I/O/Community boundary and optional country-first location are Verified locally, while production auth hardening, location settings, privacy-safe discovery and persona E2E remain. |
| Trust and relationships         | connections, endorsements, vouch, mentorship and admin surfaces                                                          | Partial; server authority, safety state machines and comprehensive tests remain.                                                                                                                 |
| Action                          | Missions, Chapters, events and related admin routes                                                                      | Partial; lifecycle/permissions/concurrency, notifications and programme operations remain.                                                                                                       |
| Learning and public knowledge   | education, skills, S.O.D.A., stories and admin routes                                                                    | Partial; storage, assessment integrity, provenance, authoring workflow and accessibility remain.                                                                                                 |
| Operations and governance       | standalone `admin-indus-orbit`, this repository's migrations, and compatibility admin routes                             | Separate app foundation; super-admin/scoped-team and I/O control boundaries exist, while legacy moderation/support/content/program commands still need purpose-specific RPCs.                    |

## Cross-system rule

Every domain must eventually enter the shared branded spatial shell without collapsing its authorization boundary. A Mission, Chapter, conversation room and I/O workspace may link to one another, but membership and privileges remain domain-specific and are checked at the trusted boundary.

Administration is the exception to the shared member shell: privileged platform operations now belong to the separate `admin-indus-orbit` application. This repository remains the owner of shared database schema and migrations until a deliberate database-package boundary is introduced.
