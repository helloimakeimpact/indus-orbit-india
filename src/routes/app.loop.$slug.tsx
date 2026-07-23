import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Repeat, Zap, IndianRupee, Timer, Sparkles } from "lucide-react";
import { getLoopBySlug, type LoopEntry } from "@/server/loop.functions";

export const Route = createFileRoute("/app/loop/$slug")({ component: LoopDetail });

function LoopDetail() {
  const { slug } = useParams({ from: "/app/loop/$slug" });
  const [loop, setLoop] = useState<LoopEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getLoopBySlug(slug).then(setLoop).finally(() => setLoading(false)); }, [slug]);

  if (loading) return <p className="p-12 text-sm text-foreground/60">Loading…</p>;
  if (!loop) return (
    <div className="p-12">
      <Link to="/app/loop" className="inline-flex items-center gap-2 text-sm text-foreground/70"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <p className="mt-6 text-foreground/70">Loop not found.</p>
    </div>
  );

  const l = loop;
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link to="/app/loop" className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Loop</Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--saffron)]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--indigo-night)]">{l.domain}</span>
            {l.badges.map((b) => <span key={b} className="rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] font-medium text-foreground/70">{b}</span>)}
          </div>
          <h1 className="mt-5 font-display text-3xl font-medium leading-tight md:text-5xl">{l.title}</h1>
          {l.summary && <p className="mt-4 max-w-3xl text-lg text-foreground/75">{l.summary}</p>}
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <Stat icon={Sparkles} label="Baseline model" value={l.current_baseline_model ?? "—"} />
          <Stat icon={IndianRupee} label="Cost / iteration" value={l.cost_per_iteration_inr ? `₹${l.cost_per_iteration_inr}` : "—"} />
          <Stat icon={Timer} label="Latency target" value={l.latency_target_ms ? `${l.latency_target_ms} ms` : "—"} />
          <Stat icon={Zap} label="Trigger" value={(l.trigger_to_rerun ?? "—").slice(0, 40)} />
        </div>

        {l.problem_statement && <Section title="Problem">{l.problem_statement}</Section>}
        {l.why_iterate && <Section title="Why iterate">{l.why_iterate}</Section>}

        <Section title="The loop">
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Box label="Input" value={l.minimum_loop?.input} />
            <Box label="Pipeline" value={l.minimum_loop?.pipeline} />
            <Box label="Output" value={l.minimum_loop?.output} />
            <Box label="Eval" value={l.minimum_loop?.eval} />
          </div>
        </Section>

        {l.eval_set_description && <Section title="Eval set">{l.eval_set_description}</Section>}
        {l.trigger_to_rerun && <Section title="Re-run trigger">{l.trigger_to_rerun}</Section>}

        {l.upgrade_history?.length > 0 && (
          <Section title="Upgrade history">
            <ol className="mt-3 space-y-3">{l.upgrade_history.map((u, i) => (
              <li key={i} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-[var(--saffron)]">{u.date}</p>
                <p className="mt-1 font-medium">{u.change}</p>
                {u.delta && <p className="mt-1 text-xs text-foreground/70">Delta: {u.delta}</p>}
              </li>
            ))}</ol>
          </Section>
        )}

        {l.stack?.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            <p className="w-full text-xs font-semibold uppercase tracking-wider text-foreground/60">Stack</p>
            {l.stack.map((t) => <span key={t} className="rounded-full border border-border px-2.5 py-1 text-xs">{t}</span>)}
          </div>
        )}

        {l.related_soda_slug && (
          <div className="mt-8 rounded-2xl border border-border bg-[var(--indigo-night)]/[0.04] p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/70"><Repeat className="h-3 w-3 text-[var(--saffron)]" /> Powers a S.O.D.A idea</p>
            <Link to="/app/soda/$slug" params={{ slug: l.related_soda_slug }} className="mt-2 inline-block text-sm font-medium underline">Open the related idea →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55"><Icon className="h-3 w-3 text-[var(--saffron)]" /> {label}</p>
      <p className="mt-2 font-display text-sm font-medium leading-tight">{value}</p>
    </div>
  );
}

function Box({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--saffron)]">{label}</p>
      <p className="mt-2 text-sm text-foreground/85">{value ?? "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-medium">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}