import assert from "node:assert/strict";
import test from "node:test";
import { eventCalendar, eventDate } from "./event-calendar.ts";
const event = {
  id: "event-id",
  title: "Meet, build; together",
  description: "A gathering\nA second line",
  start_time: "2026-10-03T10:00:00Z",
  end_time: "2026-10-03T12:00:00Z",
  public_location: "Bengaluru",
};
test("calendar uses UTC instants, escaped text and a stable public invitation URL", () => {
  const file = eventCalendar(event, new Date("2026-10-01T00:00:00Z"));
  assert.ok(file.includes("DTSTART:20261003T100000Z\r\n"));
  assert.ok(file.includes("SUMMARY:Meet\\, build\\; together"));
  assert.ok(file.includes("DESCRIPTION:A gathering\\nA second line"));
  assert.ok(file.includes("URL:https://indusorbit.com/events/event-id"));
});
test("long Unicode calendar lines fold at at most 75 UTF-8 octets", () => {
  const file = eventCalendar({ ...event, title: "भारत 🪷 ".repeat(30) });
  for (const line of file.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.ok(file.includes("\r\n "));
});
test("description newlines cannot inject calendar fields", () => {
  const file = eventCalendar({
    ...event,
    title: "Title\r\nATTENDEE:injected",
    public_location: null,
  });
  assert.equal(
    file.split("\r\n").some((line) => line.startsWith("ATTENDEE:")),
    false,
  );
  assert.ok(file.includes("LOCATION:Details in Indus Orbit"));
});
test("event date uses the event timezone rather than the browser timezone", () => {
  assert.match(
    eventDate("2026-10-03T20:00:00Z", "Asia/Kolkata", { day: "numeric", month: "long" }),
    /4 October/,
  );
});
