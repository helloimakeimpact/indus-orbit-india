import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Pause, Play, CheckCircle2, XCircle, Star } from "lucide-react";

export const Route = createFileRoute("/app/admin/content")({
  head: () => ({ meta: [{ title: "Content moderation — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ContentAdmin,
});

type Row = Record<string, any>;

function ContentAdmin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState<Row[]>([]);
  const [events, setEvents] = useState<Row[]>([]);
  const [asks, setAsks] = useState<Row[]>([]);
  const [missions, setMissions] = useState<Row[]>([]);
  const [chapters, setChapters] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) { toast.error("Admins only"); navigate({ to: "/app" }); }
  }, [isAdmin, loading, navigate]);

  const audit = useCallback(async (action: string, target_type: string, target_id: string, reason?: string) => {
    if (!user) return;
    await supabase.from("audit_log").insert({ actor_id: user.id, action, target_type, target_id, reason });
  }, [user]);

  const load = useCallback(async () => {
    setBusy(true);
    const [s, e, a, m, c] = await Promise.all([
      supabase.from("stories").select("*, profiles!stories_author_id_fkey(display_name)").order("created_at", { ascending: false }),
      supabase.from("events").select("*, profiles!events_organizer_id_fkey(display_name)").order("created_at", { ascending: false }),
      supabase.from("asks_offers").select("*, profiles!asks_offers_author_id_fkey(display_name)").order("created_at", { ascending: false }),
      supabase.from("missions").select("*").order("created_at", { ascending: false }),
      supabase.from("chapters").select("*").order("created_at", { ascending: false }),
    ]);
    setStories(s.data || []);
    setEvents(e.data || []);
    setAsks(a.data || []);
    setMissions(m.data || []);
    setChapters(c.data || []);
    setBusy(false);
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  // ---------- Story actions ----------
  async function setStoryStatus(id: string, status: string) {
    const patch: Row = { status };
    if (status === "approved" || status === "featured") patch.published_at = new Date().toISOString();
    if (status === "pending" || status === "rejected") patch.published_at = null;
    const { error } = await supabase.from("stories").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await audit(`content.story_${status}`, "story", id);
    toast.success(`Story ${status}`); load();
  }
  async function deleteStory(id: string) {
    const { error } = await supabase.from("stories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await audit("content.story_deleted", "story", id);
    toast.success("Story deleted"); load();
  }

  // ---------- Event actions ----------
  async function setEventStatus(id: string, status: string) {
    const { error } = await supabase.from("events").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    await audit(`content.event_${status}`, "event", id);
    toast.success(`Event ${status}`); load();
  }
  async function deleteEvent(id: string) {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await audit("content.event_deleted", "event", id);
    toast.success("Event deleted"); load();
  }

  // ---------- Ask/Offer actions ----------
  async function setAskStatus(id: string, status: string) {
    const { error } = await supabase.from("asks_offers").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    await audit(`content.ask_${status}`, "ask_offer", id);
    toast.success(`Post ${status}`); load();
  }
  async function deleteAsk(id: string) {
    const { error } = await supabase.from("asks_offers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await audit("content.ask_deleted", "ask_offer", id);
    toast.success("Post deleted"); load();
  }

  // ---------- Mission actions ----------
  async function setMissionStatus(id: string, status: string) {
    const { error } = await supabase.from("missions").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    await audit(`content.mission_${status}`, "mission", id);
    toast.success(`Mission ${status}`); load();
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <h1 className="font-display text-3xl font-medium">Content moderation</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Approve, pause, feature, or remove content across the platform. All actions are logged in the audit trail.
      </p>

      {busy ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : (
        <Tabs defaultValue="stories" className="mt-8">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="stories">Stories ({stories.length})</TabsTrigger>
            <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
            <TabsTrigger value="board">Board posts ({asks.length})</TabsTrigger>
            <TabsTrigger value="missions">Missions ({missions.length})</TabsTrigger>
            <TabsTrigger value="chapters">Chapters ({chapters.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="stories" className="mt-6 space-y-4">
            {stories.length === 0 ? <Empty label="stories" /> : stories.map(s => (
              <Card key={s.id}
                title={s.title}
                meta={`by ${s.profiles?.display_name || "Member"} · ${new Date(s.created_at).toLocaleDateString()}`}
                statusBadge={<StatusBadge status={s.status} />}
                body={s.content}
              >
                {s.status !== "approved" && <Btn icon={CheckCircle2} onClick={() => setStoryStatus(s.id, "approved")}>Approve</Btn>}
                {s.status !== "featured" && <Btn icon={Star} variant="outline" onClick={() => setStoryStatus(s.id, "featured")}>Feature</Btn>}
                {(s.status === "approved" || s.status === "featured") && (
                  <Btn icon={Pause} variant="outline" onClick={() => setStoryStatus(s.id, "pending")}>Pause</Btn>
                )}
                {s.status !== "rejected" && <Btn icon={XCircle} variant="outline" onClick={() => setStoryStatus(s.id, "rejected")}>Decline</Btn>}
                <DeleteBtn label={s.title} onConfirm={() => deleteStory(s.id)} />
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="events" className="mt-6 space-y-4">
            {events.length === 0 ? <Empty label="events" /> : events.map(e => (
              <Card key={e.id}
                title={e.title}
                meta={`by ${e.profiles?.display_name || "Member"} · ${new Date(e.start_time).toLocaleString()}`}
                statusBadge={<StatusBadge status={e.status} />}
                body={e.description}
              >
                {e.status !== "approved" && <Btn icon={CheckCircle2} onClick={() => setEventStatus(e.id, "approved")}>Approve</Btn>}
                {e.status === "approved" && <Btn icon={Pause} variant="outline" onClick={() => setEventStatus(e.id, "pending")}>Pause</Btn>}
                {e.status !== "rejected" && <Btn icon={XCircle} variant="outline" onClick={() => setEventStatus(e.id, "rejected")}>Decline</Btn>}
                <DeleteBtn label={e.title} onConfirm={() => deleteEvent(e.id)} />
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="board" className="mt-6 space-y-4">
            {asks.length === 0 ? <Empty label="board posts" /> : asks.map(a => (
              <Card key={a.id}
                title={a.title}
                meta={`${a.kind} · by ${a.profiles?.display_name || "Member"} · ${new Date(a.created_at).toLocaleDateString()}`}
                statusBadge={<StatusBadge status={a.status} />}
                body={a.body}
              >
                {a.status !== "active" && <Btn icon={Play} onClick={() => setAskStatus(a.id, "active")}>Activate</Btn>}
                {a.status === "active" && <Btn icon={Pause} variant="outline" onClick={() => setAskStatus(a.id, "paused")}>Pause</Btn>}
                {a.status !== "closed" && <Btn icon={XCircle} variant="outline" onClick={() => setAskStatus(a.id, "closed")}>Close</Btn>}
                <DeleteBtn label={a.title} onConfirm={() => deleteAsk(a.id)} />
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="missions" className="mt-6 space-y-4">
            {missions.length === 0 ? <Empty label="missions" /> : missions.map(m => (
              <Card key={m.id}
                title={m.title}
                meta={`${m.theme} · ${new Date(m.created_at).toLocaleDateString()}`}
                statusBadge={<StatusBadge status={m.status} />}
                body={m.description}
              >
                {m.status !== "open" && <Btn icon={Play} onClick={() => setMissionStatus(m.id, "open")}>Open</Btn>}
                {m.status !== "paused" && <Btn icon={Pause} variant="outline" onClick={() => setMissionStatus(m.id, "paused")}>Pause</Btn>}
                {m.status !== "closed" && <Btn icon={XCircle} variant="outline" onClick={() => setMissionStatus(m.id, "closed")}>Close</Btn>}
              </Card>
            ))}
            <p className="text-xs text-muted-foreground">Missions cannot be deleted — close them instead to preserve history.</p>
          </TabsContent>

          <TabsContent value="chapters" className="mt-6 space-y-4">
            {chapters.length === 0 ? <Empty label="chapters" /> : chapters.map(c => (
              <Card key={c.id}
                title={c.name}
                meta={[c.city, c.country].filter(Boolean).join(", ") || "—"}
                body={c.description}
              >
                <DeleteBtn label={c.name} onConfirm={async () => {
                  const { error } = await supabase.from("chapters").delete().eq("id", c.id);
                  if (error) return toast.error(error.message);
                  await audit("content.chapter_deleted", "chapter", c.id);
                  toast.success("Chapter deleted"); load();
                }} />
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Card({ title, meta, statusBadge, body, children }: {
  title: string; meta: string; statusBadge?: React.ReactNode; body?: string; children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold truncate">{title}</h3>
          <p className="text-xs text-muted-foreground">{meta}</p>
        </div>
        {statusBadge}
      </div>
      {body && <p className="mt-3 text-sm line-clamp-3 whitespace-pre-wrap">{body}</p>}
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </article>
  );
}

function Btn({ icon: Icon, children, ...props }: any) {
  return (
    <Button size="sm" {...props}>
      <Icon className="h-4 w-4 mr-1" />{children}
    </Button>
  );
}

function DeleteBtn({ label, onConfirm }: { label: string; onConfirm: () => void | Promise<void> }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{label}"?</AlertDialogTitle>
          <AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    approved: "bg-green-500/10 text-green-700 border-green-500/30",
    featured: "bg-[var(--saffron)]/10 text-[var(--saffron)] border-[var(--saffron)]/30",
    active: "bg-green-500/10 text-green-700 border-green-500/30",
    open: "bg-green-500/10 text-green-700 border-green-500/30",
    pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
    paused: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
    rejected: "bg-red-500/10 text-red-700 border-red-500/30",
    closed: "bg-muted text-muted-foreground",
    expired: "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={variants[status] || ""}>{status}</Badge>;
}

function Empty({ label }: { label: string }) {
  return <p className="text-muted-foreground text-sm">No {label} yet.</p>;
}
