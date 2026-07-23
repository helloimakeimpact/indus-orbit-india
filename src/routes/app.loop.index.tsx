import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listPublishedLoops, type LoopEntry } from "@/server/loop.functions";
import { Search, Flame, Repeat, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/app/loop/")({
  head: () => ({ meta: [{ title: "Loop library — Indus Orbit" }] }),
  component: LoopIndex,
});

function score(l: LoopEntry) { return (l.score_iteration_speed + l.score_eval_rigor + l.score_business_value + l.score_india_fit) / 4; }

function LoopIndex() {
  const [rows, setRows] = useState<LoopEntry[]>([]);
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState("all");
  const [sort, setSort] = useState<"signal" | "newest">("signal");

  useEffect(() => { listPublishedLoops().then(setRows).catch(() => setRows([])); }, []);

  const domains = useMemo(() => ["all", ...Array.from(new Set(rows.map((r) => r.domain)))], [rows]);
  const filtered = useMemo(() => {
    let list = rows.filter((r) => domain === "all" || r.domain === domain);
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((r) => [r.title, r.summary, r.domain, ...r.tags].join(" ").toLowerCase().includes(needle));
    return sort === "signal" ? [...list].sort((a, b) => score(b) - score(a)) : [...list].sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime());
  }, [rows, q, domain, sort]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center gap-2 text-[var(--saffron)]">
          <Repeat className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.25em]">Loop library</p>
        </div>
        <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">Build the loop, not the agent.</h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/60">Working iteration loops — problem, eval set, minimum pipeline, and the trigger to re-run on the next frontier model.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search loops…" className="w-full rounded-full border border-border bg-card pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]/40" />
          </div>
          <select value={domain} onChange={(e) => setDomain(e.target.value)} className="rounded-full border border-border bg-card px-3 py-2 text-sm">
            {domains.map((d) => <option key={d} value={d}>{d === "all" ? "All domains" : d}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="rounded-full border border-border bg-card px-3 py-2 text-sm">
            <option value="signal">Sort: Signal</option>
            <option value="newest">Sort: Newest</option>
          </select>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => (
            <Link key={l.id} to="/app/loop/$slug" params={{ slug: l.slug }} className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--saffron)]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--indigo-night)]"><Repeat className="h-3 w-3" /> {l.domain}</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/70"><Flame className="h-3.5 w-3.5 text-[var(--saffron)]" />{Math.round(score(l) * 10)}</span>
              </div>
              <h3 className="mt-4 font-display text-xl font-medium leading-snug">{l.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground/70">{l.summary}</p>
              <div className="mt-auto pt-5 flex items-end justify-between gap-3">
                <div className="text-xs text-foreground/60">{l.current_baseline_model ?? "—"}</div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--indigo-night)] px-3 py-1.5 text-[11px] font-semibold text-[var(--parchment)]">Open <ArrowRight className="h-3 w-3" /></span>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <p className="text-sm text-foreground/60">No loops match.</p>}
        </div>
      </div>
    </div>
  );
}