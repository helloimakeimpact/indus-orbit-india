export type EventDiscussion = {
  eventId: string;
  enabled: boolean;
  version: number;
  canManage: boolean;
  canJoin: boolean;
  joined: boolean;
  roomId: string | null;
  canPost: boolean;
  postingClosesAt: string | null;
};
export type CommunityChatLink = {
  id: string;
  title: string;
  kind: "chapter" | "mission" | "event";
  spaceId: string;
  roomId: string;
  eventId: string | null;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid discussion response.");
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== "string" || !uuid.test(value))
    throw new Error("Invalid discussion identity.");
  return value;
}
export function parseEventDiscussion(value: unknown, eventId: string): EventDiscussion {
  const row = object(value);
  if (id(row.eventId) !== eventId || !Number.isInteger(row.version) || (row.version as number) < 0)
    throw new Error("Invalid discussion response.");
  for (const key of ["enabled", "canManage", "canJoin", "joined", "canPost"] as const) {
    if (typeof row[key] !== "boolean") throw new Error("Invalid discussion permissions.");
  }
  const roomId = row.roomId === null ? null : id(row.roomId);
  const postingClosesAt =
    row.postingClosesAt === null
      ? null
      : typeof row.postingClosesAt === "string" && Number.isFinite(Date.parse(row.postingClosesAt))
        ? row.postingClosesAt
        : undefined;
  if (
    postingClosesAt === undefined ||
    row.joined !== (roomId !== null) ||
    (row.canPost && (!row.joined || !row.enabled))
  )
    throw new Error("Invalid discussion permissions.");
  return {
    eventId,
    enabled: row.enabled as boolean,
    version: row.version as number,
    canManage: row.canManage as boolean,
    canJoin: row.canJoin as boolean,
    joined: row.joined as boolean,
    roomId,
    canPost: row.canPost as boolean,
    postingClosesAt,
  };
}
export function parseCommunityChatLinks(value: unknown): CommunityChatLink[] {
  if (!Array.isArray(value) || value.length > 24)
    throw new Error("Invalid community conversations.");
  const seen = new Set<string>();
  return value.map((value) => {
    const row = object(value);
    const sourceId = id(row.id);
    if (
      seen.has(sourceId) ||
      typeof row.title !== "string" ||
      !row.title.trim() ||
      row.title.length > 160 ||
      !["chapter", "mission", "event"].includes(row.kind as string)
    )
      throw new Error("Invalid community conversation.");
    seen.add(sourceId);
    const eventId = row.eventId === null ? null : id(row.eventId);
    if ((row.kind === "event") !== (eventId !== null))
      throw new Error("Invalid community conversation source.");
    return {
      id: sourceId,
      title: row.title,
      kind: row.kind as CommunityChatLink["kind"],
      spaceId: id(row.spaceId),
      roomId: id(row.roomId),
      eventId,
    };
  });
}
