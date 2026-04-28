import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { MapPin, Users, Crown, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getChapters, joinChapter } from "@/server/society.functions";

export const Route = createFileRoute("/app/chapters/")({
  head: () => ({ meta: [{ title: "Chapters — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: ChaptersPage,
});

function ChaptersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  async function load() {
    try {
      const data = await getChapters();
      setAllChapters(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Client-side filter (chapters are usually smaller datasets)
  const filtered = allChapters.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q)
    );
  });

  // Paginate the filtered results
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery]);

  async function handleJoin(chapterId: string) {
    if (!user) return toast.error("Please log in to join.");
    try {
      await joinChapter({ data: { chapterId } });
      toast.success("Joined chapter!");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (busy) return <p className="mt-8 text-muted-foreground px-4">Loading chapters…</p>;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">Society</p>
          <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">Local Chapters</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/70">
            Connect with Indus Orbit members in your region. Local chapters organize IRL events and build tight-knit networks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90"
            onClick={() => navigate({ to: '/app/chapters/propose' })}
          >
            Propose a Chapter
          </Button>
          {allChapters.some((c: any) => c.chapter_members?.some((m: any) => m.user_id === user?.id && m.role === 'lead')) && (
            <Button
              variant="outline"
              className="border-[var(--indigo-night)] text-[var(--indigo-night)]"
              onClick={() => navigate({ to: '/app/chapter-admin' })}
            >
              Manage Chapters
            </Button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="mt-6 relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, city, or country…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 rounded-full bg-muted/50 border-border/50"
        />
      </div>

      {/* Result count */}
      {!busy && filtered.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Showing {visible.length} of {filtered.length} chapter{filtered.length !== 1 ? "s" : ""}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      )}

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <MapPin className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-4 font-medium text-foreground">
              {searchQuery ? `No chapters matching "${searchQuery}".` : "No chapters have been launched yet."}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="mt-2 text-sm text-[var(--indigo-night)] underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          visible.map((c) => {
            const hasJoined = c.chapter_members?.some((m: any) => m.user_id === user?.id);
            const memberCount = c.chapter_members?.length || 0;
            const leads = c.chapter_members?.filter((m: any) => m.role === 'lead') || [];

            return (
              <div key={c.id} className="rounded-3xl border border-border bg-card p-6 flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-semibold hover:text-[var(--saffron)] transition">
                      <Link to="/app/chapters/$chapterId" params={{ chapterId: c.id }}>{c.name}</Link>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {[c.city, c.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed flex-1">{c.description}</p>

                <div className="mt-6 border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Users className="h-4 w-4 text-[var(--indigo-night)]" />
                      {memberCount} Members
                    </div>
                    {hasJoined ? (
                      <Badge variant="secondary">Joined</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleJoin(c.id)}>Join Chapter</Button>
                    )}
                  </div>

                  {leads.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Crown className="h-3 w-3" /> Leads:
                      </span>
                      {leads.map((l: any) => (
                        <Badge key={l.user_id} variant="outline" className="font-normal">
                          {l.profiles?.display_name || 'Member'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

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
    </div>
  );
}
