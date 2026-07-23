import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, IndianRupee, AlertTriangle, MapPin, ExternalLink } from "lucide-react";
import { getSkillBySlug, type Skill } from "@/server/skill.functions";

export const Route = createFileRoute("/app/skills/$slug")({ component: SkillDetail });

function SkillDetail() {
  const { slug } = useParams({ from: "/app/skills/$slug" });
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getSkillBySlug(slug).then(setSkill).finally(() => setLoading(false)); }, [slug]);

  if (loading) return <p className="p-12 text-sm text-foreground/60">Loading…</p>;
  if (!skill) return (
    <div className="p-12">
      <Link to="/app/skills" className="inline-flex items-center gap-2 text-sm text-foreground/70"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <p className="mt-6 text-foreground/70">Skill not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link to="/app/skills" className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Skills</Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--saffron)]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--indigo-night)]">{skill.category}</span>
            {skill.badges.map((b) => <span key={b} className="rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] font-medium text-foreground/70">{b}</span>)}
          </div>
          <h1 className="mt-5 font-display text-3xl font-medium leading-tight md:text-5xl">{skill.title}</h1>
          {skill.summary && <p className="mt-4 max-w-3xl text-lg text-foreground/75">{skill.summary}</p>}
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Stat icon={Clock} label="Time" value={skill.time_estimate ?? "—"} />
          <Stat icon={IndianRupee} label="Cost" value={skill.cost_estimate ?? "—"} />
        </div>

        {skill.when_to_use && <Section title="When to use">{skill.when_to_use}</Section>}

        {skill.prerequisites?.length > 0 && (
          <Section title="Prerequisites">
            <ul className="mt-2 space-y-2">{skill.prerequisites.map((p, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--saffron)]" />{p.label}</li>)}</ul>
          </Section>
        )}

        {skill.steps?.length > 0 && (
          <Section title="Steps">
            <ol className="mt-3 space-y-5">{skill.steps.map((s, i) => (
              <li key={i} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--saffron)]">Step {i + 1}</p>
                <p className="mt-2 font-display text-lg font-medium">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">{s.body}</p>
              </li>
            ))}</ol>
          </Section>
        )}

        {skill.common_pitfalls && (
          <div className="mt-8 rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-900"><AlertTriangle className="h-3 w-3" /> Common pitfalls</p>
            <p className="mt-2 text-sm text-orange-950">{skill.common_pitfalls}</p>
          </div>
        )}

        {skill.india_context_notes && (
          <div className="mt-4 rounded-2xl border border-border bg-[var(--indigo-night)]/[0.04] p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/70"><MapPin className="h-3 w-3 text-[var(--saffron)]" /> India-context notes</p>
            <p className="mt-2 text-sm text-foreground/80">{skill.india_context_notes}</p>
          </div>
        )}

        {skill.templates?.length > 0 && (
          <Section title="Templates & resources">
            <ul className="mt-2 space-y-2">{skill.templates.map((t, i) => (
              <li key={i}>
                <a href={t.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--indigo-night)] hover:underline">
                  {t.label} <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}</ul>
          </Section>
        )}

        {skill.referenced_tools?.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {skill.referenced_tools.map((t) => <span key={t} className="rounded-full border border-border px-2.5 py-1 text-xs">{t}</span>)}
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
      <p className="mt-2 font-display text-lg font-medium">{value}</p>
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