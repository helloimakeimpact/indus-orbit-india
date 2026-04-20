import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Admin — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

type Row = {
  id: string;
  user_id: string;
  display_name: string | null;
  orbit_segment: string | null;
  is_public: boolean;
  is_admin: boolean;
};

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only");
      navigate({ to: "/dashboard" });
    }
  }, [isAdmin, loading, navigate]);

  async function load() {
    setBusy(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, orbit_segment, is_public")
      .order("created_at", { ascending: false });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "admin");
    const adminIds = new Set((roles ?? []).map((r) => r.user_id));
    const merged: Row[] = (profiles ?? []).map((p) => ({
      ...p,
      is_admin: adminIds.has(p.user_id),
    }));
    setRows(merged);
    setBusy(false);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function toggleAdmin(row: Row) {
    if (row.is_admin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", row.user_id)
        .eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin removed");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: row.user_id, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Admin granted");
    }
    load();
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl font-medium">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">All members. Toggle admin status as needed.</p>

      <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card">
        {busy ? (
          <p className="p-6 text-muted-foreground">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Segment</th>
                <th className="p-4">Public</th>
                <th className="p-4">Role</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-4 font-medium">{r.display_name ?? "—"}</td>
                  <td className="p-4 capitalize">{r.orbit_segment ?? "—"}</td>
                  <td className="p-4">{r.is_public ? "Yes" : "No"}</td>
                  <td className="p-4">
                    {r.is_admin ? <Badge>Admin</Badge> : <Badge variant="secondary">Member</Badge>}
                  </td>
                  <td className="p-4 text-right">
                    <Button size="sm" variant={r.is_admin ? "outline" : "default"} onClick={() => toggleAdmin(r)}>
                      {r.is_admin ? "Remove admin" : "Make admin"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
