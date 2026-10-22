export const EVENT_RETRY_PREFIX = "indus-orbit:event-retry:v1:";
export type EventMessageRetry = {
  userId: string;
  eventId: string;
  requestId: string;
  content: string;
  createdAt: string;
};
export type RetryStorage = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const unavailable =
  "This tab can’t save retry recovery. Keep it open until the message is confirmed.";
function key(userId: string, eventId: string) {
  if (!uuid.test(userId) || !uuid.test(eventId))
    throw new Error("Invalid discussion retry identity.");
  return `${EVENT_RETRY_PREFIX}${userId}:${eventId}`;
}
function valid(value: unknown, userId: string, eventId: string): value is EventMessageRetry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    row.userId === userId &&
    row.eventId === eventId &&
    typeof row.requestId === "string" &&
    uuid.test(row.requestId) &&
    typeof row.content === "string" &&
    row.content.trim().length > 0 &&
    row.content.length <= 4000 &&
    typeof row.createdAt === "string" &&
    Number.isFinite(Date.parse(row.createdAt))
  );
}
export function restoreEventRetry(
  storage: RetryStorage,
  userId: string,
  eventId: string,
): { retry: EventMessageRetry | null; warning: string } {
  try {
    const storageKey = key(userId, eventId);
    const text = storage.getItem(storageKey);
    if (!text) return { retry: null, warning: "" };
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      storage.removeItem(storageKey);
      return {
        retry: null,
        warning: "Invalid saved retry was discarded. Check the conversation before sending again.",
      };
    }
    if (!valid(parsed, userId, eventId)) {
      storage.removeItem(storageKey);
      return {
        retry: null,
        warning: "Invalid saved retry was discarded. Check the conversation before sending again.",
      };
    }
    return { retry: parsed, warning: "" };
  } catch {
    return { retry: null, warning: unavailable };
  }
}
export function saveEventRetry(storage: RetryStorage, retry: EventMessageRetry): string {
  try {
    if (!valid(retry, retry.userId, retry.eventId)) throw new Error("Invalid retry");
    const storageKey = key(retry.userId, retry.eventId);
    if (storage.getItem(storageKey) === null) {
      let count = 0;
      for (let index = 0; index < storage.length; index += 1)
        if (storage.key(index)?.startsWith(`${EVENT_RETRY_PREFIX}${retry.userId}:`)) count += 1;
      if (count >= 10)
        return "Ten event messages are already waiting for confirmation. Keep this tab open and resolve a retry before saving another.";
    }
    storage.setItem(storageKey, JSON.stringify(retry));
    return "";
  } catch {
    return unavailable;
  }
}
export function removeEventRetry(storage: RetryStorage, userId: string, eventId: string): string {
  try {
    storage.removeItem(key(userId, eventId));
    return "";
  } catch {
    return unavailable;
  }
}
