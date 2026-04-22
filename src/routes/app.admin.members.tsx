import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/app/admin/members")({
  head: () => ({ meta: [{ title: "Members admin — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: AdminMembers,
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
};

const FILTERS = ["all", "verified", "pending", "public", ...SEGMENT_LIST] as const;
type Filter = (typeof FILTERS)[number];

function AdminMembers() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Row | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only");
      navigate({ to: "/app" });
    }
  }, [isAdmin, loading, navigate]);

  async function load() {
    setBusy(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setRows((data as unknown as Row[] | null) ?? []);
    setBusy(false);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const filtered = useMemo(() => {
    let r = rows;
    if (filter === "verified") r = r.filter((x) => x.is_verified);
    else if (filter === "pending") r = r.filter((x) => !x.is_verified);
    else if (filter === "public") r = r.filter((x) => x.is_public);
    else if (filter !== "all") r = r.filter((x) => x.orbit_segment === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((x) =>
        (x.display_name ?? "").toLowerCase().includes(q) ||
        (x.headline ?? "").toLowerCase().includes(q) ||
        (x.city ?? "").toLowerCase().includes(q) ||
        (x.country ?? "").toLowerCase().includes(q),
      );
    }
    return r;
  }, [rows, filter, search]);

  async function patch(row: Row, p: Record<string, unknown>) {
    const { error } = await supabase.from("profiles").update(p as never).eq("id", row.id);
    if (error) { toast.error(error.message); return false; }
    return true;
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl font-medium">Members</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Verify members, change segment, and toggle the public directory.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name, city, headline…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
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
                      <Select value={r.orbit_segment ?? ""} onValueChange={async (v) => { if (await patch(r, { orbit_segment: v })) { toast.success("Segment updated"); load(); } }}>
                        <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {SEGMENT_LIST.map((s) => (<SelectItem key={s} value={s}>{SEGMENT_META[s].label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Switch checked={r.is_verified} onCheckedChange={async (v) => { if (await patch(r, { is_verified: v })) { toast.success(v ? "Verified" : "Verification removed"); load(); } }} />
                        {r.is_verified && <VerifiedBadge />}
                      </div>
                    </td>
                    <td className="p-4">
                      <Switch checked={r.is_public} onCheckedChange={async (v) => { if (await patch(r, { is_public: v })) { toast.success(v ? "Listed" : "Hidden"); load(); } }} />
                    </td>
                    <td className="p-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => setActive(r)}>Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {active.display_name ?? "Member"}
                  {active.is_verified && <VerifiedBadge />}
                </SheetTitle>
                <SheetDescription>{active.headline ?? "No headline yet."}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <DetailRow label="Segment" value={active.orbit_segment ? SEGMENT_META[active.orbit_segment].label : "—"} />
                <DetailRow label="Location" value={[active.city, active.country, active.region].filter(Boolean).join(" · ") || "—"} />
                <DetailRow label="LinkedIn" value={active.linkedin_url ?? "—"} link={active.linkedin_url ?? undefined} />
                <DetailRow label="Website" value={active.website_url ?? "—"} link={active.website_url ?? undefined} />
                <DetailRow label="Joined" value={new Date(active.created_at).toLocaleDateString()} />
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

function DetailRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="mt-1 block break-all text-[var(--indigo-night)] hover:underline">{value}</a>
      ) : (
        <p className="mt-1 break-all">{value}</p>
      )}
    </div>
  );
}
