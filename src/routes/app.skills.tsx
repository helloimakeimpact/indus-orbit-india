import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Skill = Database["public"]["Tables"]["skills"]["Row"];

export const Route = createFileRoute("/app/skills")({
  component: AppSkillsPage,
});

function AppSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadSkills() {
      try {
        const { data, error } = await supabase
          .from("skills")
          .select("*")
          .eq("status", "published")
          .order("featured_on", { ascending: false, nullsFirst: false })
          .order("published_at", { ascending: false, nullsFirst: false });

        if (error) throw new Error(error.message);
        if (alive) {
          setLoadError(null);
          setSkills(data ?? []);
        }
      } catch (error) {
        if (alive) {
          setLoadError(error instanceof Error ? error.message : "Could not load skills.");
          setSkills([]);
        }
      } finally {
        if (alive) setLoaded(true);
      }
    }

    loadSkills();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter((skill) =>
      [skill.title, skill.summary, skill.category, skill.when_to_use, ...skill.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [skills, query]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 md:px-6 md:py-6">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7">
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--saffron)]">
          <BookOpenCheck className="h-3.5 w-3.5" /> Skills
        </span>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold md:text-4xl">
              Skills for building in India.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Practical playbooks, templates and operating patterns that turn S.O.D.A opportunities
              into repeatable execution.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search skills"
              className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-[var(--saffron)]/35"
            />
          </div>
        </div>
      </section>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Loading skills...</p>
      ) : loadError ? (
        <div className="rounded-2xl border border-dashed border-destructive/30 bg-card p-6 text-sm text-destructive">
          Could not load skills: {loadError}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((skill) => (
            <article
              key={skill.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[var(--indigo-night)]/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--indigo-night)]">
                  {skill.category}
                </span>
                {skill.time_estimate && (
                  <span className="text-xs text-muted-foreground">{skill.time_estimate}</span>
                )}
              </div>
              <h2 className="mt-4 font-display text-xl font-medium">{skill.title}</h2>
              {skill.summary && (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{skill.summary}</p>
              )}
              {skill.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {skill.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8">
          <Sparkles className="h-6 w-6 text-[var(--saffron)]" />
          <h2 className="mt-4 font-display text-2xl font-medium">Skills are being curated.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            The schema is ready; the library will fill with repeatable playbooks for S.O.D.A ideas,
            missions, capital, research and operating work.
          </p>
          <Link
            to="/app/soda"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-4 py-2 text-sm font-semibold text-[var(--parchment)]"
          >
            Explore S.O.D.A <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
