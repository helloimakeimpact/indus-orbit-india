import { createFileRoute, Link } from '@tanstack/react-router'

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, PenTool, ExternalLink, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitStory, getPublishedStories } from "@/server/society.functions";

export const Route = createFileRoute("/app/stories/")({
  head: () => ({ meta: [{ title: "Stories — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: StoriesPage,
});

function StoriesPage() {
  const { user } = useAuth();
  const [allStories, setAllStories] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  async function load() {
    try {
      const data = await getPublishedStories();
      setAllStories(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Client-side filter
  const filtered = allStories.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.profiles?.display_name?.toLowerCase().includes(q) ||
      s.content?.toLowerCase().includes(q)
    );
  });

  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">Society</p>
          <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">Stories</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/70">
            Long-form essays on craft, mission, and building the India bridge. Approved by editorial.
          </p>
        </div>
        {user && (
          <Button onClick={() => setCreateOpen(true)}>
            <PenTool className="mr-2 h-4 w-4" /> Submit Story
          </Button>
        )}
      </div>

      {/* Search bar */}
      <div className="mt-6 relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search stories or authors…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 rounded-full bg-muted/50 border-border/50"
        />
      </div>

      {/* Result count */}
      {!busy && filtered.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Showing {visible.length} of {filtered.length} stor{filtered.length !== 1 ? "ies" : "y"}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      )}

      {busy ? (
        <p className="mt-8 text-muted-foreground px-4">Loading stories…</p>
      ) : (
        <div className="mt-4 space-y-8">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
              <BookOpen className="mx-auto h-8 w-8 opacity-50" />
              <p className="mt-4 font-medium text-foreground">
                {searchQuery ? `No stories matching "${searchQuery}".` : "No stories published yet."}
              </p>
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="mt-2 text-sm text-[var(--indigo-night)] underline">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            visible.map((s) => (
            <Link key={s.id} to="/app/stories/$id" params={{ id: s.id }} className="block">
              <article className="group relative rounded-3xl border border-border bg-card p-6 md:p-8 overflow-hidden transition hover:border-[var(--indigo-night)]/30">
                {s.status === 'featured' && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-xl bg-[var(--saffron)] text-[var(--indigo-night)] font-semibold border-none px-4 py-1.5 uppercase tracking-widest text-[10px]">
                      Editor's Pick
                    </Badge>
                  </div>
                )}

                <h2 className="font-display text-2xl md:text-3xl font-semibold leading-tight group-hover:text-[var(--indigo-night)] transition">{s.title}</h2>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{s.profiles?.display_name || 'Member'}</span>
                    <span className="text-xs text-muted-foreground">{s.profiles?.headline}</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {s.published_at ? new Date(s.published_at).toLocaleDateString() : 'Draft'}
                  </span>
                </div>

                <div className="mt-6 prose prose-sm md:prose-base prose-p:leading-relaxed max-w-none text-foreground/90 whitespace-pre-wrap line-clamp-4">
                  {s.content}
                </div>
                
                <div className="mt-6 text-sm font-medium text-[var(--indigo-night)] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Read full story <ExternalLink className="h-3 w-3" />
                </div>
              </article>
            </Link>
          ))
        )}
      </div>
      )}

      {/* Load More */}
      {hasMore && !busy && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="rounded-full px-8"
          >
            Load More ({filtered.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {createOpen && <SubmitStoryDialog onClose={() => setCreateOpen(false)} onSubmitted={load} />}
    </div>
  );
}

function SubmitStoryDialog({ onClose, onSubmitted }: { onClose: () => void, onSubmitted: () => void }) {
  const [form, setForm] = useState({ title: "", content: "" });
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await submitStory({ data: form });
      toast.success("Story submitted for editorial review!");
      onSubmitted();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Submit Story</DialogTitle>
          <DialogDescription>Stories are reviewed by our editorial team before publishing.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input 
              className="font-display text-lg md:text-xl font-medium border-0 px-0 rounded-none border-b focus-visible:ring-0"
              placeholder="Story Title..." 
              value={form.title} 
              onChange={(e) => setForm({ ...form, title: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Textarea 
              className="min-h-[400px] border-0 px-0 focus-visible:ring-0 resize-none text-base leading-relaxed"
              placeholder="Write your story here (Markdown is supported)..." 
              value={form.content} 
              onChange={(e) => setForm({ ...form, content: e.target.value })} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !form.title || !form.content}>Submit to Editor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
