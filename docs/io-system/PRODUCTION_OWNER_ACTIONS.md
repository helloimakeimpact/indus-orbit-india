# Full public production launch — owner actions

Status: **Partial**, 2 October 2026. This is the owner handoff within the canonical living record. Engineering implementation and exit criteria remain in `FINALIZATION_EXECUTION_PLAN.md`; this document explains the decisions, accounts and operating evidence the owner needs to supply. Full public launch is not approved.

## Current follow-up scope — 2 October

The current source adds a fourth forward migration, `20261002180809_require_verified_public_form_submissions.sql`, bringing source to 122 migration files. The preceding 121-migration/883-assertion record remains the earlier verified checkpoint. The new hCaptcha INSERT boundary has separate verification; the full current replay gate must pass before release. Hosted has not received any of these four forward changes. See `PUBLIC_FORMS_HCAPTCHA_RUNBOOK.md` in the canonical system record. The owner also approved an events-focused Community direction, approved member hosts/new-host review, public discovery/member registration and free native events first, with Razorpay later; see `COMMUNITY_EVENTS_DIRECTION_AND_LUMA_ANALYSIS.md`. Event delivery remains a Planned workstream with Partial current foundations.

## Latest decisions — Community and public forms, 2 October

- **Confirmed:** Community becomes events-focused, using Luma as a product-quality reference while retaining the Indus Orbit company identity, approved line and original assets.
- **Confirmed:** approved member hosts, with review for new hosts. Public discovery; Community membership is required to register. Free events are the first release; Razorpay ticketing follows later. The full research and delivery plan is in `COMMUNITY_EVENTS_DIRECTION_AND_LUMA_ANALYSIS.md`.
- **Confirmed:** hCaptcha is the public contact/newsletter supplier. The local handler, build and browser configuration boundary are Verified; real challenge/function and hosted enforcement remain Partial. Create production/staging site keys for the approved domains. Put only the public site key in Netlify `VITE_HCAPTCHA_SITE_KEY`; put the matching `HCAPTCHA_SITE_KEY`, `HCAPTCHA_SECRET_KEY` and comma-separated `PUBLIC_FORM_ALLOWED_ORIGINS` in Supabase Edge Function secrets. Never put the secret in a VITE variable or chat.
- Engineering must stage `public-form-submit` and its INSERT-revocation migration, verify valid/expired/replayed/invalid tokens and direct REST denial, then coordinate frontend delivery. Missing configuration deliberately leaves forms unavailable with a clear message and the contact email available. No insecure arithmetic/direct-insert fallback remains in the new source. Hosted enforcement remains pending until delivery.
- Supply initial communities/cities, real upcoming events and named pilot hosts; assign the host reviewer/moderation/support owners. No fabricated event schedule is approved by this direction.

## 2 October source delivery authorization

After the local finalization review, the owner explicitly requested **commit and push of all completed work to GitHub**. This supersedes the earlier local-only instruction for source delivery. The earlier local checkpoints below retain their pre-publication meaning. Hosted migrations, provider/payment activation and full-production approval remain separate gates. GitHub-triggered web delivery must be checked independently; no new trusted vouch/quiz RPC exists hosted until the three reviewed forward migrations are delivered. The client presents a temporary-unavailable state when a required RPC is absent and never restores browser-trusted issuance/grading as a fallback. Source commits and final verification are recorded in `../release-evidence/local-2026-10-02/verification.md` and Git history.

## Source publication completed

The approved code/docs are now committed and published to both GitHub repositories. Member Quality, Database quality and Admin quality passed; the live public homepage/Brand short line and retained artwork were verified. Hosted database changes and whole-product launch remain pending. The delivery report and exact commit/CI links are in `../release-evidence/local-2026-10-02/publication.md`. The worksheet below covers the inputs still needed from the owner; source publication does not need a second approval.

## Current boundary

- The launch target is full public production. The member GitHub baseline is `6607d4039d766dc077153dd933802da02d28dba7`. The owner has now authorized source commit/push. This evidence was gathered before publication; hosted migrations and release acceptance remain pending.
- The canonical identity remains **The General Intelligence Company of India**. The approved short line is **Intelligence, built together.** The working design specification is finalized in `DESIGN_PHILOSOPHY_AND_UI_PLAN.md`; full application of that specification still requires design/engineering work and task evidence.
- Hosted Supabase is healthy. The preceding browser declarations matched it. The current local release contract adds 10 leaf contracts for the pending trusted-vouch/quiz migration, so the strict hosted check correctly fails until that release is delivered. Fresh replay matches the local release contract plus exactly 97 held Spaces differences; this does not establish full hosted grants/RLS/Realtime equivalence.
- Provider and payment foundations exist but no provider route is commercially ready. Admin hosting, real operator evidence, privacy execution, worker operations and recovery drills remain open.

