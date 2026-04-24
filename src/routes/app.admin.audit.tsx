import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: AuditLog,
});

type Entry = {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

function AuditLog() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Entry[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!loading && !isAdmin) { toast.error("Admins only"); navigate({ to: "/app" }); }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setBusy(true);
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const list = (data as unknown as Entry[] | null) ?? [];
      setRows(list);
      const ids = Array.from(new Set(list.map((r) => r.actor_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
        const map: Record<string, string> = {};
        for (const p of (profs as { user_id: string; display_name: string | null }[] | null) ?? []) {
          map[p.user_id] = p.display_name ?? p.user_id.slice(0, 8);
        }
        setActors(map);
      }
      setBusy(false);
    })();
  }, [isAdmin]);

  const filtered = rows.filter((r) => {
    if (!filter.trim()) return true;
    const q = filter.trim().toLowerCase();
    return (
      r.action.toLowerCase().includes(q) ||
      r.target_type.toLowerCase().includes(q) ||
      (actors[r.actor_id] ?? "").toLowerCase().includes(q) ||
      (r.reason ?? "").toLowerCase().includes(q)
    );
  });

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-medium">Audit log</h1>
      <p className="mt-2 text-sm text-muted-foreground">Every privileged action — last 500 entries.</p>
      <Input
        className="mt-6 max-w-md"
        placeholder="Filter by actor, action, or reason…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        {busy ? (
          <p className="p-6 text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-muted-foreground">No entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">When</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Target</th>
                  <th className="p-4">Reason</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-4 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-4">{actors[r.actor_id] ?? r.actor_id.slice(0, 8)}</td>
                    <td className="p-4"><Badge variant="secondary">{r.action}</Badge></td>
                    <td className="p-4 text-xs">{r.target_type}<br /><span className="text-muted-foreground">{r.target_id?.slice(0, 8) ?? "—"}</span></td>
                    <td className="p-4 text-sm">{r.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}