# Indus Orbit - code work, release work and owner actions

Updated 22 October 2026. Overall implementation state: **Partial** for a full public launch of **Messaging + Terminal**. The text-chat/free-event candidate is **Verified** at the recorded source and synthetic-test boundary. **All code work is not complete.** This audit supersedes earlier summaries that described the remaining work as only deployment, configuration or real-service acceptance.

## 1. Product and delivery boundary

The company remains **The General Intelligence Company of India**, with **Intelligence, built together.** Messaging and Terminal are the two main offerings. Events, communities, learning, programmes, research and shared work extend them. The new [brand guidelines](brand/BRAND_PHILOSOPHY_AND_GUIDELINES_2026-10-22.md) and [site proposal](brand/SITE_SIMPLIFICATION_PROPOSAL_2026-10-22.md) describe the proposed brighter, simpler expression; they are not a deployed redesign.

Three codebases have different roles:

| Codebase                  | Current role                                                                                  | Meaning of completion                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Member/backend repository | Identity, messaging, native events, governed I/O and existing OpenCode web connector          | Paired frontend/backend source, runtime compatibility and genuine release acceptance                          |
| Separate admin repository | Privileged review, privacy, safety and release operations                                     | Same published/local source tree, real MFA operators and recovery acceptance                                  |
| DeepSeek Harness fork     | Local Terminal application refreshed from official upstream, using its brand extension points | A separately built/tested local application; it is not the OpenCode HTTP protocol or a signed Indus installer |

A harness brand plugin does not automatically connect its sessions to the web connector. A loopback health response does not prove mode enforcement. A successful source build does not prove an installer, provider route or public deployment.

## 2. Completed in this audit increment

| Fix                                              | State and evidence boundary                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unknown/composite/critical OpenCode permissions  | **Verified** exact reviewed-name classification and package-level refusal to grant unknown, critical or external-directory requests, including forged low-risk input. Unsupported names are never fabricated into cloud read approvals.                                                                                                                                                                            |
| Packaged JSON deadlines                          | **Verified** bounded timeout for fetch and body consumption, real abort signal, pre-aborted caller handling, ignored-abort settlement, late-body cancellation and cleanup. No automatic retry of writes.                                                                                                                                                                                                           |
| Cancellation while lifecycle metadata is awaited | **Verified** abort is rechecked before the prompt dispatch, the exact known runtime is aborted, positive acknowledgement is required for stopped state and refused acknowledgement is recorded as unconfirmed failure.                                                                                                                                                                                             |
| Public event access labels                       | **Verified** public events say Everyone; chapter/community restrictions have their own labels. Native guest registration remains independent of Community chat membership.                                                                                                                                                                                                                                         |
| Unverified web-runtime execution                 | **Verified** in source and a controlled browser regression the application blocks start/continue, permission grants, reviewed commands, forks and revert/restore until runtime policy enforcement is implemented. Exact session inspection, private handoff and permission rejection remain available with credentials. This is an interim application control, not a sandbox around a separately operated daemon. |

The final whole-application gate passed **295 unit tests**, all three library builds, production build, formatting/lint/types and bundle budgets. Six event browser runs and the separate new Terminal execution-denial check pass after disk recovery. The increment evidence records exact scopes. Historical database/61-browser results belong to their exact earlier candidate, not automatically to later source changes.

## 3. Engineering before launching Terminal as a core offering

### T1. Bind and verify actual execution authority - Partial, launch priority

**Observed defect:** `IoOverview.tsx` passed the selected mode to cloud metadata and the session title. `opencode.ts` created a session with a title and sent message parts without binding mode to daemon permissions. The browser filters only requests the daemon emits. An already allowed tool can run without such a request. Therefore Observe/Plan were not proven read-only.

The interim execution pause prevents new consequential actions from this web UI. It does not finish the Terminal capability. Completion requires:

1. Choose and pin the actual shipped runtime and protocol: the refreshed native DeepSeek Harness is a separate implementation from OpenCode compatibility.
2. Own a narrowly scoped runtime session/agent policy with default deny, explicit tools and permitted roots. Verify the resulting policy before accepting a prompt. Do not silently change a user's shared daemon configuration.
3. Carry the bound policy through continuation, commands, subagents, forks and checkpoint changes. Detect policy/config changes and fail closed. Agent names and cloud approval rows are not sufficient attestation.
4. Prove negative paths with a real runtime: an Observe/Plan edit or shell attempt, an allowed global configuration, auto-approval mode, unknown tools, delegated tools, external directory access, a fork and concurrent policy change. A denied action must have no filesystem/process effect.
5. Re-enable the web execution controls only with that evidence. Remove unsupported claims from public setup and product copy.

