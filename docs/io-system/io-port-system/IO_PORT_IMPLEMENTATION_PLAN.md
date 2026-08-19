# I/O Port implementation plan

Status: implementation baseline, audited 19 August 2026. The demo control plane, registry-driven `io-gateway` v20, route-receipt schema, idempotency, hard budgets, route ledger, health/circuits, terminal metadata, safe timeline and non-executable approval boundary are Released; five provider/model/endpoint records and three capacity sources/grants exist, while traffic remains zero pending conformance and controlled activation. This document remains the production-grade plan, not a claim that every planned surface is live. Verified operational status is maintained in `IO_PORT_IMPLEMENTATION_STATUS.md`.

Companion evidence: `IO_PORT_SOURCE_BRIEF.md` and the workspace-level `IO_PORT_TECHNICAL_AND_PRICING_PLAN.md`. Implementation detail: `IO_PORT_CODE_LEVEL_ROADMAP.md`. OpenRouter comparison: `OPENROUTER_CAPABILITY_AND_CAPACITY_PLAN.md`. Shared conversation and shell work: `../conversation-system/CONVERSATION_SYSTEM_IMPLEMENTATION_PLAN.md`. Migration-history evidence: `../../SUPABASE_SCHEMA_RECONCILIATION.md`.

## 1. Target outcome

Ship I/O Port as one coherent Indus Orbit product with three connected surfaces:

1. **Public `/io-port`:** trustworthy explanation, live Observatory preview, transparent price structure, capability/data-policy language, Terminal preview, and design-partner/beta entry.
2. **Authenticated `/io`:** a Discord-like but Indus-branded control room for workspaces, projects, sessions, models/routes, keys, usage, policies, playbooks, and team activity; it is independent of Community onboarding.
3. **Developer surfaces:** `api.indusorbit.com/v1` and a local `io` terminal client, both governed by the same workspace identity, model registry, route policy, budget, receipt, and audit system.

The first production release must be useful with one or two contractually approved providers. Breadth is not an exit criterion. Correct isolation, spend control, reconciliation, model conformance, explicit fallback, and understandable evidence are exit criteria.

Commercial direction confirmed by the founder: I/O Port is partnership-first and may combine provider APIs, Indus Orbit-rented/owned servers, institutionally donated or sponsored capacity, opt-in community capacity, and customer BYOK endpoints. The router must preserve these source distinctions rather than hiding them behind one undifferentiated model name.

## 2. Scope and non-goals

### In scope

- migrate the existing app shell to a four-region, Discord-like information architecture;
- preserve all current routes and live data;
- add an evidence-backed public I/O Port page and evolve `/models` into the Observatory;
- add I/O workspaces, projects, membership, registry, policies, API keys, request receipts, usage ledger, and a narrow gateway;
- add local I/O Terminal sessions with Observe/Plan/Build/Run permissions, diffs, tasks, approvals, and web visibility;
- connect current profiles, missions, chapters, Academy, skills, S.O.D.A, notifications, audit, and people graph;
- implement INR-first transparent pricing experiments and measurement.

### Explicitly deferred

- “every model” coverage;
- unaudited automatic model substitution;
- pooled credits before provider/reseller, GST, refunds, chargebacks, and reconciliation are proven;
- hosted arbitrary-code runners in the first beta;
- production deployments or merges performed automatically by an agent;
- public session sharing by default;
- Discord-compatible protocol or a literal Discord UI clone;
- using Supabase Edge Functions for long-running agent processes.

## 3. Information architecture and routes

### 3.1 Public routes

| Route                  | Purpose                                                             | Change                                                    |
| ---------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| `/io-port`             | product page and entry to Observatory, API, and Terminal            | new                                                       |
| `/models`              | evidence-backed Model Observatory                                   | retain URL; replace hard-coded source with registry reads |
| `/io-port/methodology` | benchmark, price, FX, availability, and conflict policy             | new before public benchmark claims                        |
| `/io-port/status`      | gateway and provider status, separated                              | phase after gateway beta                                  |
| `/io-port/pricing`     | transparent pass-through, service, runner, tax, and plan components | publish after commercial G0                               |
| `/io-port/docs`        | API and CLI documentation                                           | publish with first external API beta                      |

Add **I/O Port** to `SiteNav` between Models and Writing. Keep **Models** as the evidence/Observatory destination until usability evidence supports nesting it under I/O Port.

### 3.2 Authenticated routes

Use `/io` as a top-level product area with shared identity and its own shell:

```text
/io                         overview, recent sessions, budget, recommendations
/io/workspaces              workspace switcher and membership
/io/projects                projects and environments
/io/sessions                session/task history
/io/sessions/$sessionId     terminal timeline, plan, diff, approvals, evidence
/io/models                  models, endpoints, routes, capability/data filters
/io/playbooks               skills, commands, routes, evaluations, community recipes
/io/keys                    I/O keys and later BYOK connections
/io/usage                   requests, receipts, cost, wallet/credits, exports
/io/policies                models, data, fallback, tool, egress, retention, budget
/io/team                    members, roles, invites, service identities
/io/settings                workspace and project settings
```

Do not create a second `/auth`, profile system, directory, or notification system.

### 3.3 API namespaces

```text
api.indusorbit.com/v1/*                 OpenAI-compatible inference
indusorbit.com/api/io/control/v1/*      authenticated web/CLI control plane
indusorbit.com/api/io/events/v1/*       session attach/event negotiation
```

If one host is operationally simpler in beta, keep the namespaces even when they resolve to the same deployment. This preserves a clean split later.

## 4. Discord-like app system, Indus Orbit visual language

“Discord-like” means persistent spatial organization, fast switching, contextual navigation, live state, and clear membership—not Discord colours, server terminology, visual copying, or engagement mechanics.

### 4.1 Desktop frame

```text
┌──────────┬────────────────────┬──────────────────────────────────┬──────────────────────┐
│ Orbit    │ Context            │ Main workspace                   │ Activity / inspector │
│ rail     │ sidebar            │                                  │ optional/collapsible │
│ 68 px    │ 232–264 px         │ flexible                         │ 300–360 px           │
│          │                    │                                  │                      │
│ Home     │ section title      │ page/session header              │ people / approvals   │
│ Network  │ channels/views     │ primary content                  │ cost / route / files │
│ Missions │ recents/search     │ composer or work controls        │ activity/evidence    │
│ Learn    │ project/session    │                                  │                      │
│ I/O      │ navigation        │                                  │                      │
└──────────┴────────────────────┴──────────────────────────────────┴──────────────────────┘
```

### 4.2 Global rail

