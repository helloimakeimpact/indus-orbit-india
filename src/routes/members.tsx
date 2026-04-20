import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [
      { title: "Members — Indus Orbit" },
      { name: "description", content: "Meet the founders, experts, investors and diaspora in the Indus Orbit network." },
      { property: "og:title", content: "Members — Indus Orbit" },
      { property: "og:description", content: "Meet the people building India's next chapter." },
    ],
  }),
  component: MembersPage,
});

type Profile = {
  id: string;
  display_name: string | null;
  headline: string | null;
  city: string | null;
  country: string | null;
  orbit_segment: string | null;
  linkedin_url: string | null;
  website_url: string | null;
};

const SEGMENTS = ["all", "youth", "founder", "expert", "investor", "diaspora"] as const;

function MembersPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [filter, setFilter] = useState<(typeof SEGMENTS)[number]>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = supabase
      .from("profiles")
      .select("id, display_name, headline, city, country, orbit_segment, linkedin_url, website_url")
      .eq("is_public", true);
    if (filter !== "all") {
      q = q.eq("orbit_segment", filter);
    }
    q.order("created_at", { ascending: false }).then(({ data }) => {
      setMembers((data as Profile[] | null) ?? []);
      setLoading(false);
    });
  }, [filter]);

  return (
    <SiteShell>
      <section className="px-6 pt-32 pb-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">The Orbit</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-medium">Members</h1>
          <p className="mt-3 max-w-2xl text-foreground/70">
            People who've chosen to share themselves with the network.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {SEGMENTS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full border px-4 py-1.5 text-sm capitalize transition ${
                  filter === s
                    ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                    : "border-border hover:bg-foreground/5"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="mt-12 text-muted-foreground">Loading…</p>
          ) : members.length === 0 ? (
            <p className="mt-12 text-muted-foreground">No members yet in this segment.</p>
          ) : (
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => (
                <article key={m.id} className="rounded-3xl border border-border bg-card p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold">{m.display_name ?? "Member"}</h3>
                    {m.orbit_segment && <Badge variant="secondary" className="capitalize">{m.orbit_segment}</Badge>}
                  </div>
                  {m.headline && <p className="mt-1 text-sm text-foreground/80">{m.headline}</p>}
                  {(m.city || m.country) && (
                    <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                      {[m.city, m.country].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="mt-4 flex gap-3 text-sm">
                    {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noreferrer" className="text-[var(--indigo-night)] hover:underline">LinkedIn</a>}
                    {m.website_url && <a href={m.website_url} target="_blank" rel="noreferrer" className="text-[var(--indigo-night)] hover:underline">Website</a>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
