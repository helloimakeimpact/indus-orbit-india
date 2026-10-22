# Indus Orbit — source finalization and production handoff

## 22 October deep audit and brand/harness follow-up

**Overall state: Partial. All code work is not complete.** The [code-level remainder](CODE_LEVEL_REMAINDER_2026-10-22.md) supersedes earlier mode-enforcement and configuration-only completion summaries. Four concrete connector/event defects are fixed; the web connector pauses execution until actual runtime permissions are bound and verified. Real OpenAPI/diff compatibility, pairing/distribution, assisted privacy/retention and the reviewed site redesign remain engineering work. The approved hierarchy is **Messaging + Terminal**, with the other experiences as extensions. See the [brand guidelines](brand/BRAND_PHILOSOPHY_AND_GUIDELINES_2026-10-22.md), [full redesign proposal](brand/SITE_SIMPLIFICATION_PROPOSAL_2026-10-22.md) and [review artifact index](brand/README.md). The native DeepSeek Harness refresh is pinned to the official prerelease and is separate from OpenCode web compatibility. Source previews are not signed installers or a production release.

The source checkpoint **fa20f30f68cef0b56ea24ee81a098f93ec2ac4a2** is published in the existing draft PR. [Quality](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/39828073798) passes **295 units + 50 member/public/configured browser runs**, build and budgets. [Database quality](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/39828073789) passes the 133-migration fresh replay, exact 97-difference held boundary, **40 SQL files / 1,371 assertions** and public/private lint. The separate unchanged admin's prior 12 browser runs remain separate evidence. Main is unchanged. The complete [increment receipt and screenshots](../release-evidence/brand-terminal-2026-10-22/verification.json) now include final desktop/320px prototype review and a browser source download with a matching SHA-256.

Updated **22 October 2026**. Overall public production state: **Partial**. The approved private-text and community/event-group candidate is implemented and locally **Verified**. The final managed application/database gates pass, including the safety retry race regression. Public launch requires the separate hosted, supplier, operator and recovery evidence below.

This report supersedes the current-state headings in the 20 October plans. [The previous detailed report](PRODUCTION_STATUS_2026-10-20.md) preserves the earlier whole-product evidence; [the chat candidate](conversation-system/CHAT_RELEASE_CANDIDATE.md) records this increment's contracts and limits.

## 1. Source publication and the live product

