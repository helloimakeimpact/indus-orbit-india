# Lightweight chat release candidate

Updated **21 October 2026**. Overall release state: **Partial**. This continues the approved private-message/event/community-group scope in [the execution plan](LIGHTWEIGHT_CHAT_FINALIZATION_PLAN.md). E2EE remains a separate future design; current source retains authenticated server access and encrypted connections.

## Implemented candidate source

- One account-scoped conversation client owns queue, drafts, bounded histories and subscriptions for the full page and quick sheet. Synchronous account generations reject obsolete A→B→A work.
- Original request IDs survive uncertain sends/retries and same-tab queue recovery. Queue capacity is 100; storage failures and full capacity are visible without losing the draft. New typing survives older delivery completion.
- Fifty-row history and inbox pages, a paginated accepted-connection picker, per-chat unread/preview/time, caller-bound read-through and forward reconnect recovery replace directory-only messaging.
- Shared premium inbox/timeline/composer with mobile navigation, keyboard/IME handling, anchored history, visible-only reads, accurate Queued/Sending/Sent/Read/Failed states, retry/discard and group navigation.
- The 200-row history window preserves a reader's current row; returning to latest is explicit. Private-channel join and initial history are coalesced, with an HTTP fallback when Realtime cannot join promptly. Late acknowledgements cannot restore revoked history.
- Requests are bounded: 20-second RPC/table reads with actual abort signals, 10-second session waits. Uncertain sends retain their original retry ID.
- Chapter/Mission group links reuse existing Room authority. Optional event discussions reuse Room history, with host opt-in, verified account/registration linking, current eligibility/revocation, seven-day post-event posting and authorized read-only archives.
- Event discussion safety actions reuse member reporting and host restrict/restore. Same-tab event retry recovery is bounded and cleared on account changes. The explicit privacy export includes the caller's group opt-in as its 35th dataset, under the existing row/byte/hold limits.
- No new chat SDK, message database, phone sync, calls, stories or E2EE implementation is introduced.

## Verification boundary

Local member and separate-admin application gates pass at their recorded source snapshots. Shared-client regression tests cover long reconnect gaps, duplicates, uncertain responses, stale accounts, hidden reads, exact-cap reading continuity and revoked-cache restoration. UI evidence in [the current evidence folder](../../release-evidence/chat-2026-10-21/ui-verification.json) records controlled localhost journeys and screenshots; these are synthetic sessions/HTTP/Realtime, not real-device production acceptance.

The new manifest-aware bundle gate measures unique static dependency graphs, including the lazy quick-chat entry roots, against a separately built `0b31c314d7dfcdbf8709b2237afbf1e2b7e1adb3` reference with the same dependencies/public build configuration. Current text-chat increments are about 8.7 KiB gzip for Messages and quick chat, within the 15 KiB target. This is incremental JavaScript transfer, not an end-to-end latency SLA or the entire application's download size. Connections and group links load on demand.

Direct-message SQL contracts pass 61 new assertions plus 77 existing DM/block/typing assertions on an isolated synthetic database. The event foundation passes 50 assertions; the subsequent privacy/safety additions need the complete candidate database gate. Local Docker became unresponsive again during full replay after the approved restart; this is not a passing fresh-stack result.

**Remaining candidate gate:** managed-stack CI must replay all 133 migrations, regenerate the public schema, preserve the 97 exact held-Spaces differences, run the full SQL suite and complete the final application checks. The generated schema artifact is retained for explicit review; candidate browser declarations must be updated from that evidence before merge. Do not infer release from this candidate source.

## Delivery and owner actions

Use a release branch/draft PR for candidate CI because the new frontend requires the matching backend contracts. The existing GitHub-to-Netlify production path needs a coordinated backend/frontend release after staging acceptance. No hosted Supabase migration/function, real mail, scanning, payment, paid model call or deletion is part of this source pass.

The three new chat migrations add to the previously reviewed twelve forward releases: **fifteen reviewed forward migrations**, with the separate structured-Spaces hold still preserved. Seven previously pending new Edge Functions remain; chat adds database/browser contracts rather than a new messaging service.

Engineering owns completing the candidate gates, exact types/manifest/documentation, staging rehearsal and safe deployment order. The owner's launch actions remain in [the owner handoff](../PRODUCTION_OWNER_ACTIONS.md): safe staging access, Turnstile/Resend/Auth email/scanner configuration, real MFA host/reviewer and a second independent root, admin hostname/support ownership, provider commercial approvals, real personas/two devices, recovery evidence and final release sign-off. Code completion does not establish those operating conditions.
