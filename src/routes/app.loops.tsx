import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Search, Workflow } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Loop = Database["public"]["Tables"]["loops"]["Row"];

export const Route = createFileRoute("/app/loops")({
  component: AppLoopsPage,
});

function AppLoopsPage() {
  const [loops, setLoops] = useState<Loop[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadLoops() {
      try {
        const { data, error } = await supabase
          .from("loops")
          .select("*")
          .eq("status", "published")
          .order("featured_on", { ascending: false, nullsFirst: false })
          .order("published_at", { ascending: false, nullsFirst: false });

        if (error) throw new Error(error.message);
        if (alive) {
          setLoadError(null);
          setLoops(data ?? []);
        }
      } catch (error) {
        if (alive) {
          setLoadError(error instanceof Error ? error.message : "Could not load loops.");
          setLoops([]);
        }
      } finally {
        if (alive) setLoaded(true);
      }
    }

    loadLoops();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return loops;
    return loops.filter((loop) =>
      [
        loop.title,
        loop.summary,
        loop.domain,
        loop.problem_statement,
        loop.current_baseline_model,
        ...loop.tags,
        ...loop.stack,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [loops, query]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 md:px-6 md:py-6">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7">
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--saffron)]">
          <Workflow className="h-3.5 w-3.5" /> Loops
        </span>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold md:text-4xl">
              Loops for improving intelligent systems.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Baselines, evals, rerun triggers and operating rhythms for AI work that needs to keep
              getting better.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search loops"
              className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-[var(--saffron)]/35"
            />
          </div>
        </div>
      </section>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Loading loops...</p>
      ) : loadError ? (
        <div className="rounded-2xl border border-dashed border-destructive/30 bg-card p-6 text-sm text-destructive">
          Could not load loops: {loadError}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((loop) => (
            <article
              key={loop.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--indigo-night)]/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--indigo-night)]">
                  {loop.domain}
                </span>
                {loop.current_baseline_model && (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs">
                    {loop.current_baseline_model}
                  </span>
                )}
              </div>
              <h2 className="mt-4 font-display text-xl font-medium">{loop.title}</h2>
              {loop.summary && (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{loop.summary}</p>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <Score label="Speed" value={loop.score_iteration_speed} />
                <Score label="Eval" value={loop.score_eval_rigor} />
                <Score label="India" value={loop.score_india_fit} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8">
          <RefreshCw className="h-6 w-6 text-[var(--saffron)]" />
          <h2 className="mt-4 font-display text-2xl font-medium">Loops are being prepared.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            This library will connect S.O.D.A opportunities to concrete AI workflows: evals, agents,
            automation, benchmarks and iteration history.
          </p>
          <Link
            to="/app/skills"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-4 py-2 text-sm font-semibold text-[var(--parchment)]"
          >
            See Skills <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2">
      <p className="font-semibold text-foreground">{value}/10</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}
