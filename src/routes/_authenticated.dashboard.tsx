import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, User, Users, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; orbit_segment: string | null; is_public: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, orbit_segment, is_public")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const completeness = (() => {
    if (!profile) return 0;
    let n = 0;
    if (profile.display_name) n += 50;
    if (profile.orbit_segment) n += 50;
    return n;
  })();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">The Orbit</p>
      <h1 className="mt-3 font-display text-4xl font-medium">
        Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}.
      </h1>
      <p className="mt-3 text-foreground/70">Your gateway to India's intelligence network.</p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Card to="/profile" icon={<User className="h-5 w-5" />} title="Your profile" desc={`${completeness}% complete`} />
        <Card to="/members" icon={<Users className="h-5 w-5" />} title="Members" desc="Browse the public directory" />
        {isAdmin && (
          <Card to="/admin" icon={<ShieldCheck className="h-5 w-5" />} title="Admin" desc="Manage members and roles" />
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