- Preserve the current 68 px collapsed geometry as the starting point.
- Group the existing product into five spaces rather than listing every route in one flat sidebar:
  - **Home:** Home, Board, Stories, Events.
  - **People:** Network, Messages, Vouch, Mentorship, Profile.
  - **Action:** India Missions, Chapters, lead workspaces.
  - **Learn:** Academy, Skills, S.O.D.A.
  - **I/O:** Port overview, Terminal, Models, Playbooks, Usage.
- Use existing Indus Orbit logo/art direction and line icons. Active markers remain saffron.
- Keep Admin as a permission-gated rail destination, not mixed with daily user navigation.
- Bottom account cluster keeps avatar, connection state, preferences, help, and sign-out.

### 4.3 Context sidebar

- The selected rail space owns its navigation list, recent objects, search, create action, and unread/attention counters.
- Mission context lists Overview, Members, Updates, Events, Stories, Projects.
- Learning context lists Academy, Skills, S.O.D.A, Progress.
- I/O context lists Overview, Sessions, Projects, Models, Playbooks, Usage, Policies, Keys, Team.
- Use human nouns. Avoid importing Discord terms such as “server,” “guild,” or “channel” when they are not the actual domain object.

### 4.4 Main workspace and inspector

- Main content remains the current TanStack route outlet.
- Pages opt into an inspector contract with tabs such as Details, People, Activity, Evidence, Files, Cost, and Route.
- I/O Terminal defaults the inspector to approval, route receipt, cost, changed files, and task tree.
- Messages defaults the inspector to contact/profile/context; Missions to people/progress; Learning to progress/resources.
- The inspector is collapsible and remembered per user/device.

### 4.5 Responsive behaviour

- Under 768 px: show one primary pane; rail becomes a bottom/side space switcher; context and inspector are drawers.
- Tablet: persistent rail, overlay context sidebar, inspector drawer.
- Terminal mobile is review/approval-first. Do not pretend a phone is a full coding terminal; support session state, prompt/steer, approve/reject, diff, cost, and handoff.
- Respect existing compact, glass, reduced-motion, and quiet-notification preferences.
- Meet keyboard navigation, visible focus, reduced motion, screen reader status, and WCAG AA contrast requirements.

### 4.6 Brand rules

- Indigo night is the structural/terminal surface; parchment is the working/document surface; saffron marks focus, active state, warning, and deliberate action; monsoon marks healthy/success states.
- Fraunces is for page/product headings and meaningful empty states, not terminal text.
- Inter remains the UI font; add a legible monospaced system stack for code, cost receipts, IDs, and terminal output.
- Use subtle orbital motion only for loading/transition affordances and disable it under reduced motion.
- Avoid neon gaming aesthetics, Discord blurple, copied icon arrangements, novelty sound, reaction-count loops, and infinite engagement feeds.

### 4.7 Preserve the existing conversation product

Conversation is already implemented through accepted connections, `direct_messages`, `/app/messages`, the global `ChatDropdown`, unread counts, and `notifications`. The shell migration must improve and reuse this product, not replace it with a new I/O chat table or a Discord clone.

- **People → Messages** opens the existing conversation list and full message route.
- The top-level quick-chat sheet remains available as a fast overlay; it should share one conversation query/cache layer with the full page so read state and messages cannot diverge.
- The contextual inspector can show the selected member’s public profile, shared missions/chapters, and consented actions without exposing unrelated profile data.
- I/O session invitations and handoffs create links/notifications into an authorized I/O session. Human discussion remains in `direct_messages`; agent prompts, tool events, approvals, and terminal output remain in I/O session tables.
- Preserve the existing rule that direct messages are between accepted connections unless the product deliberately adds a separate, abuse-reviewed invitation flow.
- Replace 15/30-second unread polling with an event-driven/cache-revalidation design when the Realtime work lands. Migrate new realtime delivery to private Broadcast after policy/load testing; keep Postgres as the durable message source.
- Add conversation regression coverage for sender/recipient RLS, mark-read, connection eligibility, duplicate delivery, reconnect, mobile layout, unread synchronization, blocking/suspension, and notification preferences.

### 4.8 Scientific brand-fidelity method

“True to the Indus Orbit brand” is a testable design constraint, not a subjective finishing pass.

**Brand hypotheses to preserve**

1. **People before throughput:** the primary objects are people, missions, learning, decisions, and outcomes; tokens and model names are supporting evidence.
2. **India without cliché:** use Indian context, INR, languages, missions, and locality where functionally relevant; avoid decorative nationalism, generic tricolour application, or cultural motifs without meaning.
3. **Warm rigor:** parchment/Fraunces communicate humanity and reflection; indigo/Inter/monospace communicate operational clarity; saffron marks deliberate attention and action.
4. **Agency over automation:** plans, permissions, costs, uncertainty, fallback, and human decisions remain visible.
5. **A living orbit:** navigation expresses connected spaces and movement between people, knowledge, action, and intelligence, while reduced-motion users receive the same hierarchy without animation.

**Token and accessibility controls**

- Keep canonical colours in OKLCH and define semantic tokens for structure, work surface, focus/action, success/health, warning, danger, information, and data series.
- Measure text/icon contrast for every interactive state to WCAG AA; do not assume the brand colour pair is accessible at every opacity.
- Reserve saturated saffron for selection, focus, budget/permission attention, and primary calls to action. Measure its surface coverage so it remains meaningful rather than becoming decoration.
- Define type scale, line length, density, terminal monospace, elevation, radius, and motion-duration tokens. Do not choose these independently per page.
- Validate compact and comfortable density modes with identical information hierarchy.

**Research and release measures**

- Test the shell with representatives from at least builder/student, founder/team, expert/mentor, mission/chapter lead, and admin roles.
- Measure time and error rate for finding Messages, returning to a Mission, opening an I/O session, locating a permission request, explaining a route receipt, and identifying final INR cost.
- Test whether users correctly distinguish human messages, agent conversation, tool execution, and system notification; a naming or visual failure here is a safety defect.
- Run an unbranded first-impression exercise, then a branded recognition exercise. Users should describe the product as calm, Indian-contextual, human, trustworthy, and capable—not as “Discord with different colours.”
- Record keyboard completion, screen-reader landmarks/status announcements, zoom/reflow, reduced-motion, and contrast results as release evidence.
- Maintain a small decision log linking each major shell pattern to a user problem, brand hypothesis, usability result, and accepted trade-off.

## 5. Public `/io-port` page specification

### 5.1 Page goal

Move a visitor from category recognition to trust and an appropriate action:

- builder: compare models or request beta/API access;
- founder/team: understand routing, budgets, and governance;
- researcher/public-interest user: inspect methodology and Indian evaluation plans;
- provider/partner: understand registry requirements;
- existing member: open I/O workspace or learn the prerequisite skill.

### 5.2 Page modules

