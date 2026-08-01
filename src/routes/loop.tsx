import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { listPublishedLoops, type LoopEntry } from "@/server/loop.functions";
import { ArrowRight, Sparkles, Search, Repeat, Zap, Flame, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/loop")({
  head: () => ({
    meta: [
      { title: "Loop — Build the loop, not the agent | Indus Orbit" },
      {
        name: "description",
        content:
          "A library of AI iteration loops built for India: problem, eval, minimum pipeline, and the trigger to re-run on the next frontier model.",
      },
      { property: "og:title", content: "Loop — Indus Orbit" },
      {
        property: "og:description",
        content: "AI iteration-loop blueprints for India-scale builders.",
      },
      { property: "og:url", content: "https://indus-spark-connect.lovable.app/loop" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://indus-spark-connect.lovable.app/loop" }],
  }),
  component: LoopPublic,
});

function score(l: LoopEntry) {
  return (
    (l.score_iteration_speed + l.score_eval_rigor + l.score_business_value + l.score_india_fit) / 4
  );
}

function LoopPublic() {
  const [rows, setRows] = useState<LoopEntry[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    listPublishedLoops()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  const publicList = useMemo(() => {
    const byScore = [...rows].sort((a, b) => score(b) - score(a));
    const byDate = [...rows].sort(
      (a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime(),
    );
    const seen = new Set<string>();
    const out: LoopEntry[] = [];
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
    (l) =>
      !q.trim() ||
      [l.title, l.summary, l.domain, ...l.tags].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <SiteShell navTone="dark">
      <section className="relative w-full overflow-hidden bg-[var(--indigo-night)] pt-36 pb-20 text-[var(--parchment)]">
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--parchment)]/25 bg-[var(--indigo-night)]/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            <Sparkles className="h-3 w-3" /> A living library from Indus Orbit
          </span>
          <h1 className="mt-6 font-display text-5xl font-light leading-[1.05] text-glow md:text-7xl">
            Loop
          </h1>
          <p className="mt-3 font-display text-xl text-[var(--saffron)] md:text-2xl">
            Build the loop, not the agent.
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base text-[var(--parchment)]/85 md:text-lg">
            Every entry is a working iteration loop — problem, eval set, minimum pipeline, and the
            trigger that re-runs it on the next frontier model.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative mx-auto mt-10 flex max-w-2xl items-center gap-2 rounded-full border border-[var(--parchment)]/25 bg-[var(--parchment)]/10 px-2 py-2 backdrop-blur-md"
          >
            <Search className="ml-3 h-4 w-4 text-[var(--parchment)]/70" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search loops, domains, models…"
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
              Loop of the day
            </p>
            <h2 className="mt-2 font-display text-3xl font-medium md:text-4xl">{ofDay.title}</h2>
            <p className="mt-4 max-w-3xl text-foreground/75">{ofDay.summary}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <MiniStat
                icon={Repeat}
                label="Baseline"
                value={ofDay.current_baseline_model ?? "—"}
              />
              <MiniStat
                icon={Zap}
                label="Re-run trigger"
                value={(ofDay.trigger_to_rerun ?? "—").slice(0, 60)}
              />
              <MiniStat
                icon={Flame}
                label="Cost/iter"
                value={ofDay.cost_per_iteration_inr ? `₹${ofDay.cost_per_iteration_inr}` : "—"}
              />
              <MiniStat icon={Sparkles} label="Domain" value={ofDay.domain} />
            </div>
            <div className="mt-6">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-5 py-2.5 text-sm font-semibold text-[var(--parchment)] hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] transition"
              >
                Open the full loop <ArrowRight className="h-4 w-4" />
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
                Loops the Orbit runs.
              </h2>
              <p className="mt-2 text-sm text-foreground/60">
                Top-signal and freshest loops.{" "}
                <Link to="/auth" className="font-semibold text-[var(--indigo-night)] underline">
                  Sign in
                </Link>{" "}
                for all {rows.length} entries.
              </p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((l) => (
              <LoopCard key={l.id} l={l} />
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
        <Icon className="h-3 w-3 text-[var(--saffron)]" />
        {label}
      </p>
      <p className="mt-2 font-display text-sm font-medium leading-tight">{value}</p>
    </div>
  );
}

function LoopCard({ l }: { l: LoopEntry }) {
  return (
    <article className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--saffron)]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--indigo-night)]">
          <Repeat className="h-3 w-3" /> {l.domain}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/70">
          <Flame className="h-3.5 w-3.5 text-[var(--saffron)]" />
          {Math.round(score(l) * 10)}
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-medium leading-snug">{l.title}</h3>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground/70">{l.summary}</p>
      <div className="mt-auto pt-5 flex items-end justify-between gap-3">
        <div className="text-xs text-foreground/60">{l.current_baseline_model ?? "—"}</div>
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
