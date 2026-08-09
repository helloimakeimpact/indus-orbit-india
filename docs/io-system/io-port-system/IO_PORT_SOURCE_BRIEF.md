# I/O Port source brief and product synthesis

Status: evidence snapshot for planning, 30 July 2026. This document records what the current sources actually support. Claims must be re-verified before public launch because model catalogues, provider terms, prices, and infrastructure limits change.

## 1. Executive synthesis

I/O Port should be the intelligence and execution layer inside Indus Orbit, not a detached model reseller.

The coherent product is:

1. **Observatory:** independent, dated, reproducible information about models, endpoints, prices, latency, capabilities, languages, data handling, and availability.
2. **Port:** one compatible API and SDK surface for approved global and Indian model providers, with pinning, policy-aware routing, fallback, budgets, and route receipts.
3. **Control room:** workspaces, projects, keys, policies, usage, INR accounting, audit, evaluations, and operational status.
4. **I/O Terminal:** a local-first and web-visible agent workspace based on the strongest OpenCode patterns: durable sessions, plan/build separation, explicit permissions, task trees, diffs, commands, and terminal-to-web handoff.
5. **People layer:** Indus Orbit members, skills, academy material, missions, chapters, mentors, and verified playbooks make users more capable instead of making model consumption the end goal.

The public shorthand “India’s own OpenRouter” is useful internally to explain the gateway category. It is not a sufficient market position. BharatRouter already claims India residency, INR pricing, routing, failover, BYOK, teams, and agent identity. I/O Port must differentiate through evidence, understandable governance, Indian-language and local-workflow evaluation, human expertise, and visible accountability.

## 2. Source priority

When sources disagree, use this order:

1. Live production database and current deployed behaviour.
2. Current local application code and generated database types.
3. Current upstream source and official documentation.
4. Provider contracts and official price/policy pages.
5. Planning artifacts and older local migrations.
6. Marketing pages and third-party comparison sites.

The Claude artifact is a product-intent source, not proof that a feature is live. The local `/models` route is a prototype, not an authoritative model registry. Provider marketing is not proof of endpoint-level residency, retention, uptime, or conformance.

## 3. What Indus Orbit means in product terms

The Claude artifact, the public site, the local app, and the live schema all point to the same deeper system:

- Indus Orbit is both a company/product platform and a Foundation/public-purpose layer.
- People are not accounts at the edge of an AI product; identity, verification, vouching, contribution, learning, connection, and collective work are the core graph.
- The platform already organizes people through five orbit segments, chapters, India Missions, connections, endorsements, asks/offers, mentorship, stories, events, education, skills, and S.O.D.A ideas.
- The “100 priorities” and Four Cores in the artifact provide a national mission frame. The current application supplies practical primitives for communities, learning, and action, but does not yet implement the complete deliberation/voting/accountability system implied by the artifact.
- I/O Port therefore belongs where knowledge becomes action: the Observatory explains intelligence, the Port supplies it, the Terminal applies it, and the community verifies and teaches useful practice.

This supports the product statement:

> I/O Port helps Indian builders and teams choose, use, govern, and understand the right intelligence for the job through one compatible API and one accountable, people-centred workspace.

## 4. Findings from the current Indus Orbit application

Repository snapshot: `helloimakeimpact/indus-orbit-india`, `main`, commit `6086d95377d8e8ac80021cc1a4802bcab546a584` when inspected.

### 4.1 Existing technical base

- React 19, TanStack Start/Router, Vite, TypeScript, Tailwind, Radix-based components, Supabase JS, and Cloudflare configuration are already present.
- Public pages use `SiteShell`; authenticated pages use `AppShell` and a file-based `/app` route hierarchy.
- Brand tokens already define indigo night, saffron, gold, monsoon, parchment, Fraunces display type, Inter UI type, glass surfaces, compact app controls, and reduced-motion settings.
- The authenticated sidebar already supports collapsed and expanded states, mobile navigation, role-aware admin/lead sections, notifications, chat, and account actions.
- Existing deployments are ambiguous: both `wrangler.jsonc` and `netlify.toml` exist. The production owner and canonical deployment pipeline must be decided before I/O release work.

### 4.2 Existing product surfaces worth reusing