1. **Hero:** “One accountable port to intelligence.” Explain one API, one workspace, India-relevant evidence, and people-centred controls. Primary CTA: Explore the Observatory. Secondary CTA: Join design partners/Open I/O workspace depending access state.
2. **Four-layer product:** Observatory, Port, Control Room, Terminal. Each block links to a real route or explicitly says beta/planned.
3. **Live evidence strip:** verified models/endpoints, last update time, price currency/effective date, health sample, and data-policy confidence. Hide counts that are not live.
4. **Workload chooser:** code, Indian language, support/RAG, documents, speech, tool use, high availability, sensitive data. Show eligible routes and unknowns, not a single magic score.
5. **Route receipt demo:** hard constraints → eligible endpoints → chosen endpoint → expected INR → actual usage → fallback result. Mark illustrative data clearly until connected.
6. **Terminal preview:** Observe → Plan → Build → Verify → Handoff, with permission and spend controls visible.
7. **People layer:** connect Academy skills, reviewed playbooks, expert authors, missions, and public-interest evaluation.
8. **Transparent pricing:** provider pass-through, I/O service fee/subscription, hosted runner fee when applicable, GST. Link methodology and full pricing.
9. **Trust section:** endpoint-level provider/data claims, no silent fallback, redacted logs, private sharing, independent status, issue/contact route.
10. **Roadmap truth:** Available, Private beta, Next, Research—never render planned capabilities as active.
11. **FAQ:** BYOK, data location, prompt retention, India-resident meaning, fallback, wallet, model selection, OpenCode attribution, support.
12. **Final CTA:** choose Observatory, API beta, Terminal beta, or provider partnership.

### 5.3 SEO and evidence requirements

- Canonical: `https://indusorbit.com/io-port`.
- Unique OG image and structured Product/SoftwareApplication markup only for capabilities that exist.
- Every changing model/price/policy statement includes an observed/effective date or links to a dated registry record.
- Methodology includes data sources, test tasks, sample count, variance, provider/version, conflict policy, and known limitations.
- Correct `/models` canonical from the Lovable domain to `https://indusorbit.com/models`.
- Add sitemap, robots rules for public pages, and `noindex` for authenticated/session routes.

## 6. Authenticated I/O control room

### 6.1 Overview

Show:

- personal/current workspace and project;
- first-run checklist: choose workload, set budget, create scoped key or connect local Terminal, run request, inspect receipt;
- current spend and cap in INR;
- recent sessions/requests and their state;
- model/route health relevant to the workspace policy;
- pending approvals and alerts;
- recommended Academy skill or reviewed playbook.

### 6.2 Models and routes

- filter on modality, tool calling, structured output, context, Indian languages, provider, region, retention, BYOK, price, latency, and evidence confidence;
- display model separately from provider endpoint;
- show source/effective date, health window, and unknown fields;
- compare a pinned endpoint with named routes such as Economy, Fast, Quality, India Language, Private, and High Availability;
- require explicit workspace approval for fallback classes.

### 6.3 Keys and policies

- issue I/O API keys once, display once, store only a secure hash plus prefix/fingerprint;
- scope keys by workspace, project, environment, model/route, endpoint policy, budget, and expiry;
- show last used, recent IP/agent metadata where lawful, revoke, and rotate;
- BYOK is a later connection object with server-side secret reference, never a column returned to browser clients;
- policy editor has readable presets plus an advanced form. Every published policy is versioned and immutable for past receipts.

### 6.4 Usage and receipts

- request list is metadata-first and payload-redacted by default;
- receipt shows input/output/cache/tool units, provider charge, I/O fee, FX record, runner charge, tax status, estimate/final difference, route/fallback reason, trace ID, and refund/adjustment links;
- export is asynchronous and audited;
- invoices derive from append-only ledger entries, not recalculated request aggregates.

## 7. System architecture

```text
Public site / Control room / I/O CLI / future IDE
                         |
             user auth + I/O API-key auth
                         |
          Control API / Gateway API / Event broker
              |              |             |
        Supabase control   Router +       private realtime
        plane + ledger     adapters       delivery
              |              |             |
       policies/registry  approved global and Indian endpoints
              |
       durable session/task/event metadata
              |
      local daemon first / isolated hosted runners later
```

### 7.1 Existing web application

- Keep the TanStack Start app for public and authenticated product UI.
- Make one production deployment path authoritative. The repository currently carries Cloudflare and Netlify configuration; record the decision in an ADR and remove or clearly mark the non-production path.
- Put I/O route-specific components under `src/features/io/` and app-shell primitives under `src/components/app-shell/` to avoid another flat component directory.
- Do not edit `src/routeTree.gen.ts` manually; let TanStack Router regenerate it.

### 7.2 Control API

- Implement user-scoped server functions/routes using the existing auth middleware or a corrected shared equivalent.
- Validate all external inputs with Zod at the boundary.
- Use the user JWT with RLS for normal reads/writes.
- Use an elevated Supabase client only in narrow backend modules with their own authorization, never as the default server data client.
- Use modern publishable and secret keys, supplied through deployment secrets rather than hard-coded source.

### 7.3 Inference gateway

- Run as a separately deployable service from the marketing/control UI.
- Responsibilities: API-key validation, rate/budget reservation, policy evaluation, capability validation, endpoint selection, provider normalization, streaming, bounded retry/fallback, usage capture, final ledger reconciliation, and route receipt.
- Time-box a spike comparing a hardened LiteLLM-based adapter with a small owned adapter layer. Score provider conformance, streaming/tool calls, error normalization, observability, policy hooks, ledger correctness, latency, upgrade cost, and license/dependency risk.
- Own the I/O-specific policy, route evidence, model registry, INR ledger, workspace identity, and product experience even if an OSS adapter handles provider wire formats.

### 7.4 Capacity plane and I/O Capacity Commons

Treat capacity as a governed supply system above provider adapters:

| Capacity class                     | Default service class                   | Default workload eligibility                                                     |
| ---------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| Contracted provider                | commercial, provider SLA/terms          | according to endpoint contract and data policy                                   |
| Indus Orbit rented/owned           | I/O-operated, measured SLO              | approved models and policies after operations/security qualification             |
| Institutional donation/sponsorship | grant-bound, scheduled or quota-limited | stated beneficiary/workload classes; sensitive use only if controls prove it     |
| Community donated                  | best-effort, revocable, trust-scoped    | public/non-sensitive batch, learning, evaluation, and open-model work by default |
| Customer BYOK/private              | customer/provider terms                 | only that customer/workspace and its policy                                      |

Capacity admission flow:

