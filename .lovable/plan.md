

## Members Workspace — A Real Dashboard, Decoupled From the Public Site

Two things to fix:

1. **Sign-up asks for too much before the email is sent.** Today the wizard collects segment + name + city + country + region + segment-specific details + headline + bio + links — and *only then* creates the auth account. We'll cut sign-up down to **just email + password + name**, send confirmation, and run the full segment + profile wizard **after the first sign-in** as a one-time onboarding flow.
2. **The post-auth experience reuses the marketing shell.** Today `/dashboard`, `/profile`, `/admin` render inside the public `SiteShell` (parchment background, fixed glass nav, marketing footer). We'll replace it with a **dedicated app shell**: dark indigo sidebar, role-aware navigation, top bar with user menu. The marketing site stays untouched.

The visual language (indigo night + saffron, Fraunces serif, glass details, saffron verified badge) carries over so it still feels like Indus Orbit — just a workspace instead of a brochure.

---

### 1. Slim sign-up + post-signin onboarding

**`/auth` becomes minimal.**

Sign-up form fields:
- Display name
- Email
- Password
- *(Google sign-in stays as alternative)*

Submitting calls `supabase.auth.signUp` immediately. The `handle_new_user` trigger already creates an empty `profiles` row + `member` role. We then redirect to `/onboarding` (or to email-confirmation notice if confirmation is required).

**New route: `/onboarding`** — lives outside the app shell, full-screen wizard on indigo night background, only reachable when authenticated. It runs the same 3-step flow currently jammed into sign-up:

```text
Step 1 — Choose your orbit segment       (7 cards)
Step 2 — Where you are                   (city, country, region; timezone auto)
Step 3 — Segment-specific details        (existing SegmentDetailsForm)
Step 4 — Headline, bio, links            (optional)
```

A `/onboarding` guard checks `profiles.orbit_segment`:
- If `null` → user must complete the wizard.
- If set → redirect to `/app` (dashboard).

The app shell layout itself also enforces: if signed in and `orbit_segment` is null, push to `/onboarding`. So users can't slip past it to the dashboard.

A "Skip for now" link is offered on steps 2–4, but step 1 (segment) is required — without it the dashboard has no role context.

---

### 2. New app shell — separate from the public site

Move all authenticated routes into a real **app workspace** that does not use `SiteNav` / `SiteFooter` / `CookieBanner`.

**Layout** (new `AppShell` component used by `_authenticated.tsx`):

```text
┌──────────────┬───────────────────────────────────────────┐
│              │  Top bar: page title · search · 🔔 · 👤   │
│   SIDEBAR    ├───────────────────────────────────────────┤
│  (indigo)    │                                           │
│              │                                           │
│  ◉ Indus     │           Route content (Outlet)          │
│    Orbit     │                                           │
│              │                                           │
│  Home        │                                           │
│  Directory   │                                           │
│  My profile  │                                           │
│  ─────────   │                                           │
│  ADMIN       │                                           │
│  Members     │                                           │
│  Roles       │                                           │
│  ─────────   │                                           │
│  ⎋ Sign out  │                                           │
└──────────────┴───────────────────────────────────────────┘
```

- Sidebar background: `var(--indigo-night)`, parchment text, saffron accent for active item.
- Collapsible to icon-only on tablet, drawer on mobile (uses existing `Sheet`).
- Active item uses `Link` `activeProps` and a saffron left border.
- Bottom of sidebar: avatar + display name + segment chip + sign-out.
- Top bar: parchment background, breadcrumb / page title on left, dark mode optional later.
- No marketing footer, no cookie banner inside the app — this is a logged-in workspace.

**Role-aware nav items:**

| Item | Route | Who sees it |
|---|---|---|
| Home | `/app` | everyone |
| Directory | `/app/directory` | everyone (mirrors `/members` but inside shell) |
| My profile | `/app/profile` | everyone |
| Members | `/app/admin/members` | admin only |
| Roles | `/app/admin/roles` | admin only |

Routes are reorganised under an `_app` layout (TanStack flat naming):

```
src/routes/
  _app.tsx                    -> layout, guards auth + onboarding, renders AppShell
  _app.index.tsx              -> /app (home)
  _app.directory.tsx          -> /app/directory
  _app.profile.tsx            -> /app/profile
  _app.admin.members.tsx      -> /app/admin/members  (admin guard inside)
  _app.admin.roles.tsx        -> /app/admin/roles    (admin guard inside)
  onboarding.tsx              -> /onboarding (own minimal layout)
```