| Surface                  | Source boundary                                                                                                                                                                                                                                                                                                                                                        | Delivery meaning                                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Member/backend candidate | `codex/lightweight-chat-release`, [draft PR #2](https://github.com/helloimakeimpact/indus-orbit-india/pull/2); implementation `184bc8f8e3a9811015a1c27dd7b5bbca81a8a47d`, typed/security follow-up `5e20a553b2862953edc920f9ed155dc13ccb74a0`, previous audited candidate `9fdd4becccb7dba39745222ebe0074c65e9c18af` (tree `65c983850a6ba69427ee39b28000b7a8e3170f93`) | Published for review and CI. It requires the matching backend before promotion to the Netlify production branch.                                             |
| Existing member main     | `0b31c314d7dfcdbf8709b2237afbf1e2b7e1adb3` at the candidate branch point                                                                                                                                                                                                                                                                                               | The new chat is not claimed to be deployed on indusorbit.com. Exact Netlify deployed SHA still needs dashboard acceptance.                                   |
| Separate admin           | Published `a6bd2cc398e77d0a7cf0abd44bb38bbe52fe76a0`; local `13df8117dd070eefd9d00d3b51abe85db5bd23d0`                                                                                                                                                                                                                                                                 | Both have identical source tree `8d4bed4dcad61711cdb6dff20a6361011d72d3f6`. Publication preserves the existing remote parent; no forced history replacement. |

Source publication is authorized. Hosted migrations/functions, actual privacy execution, supplier/paid-provider activation and public launch remain separate reviewed actions.

## 2. What is complete in source

### Brand and premium interaction direction

- Core definition: **The General Intelligence Company of India**. Short line: **Intelligence, built together.**
- Original pixel/dawn/lotus/banyan artwork, indigo/parchment/saffron, Fraunces editorial type and Inter working type remain. The retired short line and neon direction are not restored.
- The design principles remain people first, calm hierarchy, visible evidence, continuity and inclusive interaction. Events use familiar Luma-inspired discovery/invitation/registration; messaging uses familiar lightweight inbox/composer behaviour within this identity.
- Shared chat rows, timeline, composer, explicit pending/error states, 44px controls, mobile one-pane navigation, IME-safe input, reduced motion, keyboard support and anchored reading are implemented. Broader visual/usability acceptance across every product screen remains **Partial**.

### Signed-in continuity

Same-account refresh/tab return preserves the mounted shell and working draft. Background access checks have a recoverable failure state; confirmed denial/sign-out closes access. Account-generation checks reject obsolete A→B→A results. Member and I/O navigation retain their separate access/onboarding boundaries. Controlled tests cover these behaviours; real token expiry, sleep/wake and devices still require staging.

### Private messages

- One account-scoped client serves the full Messages page and quick sheet, sharing drafts, queue, cache and subscriptions.
- Recent conversations show preview, time, per-chat unread and an unread filter. Accepted connections have a separate paginated picker. Group links load when their tab is opened.
- Original operation IDs survive uncertain responses and same-tab retries. Queued/Sending/Sent/Read/Failed states, retry/discard and capacity/storage feedback are explicit. Later typing survives older delivery completion.
- History renders at most 200 durable rows per active window; inbox/history/contact pages are bounded. Forward recovery handles more than one page of missed messages without silently skipping the gap.
- Read acknowledgements use the visible durable boundary. Hidden tabs, closed sheets and newly arriving rows beyond that boundary stay unread. Older reading positions survive background recovery; returning to latest is explicit.
- Expected-account RPCs, current pair eligibility, symmetric blocking, suspension/closure checks and generation guards protect requests and cached results. Requests have real 20-second abort signals; Auth waits are bounded to 10 seconds.
- This is the current server-authorized security model. It does not claim E2EE, device-delivered receipts or globally exact presence.

### Community and event discussions

- Chapter/Mission navigation reuses current Room authority and history.
- Hosts can opt an event into one attendee discussion. Provisioning is idempotent and version checked; eligible attendees explicitly join. Verified sign-in can claim the matching confirmed email registration without trusting browser-supplied email or mutable user metadata.
- Waitlisted/removed/outsider/cancelled/disabled/suspended/closed states deny the corresponding access. Event chat does not silently grant Chapter or Mission membership.
- Posting closes seven days after the event; authorized history becomes read only while the discussion remains open under the documented retention/hold rules.
- Event history, anchored scrolling, bounded retry recovery, account cleanup, member reporting and host restrict/restore use existing Room records and safety controls.
- The caller's own group membership is the **35th explicit privacy export dataset**. Export row/byte limits, metadata-only files and holds remain enforced.

### Native free events, email and forms

Existing source includes public discovery and invitation pages; public name/email guests by default with optional community/chapter restrictions; verified guest links; host review; revision-bound editing/review; capacity/waitlists; cancellation notices; timezone/calendar export; authorized guest operations and manual check-in. Public guest registration does not require joining chat.

Durable event mail supports status changes, edited invitations and reminders, with immutable payloads, provider idempotency, leases/retries and dead-letter handling. Resend sender is `events@indusorbit.com` under the owner's delegation. Turnstile server verification protects public forms and guest-proof requests. Genuine challenge/mail/schedule acceptance is still required.

### Education, privacy, admin and I/O foundations

- Trusted vouch/quiz operations, private education references, quarantine, scanner verdict/digest/lease checks and physical cleanup workers are implemented. A real malware-scanner supplier remains necessary.
- Bounded account JSON exports, expiring private downloads, reviewed deletion with cancellation period, account freeze, Storage/Auth confirmation, holds and retention workers are implemented. Oversized/binary/retained financial/security/case supplements use an assisted process; they are not a universal automated access-request system.
- The separate admin has capability/AAL2 checks, stale account denial, version-bound operational decisions, privacy review/recovery and a fresh-MFA two-person root workflow. Real operators and recovery acceptance are still required.
- Existing I/O source has policy/conformance/commercial gates, usage/fee/ledger evidence, health/circuit handling and scoped keys. Terminal source has safe metadata/approval records and the typed local OpenCode client; actual runtime policy binding is unfinished and the web execution controls are paused. Provider selection is not commercial activation or real runtime acceptance.
- Both applications pin compatible **Vite 7.3.7** after the newly reported dependency finding; refreshed npm audits report zero vulnerabilities. [Official patch release](https://github.com/vitejs/vite/releases/tag/v7.3.7).

## 3. Verification and limits

| Gate                  | Current evidence                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Member application    | Full local formatting/lint/types, **295 unit tests** (22 October deep-audit follow-up), three package builds, production build and bundle budgets pass on the typed candidate.                                                                                                                                                           |
| Admin application     | Full local gate, **35 units**, build/budgets and zero dependency findings pass. Published admin CI passes, including its 12 public/admin browser journeys.                                                                                                                                                                               |
| Chat browser checks   | Seven private-chat journeys and seven existing continuity journeys have controlled local evidence. The final five event-discussion journeys pass on 22 October, including reporting/moderation. Final CI passes **61 browser journeys across both apps** (20 public, four configured guest/form, 25 member/chat/event, 12 admin/public). |
| Database replay/types | Managed CI replayed all **133 source migrations**. The actual artifact supplied 17 new RPC declarations/event relationship; local exact type gate passes with **97 unchanged hash-bound held-Spaces differences**.                                                                                                                       |
| SQL/lint              | Final managed CI passes **40 files / 1,371 assertions**, including 61 new DM and 71 event-discussion assertions, all earlier contracts, the exact schema boundary and public/private schema lint.                                                                                                                                        |
| Lightweight budget    | Messages **+8.74 KiB gzip**, quick chat **+8.67 KiB**, both below +15 KiB against the separately built pre-chat reference. This measures incremental unique static JavaScript, not total app size or a device latency SLA.                                                                                                               |

The later deep-audit increment also passes **six focused event browser runs plus one new Terminal execution-denial check**. The Terminal check selects all four modes with a known workspace, prompt and credential and proves the execution action remains disabled with no loopback dispatch. These are separate from the earlier exact 61-journey CI record. [Current increment evidence](../release-evidence/brand-terminal-2026-10-22/verification.json) records the final source gate, artifact and harness limits.

Browser traffic uses invalid synthetic identities and intercepted HTTP/Realtime. It proves interface/state behaviour, not hosted Auth/RLS, genuine email/scanning or multi-device acceptance. Local Docker stalled during fresh-stack attempts; those attempts are not counted as passing replay evidence. Managed CI is the complete fresh-stack gate.

## 4. Hosted versus local — checked 22 October

[Read-only evidence](../release-evidence/chat-2026-10-22/hosted-read-only.json) confirms the connected project is **Indus Orbit / jpwvgpnbkrktipwhvqss**, **ACTIVE_HEALTHY**, ap-south-1, PostgreSQL **17.6.1.104**.

- Hosted migration ledger remains **116**, latest `20260907090226_add_final_fk_covering_indexes`.
- Hosted functions remain **ten ACTIVE**. The seven prepared new functions are absent.
- Source now contains **133 migrations**, with **15 explicitly reviewed forward releases**. Historical aliases and the held structured-Spaces migration mean subtraction is not a deployment plan.
- Pending new functions: `public-form-submit`, `event-guest-session`, `event-email-worker`, `education-file-scan-worker`, `account-privacy-worker`, `privacy-retention-worker`, `account-deletion-worker`.
- This pass made no hosted schema/function/data/secret mutation. GitHub, Supabase and Netlify delivery have distinct evidence boundaries.

## 5. Release order engineering must complete

1. Use the verified final candidate and [15-file forward manifest](../release-evidence/chat-2026-10-22/reviewed-forward-release-manifest.json). [Member Quality](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/39770406042), [Database quality](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/39770406129) and [Admin quality](https://github.com/helloimakeimpact/admin-indus-orbit/actions/runs/39769488587) pass. Verify any subsequent source change before delivery.
2. Inspect the chosen staging backend, historical aliases and held-feature boundary; restore a safe representative snapshot and rehearse the reviewed forward sequence. An empty replay alone does not prove a hosted upgrade.
3. Deploy matching functions/configuration and prove real grants, Data API closure guard, RLS/Realtime, private Storage and worker schedules. Keep unconfigured services unavailable; do not bypass quarantine or restore unsafe legacy writes.
4. Deploy the paired candidate member/admin frontends to staging, then run genuine personas/devices, outages, scanner/mail/recovery and operating acceptance.
5. Present exact backend/frontend versions, rollback/recovery evidence and limitations for owner sign-off. Promote the matched production package and observe it before recording **Released**.

The source manifests and [verification/publication record](../release-evidence/chat-2026-10-22/verification.json) bind the final code; subsequent documentation-only filing does not change those application/SQL inputs. The draft PR stays separate from the production branch until that pairing is established. The existing held structured-Spaces release is not included by implication.

## 6. What you need to do

1. **Provide a distinct staging backend/site and dashboard access.** The existing production identity and `indusorbit.com`/Netlify path are known. An inactive backup is not assumed to be safe staging.
2. **Finish service setup:** approved Turnstile domains/keys, verified Resend sender/domain, separate Supabase Auth SMTP/recovery, and a malware-scanner supplier/processing region. Put credentials in the service secret stores, not chat. OpenAI/DeepSeek do not replace malware scanning.
3. **Onboard operators:** your real host/reviewer account with MFA, a second independent root operator, the separate admin hostname, and named privacy/support/incident/release responsibility. Prepare first hosts/events.
4. **Confirm exposed AI/finance scope:** OpenAI/DeepSeek account, data and commercial readiness; applicable finance approvals only for features actually exposed. Engineering supplies current evidence and a bounded activation test. Event ticket payments remain later.
5. **Join the real rehearsal:** two connected members/two devices plus host, confirmed attendee, email-only guest, waitlisted/removed attendee and outsider. Review mobile, tab return, unread, revocation, delivery/recovery and public claims, then sign off the reviewed release.

You do not need to redesign the brand or submit another retention worksheet. The 15 October **“use best practice”** delegation remains the chosen policy instruction.

## 7. Work that remains with engineering and operations

The six launch workstreams remain: staged delivery; genuine service configuration/integration; operator/community onboarding; privacy/recovery operations; provider/runtime/finance acceptance; and final release acceptance. They include integration and operating work, not only keys.

Engineering/operations must prove real Auth/Storage deletion and backup coverage, rehearse restore with deletion tombstones, complete legacy scan backfill, operate assisted privacy requests/ownership handovers and retained-record reviews, configure monitoring/schedules and enforce required branch checks. The applicable regulated retention/archive profile is still due before **13 May 2027**; current source deliberately stops automated closure from that date. It must not be presented as a finished universal purge.

Separate future enhancements remain **Planned**: E2EE, optional private-chat files/voice, calls/phone sync, cohosts/QR check-in, recurring event series, follows, uploaded event covers and larger event paging. These are not silently included in the first text-chat/free-event release.

No defensible production-completion percentage follows from the passing test count. The next concrete handoff is staging access plus service/operator setup status; engineering then owns the release rehearsal and any defects it reveals.
