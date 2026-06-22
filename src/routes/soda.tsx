import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import sodaHero from "@/assets/soda-hero.jpg";
import { listPublishedSodaIdeas, type SodaIdea } from "@/server/soda.functions";
import {
  Search, Sparkles, TrendingUp, Zap, ArrowRight, Filter, Flame,
  Cpu, GraduationCap, HeartPulse, Leaf, Wallet, Tractor, Factory,
  ShoppingBag, Plane, Building2, Radio, Layers, Calendar, Target, BarChart3, Compass,
} from "lucide-react";

export const Route = createFileRoute("/soda")({
  head: () => ({
    meta: [
      { title: "S.O.D.A — Startup Opportunities, Development & Action | Indus Orbit" },
      {
        name: "description",
        content:
          "S.O.D.A (Startup Opportunities, Development & Action) is Indus Orbit's living database of startup opportunities for India — daily ideas, market signals, sector deep-dives and the builders moving on them.",
      },
      { property: "og:title", content: "S.O.D.A — Startup Opportunities, Development & Action" },
      { property: "og:image", content: sodaHero },
    ],
  }),
  component: SodaPage,
});

// ----- Seed data (static for now; later wired to Supabase) -----

type Idea = {
  slug: string;
  title: string;
  one_liner: string;
  sector: string;
  stage: "Whitespace" | "Early signal" | "Heating up" | "Crowded";
  why_now: string;
  market_size: string;
  signal_score: number; // 0-100
  tags: string[];
};

const SECTORS = [
  { key: "all", label: "All", icon: Layers },
  { key: "ai", label: "AI & Agents", icon: Cpu },
  { key: "edu", label: "Education", icon: GraduationCap },
  { key: "health", label: "Healthcare", icon: HeartPulse },
  { key: "climate", label: "Climate", icon: Leaf },
  { key: "fintech", label: "Fintech", icon: Wallet },
  { key: "agri", label: "Agritech", icon: Tractor },
  { key: "mfg", label: "Manufacturing", icon: Factory },
  { key: "commerce", label: "Commerce", icon: ShoppingBag },
  { key: "travel", label: "Travel", icon: Plane },
  { key: "govtech", label: "Govtech", icon: Building2 },
  { key: "media", label: "Media", icon: Radio },
];

const SECTOR_ALIAS: Record<string, string> = {
  health: "health",
  healthcare: "health",
  edtech: "edu",
  education: "edu",
  manufacturing: "mfg",
  agritech: "agri",
  retail: "commerce",
  media: "media",
  ai: "ai",
  fintech: "fintech",
  commerce: "commerce",
  travel: "travel",
  climate: "climate",
  govtech: "govtech",
  agri: "agri",
  mfg: "mfg",
  edu: "edu",
};

function deriveStage(score: number): Idea["stage"] {
  if (score >= 9) return "Heating up";
  if (score >= 7) return "Early signal";
  if (score >= 5) return "Whitespace";
  return "Crowded";
}

function ideaFromRow(row: SodaIdea): Idea {
  const sectorKey = SECTOR_ALIAS[(row.sector ?? "").toLowerCase()] ?? "all";
  const marketSize =
    row.market_label ||
    (row.volume ? `${row.volume.toLocaleString()} monthly searches` : "—");
  return {
    slug: row.slug,
    title: row.title,
    one_liner: row.tagline || row.summary || "",
    sector: sectorKey,
    stage: deriveStage(row.score_opportunity ?? 0),
    why_now: row.why_now || "",
    market_size: marketSize,
    signal_score: Math.round(
      (((row.score_opportunity ?? 0) +
        (row.score_problem ?? 0) +
        (row.score_feasibility ?? 0) +
        (row.score_why_now ?? 0)) /
        4) *
        10,
    ),
    tags: row.tags ?? [],
  };
}

