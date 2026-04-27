import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { SEGMENT_LIST, SEGMENT_META, type Segment } from "@/components/auth/segments";
import { VerifiedBadge } from "@/components/auth/VerifiedBadge";
import { getSpotlights } from "@/server/society.functions";
import { Sparkles } from "lucide-react";

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
  orbit_segment: Segment | null;
  linkedin_url: string | null;
  website_url: string | null;
  is_verified: boolean;
};

const FILTERS = ["all", ...SEGMENT_LIST] as const;
type Filter = (typeof FILTERS)[number];

function MembersPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [spotlights, setSpotlights] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSpotlights().then(setSpotlights).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select("id, display_name, headline, city, country, orbit_segment, linkedin_url, website_url, is_verified")
      .eq("is_public", true);
    if (filter !== "all") {
      q = q.eq("orbit_segment", filter as never);
    }
    q.order("is_verified", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setMembers((data as unknown as Profile[] | null) ?? []);
        setLoading(false);
      });
  }, [filter]);

  return (
    <SiteShell>
      <section className="px-6 pt-32 pb-12">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">The Orbit</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-medium">Members</h1>
          <p className="mt-3 max-w-2xl text-foreground/70">
            People who've chosen to share themselves with the network.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full border px-4 py-1.5 text-sm capitalize transition ${
                  filter === s
                    ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                    : "border-border hover:bg-foreground/5"
                }`}
              >
                {s === "all" ? "All" : SEGMENT_META[s].label}
              </button>
            ))}
          </div>
          
          {spotlights.length > 0 && filter === "all" && (
            <div className="mt-12 mb-8">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-6 w-6 text-[var(--saffron)]" />
                <h2 className="font-display text-2xl font-medium">Member Spotlights</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {spotlights.map((s) => (
                  <div key={s.id} className="rounded-3xl border-2 border-[var(--saffron)]/30 bg-card p-6 relative overflow-hidden group hover:border-[var(--saffron)]/60 transition shadow-sm">
                    <div className="absolute top-0 right-0 h-32 w-32 bg-[var(--saffron)]/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                      <h3 className="font-display text-xl font-semibold">{s.profiles?.display_name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{s.profiles?.headline}</p>
                      <div className="mt-5 text-base leading-relaxed text-foreground/90 italic border-l-4 border-[var(--saffron)] pl-4">
                        "{s.writeup}"
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <p className="mt-12 text-muted-foreground">Loading…</p>
          ) : members.length === 0 ? (
            <p className="mt-12 text-muted-foreground">No members yet in this segment.</p>
          ) : (
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => (
                <article key={m.id} className="rounded-3xl border border-border bg-card p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-semibold">{m.display_name ?? "Member"}</h3>
                      {m.is_verified && <VerifiedBadge />}
                    </div>
                    {m.orbit_segment && (
                      <Badge variant="secondary">{SEGMENT_META[m.orbit_segment].label}</Badge>
                    )}
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
