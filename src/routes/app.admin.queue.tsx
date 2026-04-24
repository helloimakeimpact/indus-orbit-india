import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SEGMENT_META, type Segment } from "@/components/auth/segments";

export const Route = createFileRoute("/app/admin/queue")({
  head: () => ({ meta: [{ title: "Verification queue — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: VerificationQueue,
});

type Pending = {
  id: string;
  user_id: string;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  orbit_segment: Segment | null;
  linkedin_url: string | null;
  website_url: string | null;
  segment_details: Record<string, unknown> | null;
  created_at: string;
};

function completeness(p: Pending) {
  const fields = [p.display_name, p.headline, p.bio, p.city, p.country, p.orbit_segment, p.linkedin_url || p.website_url];
  return fields.filter(Boolean).length;
}

function VerificationQueue() {
  const { isAdmin, user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(true);
  const [reason, setReason] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !isAdmin) { toast.error("Admins only"); navigate({ to: "/app" }); }
  }, [isAdmin, loading, navigate]);

  async function load() {
    setBusy(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, headline, bio, city, country, orbit_segment, linkedin_url, website_url, segment_details, created_at")
      .eq("is_verified", false)
      .order("created_at", { ascending: false });
    const list = (data as unknown as Pending[] | null) ?? [];
    list.sort((a, b) => completeness(b) - completeness(a));
    setRows(list);
    setBusy(false);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function decide(p: Pending, decision: "approved" | "declined" | "needs_more_info") {
    if (!user) return;
    const r = (reason[p.id] ?? "").trim();
    if ((decision === "declined" || decision === "needs_more_info") && r.length < 5) {
      toast.error("Please add a reason (5+ chars)");
      return;
    }
    if (decision === "approved") {
      const { error } = await supabase.from("profiles").update({ is_verified: true }).eq("id", p.id);
      if (error) return toast.error(error.message);
    }
    await supabase.from("verification_decisions").insert({
      profile_id: p.id,
      actor_id: user.id,
      decision,
      reason: r || null,
    });
    await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: `verification.${decision}`,
      target_type: "profile",
      target_id: p.id,
      reason: r || null,
    });
    toast.success(`Marked ${decision.replace("_", " ")}`);
    load();
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-medium">Verification queue</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ranked by profile completeness. Decisions are logged.</p>

      {busy ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Inbox zero — no pending profiles.</p>
      ) : (
        <div className="mt-8 space-y-4">
          {rows.map((p) => (
            <article key={p.id} className="rounded-3xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold">{p.display_name ?? "Unnamed member"}</h3>
                  <p className="text-sm text-muted-foreground">{p.headline ?? "—"}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {[p.city, p.country].filter(Boolean).join(" · ") || "No location"} · joined {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {p.orbit_segment && <Badge variant="secondary">{SEGMENT_META[p.orbit_segment].label}</Badge>}
                  <Badge>{completeness(p)}/7 complete</Badge>
                </div>
              </div>
              {p.bio && <p className="mt-3 text-sm">{p.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="text-[var(--indigo-night)] underline">LinkedIn</a>}
                {p.website_url && <a href={p.website_url} target="_blank" rel="noreferrer" className="text-[var(--indigo-night)] underline">Website</a>}
              </div>
              {p.segment_details && Object.keys(p.segment_details).length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">Segment details</summary>
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-muted/40 p-3 text-xs">{JSON.stringify(p.segment_details, null, 2)}</pre>
                </details>
              )}
              <Textarea
                className="mt-4"
                placeholder="Reason (required for decline / needs more info)"
                value={reason[p.id] ?? ""}
                onChange={(e) => setReason((s) => ({ ...s, [p.id]: e.target.value }))}
                rows={2}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => decide(p, "approved")}>Approve</Button>
                <Button variant="outline" onClick={() => decide(p, "needs_more_info")}>Needs more info</Button>
                <Button variant="outline" onClick={() => decide(p, "declined")}>Decline</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}