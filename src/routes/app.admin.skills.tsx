import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  listAllSkillsForAdmin,
  upsertSkill,
  deleteSkill,
  type Skill,
} from "@/server/skill.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/app/admin/skills")({
  head: () => ({
    meta: [{ title: "Skills admin — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminSkills,
});

function emptySkill(): Partial<Skill> {
  return {
    slug: "",
    title: "",
    summary: "",
    category: "Legal",
    tags: [],
    badges: [],
    when_to_use: "",
    prerequisites: [],
    steps: [],
    time_estimate: "",
    cost_estimate: "",
    common_pitfalls: "",
    india_context_notes: "",
    templates: [],
    referenced_tools: [],
    legal_refs: [],
    score_clarity: 7,
    score_completeness: 7,
    score_india_fit: 8,
    score_freshness: 8,
    status: "draft",
    featured_on: null,
    hero_image_url: null,
  };
}

function toSkillStatusFilter(value: string): "all" | "draft" | "published" {
  return value === "draft" || value === "published" ? value : "all";
}

function AdminSkills() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Skill[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [editing, setEditing] = useState<Partial<Skill> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only");
      navigate({ to: "/app" });
    }
  }, [isAdmin, loading, navigate]);

  async function load() {
    setRows(await listAllSkillsForAdmin());
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
        return [r.title, r.slug, r.category].join(" ").toLowerCase().includes(n);
      }),
    [rows, q, status],
  );

  async function save() {
    if (!editing?.title || !editing?.slug) return toast.error("Title and slug required");
    setBusy(true);
    try {
      await upsertSkill(editing);
      toast.success("Saved");
      setEditing(null);
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(s: Skill) {
    await upsertSkill({ id: s.id, status: s.status === "published" ? "draft" : "published" });
    toast.success("Updated");
    load();
  }

  async function remove(s: Skill) {
    if (!confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    await deleteSkill(s.id);
    toast.success("Deleted");
    load();
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium">Skills</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Reusable founder playbooks for India.
          </p>
        </div>
        <Button onClick={() => setEditing(emptySkill())}>
          <Plus className="mr-2 h-4 w-4" /> New skill
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
          onChange={(e) => setStatus(toSkillStatusFilter(e.target.value))}
          className="rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="mt-6 space-y-2">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{s.title}</p>
                <Badge variant={s.status === "published" ? "default" : "secondary"}>
                  {s.status}
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                /{s.slug} · {s.category}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => togglePublish(s)}>
                {s.status === "published" ? "Unpublish" : "Publish"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(s)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No skills.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit skill" : "New skill"}</DialogTitle>
          </DialogHeader>
          {editing && <SkillForm value={editing} onChange={setEditing} onSave={save} busy={busy} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SkillForm({
  value,
  onChange,
  onSave,
  busy,
}: {
  value: Partial<Skill>;
  onChange: (v: Partial<Skill>) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const set = <K extends keyof Skill>(key: K, nextValue: Skill[K]) =>
    onChange({ ...value, [key]: nextValue });
  const jsonField = (k: keyof Skill) => JSON.stringify(value[k] ?? [], null, 2);
  const parseJson = (k: keyof Skill, s: string) => {
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
          <Input
            value={value.slug ?? ""}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="incorporate-in-mca"
          />
        </Field>
        <Field label="Category">
          <Input
            value={value.category ?? ""}
            onChange={(e) => set("category", e.target.value)}
            placeholder="Legal / GTM / Hiring / Ops / AI"
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
        <Field label="Time estimate">
          <Input
            value={value.time_estimate ?? ""}
            onChange={(e) => set("time_estimate", e.target.value)}
            placeholder="2–3 days"
          />
        </Field>
        <Field label="Cost estimate">
          <Input
            value={value.cost_estimate ?? ""}
            onChange={(e) => set("cost_estimate", e.target.value)}
            placeholder="₹8,000 – ₹15,000"
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
      <Field label="When to use">
        <Textarea
          rows={2}
          value={value.when_to_use ?? ""}
          onChange={(e) => set("when_to_use", e.target.value)}
        />
      </Field>
      <Field label='Prerequisites (JSON: [{"label":"…"}])'>
        <Textarea
          rows={3}
          value={jsonField("prerequisites")}
          onChange={(e) => parseJson("prerequisites", e.target.value)}
          className="font-mono text-xs"
        />
      </Field>
      <Field label='Steps (JSON: [{"title":"…","body":"…"}])'>
        <Textarea
          rows={6}
          value={jsonField("steps")}
          onChange={(e) => parseJson("steps", e.target.value)}
          className="font-mono text-xs"
        />
      </Field>
      <Field label="Common pitfalls">
        <Textarea
          rows={2}
          value={value.common_pitfalls ?? ""}
          onChange={(e) => set("common_pitfalls", e.target.value)}
        />
      </Field>
      <Field label="India-context notes">
        <Textarea
          rows={2}
          value={value.india_context_notes ?? ""}
          onChange={(e) => set("india_context_notes", e.target.value)}
        />
      </Field>
      <Field label='Templates (JSON: [{"label":"…","url":"…"}])'>
        <Textarea
          rows={3}
          value={jsonField("templates")}
          onChange={(e) => parseJson("templates", e.target.value)}
          className="font-mono text-xs"
        />
      </Field>
      <Field label='Tags (JSON: ["a","b"])'>
        <Textarea
          rows={2}
          value={jsonField("tags")}
          onChange={(e) => parseJson("tags", e.target.value)}
          className="font-mono text-xs"
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Clarity">
          <Input
            type="number"
            step="0.5"
            value={value.score_clarity ?? 7}
            onChange={(e) => set("score_clarity", Number(e.target.value))}
          />
        </Field>
        <Field label="Completeness">
          <Input
            type="number"
            step="0.5"
            value={value.score_completeness ?? 7}
            onChange={(e) => set("score_completeness", Number(e.target.value))}
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
        <Field label="Freshness">
          <Input
            type="number"
            step="0.5"
            value={value.score_freshness ?? 8}
            onChange={(e) => set("score_freshness", Number(e.target.value))}
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
