import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listPublishedSkills, type Skill } from "@/server/skill.functions";
import { Search, Flame, Compass, ArrowRight, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/app/skills/")({
  head: () => ({ meta: [{ title: "Skills library — Indus Orbit" }] }),
  component: SkillsIndex,
});

function score(s: Skill) {
  return (s.score_clarity + s.score_completeness + s.score_india_fit + s.score_freshness) / 4;
}

function SkillsIndex() {
  const [rows, setRows] = useState<Skill[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"signal" | "newest">("signal");

  useEffect(() => {
    listPublishedSkills()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((r) => r.category)))],
    [rows],
  );
  const filtered = useMemo(() => {
    let list = rows.filter((r) => category === "all" || r.category === category);
    const needle = q.trim().toLowerCase();
    if (needle)
      list = list.filter((r) =>
        [r.title, r.summary, r.category, ...r.tags].join(" ").toLowerCase().includes(needle),
      );
    return sort === "signal"
      ? [...list].sort((a, b) => score(b) - score(a))
      : [...list].sort(
          (a, b) =>
            new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime(),
        );
  }, [rows, q, category, sort]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center gap-2 text-[var(--saffron)]">
          <GraduationCap className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.25em]">Skills library</p>
        </div>
        <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">
          Reusable founder playbooks for India.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/60">
          Every entry is a tight, repeatable procedure — steps, prerequisites, time, cost and
          pitfalls.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skills…"
              className="w-full rounded-full border border-border bg-card pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]/40"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-full border border-border bg-card px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "signal" | "newest")}
            className="rounded-full border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="signal">Sort: Signal</option>
            <option value="newest">Sort: Newest</option>
          </select>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <Link
              key={s.id}
              to="/app/skills/$slug"
              params={{ slug: s.slug }}
              className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--saffron)]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--indigo-night)]">
                  <Compass className="h-3 w-3" /> {s.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/70">
                  <Flame className="h-3.5 w-3.5 text-[var(--saffron)]" />
                  {Math.round(score(s) * 10)}
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl font-medium leading-snug">{s.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground/70">
                {s.summary}
              </p>
              <div className="mt-auto pt-5 flex items-end justify-between gap-3">
                <div className="text-xs text-foreground/60">{s.time_estimate ?? "—"}</div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--indigo-night)] px-3 py-1.5 text-[11px] font-semibold text-[var(--parchment)]">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <p className="text-sm text-foreground/60">No skills match.</p>}
        </div>
      </div>
    </div>
  );
}
