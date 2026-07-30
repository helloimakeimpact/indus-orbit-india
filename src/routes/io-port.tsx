import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  CircleDashed,
  Cpu,
  Gauge,
  Handshake,
  HeartHandshake,
  IndianRupee,
  KeyRound,
  Network,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/io-port")({
  head: () => ({
    meta: [
      { title: "I/O Port — India's People-Centred AI Gateway | Indus Orbit" },
      {
        name: "description",
        content:
          "I/O Port is Indus Orbit's planned people-centred AI gateway and terminal: transparent model intelligence, India-aware routing and shared compute capacity.",
      },
      { property: "og:title", content: "I/O Port — Indus Orbit" },
      {
        property: "og:description",
        content:
          "A people-centred AI gateway for India, being built around transparent routing, provider partnerships and shared capacity.",
      },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://indusorbit.com/io-port" }],
  }),
  component: IOPortPage,
});

type Status = "available" | "beta" | "next";

const statusCopy: Record<Status, { label: string; className: string }> = {
  available: {
    label: "Available",
    className: "bg-[var(--monsoon)]/20 text-emerald-900 ring-emerald-900/20",
  },
  beta: {
    label: "Private beta",
    className: "bg-[var(--saffron)]/20 text-amber-950 ring-amber-900/20",
  },
  next: {
    label: "Next",
    className:
      "bg-[var(--indigo-night)]/10 text-[var(--indigo-night)] ring-[var(--indigo-night)]/10",
  },
};

function StatusPill({ status, inverse = false }: { status: Status; inverse?: boolean }) {
  const item = statusCopy[status];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ring-1 ring-inset",
        inverse ? "bg-white/10 text-[var(--parchment)] ring-white/20" : item.className,
      )}
    >
      {status === "available" ? (
        <Check className="h-3 w-3" aria-hidden="true" />
      ) : (
        <CircleDashed className="h-3 w-3" aria-hidden="true" />
      )}
      {item.label}
    </span>
  );
}

const surfaces: Array<{
  name: string;
  eyebrow: string;
  description: string;
  detail: string;
  status: Status;
  icon: LucideIcon;
  href?: "/models";
}> = [
  {
    name: "Model Observatory",
    eyebrow: "See clearly",
    description: "Compare model intelligence, speed, latency and list price before choosing.",
    detail:
      "The first working public surface. Its data and methodology will keep becoming more transparent.",
    status: "available",
    icon: BarChart3,
    href: "/models",
  },
  {
    name: "I/O Port",
    eyebrow: "Route deliberately",
    description:
      "One India-aware API for matching each request to an appropriate model and capacity source.",
    detail:
      "The first cohort will test keys, budgets, policy controls, routing evidence and safe fallback.",
    status: "beta",
    icon: Network,
  },
  {
    name: "Control Room",
    eyebrow: "Know what happened",
    description: "A workspace for usage, spend, quality, latency, provider health and team policy.",
    detail: "Designed with builders and organisations; not yet available as a public product.",
    status: "beta",
    icon: Gauge,
  },
  {
    name: "I/O Terminal",
    eyebrow: "Build in context",
    description:
      "A branded terminal for planning, coding, running agents and reviewing their work.",
    detail:
      "Local-first foundations are planned, with hosted execution considered only after safety validation.",
    status: "next",
    icon: Terminal,
  },
  {
    name: "People layer",
    eyebrow: "Keep humans in the loop",
    description:
      "Teams, trusted peers and experts around the tools—not anonymous consumption alone.",
    detail: "Planned to build on the existing Indus Orbit member and conversation systems.",
    status: "beta",
    icon: Users,
  },
];

const capacityPools: Array<{
  title: string;
  label: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "Provider capacity",
    label: "Partnership model",
    body: "Capacity supplied through direct commercial and research partnerships with model and infrastructure providers.",
    icon: Handshake,
  },
  {
    title: "Orbit capacity",
    label: "Rented infrastructure",
    body: "Dedicated servers rented and operated for workloads where economics, control and reliability make sense.",
    icon: Server,
  },
  {
    title: "Commons capacity",
    label: "Donated or sponsored",
    body: "Verified compute grants and donated capacity directed to eligible builders, researchers and public-interest work.",
    icon: HeartHandshake,
  },
];

function TerminalPreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-white/20 bg-[#11142f] shadow-2xl shadow-black/30"
      role="img"
      aria-label="Concept preview of the I/O Terminal routing a request through I/O Port"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f17b61]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--saffron)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#75be91]" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          I/O Terminal · concept
        </span>
        <span className="rounded-full border border-[var(--saffron)]/30 bg-[var(--saffron)]/10 px-2 py-1 text-[9px] uppercase tracking-wider text-[var(--saffron)]">
          Preview
        </span>
      </div>
      <div className="grid min-h-[300px] md:grid-cols-[56px_1fr_190px]">
        <div className="hidden border-r border-white/10 py-4 md:flex md:flex-col md:items-center md:gap-3">
          {[Sparkles, Terminal, Network, Boxes].map((Icon, index) => (
            <span
              key={index}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-white/40",
                index === 1 && "bg-[var(--saffron)] text-[var(--indigo-night)]",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          ))}
        </div>
        <div className="p-5 font-mono text-xs leading-6 sm:p-7">
          <p className="text-white/40">Delhi workspace / public-interest prototype</p>
          <p className="mt-5 text-[var(--saffron)]">
            <span className="mr-2 text-white/30">❯</span>io route --intent research --budget ₹80
          </p>
          <div className="mt-5 space-y-1 text-white/60">
            <p>
              <span className="text-[#75be91]">✓</span> policy checked
            </p>
            <p>
              <span className="text-[#75be91]">✓</span> India preference applied
            </p>
            <p>
              <span className="text-[#75be91]">✓</span> cost ceiling respected
            </p>
          </div>
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Route evidence</p>
            <p className="mt-2 text-white/80">Best available fit for quality, consent and budget</p>
            <p className="mt-2 text-white/40">Estimated cost and provider shown before execution</p>
          </div>
        </div>
        <div className="border-t border-white/10 bg-white/[0.025] p-5 md:border-l md:border-t-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
            Control room
          </p>
          <div className="mt-5 space-y-4">
            {[
              ["Budget", "₹80 ceiling"],
              ["Data policy", "No training"],
              ["Region", "India preferred"],
              ["Capacity", "Partner first"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
                <p className="mt-1 text-xs text-white/70">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IOPortPage() {
  return (
    <SiteShell navTone="dark">
      <section className="relative overflow-hidden bg-[var(--indigo-night)] px-6 pb-24 pt-36 text-[var(--parchment)] sm:pt-40 md:pb-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 18% 20%, color-mix(in oklab, var(--saffron) 30%, transparent), transparent 28%), radial-gradient(circle at 82% 40%, color-mix(in oklab, var(--monsoon) 22%, transparent), transparent 30%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] bg-[size:44px_44px]" />
        </div>
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--saffron)]/30 bg-[var(--saffron)]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--saffron)]">
              <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />
              Private beta being built
            </div>
            <h1 className="mt-6 text-balance font-display text-5xl font-light leading-[0.98] sm:text-6xl md:text-8xl">
              Intelligence has a port of call.
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-balance text-base leading-7 text-[var(--parchment)]/70 md:text-lg">
              I/O Port is Indus Orbit's planned AI gateway and terminal: one place to compare, route
              and build with models—grounded in Indian economics and organised around people.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/models"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--saffron)] px-6 py-3 text-sm font-semibold text-[var(--indigo-night)] transition hover:bg-[var(--gold)] sm:w-auto"
              >
                Explore the Observatory
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--parchment)]/25 px-6 py-3 text-sm font-semibold text-[var(--parchment)] transition hover:bg-white/10 sm:w-auto"
              >
                Discuss a partnership
              </Link>
            </div>
            <p className="mt-5 text-xs text-[var(--parchment)]/50">
              The Observatory is public. Gateway, terminal and shared capacity access are not yet
              publicly available.
            </p>
          </div>
          <div className="mt-16 md:mt-20">
            <TerminalPreview />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card px-6 py-8" aria-label="Product status">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          <div className="flex gap-3">
            <StatusPill status="available" />
            <p className="text-xs leading-5 text-foreground/60">Public and usable now.</p>
          </div>
          <div className="flex gap-3">
            <StatusPill status="beta" />
            <p className="text-xs leading-5 text-foreground/60">
              Product and first cohort are being assembled; not open access.
            </p>
          </div>
          <div className="flex gap-3">
            <StatusPill status="next" />
            <p className="text-xs leading-5 text-foreground/60">
              Directional roadmap, subject to learning and partner readiness.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
              The system
            </p>
            <h2 className="mt-3 text-balance font-display text-4xl font-medium leading-tight md:text-6xl">
              Five surfaces. One human orbit.
            </h2>
            <p className="mt-5 max-w-2xl leading-7 text-foreground/70">
              I/O is a path from understanding a model to using it responsibly. Each surface makes a
              different decision visible instead of hiding everything behind a single chat box.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-6">
            {surfaces.map((surface, index) => {
              const Icon = surface.icon;
              const content = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--indigo-night)] text-[var(--saffron)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <StatusPill status={surface.status} />
                  </div>
                  <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/40">
                    {surface.eyebrow}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-medium">{surface.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-foreground/70">{surface.description}</p>
                  <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-foreground/50">
                    {surface.detail}
                  </p>
                  {surface.href && (
                    <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--indigo-night)]">
                      Open now <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  )}
                </>
              );
              const className = cn(
                "flex flex-col rounded-3xl border border-border bg-card p-6 shadow-sm",
                "transition hover:-translate-y-0.5 hover:shadow-lg",
                index < 2 ? "lg:col-span-3" : "lg:col-span-2",
              );
              return surface.href ? (
                <Link key={surface.name} to={surface.href} className={className}>
                  {content}
                </Link>
              ) : (
                <article key={surface.name} className={className}>
                  {content}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[var(--indigo-night)] px-6 py-24 text-[var(--parchment)]">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
                Partnership infrastructure
              </p>
              <h2 className="mt-3 text-balance font-display text-4xl font-medium leading-tight md:text-6xl">
                More than one road to compute.
              </h2>
            </div>
            <p className="max-w-2xl leading-7 text-[var(--parchment)]/70">
              The intended supply model combines provider partnerships, rented Indus Orbit servers
              and contributed capacity. Routing would only use a pool after commercial, technical,
              safety and provenance checks—not simply because capacity exists.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {capacityPools.map((pool) => {
              const Icon = pool.icon;
              return (
                <article
                  key={pool.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.045] p-7"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--saffron)] text-[var(--indigo-night)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <StatusPill status="next" inverse />
                  </div>
                  <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--saffron)]">
                    {pool.label}
                  </p>
                  <h3 className="mt-2 font-display text-2xl">{pool.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--parchment)]/70">{pool.body}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-8 rounded-3xl border border-[var(--saffron)]/25 bg-[var(--saffron)]/[0.06] p-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div>
              <p className="font-display text-xl">Capacity without capacity-washing.</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--parchment)]/60">
                No provider, server quantity, region, uptime or free allocation is promised here.
                Those details will be published only after agreements, benchmarks and operating
                controls are in place.
              </p>
            </div>
            <Link
              to="/contact"
              className="mt-5 inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--saffron)]/40 px-5 py-2.5 text-sm font-semibold text-[var(--saffron)] transition hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] sm:mt-0"
            >
              Offer capacity
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
              People at the centre
            </p>
            <h2 className="mt-3 text-balance font-display text-4xl font-medium leading-tight md:text-6xl">
              The router serves a community—not the reverse.
            </h2>
            <p className="mt-6 max-w-xl leading-7 text-foreground/70">
              The intended advantage is not simply access to more models. It is the surrounding
              trust layer: people who can share context, challenge a result, teach a skill and
              direct scarce capacity toward useful work.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: Users,
                title: "Identity before anonymity",
                body: "Member, team and organisation context can shape budgets, permissions and collaboration without selling personal data.",
              },
              {
                icon: ShieldCheck,
                title: "Consent before convenience",
                body: "Data policy, geography and provider constraints should be legible choices, recorded with each route.",
              },
              {
                icon: IndianRupee,
                title: "Indian economics in the interface",
                body: "INR estimates, budget ceilings and auditable mark-ups should make the true cost visible before and after a run.",
              },
              {
                icon: Cpu,
                title: "Capacity as public leverage",
                body: "Sponsored compute can support eligible students, researchers and missions with clear allocation and outcome rules.",
              },
              {
                icon: KeyRound,
                title: "Bring your relationship too",
                body: "Where supported, organisations should be able to bring provider agreements and keys while using common policy and observability.",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="grid gap-4 rounded-3xl border border-border bg-card p-6 sm:grid-cols-[52px_1fr]"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--saffron)]/20 text-[var(--indigo-night)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/30">
                      0{index + 1}
                    </p>
                    <h3 className="mt-1 font-display text-2xl">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-foreground/60">{item.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[var(--saffron)] px-7 py-14 text-[var(--indigo-night)] md:px-14 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] opacity-60">
                Help shape the first orbit
              </p>
              <h2 className="mt-3 max-w-3xl text-balance font-display text-4xl font-medium leading-tight md:text-6xl">
                Bring a workload, a model or capacity.
              </h2>
              <p className="mt-5 max-w-2xl leading-7 opacity-70">
                We want the private beta to be shaped by real Indian builders, teams, providers and
                public-interest organisations—not invented usage assumptions.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--indigo-night)] px-6 py-3 text-sm font-semibold text-[var(--parchment)] transition hover:bg-[var(--indigo-night)]/90"
              >
                Start a conversation
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/models"
                className="inline-flex items-center justify-center rounded-full border border-[var(--indigo-night)]/20 px-6 py-3 text-sm font-semibold transition hover:bg-[var(--indigo-night)]/10"
              >
                See what exists today
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
