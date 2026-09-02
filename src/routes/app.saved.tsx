import { createFileRoute, Link } from "@tanstack/react-router";
import { BookmarkCheck, Download, Loader2, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  downloadOrbitSavedItems,
  listMyOrbitSavedItems,
  setMyOrbitSavedItem,
  type OrbitSavedItem,
} from "@/features/orbit/saved-items";

export const Route = createFileRoute("/app/saved")({
  head: () => ({ meta: [{ title: "Saved work — Indus Orbit" }] }),
  component: SavedWorkPage,
});

function SavedWorkLink({ item }: { item: OrbitSavedItem }) {
  if (item.objectType === "chapter") {
    return (
      <Link
        to="/app/chapters/$chapterId"
        params={{ chapterId: item.objectId }}
        className="font-semibold hover:underline"
      >
        {item.title}
      </Link>
    );
  }
  if (item.objectType === "mission") {
    return (
      <Link
        to="/app/missions/$missionId"
        params={{ missionId: item.objectId }}
        className="font-semibold hover:underline"
      >
        {item.title}
      </Link>
    );
  }
  if (item.spaceId) {
    return (
      <Link
        to="/app/spaces/$spaceId"
        params={{ spaceId: item.spaceId }}
        className="font-semibold hover:underline"
      >
        {item.title}
      </Link>
    );
  }
  return <span className="font-semibold">{item.title}</span>;
}

function SavedWorkPage() {
  const [items, setItems] = useState<OrbitSavedItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextQuery = "") => {
    setLoading(true);
    try {
      setItems(await listMyOrbitSavedItems(nextQuery));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load saved work");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function remove(item: OrbitSavedItem) {
    try {
      await setMyOrbitSavedItem({
        objectType: item.objectType,
        objectId: item.objectId,
        saved: false,
      });
      setItems((current) => current.filter((candidate) => candidate !== item));
      toast.success("Removed from saved work");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove saved work");
    }
  }

  return (
    <div className="app-page-shell mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[var(--saffron)]">
              <BookmarkCheck className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                Orbit memory
              </span>
            </div>
            <h1 className="mt-3 font-display text-3xl">Saved work</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              One private index for saved Space messages, Rooms, Threads, Chapters and Missions.
              Access is checked again whenever this page loads.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={!items.length}
            onClick={() => downloadOrbitSavedItems(items)}
          >
            <Download className="h-4 w-4" /> Export JSON
          </Button>
        </div>
        <form
          className="mt-5 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void load(query);
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={100}
              className="pl-9"
              placeholder="Search titles and your notes"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </header>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={`${item.objectType}:${item.objectId}`}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <Badge variant="outline" className="mb-2 capitalize">
                  {item.objectType}
                </Badge>
                <div className="truncate">
                  <SavedWorkLink item={item} />
                </div>
                {item.note ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                ) : null}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Saved {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove ${item.title} from saved work`}
                onClick={() => void remove(item)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No saved work matches this search.
        </div>
      )}
    </div>
  );
}