1. Verify operator identity and authority to contribute the server/account/capacity.
2. Record capacity provenance, ownership, physical/cloud region, hardware/runtime, model/license, term/expiry, beneficiary restrictions, and cost/donation agreement.
3. Enrol a node with a rotatable machine identity and signed heartbeats; never place raw provider or node credentials in client-visible tables.
4. Run conformance, isolation, data-handling, throughput, latency, failure, and accounting qualification.
5. Assign a trust/service tier and permitted workload/data classes. Unknown fields are restrictive, not permissive.
6. Publish only safe aggregate capacity and model availability; hide donor/operator/network details unless they consent.
7. Route a request only when workspace policy, capacity eligibility, grant/quota, health, model capability, and data classification all allow it.
8. Produce a receipt naming the capacity class and policy evidence; user can prohibit donated/community capacity.

Community/Buzz-like capacity is opt-in on both sides: the operator opts to serve, and the requesting workspace opts to use that trust tier. A consent panel must state that prompts/context may execute on hardware operated by another member or institution. Do not describe this as “data never leaves your machine.”

Fair allocation:

- reserve donated grants by explicit beneficiary class such as students, public-interest research, missions, or open-source work;
- use per-workspace/user quotas, weighted fair queuing, bounded jobs, and backpressure;
- do not let paid traffic silently consume a donation intended for public benefit;
- do not promise availability beyond the service class; fail over only to policy-compatible capacity;
- track useful compute delivered, energy/runtime estimates where available, failures, and grant balance without converting community donation into a speculative token or informal securities market.

Security requirements:

- run models in isolated containers/VMs with a pinned image/SBOM, resource limits, and deny-by-default egress;
- prefer direct encrypted request paths or an I/O gateway path that minimizes retained content; redact gateway logs regardless;
- use short-lived workload credentials, node attestation where feasible, signed job/usage receipts, model/image digests, and rapid quarantine/revocation;
- never send regulated, secret, personal, production-code, or zero-retention workloads to community capacity by default;
- independently monitor health and billing/usage claims; contributor self-report is evidence, not the sole source of truth.

### 7.5 Supabase

- Existing project remains the identity and control-plane database.
- Database stores tenancy, registry, versioned policies, key fingerprints, durable request/receipt metadata, usage ledger, terminal sessions/tasks, approvals, artifact metadata, playbook links, and audit events.
- Storage holds approved artifacts/evaluation datasets with workspace-scoped paths and RLS; never store repository archives or raw transcripts by default.
- Realtime private Broadcast topics deliver live session and approval events. Persist durable state before acknowledging consequential events.
- Edge Functions handle narrow webhook/notification/attach-token tasks when appropriate. They do not run terminal processes or long agent loops.

### 7.6 Runner and local daemon

- V1 local daemon binds to loopback on a random port and creates an outbound authenticated channel to I/O; it never binds an unauthenticated shell to the public network.
- The daemon owns local repository/filesystem execution, respects project boundaries, and redacts secrets before event upload.
- Web receives structured events and sends signed approval responses; it does not receive host credentials.
- Hosted execution is a later service using one isolated worktree/container/VM per task, explicit CPU/RAM/disk/duration/network policies, short-lived secrets, and forced teardown.

## 8. Existing database reuse map

“Use the existing database” means preserve one identity/community/content system and reference its records. It does not mean forcing high-volume terminal events, provider secrets, or financial ledgers into unrelated tables.

| Existing tables                                                                                                                                            | Reuse in I/O                                                               | Rule                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `profiles`, `user_roles`, `member_suspensions`, `verification_decisions`                                                                                   | identity display, app access, trust/support state                          | `auth.uid()` and database roles remain authoritative; no user-metadata authorization                               |
| `vouch_*`, `endorsements`                                                                                                                                  | optional trust/community signals, beta/referral programmes                 | never grant wallet, provider secret, or production-run permission solely from a vouch                              |
| `connection_requests`, `direct_messages`                                                                                                                   | human contact and session invitation conversation                          | keep terminal/session events separate; use links into I/O sessions                                                 |
| `notifications`                                                                                                                                            | approval, budget, invitation, route degradation, evaluation alerts         | add I/O notification categories and preference keys through a versioned migration                                  |
| `chapters`, `chapter_members`, `chapter_proposals`                                                                                                         | optional chapter-linked workspace and evaluation cohort                    | explicit `io_workspace_members` controls I/O access; chapter role can seed an invitation, not silently grant it    |
| `missions`, `mission_members`, `mission_updates`                                                                                                           | mission-linked projects and outcome updates                                | publish concise approved progress/evidence, not raw terminal logs                                                  |
| `events`, `event_rsvps`                                                                                                                                    | workshops, model evaluation events, office hours                           | link event outcomes to playbooks/evaluations                                                                       |
| `mentor_sessions`                                                                                                                                          | expert I/O reviews and support                                             | no automatic transcript/prompt disclosure to mentors                                                               |
| `courses`, `course_modules`, `lessons`, `lesson_attachments`, `resources`, `quizzes`, `quiz_questions`, `quiz_options`, `lesson_progress`, `quiz_attempts` | onboarding, safety, API, evaluation, agent-operation learning              | link completion to recommendations; use explicit policy if a course is ever a permission prerequisite              |
| `skills`, `soda_ideas`                                                                                                                                     | playbook sources, standard workloads, route evaluations, iteration history | add link tables instead of copying content blobs                                                                   |
| `stories`, `spotlights`                                                                                                                                    | reviewed public case studies and contributors                              | require consent, redaction, and editorial review                                                                   |
| `asks_offers`                                                                                                                                              | requests for experts, datasets, evaluation partners, provider support      | keep commercial/provider access workflows separate                                                                 |
| `reports`, `audit_log`                                                                                                                                     | moderation and high-level administrative actions                           | add `io_audit_events` for immutable I/O-specific security/financial operations; mirror only summaries when helpful |
| `contact_submissions`, `newsletter_subscriptions`                                                                                                          | design-partner leads and updates                                           | add bot/rate protection; do not mix with workspace membership                                                      |

## 9. Proposed I/O schema

Names are a planning contract and may be refined during migration review. All exposed tables have RLS at creation. Use UUID primary keys, `timestamptz`, explicit foreign keys, status check constraints/enums chosen carefully, and indexes covering every authorization/join path.

### 9.1 Tenancy

| Table                   | Essential fields and references                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `io_workspaces`         | `id`, `name`, `slug`, `kind`, `owner_user_id -> auth.users`, optional `chapter_id`, optional `mission_id`, `plan_code`, `status`, timestamps |
| `io_workspace_members`  | `workspace_id`, `user_id`, `role` (`owner/admin/developer/analyst/billing/viewer`), `status`, inviter, timestamps; unique workspace/user     |
| `io_projects`           | `id`, `workspace_id`, `name`, `slug`, repository metadata without credentials, default policy/version, status, timestamps                    |
| `io_environments`       | `id`, `project_id`, `name` (`development/staging/production/custom`), default budget/policy, status; unique project/name                     |
| `io_service_identities` | workspace/project identity for agents/services, allowed scopes, owner, status, expiry; no raw credential                                     |

