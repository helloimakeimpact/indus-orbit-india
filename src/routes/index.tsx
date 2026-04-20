import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import heroImg from "@/assets/hero-india-dawn.jpg";
import { ArrowRight, Sparkles, Users, Globe2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Indus Orbit — A general intelligence company for India" },
      {
        name: "description",
        content:
          "Indus Orbit builds AI tools and human networks that connect India's youth, industry experts, founders and the diaspora into one orbit.",
      },
      { property: "og:title", content: "Indus Orbit — A general intelligence company for India" },
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

function HomePage() {
  return (
    <SiteShell navTone="dark">
      {/* HERO */}
      <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
        <img
          src={heroImg}
          alt="Pixel-art dawn over an Indian city skyline with banyan tree and Himalayas"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--indigo-night)]/40 via-transparent to-[var(--indigo-night)]/80" />

        <div className="absolute inset-x-0 bottom-0 px-4 pb-10 md:pb-16">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl rounded-3xl glass-card p-6 md:p-8 animate-fade-up">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--indigo-night)]/70">
                The General Intelligence of India
              </p>
              <h1 className="mt-3 font-display text-4xl font-medium leading-[1.05] text-balance text-[var(--indigo-night)] md:text-5xl">
                Building the intelligence layer for India's next billion builders.
              </h1>
              <p className="mt-4 text-sm text-foreground/75 md:text-base">
                Indus Orbit is a research and product company creating AI tools
                and human networks that bring India's youth, industry experts,
                founders, investors and the diaspora into one orbit.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-5 py-2.5 text-sm font-semibold text-[var(--parchment)] hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] transition"
                >
                  Our story <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--indigo-night)]/20 px-5 py-2.5 text-sm font-medium text-[var(--indigo-night)] hover:bg-[var(--indigo-night)]/5"
                >
                  Get in touch
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATEMENT */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            A different kind of AI company
          </p>
          <h2 className="mt-5 font-display text-4xl font-medium leading-tight text-balance md:text-6xl">
            AI should connect people, not isolate them.
          </h2>
          <p className="mt-6 text-lg text-foreground/70 text-balance">
            By building the right tools and the right networks, we can lift
            India together — across cities, generations and industries.
          </p>
        </div>
      </section>

      {/* ORBIT VISION */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl rounded-3xl bg-[var(--indigo-night)] p-8 text-[var(--parchment)] shadow-2xl md:p-16">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
                The Orbit
              </p>
              <h3 className="mt-4 font-display text-3xl font-medium leading-tight md:text-5xl">
                One orbit. Many walks of life.
              </h3>
              <p className="mt-5 text-[var(--parchment)]/75">
                India's next breakthroughs won't come from a lone founder in a
                garage — they'll come from networks of mentors, makers,
                investors, NRIs and young builders moving together. We design
                the gravity that holds them in the same orbit.
              </p>

              <ul className="mt-8 space-y-3 text-sm">
                {[
                  { i: <Sparkles className="h-4 w-4" />, t: "Tools for agent-native youth builders" },
                  { i: <Users className="h-4 w-4" />, t: "Mentorship from India's industry veterans" },
                  { i: <Globe2 className="h-4 w-4" />, t: "Bridges to global capital and the diaspora" },
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

            <OrbitDiagram />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <h3 className="font-display text-3xl font-medium leading-tight text-balance md:text-5xl">
            We're building tools for an India that builds itself.
          </h3>
          <p className="mt-5 text-foreground/70">
            If this resonates with you — as a founder, expert, investor,
            student, or someone who simply cares about India's next chapter —
            we'd love to hear from you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-6 py-3 text-sm font-semibold text-[var(--parchment)] hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] transition"
            >
              Come work with us <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/our-work"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-6 py-3 text-sm font-medium hover:bg-foreground/5"
            >
              See our work
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function OrbitDiagram() {
  const nodes = [
    { label: "Youth", angle: 200, color: "#60a5fa" },
    { label: "Founders", angle: 320, color: "#f87171" },
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
          stroke="rgba(255,255,255,0.18)"
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

        {/* Planets */}
        {nodes.map((n) => {
          const rad = (n.angle * Math.PI) / 180;
          const x = cx + rx * Math.cos(rad);
          const y = cy + ry * Math.sin(rad);
          // Push label outward radially
          const labelOffset = 16;
          const lx = cx + (rx + labelOffset) * Math.cos(rad);
          const ly = cy + (ry + labelOffset) * Math.sin(rad);
          // Anchor based on which side of the ellipse
          const anchor = lx < cx - 4 ? "end" : lx > cx + 4 ? "start" : "middle";
          return (
            <g key={n.label}>
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
      </svg>
    </div>
  );
}
