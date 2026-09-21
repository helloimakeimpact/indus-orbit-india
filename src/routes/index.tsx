import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import heroImg from "@/assets/scene-river-city.jpg";
import opsImg from "@/assets/scene-ops-room.jpg";
import ghatImg from "@/assets/scene-ghat-walk.jpg";
import metropolisImg from "@/assets/scene-metropolis.jpg";
import {
  ArrowRight,
  Sparkles,
  Users,
  Globe2,
  Sunrise,
  Zap,
  Lightbulb,
  BadgeCheck,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { Cpu, Gauge, IndianRupee } from "lucide-react";
import modelsHero from "@/assets/models-hero.jpg";
import { INDIAN_LABS_TRACKED, MODELS_TRACKED } from "@/routes/models";
import { useEffect, useState } from "react";
import { getSpotlights } from "@/server/society.functions";
import { canonical, siteUrl } from "@/lib/seo";

type Spotlight = Awaited<ReturnType<typeof getSpotlights>>[number];

export const Route = createFileRoute("/")({
  head: () => ({
    links: canonical("/"),
    meta: [
      { property: "og:url", content: siteUrl("/") },
      { title: "Indus Orbit — The general intelligence company of India" },
      {
        name: "description",
        content:
          "Indus Orbit builds AI tools and human networks that connect India's youth, industry experts, founders and the diaspora into one orbit.",
      },
      { property: "og:title", content: "Indus Orbit — The general intelligence company of India" },
      {
        property: "og:description",
        content:
          "Building the intelligence layer for India's next billion builders. Connection. Synergy. Society.",
      },
      { property: "og:image", content: heroImg },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: heroImg },
    ],
  }),
  component: HomePage,
});

function NeonLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full neon-chip px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]">
      {children}
    </span>
  );
}

