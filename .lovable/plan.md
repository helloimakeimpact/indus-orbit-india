
## Indus Orbit — Landing Site (Revised Plan)

All references to "New York" and "The General Intelligence Company" removed. The vision, visual direction, and structure remain intact.

### The Vision

**Indus Orbit** is a general intelligence company *for India*. We build agentic tools and human networks that help anyone with an idea start something meaningful — translated into the Indian context.

Indus Orbit focuses on **connection, synergy, and collective uplift** — bringing together India's youth, industry experts, founders, investors, and NRIs into one orbit. India's path to a one-person billion-dollar company looks different: it runs on relationships, mentorship, cross-border bridges, and a deep understanding of India's distinct fabric — its people, its industries, its ambitions.

We're building **AI tools and a human network** that:
- Help India's youth become agent-native builders.
- Connect them with industry veterans who can guide them.
- Create synergies between Indian businesses and global capital/talent.
- Serve the broader benefit of Indian society.

We build *intelligence that multiplies India's people*.

---

### Visual & Experiential Direction

- **Aesthetic**: Painterly pixel-art / Ghibli-inspired hero illustrations reimagined for India — pixel-art Mumbai/Delhi skyline at dawn, banyan trees, monsoon greens, lantern-lit galis, Himalayan ridges.
- **Typography**: Serif display headings (storybook feel), clean sans for body.
- **Color**: Deep indigo nights + warm saffron/gold accents.
- **Motion**: Floating glassmorphic cards over full-bleed hero art, soft fade-ins on scroll.
- **Chrome**: Floating pill nav, small clock chip ("4:12 AM · DEL"), cookie banner, footer hero image.

---

### Pages (PRD)

**1. Home (`/`)**
- Full-bleed pixel-art hero (Indian night scene) with floating glass nav.
- Title: **"Indus Orbit"** + subtitle: *"A general intelligence company for India."*
- Tagline glass card (bottom-left): *"Our mission is to build the intelligence layer for India's next billion builders."*
- Section 2: "AI should connect people, not isolate them." → *"By building the right tools and the right networks, we can lift India together."*
- Section 3: Vision card — youth + experts + investors + NRIs orbiting a central node.
- Section 4: "We're building tools for an India that builds itself" → CTA "Come work with us".
- Footer with banyan/skyline pixel art, social links, nav.

**2. About (`/about`)**
- Story of Indus Orbit: why India, why now.
- Three pillars: **Connection · Synergy · Society**.
- Team placeholder cards.
- Locations: Delhi / Bengaluru.

**3. Our Work (`/our-work`)**
- Initiative cards in a writing-grid style:
  - Youth × Mentor matchmaking
  - Agent toolkit for Indian SMBs
  - NRI ↔ India bridge program
- Each card: pixel-art thumbnail + title + author + tag.

**4. More Info / Writing (`/writing`)**
- Article grid with filter chips (All, Announcements, Research, Vision).
- 3–6 placeholder essay cards.

**5. Get in Touch (`/contact`)**
- Centered serif headline: *"If this resonates with you, let's talk."*
- Form (name, email, role: Youth / Expert / Investor / Partner, message) → local toast confirmation. **No backend.**
- Email + social links + office cities.

**6. Shared**
- Floating top nav: Home logo · About · Our Work · Writing · Contact · "Join the Orbit" CTA pill.
- Footer: nav links, newsletter input (visual only), socials, "© Indus Orbit 2026", pixel-art band.
- Cookie banner.
- Custom 404.

---

### Tech Notes
- TanStack Start route per page (`index.tsx`, `about.tsx`, `our-work.tsx`, `writing.tsx`, `contact.tsx`) with per-route `head()` meta + og tags.
- Pixel-art hero images generated as Indian-themed assets.
- Tailwind v4 tokens updated: indigo night background, saffron/gold accents, serif display font (e.g. Fraunces or DM Serif Display).
- No backend, no database — contact form shows success toast.
- Fully responsive with mobile drawer nav.
- Per-route errorComponent + notFoundComponent; root notFoundComponent already in place.

---

### Build Order
1. Update `styles.css` with indigo/saffron tokens + serif display font.
2. Generate pixel-art hero assets (home, about, work, contact, footer band).
3. Build shared `SiteNav`, `SiteFooter`, `CookieBanner`, `GlassCard` components.
4. Replace `index.tsx` placeholder with home page.
5. Create `about.tsx`, `our-work.tsx`, `writing.tsx`, `contact.tsx`.
6. Wire per-route meta, og:title, og:description, og:image.
7. QA responsive + nav transitions.
