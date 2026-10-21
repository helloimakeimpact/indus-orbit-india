import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loadDiscussionWindow,
  messageCursor,
  prependDiscussionWindow,
  type DiscussionFeedPage,
} from "./event-discussion-history";
import type { SpaceMessage } from "@/features/spaces/space-feed";
function row(index: number): SpaceMessage {
  return {
    id: String(index).padStart(8, "0") + "-0000-4000-8000-000000000001",
    createdAt: new Date(Date.UTC(2026, 9, 21, 0, 0, index)).toISOString(),
  } as SpaceMessage;
}
function page(items: SpaceMessage[], more: boolean, newer = false): DiscussionFeedPage {
  return {
    items,
    hasMore: more,
    nextCursor: more ? messageCursor(items[0]) : null,
    canManage: false,
    canModerate: false,
    newerAvailable: newer,
  };
}
describe("bounded event discussion history", () => {
  it("replaces a reconnect window with contiguous latest pages beyond fifty missed messages", async () => {
    const calls: unknown[] = [];
    const result = await loadDiscussionWindow(
      async (query) => {
        calls.push(query);
        return query.cursor
          ? page(
              Array.from({ length: 100 }, (_, i) => row(i + 1)),
              true,
            )
          : page(
              Array.from({ length: 100 }, (_, i) => row(i + 101)),
              true,
            );
      },
      { limit: 200 },
    );
    assert.equal(calls.length, 2);
    assert.equal(result.items.length, 200);
    assert.deepEqual(
      result.items.map((x) => x.id),
      Array.from({ length: 200 }, (_, i) => row(i + 1).id),
    );
    assert.deepEqual(result.nextCursor, messageCursor(row(1)));
  });
  it("passes the exact inclusive upper anchor only on the first older-window refresh page", async () => {
    const through = messageCursor(row(200));
    const calls: unknown[] = [];
    const result = await loadDiscussionWindow(
      async (query) => {
        calls.push(query);
        return query.cursor
          ? page(
              Array.from({ length: 50 }, (_, i) => row(i + 1)),
              true,
            )
          : page(
              Array.from({ length: 100 }, (_, i) => row(i + 51)),
              true,
              true,
            );
      },
      { limit: 150, through },
    );
    assert.deepEqual(calls, [
      { limit: 100, through },
      { limit: 50, cursor: messageCursor(row(51)) },
    ]);
    assert.equal(result.newerAvailable, true);
    assert.equal(result.items.length, 150);
  });
  it("stops at exhausted history without inventing an older cursor", async () => {
    const result = await loadDiscussionWindow(async () => page([row(1), row(2)], false), {
      limit: 200,
    });
    assert.equal(result.items.length, 2);
    assert.equal(result.nextCursor, null);
  });
  it("rejects an oversized window and a repeated cursor", async () => {
    await assert.rejects(loadDiscussionWindow(async () => page([], false), { limit: 201 }));
    await assert.rejects(loadDiscussionWindow(async () => page([row(1)], true), { limit: 200 }));
  });
  it("caps older paging at two hundred without dropping the older visible anchor", () => {
    const items = prependDiscussionWindow(
      Array.from({ length: 200 }, (_, i) => row(i + 51)),
      Array.from({ length: 50 }, (_, i) => row(i + 1)),
    );
    assert.equal(items.length, 200);
    assert.equal(items[0].id, row(1).id);
    assert.equal(items.at(-1)?.id, row(200).id);
  });
});