| Existing surface                                | I/O Port use                                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Profiles and orbit segments                     | identity, personal workspace ownership, recommendations, support context           |
| Roles, verification, suspension, vouching       | trust and eligibility signals; never substitute for explicit I/O authorization     |
| Chapters and chapter members                    | opt-in local/team I/O workspaces and community evaluation cohorts                  |
| Missions, members, and updates                  | mission-linked projects, shared terminal sessions, progress evidence               |
| Connections and direct messages                 | human collaboration and private contact; not a terminal event store                |
| Notifications                                   | approvals, budget alerts, shared-session invitations, evaluation results           |
| Academy courses, lessons, quizzes, and progress | I/O onboarding, safety training, role-specific learning paths                      |
| Skills and S.O.D.A ideas                        | playbooks, evaluation recipes, task templates, and outcome evidence                |
| Stories and spotlights                          | publish reviewed case studies and public-interest outcomes                         |
| Audit log and reports                           | platform moderation summaries; I/O needs an additional high-integrity audit stream |

The conversation product is already more than a placeholder: `/app/messages` provides the full contact/conversation experience, `ChatDropdown` provides a quick global sheet, unread state is surfaced in the app header, `direct_messages` is protected by sender/recipient policies, connection acceptance gates who can message, and notifications link users back into conversations. The Discord-like shell should make this system spatially clearer and more consistent. It should not create a second human-messaging system inside I/O Port.

### 4.3 Current Model Observatory is a prototype

The `/models` route is hard-coded into the React source. It has a fixed USD/INR conversion rate, a static comment citing Artificial Analysis, no model-version or endpoint-level provenance, no update pipeline, and a canonical URL pointing at a Lovable domain rather than `indusorbit.com`.

Several catalogue entries and future-dated names must not be treated as production truth merely because they are in source control. Before the public I/O Port page goes live:

1. move model, endpoint, capability, price, and evidence data into a versioned registry;
2. require source URL, observed date, effective date, currency, endpoint, and reviewer;
3. separate model capability from provider-endpoint behaviour;
4. distinguish measured, provider-claimed, community-reported, and unknown values;
5. calculate INR with a dated FX record rather than a source constant;
6. fix canonical/OG metadata and publish a benchmark methodology.

Do not delete `/models` immediately. Make it the Observatory view backed by the new registry, and use `/io-port` for the broader product promise and entry point.

## 5. Live Supabase findings

Connected project snapshot: `Indus Orbit`, project ref `jpwvgpnbkrktipwhvqss`, active and healthy in `ap-south-1`, PostgreSQL 17.6.1 when inspected.

### 5.1 Current data estate

The live `public` schema contains 43 tables and RLS is enabled on all of them:

- **Identity and trust:** `profiles`, `user_roles`, `member_suspensions`, `verification_decisions`, `endorsements`.
- **Vouch system:** `vouch_settings`, `vouch_role_overrides`, `vouch_user_overrides`, `vouch_codes`, `vouch_events`, `vouch_requests`.
- **Community and collaboration:** `connection_requests`, `asks_offers`, `mentor_sessions`, `notifications`, `direct_messages`.
- **Missions and chapters:** `missions`, `mission_members`, `mission_updates`, `chapters`, `chapter_members`, `chapter_proposals`.
- **Publishing and events:** `stories`, `spotlights`, `events`, `event_rsvps`.
- **Education and knowledge:** `courses`, `course_modules`, `lessons`, `lesson_attachments`, `resources`, `quizzes`, `quiz_questions`, `quiz_options`, `lesson_progress`, `quiz_attempts`, `skills`, `soda_ideas`. The former `loops` table is an inactive read-only archive and is not an I/O product input.
- **Operations:** `audit_log`, `reports`, `contact_submissions`, `newsletter_subscriptions`.

Existing active content should be linked, not copied into I/O tables. At inspection time the database held 5 courses, 5 course modules, 25 lessons, 56 S.O.D.A ideas, and 8 skills. Eight former Loop records are retained only for archival/retention review. Most user-generated mission, event, and message tables were still lightly populated, which lowers migration risk but does not remove the need for backups and rollback.

### 5.2 Live state differs from local migrations

