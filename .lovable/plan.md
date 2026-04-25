## Indus Orbit — Phase 3 Plan: Verification Codes + Roadmap Catch-up

This plan does three things:
1. **Audit** what's actually built vs the System Analysis & Feature Roadmap.
2. **Design** the verification-code / vouching system you described (with admin-controlled global + per-role + per-user quotas, every 28 days).
3. **Lay out** the next slice of features to bring the orbit to "alive."

---

### 1. Implementation status vs the Roadmap

#### Phase 1 — Admin Governance (DONE)

| Item | Status | Where |
|---|---|---|
| Verification queue with reasons + decision log | Done | `/app/admin/queue`, `verification_decisions` |
| Audit log + admin viewer | Done | `/app/admin/audit`, `audit_log` |
| Admin analytics (members, verified %, segments, week-over-week) | Done | `/app/admin` |
| Soft-suspend with reason + RLS enforcement | Done | `/app/admin/members`, `member_suspensions`, `is_suspended()` |
| Reports & moderation queue | Done | `/app/admin/reports`, `reports` |
| Roles management (promote/demote admin) | Done (pre-existing) | `/app/admin/roles` |

#### Phase 2 — Connection (DONE)

| Item | Status | Where |
|---|---|---|
| C1 Connection requests | Done | `/app/connect`, `connection_requests` |
| C3 Endorsements (verified-only) | Done | `EndorseDialog`, `endorsements` |
| C4 Ask & Offer board (30-day expiry, filters, report) | Done | `/app/board`, `asks_offers` |
| Reach-out + Report from directory cards | Done | `/app/directory` |

#### Phase 3 — Synergy (NOT STARTED)
S1 Mentor slots · S2 Investor signals · S3 India Missions · S4 Research–Practice bridge.

#### Phase 4 — Society & Scale (NOT STARTED)
Y1 Spotlights · Y2 Chapters + `chapter_lead` role · Y3 Stories · Y4 Events board.

#### Cross-cutting gaps still open
- Only two role tiers (`admin`, `member`). No `chapter_lead`, `editor`, `verifier`.
- No member-driven path to **become** verified — admin-only flip today.
- `segment_details` JSON is collected at onboarding, never re-surfaced for matching/search.
- No notifications (email or in-app) for accepted requests, endorsements, decisions.

---

### 2. The Verification Code system (your new ask)

#### Concept

Verification today = an admin flips a switch. We add a **second, member-driven path**: any verified member can mint a small number of **vouching codes** that, when redeemed, instantly verify the recipient. This is the "trust web" — Indus Orbit grows by who its trusted members vouch for, with admin holding the global throttle.

Two surfaces are unified:
- **Generate code** → a 10-char code the holder can hand to someone (or paste into a request).
- **Vouch directly** → pick a member, click "Vouch", same accounting.

Both consume from the same 28-day budget.

#### Default policy (overridable)

| Who | Default budget per 28 days |
|---|---|
| Verified member (any segment) | 5 vouches/codes |
| Unverified member | 0 (cannot vouch) |
| Admin | unlimited (logged) |

Admin can override at three levels (highest wins):
1. **Per-user override** — give Riya 20 this period.
2. **Per-role override** — all `expert`s get 10 this period.
3. **Global default** — bump the platform default from 5 → 8.

#### Workflow

```text
Member A (verified)
  └─ /app/vouch
       ├─ "Generate code"  → 10-char code, expires in 14 days, single-use
       │     copies to clipboard, shareable link /redeem/<code>
       └─ "Vouch directly" → search → confirm → recipient is verified now
                                 (audit_log entry written)

Member B (unverified)
  └─ /app/profile  → "Have a code?" field
       └─ valid + not expired + budget intact on issuer
            → B becomes verified, code marked redeemed
            → B can also "Request vouch" from admin or any verified member

Admin
  └─ /app/admin/vouches
       ├─ Global default budget (1 input)
       ├─ Per-role overrides (table)
       ├─ Per-user overrides (search + add)
       ├─ Active codes (issuer, code, status, expires)
       └─ Recent vouch events (who → who, when, channel)
```

#### Quota enforcement (the important bit)

A SQL function `vouch_budget_remaining(_user_id)` returns:
```
GREATEST(effective_quota(_user_id) - count_used_in_window(_user_id, 28d), 0)
```
- Window = trailing 28 days from now (rolling, not calendar).
- A "use" = either an issued code (whether redeemed or not) **or** a direct vouch.
- Issued-but-expired-unredeemed codes still count (prevents code-spam to dodge quota). Admin can manually credit back via override.

`effective_quota(_user_id)`:
```
COALESCE(per_user_override, per_role_override(role), global_default)
```
Admins always return a sentinel "unlimited" (we use a high number like 9999).

#### Database (new tables)

```text
vouch_settings
  id (singleton row, key='global')
  default_quota int       -- starts at 5
  code_ttl_days int       -- starts at 14
  window_days int         -- starts at 28
  updated_at, updated_by

vouch_role_overrides
  segment orbit_segment   -- nullable; we may want per-segment too
  role app_role           -- 'member' | 'admin'
  quota int
  updated_at, updated_by
  (PK: role + segment combo)

vouch_user_overrides
  user_id (PK)
  quota int               -- absolute override for this 28d window
  reason text
  updated_at, updated_by

vouch_codes
  id, code (10-char unique), issuer_id
  created_at, expires_at, redeemed_at, redeemer_id
  status: 'active' | 'redeemed' | 'expired' | 'revoked'

vouch_events
  id, issuer_id, recipient_id
  channel: 'code' | 'direct'
  code_id (nullable, FK to vouch_codes)
  created_at
  (this is the "use" record that drives the 28d window count)

vouch_requests
  id, requester_id, target_verifier_id (nullable = "any admin")
  message text
  status: 'open' | 'fulfilled' | 'declined' | 'expired'
  created_at, responded_at
```

