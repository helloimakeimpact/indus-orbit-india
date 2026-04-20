import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import aboutImg from "@/assets/about-banyan.jpg";
import { Link2, Sparkles, HeartHandshake } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Indus Orbit" },
      {
        name: "description",
        content:
          "Why India, why now. Indus Orbit is built around three pillars: connection, synergy and society.",
      },
      { property: "og:title", content: "About Indus Orbit" },
      {
        property: "og:description",
        content:
          "Connection · Synergy · Society — the three pillars of a general intelligence company built for India.",
      },
      { property: "og:image", content: aboutImg },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: aboutImg },
    ],
  }),
  component: AboutPage,
});

const pillars = [
  {
    icon: <Link2 className="h-5 w-5" />,
    title: "Connection",
    body: "We design tools and rituals that bring people together — across cities, generations, languages and industries. Intelligence that introduces, not replaces.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Synergy",
    body: "We help India's youth, founders, experts and investors compound each other's effort. Every relationship is leverage; every conversation is a door.",
  },
  {
    icon: <HeartHandshake className="h-5 w-5" />,
    title: "Society",
    body: "We measure success by how much we lift India — its small towns, its small businesses, its first-generation makers. Not just shareholders.",
  },
];

function AboutPage() {
  return (
    <SiteShell navTone="dark">
      <section className="relative h-[60svh] min-h-[440px] w-full overflow-hidden">
        <img
          src={aboutImg}
          alt="Pixel-art Indian village at dusk under a great banyan tree"
          width={1600}
          height={900}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--indigo-night)]/50 to-[var(--indigo-night)]/85" />
        <div className="absolute inset-0 flex items-end px-6 pb-16">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
              About
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-tight text-[var(--parchment)] md:text-6xl">
              Why India. Why now.
            </h1>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-medium leading-tight md:text-4xl">
              India's path will look different.
            </h2>
          </div>
          <div className="space-y-5 text-foreground/75">
            <p>
              The next decade of intelligence will not be won only by faster
              models or larger datasets. It will be won by the people, places
              and partnerships that decide how those tools get used.
            </p>
            <p>
              India is unusual. Our markets are dense, our diaspora is global,
              our young population is enormous, and our trust still travels
              through relationships. A general intelligence company for India
              has to honour all of that.
            </p>
            <p>
              Indus Orbit exists to build the tools, networks and rituals that
              fit how India actually works — and to make sure the upside lifts
              everyone in the orbit, not just the centre.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            Three pillars
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium md:text-5xl">
            Connection · Synergy · Society
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {pillars.map((p) => (
              <article
                key={p.title}
                className="rounded-3xl border border-border bg-card p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--saffron)] text-[var(--indigo-night)]">
                  {p.icon}
                </span>
                <h3 className="mt-5 font-display text-2xl font-medium">{p.title}</h3>
                <p className="mt-3 text-sm text-foreground/70">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-medium md:text-4xl">The team</h2>
          <p className="mt-3 max-w-2xl text-foreground/70">
            A small group of founders, researchers and builders splitting time
            between Delhi and Bengaluru. We're hiring across product, research
            and partnerships.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {["Founder", "Research", "Product", "Partnerships"].map((role) => (
              <div key={role} className="rounded-3xl border border-border bg-card p-6">
                <div className="aspect-square w-full rounded-2xl bg-gradient-to-br from-[var(--indigo-night)] to-[var(--saffron)]/60" />
                <p className="mt-4 font-display text-lg">{role}</p>
                <p className="text-xs uppercase tracking-wider text-foreground/50">
                  Indus Orbit
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-5 py-3 text-sm font-semibold text-[var(--parchment)] hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] transition"
            >
              Come work with us
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