- Supabase reported 36 applied live migrations.
- The repository contains 16 migration files.
- The local 25 April migration exposes `vouch_codes` through an always-true SELECT policy, but the live database has already replaced that policy. Live reads are restricted to issuer/admin and code redemption uses purpose-specific RPCs.

Conclusion: never replay the local folder against production or a new environment as if it were a complete source of truth. The first database task is to reconcile and version the live schema/migration history, review the diff, and test the recovered baseline on a development branch or isolated local database.

### 5.3 Security and performance baseline

The counts below are the original research snapshot. The 9 August 2026 post-Space release evidence supersedes them operationally: identified anonymous privileged execution is closed; the current Security Advisor reports 61 warnings/18 information notices and Performance Advisor reports 166 warnings/179 information notices. Neither attaches a warning to a new `conversation_*` object. See `../../release-evidence/demo-2026-08-09/supabase-release.md`.

The live Supabase Security Advisor reported 43 warnings:

- 13 `SECURITY DEFINER` functions executable by `anon`;
- 27 `SECURITY DEFINER` functions executable by `authenticated`;
- 2 unrestricted anonymous insert policies for contact/newsletter forms;
- leaked-password protection not enabled.

Some `SECURITY DEFINER` functions are legitimate trigger or policy helpers, but execute rights are too broad. Each function needs an intent review, explicit role grants, a fixed safe `search_path`, internal-schema placement where practical, and caller/argument authorization. Trigger-only functions should not be callable through the API.

The Performance Advisor reported 273 findings:

- 21 unindexed foreign keys;
- 151 RLS expressions that should use init-plan-friendly `(select auth.uid())` patterns;
- 84 multiple-permissive-policy findings;
- 17 unused indexes, which are observations rather than automatic deletion instructions.

These are not all release blockers by themselves. For I/O Port, however, key lookup, membership, request authorization, budget checks, and ledger writes must start from a clean and indexed policy design. Do not clone existing policy weaknesses into new I/O tables.

### 5.4 Key and server boundary findings

- The project has a modern publishable key available, but the browser client hard-codes the legacy JWT anon key and labels it as publishable.
- Server code expects the legacy `SUPABASE_SERVICE_ROLE_KEY`. Elevated credentials bypass RLS and must never enter browser, CLI, transcript, or runner bundles.
- A user-scoped auth middleware exists and validates claims; I/O control-plane operations should build on a user-scoped server client.
- Several files named `*.functions.ts` are plain browser-side functions, not authoritative server endpoints. Money, API-key creation, routing-policy changes, provider secrets, and usage reconciliation must use a real server boundary.
- The existing message page subscribes through Postgres Changes. Supabase currently recommends Broadcast for better scale and security in new realtime designs. I/O session events should use private Broadcast channels while retaining durable records in Postgres.

## 6. OpenCode findings

