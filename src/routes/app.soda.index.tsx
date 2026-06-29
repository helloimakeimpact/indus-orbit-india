import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Sparkles,
  Flame,
  Filter,
  ArrowRight,
  Calendar,
  TrendingUp,
  Zap,
  BarChart3,
  Layers,
  Compass,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import sodaHero from "@/assets/soda-hero.jpg";
import { listPublishedSodaIdeas, getIdeaOfTheDay, type SodaIdea } from "@/server/soda.functions";

export const Route = createFileRoute("/app/soda/")({
  component: SodaInAppPage,
});

function SodaInAppPage() {
  const [ideas, setIdeas] = useState<SodaIdea[]>([]);
  const [iotd, setIotd] = useState<SodaIdea | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("all");

  useEffect(() => {
    Promise.all([listPublishedSodaIdeas(), getIdeaOfTheDay()])
      .then(([list, day]) => {
        setLoadError(null);
        setIdeas(list);
        setIotd(day);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Could not load S.O.D.A ideas.";
        setLoadError(message);
        setIdeas([]);
        setIotd(null);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const sectors = useMemo(() => {
    const s = new Set<string>();
    ideas.forEach((i) => i.sector && s.add(i.sector));
    return ["all", ...Array.from(s)];
  }, [ideas]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ideas.filter((i) => {
      if (sector !== "all" && i.sector !== sector) return false;
      if (!needle) return true;
      return [i.title, i.tagline, i.summary, i.why_now, ...(i.tags ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [ideas, q, sector]);

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden bg-[var(--indigo-night)] text-[var(--parchment)]">
        <img
          src={sodaHero}
          aria-hidden
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--indigo-night)]/70 to-[var(--indigo-night)]" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 md:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--parchment)]/25 bg-[var(--indigo-night)]/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            <Sparkles className="h-3 w-3" /> Members-only research desk
          </span>
          <h1 className="mt-5 font-display text-4xl font-light leading-[1.05] text-glow md:text-6xl">
            S.O.D.A List
          </h1>
          <p className="mt-2 font-display text-lg text-[var(--saffron)] md:text-xl">
            Startup Opportunities, Development &amp; Action
          </p>
          <p className="mt-5 max-w-2xl text-sm text-[var(--parchment)]/80 md:text-base">
            A living database of validated, India-first opportunities — with the market data, the
            timing thesis and the offer ladder you'd need to ship next week.
          </p>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-8 flex max-w-2xl items-center gap-2 rounded-full border border-[var(--parchment)]/25 bg-[var(--parchment)]/10 px-2 py-2 backdrop-blur-md"
          >
            <Search className="ml-3 h-4 w-4 text-[var(--parchment)]/70" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ideas, keywords, why-now…"
              className="w-full bg-transparent px-2 py-2 text-sm text-[var(--parchment)] placeholder:text-[var(--parchment)]/60 focus:outline-none"
            />
            <span className="hidden rounded-full bg-[var(--saffron)]/20 px-3 py-1 text-[11px] font-semibold text-[var(--saffron)] sm:inline">
              {filtered.length} ideas
            </span>
          </form>
        </div>
      </section>

      {/* IDEA OF THE DAY */}
      {iotd && (
        <section className="px-6 py-12 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
                  Idea of the day
                </p>
                <h2 className="mt-2 font-display text-3xl font-medium md:text-4xl">{iotd.title}</h2>
              </div>
              <span className="hidden items-center gap-2 rounded-full bg-foreground/5 px-3 py-1 text-xs text-foreground/60 md:inline-flex">
                <Calendar className="h-3 w-3" /> {iotd.featured_on ?? "Featured"}
              </span>
            </div>

            <article className="grid gap-0 overflow-hidden rounded-3xl border border-border bg-card shadow-xl md:grid-cols-5">
              <div className="relative md:col-span-2 bg-[var(--indigo-night)] p-8 text-[var(--parchment)] md:p-10">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-[var(--saffron)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--saffron)]">
                    Opportunity {iotd.score_opportunity}/10
                  </span>
                </div>
                {iotd.tagline && (
                  <p className="mt-5 font-display text-2xl leading-snug">{iotd.tagline}</p>
                )}
                <p className="mt-4 text-sm text-[var(--parchment)]/80 line-clamp-6">
                  {iotd.summary}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {(iotd.badges ?? []).map((b) => (
                    <span
                      key={b}
                      className="rounded-full border border-[var(--parchment)]/25 px-2.5 py-1 text-[11px]"
                    >
                      {b}
                    </span>
                  ))}
                </div>
                <Link
                  to="/app/soda/$slug"
                  params={{ slug: iotd.slug }}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--saffron)] px-5 py-2.5 text-sm font-semibold text-[var(--indigo-night)] hover:opacity-90"
                >
                  Open full report <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid gap-5 p-8 md:col-span-3 md:p-10">
                <ScorePill label="Opportunity" v={iotd.score_opportunity} tone="emerald" />
                <ScorePill label="Problem" v={iotd.score_problem} tone="rose" />
                <ScorePill label="Feasibility" v={iotd.score_feasibility} tone="sky" />
                <ScorePill label="Why Now" v={iotd.score_why_now} tone="saffron" />
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Stat icon={BarChart3} label="Keyword" value={iotd.keyword ?? "—"} />
                  <Stat
                    icon={TrendingUp}
                    label="Growth"
                    value={iotd.growth_pct ? `+${iotd.growth_pct}%` : "—"}
                  />
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      {/* DATABASE */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
                Find your next idea
              </p>
              <h2 className="mt-2 font-display text-3xl font-medium md:text-4xl">
                Browse validated opportunities
              </h2>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-foreground/60" />
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]/40"
              >
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All sectors" : s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-foreground/60">Loading ideas…</p>
          ) : loadError ? (
            <div className="rounded-3xl border border-dashed border-destructive/30 bg-card p-12 text-center text-sm text-destructive">
              Could not load S.O.D.A ideas: {loadError}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-foreground/60">
              No ideas yet. Admins can add the first one from the S.O.D.A admin.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function IdeaCard({ idea }: { idea: SodaIdea }) {
  return (
    <Link
      to="/app/soda/$slug"
      params={{ slug: idea.slug }}
      className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--saffron)]/40 bg-[var(--saffron)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--indigo-night)]">
          {idea.sector}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/70">
          <Flame className="h-3.5 w-3.5 text-[var(--saffron)]" />
          {idea.score_opportunity}/10
        </span>
      </div>

      <h3 className="mt-4 font-display text-xl font-medium leading-snug group-hover:text-[var(--indigo-night)]">
        {idea.title}
      </h3>
      {idea.tagline && (
        <p className="mt-2 text-sm leading-relaxed text-foreground/70 line-clamp-3">
          {idea.tagline}
        </p>
      )}

      <div className="mt-5 rounded-2xl bg-[var(--indigo-night)]/[0.04] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
          Why now
        </p>
        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-foreground/75">
          {idea.why_now}
        </p>
      </div>

      <div className="mt-auto pt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
            Keyword
          </p>
          <p className="mt-1 text-xs font-medium text-foreground/80">
            {idea.keyword ?? "—"}
            {idea.growth_pct ? ` · +${idea.growth_pct}%` : ""}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--indigo-night)] px-3 py-1.5 text-[11px] font-semibold text-[var(--parchment)] group-hover:bg-[var(--saffron)] group-hover:text-[var(--indigo-night)] transition">
          Open <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-3">
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
        <Icon className="h-3 w-3 text-[var(--saffron)]" /> {label}
      </p>
      <p className="mt-1.5 font-display text-base font-medium leading-tight">{value}</p>
    </div>
  );
}

function ScorePill({
  label,
  v,
  tone,
}: {
  label: string;
  v: number;
  tone: "emerald" | "rose" | "sky" | "saffron";
}) {
  const toneClass = {
    emerald: "bg-emerald-400",
    rose: "bg-rose-400",
    sky: "bg-sky-400",
    saffron: "bg-[var(--saffron)]",
  }[tone];
  const pct = Math.min(100, Math.max(0, (v / 10) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-foreground/70">
        <span className="font-semibold uppercase tracking-[0.18em]">{label}</span>
        <span className="font-display text-lg text-foreground">{v}/10</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div className={`${toneClass} h-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
