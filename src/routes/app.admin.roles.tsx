import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/admin/roles")({
  head: () => ({ meta: [{ title: "Roles admin — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: AdminRoles,
});

type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  headline: string | null;
  city: string | null;
  country: string | null;
};

function AdminRoles() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  const [demoteTarget, setDemoteTarget] = useState<Profile | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only");
      navigate({ to: "/app" });
    }
  }, [isAdmin, loading, navigate]);

  async function load() {
    setBusy(true);
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id, user_id, display_name, headline, city, country").order("display_name"),
      supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);
    setProfiles((p as unknown as Profile[] | null) ?? []);
    setAdminIds(new Set(((r as { user_id: string }[] | null) ?? []).map((x) => x.user_id)));
    setBusy(false);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const admins = useMemo(() => profiles.filter((p) => adminIds.has(p.user_id)), [profiles, adminIds]);
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return profiles
      .filter((p) => !adminIds.has(p.user_id))
      .filter((p) => (p.display_name ?? "").toLowerCase().includes(q) || (p.headline ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [profiles, adminIds, search]);

  async function promote(p: Profile) {
    const { error } = await supabase.from("user_roles").insert({ user_id: p.user_id, role: "admin" });
    if (error) return toast.error(error.message);
    toast.success(`${p.display_name ?? "Member"} is now an admin`);
    setSearch("");
    load();
  }

  async function demote(p: Profile) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", p.user_id)
      .eq("role", "admin");
    if (error) return toast.error(error.message);
    toast.success("Admin removed");
    setDemoteTarget(null);
    load();
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <h1 className="font-display text-3xl font-medium">Roles</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manage who can verify members and edit profiles.</p>

      <section className="mt-8 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Promote a member</h2>
        <p className="mt-1 text-sm text-muted-foreground">Search by name or headline.</p>
        <Input
          className="mt-3"
          placeholder="Type to search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <div className="mt-3 space-y-2">
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches.</p>
            ) : (
              candidates.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="font-medium">{c.display_name ?? "Member"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[c.headline, [c.city, c.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => promote(c)}>Make admin</Button>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Current admins</h2>
          <Badge variant="secondary">{admins.length}</Badge>
        </div>
        {busy ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : admins.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No admins yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="font-medium">{a.display_name ?? "Member"}</p>
                  <p className="text-xs text-muted-foreground">{a.headline ?? "—"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setDemoteTarget(a)}>Remove admin</Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={!!demoteTarget} onOpenChange={(o) => !o && setDemoteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove admin?</AlertDialogTitle>
            <AlertDialogDescription>
              {demoteTarget?.display_name ?? "This member"} will lose admin powers immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => demoteTarget && demote(demoteTarget)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