Reference snapshot: [`anomalyco/opencode`](https://github.com/anomalyco/opencode), `dev`, commit `8c38d260eb6555d2824230be100fb2a7eadd7513` when inspected. The older `opencode-ai/opencode` repository is not the active reference.

### 6.1 What is reusable

OpenCode is MIT licensed. Copies or substantial portions must retain the copyright and permission notice. Reuse still requires a dependency, asset, trademark, and distribution review.

Strong reusable product and architecture patterns include:

- one server/session protocol serving terminal, web, desktop, and IDE clients;
- OpenAPI-described HTTP APIs and SDK generation;
- local web on `127.0.0.1`, terminal attach, and shared session state;
- durable session/message concepts, child sessions, forks, summaries, todos, diffs, reverts, abort, archive, and event streams;
- primary agents and scoped subagents with model, prompt, step, and permission configuration;
- ordered wildcard permission rules resolving to allow/ask/deny;
- permission responses of once, always-for-session, or reject;
- custom slash commands with arguments, file references, shell-result inputs, agent/model overrides, and subtask execution;
- provider/model abstraction through the AI SDK and Models.dev;
- MCP, tools, LSP, formatters, repository context, and project instruction files;
- explicit warnings that an unprotected local server is safe only for local access.

### 6.2 What must be changed for I/O Port

- OpenCode’s basic-auth local server is not sufficient as a cloud tenancy or terminal-handoff security model.
- Local provider credentials in `auth.json` do not satisfy I/O workspace BYOK, rotation, audit, or remote-runner requirements.
- OpenCode sessions and I/O billing/audit records have different trust requirements; the I/O control plane needs authoritative workspace, policy, route, and paise-denominated ledger records.
- The current OpenCode app is a Solid-based product; the current Indus Orbit app is React. Reuse protocol/server/SDK concepts or maintain a separately built terminal client. Do not attempt a wholesale UI source merge into the React app.
- Public share links are too permissive as a default for company code. I/O sharing must be private by default, expiry-bound, audience-bound, redacted, revocable, and audited.
- Remote shell exposure is never a browser feature. A local daemon must make an outbound authenticated connection, or work must run in an isolated hosted runner.

### 6.3 I/O vocabulary

Use Indus Orbit language and policy:

- Observe: read/search/research only.
- Plan: propose work and estimate cost/risk; no mutation.
- Build: scoped file edits and approved test commands.
- Run: constrained execution with explicit production/network/destructive gates.
- Verify: tests, evaluations, route evidence, and human review.
- Handoff: a private, expiring task state transfer.

## 7. Market and provider findings

| Source                                                                                                              | Supported conclusion                                                                                                                                                                                   | Product response                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenRouter BYOK](https://openrouter.ai/docs/guides/overview/auth/byok)                                             | users expect unified access, BYOK, provider ordering/fallback, and policy/filter controls                                                                                                              | match the control baseline; exceed it with plain-language route receipts and India/workload evidence                                                                                                        |
| [LiteLLM](https://www.litellm.ai/pricing)                                                                           | OSS gateways already provide virtual keys, budgets, limits, fallbacks, logs, and metrics                                                                                                               | spike it as an adapter accelerator; keep I/O’s tenancy, evidence, ledger, and people workflows proprietary/product-owned                                                                                    |
| [BharatRouter](https://bharatrouter.com/)                                                                           | India, INR, routing, failover, BYOK, teams, and agent identity are already claimed                                                                                                                     | do not lead only with “India’s router”; prove transparency, reproducibility, human outcomes, and local-language/workflow quality                                                                            |
| [Mesh API](https://meshapi.ai/)                                                                                     | “One API. Every AI Model.” is generic category language                                                                                                                                                | do not use universal-access language as the primary differentiation                                                                                                                                         |
| [Sarvam pricing](https://docs.sarvam.ai/api/getting-started/pricing)                                                | Indian providers publish modality-specific INR prices and rate tiers                                                                                                                                   | treat Indian language, speech, document, and endpoint policy as first-class registry dimensions                                                                                                             |
| [OpenCode docs](https://opencode.ai/docs)                                                                           | agent workflows need sessions, permissions, commands, providers, diffs, and multiple client surfaces                                                                                                   | I/O Terminal should turn the gateway into controlled work, not merely expose a web shell                                                                                                                    |
| [Block Buzz](https://github.com/block/buzz) and [Buzz Mesh](https://github.com/block/buzz/blob/main/VISION_MESH.md) | one human/agent workspace can expose opted-in community GPUs through a local OpenAI-compatible provider; Buzz explicitly says prompts run on member hardware and privacy is bounded by the trust group | build an I/O Capacity Commons with opt-in donation, capacity provenance, workload eligibility, explicit consent, technical isolation, health/evidence, and a different trust tier from contracted providers |

Provider prices, fees, models, and policies are deliberately not frozen in this brief. They must enter the registry with effective dates and sources, then be revalidated before launch and on a scheduled cadence.

### 7.1 Partnership and capacity-commons model

The founder direction is partnership-first, with a mixed capacity supply:

1. contracted Indian and global model/API providers;
2. Indus Orbit-rented or owned inference servers;
3. institutionally donated or sponsored servers/capacity;
4. opt-in member/community capacity, inspired by Buzz Mesh;
5. customer BYOK/private endpoints.

These are not interchangeable endpoints. Every route must expose the capacity source, operator, region, data path, retention/training terms, commercial/support status, health confidence, donation/expiry conditions, and workload eligibility. Community-donated capacity defaults to non-sensitive, revocable, best-effort workloads. Contracted or Indus-operated capacity may qualify for stronger routes only after contractual and technical controls prove it.

The central lesson from Buzz is the value of joining community identity, collaboration, agents, and compute. The central I/O addition is that Indus Orbit spans strangers, institutions, partners, chapters, missions, and paid customers—not one small pre-trusted team. Membership or vouching therefore cannot be the only compute-admission or data-policy gate.

## 8. Supabase architecture decisions from current guidance

Official references: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Realtime Broadcast](https://supabase.com/docs/guides/realtime/broadcast), [database-change subscriptions](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes), [Edge Functions](https://supabase.com/docs/guides/functions), [Edge Function limits](https://supabase.com/docs/guides/functions/limits), and [API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Decisions:

1. Keep I/O tenancy, policies, registry metadata, durable terminal records, and money ledgers in the existing Supabase project unless load testing proves a separate database is needed.
2. Enable RLS on every exposed I/O table from the first migration. Policies must target roles explicitly, use `auth.uid()`, and include `USING` plus `WITH CHECK` for UPDATE.
3. Never authorize from mutable user metadata. Use database membership/role records.
4. Put unavoidable `SECURITY DEFINER` helpers in a non-exposed schema, fix their search path, validate caller/arguments, revoke `PUBLIC` execute, and grant only intended roles.
5. Mark exposed views `security_invoker = true`.
6. Use modern publishable keys in clients and separate modern secret keys per backend component where supported. Elevated keys remain server-only.
7. Use private Realtime Broadcast topics for live terminal/session events. Persist durable events first or through a reliable ingestion path; Realtime is delivery, not the ledger.
8. Use Edge Functions for narrow authenticated endpoints, webhooks, notifications, and attach-token issuance. Long-lived model streaming, tool loops, sandboxes, and terminal processes belong in dedicated gateway/runner services.

## 9. Adopt, adapt, and reject

### Adopt

- existing Supabase Auth users, profiles, trust/community graph, content, notifications, and India-region database;
- current brand tokens and route framework;
- OpenCode’s MIT-licensed session, permission, command, diff, task-tree, and attach patterns after audit;
- one API, explicit model pinning, BYOK, budgets, fallbacks, and observability as category requirements;
- transparent INR accounting and dated evidence.

### Adapt

- evolve the app shell into a Discord-like information system: persistent global rail, contextual navigation, main workspace, and optional activity/inspector panel;
- evolve `/models` into the evidence-backed Observatory and add `/io-port` as the product page;
- extend, rather than copy, existing audit/messages/notifications for I/O-specific volumes and security;
- map chapters and missions to optional I/O workspaces without making community membership equal technical authorization;
- maintain an OpenCode-derived local client behind I/O identity, routing, and policy.

### Reject

- copying Discord’s visual identity, terminology, or social incentives;
- treating a static model array as a trustworthy live catalogue;
- an unauthenticated network-accessible local OpenCode server;
- browser-held provider keys or service-role credentials;
- raw prompt/terminal payload logging by default;
- silent fallback across model quality, provider, region, or retention boundaries;
- using `direct_messages` as an agent/session log;
- using aggregate usage dashboards as the source of truth for invoices;
- launching “all models,” “India resident,” “zero retention,” or benchmark claims without endpoint-level evidence.

## 10. Decisions still requiring founder authority

1. **Commercial model:** reseller/merchant of record with a prepaid INR wallet, BYOK/control-plane only, or a staged hybrid. Recommended V1: BYOK plus one contractually approved pooled provider; expand the wallet only after tax, payment, credit, and reconciliation proof.
2. **Execution model:** local-only terminal at first or funded hosted runners. Recommended V1: local execution with web visibility and approvals; hosted runners only after isolation and operations are independently reviewed.
3. **Public access:** open public API or verified-member-only product. Recommended: public developer entry with member benefits, community playbooks, credits, and expert support—not membership as the API security boundary.
4. **Deployment owner:** Cloudflare, Netlify, or another production path for the web app, plus the separate gateway/runner runtime. Remove ambiguous dual-production configuration.
5. **Residency claim:** define exactly which stored data and request path are in India and which model providers leave India. “Supabase in Mumbai” alone does not make an end-to-end inference request India-resident.
