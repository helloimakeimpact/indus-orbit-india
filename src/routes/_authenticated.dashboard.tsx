import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, User, Users, ShieldCheck, Hourglass } from "lucide-react";
import { SEGMENT_META, type Segment } from "@/components/auth/segments";
import { VerifiedBadge } from "@/components/auth/VerifiedBadge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: Dashboard,
});

type ProfileBits = {
  display_name: string | null;
  orbit_segment: Segment | null;
  is_public: boolean;
  is_verified: boolean;
  headline: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
};

function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [profile, setProfile] = useState<ProfileBits | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, orbit_segment, is_public, is_verified, headline, bio, city, country")
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
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">The Orbit</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-medium">
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
      <p className="mt-3 text-foreground/70">Your gateway to India's intelligence network.</p>

      {profile && (
        <div className="mt-8 rounded-3xl border border-border bg-card p-6">
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
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full bg-[var(--saffron)]" style={{ width: `${completeness}%` }} />
          </div>
          {profile.headline && <p className="mt-4 text-sm text-foreground/80">{profile.headline}</p>}
        </div>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Card to="/profile" icon={<User className="h-5 w-5" />} title="Your profile" desc={`${completeness}% complete`} />
        <Card to="/members" icon={<Users className="h-5 w-5" />} title="Members" desc="Browse the public directory" />
        {isAdmin && (
          <Card to="/admin" icon={<ShieldCheck className="h-5 w-5" />} title="Admin" desc="Verify, segment, manage roles" />
        )}
      </div>
    </div>
  );
}

function Card({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group rounded-3xl border border-border bg-card p-6 transition hover:border-[var(--saffron)] hover:shadow-lg"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--saffron)]/15 text-[var(--indigo-night)]">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--indigo-night)] group-hover:gap-2 transition-all">
        Open <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