## Decisions to answer first

| Decision              | What to supply                                                                                                  | What engineering can do next                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terminal launch scope | Local OpenCode first, or hosted execution required on day one; supported operating systems                      | Pin daemon compatibility, finish pairing/revocation and installer work; estimate a separate hosted-runner platform if required                           |
| First provider        | Provider name, account readiness, written onward-access permission and intended data/region controls            | Review current official model/price/terms evidence, configure server-only secrets and prepare one explicitly approved conformance run capped at USD 0.01 |
| Operating setup       | Transactional-email supplier and sender domain; payment merchant status; two independent initial root operators | Configure sender/auth delivery, staging checkout and least-privilege admin onboarding after prerequisites are reviewed                                   |

These questions were raised during the current work. Answers need names/status and policy choices; secret values belong in the appropriate service dashboard or secret manager.

## Your practical setup worksheet

Complete these in order. Supply names, links, approvals and account status here; put secret values directly in the appropriate service dashboard or secret manager. Engineering will handle implementation, migration review, configuration validation and acceptance tests. You do not need to write SQL or debug the app.

| Priority | Your action                                     | Where / what to provide                                                                                                       | Completion evidence                                                                  |
| -------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1        | Confirm day-one scope                           | Local OpenCode or hosted execution; supported OS list; first provider; Community/education/payment features expected publicly | A named scope owner and accepted feature list                                        |
| 2        | Name accountable people                         | Release owner, security/privacy reviewer, support lead, finance/accountant, two independent root operators                    | Named approvers with availability and contact/escalation paths                       |
| 3        | Confirm environments and domain control         | Existing member Netlify site, separate admin site/hostname, Supabase production project and approved staging project          | Dashboard invitations, exact environment/hostname inventory, TLS and redirect checks |
| 4        | Choose email and scanner services               | Sender domain/address; SMTP service; notification sender; attachment scanner and processing region                            | Verified delivery, signed scanner callback, configured server secrets and schedules  |
| 5        | Prepare provider permission/account             | Provider name, funded account status, written onward-access terms, residency/training/retention choices                       | Reviewed official evidence and approved capped test                                  |
| 6        | Confirm merchant and policies                   | Razorpay activation status, legal seller, tax/GST/FX/refund/invoice rules and independent approver                            | Approved versions and successful staging payment drill                               |
| 7        | Approve privacy and support                     | Retention table, legal holds, export format/deadline, deletion SLA, support hours                                             | Reviewed policy plus export/delete/support rehearsal                                 |
| 8        | Review the local release and authorize delivery | Main/admin diffs, three new migrations, held Spaces decision, staged rollback plan                                            | Authorized commit/push/staging release followed by the required release evidence     |

### Accounts and domains: concrete setup

