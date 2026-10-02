import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HumanVerification } from "@/components/site/HumanVerification";
import { getErrorMessage } from "@/lib/errors";
import type { EventInvitation } from "./event-client";
import {
  takeGuestLink,
  forgetGuestLink,
  requestGuestLink,
  getGuestReceipt,
  type GuestReceipt,
} from "./guest-registration-client";

export function GuestRegistrationCard({
  event,
  closed,
}: {
  event: EventInvitation;
  closed: boolean;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [linkRevision, setLinkRevision] = useState(0);
  const [receipt, setReceipt] = useState<GuestReceipt | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true),
    sequence = useRef(0),
    mutating = useRef(false);
  useEffect(() => {
    alive.current = true;
    const acceptLink = () => {
      if (!alive.current) return;
      const credential = takeGuestLink(event.id);
      ++sequence.current;
      setReceipt(null);
      setError("");
      setLoading(Boolean(credential));
      setWorking(false);
      mutating.current = false;
      setToken(credential);
      setLinkRevision((value) => value + 1);
    };
    const onHashChange = () => {
      if (/^#guest=/.test(window.location.hash)) acceptLink();
    };
    queueMicrotask(acceptLink);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      alive.current = false;
      ++sequence.current;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [event.id]);
  useEffect(() => {
    if (!token) return;
    let current = true;
    const refresh = () => {
      if (document.visibilityState !== "visible" || mutating.current) return;
      const version = ++sequence.current;
      setReceipt((previous) => (previous ? { ...previous, location: null, joinUrl: null } : null));
      void getGuestReceipt(event.id, token)
        .then((value) => {
          if (current && version === sequence.current) {
            setReceipt(value);
            setError("");
          }
        })
        .catch((e) => {
          if (current && version === sequence.current) {
            setReceipt(null);
            setError(getErrorMessage(e));
          }
        })
        .finally(() => {
          if (current && version === sequence.current) setLoading(false);
        });
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = window.setInterval(refresh, 300000);
    return () => {
      current = false;
      ++sequence.current;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(interval);
    };
  }, [event.id, token, linkRevision]);
  async function act(action: "confirm" | "cancel") {
    if (!token || working) return;
    mutating.current = true;
    const version = ++sequence.current;
    setWorking(true);
    setError("");
    try {
      const value = await getGuestReceipt(event.id, token, action);
      if (alive.current && version === sequence.current) setReceipt(value);
    } catch (e) {
      if (alive.current && version === sequence.current) {
        setReceipt(null);
        setError(getErrorMessage(e));
      }
    } finally {
      if (version === sequence.current) {
        mutating.current = false;
        if (alive.current) setWorking(false);
      }
    }
  }
  const active = receipt && ["confirmed", "pending", "waitlisted"].includes(receipt.status ?? "");
  const title = closed
    ? "Registration closed"
    : loading
      ? "Checking your registration…"
      : receipt?.needsConfirmation
        ? "Confirm your registration"
        : receipt?.status === "confirmed"
          ? "You’re going."
          : receipt?.status === "pending"
            ? "Awaiting host approval"
            : receipt?.status === "waitlisted"
              ? "You’re on the waitlist"
              : receipt?.status === "rejected"
                ? "Registration declined"
                : receipt?.status === "cancelled"
                  ? "Registration cancelled"
                  : sent
                    ? "Check your email"
                    : "Join this gathering";
  return (
    <section className="event-registration-card" aria-labelledby="guest-registration-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="guest-registration-title">{title}</h2>
        <span className="event-status-pill">Free event</span>
      </div>
      <p>
        {closed
          ? "This gathering is no longer accepting registrations."
          : receipt?.needsConfirmation
            ? "Your email link is valid. Confirm below to request a place; availability and host approval still apply."
            : receipt?.status === "confirmed"
              ? "Your place is confirmed. Keep your private email link to manage it."
              : receipt?.status === "pending"
                ? "The host will review your request. A place is reserved only after confirmation."
                : receipt?.status === "waitlisted"
                  ? "Your place isn’t confirmed yet. Check your private link for updates as places open."
                  : receipt?.status === "rejected"
                    ? "Contact the host if you have a question about this decision."
                    : sent
                      ? "If registration is available, an email link is on its way. Open it within 15 minutes and choose Confirm registration. Your place is not reserved yet."
                      : "Register with your name and email. No Indus Orbit account is needed."}
      </p>
      {error && <p role="alert">{error}</p>}
      {!closed && !loading && token && receipt?.needsConfirmation && (
        <Button
          className="min-h-11 w-full rounded-xl"
          disabled={working}
          onClick={() => void act("confirm")}
        >
          {working
            ? "Confirming…"
            : event.requires_approval
              ? "Confirm and request to join"
              : "Confirm registration"}
        </Button>
      )}
      {!closed && active && (
        <Button
          className="min-h-11 w-full rounded-xl"
          variant="outline"
          disabled={working || Boolean(receipt.checkedInAt)}
          onClick={() => void act("cancel")}
        >
          {receipt.checkedInAt ? "Checked in" : working ? "Updating…" : "Cancel registration"}
        </Button>
      )}
      {!closed && receipt?.status === "confirmed" && (
        <div className="event-access-details">
          <div>
            <p className="font-medium">Your access details</p>
            {receipt.location && <p className="whitespace-pre-wrap">{receipt.location}</p>}
            {receipt.joinUrl && (
              <a
                href={receipt.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="event-text-link"
              >
                Open event link
              </a>
            )}
          </div>
        </div>
      )}
      {token && !loading && (
        <button
          className="event-text-link mt-3"
          disabled={working}
          onClick={() => {
            forgetGuestLink(event.id);
            ++sequence.current;
            setToken(null);
            setReceipt(null);
            setError("");
            setSent(false);
          }}
        >
          Use another email or request a new link
        </button>
      )}
      {!closed && !loading && !token && (
        <form
          className="event-guest-form"
          onFocusCapture={() => setEnabled(true)}
          onSubmit={async (e) => {
            e.preventDefault();
            if (working || !captcha) return;
            setWorking(true);
            setError("");
            try {
              await requestGuestLink(event.id, name, email, captcha);
              if (alive.current) setSent(true);
            } catch (err) {
              if (alive.current) setError(getErrorMessage(err));
            } finally {
              if (alive.current) {
                setWorking(false);
                setCaptcha("");
                setResetKey((value) => value + 1);
              }
            }
          }}
        >
          <label>
            Your name
            <input
              autoComplete="name"
              required
              maxLength={120}
              value={name}
              disabled={working}
              onChange={(e) => {
                setName(e.target.value);
                setSent(false);
              }}
            />
          </label>
          <label>
            Email address
            <input
              autoComplete="email"
              type="email"
              required
              maxLength={254}
              value={email}
              disabled={working}
              onChange={(e) => {
                setEmail(e.target.value);
                setSent(false);
              }}
            />
          </label>
          {event.requires_approval && <p>The host approves each registration.</p>}
          <HumanVerification
            enabled={enabled}
            action="event_registration"
            onToken={setCaptcha}
            resetKey={resetKey}
          />
          <Button
            className="min-h-11 w-full rounded-xl"
            type="submit"
            disabled={working || !captcha}
          >
            {working ? "Sending…" : sent ? "Send a new email link" : "Continue with email"}
          </Button>
          <p className="text-xs">
            Your name and email are used to manage this event. Registration does not subscribe you
            to marketing. Your email link is private; do not share it.
          </p>
        </form>
      )}
    </section>
  );
}
