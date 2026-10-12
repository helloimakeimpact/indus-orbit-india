import type { DeliveryTemplate } from "../notifications/email-template.ts";

export const eventKinds = [
  "registration",
  "changed",
  "cancelled",
  "reminder_24h",
  "reminder_1h",
] as const;
const statuses = ["confirmed", "pending", "waitlisted", "cancelled", "rejected"];
export function canonicalEventOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value && !url.username && !url.password
      ? url.origin
      : null;
  } catch {
    return null;
  }
}
function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
export function renderEventEmail(data: Record<string, unknown>, origin: string): DeliveryTemplate {
  const {
    event_id: id,
    title,
    timezone,
    start_time: starts,
    end_time: ends,
    kind,
    registration_status: status,
  } = data;
  if (
    !canonicalEventOrigin(origin) ||
    typeof id !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id) ||
    typeof title !== "string" ||
    !title.trim() ||
    title.length > 160 ||
    typeof timezone !== "string" ||
    typeof starts !== "string" ||
    typeof ends !== "string" ||
    !eventKinds.includes(kind as (typeof eventKinds)[number]) ||
    !statuses.includes(status as string) ||
    !Number.isFinite(Date.parse(starts)) ||
    !Number.isFinite(Date.parse(ends))
  ) {
    throw new Error("Invalid event template");
  }
  const cleanTitle = title.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, " ").trim();
  const formatter = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  });
  const timing = `${formatter.format(new Date(starts))} — ${formatter.format(new Date(ends))} (${timezone})`;
  const registration = {
    confirmed: "Your place is confirmed.",
    pending: "Your registration is awaiting the host's approval.",
    waitlisted: "You are on the waitlist. We will email you if a place becomes available.",
    cancelled: "Your registration has been cancelled.",
    rejected: "The host could not approve your registration.",
  }[status as string];
  const heading =
    kind === "cancelled"
      ? "Event cancelled"
      : kind === "changed"
        ? "Event updated"
        : kind === "reminder_24h"
          ? "Your event is tomorrow"
          : kind === "reminder_1h"
            ? "Your event starts in one hour"
            : status === "confirmed"
              ? "You're registered"
              : status === "waitlisted"
                ? "You're on the waitlist"
                : status === "pending"
                  ? "Registration received"
                  : "Registration update";
  const explanation =
    kind === "cancelled"
      ? "The host has cancelled this event. It will no longer take place."
      : kind === "changed"
        ? `The host updated the event details. ${registration}`
        : kind === "reminder_24h" || kind === "reminder_1h"
          ? "Your place is confirmed. View the invitation for the latest details."
          : registration;
  const url = `${origin}/events/${id}`;
  const guestLine =
    data.guest === true
      ? "For your private registration and access details, use your original verified email link or request a new link on the invitation."
      : "Sign in to view your registration and any private access details.";
  const venue = typeof data.public_location === "string" ? data.public_location.slice(0, 160) : "";
  return {
    subject: `${heading}: ${cleanTitle}`,
    text: [
      heading,
      cleanTitle,
      explanation,
      timing,
      venue,
      guestLine,
      url,
      "Indus Orbit · Intelligence, built together.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    html: [
      '<div style="font-family:ui-sans-serif,system-ui,sans-serif;color:#18142f;line-height:1.6;max-width:560px">',
      '<p style="font-size:12px;letter-spacing:.12em;color:#b75b12">INDUS ORBIT</p>',
      `<h1 style="font-size:24px">${escape(heading)}</h1><h2 style="font-size:20px">${escape(cleanTitle)}</h2>`,
      `<p>${escape(explanation ?? "")}</p><p>${escape(timing)}</p>`,
      venue ? `<p>${escape(venue)}</p>` : "",
      `<p>${escape(guestLine)}</p><p><a href="${escape(url)}">View invitation</a></p>`,
      '<p style="font-size:12px;color:#6b6475">Intelligence, built together.</p></div>',
    ].join(""),
  };
}