Each user gets one personal workspace through an idempotent backfill/job, not an auth trigger that can break signup. Mission/chapter workspaces are created through an explicit admin/member flow.

### 9.2 Keys, providers, and registry

| Table                        | Essential fields and references                                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `io_api_keys`                | workspace/project/environment, owner, prefix, secret hash, scopes, policy version, spend/rate caps, expires/revoked/last-used timestamps                                            |
| `io_provider_connections`    | workspace, provider, secret-manager reference, allowed endpoints, status, rotated/verified timestamps; never expose secret reference through general selects                        |
| `io_providers`               | canonical provider, legal/display metadata, status, source/evidence fields                                                                                                          |
| `io_capacity_pools`          | provider/Indus/donor/community/BYOK class, operator, region, service/trust tier, donation/contract term, beneficiary and data/workload restrictions, status                         |
| `io_capacity_nodes`          | pool, machine identity/fingerprint, hardware/runtime/model digest, endpoint secret reference, qualification and last-heartbeat state; sensitive operator/network fields server-only |
| `io_capacity_grants`         | pool/donor/sponsor, beneficiary workspace/segment/mission or public programme, time/compute/INR-equivalent quota, purpose, start/expiry, revocation and reporting terms             |
| `io_capacity_health_samples` | node/pool, observed availability/latency/throughput/error/capacity, qualification source and timestamp; retention/aggregation policy                                                |
| `io_capacity_allocations`    | request/job, pool/node, grant if any, reserved/final compute units and outcome; forms the capacity side of the route receipt                                                        |
| `io_models`                  | canonical model family/name, provider-independent capability identity where valid, lifecycle/status                                                                                 |
| `io_model_versions`          | immutable provider model ID/version, dates, context/modalities/capabilities/license, evidence confidence                                                                            |
| `io_provider_endpoints`      | provider, model version, base endpoint alias, region, residency, retention/training flags with evidence, health state, effective dates                                              |
| `io_endpoint_prices`         | endpoint, modality/unit, input/output/cache/tool prices, currency, effective period, tax inclusion, source URL, reviewer                                                            |
| `io_fx_rates`                | base/quote, rate, source, observed/effective time; immutable once referenced by a ledger entry                                                                                      |
| `io_benchmark_runs`          | methodology version, workload, endpoint/model, sample count, metrics, variance, environment, reviewer, publish state                                                                |

Do not import the current hard-coded `MODELS` array wholesale. Create reviewed seed records only for contracted/tested endpoints and separately migrate trustworthy Observatory evidence.

### 9.3 Policies and routing

| Table                      | Essential fields and references                                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `io_route_policies`        | workspace/project owner, name, current version, status                                                                                                                             |
| `io_route_policy_versions` | immutable JSON policy plus normalized constraint columns, author, effective time, supersedes, review state                                                                         |
| `io_named_routes`          | economy/fast/quality/etc., task class, eligible endpoint strategy, evidence version, visibility, author                                                                            |
| `io_requests`              | trace/idempotency IDs, workspace/project/environment/key identity, status, requested model/route, policy version, timestamps, redaction/retention class; no prompt body by default |
| `io_route_receipts`        | request, eligible endpoint set or digest, selected endpoint, reason codes, estimate, fallback chain/results, health snapshot, immutable policy/registry versions                   |
| `io_provider_attempts`     | request, sequence, endpoint, provider request ID hash/reference, start/end, normalized error, retry/fallback reason, measured usage                                                |

Store user-supplied metadata in a bounded validated JSON object. Do not allow arbitrary high-cardinality or secret-bearing fields.

### 9.4 Money and usage

| Table               | Essential fields and references                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `io_usage_records`  | request/attempt, unit type, quantity, provider-reported/estimated/final state, source, recorded time                                                                 |
| `io_wallets`        | workspace, currency (INR first), status; balance is derived or transactionally cached with reconciliation                                                            |
| `io_ledger_entries` | append-only debit/credit/reservation/release/refund/adjustment, amount in paise, request/invoice/payment reference, FX ID, idempotency key, actor/reason, timestamps |
| `io_budgets`        | workspace/project/environment/key/service identity, period, hard/soft cap, alert levels, timezone, status                                                            |
| `io_invoices`       | workspace, period, immutable totals/status/tax metadata and artifact reference                                                                                       |
| `io_payment_events` | processor event ID, verified type/status, amount/currency, raw payload vault reference or digest, processing result                                                  |

Financial mutations occur through narrow transactional functions or a ledger service. Revoke direct client INSERT/UPDATE/DELETE on ledger tables. Adjustments are new entries; never overwrite posted amounts.

### 9.5 Terminal and agents

| Table                    | Essential fields and references                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `io_agent_profiles`      | workspace/global owner, name, mode, prompt/version reference, model/route policy, step/time/spend defaults, permission profile, evaluation score, status              |
| `io_playbooks`           | owner/author, command/template version, linked `skill`, `soda_idea`, course/lesson or mission, evidence, visibility, review state                                     |
| `io_terminal_sessions`   | workspace/project/environment, creator, title, execution location (`local/hosted`), mode, agent, policy version, state, retention, timestamps, parent/fork reference  |
| `io_session_members`     | session/user, role (`owner/collaborator/reviewer/viewer`), invited/accepted/expiry/revoked                                                                            |
| `io_tasks`               | session, parent task, agent, status, model/route constraints, permission/budget snapshot, output summary, timestamps                                                  |
| `io_session_events`      | session/task, monotonic sequence, event type, redacted structured payload, visibility, actor/tool identity, digest, timestamps; partition/retention plan before scale |
| `io_permission_requests` | session/task, permission kind/patterns, reason/risk, requested by, state, decided by/time, `once/session/policy` scope                                                |
| `io_tool_invocations`    | session/task, tool, input digest/redacted preview, permission request, start/end/status, output/artifact reference, cost/runner usage                                 |
| `io_artifacts`           | session/task, kind (`plan/diff/test/report/file/summary`), storage path/digest, size, sensitivity, retention, creator                                                 |
| `io_attach_grants`       | hashed one-time/short-lived grant, session, audience/user/device, capability, expiry, used/revoked time                                                               |
| `io_audit_events`        | append-only security/policy/key/share/financial/runner action, workspace, actor, target, result, IP/device metadata under retention rules                             |

High-volume terminal content should eventually use partitioning and archive/retention jobs. The database stores authoritative event metadata; bulky outputs belong in encrypted object storage only when policy permits.

## 10. RLS and authorization policy

### 10.1 Rules

