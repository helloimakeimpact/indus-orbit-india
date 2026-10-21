import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { getCommunityChatLinks } from "@/features/events/event-discussion-client";
import type { CommunityChatLink } from "@/features/events/event-discussion-contract";
export function CommunityChatLinks({ userId }: { userId: string }) {
  const [result, setResult] = useState<{
    owner: string;
    links: CommunityChatLink[];
    error: boolean;
    loading: boolean;
  }>({ owner: userId, links: [], error: false, loading: true });
  const links = result.owner === userId ? result.links : [];
  const error = result.owner === userId && result.error;
  const loading = result.owner !== userId || result.loading;
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void getCommunityChatLinks()
      .then((items) => {
        if (active) setResult({ owner: userId, links: items, error: false, loading: false });
      })
      .catch(() => {
        if (active) setResult({ owner: userId, links: [], error: true, loading: false });
      });
    return () => {
      active = false;
    };
  }, [userId, retry]);
  return (
    <section aria-label="Community conversations" className="border-b border-border px-4 py-3">
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Users aria-hidden className="h-3.5 w-3.5" />
        Community conversations
      </h2>
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Opening community conversations…
        </p>
      ) : error ? (
        <button
          className="text-sm text-primary underline"
          onClick={() => {
            setResult({ owner: userId, links: [], error: false, loading: true });
            setRetry((v) => v + 1);
          }}
        >
          Try community conversations again
        </button>
      ) : !links.length ? (
        <p className="text-sm text-muted-foreground">
          No community conversations yet. Joined chapters, missions and event discussions appear
          here.
        </p>
      ) : (
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.id}>
              {link.kind === "event" && link.eventId ? (
                <Link
                  to="/app/events/$id"
                  params={{ id: link.eventId }}
                  hash="discussion"
                  className="block rounded-lg px-2 py-2 text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2"
                >
                  <span className="block truncate">{link.title}</span>
                  <span className="text-xs text-muted-foreground">Event discussion</span>
                </Link>
              ) : (
                <Link
                  to="/app/spaces/$spaceId"
                  params={{ spaceId: link.spaceId }}
                  className="block rounded-lg px-2 py-2 text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2"
                >
                  <span className="block truncate">{link.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {link.kind === "chapter" ? "Chapter" : "Mission"}
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
