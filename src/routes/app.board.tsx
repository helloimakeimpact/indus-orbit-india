import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SEGMENT_LIST, SEGMENT_META, type Segment } from "@/components/auth/segments";
import { ReportDialog } from "@/components/connect/ReportDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/board")({
  head: () => ({
    meta: [{ title: "Asks & Offers — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: BoardPage,
});

type Post = {
  id: string;
  author_id: string;
  kind: "ask" | "offer" | "open_problem";
  title: string;
  body: string;
  segment_target: Segment[];
  region: string | null;
  sector: string | null;
  expires_at: string;
  status: string;
  created_at: string;
};

function BoardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);
  const [kind, setKind] = useState<"all" | "ask" | "offer" | "open_problem">("all");
  const [seg, setSeg] = useState<Segment | "all">("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<Post | null>(null);

  async function load() {
    setBusy(true);
    let q = supabase
      .from("asks_offers")
      .select("*")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (kind !== "all") q = q.eq("kind", kind);
    const { data } = await q;
    let list = (data as unknown as Post[] | null) ?? [];
    if (seg !== "all")
      list = list.filter((p) => p.segment_target.length === 0 || p.segment_target.includes(seg));
    setRows(list);
    const ids = Array.from(new Set(list.map((p) => p.author_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      for (const p of (profs as { user_id: string; display_name: string | null }[] | null) ?? []) {
        map[p.user_id] = p.display_name ?? "Member";
      }
      setAuthors(map);
    }
    setBusy(false);
  }

  useEffect(() => {
    load();
  }, [kind, seg]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto w-full max-w-none">
      <div className="app-glass app-workspace-head rounded-2xl">
        <div className="app-workspace-head-main">
          <div className="app-workspace-title">
            <p className="app-workspace-kicker">📣 Board</p>
            <h1>Asks & Offers</h1>
            <p>Short posts from members. Anything you put up expires in 30 days.</p>
          </div>
          <div className="flex items-start justify-end gap-2">
            {user && (
              <Button
                size="sm"
                onClick={() => setComposeOpen(true)}
                className="h-8 rounded-full px-3"
              >
                ✍️ Post something
              </Button>
            )}
            <span className="app-chip" data-active="false">
              {busy ? "Loading posts" : `${rows.length} live post${rows.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>

        <div className="app-workspace-controls app-workspace-controls-single">
          <div className="app-filter-row">
            {(["all", "ask", "offer", "open_problem"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className="app-chip"
                data-active={kind === k}
              >
                {k === "all"
                  ? "🌐 All"
                  : k === "ask"
                    ? "🙏 Ask"
                    : k === "offer"
                      ? "🎁 Offer"
                      : "🔬 Research"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSeg("all")}
              className="app-chip"
              data-active={seg === "all"}
            >
              🌐 All segments
            </button>
            {SEGMENT_LIST.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeg(s)}
                className="app-chip"
                data-active={seg === s}
              >
                {SEGMENT_META[s].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {busy ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="app-glass mt-3 rounded-2xl p-3.5 text-sm text-muted-foreground">
          No posts match this filter.
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          {rows.map((p) => (
            <article
              key={p.id}
              className="rounded-2xl border border-border bg-card p-3.5 transition hover:border-foreground/20"
            >
              <div className="flex items-center justify-between">
                <Badge
                  variant={
                    p.kind === "ask"
                      ? "default"
                      : p.kind === "open_problem"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {p.kind === "open_problem"
                    ? "🔬 open problem"
                    : p.kind === "ask"
                      ? "🙏 ask"
                      : "🎁 offer"}
                </Badge>
                {user && user.id !== p.author_id && (
                  <button
                    onClick={() => setReportTarget(p)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Report"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                )}
              </div>
              <h3 className="mt-3 text-base font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-6">{p.body}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{authors[p.author_id] ?? "Member"}</span>
                {p.region && <span>· {p.region}</span>}
                {p.sector && <span>· {p.sector}</span>}
                <span>· expires {new Date(p.expires_at).toLocaleDateString()}</span>
              </div>
              {p.segment_target.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.segment_target.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px]">
                      {SEGMENT_META[s].label}
                    </Badge>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        userId={user?.id ?? null}
        onPosted={load}
      />
      {reportTarget && (
        <ReportDialog
          open={!!reportTarget}
          onOpenChange={(o) => !o && setReportTarget(null)}
          targetType="ask_offer"
          targetId={reportTarget.id}
          reporterId={user?.id ?? null}
        />
      )}
    </div>
  );
}

function ComposeDialog({
  open,
  onOpenChange,
  userId,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string | null;
  onPosted: () => void;
}) {
  const { userSegment } = useAuth();
  const [kind, setKind] = useState<"ask" | "offer" | "open_problem">("ask");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [region, setRegion] = useState("");
  const [sector, setSector] = useState("");
  const [targets, setTargets] = useState<Segment[]>([]);
  const [busy, setBusy] = useState(false);

  function toggle(s: Segment) {
    setTargets((t) => (t.includes(s) ? t.filter((x) => x !== s) : [...t, s]));
  }

  async function submit() {
    if (!userId) return;
    if (title.trim().length < 3) return toast.error("Title too short");
    if (body.trim().length < 10) return toast.error("Body too short");
    setBusy(true);
    const { error } = await supabase.from("asks_offers").insert({
      author_id: userId,
      kind,
      title: title.trim(),
      body: body.trim(),
      segment_target: targets,
      region: region.trim() || null,
      sector: sector.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Posted");
    setTitle("");
    setBody("");
    setRegion("");
    setSector("");
    setTargets([]);
    onOpenChange(false);
    onPosted();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post to the board</DialogTitle>
          <DialogDescription>
            Stays live for 30 days. Members can reply and admins can moderate.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          {(
            ["ask", "offer", ...(userSegment === "researcher" ? ["open_problem"] : [])] as const
          ).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k as "ask" | "offer" | "open_problem")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs uppercase tracking-wider",
                kind === k
                  ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                  : "border-border",
              )}
            >
              {k === "open_problem" ? "Research Problem" : k}
            </button>
          ))}
        </div>
        <Input
          placeholder="Title (3–120 chars)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
        />
        <Textarea
          placeholder="Details (10–500 chars)"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Region (optional)"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
          <Input
            placeholder="Sector (optional)"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Target segments (optional)
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {SEGMENT_LIST.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  targets.includes(s)
                    ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                    : "border-border",
                )}
              >
                {SEGMENT_META[s].label}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Posting…" : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