1. Every I/O table in an exposed schema enables RLS in the same migration that creates it.
2. Policies use explicit `TO authenticated`; anonymous access is limited to deliberately public registry views and protected signup/contact flows.
3. Membership checks use `(select auth.uid())` and indexed `io_workspace_members(workspace_id, user_id, status)` paths.
4. UPDATE policies include SELECT visibility, `USING`, and `WITH CHECK`.
5. User-managed roles cannot grant a role equal to or higher than their own. Owner transfer is a dedicated audited transaction.
6. Service identities authenticate through I/O gateway keys, not Supabase browser sessions.
7. Past policy versions, receipts, ledger entries, and audit events are immutable to normal workspace users.
8. Public registry views use `security_invoker = true` and expose only reviewed fields.

### 10.2 Helper functions

- Put membership/role helpers in an unexposed `private` schema.
- Use `SECURITY INVOKER` unless definer rights are required to prevent RLS recursion.
- For `SECURITY DEFINER`: fixed search path, explicit caller/argument checks, `REVOKE EXECUTE FROM PUBLIC`, and grants only to required roles.
- Trigger-only functions receive no anon/authenticated execute grant.
- Test every policy as owner, admin, developer, analyst, billing, viewer, non-member, suspended user, anonymous user, and elevated backend.

### 10.3 Realtime authorization

- Topic format: `io:workspace:<workspace-id>:session:<session-id>`; never trust topic IDs alone.
- Private channel join/publish policies validate session membership and permitted action through indexed records.
- Broadcast only redacted events. Artifact contents and secrets are fetched separately through signed, authorized endpoints.
- Use presence only for ephemeral collaborator state; do not infer authorization from presence.

## 11. Gateway contract and routing

### 11.1 OpenAI-compatible V1

- `GET /v1/models`
- `POST /v1/chat/completions` with SSE streaming
- optional `POST /v1/embeddings` after accounting and conformance are complete

Return explicit errors for unsupported modality, tools, structured output, context size, route policy, budget, residency, retention, or provider availability. Do not silently drop request features.

Required/accepted metadata:

- workspace/project/environment are derived from the I/O key where possible;
- `route_policy`, `data_policy`, `cost_center`, `end_user`, and idempotency key;
- task class and quality/latency/cost preferences as bounded enums/values;
- retention/debug opt-in, never an implicit raw-log default.

### 11.2 Request transaction

```text
authenticate key
→ load immutable key/workspace/project/environment/policy snapshot
→ reject revoked/suspended/expired/over-rate identity
→ validate request capability and size
→ reserve hard budget using an idempotent ledger transaction
→ apply hard constraints to endpoint registry
→ score remaining endpoints
→ write request and preliminary route receipt
→ call selected provider and stream normalized events
→ retry/fallback only inside allowed classes
→ record provider attempts and final usage
→ reconcile reservation to final debit/release
→ finalize route receipt and broadcast redacted completion
```

### 11.3 Routing function

Hard filters always run before scoring:

```text
eligible = endpoints
  ∩ allowed providers/models/modalities
  ∩ allowed capacity classes, trust tiers, grants and service levels
  ∩ required region/residency/retention policy
  ∩ required tool/JSON/context capability
  ∩ endpoint health and commercial availability
  ∩ remaining budget/rate constraints
```

Then calculate a versioned, explainable score:

```text
score(e, task) = wq × normalized_expected_quality(e, task)
               - wc × normalized_expected_cost(e, request)
               - wl × normalized_latency(e)
               + wa × normalized_availability(e)
               + wp × user_preference(e)
               - wu × evidence_uncertainty(e)
```

- Every input, weight version, eligible set/digest, selection, and fallback is represented in the route receipt.
- Pinned models bypass optimization but not hard policy/capability/budget filters.
- If evidence is insufficient, say so and default to pinning or a reviewed static route.
- Fallback across provider, model family, region, retention, or quality class requires explicit policy permission.

## 12. I/O Terminal implementation

### 12.1 Reuse strategy

During a two-week technical spike, evaluate three choices:

1. maintained fork of relevant OpenCode CLI/server/app packages;
2. I/O-branded client using OpenCode protocol/SDK/server modules;
3. small I/O CLI that controls an OpenCode local server behind a stricter broker.

Score time-to-beta, protocol stability, UI separation, permission correctness, local performance, license/SBOM, update burden, Windows/WSL support, session migration, and ability to force I/O routing/receipts. Do not choose based only on how quickly the demo renders.

### 12.2 Local beta contract

- `io login` uses a browser/device flow and stores a revocable I/O credential in the OS credential store.
- `io` in a project starts/adopts a local loopback daemon and opens a session.
- Session selects workspace, project, mode, agent, model/route, data policy, and hard INR cap.
- Observe and Plan cannot mutate; Build and Run use allow/ask/deny patterns.
- File edits produce a diff; tool/command calls produce structured cards; user can approve once, approve for session/pattern, reject with feedback, abort, revert, and hand off.
- The web control room sees redacted structured state and can approve within the user/session authority.
- Local-only is a visible execution-location label. I/O does not claim code residency if prompts/context go to a non-India provider.

### 12.3 Permission classes

- filesystem read/search;
- filesystem edit/write/patch;
- shell commands with parsed patterns;
- package install and network egress;
- external directory access;
- Git commit/push/PR/merge;
- provider/MCP/tool OAuth;
- secret read/injection;
- hosted runner or production environment;
- subagent spawn and budget;
- session share/handoff;
- destructive action and spend-cap change.

No agent can grant itself a permission, increase its budget, change to a more powerful mode, or broaden its workspace.

### 12.4 Terminal session UI

Main pane:

- session timeline with user, agent, tool, permission, checkpoint, diff, test, error, and summary rows;
- composer with mode, agent, model/route, project, budget, and context indicators;
- live status: working/waiting approval/queued/complete/failed/aborted;
- command palette and versioned I/O commands.

Context sidebar:

- workspace/project switcher;
- recent/pinned/archived sessions;
- task tree and child agents;
- playbooks and commands.

Inspector:

- approval queue;
- changed files/diff;
- route receipt and provider attempts;
- cost reservation/final spend;
- tool permissions and secrets used by name only;
- artifacts, tests, and audit evidence.

## 13. Pricing and unit-economics implementation

### 13.1 Display model

Every estimate and receipt separates:

```text
provider inference charge
+ I/O routing/control fee
+ hosted runner/storage/egress when used
+ applicable GST/tax
- credits/refunds
= total
```

Store all monetary values as integer minor units. Keep original provider currency/amount, immutable FX rate/source/time, INR conversion, fee rule/version, and tax status.

### 13.2 Launch hypotheses

