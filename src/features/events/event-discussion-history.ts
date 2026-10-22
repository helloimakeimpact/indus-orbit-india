import type { SpaceFeed, SpaceFeedCursor, SpaceMessage } from "@/features/spaces/space-feed";
export const EVENT_DISCUSSION_WINDOW_LIMIT = 200;
export type DiscussionFeedPage = SpaceFeed & { newerAvailable: boolean };
export type DiscussionPageQuery = {
  limit: number;
  cursor?: SpaceFeedCursor;
  through?: SpaceFeedCursor;
};
export function messageCursor(message: Pick<SpaceMessage, "id" | "createdAt">): SpaceFeedCursor {
  return { id: message.id, createdAt: message.createdAt };
}
export function orderedDiscussionMessages(items: readonly SpaceMessage[]): SpaceMessage[] {
  return [...new Map(items.map((item) => [item.id, item])).values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}
/** Replaces a window with authoritative contiguous pages. Never joins a latest
 * page onto stale history across an unknown reconnect gap. */
export async function loadDiscussionWindow(
  fetch: (query: DiscussionPageQuery) => Promise<DiscussionFeedPage>,
  options: DiscussionPageQuery,
): Promise<DiscussionFeedPage> {
  if (
    !Number.isInteger(options.limit) ||
    options.limit < 1 ||
    options.limit > EVENT_DISCUSSION_WINDOW_LIMIT ||
    (options.cursor && options.through)
  )
    throw new Error("Invalid discussion window.");
  const items: SpaceMessage[] = [];
  let cursor = options.cursor;
  let last: DiscussionFeedPage | null = null;
  let newerAvailable = false;
  const seenCursors = new Set<string>();
  for (let page = 0; items.length < options.limit && page < 4; page += 1) {
    const next = await fetch({
      limit: Math.min(100, options.limit - items.length),
      ...(cursor ? { cursor } : options.through && page === 0 ? { through: options.through } : {}),
    });
    newerAvailable ||= next.newerAvailable;
    items.unshift(...next.items);
    last = next;
    if (!next.hasMore || !next.nextCursor || next.items.length === 0) break;
    const key = `${next.nextCursor.createdAt}:${next.nextCursor.id}`;
    if (seenCursors.has(key)) throw new Error("Discussion history did not advance. Try again.");
    seenCursors.add(key);
    cursor = next.nextCursor;
  }
  if (!last) throw new Error("Discussion history is unavailable.");
  return { ...last, items: orderedDiscussionMessages(items).slice(-options.limit), newerAvailable };
}
/** Older paging retains the earliest window, so the message being read is not
 * silently removed by a cap. Newer messages remain available through Latest. */
export function prependDiscussionWindow(
  current: readonly SpaceMessage[],
  older: readonly SpaceMessage[],
) {
  return orderedDiscussionMessages([...older, ...current]).slice(0, EVENT_DISCUSSION_WINDOW_LIMIT);
}
