import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Search, ArrowUpRight, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { discoverEvents, type EventInvitation } from "./event-client";
import { eventDate } from "./event-calendar";
import { EventCover } from "./EventCover";
import { CreateEventDialog } from "./CreateEventDialog";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";

export function EventDiscovery({
  member = false,
  chapterId,
}: {
  member?: boolean;
  chapterId?: string;
}) {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventInvitation[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<"upcoming" | "past">("upcoming");
  const [format, setFormat] = useState<"all" | "virtual" | "irl">("all");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [create, setCreate] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let current = true;
    queueMicrotask(() => {
      if (current) {
        setBusy(true);
        setError("");
        setEvents([]);
      }
    });
    void discoverEvents({ chapterId, search: query, period, format, offset: page * 24 })
      .then((data) => {
        if (current) setEvents(data);
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
  }, [chapterId, query, period, format, page, retry, user?.id]);
  return (
    <div className="event-discovery">
      <header className="event-discovery-header">
        <div>
          <p className="event-eyebrow">Indus Orbit · Community</p>
          <h1>Find your next gathering.</h1>
          <p>Meet people. Gather with purpose. Build what comes next.</p>
        </div>
        {member && user ? (
          <Button className="min-h-11 rounded-full" onClick={() => setCreate(true)}>
            <Plus aria-hidden className="mr-2 h-4 w-4" />
            Create an event
          </Button>
        ) : (
          <Link to="/communities" className="event-text-link">
            Explore communities <ArrowUpRight aria-hidden className="h-4 w-4" />
          </Link>
        )}
      </header>
      {member && (
        <Link to="/app/events/hosting" className="event-text-link mb-4">
          Your events and host workspace <ArrowUpRight aria-hidden className="h-4 w-4" />
        </Link>
      )}
      <div className="event-discovery-toolbar">
        <label className="event-search">
          <Search aria-hidden className="h-4 w-4" />
          <span className="sr-only">Search events by title, city or community</span>
          <input
            type="search"
            value={search}
            maxLength={120}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, cities, communities"
          />
        </label>
        <div className="event-filter-group" aria-label="Event dates">
          {(["upcoming", "past"] as const).map((value) => (
            <button
              key={value}
              className="event-filter"
              aria-pressed={period === value}
              onClick={() => {
                setPeriod(value);
                setPage(0);
              }}
            >
              {value === "upcoming" ? "Upcoming" : "Past"}
            </button>
          ))}
        </div>
        <label className="event-select">
          <span className="sr-only">Event format</span>
          <select
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as typeof format);
              setPage(0);
            }}
          >
            <option value="all">All formats</option>
            <option value="virtual">Online</option>
            <option value="irl">In person</option>
          </select>
        </label>
      </div>
      <div aria-live="polite" aria-busy={busy}>
        {busy ? (
          <div className="event-empty" role="status">
            <CalendarDays aria-hidden />
            <p>Finding gatherings…</p>
          </div>
        ) : error ? (
          <div className="event-empty" role="status">
            <h2>We couldn’t load events.</h2>
            <p>{error}</p>
            <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
              Try again
            </Button>
          </div>
        ) : events.length === 0 ? (
          <div className="event-empty">
            <CalendarDays aria-hidden />
            <h2>
              {query ? "No gatherings match your search." : "A little space for what comes next."}
            </h2>
            <p>
              {query
                ? "Try another city, community or title."
                : "New events will appear here when hosts publish them."}
            </p>
            {(query || format !== "all") && (
              <button
                className="event-text-link"
                onClick={() => {
                  setSearch("");
                  setQuery("");
                  setFormat("all");
                  setPage(0);
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="event-timeline">
            {events.map((event, i) => {
              const day = eventDate(event.start_time, event.timezone, {
                weekday: "long",
                day: "numeric",
                month: "short",
              });
              const prior = i
                ? eventDate(events[i - 1].start_time, events[i - 1].timezone, {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                  })
                : "";
              return (
                <div key={event.id} className="event-timeline-row">
                  <div className="event-day">{day !== prior && <span>{day}</span>}</div>
                  <Link
                    to={member ? "/app/events/$id" : "/events/$id"}
                    params={{ id: event.id }}
                    className="event-card"
                  >
                    <div className="event-card-copy">
                      <p className="event-card-time">
                        <time dateTime={event.start_time}>
                          {eventDate(event.start_time, event.timezone, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </time>
                        <span>{event.timezone.replace(/_/g, " ")}</span>
                      </p>
                      <h2>{event.title}</h2>
                      <p className="event-card-host">Hosted by {event.host_name}</p>
                      <p className="event-card-location">
                        <MapPin aria-hidden className="h-4 w-4" />
                        {event.public_location ||
                          (event.location_type === "virtual"
                            ? "Online"
                            : "Venue shared after confirmation")}
                      </p>
                      <div className="event-card-badges">
                        {event.chapter_name && <span>{event.chapter_name}</span>}
                        <span>
                          {event.lifecycle === "cancelled"
                            ? "Cancelled"
                            : event.requires_approval
                              ? "Host approval"
                              : "Free · Members"}
                        </span>
                      </div>
                    </div>
                    <EventCover template={event.cover_template} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {!busy && !error && (page > 0 || events.length === 24) && (
        <nav className="event-pagination" aria-label="Event pages">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>Page {page + 1}</span>
          <Button
            variant="outline"
            disabled={events.length < 24}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </nav>
      )}
      {!member && (
        <p className="event-membership-note">
          Events are open to discover. Public events welcome everyone. Hosts may choose a
          community-only gathering.
        </p>
      )}
      {create && user && (
        <CreateEventDialog
          key={user.id}
          onClose={() => setCreate(false)}
          onSubmitted={() => setRetry((v) => v + 1)}
        />
      )}
    </div>
  );
}