| Segment            |                              Platform hypothesis, ex GST |                                            Variable hypothesis | Key limits/value to validate                                |
| ------------------ | -------------------------------------------------------: | -------------------------------------------------------------: | ----------------------------------------------------------- |
| Explorer/student   |                                                       ₹0 | provider + 10%, or a clearly identified eligible donated grant | one personal workspace/key, hard caps, Observatory/learning |
| Builder/solo       |                                               ₹499/month |                                                  provider + 8% | local Terminal, routes, receipts, budgets                   |
| Startup            |                                   ₹2,499/workspace/month |         provider + 6%, lower only with proven volume economics | team/projects/environments/BYOK/webhooks/support            |
| Agency/studio      |                                   ₹7,499/workspace/month |                                                  provider + 5% | client cost centres, exports, caps, optimization review     |
| Research/nonprofit |                                     ₹0–999 case-reviewed |                     provider + 0–3% or contracted pass-through | capped public-interest programme and evaluation obligations |
| Enterprise         | ₹6–20 lakh/year discovery range plus committed inference |                                                contract margin | SSO/audit/SLA/private networking/support after proof        |

These are experiment hypotheses, not approved public prices.

### 13.3 Scientific validation

For each segment and provider, measure:

- provider bill versus I/O usage reconstruction;
- gateway/stream/queue/storage/observability/payment/FX/fraud/refund variable cost;
- support minutes and incident burden;
- retries/fallback calls that incur cost;
- gross contribution after credits/refunds;
- activation, repeat successful outcomes, retention, willingness to pay, and route override;
- p95/p99 traffic and reconciliation variance.

Pre-register price tests and guardrails. Do not change price and product limits simultaneously in a way that destroys interpretation. Preserve published customer terms for a stated period.

## 14. Migration, security, and deployment sequence

### Phase 0A — reconcile live Supabase state (week 1)

1. Freeze assumptions: live project is source of truth; take a verified backup/export appropriate to the plan.
2. Inspect Supabase CLI help/version before commands.
3. Reconcile the 36 live migrations with 16 local files; recover a reviewable baseline without rewriting applied production history.
4. Generate fresh TypeScript types and diff against `src/integrations/supabase/types.ts`.
5. Create or request approval for a paid development branch only after showing its cost; otherwise use isolated local Supabase for migration tests.
6. Run the complete migration chain into an empty test database and compare schema objects/policies/functions with live.

Exit: a version-controlled, reproducible schema baseline and rollback plan.

### Phase 0B — security baseline (weeks 1–2)

1. Review all 27 live `SECURITY DEFINER` functions and remove broad execute grants, starting with 13 anon-executable functions.
2. Move/lock trigger helpers, validate admin/lead RPC authorization, and fix unsafe search paths.
3. Add missing FK indexes after query/policy review.
4. rewrite hot RLS predicates to init-plan-friendly patterns and consolidate policies where semantics remain identical;
5. add bot/rate protection to contact/newsletter inserts;
6. enable leaked-password protection after auth UX/testing review;
7. move browser client to environment-supplied modern publishable key; replace server-wide legacy service role with scoped secret-key clients where supported;
8. confirm live vouch-code policies remain protected and add regression tests so the old local leak cannot return.

Exit: no unresolved high-risk advisor finding; remaining warnings documented with owner and rationale.

### Phase 1 — app shell and public truth (weeks 2–5, parallel after baseline)

- introduce global rail/context sidebar/main/inspector primitives behind a feature flag;
- map all existing routes into spaces and verify permissions/mobile behaviour;
- add `/io-port` with honest Available/Beta/Next states;
- correct `/models` metadata and extract its data behind a repository/service boundary;
- add registry read model and seed only verified evidence;
- publish methodology draft and design-partner intake.

Exit: all current routes/data remain accessible, navigation tests pass, and no unverified live capability claim is published.

### Phase 2 — I/O tenancy and control plane (weeks 4–8)

- tenancy, membership, project/environment, policy/version, API-key, budget, audit, registry, and public views;
- user-scoped control API and RLS test suite;
- personal workspace backfill with reconciliation report;
- control-room Overview, Models, Policies, Keys, Team skeletons;
- modern client/server key configuration and deployment secrets.

Exit: cross-tenant tests prove isolation; key secrets are display-once/hashed; policy versions are immutable.

### Phase 3 — gateway and ledger private beta (weeks 7–13)

- provider adapter spike and decision ADR;
- one pooled or BYOK provider, then a second endpoint for failover/conformance testing;
- chat completions with streaming, explicit pinning, named static routes, idempotency, rate limits, budget reservation, receipts, usage/finalization;
- Usage UI, exports, operations dashboard, provider/gateway status separation;
- shadow reconciliation against provider invoice/usage data.

Exit: zero cross-workspace leak; hard caps stop before provider call; reconciliation within the agreed threshold; fallback tests and incident runbook pass.

### Phase 4 — I/O Terminal local beta (weeks 10–16)

- complete OpenCode reuse decision, SBOM/license notice, maintained patch strategy;
- local login/daemon/session; Observe/Plan/Build; permissions; diffs; commands; abort/revert;
- session/task/event/approval/artifact records and private Broadcast;
- web session timeline and inspector; route/cost receipt; private handoff;
- no hosted runner, privileged MCP, auto-commit, or public share.

Exit: Plan cannot mutate, every mutation has approval/audit/diff, web handoff cannot expose a local shell, and spend caps apply to parent/child tasks.

### Phase 5 — team and evidence beta (weeks 15–21)

- role templates, session collaboration, service identities, GitHub App draft-PR flow;
- versioned playbooks tied to skills/S.O.D.A/Academy;
- evaluation datasets/runs, route comparison, regression alerts;
- BYOK envelope/secret-manager design and rotation if not already used;
- founder-approved pricing cohort tests.

Exit: three to five design partners show repeat successful outcomes and positive post-support contribution without hidden subsidy.

### Phase 6 — production and hosted execution (after gates)

- independent penetration/security review;
- on-call, support, backup/restore, incident/DR exercises, retention/deletion jobs;
- audited hosted runner isolation, egress, secrets, quotas, and abuse controls;
- SSO/SCIM, audit exports, private networking, and SLA only when financed and operated.

## 15. Repository implementation backlog

### 15.1 App shell

- Refactor `src/components/app/AppShell.tsx` to compose a rail, context sidebar, main outlet, and inspector provider.
- Replace the flat `ITEMS` array in `src/components/app/AppSidebar.tsx` with a typed navigation/space registry while keeping legacy route links.
- Add `src/components/app-shell/OrbitRail.tsx`.
- Add `src/components/app-shell/ContextSidebar.tsx`.
- Add `src/components/app-shell/WorkspaceInspector.tsx`.
- Add `src/components/app-shell/AppShellContext.tsx` for route-owned title/actions/inspector state.
- Extend the existing settings storage/version for rail/context/inspector preferences; include safe migration from old `sidebarExpanded`.

### 15.2 Public I/O and Observatory