function HomePage() {
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  useEffect(() => {
    getSpotlights()
      .then((rows) => setSpotlights(rows ?? []))
      .catch(() => setSpotlights([]));
  }, []);

  return (
    <SiteShell navTone="dark">
      <div className="bg-[var(--indigo-night)] text-[var(--parchment)]">
        {/* HERO */}
        <section className="relative h-[115svh] min-h-[820px] w-full overflow-hidden">
          <img
            src={heroImg}
            alt="Flat poster illustration of a modern Indian riverfront city at dawn with a metro viaduct and boats"
            width={1920}
            height={1088}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--indigo-night)]/55 via-[var(--indigo-night)]/25 to-[var(--indigo-night)]" />
          <div className="absolute inset-0 neon-grid opacity-40" />
          <div className="pointer-events-none absolute inset-0 neon-scanlines opacity-30" />

          {/* Big neon title overlay */}
          <div className="absolute inset-x-0 top-[22%] md:top-[19%] px-6 text-center">
            <div className="mb-6 flex justify-center">
              <NeonLabel>Indus Orbit</NeonLabel>
            </div>
            <h1 className="font-display neon-text leading-[1.05] tracking-tight text-balance text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] font-light">
              The General Intelligence
              <br />
              Company Of India
            </h1>
            <hr className="neon-rule mx-auto mt-8 w-56 max-w-[60%]" />
          </div>

          {/* Bottom-right tagline note */}
          <div className="hidden md:flex absolute bottom-12 right-10 max-w-[260px] flex-col items-end gap-2 text-right text-[var(--parchment)]/85">
            <Sunrise className="h-5 w-5 text-[var(--neon-cyan)]" aria-hidden />
            <p className="text-sm leading-snug">
              India's next chapter is being written in code — we're orbiting the people writing it.
            </p>
          </div>

          {/* Hero card (bottom-left) */}
          <div className="absolute inset-x-0 bottom-24 md:bottom-32 px-4">
            <div className="mx-auto w-full max-w-7xl">
              <div className="max-w-md rounded-3xl neon-frame bg-[var(--indigo-night)]/70 p-6 backdrop-blur-xl md:p-7 animate-fade-up">
                <h2 className="font-display text-3xl font-light leading-[1.1] text-balance text-[var(--parchment)] md:text-4xl">
                  Building the intelligence layer for India's builders.
                </h2>
                <p className="mt-4 text-sm font-light text-[var(--parchment)]/85">
                  Indus Orbit is a research and product company creating AI tools and human networks
                  that bring India's youth, experts, founders, investors and the diaspora into one
                  orbit.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    to="/about"
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--saffron)] px-5 py-2.5 text-sm font-semibold text-[var(--indigo-night)] transition hover:bg-[var(--parchment)]"
                  >
                    Get to know us <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 rounded-full neon-chip px-5 py-2.5 text-sm font-medium transition hover:bg-[var(--parchment)]/10"
                  >
                    Get in touch
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE + STATEMENT */}
        <section className="relative px-6 py-20 md:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16">
            <div className="overflow-hidden rounded-3xl neon-frame">
              <img
                src={ghatImg}
                alt="Flat poster illustration of four people walking up river ghat steps in a modern Indian town"
                width={1024}
                height={1280}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] neon-text-magenta">
                A different kind of AI company
              </p>
              <h2 className="mt-5 font-display text-4xl font-light leading-tight text-balance md:text-5xl neon-text">
                AI should connect people, not isolate them.
              </h2>
              <hr className="neon-rule mt-7 w-40" />
              <p className="mt-6 text-lg text-[var(--parchment)]/75 text-balance">
                By building the right tools and the right networks, we can lift India together —
                across cities, generations and industries.
              </p>
              <p className="mt-4 text-sm text-[var(--parchment)]/60 italic">
                A lotus rises from still water — slow, deliberate, unmistakably of this place. So
                does what we're building.
              </p>
            </div>
          </div>
        </section>

        {/* IDEAS + EDUCATION + SKILLS */}
        <section className="px-6 pb-24">
          <div className="mx-auto grid w-full max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
            <section className="relative overflow-hidden rounded-3xl neon-frame bg-[var(--indigo-night)]/60 p-6 md:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--saffron)]/20 blur-3xl" />
              <div className="relative">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--saffron)] text-[var(--indigo-night)]">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] neon-text-amber">
                  Ideas
                </p>
                <h3 className="mt-3 font-display text-3xl font-light leading-tight md:text-4xl">
                  Opportunity maps for people ready to build.
                </h3>
                <p className="mt-4 text-sm leading-6 text-[var(--parchment)]/72">
                  We turn weak signals into practical starting points: sectors, customer pain,
                  timing, and the first experiments worth running.
                </p>
                <ul className="mt-7 divide-y divide-[color-mix(in_oklab,var(--parchment)_15%,transparent)] text-sm">
                  {[
                    "Startup theses across Bharat, AI, climate, health, commerce and education",
                    "Why-now signals: infrastructure, policy, behavior and capital movement",
                    "Action prompts that help founders move from curiosity to prototype",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 py-3 text-[var(--parchment)]/82">
                      <Sparkles className="mt-0.5 h-4 w-4 flex-none text-[var(--saffron)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/our-work"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--neon-cyan)] transition hover:gap-3"
                >
                  See what we're building <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl neon-frame bg-[var(--indigo-night)]/60 p-6 md:p-8">
              <div className="pointer-events-none absolute -left-14 -bottom-16 h-48 w-48 rounded-full bg-[var(--neon-cyan)]/15 blur-3xl" />
              <div className="relative">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--parchment)] text-[var(--indigo-night)]">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] neon-text-amber">
                  Education
                </p>
                <h3 className="mt-3 font-display text-3xl font-light leading-tight md:text-4xl">
                  Step-by-step courses for people shipping with AI tools.
                </h3>
                <p className="mt-4 text-sm leading-6 text-[var(--parchment)]/72">
                  Academy turns tools into repeatable practice: app-builder workflows, product
                  judgment, launch checklists, quizzes, and resources members can revisit.
                </p>
                <ul className="mt-7 divide-y divide-[color-mix(in_oklab,var(--parchment)_15%,transparent)] text-sm">
                  {[
                    "Builder tracks for Lovable, Bolt, Cursor, Replit Agent and v0",
                    "Lessons with video links, checklists, quizzes and completion progress",
                    "Operating habits: scoping, testing, deployment, feedback and iteration",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 py-3 text-[var(--parchment)]/82">
                      <BookOpen className="mt-0.5 h-4 w-4 flex-none text-[var(--saffron)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/app/education"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--neon-cyan)] transition hover:gap-3"
                >
                  Open Academy <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl neon-frame bg-[var(--indigo-night)]/60 p-6 md:p-8">
              <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-[var(--neon-magenta)]/20 blur-3xl" />
              <div className="relative">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--parchment)] text-[var(--indigo-night)]">
                  <BadgeCheck className="h-5 w-5" />
                </span>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] neon-text-amber">
                  Skills
                </p>
                <h3 className="mt-3 font-display text-3xl font-light leading-tight md:text-4xl">
                  AI agent skill sets for builders of the next internet.
                </h3>
                <p className="mt-4 text-sm leading-6 text-[var(--parchment)]/72">
                  We focus on the practical capabilities behind agent-native work: designing,
                  prompting, evaluating, automating, and shipping AI systems with others.
                </p>
                <ul className="mt-7 divide-y divide-[color-mix(in_oklab,var(--parchment)_18%,transparent)] text-sm">
                  {[
                    "Agent design: goals, tools, memory, routing, permissions and handoffs",
                    "Agent operations: workflow automation, evals, monitoring and safety checks",
                    "Agent product craft: prompt systems, UX patterns, integrations and launch loops",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 py-3 text-[var(--parchment)]/82">
                      <Zap className="mt-0.5 h-4 w-4 flex-none text-[var(--saffron)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/skills"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--neon-cyan)] transition hover:gap-3"
                >
                  See skill pathways <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </div>
        </section>

        {/* ORBIT VISION */}
        <section className="px-6 pb-24">
          <div className="mx-auto w-full max-w-7xl overflow-hidden rounded-3xl neon-frame bg-[var(--indigo-night)]">
            <div className="relative grid gap-12 p-8 md:grid-cols-2 md:items-center md:p-16">
              <div className="pointer-events-none absolute inset-0 neon-grid opacity-30" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] neon-text-magenta">
                  The Orbit
                </p>
                <h3 className="mt-4 font-display text-3xl font-medium leading-tight md:text-5xl neon-text">
                  One orbit. Many walks of life.
                </h3>
                <p className="mt-5 text-[var(--parchment)]/75">
                  India's next breakthroughs won't come from a lone founder in a garage — they'll
                  come from networks of mentors, makers, investors, NRIs and young builders moving
                  together. We design the gravity that holds them in the same orbit.
                </p>

                <ul className="mt-8 space-y-3 text-sm">
                  {[
                    {
                      i: <Sparkles className="h-4 w-4" />,
                      t: "Tools for agent-native youth builders",
                    },
                    {
                      i: <Users className="h-4 w-4" />,
                      t: "Mentorship from India's industry veterans",
                    },
                    {
                      i: <Globe2 className="h-4 w-4" />,
                      t: "Bridges to global capital and the diaspora",
                    },
                  ].map((row) => (
                    <li key={row.t} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--saffron)] text-[var(--indigo-night)]">
                        {row.i}
                      </span>
                      <span className="text-[var(--parchment)]/85">{row.t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <OrbitDiagram />
              </div>
            </div>
          </div>
        </section>

        {/* MODERN INDIA SCENES */}
        <section className="px-6 pb-24">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
            <figure className="overflow-hidden rounded-3xl neon-frame">
              <img
                src={opsImg}
                alt="Flat poster illustration of an Indian research operations room overlooking a modern city"
                width={1024}
                height={1280}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </figure>
            <figure className="overflow-hidden rounded-3xl neon-frame">
              <img
                src={metropolisImg}
                alt="Flat poster illustration of a modern planned Indian metropolis with metro, parks and river"
                width={1024}
                height={1280}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </figure>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-24">
          <div className="mx-auto w-full max-w-7xl text-center">
            <h3 className="font-display text-3xl font-medium leading-tight text-balance md:text-5xl neon-text">
              We're building tools for an India that builds itself.
            </h3>
            <hr className="neon-rule mx-auto mt-7 w-48" />
            <p className="mt-5 text-[var(--parchment)]/72">
              If this resonates with you — as a founder, expert, investor, student, or someone who
              simply cares about India's next chapter — we'd love to hear from you.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--saffron)] px-6 py-3 text-sm font-semibold text-[var(--indigo-night)] transition hover:bg-[var(--parchment)]"
              >
                Come work with us <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/our-work"
                className="inline-flex items-center gap-2 rounded-full neon-chip px-6 py-3 text-sm font-medium hover:bg-[var(--parchment)]/10"
              >
                See our work
              </Link>
            </div>
          </div>
        </section>

        {/* MODEL OBSERVATORY teaser */}
        <section className="px-6 pb-24">
          <div className="mx-auto grid max-w-7xl gap-0 overflow-hidden rounded-3xl neon-frame bg-[var(--indigo-night)]/70 md:grid-cols-2">
            <div className="relative min-h-[320px] md:min-h-full">
              <img
                src={modelsHero}
                alt="Pixel-art observatory tracking AI models across the sky"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--indigo-night)]/85 via-[var(--indigo-night)]/20 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2">
                {[
                  { i: <Cpu className="h-3 w-3" />, t: "Intelligence" },
                  { i: <Gauge className="h-3 w-3" />, t: "Speed" },
                  { i: <IndianRupee className="h-3 w-3" />, t: "Price" },
                ].map((c) => (
                  <span
                    key={c.t}
                    className="inline-flex items-center gap-1.5 rounded-full neon-chip bg-[var(--indigo-night)]/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur"
                  >
                    {c.i} {c.t}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-8 md:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] neon-text-magenta">
                The Model Observatory
              </p>
              <h3 className="mt-4 font-display text-3xl font-light leading-tight md:text-4xl">
                The frontier of AI, charted for India's builders.
              </h3>
              <p className="mt-4 text-[var(--parchment)]/72">
                A living side-by-side chart of frontier models — intelligence, output speed, latency
                and price. Independent. Last reviewed 21 August 2026. Adapted for what actually
                matters at India scale.
              </p>
              <ul className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[
                  { k: String(MODELS_TRACKED), v: "Models tracked" },
                  { k: "4", v: "Core metrics" },
                  { k: String(INDIAN_LABS_TRACKED), v: "Indian labs" },
                ].map((s) => (
                  <li key={s.v} className="rounded-2xl neon-frame p-3">
                    <div className="font-display text-2xl font-medium neon-text-amber">{s.k}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-[var(--parchment)]/60">
                      {s.v}
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                to="/models"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--saffron)] px-6 py-3 text-sm font-semibold text-[var(--indigo-night)] transition hover:bg-[var(--parchment)]"
              >
                Open the Model Observatory <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* SPOTLIGHTS — voices from the orbit */}
        {spotlights.length > 0 && (
          <section className="px-6 pb-24">
            <div className="mx-auto w-full max-w-7xl">
              <div className="mb-10 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] neon-text-magenta">
                  Voices from the orbit
                </p>
                <h3 className="mt-4 font-display text-3xl font-medium leading-tight md:text-5xl neon-text">
                  Spotlights
                </h3>
                <p className="mt-4 text-[var(--parchment)]/72">
                  Builders, mentors and dreamers we're proud to orbit with.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {spotlights.slice(0, 6).map((s) => (
                  <article
                    key={s.id}
                    className="rounded-3xl neon-frame bg-[var(--indigo-night)]/60 p-6 transition hover:bg-[var(--indigo-night)]/80"
                  >
                    <div className="flex items-center gap-3">
                      {s.profiles?.avatar_url ? (
                        <img
                          src={s.profiles.avatar_url}
                          alt={s.profiles?.display_name ?? "Member"}
                          className="h-12 w-12 rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--parchment)]/10 font-semibold text-[var(--parchment)]">
                          {(s.profiles?.display_name ?? "?").charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-display text-lg font-medium leading-tight">
                          {s.profiles?.display_name ?? "A member"}
                        </p>
                        {s.profiles?.headline && (
                          <p className="text-xs text-[var(--parchment)]/60">
                            {s.profiles.headline}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="mt-4 border-l-2 border-[var(--neon-magenta)] pl-3 text-sm italic leading-relaxed text-[var(--parchment)]/80">
                      "{s.writeup}"
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* S.O.D.A COHORT PROGRAM: intentionally feature-gated until its public release. */}
        {import.meta.env.VITE_ENABLE_SODA_COHORT === "true" && (
          <section className="px-6 pb-24">
            <div className="relative mx-auto grid max-w-7xl gap-12 overflow-hidden rounded-3xl neon-frame bg-[var(--indigo-night)]/70 md:grid-cols-2 md:items-center">
              <div className="relative z-10 order-2 p-8 md:order-1 md:p-14 lg:p-16">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] neon-text-magenta">
                  The Communication Wing
                </p>
                <h3 className="mt-4 font-display text-4xl font-medium leading-tight md:text-5xl neon-text">
                  S.O.D.A by Indus Orbit
                </h3>
                <p className="mt-6 text-xl font-light leading-relaxed text-[var(--parchment)]/90 text-balance">
                  S.O.D.A is the creative and communication engine of Indus Orbit. We document and
                  distribute high-signal stories from India’s builders.
                </p>
                <p className="mt-4 text-[1.05rem] leading-relaxed text-[var(--parchment)]/72">
                  As part of its mission, S.O.D.A runs the{" "}
                  <strong className="font-semibold text-[var(--saffron)]">
                    S.O.D.A Cohort Program
                  </strong>{" "}
                  (Startup Opportunities, Development & Action)—a flagship initiative designed to
                  identify and accelerate India’s highest-potential young builders under 24. We
                  don't optimize for attention; we optimize for alignment.
                </p>
                <div className="mt-6 rounded-r-2xl border-l-4 border-[var(--saffron)] bg-[var(--parchment)]/5 p-5 backdrop-blur">
                  <p className="text-[15px] font-medium italic text-[var(--parchment)]">
                    "Not students chasing credentials. Builders chasing outcomes."
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    to="/soda"
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--saffron)] px-7 py-3.5 text-sm font-semibold text-[var(--indigo-night)] shadow-md transition hover:bg-[var(--parchment)]"
                  >
                    Explore the S.O.D.A Program <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="group relative order-1 h-[400px] w-full overflow-hidden bg-muted sm:h-[450px] md:order-2 md:h-full">
                <img
                  src="/soda-2.jpg"
                  alt="S.O.D.A Cohort Program Builders"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--indigo-night)]/90 via-black/20 to-transparent mix-blend-multiply" />

                {/* SPONSOR BANNER OVER IMAGE */}
                <div className="absolute bottom-6 inset-x-6 rounded-2xl neon-frame bg-[var(--indigo-night)]/40 p-6 backdrop-blur-md transition-transform duration-500 hover:-translate-y-1">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--saffron)]">
                      Sponsored Cohort
                    </span>
                    <p className="mt-1 text-[15px] leading-relaxed text-white/95">
                      Powered by{" "}
                      <span className="font-display text-[1.6rem] font-bold tracking-wide neon-text-amber">
                        Jri.AI
                      </span>
                      <br />
                      <span className="font-medium text-white">
                        The AI+Human business automation platform.
                      </span>{" "}
                      From set up to scale.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </SiteShell>
  );
}

