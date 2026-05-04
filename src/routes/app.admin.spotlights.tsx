import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Pencil, Trash2, Plus, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/app/admin/spotlights")({
  head: () => ({
    meta: [
      { title: "Spotlights admin — Indus Orbit" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSpotlights,
});

type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  headline: string | null;
  avatar_url: string | null;
};

type Spotlight = {
  id: string;
  user_id: string;
  writeup: string;
  headline: string | null;
  link: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  profiles?: Profile | null;
};

function AdminSpotlights() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Spotlight[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<Spotlight | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Spotlight | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only");
      navigate({ to: "/app" });
    }
  }, [isAdmin, loading, navigate]);

  async function load() {
    setBusy(true);
    const { data, error } = await supabase
      .from("spotlights")
      .select("*, profiles!spotlights_user_id_fkey(id, user_id, display_name, headline, avatar_url)")
      .order("display_order", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as unknown as Spotlight[] | null) ?? []);
    setBusy(false);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function toggleActive(s: Spotlight) {
    const { error } = await supabase
      .from("spotlights")
      .update({ is_active: !s.is_active })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(!s.is_active ? "Spotlight published" : "Spotlight hidden");
    load();
  }

  async function remove(s: Spotlight) {
    const { error } = await supabase.from("spotlights").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Spotlight removed");
    setDeleteTarget(null);
    load();
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium">Spotlights</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Feature members on the homepage. Active spotlights appear in display order (highest first).
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> New spotlight
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        {busy ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spotlights yet.</p>
        ) : (
          items.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{s.profiles?.display_name ?? "Unknown member"}</p>
                    {s.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Hidden</Badge>
                    )}
                    <Badge variant="outline">order {s.display_order}</Badge>
                  </div>
                  {s.headline && <p className="mt-1 text-sm text-muted-foreground">{s.headline}</p>}
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-foreground/90">
                    {s.writeup}
                  </p>
                  {s.link && (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-[var(--saffron)] underline"
                    >
                      {s.link}
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(s)}>
                    {s.is_active ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" /> Hide
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" /> Publish
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {creating && (
        <SpotlightDialog
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
      {editing && (
        <SpotlightDialog
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this spotlight?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the writeup. The member's profile is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && remove(deleteTarget)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SpotlightDialog({
  existing,
  onClose,
  onSaved,
}: {
  existing?: Spotlight;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [member, setMember] = useState<Profile | null>(existing?.profiles ?? null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [writeup, setWriteup] = useState(existing?.writeup ?? "");
  const [headline, setHeadline] = useState(existing?.headline ?? "");
  const [link, setLink] = useState(existing?.link ?? "");
  const [order, setOrder] = useState(existing?.display_order ?? 0);
  const [active, setActive] = useState(existing?.is_active ?? true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = search.trim();
    if (!q || existing) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, headline, avatar_url")
        .or(`display_name.ilike.%${q}%,headline.ilike.%${q}%`)
        .limit(8);
      if (!cancelled) setResults((data as unknown as Profile[] | null) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [search, existing]);

  async function save() {
    if (!member) return toast.error("Pick a member");
    if (!writeup.trim()) return toast.error("Write something about them");
    setBusy(true);
    if (existing) {
      const { error } = await supabase
        .from("spotlights")
        .update({
          writeup: writeup.trim(),
          headline: headline.trim() || null,
          link: link.trim() || null,
          display_order: order,
          is_active: active,
        })
        .eq("id", existing.id);
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
      toast.success("Spotlight updated");
    } else {
      const { error } = await supabase.from("spotlights").insert({
        user_id: member.user_id,
        featured_by: user!.id,
        writeup: writeup.trim(),
        headline: headline.trim() || null,
        link: link.trim() || null,
        display_order: order,
        is_active: active,
      });
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
      toast.success("Spotlight created");
    }
    onSaved();
  }

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit spotlight" : "New spotlight"}</DialogTitle>
          <DialogDescription>Feature a member on the homepage.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!existing && (
            <div className="space-y-2">
              <Label>Member</Label>
              {member ? (
                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="font-medium">{member.display_name ?? "Member"}</p>
                    <p className="text-xs text-muted-foreground">{member.headline ?? "—"}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setMember(null)}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Search by name or headline…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {results.length > 0 && (
                    <div className="space-y-1">
                      {results.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setMember(r);
                            setSearch("");
                          }}
                          className="flex w-full items-center justify-between rounded-lg border border-border p-2 text-left hover:bg-accent"
                        >
                          <div>
                            <p className="text-sm font-medium">{r.display_name ?? "Member"}</p>
                            <p className="text-xs text-muted-foreground">{r.headline ?? "—"}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Headline</Label>
            <Input
              placeholder="Short tagline (optional)"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Writeup *</Label>
            <Textarea
              rows={5}
              placeholder="Why this member deserves the spotlight…"
              value={writeup}
              onChange={(e) => setWriteup(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Link (optional)</Label>
            <Input
              placeholder="https://…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Display order</Label>
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value || "0", 10))}
              />
              <p className="text-[11px] text-muted-foreground">Higher = shown first.</p>
            </div>
            <div className="space-y-2">
              <Label>Active</Label>
              <div className="flex h-9 items-center gap-2">
                <Switch checked={active} onCheckedChange={setActive} />
                <span className="text-sm text-muted-foreground">
                  {active ? "Visible on homepage" : "Hidden"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : existing ? "Save changes" : "Create spotlight"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}