Official OpenCode v1.18.30 source inspected in this audit shows session creation/update permission rules, ordered rule merging, prompt `tools` replacing the ruleset, fork creation not inheriting it, and child-task rules retaining a narrower subset of parent rules. A simple `agent: plan` patch would leave this work unfinished. References: [agents](https://opencode.ai/docs/agents/), [permissions](https://opencode.ai/docs/permissions/), [server](https://opencode.ai/docs/server/), [pinned source](https://github.com/anomalyco/opencode/tree/v1.18.30).

### T2. Real OpenCode protocol compatibility - Partial

The adapter has tested fixture contracts. The inspected official spec uses `{sessionID}` paths while capability detection expects literal `{id}` paths. Real nonempty diff responses provide patch/count/status fields rather than requiring complete before/after strings. These are concrete adapter tasks, not owner setup:

- Match supported OpenAPI operation semantics and parameter names safely; do not enable unknown operations just by endpoint substring.
- Support the pinned patch response honestly, preserving bounded patch review or explicitly unavailable full before/after content. Do not manufacture file content.
- Verify current permission reply endpoint, session/global event forms, output parts, reconnect, actual abort acknowledgement/process termination, commands and child trees with the pinned runtime.
- Keep versioned fixtures captured from the official schema plus a real-runtime browser matrix. Preserve content/secret exclusion from the cloud metadata plane.

If the native Harness is the only launch Terminal, explicitly retire/hide the unsupported compatibility path. Do not imply the native fork already satisfies the web adapter contract.

### T3. Pairing, distribution and update lifecycle - Partial

The current web connector has a 15-minute tab-memory Basic-auth lease. That is useful exposure reduction; it is not a short-lived, origin/audience-bound token issued and revoked by an owned runtime. Implement the reviewed pairing/revocation protocol or document a deliberately narrower preview boundary.

The upstream Harness update is **dsh-v0.2.1-rc.2**, pinned at `687f282e8625c6b8d11ff58211a90524be2e4317` (official prerelease observed 22 October; published 17 October). The isolated update preserves the original checkout's four branding files. It uses the approved pixel logo and upstream brand plugin. The 53 focused tests passed; full compilation, GUI/assembled-browser and complete documentation/hygiene checks remain incomplete after disk exhaustion. The local source ZIP is not a pre-push-ready build. The repository’s `dsh-pre-push-checks` skill requires those selected gates before an ordinary push; they were not bypassed. Profile-specific favicon/PWA, native app identity/icons and account/update feed separation remain implementation tasks. The official release currently exposes source archives/attestation; no official installer was observed there.

A public Indus download still needs reviewed desktop app/bundle identity, icons, package metadata, update/service endpoints, platform builds, signing/notarization where applicable, checksum/manifest, install/update/uninstall/recovery tests, supported OS/architecture labels and a real owned release URL. A source-preview ZIP is suitable for developers and must be labelled **source, not an installer**. Preserve MIT and THIRD_PARTY_NOTICES. Never point an Indus download action at an unreviewed upstream update channel.

### T4. Provider/runner integration - Partial

Review and exercise the configured OpenAI/DeepSeek routes, actual serving/data terms and model selection. Run controlled authorized conformance and interruption tests with final commercial/data evidence. Existing adapters, limits, receipts and ledger code are useful foundations. Hosted runners require a separate isolated process/control plane, identity, egress/filesystem/secrets policy and recovery; Supabase Edge Functions are not long-running agent hosts. Hosted runners, session sharing, MCP/LSP views and E2EE are separate scope unless explicitly included in the public offer.

## 4. Other concrete engineering

| Work                             | Required completion boundary                                                                                                                                                                                                                                     | State / urgency                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Assisted privacy requests        | Complete and rehearse oversized exports, binary/file access and financial/case/security supplements, authorization, redaction, secure delivery, record of scope and retained-record review. Existing JSON workers deliberately route these to assistance.        | **Partial**; a staffed, tested process is required for launch. Automating every case is not required. |
| Retention/archive profile        | Implement the applicable regulated archive/profile and access/review rules; exercise closure, holds and backup/tombstone recovery. Source blocks automated closure from 13 May 2027 without that profile.                                                        | **Partial**; dated source requirement. Do not disable the guard or describe a universal purge.        |
| Legacy scan/cleanup integration  | Quarantined historical uploads, scanner digests/verdicts, retry/lease/dead-letter behavior, deletion and backup/restore evidence with the chosen supplier.                                                                                                       | **Partial**; real supplier required. OpenAI/DeepSeek are not malware scanners.                        |
| Host/review/community pagination | Public discovery already has 24-row Previous/Next; guest lists already have 100-row pages. Host/review workspaces cap at 100 and community list at 200 without complete navigation. Implement cursors/filters or enforce and disclose operational launch limits. | **Partial**; avoid invisible records at expected launch volume.                                       |
| Simpler site implementation      | Implement the reviewed two-offering hierarchy, route/content migration, art curation, corrected `/brand` factual claims and reference cleanup, common tokens and final desktop/mobile accessibility/performance acceptance.                                      | **Planned**; concrete prototype/book exists. Proposal is not deployed code.                           |
| Native Harness web integration   | Explicit authenticated entry, pairing/session/provenance and safe model route configuration if website and native Terminal are to share an experience.                                                                                                           | **Planned/Partial**; do not claim conversation-to-Terminal handoff or synchronized content exists.    |

Cohosts, QR check-in, recurring events, follows, uploaded event covers, chat files/voice/calls/phone sync and E2EE remain **Planned** enhancements. They do not block a deliberately scoped free-event/text-chat release. They must not be marketed as included.

## 5. Delivery and acceptance - not new feature claims

The read-only hosted audit on 22 October found **Indus Orbit / jpwvgpnbkrktipwhvqss**, healthy, **116 migration records / 10 active functions**. Source has **15 reviewed forward migrations and 7 new functions pending delivery**; the held structured-Spaces boundary remains excluded. Use the exact manifest, not subtraction or an indiscriminate push.

Engineering owns a representative staged upgrade, exact grants/RLS/Realtime/private Storage, safe worker schedules, real Auth/SMTP/Turnstile/Resend/scanner integration, monitoring and incident/recovery drills; then paired frontend/backend promotion. The managed 133-migration replay and 1,371 SQL assertions prove fresh-source contracts, not a representative hosted upgrade or live deployment. The new runtime source changes need their own exact checks; unchanged SQL does not require repeating Docker attempts.

Actual accounts/devices must prove signed-in tab return, token refresh/expiry, sleep/wake, unread/read, offline retry, cross-account denial, guest proof, host review, cancellation/waitlist email and operator recovery. Fix defects found; preserve evidence. Record Released only after verified deployment.

## 6. What the owner needs to do

1. Review the concrete [site prototype](brand/site-proposal.html), portal/moodboards and five-section landing proposal. The two-main-offering architecture and core identity are already approved; review this visual execution and copy.
2. Provide a distinct staging backend/site and the needed Netlify/Supabase dashboard access. Production project identity and `indusorbit.com` are already known. No need to provide them again.
3. Complete the service stores: Turnstile approved domains/keys, Resend verified domain/sender, Auth SMTP/recovery, scanner supplier and processing region. Put keys in the actual secret stores, not chat. Turnstile is a background anti-bot check for public forms.
4. Use your real host/reviewer account with MFA; nominate a second independent root operator and the people responsible for privacy/support/incidents/release. Prepare the first events and permitted content.
5. Supply or enable access to the owned release/signing accounts and supported platform priorities when the Terminal installer is ready to package. Engineering implements packaging/update/download code and gives you the exact signed artifacts to approve.
6. Confirm the exposed paid/provider scope and join the genuine multi-persona/device rehearsal. Retention remains under the prior **use best practice** delegation; another worksheet is not requested.

## 7. Ordered completion plan

1. Land this source safety/audit checkpoint and reviewable brand/harness assets; keep production promotion separate.
2. Complete T1/T2 or launch only a clearly bounded native Terminal preview, with the web execution controls closed. Do not call a disabled core capability complete.
3. Finish T3 distribution/pairing and T4 authorized route integration for the platforms actually advertised.
4. Implement the reviewed simplified public pages and calmly reorganize existing member/Terminal surfaces without a second chat system.
5. Complete the assisted privacy and scale-limit work relevant to launch; schedule the dated retention/archive engineering.
6. Rehearse the matched backend/frontend on staging with real services/operators/devices; fix and reverify actual failures.
7. Approve exact release/rollback artifacts, promote and observe; only then mark public production Released.

There is no defensible completion percentage from passing test counts. Remaining work includes real engineering, a proposed redesign, distribution and staged operating acceptance. This report makes each boundary explicit so owner setup cannot be mistaken for unfinished implementation.
