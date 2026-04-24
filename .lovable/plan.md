

## Indus Orbit — System Analysis & Feature Roadmap

A deep look at the current authenticated system, then a concrete set of features mapped to **roles**, the three Indus Orbit pillars (**Connection · Synergy · Society**), and **admin control surfaces**. This is an analysis & proposal — no code yet. Pick what to build and I'll plan/ship it next.

---

### 1. What exists today (honest baseline)

**Identity model**
- `auth.users` (Supabase) ↔ `profiles` (1:1 via `user_id`). Trigger `handle_new_user` auto-creates an empty profile + assigns `member` role.
- Two orthogonal axes:
  - `orbit_segment` enum on `profiles` — *who you are* (youth, founder, expert, investor, diaspora, partner, researcher).
  - `app_role` enum on `user_roles` — *what you can do* (admin, member). Checked via `has_role()` SECURITY DEFINER.
- Verification: `is_verified` + `verified_at` + `verified_by`, gated by the `guard_profile_verification` trigger so only admins can flip it.
- Visibility: `is_public` toggles directory listing.

**Routes (post-auth)**
- `/onboarding` — 4-step wizard (segment → location → segment-specific Q's → story). Required before `/app/*`.
- `/app` — segment-aware home (greeting, completeness ring, 2 module cards from `SegmentHomeModules`).
- `/app/directory` — public profile grid, filterable by segment.
- `/app/profile` — edit own profile.
- `/app/admin/members` — admin verify / segment / public toggle.
- `/app/admin/roles` — promote/demote admins.

**What's missing (the honest gaps)**
1. **No actual connections.** The product *names* segments but doesn't let them act on each other. A founder finds an investor card → there's no "intro," "request," or even "save."
2. **No content/signal from members.** No asks, offers, updates, or check-ins. The orbit is a static directory, not a living network.
3. **No structured value exchange.** Experts say "I can give X hours/month" in onboarding, but nothing surfaces that, books it, or tracks it.
4. **Admin tools are CRUD-only.** No queue, no triage, no reasons for verification, no audit trail, no analytics, no moderation.
5. **One role tier.** `admin` vs `member` — no chapter leads, moderators, or curators, even though the segment model is built for community scaling.
6. **Segment data is a black box.** `segment_details` JSONB is collected, never re-surfaced anywhere (matching, search, recommendations).

---

### 2. The mental model going forward

Every feature is sorted by **two questions**:
- **Pillar** — does this serve **Connection** (introductions, intros, mentorship), **Synergy** (collaboration, ventures, capital), or **Society** (visibility of Indian craft, diaspora bridges, public good)?
- **Admin control** — does it work *without* admin oversight (member-driven, RLS-only), *with* admin oversight (queue/approve), or *admin-only* (governance, analytics)?

This keeps the platform from becoming yet another LinkedIn clone — every feature has an Indus Orbit reason to exist.

---

### 3. Proposed features (grouped by pillar, with admin posture)

#### Pillar I — **Connection**

| # | Feature | What it does | Roles involved | Admin posture |
|---|---|---|---|---|
| C1 | **Connection requests** | Member → Member "Reach out" with a 280-char note + reason chip (intro, advice, collab, capital). Sender sees status; recipient accepts/declines. | Everyone | **Without admin** (RLS-only). Admin can read for moderation, can revoke a member's send privilege. |
| C2 | **Warm intros** | Verified member can introduce two others ("I think you should meet"). Both parties opt-in before contact info is shared. | Verified members; admins always | **Without admin**. Admin can audit. |
| C3 | **Endorsements** | Lightweight "X vouches for Y as a Founder / Expert / etc." Public on profile, capped (e.g. 5 endorsements visible). | Verified → anyone | **Without admin**. Reportable. |
| C4 | **Ask & Offer board** | Short posts: "Looking for a CTO in Bengaluru" / "Offering 5h/mo to early fintech founders." Expires in 30 days. Filter by segment + sector + region. | Everyone posts; everyone responds | **With admin** light-touch — flagged posts go to a moderation queue. |

#### Pillar II — **Synergy**

| # | Feature | What it does | Roles involved | Admin posture |
|---|---|---|---|---|
| S1 | **Mentor slots** | Experts publish recurring slots ("2 × 30-min/week"). Founders/Youth book. Auto-tracks hours pledged vs. delivered. | Expert ↔ Founder/Youth | **Without admin**. Disputes go to admin. |
| S2 | **Investor signals** | Founders mark "raising / not raising," sector, stage, geography. Investors get a filtered feed; can express interest privately. | Founder ↔ Investor | **Without admin**. Admin sees aggregate stats only. |
| S3 | **India Missions** | Time-bounded campaigns where Diaspora members commit (capital, mentorship, hiring) toward a cohort of founders. | Diaspora + Founder + Admin curators | **Admin-curated** — admins create missions, set theme, open/close. |
| S4 | **Research–Practice bridge** | Researchers post open problems; founders/experts can claim or comment. | Researcher + everyone | **Without admin**. Admin can feature one per week. |

#### Pillar III — **Society**

| # | Feature | What it does | Roles involved | Admin posture |
|---|---|---|---|---|
| Y1 | **Member spotlights** | Weekly editorial pick — verified profile featured on public `/members` and inside `/app`. | Admin selects | **Admin-only** (curatorial). |
| Y2 | **Chapters (regional)** | Region rollups (e.g. "Indus Orbit · Paris," "· Bengaluru"). Members in that region see local asks, events, leads. | Everyone in region; chapter lead curates | **Admin + new role `chapter_lead`** — scoped admin powers per region only. |
| Y3 | **Stories** | Long-form posts by members about craft, mission, India ↔ world bridges. Approved before publishing. | Anyone submits, admin/editor approves | **With admin** — submission queue with approve/feature/decline. |
| Y4 | **Events board** | Member-submitted events (talks, hackathons, salons). Verified by admin before public listing. | Anyone submits | **With admin** approval. |

---

### 4. Admin governance layer (cross-cutting)

Right now admin = "edit a row." This rebuilds it as actual **governance**.

| Capability | What it does |
|---|---|
| **Verification queue** | Pending profiles ranked by completeness; admin sees segment_details, can approve / decline-with-reason / request-more-info. Decision is logged. |
| **Audit log** | Every privileged action (verify, demote, feature, decline, role change) writes a row: who, what, when, reason. Read-only for admins. |
| **Reports & moderation** | Members can report a profile / post / message. Queue with status (open / actioned / dismissed) and resolution note. |
| **Admin analytics** | Live dashboard: members by segment, by region, verified %, week-over-week growth, active connections, pending queue depths. |
| **Role tiers** | Add `chapter_lead` (region-scoped moderation) and `editor` (Stories/Spotlights only). Keeps `admin` reserved for full-trust. |
| **Member controls** | Soft-suspend (hide from directory + block sends) and unsuspend, with reason logged. Hard-delete stays a manual SQL operation. |

---

### 5. Suggested phasing (so we don't ship a half-network)

```text
Phase 1 — Make admin actually administer
  • Verification queue with reason + decision log
  • Audit log table + admin-only viewer
  • Admin analytics dashboard
  • Soft-suspend with reason
  → Establishes trust + governance before we open up member→member actions.

Phase 2 — Light up Connection
  • Connection requests (C1)
  • Endorsements (C3)
  • Ask & Offer board (C4) + reports (moderation)
  → The orbit starts feeling alive. Minimal admin load.

Phase 3 — Unlock Synergy
  • Mentor slots (S1)
  • Investor signals (S2)
  • India Missions (S3) — admin-curated campaigns
  → The platform starts producing measurable value (hours, intros, capital signals).

Phase 4 — Society & Scale
  • Chapters + chapter_lead role (Y2)
  • Stories editor + queue (Y3)
  • Events board (Y4)
  • Member spotlights (Y1)
  → Indus Orbit becomes a publishing + community surface, not just a network.
```

---

### 6. What I need from you

Pick the path you want me to plan in detail next:

- **(A) Phase 1 only** — admin governance first (queue + audit + analytics + suspend). Smallest, highest-trust. Recommended.
- **(B) Phase 1 + Phase 2** — governance + first Connection primitive (requests + asks/offers).
- **(C) Connection-first** — skip governance for now, ship C1 + C4 to make the orbit feel alive immediately.
- **(D) Custom** — tell me which numbered features (C1, S2, Y2, etc.) you want and I'll plan that exact set.

Once you pick, the next message will be a concrete `<lov-plan>` with schema, RLS, routes, and components.

