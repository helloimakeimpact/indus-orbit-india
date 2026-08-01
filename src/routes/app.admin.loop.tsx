import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  listAllLoopsForAdmin,
  upsertLoop,
  deleteLoop,
  type LoopEntry,
} from "@/server/loop.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/app/admin/loop")({
  head: () => ({
    meta: [{ title: "Loop admin — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLoop,
});

function emptyLoop(): Partial<LoopEntry> {
  return {
    slug: "",
    title: "",
    summary: "",
    domain: "AI",
    tags: [],
    badges: [],
    problem_statement: "",
    why_iterate: "",
    minimum_loop: { input: "", pipeline: "", output: "", eval: "" },
    eval_set_description: "",
    current_baseline_model: "",
    trigger_to_rerun: "",
    upgrade_history: [],
    stack: [],
    cost_per_iteration_inr: null,
    latency_target_ms: null,
    related_soda_slug: null,
    score_iteration_speed: 7,
    score_eval_rigor: 7,
    score_business_value: 8,
    score_india_fit: 8,
    status: "draft",
    featured_on: null,
    hero_image_url: null,
  };
}

function toLoopStatusFilter(value: string): "all" | "draft" | "published" {
  return value === "draft" || value === "published" ? value : "all";
}

function AdminLoop() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<LoopEntry[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [editing, setEditing] = useState<Partial<LoopEntry> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only");
      navigate({ to: "/app" });
    }
  }, [isAdmin, loading, navigate]);

  async function load() {
    setRows(await listAllLoopsForAdmin());
  }
  useEffect(() => {
    if (isAdmin) void Promise.resolve().then(load);
  }, [isAdmin]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (!q.trim()) return true;
        const n = q.toLowerCase();
        return [r.title, r.slug, r.domain].join(" ").toLowerCase().includes(n);
      }),
    [rows, q, status],
  );

  async function save() {
    if (!editing?.title || !editing?.slug) return toast.error("Title and slug required");
    setBusy(true);
    try {
      await upsertLoop(editing);
      toast.success("Saved");
      setEditing(null);
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(l: LoopEntry) {
    await upsertLoop({ id: l.id, status: l.status === "published" ? "draft" : "published" });
    toast.success("Updated");
    load();
  }

  async function remove(l: LoopEntry) {
    if (!confirm(`Delete "${l.title}"?`)) return;
    await deleteLoop(l.id);
    toast.success("Deleted");
    load();
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium">Loop</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI iteration-loop blueprints. Build the loop, not the agent.
          </p>
        </div>
        <Button onClick={() => setEditing(emptyLoop())}>
          <Plus className="mr-2 h-4 w-4" /> New loop
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="pl-10"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(toLoopStatusFilter(e.target.value))}
          className="rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="mt-6 space-y-2">
        {filtered.map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{l.title}</p>
                <Badge variant={l.status === "published" ? "default" : "secondary"}>
                  {l.status}
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                /{l.slug} · {l.domain} · {l.current_baseline_model ?? "no baseline"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => togglePublish(l)}>
                {l.status === "published" ? "Unpublish" : "Publish"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(l)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(l)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No loops.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit loop" : "New loop"}</DialogTitle>
          </DialogHeader>
          {editing && <LoopForm value={editing} onChange={setEditing} onSave={save} busy={busy} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoopForm({
  value,
  onChange,
  onSave,
  busy,
}: {
  value: Partial<LoopEntry>;
  onChange: (v: Partial<LoopEntry>) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const set = <K extends keyof LoopEntry>(key: K, nextValue: LoopEntry[K]) =>
    onChange({ ...value, [key]: nextValue });
  const jsonField = (k: keyof LoopEntry, fallback: LoopEntry[keyof LoopEntry] = []) =>
    JSON.stringify(value[k] ?? fallback, null, 2);
  const parseJson = (k: keyof LoopEntry, s: string) => {
    try {
      set(k, JSON.parse(s));
    } catch {
      toast.error(`Invalid JSON for ${String(k)}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Title">
          <Input value={value.title ?? ""} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Slug">
          <Input value={value.slug ?? ""} onChange={(e) => set("slug", e.target.value)} />
        </Field>
        <Field label="Domain">
          <Input
            value={value.domain ?? ""}
            onChange={(e) => set("domain", e.target.value)}
            placeholder="Vernacular voice / RAG / Vision …"
          />
        </Field>
        <Field label="Status">
          <select
            value={value.status ?? "draft"}
            onChange={(e) => set("status", e.target.value === "published" ? "published" : "draft")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </Field>
        <Field label="Baseline model">
          <Input
            value={value.current_baseline_model ?? ""}
            onChange={(e) => set("current_baseline_model", e.target.value)}
          />
        </Field>
        <Field label="Related S.O.D.A slug (optional)">
          <Input
            value={value.related_soda_slug ?? ""}
            onChange={(e) => set("related_soda_slug", e.target.value || null)}
          />
        </Field>
        <Field label="Cost / iteration (₹)">
          <Input
            type="number"
            value={value.cost_per_iteration_inr ?? ""}
            onChange={(e) =>
              set("cost_per_iteration_inr", e.target.value ? Number(e.target.value) : null)
            }
          />
        </Field>
        <Field label="Latency target (ms)">
          <Input
            type="number"
            value={value.latency_target_ms ?? ""}
            onChange={(e) =>
              set("latency_target_ms", e.target.value ? Number(e.target.value) : null)
            }
          />
        </Field>
      </div>
      <Field label="Summary">
        <Textarea
          rows={2}
          value={value.summary ?? ""}
          onChange={(e) => set("summary", e.target.value)}
        />
      </Field>
      <Field label="Problem statement">
        <Textarea
          rows={2}
          value={value.problem_statement ?? ""}
          onChange={(e) => set("problem_statement", e.target.value)}
        />
      </Field>
      <Field label="Why iterate">
        <Textarea
          rows={2}
          value={value.why_iterate ?? ""}
          onChange={(e) => set("why_iterate", e.target.value)}
        />
      </Field>
      <Field label="Minimum loop (JSON: {input, pipeline, output, eval})">
        <Textarea
          rows={5}
          value={jsonField("minimum_loop", {})}
          onChange={(e) => parseJson("minimum_loop", e.target.value)}
          className="font-mono text-xs"
        />
      </Field>
      <Field label="Eval set">
        <Textarea
          rows={2}
          value={value.eval_set_description ?? ""}
          onChange={(e) => set("eval_set_description", e.target.value)}
        />
      </Field>
      <Field label="Re-run trigger">
        <Textarea
          rows={2}
          value={value.trigger_to_rerun ?? ""}
          onChange={(e) => set("trigger_to_rerun", e.target.value)}
        />
      </Field>
      <Field label='Upgrade history (JSON: [{"date","change","delta"}])'>
        <Textarea
          rows={4}
          value={jsonField("upgrade_history")}
          onChange={(e) => parseJson("upgrade_history", e.target.value)}
          className="font-mono text-xs"
        />
      </Field>
      <Field label='Stack (JSON: ["…"])'>
        <Textarea
          rows={2}
          value={jsonField("stack")}
          onChange={(e) => parseJson("stack", e.target.value)}
          className="font-mono text-xs"
        />
      </Field>
      <Field label='Tags (JSON: ["…"])'>
        <Textarea
          rows={2}
          value={jsonField("tags")}
          onChange={(e) => parseJson("tags", e.target.value)}
          className="font-mono text-xs"
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Iteration speed">
          <Input
            type="number"
            step="0.5"
            value={value.score_iteration_speed ?? 7}
            onChange={(e) => set("score_iteration_speed", Number(e.target.value))}
          />
        </Field>
        <Field label="Eval rigor">
          <Input
            type="number"
            step="0.5"
            value={value.score_eval_rigor ?? 7}
            onChange={(e) => set("score_eval_rigor", Number(e.target.value))}
          />
        </Field>
        <Field label="Business value">
          <Input
            type="number"
            step="0.5"
            value={value.score_business_value ?? 8}
            onChange={(e) => set("score_business_value", Number(e.target.value))}
          />
        </Field>
        <Field label="India-fit">
          <Input
            type="number"
            step="0.5"
            value={value.score_india_fit ?? 8}
            onChange={(e) => set("score_india_fit", Number(e.target.value))}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
