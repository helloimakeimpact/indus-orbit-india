import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Flame, TrendingUp, BarChart3, Target, Sparkles, Building2 } from "lucide-react";
import { getSodaIdeaBySlug, type SodaIdea } from "@/server/soda.functions";

export const Route = createFileRoute("/app/soda/$slug")({
  component: SodaDetail,
});

function SodaDetail() {
  const { slug } = useParams({ from: "/app/soda/$slug" });
  const [idea, setIdea] = useState<SodaIdea | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getSodaIdeaBySlug(slug)
      .then((d) => {
        if (!d) setNotFound(true);
        else setIdea(d);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <p className="p-12 text-sm text-foreground/60">Loading…</p>;
  if (notFound || !idea) {
    return (
      <div className="p-12">
        <Link to="/app/soda" className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to S.O.D.A
        </Link>
        <p className="mt-6 text-foreground/70">Idea not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/app/soda" className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to S.O.D.A list
        </Link>

        {/* Header */}
        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--saffron)]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--indigo-night)]">
              {idea.sector}
            </span>
            {(idea.badges ?? []).map((b) => (
              <span key={b} className="rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] font-medium text-foreground/70">
                {b}
              </span>
            ))}
          </div>
          <h1 className="mt-5 font-display text-3xl font-medium leading-tight md:text-5xl">
            {idea.title}
          </h1>
          {idea.tagline && (
            <p className="mt-4 max-w-3xl text-lg text-foreground/75">{idea.tagline}</p>
          )}
        </header>

        {/* Scores grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard label="Opportunity" v={idea.score_opportunity} sub="Exceptional" tone="emerald" />
          <ScoreCard label="Problem" v={idea.score_problem} sub="Severity" tone="rose" />
          <ScoreCard label="Feasibility" v={idea.score_feasibility} sub="Buildable" tone="sky" />
          <ScoreCard label="Why Now" v={idea.score_why_now} sub="Perfect timing" tone="saffron" />
        </div>

        {/* Two col body */}
        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <article className="prose prose-neutral max-w-none lg:col-span-2">
            {idea.summary && (
              <>
                <h2 className="font-display text-2xl">Summary</h2>
                <p className="whitespace-pre-line text-foreground/85">{idea.summary}</p>
              </>
            )}
            {idea.why_now && (
              <>
                <h2 className="mt-10 font-display text-2xl">Why Now?</h2>
                <p className="whitespace-pre-line text-foreground/85">{idea.why_now}</p>
              </>
            )}
            {idea.market_gap && (
              <>
                <h2 className="mt-10 font-display text-2xl">The Market Gap</h2>
                <p className="whitespace-pre-line text-foreground/85">{idea.market_gap}</p>
              </>
            )}
            {idea.execution_plan && (
              <>
                <h2 className="mt-10 font-display text-2xl">Execution Plan</h2>
                <p className="whitespace-pre-line text-foreground/85">{idea.execution_plan}</p>
              </>
            )}

            {Array.isArray(idea.offer) && idea.offer.length > 0 && (
              <>
                <h2 className="mt-10 font-display text-2xl">Offer</h2>
                <ol className="not-prose mt-4 space-y-3">
                  {idea.offer.map((o, i) => (
                    <li key={i} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--indigo-night)] text-xs font-semibold text-[var(--parchment)]">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/60">
                          {o.tier}
                        </p>
                        <p className="font-display text-lg">
                          {o.name}{" "}
                          {o.price && <span className="text-sm text-foreground/60">({o.price})</span>}
                        </p>
                        {o.description && (
                          <p className="mt-1 text-sm text-foreground/75">{o.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </article>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                Keyword signal
              </p>
              <p className="mt-2 font-display text-xl">{idea.keyword ?? "—"}</p>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1 text-foreground/70">
                  <BarChart3 className="h-3.5 w-3.5 text-[var(--saffron)]" />
                  {idea.volume ? idea.volume.toLocaleString() : "—"} vol
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {idea.growth_pct ? `+${idea.growth_pct}%` : "—"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                Categorization
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-foreground/55 text-xs">Type</dt>
                  <dd className="font-medium">{idea.type_label ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-foreground/55 text-xs">Market</dt>
                  <dd className="font-medium">{idea.market_label ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-foreground/55 text-xs">Target</dt>
                  <dd className="font-medium">{idea.target_label ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-foreground/55 text-xs">Competitor</dt>
                  <dd className="font-medium">{idea.main_competitor ?? "—"}</dd>
                </div>
              </dl>
              {idea.trend_analysis && (
                <p className="mt-4 border-t border-border pt-3 text-xs text-foreground/70">
                  {idea.trend_analysis}
                </p>
              )}
            </div>

            {idea.business_fit && Object.keys(idea.business_fit).length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                  Business fit
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {Object.entries(idea.business_fit).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-3">
                      <span className="text-foreground/70 capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="font-medium text-right">{String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(idea.community_signals) && idea.community_signals.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                  Community signals
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {idea.community_signals.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <Sparkles className="h-3.5 w-3.5 flex-none text-[var(--saffron)] mt-0.5" />
                      <span><strong>{c.source}:</strong> {c.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(idea.top_keywords) && idea.top_keywords.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                  Top keywords
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {idea.top_keywords.map((k, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>{k.keyword}</span>
                      <span className="text-xs text-foreground/60">
                        {k.competition ?? ""} {k.volume ? `· ${k.volume.toLocaleString()}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, v, sub, tone }: { label: string; v: number; sub: string; tone: "emerald" | "rose" | "sky" | "saffron" }) {
  const bg = {
    emerald: "from-emerald-50 to-emerald-100/50",
    rose: "from-rose-50 to-rose-100/50",
    sky: "from-sky-50 to-sky-100/50",
    saffron: "from-[var(--saffron)]/10 to-[var(--saffron)]/20",
  }[tone];
  const bar = {
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    sky: "bg-sky-500",
    saffron: "bg-[var(--saffron)]",
  }[tone];
  return (
    <div className={`rounded-2xl border border-border bg-gradient-to-br ${bg} p-4`}>
      <p className="text-xs font-semibold text-foreground/70">{label}</p>
      <p className="mt-2 font-display text-4xl font-medium">{v}</p>
      <p className="text-xs text-foreground/60">{sub}</p>
      <div className="mt-3 h-1 rounded-full bg-foreground/10">
        <div className={`${bar} h-full rounded-full`} style={{ width: `${(v / 10) * 100}%` }} />
      </div>
    </div>
  );
}