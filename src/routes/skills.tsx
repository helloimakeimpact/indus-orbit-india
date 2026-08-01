import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { listPublishedSkills, type Skill } from "@/server/skill.functions";
import { ArrowRight, Sparkles, Search, GraduationCap, Compass, Flame } from "lucide-react";

export const Route = createFileRoute("/skills")({
  head: () => ({
    meta: [
      { title: "Skills — India's reusable founder playbooks | Indus Orbit" },
      {
        name: "description",
        content:
          "A living library of India-specific founder playbooks: legal, GTM, hiring, ops and AI — battle-tested and refreshed by the Orbit.",
      },
      { property: "og:title", content: "Skills — Indus Orbit" },
      { property: "og:description", content: "Reusable, India-specific founder playbooks." },
      { property: "og:url", content: "https://indus-spark-connect.lovable.app/skills" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://indus-spark-connect.lovable.app/skills" }],
  }),
  component: SkillsPublic,
});

function score(s: Skill) {
  return (s.score_clarity + s.score_completeness + s.score_india_fit + s.score_freshness) / 4;
}

function SkillsPublic() {
  const [rows, setRows] = useState<Skill[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    listPublishedSkills()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  const publicList = useMemo(() => {
    const byScore = [...rows].sort((a, b) => score(b) - score(a));
    const byDate = [...rows].sort(
      (a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime(),
    );
    const seen = new Set<string>();
    const out: Skill[] = [];
    for (const r of byScore.slice(0, 5)) {
      if (!seen.has(r.id)) {
        out.push(r);
        seen.add(r.id);
      }
    }
    for (const r of byDate.slice(0, 5)) {
      if (!seen.has(r.id)) {
        out.push(r);
        seen.add(r.id);
      }
    }
    return out;
  }, [rows]);

  const ofDay = publicList[0];
  const filtered = publicList.filter(
    (s) =>
      !q.trim() ||
      [s.title, s.summary, s.category, ...s.tags].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <SiteShell navTone="dark">
      <section className="relative w-full overflow-hidden bg-[var(--indigo-night)] pt-36 pb-20 text-[var(--parchment)]">
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--parchment)]/25 bg-[var(--indigo-night)]/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            <Sparkles className="h-3 w-3" /> A living library from Indus Orbit
          </span>
          <h1 className="mt-6 font-display text-5xl font-light leading-[1.05] text-glow md:text-7xl">
            Skills
          </h1>
          <p className="mt-3 font-display text-xl text-[var(--saffron)] md:text-2xl">
            Reusable founder playbooks — built for India.
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base text-[var(--parchment)]/85 md:text-lg">
            Tight, repeatable procedures the Orbit has run before. From MCA incorporation to a
            kirana-store pilot — read, copy, ship.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative mx-auto mt-10 flex max-w-2xl items-center gap-2 rounded-full border border-[var(--parchment)]/25 bg-[var(--parchment)]/10 px-2 py-2 backdrop-blur-md"
          >
            <Search className="ml-3 h-4 w-4 text-[var(--parchment)]/70" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skills, categories, tools…"
              className="w-full bg-transparent px-2 py-2 text-sm text-[var(--parchment)] placeholder:text-[var(--parchment)]/60 focus:outline-none"
            />
            <a
              href="#list"
              className="rounded-full bg-[var(--saffron)] px-4 py-2 text-xs font-semibold text-[var(--indigo-night)] hover:opacity-90"
            >
              Browse all
            </a>
          </form>
        </div>
      </section>

      {ofDay && (
        <section className="px-6 py-20">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
              Skill of the day
            </p>
            <h2 className="mt-2 font-display text-3xl font-medium md:text-4xl">{ofDay.title}</h2>
            <p className="mt-4 max-w-3xl text-foreground/75">{ofDay.summary}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-5 py-2.5 text-sm font-semibold text-[var(--parchment)] hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] transition"
              >
                Open the full playbook <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section id="list" className="px-6 pb-24">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
                The library
              </p>
              <h2 className="mt-2 font-display text-3xl font-medium md:text-4xl">
                A peek at what the Orbit has already figured out.
              </h2>
              <p className="mt-2 text-sm text-foreground/60">
                Top-signal and freshest playbooks.{" "}
                <Link to="/auth" className="font-semibold text-[var(--indigo-night)] underline">
                  Sign in
                </Link>{" "}
                for the full library of {rows.length}.
              </p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <SkillCard key={s.id} s={s} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--indigo-night)] px-6 py-24 text-[var(--parchment)]">
        <div className="mx-auto max-w-3xl text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-[var(--saffron)]" />
          <h2 className="mt-6 font-display text-3xl font-medium md:text-5xl">
            Every skill you don't have to invent.
          </h2>
          <p className="mt-5 text-[var(--parchment)]/75">
            Join the Orbit to access every playbook, contribute your own, and see who in the network
            has run each one.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--saffron)] px-6 py-3 text-sm font-semibold text-[var(--indigo-night)] hover:opacity-90"
          >
            Join Indus Orbit <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}

function SkillCard({ s }: { s: Skill }) {
  return (
    <article className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--saffron)]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--indigo-night)]">
          <Compass className="h-3 w-3" /> {s.category}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/70">
          <Flame className="h-3.5 w-3.5 text-[var(--saffron)]" />
          {Math.round(score(s) * 10)}
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-medium leading-snug">{s.title}</h3>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground/70">{s.summary}</p>
      <div className="mt-auto pt-5 flex items-end justify-between gap-3">
        <div className="text-xs text-foreground/60">{s.time_estimate ?? "—"}</div>
        <Link
          to="/auth"
          className="inline-flex items-center gap-1 rounded-full bg-[var(--indigo-night)] px-3 py-1.5 text-[11px] font-semibold text-[var(--parchment)] hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] transition"
        >
          Open <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}
