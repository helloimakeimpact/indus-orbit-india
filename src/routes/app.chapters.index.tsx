import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { MapPin, Users, Crown, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatChapterBaseLocation } from "@/lib/location";
import { getChapters, joinChapter } from "@/server/society.functions";

export const Route = createFileRoute("/app/chapters/")({
  head: () => ({
    meta: [{ title: "Chapters — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
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
    <div className="mx-auto w-full max-w-none">
      <div className="app-glass app-workspace-head rounded-2xl">
        <div className="app-workspace-head-main">
          <div className="app-workspace-title">
            <p className="app-workspace-kicker">🌍 Society</p>
            <h1>Local Chapters</h1>
            <p>
              Connect with Indus Orbit members by base location. Event pages carry exact venue or
              online address details.
            </p>
          </div>
          <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
            <Button
              size="sm"
              className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90"
              onClick={() => navigate({ to: "/app/chapters/propose" })}
            >
              Propose a Chapter
            </Button>
            {allChapters.some((c: any) =>
              c.chapter_members?.some((m: any) => m.user_id === user?.id && m.role === "lead"),
            ) && (
              <Button
                size="sm"
                variant="outline"
                className="border-[var(--indigo-night)] text-[var(--indigo-night)]"
                onClick={() => navigate({ to: "/app/chapter-admin" })}
              >
                Manage Chapters
              </Button>
            )}
          </div>
        </div>

        <div className="app-workspace-controls">
          <div className="app-filter-row">
            <span className="app-chip" data-active="false">
              {filtered.length} chapter{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="app-search">
            <Search />
            <Input
              placeholder="Search by name or base location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {!busy && filtered.length > 0 && (
            <p className="app-result-line">
              Showing {visible.length} of {filtered.length} chapter
              {filtered.length !== 1 ? "s" : ""}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-5 text-center text-muted-foreground">
            <MapPin className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-4 font-medium text-foreground">
              {searchQuery
                ? `No chapters matching "${searchQuery}".`
                : "No chapters have been launched yet."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-sm text-[var(--indigo-night)] underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          visible.map((c) => {
            const hasJoined = c.chapter_members?.some((m: any) => m.user_id === user?.id);
            const memberCount = c.chapter_members?.length || 0;
            const leads = c.chapter_members?.filter((m: any) => m.role === "lead") || [];

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-border bg-card p-4 flex flex-col"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-xl font-semibold hover:text-[var(--saffron)] transition">
                      <Link to="/app/chapters/$chapterId" params={{ chapterId: c.id }}>
                        {c.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Base: {formatChapterBaseLocation(c)}
                    </p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 text-sm leading-6 flex-1">{c.description}</p>

                <div className="mt-4 border-t border-border pt-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Users className="h-4 w-4 text-[var(--indigo-night)]" />
                      {memberCount} Members
                    </div>
                    {hasJoined ? (
                      <Badge variant="secondary">Joined</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleJoin(c.id)}>
                        Join Chapter
                      </Button>
                    )}
                  </div>

                  {leads.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Crown className="h-3 w-3" /> Leads:
                      </span>
                      {leads.map((l: any) => (
                        <Badge key={l.user_id} variant="outline" className="font-normal">
                          {l.profiles?.display_name || "Member"}
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
