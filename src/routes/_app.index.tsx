import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hourglass, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SEGMENT_META, type Segment } from "@/components/auth/segments";
import { VerifiedBadge } from "@/components/auth/VerifiedBadge";
import { SegmentHomeModules } from "@/components/app/SegmentHomeModules";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [{ title: "Home — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: AppHome,
});

type ProfileBits = {
  display_name: string | null;
  orbit_segment: Segment | null;
  is_verified: boolean;
  headline: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
};

function AppHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileBits | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, orbit_segment, is_verified, headline, bio, city, country")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data as unknown as ProfileBits | null));
  }, [user]);

  const completeness = (() => {
    if (!profile) return 0;
    const fields = [profile.display_name, profile.orbit_segment, profile.headline, profile.bio, profile.city];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const segmentMeta = profile?.orbit_segment ? SEGMENT_META[profile.orbit_segment] : null;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">The Orbit</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-medium md:text-4xl">
          Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}.
        </h1>
        {profile?.is_verified ? (
          <VerifiedBadge size="md" />
        ) : profile ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Hourglass className="h-3 w-3" /> Verification pending
          </span>
        ) : null}
      </div>

      {profile && (
        <div className="mt-6 rounded-3xl border border-border bg-card p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-3">
            {segmentMeta && (
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-3 py-1 text-xs font-semibold text-[var(--parchment)]">
                <segmentMeta.icon className="h-3 w-3" /> {segmentMeta.label}
              </span>
            )}
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Profile {completeness}% complete
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full bg-[var(--saffron)]" style={{ width: `${completeness}%` }} />
          </div>
          {profile.headline && <p className="mt-4 text-sm text-foreground/80">{profile.headline}</p>}
          {completeness < 80 && (
            <Link
              to="/app/profile"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--indigo-night)] hover:gap-2"
            >
              Finish your profile <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      {profile?.orbit_segment && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-medium">Built for you</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated for {SEGMENT_META[profile.orbit_segment].label.toLowerCase()}s in the Orbit.
          </p>
          <div className="mt-5">
            <SegmentHomeModules segment={profile.orbit_segment} />
          </div>
        </section>
      )}
    </div>
  );
}
