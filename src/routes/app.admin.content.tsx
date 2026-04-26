import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/admin/content")({
  head: () => ({ meta: [{ title: "Content Queue — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ContentQueue,
});

function ContentQueue() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) { toast.error("Admins only"); navigate({ to: "/app" }); }
  }, [isAdmin, loading, navigate]);

  async function load() {
    setBusy(true);
    
    const { data: sData } = await supabase
      .from("stories")
      .select("*, profiles!stories_author_id_fkey(display_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
      
    const { data: eData } = await supabase
      .from("events")
      .select("*, profiles!events_organizer_id_fkey(display_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
      
    setStories(sData || []);
    setEvents(eData || []);
    setBusy(false);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function decideStory(id: string, status: "approved" | "featured" | "declined") {
    const { error } = await supabase.from("stories").update({ 
      status, 
      published_at: (status === "approved" || status === "featured") ? new Date().toISOString() : null 
    }).eq("id", id);
    if (error) return toast.error(error.message);
    
    if (user) {
      await supabase.from("audit_log").insert({
        actor_id: user.id,
        action: `content.story_${status}`,
        target_type: "story",
        target_id: id,
      });
    }

    toast.success(`Story marked ${status}`);
    load();
  }

  async function decideEvent(id: string, status: "approved" | "declined") {
    const { error } = await supabase.from("events").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    
    if (user) {
      await supabase.from("audit_log").insert({
        actor_id: user.id,
        action: `content.event_${status}`,
        target_type: "event",
        target_id: id,
      });
    }

    toast.success(`Event marked ${status}`);
    load();
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-medium">Content Queue</h1>
      <p className="mt-2 text-sm text-muted-foreground">Approve, decline, or feature member-submitted stories and events.</p>

      {busy ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-8 space-y-12">
          
          <section>
            <h2 className="font-display text-2xl font-medium mb-4">Pending Stories</h2>
            {stories.length === 0 ? (
              <p className="text-muted-foreground">No pending stories.</p>
            ) : (
              <div className="space-y-4">
                {stories.map(s => (
                  <article key={s.id} className="rounded-3xl border border-border bg-card p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                        <p className="text-xs text-muted-foreground">by {s.profiles?.display_name || 'Member'} · {new Date(s.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline">Story</Badge>
                    </div>
                    <div className="mt-4 prose prose-sm max-w-none line-clamp-3">
                      {s.content}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <Button onClick={() => decideStory(s.id, "approved")}>Approve</Button>
                      <Button variant="outline" className="border-[var(--saffron)] text-[var(--saffron)] hover:bg-[var(--saffron)]/10 hover:text-[var(--saffron)]" onClick={() => decideStory(s.id, "featured")}>Approve & Feature</Button>
                      <Button variant="outline" onClick={() => decideStory(s.id, "declined")}>Decline</Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display text-2xl font-medium mb-4">Pending Events</h2>
            {events.length === 0 ? (
              <p className="text-muted-foreground">No pending events.</p>
            ) : (
              <div className="space-y-4">
                {events.map(e => (
                  <article key={e.id} className="rounded-3xl border border-border bg-card p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display text-lg font-semibold">{e.title}</h3>
                        <p className="text-xs text-muted-foreground">by {e.profiles?.display_name || 'Member'} · {new Date(e.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline">Event · {e.location_type}</Badge>
                    </div>
                    <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs uppercase tracking-wider block">When</span>
                        {new Date(e.start_time).toLocaleString()} to {new Date(e.end_time).toLocaleString()}
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs uppercase tracking-wider block">Where</span>
                        {e.location || 'Not specified'}
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider block">Description</span>
                        {e.description}
                      </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <Button onClick={() => decideEvent(e.id, "approved")}>Approve</Button>
                      <Button variant="outline" onClick={() => decideEvent(e.id, "declined")}>Decline</Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          
        </div>
      )}
    </div>
  );
}
