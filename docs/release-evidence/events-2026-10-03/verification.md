# Events checkpoint evidence — 3 October 2026

Status: **Partial**. The owner requested that development stop and current work be committed locally. Active task-owned verification and previews were stopped. No push, hosted migration/function deployment, provider activation or payment action is part of this checkpoint.

## Passing evidence and exact boundaries

| Evidence                                    | Result                                           | Boundary                                                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full unit suite                             | 195 passed                                       | Includes 13 public-form handler, 11 guest-handler and 4 event-calendar contracts.                                                                                                            |
| Native event fresh replay                   | 123 migrations; 30 files / 941 assertions passed | Earlier native-event checkpoint, before the latest attendance assertion and guest migration.                                                                                                 |
| Guest SQL core                              | 34 assertions passed, rolled back                | New guest core applied to the dedicated local test DB; excludes the subsequently added public-profile projection and three assertions.                                                       |
| Public/member production-browser regression | 29 passed, 2 intentionally skipped               | Earlier native-event production build, before public guest UI and later compatibility changes. Synthetic personas; not genuine production acceptance.                                        |
| Configured Turnstile browser                | 2 passed                                         | Intercepted SDK and persistence on desktop/mobile.                                                                                                                                           |
| Guest browser core                          | 2 passed                                         | Desktop/mobile request failure preserves draft, explicit confirmation, private receipt reload/cancellation. Before later same-link/anchor test additions and response-ownership refinements. |
| Capacity race                               | 8 callers: 1 confirmed / 7 waitlisted            | Earlier member-only race. The newly added mixed account/guest race has not run.                                                                                                              |
| Generated type boundary                     | Exact 97 reviewed held-Spaces differences        | Earlier 123-migration snapshot. The four new guest/profile RPC declarations still need final regeneration/reconciliation.                                                                    |
| Database lint                               | No error-level results                           | Earlier native-event database snapshot.                                                                                                                                                      |
| Production build                            | Passed, 8m 11s                                   | Latest local event/guest build. A build does not establish database delivery or real email operation.                                                                                        |
| Bundle budgets                              | Passed                                           | Largest JS 377.12 KiB / 500; CSS 219.04 KiB / 250.                                                                                                                                           |
| Formatting, lint and TypeScript             | Passing runs earlier in this increment           | Later documentation/profile/test refinements need a final complete gate run after resuming.                                                                                                  |

## Verification stopped or incomplete

- Final fresh replay of all 124 migrations was stopped during local database recreation. The dedicated local DB is disposable; this was not a hosted reset.
- Final type generation failed/timed out through local connectivity, then was stopped. Do not treat manual matching RPC declarations as generated-schema evidence.
- The final configured browser run recorded a desktop guest `page.goto` timeout at the initial invitation (20 seconds), before exercising the extended flow. One desktop Turnstile case passed; the whole run was stopped and has no passing final suite result. The timeout's cause is not established by that log.
- New attendance-cancellation coverage, public-profile projection coverage, mixed account/guest concurrency and the final complete browser suite still need to run.
- No GitHub CI has run against this local checkpoint. No genuine staging/production guest, host, reviewer, recovery, email, challenge, scanner or provider acceptance is claimed.

`events-desktop.png` is a synthetic illustration of the earlier discovery layout using original local assets. It is not a live event inventory or final guest-interface acceptance screenshot. The incomplete earlier mobile capture was discarded.