#### RLS & security

- `vouch_settings`, `vouch_role_overrides`, `vouch_user_overrides`: admin-only read/write.
- `vouch_codes`: issuer can read their own; redeemer can read by code (server fn does the lookup, RLS on `code` lookup uses anon-safe read by exact match); admins read all.
- `vouch_events`: issuer + recipient + admin can read.
- `vouch_requests`: requester + target + admin can read.
- All vouch-issuance and redemption goes through **`createServerFn`** so we can:
  - Atomically check quota + insert event + flip `profiles.is_verified` in one transaction (via `supabaseAdmin`).
  - Avoid a client-side race on the 5/period ceiling.
  - Write to `audit_log` with `action='verification.vouched'` or `'verification.code_redeemed'`.

#### `guard_profile_verification` update

Today only admins can flip `is_verified`. We extend it to also allow the `supabaseAdmin` server function (it already bypasses RLS), but keep the trigger so direct client updates from members still fail. The vouching path always goes through the server fn.

#### UI surfaces

| Route | Audience | What |
|---|---|---|
| `/app/vouch` | Verified members + admins | Budget pill ("3 of 5 left, resets in 12 days"), Generate Code button, Vouch Directly search, list of my active codes & recent vouches |
| `/app/profile` (small addition) | Unverified members | "Have a code?" input + "Request a vouch" button |
| `/app/admin/vouches` | Admin only | Global default, role overrides, user overrides, active codes table, vouch events feed |
| `/redeem/$code` | Public | Renders code state; if logged-in unverified member, one-click redeem → verified |

#### Sidebar additions
- "Vouch" under main nav (visible to all verified members and admins)
- "Vouches" under Admin section

#### Counts and edge cases handled
- Issuing a code decrements remaining immediately (not on redemption) — prevents minting 100 codes at once.
- Code expiry is 14 days; if unredeemed, the slot does NOT auto-return (admin can refund via per-user override).
- A member cannot vouch for themselves (server fn check).
- Already-verified recipients can still receive codes; the server fn no-ops the verification flip but still logs the event (so issuer pays the budget — explicitly chosen so spammy auto-vouching costs the issuer).
- Suspended members cannot issue or redeem (uses existing `is_suspended()`).
- Admin issuance is logged but doesn't decrement (their quota is effectively unlimited).

---

### 3. What ships in this plan (concrete deliverables)

**Migration**
- 6 new tables above + indexes (`vouch_codes(code) UNIQUE`, `vouch_events(issuer_id, created_at)`, `vouch_events(recipient_id)`).
- SQL functions: `vouch_effective_quota(uuid)`, `vouch_used_in_window(uuid)`, `vouch_remaining(uuid)`.
- Update `guard_profile_verification` to allow service-role updates (for server-fn path).
- Seed `vouch_settings` row with `default_quota=5, code_ttl_days=14, window_days=28`.

**Server functions** (`src/server/vouch.ts`)
- `issueCode()` — checks quota, generates 10-char code, inserts into `vouch_codes` + `vouch_events`, returns code + share URL.
- `redeemCode({code})` — validates state, flips recipient's `is_verified`, marks code redeemed, writes audit log.
- `vouchDirectly({recipient_id})` — same as redeem but skips code, single transaction.
- `requestVouch({target_id?, message})` — inserts `vouch_requests` row.
- `getMyVouchStatus()` — returns `{remaining, quota, window_resets_at, recent_events, my_active_codes}`.

**Routes**
- `src/routes/app.vouch.tsx` — member surface
- `src/routes/app.admin.vouches.tsx` — admin governance surface
- `src/routes/redeem.$code.tsx` — public redemption page
- Small additions to `src/routes/app.profile.tsx` (code input + request-vouch button) and `src/components/app/AppSidebar.tsx` (two new entries).

**Components**
- `IssueCodeButton`, `VouchDirectlyDialog`, `VouchBudgetPill`, `MyCodesTable`, `RequestVouchDialog`, `AdminVouchSettingsForm`, `AdminVouchOverridesTable`, `AdminVouchEventsFeed`.

**Out of scope for this slice** (planned next)
- Phase 3 Synergy features (mentor slots, investor signals, missions, research bridge).
- `chapter_lead` / `editor` role tiers.
- Email notifications for vouches/requests.
- Re-surfacing `segment_details` in directory search.

---

### 4. Order of execution

```text
1. Migration (tables, functions, trigger update, seed row)
2. Server fns (issueCode, redeemCode, vouchDirectly, requestVouch, getMyVouchStatus)
3. /app/vouch page + sidebar entry
4. /redeem/$code public page
5. Profile additions (code input, request-vouch dialog)
6. /app/admin/vouches + sidebar entry
7. Audit-log integration verification (manual smoke test of every action)
```

---

### 5. Open questions before I build

If you're happy with the defaults below, I'll proceed; otherwise tell me which to change:

- **Window length**: 28 days rolling (your spec). ✅
- **Default budget**: 5 issuances+vouches combined. ✅
- **Code TTL**: 14 days. Reasonable?
- **Self-vouch / re-vouch**: blocked / no-op-but-charged. Reasonable?
- **Unverified members vouching**: not allowed (your spec). ✅
- **Per-segment overrides**: included alongside per-role. Useful or noise?

Approve this plan and I'll ship the full vouch system end-to-end, then come back with a Phase 3 plan for Synergy features.
