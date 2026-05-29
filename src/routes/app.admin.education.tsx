import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, ChevronLeft, FileUp } from "lucide-react";
import {
  listAllCoursesForAdmin,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseBySlug,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  addLessonAttachment,
  deleteLessonAttachment,
  listAllResourcesForAdmin,
  createResource,
  updateResource,
  deleteResource,
  uploadEducationFile,
  getQuizForEditing,
  upsertQuiz,
  addQuizQuestion,
  deleteQuizQuestion,
  addQuizOption,
  deleteQuizOption,
  deleteQuiz,
} from "@/server/education.functions";

export const Route = createFileRoute("/app/admin/education")({
  head: () => ({ meta: [{ title: "Education admin — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: EducationAdmin,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function EducationAdmin() {
  const { isAdmin, isChapterLead, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin && !isChapterLead) {
      toast.error("Authors only");
      navigate({ to: "/app" });
    }
  }, [isAdmin, isChapterLead, loading, navigate]);

  if (loading) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Education CMS</h1>
          <p className="text-sm text-muted-foreground">Manage courses, lessons, quizzes, and the resource library.</p>
        </div>
      </header>

      {selectedCourseSlug ? (
        <CourseEditor slug={selectedCourseSlug} onBack={() => setSelectedCourseSlug(null)} />
      ) : (
        <Tabs defaultValue="courses">
          <TabsList>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>
          <TabsContent value="courses" className="mt-6">
            <CoursesList onOpen={setSelectedCourseSlug} />
          </TabsContent>
          <TabsContent value="resources" className="mt-6">
            <ResourcesManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ---------- Courses list ----------

function CoursesList({ onOpen }: { onOpen: (slug: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", summary: "", cover_url: "" });

  async function load() {
    try { setItems(await listAllCoursesForAdmin()); } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function onCreate() {
    if (!form.title || !form.slug) { toast.error("Title and slug required"); return; }
    try {
      await createCourse(form);
      toast.success("Course created");
      setOpen(false);
      setForm({ title: "", slug: "", summary: "", cover_url: "" });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function setStatus(c: any, status: string) {
    try {
      await updateCourse(c.id, { status, published_at: status === "published" ? new Date().toISOString() : null });
      toast.success("Updated");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function onDelete(c: any) {
    if (!confirm(`Delete "${c.title}" and all its modules/lessons?`)) return;
    try { await deleteCourse(c.id); toast.success("Deleted"); load(); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New course</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New course</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugify(e.target.value) })} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></div>
              <div><Label>Summary</Label><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
              <div><Label>Cover image URL</Label><Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={onCreate}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No courses yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.title}</span>
                    <Badge variant={c.status === "published" ? "default" : "outline"}>{c.status}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">/{c.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onOpen(c.slug)}><Pencil className="h-4 w-4" /> Edit</Button>
                  {c.status !== "published" ? (
                    <Button size="sm" onClick={() => setStatus(c, "published")}>Publish</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setStatus(c, "draft")}>Unpublish</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onDelete(c)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Course editor ----------

function CourseEditor({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  async function load() {
    try { setData(await getCourseBySlug(slug)); } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, [slug]);

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> All courses
      </button>
      <CourseMetaCard course={data.course} onChanged={load} />
      <ModulesEditor course={data.course} modules={data.modules} onChanged={load} onEditLesson={setEditingLesson} />

      <Dialog open={!!editingLesson} onOpenChange={(o) => !o && setEditingLesson(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {editingLesson && <LessonEditor lesson={editingLesson} onChanged={() => { load(); }} onClose={() => setEditingLesson(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CourseMetaCard({ course, onChanged }: { course: any; onChanged: () => void }) {
  const [form, setForm] = useState({
    title: course.title, summary: course.summary ?? "", cover_url: course.cover_url ?? "", sort_order: course.sort_order ?? 0,
  });
  async function save() {
    try { await updateCourse(course.id, form); toast.success("Saved"); onChanged(); } catch (e: any) { toast.error(e.message); }
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Course details</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Summary</Label><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
        <div><Label>Cover URL</Label><Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} /></div>
        <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
        <Button onClick={save}>Save</Button>
      </CardContent>
    </Card>
  );
}

function ModulesEditor({ course, modules, onChanged, onEditLesson }: { course: any; modules: any[]; onChanged: () => void; onEditLesson: (l: any) => void }) {
  const [newModuleTitle, setNewModuleTitle] = useState("");

  async function addModule() {
    if (!newModuleTitle) return;
    try { await createModule({ course_id: course.id, title: newModuleTitle, sort_order: modules.length }); setNewModuleTitle(""); onChanged(); } catch (e: any) { toast.error(e.message); }
  }
  async function removeModule(id: string) {
    if (!confirm("Delete this module and its lessons?")) return;
    try { await deleteModule(id); onChanged(); } catch (e: any) { toast.error(e.message); }
  }
  async function renameModule(m: any, title: string) {
    try { await updateModule(m.id, { title }); onChanged(); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Modules & lessons</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="New module title" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} />
          <Button onClick={addModule}><Plus className="h-4 w-4" /> Add module</Button>
        </div>
        {modules.map((m) => (
          <ModuleRow key={m.id} module={m} onRemove={removeModule} onRename={renameModule} onChanged={onChanged} onEditLesson={onEditLesson} />
        ))}
      </CardContent>
    </Card>
  );
}

function ModuleRow({ module: m, onRemove, onRename, onChanged, onEditLesson }: any) {
  const [title, setTitle] = useState(m.title);
  const [newLesson, setNewLesson] = useState("");

  async function addLesson() {
    if (!newLesson) return;
    try {
      await createLesson({ module_id: m.id, title: newLesson, slug: slugify(newLesson), sort_order: m.lessons.length });
      setNewLesson(""); onChanged();
    } catch (e: any) { toast.error(e.message); }
  }
  async function setLessonStatus(l: any, status: string) {
    try { await updateLesson(l.id, { status }); onChanged(); } catch (e: any) { toast.error(e.message); }
  }
  async function removeLesson(id: string) {
    if (!confirm("Delete this lesson?")) return;
    try { await deleteLesson(id); onChanged(); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title !== m.title && onRename(m, title)} className="font-medium" />
        <Button size="sm" variant="ghost" onClick={() => onRemove(m.id)}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="space-y-1 pl-2">
        {m.lessons.map((l: any) => (
          <div key={l.id} className="flex items-center justify-between rounded border px-2 py-1.5 text-sm">
            <span className="flex items-center gap-2">{l.title} <Badge variant={l.status === "published" ? "default" : "outline"}>{l.status}</Badge></span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => onEditLesson(l)}><Pencil className="h-3 w-3" /></Button>
              {l.status === "draft" ? (
                <Button size="sm" onClick={() => setLessonStatus(l, "published")}>Publish</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setLessonStatus(l, "draft")}>Unpublish</Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => removeLesson(l.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Input placeholder="New lesson title" value={newLesson} onChange={(e) => setNewLesson(e.target.value)} />
          <Button size="sm" onClick={addLesson}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function LessonEditor({ lesson, onChanged, onClose }: { lesson: any; onChanged: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    title: lesson.title,
    slug: lesson.slug,
    content: lesson.content ?? "",
    video_url: lesson.video_url ?? "",
    duration_mins: lesson.duration_mins ?? "",
  });
  const [attachments, setAttachments] = useState<any[]>([]);
  const [quizData, setQuizData] = useState<any>({ quiz: null, questions: [] });

  async function reload() {
    const sb = (await import("@/integrations/supabase/client")).supabase as any;
    const { data: atts } = await sb.from("lesson_attachments").select("*").eq("lesson_id", lesson.id);
    setAttachments(atts ?? []);
    setQuizData(await getQuizForEditing(lesson.id));
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [lesson.id]);

  async function save() {
    try {
      await updateLesson(lesson.id, {
        ...form,
        duration_mins: form.duration_mins === "" ? null : Number(form.duration_mins),
      });
      toast.success("Saved");
      onChanged();
    } catch (e: any) { toast.error(e.message); }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try { await addLessonAttachment(lesson.id, f); toast.success("Uploaded"); reload(); }
    catch (err: any) { toast.error(err.message); }
    e.target.value = "";
  }

  async function removeAttachment(a: any) {
    try { await deleteLessonAttachment(a.id, a.file_path); reload(); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <DialogHeader><DialogTitle>Edit lesson</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></div>
        <div><Label>Video URL (YouTube / Vimeo)</Label><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></div>
        <div><Label>Duration (mins)</Label><Input type="number" value={form.duration_mins} onChange={(e) => setForm({ ...form, duration_mins: e.target.value as any })} /></div>
        <div><Label>Content (markdown / plain text)</Label><Textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={save}>Save lesson</Button></div>
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-2 font-medium">Attachments</h3>
        <div className="space-y-1">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
              <span>{a.file_name}</span>
              <Button size="sm" variant="ghost" onClick={() => removeAttachment(a)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
          <FileUp className="h-4 w-4" /> Upload file
          <input type="file" className="hidden" onChange={onFile} />
        </label>
      </div>

      <div className="border-t pt-4">
        <QuizEditor lessonId={lesson.id} data={quizData} onChanged={reload} />
      </div>
    </div>
  );
}

function QuizEditor({ lessonId, data, onChanged }: { lessonId: string; data: any; onChanged: () => void }) {
  const [title, setTitle] = useState(data.quiz?.title ?? "Knowledge check");
  const [passing, setPassing] = useState(data.quiz?.passing_score ?? 70);
  const [newQ, setNewQ] = useState("");

  useEffect(() => {
    setTitle(data.quiz?.title ?? "Knowledge check");
    setPassing(data.quiz?.passing_score ?? 70);
  }, [data.quiz?.id]);

  async function saveMeta() {
    try { await upsertQuiz(lessonId, title, passing); toast.success("Quiz saved"); onChanged(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function addQ() {
    if (!newQ) return;
    let qid = data.quiz?.id;
    if (!qid) qid = await upsertQuiz(lessonId, title, passing);
    try { await addQuizQuestion(qid, newQ); setNewQ(""); onChanged(); } catch (e: any) { toast.error(e.message); }
  }
  async function removeQ(id: string) {
    if (!confirm("Delete question?")) return;
    try { await deleteQuizQuestion(id); onChanged(); } catch (e: any) { toast.error(e.message); }
  }
  async function removeQuiz() {
    if (!data.quiz || !confirm("Delete quiz entirely?")) return;
    try { await deleteQuiz(data.quiz.id); onChanged(); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Quiz</h3>
      <div className="grid grid-cols-2 gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
        <Input type="number" min={0} max={100} value={passing} onChange={(e) => setPassing(Number(e.target.value))} placeholder="Passing %" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={saveMeta}>Save quiz settings</Button>
        {data.quiz && <Button size="sm" variant="ghost" onClick={removeQuiz}><Trash2 className="h-4 w-4" /> Delete quiz</Button>}
      </div>

      {data.questions.map((q: any, i: number) => (
        <QuestionEditor key={q.id} q={q} index={i} onChanged={onChanged} onRemove={() => removeQ(q.id)} />
      ))}

      <div className="flex gap-2">
        <Input placeholder="New question prompt" value={newQ} onChange={(e) => setNewQ(e.target.value)} />
        <Button size="sm" onClick={addQ}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function QuestionEditor({ q, index, onChanged, onRemove }: any) {
  const [label, setLabel] = useState("");
  const [correct, setCorrect] = useState(false);

  async function addOpt() {
    if (!label) return;
    try { await addQuizOption(q.id, label, correct); setLabel(""); setCorrect(false); onChanged(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function removeOpt(id: string) {
    try { await deleteQuizOption(id); onChanged(); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-medium">{index + 1}. {q.prompt}</p>
        <Button size="sm" variant="ghost" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
      </div>
      <div className="space-y-1 pl-2">
        {q.options.map((o: any) => (
          <div key={o.id} className="flex items-center justify-between text-sm">
            <span>{o.is_correct ? "✓ " : "• "}{o.label}</span>
            <Button size="sm" variant="ghost" onClick={() => removeOpt(o.id)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <Input placeholder="Option text" value={label} onChange={(e) => setLabel(e.target.value)} />
          <label className="flex items-center gap-1 text-xs whitespace-nowrap">
            <Switch checked={correct} onCheckedChange={setCorrect} /> Correct
          </label>
          <Button size="sm" onClick={addOpt}><Plus className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Resources manager ----------

function ResourcesManager() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ kind: "link", title: "", description: "", category: "", tags: "", url: "" });
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    try { setItems(await listAllResourcesForAdmin()); } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function onCreate() {
    if (!form.title) { toast.error("Title required"); return; }
    try {
      const tags = form.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
      if (form.kind === "file") {
        if (!file) { toast.error("Choose a file"); return; }
        const up = await uploadEducationFile(file, "resources");
        await createResource({
          title: form.title, description: form.description, category: form.category, tags,
          kind: "file", file_path: up.path, file_name: up.name, mime_type: up.mime,
        });
      } else {
        if (!form.url) { toast.error("URL required"); return; }
        await createResource({
          title: form.title, description: form.description, category: form.category, tags,
          kind: "link", url: form.url,
        });
      }
      toast.success("Resource added");
      setOpen(false);
      setForm({ kind: "link", title: "", description: "", category: "", tags: "", url: "" });
      setFile(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function toggleStatus(r: any) {
    const next = r.status === "published" ? "draft" : "published";
    try { await updateResource(r.id, { status: next }); load(); } catch (e: any) { toast.error(e.message); }
  }
  async function remove(r: any) {
    if (!confirm(`Delete "${r.title}"?`)) return;
    try { await deleteResource(r.id); load(); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New resource</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New resource</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={form.kind === "link" ? "default" : "outline"} onClick={() => setForm({ ...form, kind: "link" })}>Link</Button>
                <Button type="button" size="sm" variant={form.kind === "file" ? "default" : "outline"} onClick={() => setForm({ ...form, kind: "file" })}>File upload</Button>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div><Label>Tags (comma sep)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
              </div>
              {form.kind === "link" ? (
                <div><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" /></div>
              ) : (
                <div><Label>File</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              )}
            </div>
            <DialogFooter><Button onClick={onCreate}>Add resource</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No resources yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <Badge variant={r.status === "published" ? "default" : "outline"}>{r.status}</Badge>
                    <Badge variant="secondary">{r.kind}</Badge>
                    {r.category && <Badge variant="outline">{r.category}</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{r.kind === "link" ? r.url : r.file_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(r)}>{r.status === "published" ? "Unpublish" : "Publish"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}