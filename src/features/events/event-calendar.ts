export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  public_location: string | null;
};
const escape = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const stamp = (value: string) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
// RFC 5545 folds by UTF-8 octets, not JavaScript characters. Keep private venue
// and join credentials out of exported calendar files and public share links.
function fold(value: string) {
  const lines: string[] = [];
  let line = "";
  let bytes = 0;
  for (const char of value) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) {
      lines.push(line);
      line = " ";
      bytes = 1;
    }
    line += char;
    bytes += size;
  }
  lines.push(line);
  return lines.join("\r\n");
}
export function eventCalendar(event: CalendarEvent, now = new Date()) {
  const rows = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Indus Orbit//Community Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@indusorbit.com`,
    `DTSTAMP:${stamp(now.toISOString())}`,
    `DTSTART:${stamp(event.start_time)}`,
    `DTEND:${stamp(event.end_time)}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    `LOCATION:${escape(event.public_location ?? "Details in Indus Orbit")}`,
    `URL:https://indusorbit.com/events/${encodeURIComponent(event.id)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return rows.map(fold).join("\r\n") + "\r\n";
}
export function eventDate(value: string, zone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", { ...options, timeZone: zone }).format(new Date(value));
}