const FALLBACK_IDEAS: Idea[] = [
  { slug: "vernacular-voice-agents", title: "Vernacular voice agents for Bharat SMBs", one_liner: "Always-on Hindi/Tamil/Telugu voice agents that take orders, book appointments and chase payments for 60M small businesses.", sector: "ai", stage: "Heating up", why_now: "Cheap inference + Sarvam/IndicTrans2 reaching parity with English on Indic ASR. WhatsApp Business API rolled out flow-based payments.", market_size: "$8B SMB software TAM in India by 2030", signal_score: 92, tags: ["voice", "vernacular", "smb", "whatsapp"] },
  { slug: "ai-tutor-jee-neet", title: "AI tutor for JEE / NEET tier-3 towns", one_liner: "A personalised AI prep companion priced at ₹299/month that replaces the ₹50k coaching gap for tier-3 aspirants.", sector: "edu", stage: "Heating up", why_now: "Byju's collapse opened the affordable mid-market. ~3M aspirants annually have no good option between free YouTube and unaffordable coaching.", market_size: "₹58,000 Cr test-prep market", signal_score: 88, tags: ["edtech", "jee", "neet", "regional"] },
  { slug: "rooftop-solar-financing", title: "BNPL rails for rooftop solar", one_liner: "Embedded financing layer that lets installers close residential solar in one visit — paperwork, underwriting and subsidy in 10 minutes.", sector: "climate", stage: "Early signal", why_now: "PM Surya Ghar Yojana targets 1 Cr homes by 2027. Discoms now mandated to net-meter within 30 days. Installer fragmentation = distribution wedge.", market_size: "$50B installed-capacity opportunity by 2030", signal_score: 84, tags: ["climate", "fintech", "embedded"] },
  { slug: "diagnostics-supply-rails", title: "Diagnostics supply rails for tier-2", one_liner: "Asset-light platform that lets standalone path labs match Thyrocare's pricing through pooled reagent procurement and reporting.", sector: "health", stage: "Whitespace", why_now: "Insurance penetration crossed 40% post-Ayushman Bharat. ~100k standalone labs squeezed by chains. Generic reagents now sub-30% the branded SKUs.", market_size: "$15B Indian diagnostics market", signal_score: 79, tags: ["b2b", "healthcare", "supply-chain"] },
  { slug: "ugc-msme-credit", title: "Cash-flow underwriting for kirana credit", one_liner: "Underwrite working-capital loans for kirana stores using UPI + GST + e-way bill data — no collateral, no paperwork, 24-hour disbursal.", sector: "fintech", stage: "Heating up", why_now: "Account Aggregator framework now covers 1.5B accounts. GSTN public APIs went live for fintechs in Q1. NBFC license backlog clearing.", market_size: "$340B MSME credit gap", signal_score: 90, tags: ["lending", "aa", "msme"] },
  { slug: "farm-to-export-fpo", title: "FPO-to-export operating system", one_liner: "Software + supply chain that lets Farmer Producer Organisations sell directly into Gulf & EU retailers, skipping 4 layers of mandi.", sector: "agri", stage: "Whitespace", why_now: "10,000 FPO scheme crossed funding milestone. UAE-India CEPA tariffs at 0% on most agri SKUs. Cold-chain density up 3x since 2020.", market_size: "$50B India agri-export TAM", signal_score: 76, tags: ["agritech", "export", "fpo"] },
  { slug: "design-for-india-mfg", title: "DFM copilots for India's contract manufacturers", one_liner: "AI assistant that converts a Western OEM's CAD pack into a ready-to-quote BOM for an Indian contract manufacturer in 4 hours instead of 4 weeks.", sector: "mfg", stage: "Early signal", why_now: "PLI 2.0 + China+1 pushed $40B of contract manufacturing inquiries to India in 2025. Engineering bandwidth is the bottleneck, not capacity.", market_size: "$300B contract manufacturing TAM by 2030", signal_score: 81, tags: ["pli", "supply-chain", "ai"] },
  { slug: "creator-commerce-tier2", title: "Live commerce stack for tier-2 creators", one_liner: "Shopify-for-livestreams aimed at 100k regional creators selling sarees, kitchenware and devotional goods on Instagram & Meesho Live.", sector: "commerce", stage: "Heating up", why_now: "Meesho Live and YouTube Shopping rolled out India SDKs. Reels commerce GMV crossed $2B run-rate. UPI payouts now T+0 for sellers.", market_size: "$20B social commerce by 2028", signal_score: 83, tags: ["creator", "social-commerce"] },
  { slug: "bharat-bleisure", title: "Bharat bleisure booking layer", one_liner: "B2B booking rails for the 200M Indian middle-class travellers MakeMyTrip is too expensive to serve — vernacular-first, EMI-default.", sector: "travel", stage: "Whitespace", why_now: "Domestic flyers crossed 150M in 2025. Tier-2 airport count doubled in 4 years. UPI on autopay finally cleared for travel.", market_size: "$75B domestic travel by 2030", signal_score: 71, tags: ["travel", "tier-2"] },
  { slug: "municipal-data-os", title: "Operating system for Indian municipalities", one_liner: "Plug-and-play data + payments stack for India's 4,000+ urban local bodies — property tax, water bills, complaints in one app.", sector: "govtech", stage: "Whitespace", why_now: "15th Finance Commission ringfenced ₹4.36 lakh Cr for ULB digitisation. AMRUT 2.0 mandates digital revenue reporting by 2027.", market_size: "₹50,000 Cr govtech TAM", signal_score: 74, tags: ["govtech", "urban", "data"] },
  { slug: "podcast-network-indic", title: "Indic-language podcast monetisation network", one_liner: "An ad + sponsorship network purpose-built for the 50k Hindi/Marathi/Tamil podcasters who can't get onto Spotify's brand deals.", sector: "media", stage: "Early signal", why_now: "Indic podcast listenership crossed English in 2025. Brand spend on audio still <2% of total digital — gap closing fast.", market_size: "₹4,000 Cr audio ad market by 2027", signal_score: 68, tags: ["audio", "indic", "creator"] },
  { slug: "campus-agent-builder", title: "Agent-builder studio for college clubs", one_liner: "A no-code agent studio that lets every IIT/NIT tech club ship one AI product per semester — distribution into 500 campuses on day one.", sector: "ai", stage: "Whitespace", why_now: "Bolt/Lovable normalized agent-native dev. 1.4M engineering grads/year. College clubs are the most underrated GTM in India.", market_size: "Unbounded — talent pipeline play", signal_score: 86, tags: ["ai", "campus", "community"] },
];

