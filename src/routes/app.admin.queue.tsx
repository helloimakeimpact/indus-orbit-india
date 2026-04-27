import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEGMENT_META, type Segment } from "@/components/auth/segments";
import { getChapterProposals, approveChapterProposal, rejectChapterProposal } from "@/server/society.functions";

export const Route = createFileRoute("/app/admin/queue")({
  head: () => ({ meta: [{ title: "Admin Queues — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: AdminQueue,
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

function AdminQueue() {
  const { isAdmin, user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Pending[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [reason, setReason] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !isAdmin) { toast.error("Admins only"); navigate({ to: "/app" }); }
  }, [isAdmin, loading, navigate]);

  async function load() {
    setBusy(true);
    const [verifRes, propRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, user_id, display_name, headline, bio, city, country, orbit_segment, linkedin_url, website_url, segment_details, created_at")
        .eq("is_verified", false)
        .order("created_at", { ascending: false }),
      getChapterProposals()
    ]);
    
    const list = (verifRes.data as unknown as Pending[] | null) ?? [];
    list.sort((a, b) => completeness(b) - completeness(a));
    setRows(list);
    setProposals(propRes);
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

  async function handleApproveProposal(prop: any) {
    try {
      await approveChapterProposal({ data: {
        proposalId: prop.id,
        proposerId: prop.proposer_id,
        name: prop.proposed_name,
        city: prop.city,
        country: prop.country,
        rationale: prop.rationale
      }});
      toast.success(`Chapter ${prop.proposed_name} created successfully!`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleRejectProposal(proposalId: string) {
    try {
      await rejectChapterProposal(proposalId);
      toast.success("Proposal rejected");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <h1 className="font-display text-3xl font-medium">Admin Queues</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manage verifications and chapter proposals.</p>

      {busy ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : (
        <Tabs defaultValue="verifications" className="mt-8">
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none p-0 h-auto">
            <TabsTrigger value="verifications" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--saffron)] rounded-none px-6 py-3 font-medium">
              Verifications ({rows.length})
            </TabsTrigger>
            <TabsTrigger value="chapters" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--saffron)] rounded-none px-6 py-3 font-medium">
              Chapter Proposals ({proposals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verifications" className="pt-6 outline-none">
            {rows.length === 0 ? (
              <p className="mt-8 text-muted-foreground">Inbox zero — no pending profiles.</p>
            ) : (
              <div className="space-y-4">
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
          </TabsContent>

          <TabsContent value="chapters" className="pt-6 outline-none">
            {proposals.length === 0 ? (
              <p className="mt-8 text-muted-foreground">Inbox zero — no chapter proposals pending.</p>
            ) : (
              <div className="space-y-4">
                {proposals.map((prop) => (
                  <article key={prop.id} className="rounded-3xl border border-border bg-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-display text-lg font-semibold">{prop.proposed_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {prop.city}, {prop.country}
                        </p>
                      </div>
                      <Badge className="bg-[var(--saffron)] text-[var(--indigo-night)]">
                        Target Audience: {prop.target_audience}
                      </Badge>
                    </div>

                    <div className="space-y-4 mt-4 bg-muted/20 p-4 rounded-xl text-sm">
                      <div>
                        <span className="font-medium">Proposer:</span> {prop.profiles?.display_name || "Unknown"}
                      </div>
                      <div>
                        <span className="font-medium">Expected Size:</span> {prop.expected_size}
                      </div>
                      <div>
                        <span className="font-medium">Rationale:</span>
                        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{prop.rationale}</p>
                      </div>
                      <div>
                        <span className="font-medium">Proposer Background:</span>
                        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{prop.proposer_background}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <Button className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90" onClick={() => handleApproveProposal(prop)}>Approve & Create Chapter</Button>
                      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRejectProposal(prop.id)}>Reject</Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}