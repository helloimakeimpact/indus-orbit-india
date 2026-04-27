import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/app/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: ReportsPage,
});

type Report = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: "open" | "actioned" | "dismissed";
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

const TABS: Array<{ key: Report["status"]; label: string }> = [
  { key: "open", label: "Open" },
  { key: "actioned", label: "Actioned" },
  { key: "dismissed", label: "Dismissed" },
];

function ReportsPage() {
  const { isAdmin, user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Report["status"]>("open");
  const [rows, setRows] = useState<Report[]>([]);
  const [busy, setBusy] = useState(true);
  const [note, setNote] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !isAdmin) { toast.error("Admins only"); navigate({ to: "/app" }); }
  }, [isAdmin, loading, navigate]);

  async function load() {
    setBusy(true);
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("status", tab)
      .order("created_at", { ascending: false });
    setRows((data as unknown as Report[] | null) ?? []);
    setBusy(false);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, tab]);

  async function resolve(r: Report, status: "actioned" | "dismissed") {
    if (!user) return;
    const n = (note[r.id] ?? "").trim();
    const { error } = await supabase
      .from("reports")
      .update({ status, resolution_note: n || null })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: `report.${status}`,
      target_type: r.target_type,
      target_id: r.target_id,
      reason: n || null,
      metadata: { report_id: r.id },
    });
    toast.success(`Marked ${status}`);
    load();
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <h1 className="font-display text-3xl font-medium">Reports</h1>
      <p className="mt-2 text-sm text-muted-foreground">Member-submitted flags on profiles, posts, requests, and endorsements.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition ${
              tab === t.key
                ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                : "border-border hover:bg-foreground/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {busy ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No reports here.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((r) => (
            <article key={r.id} className="rounded-3xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge variant="secondary">{r.target_type}</Badge>
                  <p className="mt-2 text-xs text-muted-foreground">
                    target id: {r.target_id.slice(0, 8)}… · reporter: {r.reporter_id.slice(0, 8)}… · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm">{r.reason}</p>
              {r.status !== "open" && r.resolution_note && (
                <p className="mt-3 rounded-xl bg-muted/40 p-3 text-xs">
                  Resolution: {r.resolution_note}
                </p>
              )}
              {r.status === "open" && (
                <>
                  <Textarea
                    className="mt-4"
                    rows={2}
                    placeholder="Resolution note (optional)"
                    value={note[r.id] ?? ""}
                    onChange={(e) => setNote((s) => ({ ...s, [r.id]: e.target.value }))}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => resolve(r, "actioned")}>Mark actioned</Button>
                    <Button variant="outline" onClick={() => resolve(r, "dismissed")}>Dismiss</Button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}