function OrbitDiagram() {
  const nodes = [
    { label: "Youth", angle: 200, color: "#22d3ee" },
    { label: "Founders", angle: 320, color: "#f472b6" },
    { label: "Experts", angle: 30, color: "#fbbf24" },
    { label: "Investors", angle: 100, color: "#34d399" },
    { label: "Diaspora", angle: 250, color: "#a78bfa" },
  ];
  // Ellipse parameters (in viewBox 400x400 units)
  const cx = 200;
  const cy = 200;
  const rx = 150;
  const ry = 110;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <svg
        viewBox="0 0 400 400"
        className="h-auto w-full"
        role="img"
        aria-label="Indus Orbit network: Youth, Founders, Experts, Investors and Diaspora orbiting a central sun"
      >
        <defs>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffb454" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ff9933" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff9933" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sunCore" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffd28a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>

        {/* Orbit ring */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="rgba(34,211,238,0.35)"
          strokeWidth="1"
        />

        {/* Sun glow */}
        <circle cx={cx} cy={cy} r="90" fill="url(#sunGlow)" />
        {/* Sun core */}
        <circle cx={cx} cy={cy} r="34" fill="url(#sunCore)" />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fontFamily="Fraunces, serif"
          fontSize="11"
          fontWeight="600"
          fill="#1a1f4d"
        >
          Indus
        </text>
        <text
          x={cx}
          y={cy + 11}
          textAnchor="middle"
          fontFamily="Fraunces, serif"
          fontSize="11"
          fontWeight="600"
          fill="#1a1f4d"
        >
          Orbit
        </text>

        {/* Planets — animated rotation around the sun */}
        <g style={{ transformOrigin: `${cx}px ${cy}px` }} className="animate-orbit">
          {nodes.map((n) => {
            const rad = (n.angle * Math.PI) / 180;
            const x = cx + rx * Math.cos(rad);
            const y = cy + ry * Math.sin(rad);
            const labelOffset = 16;
            const lx = cx + (rx + labelOffset) * Math.cos(rad);
            const ly = cy + (ry + labelOffset) * Math.sin(rad);
            const anchor = lx < cx - 4 ? "end" : lx > cx + 4 ? "start" : "middle";
            return (
              <g
                key={n.label}
                className="animate-counter-orbit"
                style={{ transformOrigin: `${x}px ${y}px` }}
              >
                <circle cx={x} cy={y} r="6" fill={n.color} />
                <circle cx={x} cy={y} r="11" fill={n.color} fillOpacity="0.18" />
                <text
                  x={lx}
                  y={ly + 4}
                  textAnchor={anchor}
                  fontFamily="Inter, sans-serif"
                  fontSize="12"
                  fontWeight="600"
                  fill="rgba(255,245,225,0.92)"
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