const STAGE_TONE: Record<Idea["stage"], string> = {
  Whitespace: "bg-[var(--saffron)]/15 text-[var(--indigo-night)] border-[var(--saffron)]/40",
  "Early signal": "bg-emerald-100 text-emerald-900 border-emerald-300/60",
  "Heating up": "bg-orange-100 text-orange-900 border-orange-300/60",
  Crowded: "bg-foreground/10 text-foreground/70 border-foreground/15",
};

function SodaPage() {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("all");
  const [sort, setSort] = useState<"signal" | "newest">("signal");
  const [rows, setRows] = useState<SodaIdea[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listPublishedSodaIdeas()
      .then((r) => setRows(r))
      .catch(() => setRows([]))
      .finally(() => setLoaded(true));
  }, []);

  // Public preview: top-5 by score + 5 latest by published_at (deduped).
  const publicIdeas: Idea[] = useMemo(() => {
    if (rows.length === 0) return loaded ? [] : FALLBACK_IDEAS;
    const byScore = [...rows].sort(
      (a, b) => (b.score_opportunity ?? 0) - (a.score_opportunity ?? 0),
    );
    const byDate = [...rows].sort(
      (a, b) =>
        new Date(b.published_at ?? 0).getTime() -
        new Date(a.published_at ?? 0).getTime(),
    );
    const picks: SodaIdea[] = [];
    const seen = new Set<string>();
    for (const r of byScore.slice(0, 5)) {
      if (!seen.has(r.id)) {
        picks.push(r);
        seen.add(r.id);
      }
    }
    for (const r of byDate.slice(0, 5)) {
      if (!seen.has(r.id)) {
        picks.push(r);
        seen.add(r.id);
      }
    }
    return picks.map(ideaFromRow);
  }, [rows, loaded]);

  const ideaOfDay: Idea = publicIdeas[0] ?? FALLBACK_IDEAS[0];

  const filtered = useMemo(() => {
    let list = publicIdeas.filter((i) => sector === "all" || i.sector === sector);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((i) =>
        [i.title, i.one_liner, i.why_now, ...i.tags].join(" ").toLowerCase().includes(needle),
      );
    }
    list = [...list].sort((a, b) =>
      sort === "signal" ? b.signal_score - a.signal_score : a.title.localeCompare(b.title),
    );
    return list;
  }, [q, sector, sort, publicIdeas]);

  return (
    <SiteShell navTone="dark">
      {/* HERO */}
      <section className="relative w-full overflow-hidden bg-[var(--indigo-night)] pt-36 pb-20 text-[var(--parchment)]">
        <img
          src={sodaHero}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--indigo-night)]/60 via-[var(--indigo-night)]/70 to-[var(--indigo-night)]" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--parchment)]/25 bg-[var(--indigo-night)]/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            <Sparkles className="h-3 w-3" /> A living database from Indus Orbit
          </span>
          <h1 className="mt-6 font-display text-5xl font-light leading-[1.05] text-glow md:text-7xl">
            S.O.D.A
          </h1>
          <p className="mt-3 font-display text-xl text-[var(--saffron)] md:text-2xl">
            Startup Opportunities, Development &amp; Action
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base text-[var(--parchment)]/85 md:text-lg">
            Every week, we surface the highest-signal startup ideas for India —
            with the market data, the timing thesis and the builders already
            moving on them.
          </p>

          {/* Search */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative mx-auto mt-10 flex max-w-2xl items-center gap-2 rounded-full border border-[var(--parchment)]/25 bg-[var(--parchment)]/10 px-2 py-2 backdrop-blur-md"
          >
            <Search className="ml-3 h-4 w-4 text-[var(--parchment)]/70" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ideas, sectors, market signals…"
              className="w-full bg-transparent px-2 py-2 text-sm text-[var(--parchment)] placeholder:text-[var(--parchment)]/60 focus:outline-none"
            />
            <a
              href="#database"
              className="rounded-full bg-[var(--saffron)] px-4 py-2 text-xs font-semibold text-[var(--indigo-night)] hover:opacity-90"
            >
              Browse all
            </a>
          </form>

          {/* Stat strip */}
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-4 text-left">
            {[
              { k: `${rows.length || "—"}+`, v: "Ideas indexed" },
              { k: "12", v: "Sectors mapped" },
              { k: "Daily", v: "New signal" },
            ].map((s) => (
              <div
                key={s.v}
                className="rounded-2xl border border-[var(--parchment)]/15 bg-[var(--parchment)]/5 px-5 py-4 backdrop-blur-md"
              >
                <p className="font-display text-3xl font-medium text-[var(--saffron)]">{s.k}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--parchment)]/65">
                  {s.v}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IDEA OF THE DAY */}
      <section className="px-6 py-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
                Idea of the day
              </p>
              <h2 className="mt-2 font-display text-3xl font-medium md:text-4xl">
                What we'd build if we had a weekend.
              </h2>
            </div>
            <span className="hidden items-center gap-2 rounded-full bg-foreground/5 px-3 py-1 text-xs text-foreground/60 md:inline-flex">
              <Calendar className="h-3 w-3" /> Updated daily
            </span>
          </div>

          <article className="grid gap-0 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl md:grid-cols-5">
            <div className="relative md:col-span-2 bg-[var(--indigo-night)] p-8 text-[var(--parchment)] md:p-10">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-[var(--saffron)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--saffron)]">
                  Signal {ideaOfDay.signal_score}/100
                </span>
              </div>
              <h3 className="mt-5 font-display text-3xl font-medium leading-tight md:text-4xl">
                {ideaOfDay.title}
              </h3>
              <p className="mt-4 text-[var(--parchment)]/80">{ideaOfDay.one_liner}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {ideaOfDay.tags.map((t: string) => (
                  <span
                    key={t}
                    className="rounded-full border border-[var(--parchment)]/25 px-2.5 py-1 text-[11px] text-[var(--parchment)]/80"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-6 p-8 md:col-span-3 md:p-10">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                  <Zap className="h-3 w-3 text-[var(--saffron)]" /> Why now
                </p>
                <p className="mt-3 leading-relaxed text-foreground/85">{ideaOfDay.why_now}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Stat icon={BarChart3} label="Market size" value={ideaOfDay.market_size} />
                <Stat icon={Target} label="Stage" value={ideaOfDay.stage} />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-5 py-2.5 text-sm font-semibold text-[var(--parchment)] hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] transition"
                >
                  Claim this idea <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#database"
                  className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-medium hover:bg-foreground/5"
                >
                  See similar opportunities
                </a>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* SECTOR PILLS + DATABASE */}
      <section id="database" className="px-6 pb-24">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
                The database
              </p>
              <h2 className="mt-2 font-display text-3xl font-medium md:text-4xl">
                A peek at what India needs next.
              </h2>
              <p className="mt-2 text-sm text-foreground/60">
                Showing this week's top-signal and freshest ideas. The full S.O.D.A database lives behind the Orbit — <Link to="/auth" className="font-semibold text-[var(--indigo-night)] underline">sign in</Link> to browse all {rows.length || ""} entries.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-foreground/60" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]/40"
              >
                <option value="signal">Sort: Signal score</option>
                <option value="newest">Sort: A → Z</option>
              </select>
            </div>
          </div>

          {/* sector chips */}
          <div className="mb-8 flex flex-wrap gap-2">
            {SECTORS.map((s) => {
              const Icon = s.icon;
              const active = sector === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSector(s.key)}
                  className={
                    "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition " +
                    (active
                      ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                      : "border-border bg-card text-foreground/75 hover:border-foreground/30")
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* grid */}
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-foreground/60">
              No ideas match that search yet. Try a broader keyword or another sector.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((idea) => (
                <IdeaCard key={idea.slug} idea={idea} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* WHY SODA */}
      <section className="bg-[var(--indigo-night)] px-6 py-24 text-[var(--parchment)]">
        <div className="mx-auto grid w-full max-w-7xl gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
              Why S.O.D.A
            </p>
            <h2 className="mt-4 font-display text-3xl font-medium leading-tight md:text-5xl">
              A research desk for the people building India next.
            </h2>
            <p className="mt-5 text-[var(--parchment)]/75">
              S.O.D.A is not a newsletter and not a fund. It's the research desk
              we wish we had when we started: every idea pressure-tested against
              market size, regulatory timing, distribution wedges and the
              builders already in motion.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--saffron)] px-5 py-2.5 text-sm font-semibold text-[var(--indigo-night)] hover:opacity-90"
              >
                Join the Orbit <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/our-work"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--parchment)]/25 px-5 py-2.5 text-sm font-medium hover:bg-[var(--parchment)]/5"
              >
                See our work
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              { i: TrendingUp, t: "Market timing, not just market size", d: "Every idea ships with a 'why now' thesis — regulation, infra, behaviour change." },
              { i: Compass, t: "Built for India, not transplanted", d: "We index for distribution in Bharat: vernacular, UPI rails, trust ladders." },
              { i: Sparkles, t: "Builders, not just bystanders", d: "Each idea links to the people already moving — find your co-founder in the Orbit." },
            ].map(({ i: Icon, t, d }) => (
              <div
                key={t}
                className="rounded-2xl border border-[var(--parchment)]/15 bg-[var(--parchment)]/[0.04] p-5 backdrop-blur"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--saffron)] text-[var(--indigo-night)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="font-display text-lg font-medium">{t}</h3>
                </div>
                <p className="mt-3 text-sm text-[var(--parchment)]/75">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-medium leading-tight md:text-5xl">
            Get one high-signal idea in your inbox every Sunday.
          </h2>
          <p className="mt-5 text-foreground/70">
            Curated by the Indus Orbit research team — no spam, no fluff, just the one
            opportunity worth thinking about this week.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-6 py-3 text-sm font-semibold text-[var(--parchment)] hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] transition"
          >
            Subscribe to S.O.D.A <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
        <Icon className="h-3 w-3 text-[var(--saffron)]" /> {label}
      </p>
      <p className="mt-2 font-display text-lg font-medium leading-tight">{value}</p>
    </div>
  );
}

function IdeaCard({ idea }: { idea: Idea }) {
  return (
    <article className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider " +
            STAGE_TONE[idea.stage]
          }
        >
          {idea.stage}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/70">
          <Flame className="h-3.5 w-3.5 text-[var(--saffron)]" />
          {idea.signal_score}
        </span>
      </div>

      <h3 className="mt-4 font-display text-xl font-medium leading-snug group-hover:text-[var(--indigo-night)]">
        {idea.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-foreground/70">{idea.one_liner}</p>

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
            Market
          </p>
          <p className="mt-1 text-xs font-medium text-foreground/80">{idea.market_size}</p>
        </div>
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
