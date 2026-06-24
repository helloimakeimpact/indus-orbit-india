## What Skills and Loop are

**Skills** — a community library of reusable founder playbooks: tight, repeatable procedures the Orbit can apply on demand. Think: "How to register a Section 8 company", "How to run a 5-day kirana-store sales pilot", "How to negotiate a manufacturing PO in Tamil Nadu". Each Skill bundles a how-to body, prerequisites, a checklist, time/cost estimates, and pointers to templates or tools.

**Loop** — based on the *Forward Future* essay "Build the Loop, Not the Agent". The thesis: don't ship a finished AI agent, ship the iteration loop that rebuilds it as models improve. The library captures **loop blueprints**: a problem, an eval set, the smallest end-to-end pipeline that solves it, and the cadence/trigger that re-runs the loop when a new model lands. Each entry is essentially "here's the loop, here's the eval, here's how you re-run it on the next frontier model".

Both fit the same Indus Orbit pattern as S.O.D.A: a living, India-flavoured database, refreshed continuously, with depth gated behind sign-in.

---

## Architecture (identical for both, mirrors S.O.D.A)

```text
PUBLIC                              AUTH                            ADMIN
/skills          ---------->  /app/skills         ----------->  /app/admin/skills
/loop            ---------->  /app/loop           ----------->  /app/admin/loop
  - hero                        - full list, search             - CRUD table
  - top 5 by score              - filters & sort                - search + filter
  - 5 newest                    - tag clouds                    - status toggle
  - "of the day"                - detail pages                  - CSV export
  - sign-in CTA                                                 - JSON editors
```

Each library gets:
1. **Public route** showing top-5-by-score and 5-newest (deduped), an "Item of the Day" rotation, and a sign-in CTA — same shape as `/soda` today.
2. **Auth route** at `/app/<lib>` with full grid, search, sector filter, sort.
3. **Detail route** at `/app/<lib>/$slug` with the full body.
4. **Admin route** at `/app/admin/<lib>` — table, search, status filter, publish toggle, CSV export, single-row editor (same component shape as S.O.D.A admin).
5. **Sidebar entries** under main nav (member) and Admin section.
6. **SEO**: per-page canonical, OG/Twitter, JSON-LD `ItemList` (library) and `HowTo` (Skill) or `TechArticle` (Loop).

---

## Data model

Two new tables, identical pattern to `soda_ideas`:

**`public.skills`**
- Identity: slug, title, summary, hero_image_url, status (draft|published), featured_on
- Taxonomy: category (`legal`, `finance`, `gtm`, `ops`, `product`, `hiring`, `compliance`, `vernacular`, `ai`), tags[], badges[]
- Body: when_to_use, prerequisites (jsonb array), steps (jsonb array of `{title, body}`), time_estimate, cost_estimate, common_pitfalls, india_context_notes
- Resources: templates (jsonb array of `{label, url, kind}`), referenced_tools[], legal_refs[]
- Scoring: score_clarity, score_completeness, score_india_fit, score_freshness (0–10) — drives "top by score" ranking
- Ownership: created_by, updated_at, published_at

**`public.loops`**
- Identity: slug, title, summary, hero_image_url, status, featured_on
- Taxonomy: domain (`agents`, `evals`, `data-pipelines`, `voice`, `vision`, `multimodal`, `rag`), tags[], badges[]
- Body: problem_statement, why_iterate (the "model-keeps-shifting" thesis), minimum_loop (jsonb: `{input, pipeline, output, eval}`), eval_set_description, current_baseline_model, trigger_to_rerun (e.g. "new frontier model > X benchmark"), upgrade_history (jsonb timeline)
- Architecture: stack[], cost_per_iteration_inr, latency_target_ms
- Scoring: score_iteration_speed, score_eval_rigor, score_business_value, score_india_fit
- Ownership: created_by, updated_at, published_at

Both tables follow the same RLS pattern S.O.D.A now uses:
- `anon` may `SELECT` rows where `status = 'published'`
- `authenticated` may `SELECT` published rows
- Only admins may `INSERT / UPDATE / DELETE`

GRANTs and policies set in the same migration as the CREATE TABLE.

---

## Files to add (per library)

```text
src/server/skill.functions.ts         (mirrors soda.functions.ts)
src/server/loop.functions.ts

src/routes/skills.tsx                 (public hero + top 5 + newest 5)
src/routes/loop.tsx
src/routes/app.skills.tsx             (Outlet wrapper)
src/routes/app.skills.index.tsx       (full auth grid)
src/routes/app.skills.$slug.tsx       (detail)
src/routes/app.loop.tsx
src/routes/app.loop.index.tsx
src/routes/app.loop.$slug.tsx
src/routes/app.admin.skills.tsx       (CRUD, same shape as app.admin.soda.tsx)
src/routes/app.admin.loop.tsx

# Sidebar entries added to src/components/app/AppSidebar.tsx
# Sitemap entries added to public/sitemap.xml
```

A shared `LibraryCard`, `LibraryDetail` and `LibraryAdminTable` component could be factored later, but I'd ship the first cut with copy-paste from the S.O.D.A files to avoid premature abstraction (consistent with the Loop essay itself).

---

## Seed content (so neither library launches empty)

I'll seed each with ~8 India-context entries:

**Skills (sample)**
1. Register a startup in India in 7 days (MCA, GST, PAN, current account)
2. Run a 5-day kirana-store pilot in Pune
3. Hire your first 3 engineers from tier-2 campuses
4. Set up UPI Autopay for a subscription product
5. File DPIIT recognition and unlock Startup India benefits
6. Negotiate a manufacturing PO in Coimbatore
7. Set up an Indic LLM eval harness in a weekend
8. Get on ONDC as a seller

**Loop (sample)**
1. Vernacular voice-agent quality loop (Hindi → Tamil → Telugu)
2. RAG-eval loop for Indian legal documents
3. Pricing-experiment loop for tier-2 D2C
4. KYC-doc-OCR accuracy loop across regional IDs
5. Recommendation loop for Bharat creator commerce
6. WhatsApp-flow conversion-rate loop
7. Code-review agent loop for service businesses
8. Local-search ranking loop for ONDC catalogues

---

## Build order

1. Migration for `skills` (table + GRANTs + RLS + policies). Then seed 8 rows.
2. Public `/skills`, auth `/app/skills`, detail, admin — copied from S.O.D.A shape.
3. Sidebar + sitemap + SEO.
4. Repeat the same six steps for `loop`.

Estimated scope: roughly the same as S.O.D.A took, twice.

---

## Open questions

1. **Naming**: keep `/loop` or use `/loops` (plural, matches DB table)?
2. **Skills authoring**: admin-only, or do we let verified members propose Skills that admins approve (mirrors the Stories pattern)?
3. **Loop entries**: should each Loop link to a S.O.D.A idea it serves (e.g. "this loop powers the *Vernacular voice agents* idea")? Adds a nice cross-library graph.
4. **Visibility split**: same as S.O.D.A (top 5 score + 5 newest public), or tighter (top 3 only)?

Once you confirm these, I'll start with the Skills migration.