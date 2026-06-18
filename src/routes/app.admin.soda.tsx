import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  listAllSodaIdeasForAdmin,
  upsertSodaIdea,
  deleteSodaIdea,
  type SodaIdea,
} from "@/server/soda.functions";
import { Plus, Pencil, Trash2, Save, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/soda")({
  component: AdminSoda,
});

function emptyDraft(): Partial<SodaIdea> {
  return {
    slug: "",
    title: "",
    tagline: "",
    sector: "ai",
    summary: "",
    why_now: "",
    market_gap: "",
    execution_plan: "",
    offer: [],
    keyword: "",
    volume: 0,
    growth_pct: 0,
    score_opportunity: 8,
    score_problem: 8,
    score_feasibility: 7,
    score_why_now: 9,
    business_fit: {},
    type_label: "Saas",
    market_label: "B2B",
    target_label: "",
    main_competitor: "",
    trend_analysis: "",
    community_signals: [],
    top_keywords: [],
    framework_fit: {},
    tags: [],
    badges: ["Perfect Timing"],
    hero_image_url: "",
    status: "draft",
    featured_on: null,
  };
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function AdminSoda() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<SodaIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<SodaIdea> | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listAllSodaIdeasForAdmin();
      setRows(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  if (!isAdmin) {
    return (
      <div className="p-12">
        <p className="text-sm text-foreground/70">Admins only.</p>
      </div>
    );
  }

  async function onSave() {
    if (!editing) return;
    if (!editing.title || !editing.slug) {
      toast.error("Title and slug are required");
      return;
    }
    setSaving(true);
    try {
      await upsertSodaIdea(editing);
      toast.success("Saved");
      setEditing(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this idea? This cannot be undone.")) return;
    try {
      await deleteSodaIdea(id);
      toast.success("Deleted");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
              Admin
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">SODA ideas</h1>
            <p className="mt-1 text-sm text-foreground/65">
              Create, edit, publish and delete entries in the SODA list.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(emptyDraft())}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-4 py-2 text-sm font-semibold text-[var(--parchment)] hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New idea
          </button>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-left text-xs uppercase tracking-wider text-foreground/60">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Sector</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Scores</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-foreground/60">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-foreground/60">
                    No ideas yet. Click <strong>New idea</strong> to add your first.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-foreground/55">/{r.slug}</p>
                    </td>
                    <td className="px-4 py-3">{r.sector}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-xs " +
                          (r.status === "published"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-foreground/10 text-foreground/70")
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground/70">
                      O{r.score_opportunity} · P{r.score_problem} · F{r.score_feasibility} · W{r.score_why_now}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(r)}
                          className="rounded-lg p-2 text-foreground/70 hover:bg-foreground/5"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(r.id)}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {editing && (
          <Editor
            value={editing}
            saving={saving}
            onChange={setEditing}
            onSave={onSave}
            onClose={() => setEditing(null)}
          />
        )}
      </div>
    </div>
  );
}

function Editor({
  value,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  value: Partial<SodaIdea>;
  saving: boolean;
  onChange: (v: Partial<SodaIdea>) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  function set<K extends keyof SodaIdea>(k: K, v: any) {
    onChange({ ...value, [k]: v });
  }

  function setJson(k: keyof SodaIdea, raw: string, fallback: any) {
    try {
      onChange({ ...value, [k]: raw.trim() ? JSON.parse(raw) : fallback });
    } catch {
      // keep raw editing; we'll only commit on blur — simpler to ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-6">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--saffron)]" />
            <h2 className="font-display text-xl">
              {value.id ? "Edit idea" : "New idea"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-foreground/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <Row label="Title">
            <input
              value={value.title ?? ""}
              onChange={(e) => {
                const t = e.target.value;
                const next: Partial<SodaIdea> = { ...value, title: t };
                if (!value.id && !value.slug) next.slug = slugify(t);
                onChange(next);
              }}
              className={inputClass}
            />
          </Row>
          <Row label="Slug">
            <input
              value={value.slug ?? ""}
              onChange={(e) => set("slug", slugify(e.target.value))}
              className={inputClass}
            />
          </Row>
          <Row label="Tagline">
            <input value={value.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} className={inputClass} />
          </Row>
          <div className="grid gap-4 sm:grid-cols-3">
            <Row label="Sector">
              <input value={value.sector ?? ""} onChange={(e) => set("sector", e.target.value)} className={inputClass} />
            </Row>
            <Row label="Status">
              <select
                value={value.status ?? "draft"}
                onChange={(e) => set("status", e.target.value as any)}
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </Row>
            <Row label="Featured on (date)">
              <input
                type="date"
                value={value.featured_on ?? ""}
                onChange={(e) => set("featured_on", e.target.value || null)}
                className={inputClass}
              />
            </Row>
          </div>

          <Row label="Summary">
            <textarea rows={3} value={value.summary ?? ""} onChange={(e) => set("summary", e.target.value)} className={inputClass} />
          </Row>
          <Row label="Why now">
            <textarea rows={3} value={value.why_now ?? ""} onChange={(e) => set("why_now", e.target.value)} className={inputClass} />
          </Row>
          <Row label="Market gap">
            <textarea rows={3} value={value.market_gap ?? ""} onChange={(e) => set("market_gap", e.target.value)} className={inputClass} />
          </Row>
          <Row label="Execution plan">
            <textarea rows={3} value={value.execution_plan ?? ""} onChange={(e) => set("execution_plan", e.target.value)} className={inputClass} />
          </Row>

          <div className="grid gap-4 sm:grid-cols-4">
            <Row label="Opp">
              <input type="number" min={0} max={10} value={value.score_opportunity ?? 0}
                onChange={(e) => set("score_opportunity", Number(e.target.value))} className={inputClass} />
            </Row>
            <Row label="Problem">
              <input type="number" min={0} max={10} value={value.score_problem ?? 0}
                onChange={(e) => set("score_problem", Number(e.target.value))} className={inputClass} />
            </Row>
            <Row label="Feasibility">
              <input type="number" min={0} max={10} value={value.score_feasibility ?? 0}
                onChange={(e) => set("score_feasibility", Number(e.target.value))} className={inputClass} />
            </Row>
            <Row label="Why-Now">
              <input type="number" min={0} max={10} value={value.score_why_now ?? 0}
                onChange={(e) => set("score_why_now", Number(e.target.value))} className={inputClass} />
            </Row>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Row label="Keyword">
              <input value={value.keyword ?? ""} onChange={(e) => set("keyword", e.target.value)} className={inputClass} />
            </Row>
            <Row label="Volume">
              <input type="number" value={value.volume ?? 0} onChange={(e) => set("volume", Number(e.target.value))} className={inputClass} />
            </Row>
            <Row label="Growth %">
              <input type="number" value={value.growth_pct ?? 0} onChange={(e) => set("growth_pct", Number(e.target.value))} className={inputClass} />
            </Row>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Type">
              <input value={value.type_label ?? ""} onChange={(e) => set("type_label", e.target.value)} className={inputClass} />
            </Row>
            <Row label="Market">
              <input value={value.market_label ?? ""} onChange={(e) => set("market_label", e.target.value)} className={inputClass} />
            </Row>
            <Row label="Target">
              <input value={value.target_label ?? ""} onChange={(e) => set("target_label", e.target.value)} className={inputClass} />
            </Row>
            <Row label="Main competitor">
              <input value={value.main_competitor ?? ""} onChange={(e) => set("main_competitor", e.target.value)} className={inputClass} />
            </Row>
          </div>

          <Row label="Trend analysis">
            <textarea rows={2} value={value.trend_analysis ?? ""} onChange={(e) => set("trend_analysis", e.target.value)} className={inputClass} />
          </Row>

          <Row label="Tags (comma separated)">
            <input
              value={(value.tags ?? []).join(", ")}
              onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              className={inputClass}
            />
          </Row>
          <Row label="Badges (comma separated)">
            <input
              value={(value.badges ?? []).join(", ")}
              onChange={(e) => set("badges", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              className={inputClass}
            />
          </Row>

          <Row label='Offer (JSON array: [{"tier":"Lead Magnet","name":"…","price":"Free","description":"…"}])'>
            <textarea
              rows={4}
              defaultValue={JSON.stringify(value.offer ?? [], null, 2)}
              onBlur={(e) => setJson("offer", e.target.value, [])}
              className={inputClass + " font-mono text-xs"}
            />
          </Row>
          <Row label='Business fit (JSON object)'>
            <textarea
              rows={3}
              defaultValue={JSON.stringify(value.business_fit ?? {}, null, 2)}
              onBlur={(e) => setJson("business_fit", e.target.value, {})}
              className={inputClass + " font-mono text-xs"}
            />
          </Row>
          <Row label='Community signals (JSON array: [{"source":"Reddit","detail":"4 subreddits"}])'>
            <textarea
              rows={3}
              defaultValue={JSON.stringify(value.community_signals ?? [], null, 2)}
              onBlur={(e) => setJson("community_signals", e.target.value, [])}
              className={inputClass + " font-mono text-xs"}
            />
          </Row>
          <Row label='Top keywords (JSON array: [{"keyword":"ai visibility","volume":1900,"competition":"MEDIUM"}])'>
            <textarea
              rows={3}
              defaultValue={JSON.stringify(value.top_keywords ?? [], null, 2)}
              onBlur={(e) => setJson("top_keywords", e.target.value, [])}
              className={inputClass + " font-mono text-xs"}
            />
          </Row>

          <Row label="Hero image URL">
            <input value={value.hero_image_url ?? ""} onChange={(e) => set("hero_image_url", e.target.value)} className={inputClass} />
          </Row>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium hover:bg-foreground/5">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-5 py-2 text-sm font-semibold text-[var(--parchment)] hover:opacity-90 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[var(--saffron)] focus:outline-none focus:ring-1 focus:ring-[var(--saffron)]/30";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {label}
      </span>
      {children}
    </label>
  );
}