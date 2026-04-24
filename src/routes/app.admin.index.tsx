import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SEGMENT_LIST, SEGMENT_META, type Segment } from "@/components/auth/segments";

export const Route = createFileRoute("/app/admin/")({
  head: () => ({ meta: [{ title: "Admin dashboard — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

type Stats = {
  total: number;
  verified: number;
  publicCount: number;
  bySegment: Record<Segment, number>;
  pendingReports: number;
  openRequests: number;
  weekSignups: number;
};

function AdminDashboard() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only");
      navigate({ to: "/app" });
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: profiles }, { count: pendingReports }, { count: openRequests }] = await Promise.all([
        supabase.from("profiles").select("orbit_segment, is_verified, is_public, created_at"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("connection_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      const list = (profiles as { orbit_segment: Segment | null; is_verified: boolean; is_public: boolean; created_at: string }[] | null) ?? [];
      const bySegment = SEGMENT_LIST.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<Segment, number>);
      let verified = 0, publicCount = 0, weekSignups = 0;
      for (const p of list) {
        if (p.orbit_segment) bySegment[p.orbit_segment]++;
        if (p.is_verified) verified++;
        if (p.is_public) publicCount++;
        if (p.created_at >= weekAgo) weekSignups++;
      }
      setStats({
        total: list.length,
        verified,
        publicCount,
        bySegment,
        pendingReports: pendingReports ?? 0,
        openRequests: openRequests ?? 0,
        weekSignups,
      });
    })();
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl font-medium">Admin dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">Live snapshot of the orbit.</p>

      {!stats ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Stat label="Members" value={stats.total} />
            <Stat label="Verified" value={`${stats.verified} (${pct(stats.verified, stats.total)}%)`} />
            <Stat label="Public" value={stats.publicCount} />
            <Stat label="New this week" value={stats.weekSignups} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link to="/app/admin/queue" className="rounded-3xl border border-border bg-card p-6 transition hover:bg-foreground/5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending verification</p>
              <p className="mt-2 font-display text-3xl">{stats.total - stats.verified}</p>
              <p className="mt-1 text-xs text-[var(--saffron)]">Open queue →</p>
            </Link>
            <Link to="/app/admin/reports" className="rounded-3xl border border-border bg-card p-6 transition hover:bg-foreground/5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Open reports</p>
              <p className="mt-2 font-display text-3xl">{stats.pendingReports}</p>
              <p className="mt-1 text-xs text-[var(--saffron)]">Review →</p>
            </Link>
            <div className="rounded-3xl border border-border bg-card p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending requests</p>
              <p className="mt-2 font-display text-3xl">{stats.openRequests}</p>
              <p className="mt-1 text-xs text-muted-foreground">across all members</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">By segment</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {SEGMENT_LIST.map((s) => (
                <div key={s} className="rounded-xl border border-border p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{SEGMENT_META[s].label}</p>
                  <p className="mt-1 font-display text-xl">{stats.bySegment[s]}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}

function pct(n: number, d: number) {
  if (d === 0) return 0;
  return Math.round((n / d) * 100);
}