The old `/dashboard`, `/_authenticated.profile`, `/_authenticated.admin` routes are removed. `SiteNav`'s user dropdown points to `/app` instead of `/dashboard`. Public `/members` page stays as-is for non-signed-in visitors.

---

### 3. Role-aware home (`/app`)

The home view is segment-aware, not a generic "Welcome" card.

Common header for everyone:
- Greeting + saffron `VerifiedBadge` if verified, or "Verification pending" chip.
- Profile completeness ring (existing logic, prettier).
- Segment chip.

Below that, **segment-tailored modules**:

| Segment | Modules shown |
|---|---|
| Youth | "Find a mentor" (filters experts in directory), "Learning prompts" placeholder, "Your craft" recap |
| Founder | "Find investors", "Find experts", "What you're looking for" recap |
| Expert | "Founders looking for help", "Hours pledged this month" |
| Investor | "New founders this week", "Sectors you follow" |
| Diaspora | "Ways to contribute" links, "Founders in your sectors" |
| Partner | "Partnership requests" placeholder, "Org details" recap |
| Researcher | "Open collaborations" placeholder, "Field" recap |

Each module is a card linking into `/app/directory` with the right filter pre-applied (e.g. founder → directory filtered to `investor`). No new backend logic — it's smart links + the segment-specific recap pulled from `segment_details`.

A persistent "Complete your profile" banner shows until completeness ≥ 80%.

---

### 4. Admin — split into Members + Roles

The current single admin page becomes two cleaner views inside the app shell.

**`/app/admin/members`** — same table as today (filters, verify toggle, public toggle, segment select, details sheet) but rendered inside the workspace, not the marketing layout. Add a search input across name / email-derived display.

**`/app/admin/roles`** — focused on role management:
- List all admins (joins `user_roles` where role=admin with `profiles`).
- Promote a member to admin via a search-and-pick combobox.
- Demote with confirm dialog.
- Future-proof: shows the role enum (`admin`, `member`) so adding `moderator` later is one row.

Both routes guard with `useAuth().isAdmin` and redirect to `/app` if not admin (the existing pattern).

---

### 5. Public-side touch-ups (small)

- `SiteNav` "Join the Orbit" button + signed-in dropdown both point to `/app` (not `/dashboard`).
- `/members` (public) keeps working unchanged for the marketing site.
- `/auth` keeps the saffron Indus Orbit branding card; the wizard inside is replaced with the slim 3-field form.

---

### Technical notes

- **No DB migrations.** All needed columns (`orbit_segment`, `is_verified`, `is_public`, `segment_details`, `region`, `timezone`) already exist. The `handle_new_user` trigger already creates the empty profile + `member` role. Onboarding just `update`s the existing row.
- **Onboarding gate**: a small `useOnboardingStatus` hook reads `profiles.orbit_segment`; `_app.tsx`'s `useEffect` redirects to `/onboarding` when null. `onboarding.tsx` redirects to `/app` once segment is set.
- **Routing**: TanStack flat route files under `_app.*`. `_authenticated.tsx`/`_authenticated.dashboard.tsx`/`_authenticated.profile.tsx`/`_authenticated.admin.tsx` are removed. The existing `useAuth` context (session + isAdmin) is reused as-is.
- **Reused components**: `SegmentDetailsForm`, `VerifiedBadge`, `SEGMENT_META`, the existing admin table logic — all moved into the new shell, no rewrite of logic.
- **New components**:
  - `src/components/app/AppShell.tsx` (sidebar + topbar + outlet)
  - `src/components/app/AppSidebar.tsx` (role-aware nav)
  - `src/components/app/SegmentHomeModules.tsx` (the per-segment cards)
  - `src/components/onboarding/OnboardingWizard.tsx` (steps 1–4 from current `auth.tsx`)
- **Files removed**: `_authenticated.tsx`, `_authenticated.dashboard.tsx`, `_authenticated.profile.tsx`, `_authenticated.admin.tsx`.
- **Files created**: `_app.tsx`, `_app.index.tsx`, `_app.directory.tsx`, `_app.profile.tsx`, `_app.admin.members.tsx`, `_app.admin.roles.tsx`, `onboarding.tsx`, the four components above.
- **Files edited**: `auth.tsx` (slim sign-up, redirect to `/onboarding`), `SiteNav.tsx` (links → `/app`).

### Out of scope (deferred)

- Real notifications, messaging, search across members.
- Switching auth-required email confirmation on/off (kept as Supabase default).
- Dark/light toggle inside the app (sidebar is dark, content area stays parchment).
- Custom moderator role beyond `admin` / `member`.