- Add `src/routes/io-port.tsx` using `SiteShell`.
- Update `src/components/site/SiteNav.tsx` with I/O Port.
- Refactor `src/routes/models.tsx` into page + registry query/components; remove hard-coded FX and unreviewed production claims.
- Add `src/features/io/public/` components and evidence-state badges.
- Add methodology/status/pricing routes only when their data/owners exist.

### 15.3 Authenticated I/O

- Add `src/routes/app.io.tsx` nested layout and the route files listed in section 3.2.
- Add `src/features/io/control/`, `registry/`, `terminal/`, `usage/`, `policies/`, and `playbooks/` modules.
- Add `TerminalTimeline`, `PermissionDock`, `TaskTree`, `DiffPanel`, `RouteReceipt`, `CostMeter`, and `SessionComposer` components.
- Use TanStack Query keys rooted in workspace/project/session IDs and clear them on workspace switch/sign-out.

### 15.4 Supabase and server boundary

- Reconcile `supabase/migrations/` before adding I/O migrations.
- Regenerate `src/integrations/supabase/types.ts` after every accepted migration.
- Replace hard-coded client configuration in `src/integrations/supabase/client.ts` with deployment environment configuration and modern publishable key.
- Make the user-scoped server client the default for I/O server work; keep elevated access in narrow modules.
- Do not follow the current browser-style `src/server/messages.functions.ts` pattern for I/O keys, policies, money, or secrets.
- Add database/policy integration tests and live advisor checks to CI.

### 15.5 Gateway and terminal packages

Prefer a monorepo boundary once the spike validates it:

```text
apps/web                    existing TanStack app
services/io-gateway         compatible API, router, adapters, ledger integration
services/io-events          attach/event broker if separated
packages/io-protocol        schemas/events/errors
packages/io-sdk             TypeScript client
packages/io-cli             local terminal/daemon or OpenCode-derived distribution
packages/io-policy          shared policy vocabulary and receipt schemas
```

Do not restructure the existing app into a monorepo before the gateway/OpenCode spikes prove the package boundaries.

## 16. Test strategy and release gates

### 16.1 Required automated suites

- RLS matrix for every I/O table and role, including non-member and cross-workspace IDs;
- SECURITY DEFINER execute-grant/search-path/caller authorization regression tests;
- migration-from-empty and migration-from-live-baseline tests;
- key issue/hash/revoke/expire/scope/rate/budget tests;
- ledger idempotency, reservation/finalization/refund/adjustment and concurrent-spend tests;
- provider conformance for streaming, tool calls, usage, context, errors, cancellation, timeout, retry, and fallback;
- routing golden tests that prove hard constraints always beat score;
- terminal mode/permission, path boundary, secret redaction, diff/revert, abort, and child-budget tests;
- Realtime private-topic authorization and event-order/reconnect tests;
- app-shell route access, keyboard, mobile, reduced-motion, and accessibility tests;
- public claim/source/effective-date validation for registry-backed content.

### 16.2 Operational tests

- provider timeout/partial stream/incorrect usage/rate limit/outage;
- gateway crash during reservation or stream and exactly-once reconciliation recovery;
- Realtime disconnect and replay from durable event sequence;
- compromised/revoked I/O key and provider secret rotation;
- budget race under concurrent requests;
- payment webhook replay and mismatch;
- donated node disappearance, dishonest capacity report, expired grant, incompatible model digest, contributor revocation, and policy-safe reroute;
- local daemon disconnect, stale attach grant, and browser approval after session expiry;
- backup restore and deletion/retention execution.

### 16.3 Hard acceptance criteria

1. Existing user, chapter, mission, education, skill, message, and notification data is preserved and addressable after the shell migration; retired Loop rows remain available only through the controlled archive.
2. No normal user can read another workspace’s keys, policies, request metadata, ledger, terminal events, artifacts, or audit records.
3. No browser or CLI bundle contains a Supabase secret/service-role key or provider credential.
4. Every inference attempt has an authenticated identity, policy version, route receipt, budget decision, provider attempt record, and final usage state.
5. Every posted financial amount is append-only, idempotent, and traceable to source currency/FX/fee rule.
6. Plan mode cannot edit or execute; Build/Run cannot broaden permissions or spend without authorization.
7. Terminal handoff cannot expose a network-listening local shell and uses short-lived audience-bound grants.
8. Public model, price, residency, retention, availability, and benchmark claims carry evidence and date or display Unknown.
9. Gateway and provider availability are reported separately.
10. MIT notices and third-party dependency/license obligations are included in every OpenCode-derived distribution.

## 17. First two-week implementation sprint

This sprint intentionally creates a safe base and visible product skeleton; it does not route paid inference.

### Days 1–3: baseline and decisions

- reconcile live/local Supabase migration inventory and generate types;
- snapshot Security/Performance Advisor findings into an internal remediation register;
- decide authoritative web deployment and record ADR;
- start OpenCode package/SBOM/reuse spike;
- confirm merchant-of-record/BYOK launch assumption for schema sequencing.

### Days 4–7: shell and public skeleton

- implement navigation-space registry and shell primitives behind `appShellV2` feature flag;
- render all existing routes through the new rail/context layout without changing their data calls;
- create branded `/io-port` page skeleton using real Available/Beta/Next labels;
- fix `/models` canonical and isolate the static data behind an adapter pending registry migration.

### Days 8–10: schema and security proposal

- write reviewed migrations for I/O tenancy, membership, projects, registry minimum, policy versions, API-key metadata, and audit tables on the development database only;
- write the RLS matrix/tests before applying the migration to live;
- prepare the existing SECURITY DEFINER grant hardening migration and regression tests;
- design modern client/server key environment changes.

### Deliverable review

- product walkthrough of public `/io-port` and app shell V2;
- schema/RLS review with advisor output;
- OpenCode reuse decision with cost/maintenance/security implications;
- provider/commercial decision log;
- revised estimate for gateway and Terminal beta based on spike evidence.

## 18. Confirmed capacity direction and later founder inputs

Confirmed: partnership-first mixed supply—provider partnerships plus Indus Orbit-rented/owned, donated/sponsored, community opt-in, and BYOK capacity.

The implementation can proceed locally with this model. Input will be requested when it becomes materially required for:

1. names and commercial contacts for the first one or two provider partners;
2. whether Indus Orbit or the provider is merchant of record for each endpoint;
3. specifications, region, operator, term, electricity/hosting responsibility, and permitted use for each rented or donated server;
4. donor/sponsor beneficiary restrictions, reporting, expiry, branding, and tax/accounting treatment;
5. which workloads may use community capacity and whether contributor identity is visible to users;
6. payment processor, GST/invoice owner, credit/refund policy, and budget for pooled provider usage;
7. production deployment, secrets, domain/DNS, and live Supabase migration approval.
