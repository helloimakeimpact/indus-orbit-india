import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, ArrowUpRight } from "lucide-react";
import { discoverCommunities, type CommunitySummary } from "./event-client";
import { EventCover } from "./EventCover";
import { EventDiscovery } from "./EventDiscovery";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
export function CommunityDiscovery({ id }: { id?: string }) {
  const [rows, setRows] = useState<CommunitySummary[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    void discoverCommunities()
      .then((data) => {
        if (current) setRows(data);
      })
      .catch((e) => {
        if (current) setError(getErrorMessage(e));
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [retry]);
  if (busy)
    return (
      <div className="event-empty" role="status">
        Finding communities…
      </div>
    );
  if (error)
    return (
      <div className="event-empty">
        <h1>We couldn’t load communities.</h1>
        <p>{error}</p>
        <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
          Try again
        </Button>
      </div>
    );
  const community = id ? rows.find((c) => c.id === id) : null;
  if (id && !community)
    return (
      <div className="event-empty">
        <h1>Community not found.</h1>
        <Link to="/communities" className="event-text-link">
          Explore communities
        </Link>
      </div>
    );
  return (
    <div className="community-discovery">
      <header className="event-discovery-header">
        <div>
          <p className="event-eyebrow">Intelligence, built together.</p>
          <h1>{community?.name || "People make an orbit."}</h1>
          <p>{community?.description || "Find your people across cities, ideas and gatherings."}</p>
        </div>
        <Link to="/events" className="event-text-link">
          Explore events
          <ArrowUpRight aria-hidden className="h-4 w-4" />
        </Link>
      </header>
      {community ? (
        <>
          <p className="event-card-location">
            <MapPin aria-hidden className="h-4 w-4" />
            {[community.city, community.country].filter(Boolean).join(", ") || "Across the orbit"}
          </p>
          <Link
            to="/app/chapters/$chapterId"
            params={{ chapterId: community.id }}
            className="event-primary-button mt-4"
          >
            Visit member community
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          </Link>
          <div className="mt-12">
            <EventDiscovery chapterId={community.id} />
          </div>
        </>
      ) : rows.length === 0 ? (
        <div className="event-empty">
          <h2>Room for new communities.</h2>
          <p>Published communities will appear here.</p>
        </div>
      ) : (
        <div className="community-grid">
          {rows.map((c, i) => (
            <Link key={c.id} to="/communities/$id" params={{ id: c.id }} className="community-card">
              <EventCover template={i % 3 === 0 ? "banyan" : i % 3 === 1 ? "dawn" : "lotus"} />
              <h2>{c.name}</h2>
              <p className="event-card-location">
                <MapPin aria-hidden className="h-4 w-4" />
                {[c.city, c.country].filter(Boolean).join(", ") || "Across the orbit"}
              </p>
              <p className="line-clamp-2">{c.description}</p>
              <span className="event-text-link">
                {c.upcoming_events} upcoming {c.upcoming_events === 1 ? "event" : "events"}
                <ArrowUpRight aria-hidden className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
