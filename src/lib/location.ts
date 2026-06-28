type NullableLocationPart = string | null | undefined;

export type ChapterLocation = {
  city?: NullableLocationPart;
  country?: NullableLocationPart;
};

export type ProfileLocation = ChapterLocation & {
  region?: NullableLocationPart;
};

export type EventLocation = {
  location?: NullableLocationPart;
  location_type?: NullableLocationPart;
};

export function cleanLocationPart(value: NullableLocationPart) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function formatLocationParts(
  parts: NullableLocationPart[],
  {
    separator = ", ",
    fallback = "",
  }: {
    separator?: string;
    fallback?: string;
  } = {},
) {
  const seen = new Set<string>();
  const cleaned = parts.map(cleanLocationPart).filter((part) => {
    if (!part) return false;
    const key = part.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return cleaned.length ? cleaned.join(separator) : fallback;
}

export function formatChapterBaseLocation(
  location: ChapterLocation,
  fallback = "Base location not set",
) {
  return formatLocationParts([location.city, location.country], { fallback });
}

export function formatProfileLocation(location: ProfileLocation, fallback = "") {
  return formatLocationParts([location.city, location.country || location.region], { fallback });
}

export function formatInlineProfileLocation(location: ProfileLocation, fallback = "No location") {
  return formatLocationParts([location.city, location.country || location.region], {
    separator: " · ",
    fallback,
  });
}

export function formatEventLocation(event: EventLocation) {
  const detail = cleanLocationPart(event.location);
  if (detail) return detail;

  const type = cleanLocationPart(event.location_type).toLowerCase();
  if (type === "virtual") return "Online location not set";
  if (type === "irl") return "Venue/address not set";
  return "Location not set";
}

export function formatLocationTypeLabel(type: NullableLocationPart) {
  const normalized = cleanLocationPart(type).toLowerCase();
  if (normalized === "virtual") return "Virtual";
  if (normalized === "irl") return "In-person";
  return normalized || "Location";
}

export function getEventLocationFieldCopy(type: NullableLocationPart) {
  return cleanLocationPart(type).toLowerCase() === "virtual"
    ? {
        label: "Online location",
        placeholder: "Zoom, Google Meet, Discord, or event room",
        helper: "Use the link field for the actual join URL when available.",
      }
    : {
        label: "Venue or address",
        placeholder: "Venue name, street address, city",
        helper: "Use as much detail as attendees need. The chapter base location is separate.",
      };
}
