import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { SEGMENT_LIST, SEGMENT_META, type Segment } from "@/components/auth/segments";
import { VerifiedBadge } from "@/components/auth/VerifiedBadge";

export const Route = createFileRoute("/_app/directory")({
  head: () => ({ meta: [{ title: "Directory — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    segment: typeof s.segment === "string" && (SEGMENT_LIST as string[]).includes(s.segment) ? (s.segment as Segment) : undefined,
  }),
  component: DirectoryPage,
});

const FILTERS = ["all", ...SEGMENT_LIST] as const;
type Filter = (typeof FILTERS)[number];

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

function DirectoryPage() {
  const search = Route.useSearch();
  const [filter, setFilter] = useState<Filter>(search.segment ?? "all");
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (search.segment) setFilter(search.segment);
  }, [search.segment]);

  useEffect(() => {
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select("id, display_name, headline, city, country, orbit_segment, linkedin_url, website_url, is_verified")
      .eq("is_public", true);
    if (filter !== "all") q = q.eq("orbit_segment", filter as never);
    q.order("is_verified", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setMembers((data as unknown as Profile[] | null) ?? []);
        setLoading(false);
      });
  }, [filter]);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">Directory</p>
      <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">Members of the Orbit</h1>
      <p className="mt-2 max-w-2xl text-sm text-foreground/70">
        Public profiles across all stakeholder segments.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition ${
              filter === s
                ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                : "border-border hover:bg-foreground/5"
            }`}
          >
            {s === "all" ? "All" : SEGMENT_META[s as Segment].label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-12 text-muted-foreground">Loading…</p>
      ) : members.length === 0 ? (
        <p className="mt-12 text-muted-foreground">No members in this segment yet.</p>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <article key={m.id} className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{m.display_name ?? "Member"}</h3>
                  {m.is_verified && <VerifiedBadge />}
                </div>
                {m.orbit_segment && <Badge variant="secondary">{SEGMENT_META[m.orbit_segment].label}</Badge>}
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
  );
}
