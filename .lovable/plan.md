

## Update `/our-work` — add two featured ventures + status badges

### What changes

Edit only `src/routes/our-work.tsx`. Two new sections, two reusable inline pills, no new assets, no new routes.

### 1. New "Featured ventures" section (above existing grid)

Two large cards in a 2-column grid (stacked on mobile), same parchment-glass styling as the existing grid (`rounded-3xl`, border, hover-lift) but ~2× tall with a tall gradient header band. Each card carries an **External** badge in the top-right and links out via `<a target="_blank" rel="noopener noreferrer">`.

**Card 1 — JRI.ai — Just Resolve It**
- Tag: `Venture`
- Tagline: *AI-native business setup, operations & compliance for India.*
- Body: *India's growth is bottlenecked by heavy compliance, the absence of cost-effective operations tooling, and the time and money lost to unresolved disputes. JRI.ai brings business setup, day-to-day operations, compliance and dispute resolution into a single AI-assisted platform — so founders, SMBs and citizens can get on with building, not paperwork. A Connection-pillar venture: lowering the cost of trust and operating in India.*
- Link: `https://jri.ai/`
- Badge: **External**
- Gradient: `from-[var(--monsoon)]/80 via-[var(--indigo-night)]/90 to-[var(--saffron)]/60`

**Card 2 — India Muse**
- Tag: `Venture`
- Tagline: *Modern Indian luxury, staged for the world.*
- Body: *An editorial house carrying India's craft, couture and celebrations to a global audience — based in Paris, working across campaigns, runways and milestones with a painterly soul. A Society-pillar venture: putting India on the stage instead of in the backdrop.*
- Link: `https://indiamuse.com/`
- Badge: **External**
- Gradient: `from-[var(--gold)]/80 via-[var(--saffron)]/70 to-[var(--indigo-night)]/90`

### 2. Updated existing grid — "More from the orbit"

Add an `h2` "More from the orbit" above the existing 6-card grid. Each existing card gets **two** pills in the top-right corner of its image band:
- **On Indus Orbit** (indigo chip, parchment text)
- **Coming soon** (saffron chip, indigo-night text)

No copy/order changes to the 6 existing items.

### 3. Reusable inline pills (defined inside the route file)

```text
<StatusPill tone="external">External</StatusPill>      // saffron bg, indigo text
<StatusPill tone="orbit">On Indus Orbit</StatusPill>   // indigo bg, parchment text
<StatusPill tone="soon">Coming soon</StatusPill>       // gold bg, indigo text
```

All three: `rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider`.

### Final page order

```text
Hero (unchanged)
  ↓
Featured ventures        (new — JRI.ai + India Muse, External badge)
  ↓
More from the orbit      (existing 6 cards, On Indus Orbit + Coming soon)
```

### Out of scope

- Build errors listed for `src/routes/_app.*` and `src/routes/onboarding.tsx` — not touched in this change (separate cleanup).
- Logos for JRI.ai / India Muse (gradient bands until assets are provided).

