import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  MapPin,
  ArrowLeft,
  ArrowUpRight,
  Share2,
  CheckCircle2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { GuestRegistrationCard } from "./GuestRegistrationCard";
import { EventCover } from "./EventCover";
import {
  discoverEvents,
  getRegistration,
  register,
  cancelRegistration,
  getGuests,
  manageGuest,
  cancelEvent,
  type EventInvitation,
  type Registration,
  type EventGuest,
} from "./event-client";
import { eventDate, eventCalendar } from "./event-calendar";
import { getErrorMessage } from "@/lib/errors";

export function EventInvitationPage({ id, member = false }: { id: string; member?: boolean }) {
  const { user } = useAuth();
  // Identity and event changes destroy old private state, including in-flight
  // response ownership. Mutations also assert this actor inside the database.
  return (
    <InvitationContent
      key={`${id}:${user?.id ?? "guest"}`}
      id={id}
      userId={user?.id}
      member={member}
    />
  );
}
function InvitationContent({
  id,
  userId,
  member,
}: {
  id: string;
  userId?: string;
  member: boolean;
}) {
  const [event, setEvent] = useState<EventInvitation | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [busy, setBusy] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [retry, setRetry] = useState(0);
  const [guests, setGuests] = useState<EventGuest[] | null>(null);
  const [guestPage, setGuestPage] = useState(0);
  const [hostBusy, setHostBusy] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const alive = useRef(true);
  const registrationRequest = useRef(0);
  const mutationInFlight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    queueMicrotask(() => {
      if (current) {
        setBusy(true);
        setError("");
      }
    });
    void discoverEvents({ eventId: id, period: "all" })
      .then((rows) => {
        if (current) setEvent(rows[0] ?? null);
      })
      .catch((e) => {
        if (current) setError(getErrorMessage(e));
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    const registrationVersion = ++registrationRequest.current;
    if (userId)
      void getRegistration(id)
        .then((state) => {
          if (current && registrationVersion === registrationRequest.current) {
            setRegistration(state);
            setRegistrationError("");
          }
        })
        .catch((e) => {
          if (current && registrationVersion === registrationRequest.current)
            setRegistrationError(getErrorMessage(e));
        });
    return () => {
      current = false;
    };
  }, [id, userId, retry]);
  useEffect(() => {
    if (!userId) return;
    let current = true;
    const refresh = () => {
      if (document.visibilityState !== "visible" || mutationInFlight.current) return;
      const version = ++registrationRequest.current;
      setRegistration((previous) =>
        previous ? { ...previous, location: null, joinUrl: null, canManage: false } : null,
      );
      void getRegistration(id)
        .then((state) => {
          if (current && version === registrationRequest.current) {
            setRegistration(state);
            setRegistrationError("");
          }
        })
        .catch((e) => {
          if (current && version === registrationRequest.current) {
            setGuests(null);
            setRegistrationError(getErrorMessage(e));
          }
        });
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 300000);
    return () => {
      current = false;
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [id, userId]);
  async function changeRegistration(cancel = false) {
    if (!userId || working) return;
    mutationInFlight.current = true;
    ++registrationRequest.current;
    setWorking(true);
    setRegistrationError("");
    try {
      const state = await (cancel ? cancelRegistration(id, userId) : register(id, userId));
      if (alive.current) {
        setRegistration(state);
        toast.success(
          cancel
            ? "Registration cancelled."
            : state.status === "confirmed"
              ? "You’re confirmed."
              : state.status === "waitlisted"
                ? "You’re on the waitlist."
                : "Your request is with the host.",
        );
      }
    } catch (e) {
      if (alive.current) setRegistrationError(getErrorMessage(e));
    } finally {
      mutationInFlight.current = false;
      if (alive.current) setWorking(false);
    }
  }
  async function loadGuests(page = guestPage) {
    if (hostBusy) return;
    setHostBusy(true);
    try {
      const list = await getGuests(id, page);
      if (alive.current) {
        setGuests(list);
        setGuestPage(page);
      }
    } catch (e) {
      if (alive.current) toast.error(getErrorMessage(e));
    } finally {
      if (alive.current) setHostBusy(false);
    }
  }
  async function guestAction(guest: EventGuest, action: "approve" | "reject" | "check_in") {
    if (!userId || hostBusy) return;
    setHostBusy(true);
    try {
      await manageGuest(id, guest.id, action, userId);
      const list = await getGuests(id, guestPage);
      if (alive.current) setGuests(list);
    } catch (e) {
      if (alive.current) toast.error(getErrorMessage(e));
    } finally {
      if (alive.current) setHostBusy(false);
    }
  }
  function downloadCalendar() {
    if (!event) return;
    const url = URL.createObjectURL(
      new Blob([eventCalendar(event)], { type: "text/calendar;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `indus-orbit-${event.id}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (busy)
    return (
      <div className="event-empty" role="status">
        Opening the invitation…
      </div>
    );
  if (error || !event)
    return (
      <div className="event-empty">
        <h1>{error ? "We couldn’t open this event." : "This invitation isn’t available."}</h1>
        <p>{error || "It may be private, awaiting review, or no longer available."}</p>
        {error && (
          <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
            Try again
          </Button>
        )}
        <Link to={member ? "/app/events" : "/events"} className="event-text-link">
          Browse events
        </Link>
      </div>
    );
  const closed = event.lifecycle === "cancelled" || new Date(event.end_time) <= new Date();
  const status = registration?.status;
  const active = status === "confirmed" || status === "pending" || status === "waitlisted";
  return (
    <article className="event-invitation">
      <div className="event-invitation-top">
        <Link to={member ? "/app/events" : "/events"} className="event-text-link">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          All events
        </Link>
        <button
          className="event-icon-button"
          aria-label="Share event"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${window.location.origin}/events/${id}`);
              if (alive.current) toast.success("Invitation link copied.");
            } catch {
              if (alive.current)
                toast.error("Couldn’t copy the link. Copy this page’s address instead.");
            }
          }}
        >
          <Share2 aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <div className="event-invitation-grid">
        <aside className="event-invitation-aside">
          <EventCover template={event.cover_template} priority />
          <div className="event-host-block">
            <p className="event-eyebrow">Hosted by</p>
            <p>{event.host_name}</p>
            {event.chapter_name && (
              <Link
                to="/communities/$id"
                params={{ id: event.chapter_id! }}
                className="event-text-link"
              >
                {event.chapter_name}
                <ArrowUpRight aria-hidden className="h-4 w-4" />
              </Link>
            )}
          </div>
        </aside>
        <div className="event-invitation-main">
          <p className="event-eyebrow">{event.chapter_name || "Indus Orbit gathering"}</p>
          <h1>{event.title}</h1>
          <div className="event-facts">
            <div>
              <CalendarDays aria-hidden />
              <div>
                <p>
                  {eventDate(event.start_time, event.timezone, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p>
                  {eventDate(event.start_time, event.timezone, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  –{" "}
                  {eventDate(event.end_time, event.timezone, {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  <br />
                  <span>{event.timezone.replace(/_/g, " ")}</span>
                </p>
              </div>
            </div>
            <div>
              <MapPin aria-hidden />
              <div>
                <p>
                  {event.public_location ||
                    (event.location_type === "virtual" ? "Online" : "In person")}
                </p>
                <p>Access details are shared after confirmation.</p>
              </div>
            </div>
          </div>
          {event.registration_scope === "public" ? (
            <GuestRegistrationCard event={event} closed={closed} />
          ) : (
            <section className="event-registration-card" aria-labelledby="registration-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="registration-title">
                  {closed
                    ? event.lifecycle === "cancelled"
                      ? "Event cancelled"
                      : "Registration closed"
                    : status === "confirmed"
                      ? "You’re going."
                      : status === "pending"
                        ? "Awaiting host approval"
                        : status === "waitlisted"
                          ? "You’re on the waitlist"
                          : status === "rejected"
                            ? "Registration declined"
                            : "Join this gathering"}
                </h2>
                <span className="event-status-pill">Free event</span>
              </div>
              <p>
                {closed
                  ? "This gathering is no longer accepting registrations."
                  : status === "confirmed"
                    ? "Your place is confirmed. We look forward to seeing you."
                    : status === "pending"
                      ? "The host will review your request. A place is reserved only after confirmation."
                      : status === "waitlisted"
                        ? "Your place isn’t confirmed yet. Check this page for changes; eligible guests move up as places open."
                        : status === "rejected"
                          ? "Contact the host if you have a question about this decision."
                          : event.registration_scope === "chapter"
                            ? "Registration is for active members of this chapter."
                            : "Registration is for active Indus Orbit Community members."}
              </p>
              {!closed && event.requires_approval && !active && <p>Host approval is required.</p>}
              {registrationError && (
                <div role="alert">
                  <p>{registrationError}</p>
                  <button className="event-text-link" onClick={() => setRetry((v) => v + 1)}>
                    Check again
                  </button>
                </div>
              )}
              {!closed &&
                status !== "rejected" &&
                (userId ? (
                  <Button
                    className="min-h-11 w-full rounded-xl"
                    variant={active ? "outline" : "default"}
                    disabled={working || !registration || Boolean(registration.checkedInAt)}
                    onClick={() => void changeRegistration(active)}
                  >
                    {registration?.checkedInAt
                      ? "Checked in"
                      : working
                        ? "Updating…"
                        : active
                          ? "Cancel registration"
                          : event.requires_approval
                            ? "Request to join"
                            : "Register for free"}
                  </Button>
                ) : (
                  <Link
                    to="/auth"
                    search={{ intent: "community", next: `/events/${id}` }}
                    className="event-primary-button"
                  >
                    Sign in to register
                    <ArrowUpRight aria-hidden className="h-4 w-4" />
                  </Link>
                ))}
              {userId && !closed && !active && (
                <Link to="/onboarding" search={{ eventId: id }} className="event-text-link mt-3">
                  Complete Community membership
                  <ArrowUpRight aria-hidden className="h-4 w-4" />
                </Link>
              )}
              {!closed && status === "confirmed" && (
                <div className="event-access-details">
                  <CheckCircle2 aria-hidden className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Your access details</p>
                    {registration?.location && (
                      <p className="whitespace-pre-wrap">{registration.location}</p>
                    )}
                    {registration?.joinUrl && (
                      <a
                        href={registration.joinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="event-text-link"
                      >
                        Open event link
                        <ArrowUpRight aria-hidden className="h-4 w-4" />
                      </a>
                    )}
                    {registration?.checkedInAt && <p>Checked in</p>}
                  </div>
                </div>
              )}
              <button className="event-text-link mt-3" onClick={downloadCalendar}>
                <CalendarDays aria-hidden className="h-4 w-4" />
                Add to calendar
              </button>
            </section>
          )}
          {event.registration_scope === "public" && (
            <button className="event-text-link" onClick={downloadCalendar}>
              <CalendarDays aria-hidden className="h-4 w-4" />
              Add to calendar
            </button>
          )}
          <section className="event-about">
            <h2>About this gathering</h2>
            <p>{event.description}</p>
          </section>
          {registration?.canManage && (
            <section className="event-host-tools">
              <h2>Host workspace</h2>
              <p>
                Review requests and check in confirmed guests. Guest identities are visible only to
                the host and authorized operators.
              </p>
              <Button variant="outline" disabled={hostBusy} onClick={() => void loadGuests()}>
                <Users aria-hidden className="mr-2 h-4 w-4" />
                {hostBusy ? "Loading…" : guests ? "Refresh guests" : "Manage guests"}
              </Button>
              {registration.location && (
                <p className="mt-3 whitespace-pre-wrap">{registration.location}</p>
              )}
              {registration.joinUrl && (
                <a
                  className="event-text-link"
                  href={registration.joinUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Host access link
                </a>
              )}
              {guests && (
                <ul className="event-guest-list">
                  {guests.length === 0 ? (
                    <li>No registrations yet.</li>
                  ) : (
                    guests.map((guest) => (
                      <li key={guest.id}>
                        <div>
                          <p>{guest.display_name}</p>
                          <span>{guest.checked_in_at ? "Checked in" : guest.status}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {guest.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                disabled={hostBusy || closed}
                                onClick={() => void guestAction(guest, "approve")}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={hostBusy || closed}
                                onClick={() => void guestAction(guest, "reject")}
                              >
                                Decline
                              </Button>
                            </>
                          )}
                          {guest.status === "confirmed" && !guest.checked_in_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={hostBusy || closed}
                              onClick={() => void guestAction(guest, "check_in")}
                            >
                              Check in
                            </Button>
                          )}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              )}
              {guests && (guestPage > 0 || guests.length === 100) && (
                <nav className="event-pagination" aria-label="Guest list pages">
                  <Button
                    variant="outline"
                    disabled={hostBusy || guestPage === 0}
                    onClick={() => void loadGuests(guestPage - 1)}
                  >
                    Previous guests
                  </Button>
                  <span>Page {guestPage + 1}</span>
                  <Button
                    variant="outline"
                    disabled={hostBusy || guests.length < 100}
                    onClick={() => void loadGuests(guestPage + 1)}
                  >
                    More guests
                  </Button>
                </nav>
              )}
              {!closed &&
                (cancelConfirm ? (
                  <div className="mt-4">
                    <p>
                      Cancel this event for everyone? Guests will see the cancellation on their
                      invitation.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        variant="destructive"
                        disabled={hostBusy}
                        onClick={async () => {
                          if (!userId || hostBusy) return;
                          setHostBusy(true);
                          try {
                            await cancelEvent(id, userId);
                            if (alive.current) {
                              setCancelConfirm(false);
                              setRetry((v) => v + 1);
                            }
                          } catch (e) {
                            if (alive.current) toast.error(getErrorMessage(e));
                          } finally {
                            if (alive.current) setHostBusy(false);
                          }
                        }}
                      >
                        Cancel event
                      </Button>
                      <Button
                        variant="outline"
                        disabled={hostBusy}
                        onClick={() => setCancelConfirm(false)}
                      >
                        Keep event
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button className="event-text-link mt-4" onClick={() => setCancelConfirm(true)}>
                    Cancel this event
                  </button>
                ))}
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
