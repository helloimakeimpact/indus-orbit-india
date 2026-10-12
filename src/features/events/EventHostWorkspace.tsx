import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  getEventWorkspace,
  getHostEventDraft,
  reviewEvent,
  reviewHost,
  type HostedEvent,
  type EventEdit,
} from "./event-client";
import { CreateEventDialog } from "./CreateEventDialog";
import { getErrorMessage } from "@/lib/errors";
export function EventHostWorkspace() {
  const { user } = useAuth();
  return <HostContent key={user?.id} />;
}
function HostContent() {
  const [loadedAt] = useState(Date.now);
  const [workspace, setWorkspace] = useState<Awaited<ReturnType<typeof getEventWorkspace>> | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [create, setCreate] = useState(false);
  const [edit, setEdit] = useState<{ data: EventEdit; opener: HTMLElement } | null>(null);
  const [selectedHost, setSelectedHost] = useState<HostedEvent | null>(null);
  const [reason, setReason] = useState("");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    void getEventWorkspace()
      .then((data) => {
        if (active.current) setWorkspace(data);
      })
      .catch((e) => {
        if (active.current) setError(getErrorMessage(e));
      });
    return () => {
      active.current = false;
    };
  }, []);
  async function action(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
      const next = await getEventWorkspace();
      if (active.current) {
        setWorkspace(next);
        setSelectedHost(null);
        setReason("");
      }
    } catch (e) {
      if (active.current) setError(getErrorMessage(e));
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <div className="event-host-workspace">
      <header className="event-discovery-header">
        <div>
          <p className="event-eyebrow">Indus Orbit · Hosting</p>
          <h1>Make room for connection.</h1>
          <p>
            {workspace?.approvedHost
              ? "You are an approved host. Chapter events still require the chapter’s publication authority."
              : "Create your first event for review. Host approval is a separate decision about future publication."}
          </p>
        </div>
        <Button onClick={() => setCreate(true)}>Create an event</Button>
      </header>
      <Link to="/app/events" className="event-text-link">
        Browse all events
      </Link>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {!workspace && !error && <p role="status">Loading host workspace…</p>}
      {workspace && (
        <>
          <section className="event-host-tools">
            <h2>Your gatherings</h2>
            {workspace.hosted.length === 0 ? (
              <p>No events yet. Your first invitation starts here.</p>
            ) : (
              <ul className="event-guest-list">
                {workspace.hosted.map((event) => (
                  <li key={event.id}>
                    <div>
                      <p>{event.title}</p>
                      <span>
                        {event.lifecycle === "cancelled"
                          ? "Cancelled"
                          : event.status === "pending"
                            ? "Awaiting review"
                            : event.status}
                      </span>
                    </div>
                    {event.status === "approved" && (
                      <Link
                        className="event-text-link"
                        to="/app/events/$id"
                        params={{ id: event.id }}
                      >
                        Open invitation
                      </Link>
                    )}
                    {event.lifecycle !== "cancelled" &&
                      new Date(event.start_time).getTime() > loadedAt &&
                      (event.status === "pending" ||
                        (event.status === "approved" &&
                          (workspace.approvedHost || workspace.canReviewHosts))) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={(clickEvent) => {
                            const opener = clickEvent.currentTarget;
                            void action(async () => {
                              const details = await getHostEventDraft(event.id);
                              if (active.current) setEdit({ data: details, opener });
                            });
                          }}
                        >
                          Edit event
                        </Button>
                      )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {workspace.review.length > 0 && (
            <section className="event-host-tools">
              <h2>Review new events</h2>
              <p>
                Review the description, timing and private access details before approving.
                Approving an event leaves future host approval as a separate decision.
              </p>
              <ul className="event-guest-list">
                {workspace.review.map((event) => (
                  <li key={event.id}>
                    <div>
                      <p>{event.title}</p>
                      <span>By {event.host_name}</span>
                      <details className="mt-3">
                        <summary className="event-text-link cursor-pointer">
                          Review invitation details
                        </summary>
                        <p className="whitespace-pre-wrap mt-3">{event.description}</p>
                        <p className="mt-3">
                          {event.start_time} – {event.end_time} · {event.timezone}
                        </p>
                        <p>{event.public_location || event.location_type}</p>
                        {event.location && (
                          <p className="whitespace-pre-wrap">Private venue: {event.location}</p>
                        )}
                        {event.join_url && (
                          <a
                            className="event-text-link"
                            href={event.join_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Review private access link
                          </a>
                        )}
                      </details>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void action(() => reviewEvent(event.id, true, event.revision))
                        }
                      >
                        Approve event
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void action(() => reviewEvent(event.id, false, event.revision))
                        }
                      >
                        Decline
                      </Button>
                      {workspace.canReviewHosts && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setSelectedHost(event)}
                        >
                          Review host
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {selectedHost && (
            <form
              className="event-host-tools event-create-form"
              onSubmit={(e) => {
                e.preventDefault();
                void action(() => reviewHost(selectedHost.organizer_id!, true, reason));
              }}
            >
              <h2>Approve {selectedHost.host_name} as a host</h2>
              <label>
                Review reason
                <textarea
                  required
                  minLength={8}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <p className="text-sm text-muted-foreground">
                This permits future public events without individual review outside chapters. A
                separate operator must review your own host access.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} type="submit">
                  Approve host
                </Button>
                <Button
                  disabled={busy}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedHost(null);
                    setReason("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
          <p className="event-membership-note">
            This workspace shows the latest 100 hosted events and up to 100 review requests. Guest
            lists currently show up to 1,000 registrations per event.
          </p>
        </>
      )}
      {create && (
        <CreateEventDialog
          onClose={() => setCreate(false)}
          onSubmitted={() => void action(async () => {})}
        />
      )}
      {edit && (
        <CreateEventDialog
          edit={edit.data}
          returnFocusTo={edit.opener}
          onClose={() => setEdit(null)}
          onSubmitted={() => void action(async () => {})}
        />
      )}
    </div>
  );
}
