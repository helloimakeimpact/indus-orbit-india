# Full public production launch — owner actions

Updated **20 October 2026**. Overall launch state: **Partial**. Read [the current status](PRODUCTION_STATUS_2026-10-20.md), [privacy policy](PRIVACY_EXECUTION_POLICY.md) and [delivery runbook](PRIVACY_EXECUTION_RUNBOOK.md). Exact source commits and CI results are recorded in the release evidence; a GitHub push does not establish hosted backend readiness.

## Added chat scope and eventual acceptance

The owner approved **private messages plus event/community groups**, retaining the current security model with E2EE planned separately. [The implementation plan](conversation-system/LIGHTWEIGHT_CHAT_FINALIZATION_PLAN.md) keeps the remaining engineering work with engineering; the current product is not yet code-complete for this expanded scope. After the source is ready, the owner will need two connected test members/two devices plus host, eligible attendee, guest and outsider personas for a short genuine chat/mobile/revocation rehearsal. Public guest registration continues independently; entering event chat requires verified sign-in/linking. No new retention worksheet is needed.

## Decisions already resolved

- Full public launch is the target. Core identity: **The General Intelligence Company of India**; short line: **Intelligence, built together.** Original dawn/lotus/banyan/pixel artwork and Indus Orbit design remain.
- Community and events follow the approved Luma-inspired direction: public discovery and name/email guest registration by default, optional community/chapter restrictions, approved member hosts and review for new hosts. Free native events come first; Razorpay event tickets remain later.
- Existing public hosting is **indusorbit.com on Netlify**, connected to GitHub. The verified existing backend is **Indus Orbit / jpwvgpnbkrktipwhvqss**.
- Resend is selected. The delegated sender is **events@indusorbit.com**. OpenAI and DeepSeek are the selected AI providers.
- You are the initial host/reviewer. Real account onboarding and MFA still need verification.
- You delegated retention choices on 15 October with **“use best practice”**. The selected policy is implemented in bounded source. You do **not** need to fill another retention worksheet; earlier requests to provide different rules are superseded.

## What you need to do

### 1. Arrange staging access

Staging is a separate test backend/site where we rehearse the release before touching live member data. Provide the approved staging project/site identity and team access through the service dashboards. The existing production identity is already known. The inactive JRI Backup Replica is not assumed to be a ready staging project.

Engineering prepares the exact twelve-migration/seven-function release, proves upgrade/rollback and presents the concrete promotion plan. Do not use blanket database push/history repair to reconcile historical aliases or held Spaces.

### 2. Finish service setup

- **Turnstile:** Cloudflare’s quiet browser verification against automated form abuse. Create keys for the approved staging/public domains. The public site key belongs in Netlify; the secret belongs in Supabase function secrets.
- **Resend:** verify the sending domain and sender. Supabase Auth SMTP is a separate setup for account confirmation, sign-in/recovery and reliable delivery; choosing Resend alone does not verify those flows.
- **Upload malware scanning:** choose the scanner supplier and processing region, then configure its documented endpoint/token through secrets. OpenAI and DeepSeek supply AI capabilities; they do not implement the file malware-scanner contract.

Never paste API keys, passwords or secret tokens into chat or browser source. Engineering verifies genuine success, expiry/replay, outages, retries and quarantine before activation.

### 3. Onboard the operating team

Use your real account, enroll MFA and complete trusted initial host/reviewer approval. Nominate a **second independent root operator**, choose the separate admin hostname and name privacy/support, incident and release owners. Prepare a small real event schedule and approved first hosts. Engineering verifies capability restrictions, revoked access and recovery with those actual personas.

### 4. Approve the AI and exposed finance scope

Confirm OpenAI/DeepSeek account readiness and intended data/commercial controls. Engineering reviews current model/pricing/terms evidence and prepares an explicitly bounded conformance run before activation. Approve the applicable merchant/tax/refund controls only for finance features actually exposed at launch. Event ticket payments remain later scope.

### 5. Accept the launch rehearsal

Participate in real member/guest/host/admin flows, tab return, mobile/accessibility, email/recovery and supplier failures. Review public claims and privacy disclosures. Accept the rehearsed recovery and operating handoff, then give named production sign-off.

## Work engineering and operations still own

- Deliver the approved backend sequence and paired frontends in staging; verify real grants/RLS/Realtime, the Data API closure guard, actual Auth/Storage operations, seven function deployments, schedules and monitoring. Backfill legacy education scans before opening file access.
- Implement the operating process for assisted/oversized/binary exports, ownership handovers, retained financial/security/case records and request response tracking. The JSON export is not a complete automated access-request service.
- Verify actual database/Storage backup coverage and retention; rehearse restore with deletion tombstones reapplied before serving users. Review holds and retained evidence by their due dates.
- Deliver the applicable regulated retention/archive profile before **13 May 2027**. Current source deliberately blocks automated account closure from that date; it is not a completed universal security/financial purge.
- Verify provider/runtime and exposed finance acceptance, exact Netlify deployed commits, branch protection/required checks, operator recovery and final legal/design/service acceptance.

These are release and operating obligations, with some assisted/privacy engineering still required. They must not be described as “just adding keys.” Cohosts, QR check-in, recurring series, follows, uploaded covers and larger event paging remain Planned enhancements, separate from these launch gates.

## Next handoff

Provide staging access and service/operator setup status first. Engineering can then make the release plan concrete and reviewable. Source publication remains authorized; hosted migrations, production data deletion, provider/payment activation and final public launch require their own reviewed delivery boundary.
