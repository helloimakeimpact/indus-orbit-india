import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SEGMENT_LIST, SEGMENT_META, type Segment } from "@/components/auth/segments";
import { VerifiedBadge } from "@/components/auth/VerifiedBadge";

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
  headline: string | null;
  city: string | null;
  country: string | null;
  region: string | null;
  orbit_segment: Segment | null;
  is_public: boolean;
  is_verified: boolean;
  segment_details: Record<string, unknown> | null;
  linkedin_url: string | null;
  website_url: string | null;
  created_at: string;
  is_admin: boolean;
};

const FILTERS = ["all", "verified", "pending", "public", ...SEGMENT_LIST] as const;
type Filter = (typeof FILTERS)[number];

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<Row | null>(null);

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
      .select("*")
      .order("created_at", { ascending: false });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "admin");
    const adminIds = new Set((roles ?? []).map((r) => r.user_id));
    const merged: Row[] = (profiles ?? []).map((p) => ({
      ...(p as unknown as Row),
      is_admin: adminIds.has((p as { user_id: string }).user_id),
    }));
    setRows(merged);
    setBusy(false);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "verified") return rows.filter((r) => r.is_verified);
    if (filter === "pending") return rows.filter((r) => !r.is_verified);
    if (filter === "public") return rows.filter((r) => r.is_public);
    return rows.filter((r) => r.orbit_segment === filter);
  }, [rows, filter]);

  async function patchProfile(row: Row, patch: Record<string, unknown>) {
    const { error } = await supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    return true;
  }

  async function toggleVerified(row: Row, value: boolean) {
    const ok = await patchProfile(row, { is_verified: value });
    if (ok) {
      toast.success(value ? "Marked as verified" : "Verification removed");
      load();
    }
  }

  async function togglePublic(row: Row, value: boolean) {
    const ok = await patchProfile(row, { is_public: value });
    if (ok) {
      toast.success(value ? "Listed in directory" : "Removed from directory");
      load();
    }
  }

  async function changeSegment(row: Row, segment: Segment) {
    const ok = await patchProfile(row, { orbit_segment: segment });
    if (ok) {
      toast.success(`Segment changed to ${SEGMENT_META[segment].label}`);
      load();
    }
  }

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
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: row.user_id, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Admin granted");
    }
    load();
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl font-medium">Stakeholder review</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Verify members, change their segment, list them in the public directory, and manage admin roles.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider transition ${
              filter === f
                ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                : "border-border hover:bg-foreground/5"
            }`}
          >
            {f === "all" ? "All" : f === "verified" ? "Verified" : f === "pending" ? "Pending" : f === "public" ? "Public" : SEGMENT_META[f as Segment].label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        {busy ? (
          <p className="p-6 text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-muted-foreground">No members in this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Member</th>
                  <th className="p-4">Segment</th>
                  <th className="p-4">Verified</th>
                  <th className="p-4">Public</th>
                  <th className="p-4">Role</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-4">
                      <div className="font-medium">{r.display_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {[r.city, r.country].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="p-4">
                      <Select
                        value={r.orbit_segment ?? ""}
                        onValueChange={(v) => changeSegment(r, v as Segment)}
                      >
                        <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {SEGMENT_LIST.map((s) => (
                            <SelectItem key={s} value={s}>{SEGMENT_META[s].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Switch checked={r.is_verified} onCheckedChange={(v) => toggleVerified(r, v)} />
                        {r.is_verified && <VerifiedBadge />}
                      </div>
                    </td>
                    <td className="p-4">
                      <Switch checked={r.is_public} onCheckedChange={(v) => togglePublic(r, v)} />
                    </td>
                    <td className="p-4">
                      {r.is_admin ? <Badge>Admin</Badge> : <Badge variant="secondary">Member</Badge>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setActive(r)}>
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant={r.is_admin ? "outline" : "default"}
                          onClick={() => toggleAdmin(r)}
                        >
                          {r.is_admin ? "Remove admin" : "Make admin"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {active.display_name ?? "Member"}
                  {active.is_verified && <VerifiedBadge />}
                </SheetTitle>
                <SheetDescription>
                  {active.headline ?? "No headline yet."}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <Row label="Segment" value={active.orbit_segment ? SEGMENT_META[active.orbit_segment].label : "—"} />
                <Row label="Location" value={[active.city, active.country, active.region].filter(Boolean).join(" · ") || "—"} />
                <Row label="LinkedIn" value={active.linkedin_url ?? "—"} link={active.linkedin_url ?? undefined} />
                <Row label="Website" value={active.website_url ?? "—"} link={active.website_url ?? undefined} />
                <Row label="Joined" value={new Date(active.created_at).toLocaleDateString()} />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Segment details</p>
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-muted/40 p-3 text-xs">
                    {JSON.stringify(active.segment_details ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="mt-1 block break-all text-[var(--indigo-night)] hover:underline">
          {value}
        </a>
      ) : (
        <p className="mt-1 break-all">{value}</p>
      )}
    </div>
  );
}