1. Give engineering access through team invitations to GitHub, Netlify and the approved Supabase projects; retain ownership of billing and root recovery.
2. Confirm that `jpwvgpnbkrktipwhvqss` is the intended production project or identify its replacement. Name the staging project separately. Do not copy live customer data into staging without an approved sanitization/restore procedure.
3. Keep the member and admin deployments separate. `admin.indusorbit.com` is a proposed admin hostname, pending your choice. In Netlify use **Domain management → Add a domain → Add a domain you already own**, then follow the DNS instructions for that exact site. Engineering verifies TLS, SPA routes and the final Auth redirects. [Netlify domain setup](https://docs.netlify.com/manage/domains/manage-domains/assign-a-domain-to-your-site-app/).
4. Browser builds use only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and the admin's `VITE_MEMBER_APP_URL`. Provider/payment/service credentials are server secrets.
5. After the local workflow files are delivered, create GitHub `staging` and `production` environments. For the read-only **Hosted schema contract** workflow set environment variable `SUPABASE_PROJECT_REF` and protected secret `SUPABASE_ACCESS_TOKEN`; use an appropriately scoped account/token. This workflow generates types and makes no schema/row changes. The read-only 2 October branch responses show both repositories’ `main` branches are currently unprotected. Set the reviewed branch rules and environment reviewers before delivery. Require the actual Quality, Database quality and Admin quality checks on their repositories after they have run. [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

### Email, recovery and scanning: concrete setup

1. Choose an SMTP supplier and verify a sender domain. The notification worker currently uses Resend; another supplier needs an adapter change. The same supplier can be used for Auth SMTP where it provides SMTP credentials, but Auth and notification configuration are separate.
2. Provide SMTP host, port, username/password through the supplier and Supabase Auth configuration, plus an approved From address and sender name. Add the supplier's domain-authentication DNS records and review limits. Supabase's default sender is unsuitable for public production. [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
3. Configure the notification worker's server-only `RESEND_API_KEY` and `IO_EMAIL_FROM` after sender approval. Engineering proves signup, confirmation, recovery, expired/used links, quiet hours, retry/dead-letter behavior and delivery to real non-team addresses.
4. Choose the attachment-scanning supplier, accepted file types/size limits, data region and failure policy. Configure its server credentials and `ORBIT_ATTACHMENT_SCANNER_WEBHOOK_SECRET` through server secrets. Engineering proves signature verification, infected/quarantined files, timeout, retry and duplicate callbacks. Selecting a supplier does not itself activate a safe upload path.
5. Decide supported login providers and review exact member/admin callback addresses. Enroll the two root operators separately with TOTP. Never send TOTP seeds or password/session exports in chat. Native Chrome automation permission was unavailable; a secure real login or controlled real-device acceptance remains necessary.

### Provider and payments: concrete setup

1. Supply the first provider name and account status; locate written permission covering the intended customer access. Include the evidence URL/document date, limits, territories, retention/training and contractual restrictions. Engineering does the technical model/price/capability review; you authorize commercial use.
2. Put provider credentials in the server secret named by the private connection record. Confirm `IO_SAFETY_IDENTIFIER_SECRET`. Approve the initial conformance operation, its reason and its **USD 0.01 maximum provider-cost ceiling** before it is run. No paid provider call has occurred in this pass.
3. Confirm the Razorpay legal merchant and activation status. In its dashboard select Test mode and use **Account & Settings → API Keys → Generate Key**; prepare Live mode only after the sandbox operating drill and merchant prerequisites. Keep credentials in the service secret interface. [Razorpay API-key setup](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/).
4. Payment configuration uses separate `RAZORPAY_TEST_KEY_ID`, `RAZORPAY_TEST_KEY_SECRET`, `RAZORPAY_TEST_WEBHOOK_SECRET` and corresponding `RAZORPAY_LIVE_*` values. Engineering configures the environment-specific endpoint, signed webhook handling and approved processor policy. Do not mix modes.
5. Ask the finance reviewer to approve seller/buyer billing details, tax/GST treatment, invoice numbering, FX source, refunds, credits, sponsorship and the existing 5.5% service fee. The independent second approver is required for the relevant financial policies. Engineering validates capture, duplicate/out-of-order webhooks, refunds and reconciliation before live promotion.

### Privacy, backups and support: decisions you must supply

Provide a row for each data family: profiles/onboarding/location; DM/Room/Thread content; attachments; notifications/delivery metadata; I/O receipts and terminal metadata; provider/payment/invoice evidence; moderation/audits; retired Loops archive. Each row needs **purpose, owner, visibility, retention duration, deletion action, legal-hold exception and export inclusion**. Privacy export/purge implementation depends on this approved matrix; request intake is already implemented.

Choose support contact/hours, incident lead, escalation rules, response targets, maximum accepted data loss (RPO) and maximum restore time (RTO). Confirm the Supabase backup entitlement and retention under **Database → Backups**. Arrange a staging restore drill and separately protect Storage file objects: database backups contain their metadata, not those files. [Supabase backups](https://supabase.com/docs/guides/platform/backups).

### Reply worksheet

```text
Terminal: local OpenCode / hosted required; supported operating systems:
First provider and written access-rights status:
Production and staging project/site names; chosen admin hostname:
Email supplier, sender domain/address; scanner supplier/region:
Merchant entity and Razorpay activation status; finance reviewer:
Two root operators; release/security/support owners:
Privacy/retention policy owner and target review date:
```

Names and status are enough to begin. Dashboard invitations and protected secret entry follow through the appropriate services. Hosted migration/deployment approval is a later step after the exact release view and evidence are reviewable; source commit/push was authorized on 2 October.

## Ordered owner checklist

### 1. Name the people who can approve the launch

- Assign product/release, engineering, security/privacy, operations/support and finance/legal owners. One person may carry several ordinary duties, but root-role changes and financial policy approvals need the required independent second person.
- Decide the initial public release cohort, operating budget, support hours, response promises and in-scope feature list. Full production requires every exposed capability to meet its gate; unready capabilities require an explicit scope decision and truthful UI.
- Assign an approver to every gate in `../RELEASE_READINESS_CHECKLIST.md`. A target date follows the evidence; no date is committed yet.

Deliverable: named owners, scope and acceptance decisions in the release record.

The 2 October hosted advisor review contains 170 security warnings (169 authenticated security-definer execution reviews and one leaked-password setting), 53 RLS-without-policy information findings, 165 performance warnings (116 Auth RLS initialization-plan and 49 policy-overlap reviews), and 303 unused-index information findings. These need explicit security/performance review with representative workloads. Private deny-by-default tables and caller-bound definer RPCs can be intentional; their safety must be justified individually. The review contains no error-level category. See the detailed counts and remediation links in `../SUPABASE_SCHEMA_RECONCILIATION.md`.

### 2. Confirm environments, domains and account access

- Identify which Supabase and web environments are staging and production. Approve a production-like staging environment for migration, auth, worker and payment testing; it must use test accounts and synthetic or approved data.
- Confirm control of `indusorbit.com`, member/API endpoints and the chosen separate admin hostname. Provide dashboard access through invitations. Review DNS/TLS and production Auth callback/redirect allowlists for the actual deployed addresses.
- Approve the alias-safe migration approach and review the intentionally held `20260830203000_release_orbit_structured_spaces.sql`. The local content seed `20260628124500` stays outside production delivery. Historical ledger aliases must not be repaired simply to make file counts equal.
- Confirm backup entitlement, retention and desired recovery-point/recovery-time targets. Approve a staging restore drill and a production-like upgrade rehearsal.

Deliverable: environment inventory, domain ownership, reviewed migration set and recovery targets. Engineering prepares exact dry runs, comparisons and drills before deployment.

### 3. Finish identity and test personas

- Confirm supported sign-in providers, recovery and account-confirmation behavior. Configure production SMTP with a verified sender, domain-authentication records and reviewed delivery limits in the Supabase Auth settings.
- Review redirect allowlists, [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), session/recovery settings and MFA policy. Provider credentials and TOTP seeds stay out of browser bundles and source control.
- Arrange ordinary-member, I/O-only, Space-manager, removed/suspended and scoped-admin test personas. Enroll two independent root operators with TOTP; record duty assignments without recording their secrets.
- Complete a secure local login for the real-member browser checks, or make the browser accessible for the read-only audit. Current native Chrome automation permission was unavailable; synthetic tests cannot prove the owner's live tab/sleep/token-expiry behavior.

Deliverable: authenticated positive/negative persona results, verified delivery/recovery and privileged AAL2 evidence. The tab-return test uses an unsent story draft and cancels it.

### 4. Approve privacy, content and Community operations

- Approve the actual data/cookie inventory, consent copy, retention and legal-hold matrix, account export format/SLA and deletion verification. Decide retention for the retired Loops archive.
- Choose transactional-email and attachment-scanning suppliers, terms and data regions. Approve sender/scanner secrets in their server environments and service-only worker schedules.
- Assign Trust/Support operators, moderation/appeal rules and escalation responsibilities. Agree how reported, suspended, removed and blocked states are handled across browser, storage, APIs and Realtime.
- Approve public claims, case-study evidence, contact/social destinations and licensed/consented imagery. The restored dawn/pixel-art asset family is the current visual basis.

Deliverable: reviewed policies and suppliers. Engineering then implements/operates privacy workers and proves retries, dead-letter recovery, quarantines and cross-member denial. Export/deletion request intake alone is insufficient.

### 5. Prepare the first live I/O route

- Obtain written rights for the intended onward access, plus retention/training, geography and commercial controls. A funded API account alone does not satisfy this requirement.
- Supply server-only provider keys through the service secret interface and verify the safety-identifier secret. Decide workspace data controls and whether any China-serving route is eligible; explicit acknowledgement remains required where applicable.
- Review current provider/model/price/capability evidence with observation/effective dates and a named reviewer. Approve the first reasoned conformance operation and its USD 0.01 ceiling before any paid test is executed.
- Approve customer budgets, sponsored/donated-capacity rules, published availability/support expectations and ownership of provider-disablement incidents.

Deliverable: one commercially authorized, conformed route with exact receipts, current evidence, health/alert schedule and a tested disablement path. Expand route inventory only after that operating loop works.

### 6. Finish payments and treasury decisions

- Confirm the legal merchant entity and Razorpay merchant activation. Set up separate staging test and production live credentials/webhook secrets using the dashboard.
- Obtain accountant/treasury approval for buyer billing identity, GST/tax, FX, invoice, refund, credit and sponsorship policies. The current fee policy is 5.5%; any change needs a versioned policy decision.
- Name the second independent financial-policy approver and the reconciliation owner. Agree invoice/support/refund handling and the required provider-statement evidence.

Deliverable: signed policy versions and a sandbox checkout → capture → invoice → duplicate/out-of-order webhook → refund → reconciliation drill, followed by controlled live promotion. Existing fail-closed ledger code is not live merchant readiness.

### 7. Authorize delivery once evidence is reviewable

- Source commit/push was authorized on 2 October. Review the completed diff, verification and exact migration view, then approve the staged hosted delivery. Database/provider/payment changes have not been authorized by the source-publication request.
- Approve a separate admin deployment, least-privilege operator checks, kill-switch and rollback drills. The 1 October admin source parity does not require a history rewrite; review its new local changes as a normal delivery increment.
- Review real-device keyboard/screen-reader/zoom/mobile evidence, field performance, provider/payment load, backup restore, support and incident exercises.
- Sign the release candidate, immutable source/migration set, monitoring and rollback ownership. Proceed through staging and a controlled public rollout, observing the agreed stop conditions.

Deliverable: a signed release record and deployed checks for the actual environment. Production readiness is recorded only after these gates pass.

## Engineering work still open

| Work package      | Next engineering deliverable                                                                                                                                                       | Completion evidence                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Member continuity | Validate the locally tested auth/account-switch/layout/store repairs with real sessions, mobile, token expiry and sleep/wake                                                       | Draft/place retention with no shell reset; explicit denial and sign-out close access; backend authority independently verified |
| UI system         | Apply the finalized visual grammar and page/empty/error/receipt/consent patterns across public, Community, I/O and admin                                                           | Reviewed visual record, WCAG 2.2 AA manual/automated matrix, task results and field performance                                |
| Data delivery     | Complete the alias-safe dry-run and remaining grant/RLS/Realtime review, deliver the three forward migrations, run the defined hosted type gate, rehearse snapshot upgrade/restore | Exact ledger and schema report, pgTAP/lint, negative personas and recovery timings                                             |
| Community         | Deliver the three locally verified forward migrations; finish in-scope profile/learning/programme flows, education scanner/quarantine, held Spaces and worker operations           | Domain state-machine, two-device, moderation, upload, replay and load evidence                                                 |
| Privacy           | Implement service-only export/purge after retention policy; prove legal holds and deletion completion                                                                              | Audited export/deletion drills and support-safe evidence                                                                       |
| I/O               | First eligible provider, capability conformance, evidence expiry, health/SLO/retry/load and any missing billing dimensions                                                         | Provider-specific receipts/cost reconciliation, current evidence and rollback drill                                            |
| Payments          | Configure approved processor/policies and complete signed/idempotent payment/refund/reconciliation journeys                                                                        | Sandbox and controlled live operating record                                                                                   |
| Admin             | Deploy independent app; verify ordinary/scoped/root/operator privacy and two-person controls                                                                                       | Hosted least-privilege/AAL2 persona matrix and audited operations                                                              |
| Terminal          | Real daemon compatibility, pairing/revocation races, step-up, supported signed installers; hosted runners only if launch scope requires them                                       | Real-daemon approval/abort/reconnect/isolation and install/recovery evidence                                                   |
| Operations        | Promotion/rollback, backups, SLOs/alerts, security review, incident/support/legal readiness                                                                                        | Named sign-off with completed restore/kill-switch/incident exercises                                                           |

There is no reliable remaining-work percentage: repository checks, deployed behavior and external operational gates measure different things. The table provides explicit finish conditions instead.
