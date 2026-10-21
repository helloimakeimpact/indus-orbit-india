import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EVENT_RETRY_PREFIX,
  removeEventRetry,
  restoreEventRetry,
  saveEventRetry,
  type EventMessageRetry,
  type RetryStorage,
} from "./event-discussion-retry";
import { clearEventRetryStorage } from "@/features/conversations/conversation-lifecycle";
const user = "97300000-0000-4000-8000-000000000001",
  other = "97300000-0000-4000-8000-000000000002",
  event = "97300000-0000-4000-8000-000000000011";
function memory(): RetryStorage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}
const retry: EventMessageRetry = {
  userId: user,
  eventId: event,
  requestId: "97300000-0000-4000-8000-000000000031",
  content: "Hello gathering",
  createdAt: "2026-10-21T11:00:00Z",
};
describe("event retry recovery", () => {
  it("restores the original request ID after a same-tab reload and removes confirmed recovery", () => {
    const storage = memory();
    assert.equal(saveEventRetry(storage, retry), "");
    assert.deepEqual(restoreEventRetry(storage, user, event).retry, retry);
    assert.equal(removeEventRetry(storage, user, event), "");
    assert.equal(restoreEventRetry(storage, user, event).retry, null);
  });
  it("rejects foreign ownership, invalid UUIDs, oversized or corrupt plaintext", () => {
    const storage = memory();
    const key = `${EVENT_RETRY_PREFIX}${user}:${event}`;
    for (const value of [
      { ...retry, userId: other },
      { ...retry, requestId: "bad" },
      { ...retry, content: "x".repeat(4001) },
      "bad json",
    ]) {
      storage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      assert.equal(restoreEventRetry(storage, user, event).retry, null);
    }
  });
  it("caps saved event retries at ten but permits updating the existing event", () => {
    const storage = memory();
    for (let i = 1; i <= 10; i += 1)
      assert.equal(
        saveEventRetry(storage, {
          ...retry,
          eventId: `97300000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        }),
        "",
      );
    assert.match(saveEventRetry(storage, retry), /Ten event messages/);
    assert.equal(
      saveEventRetry(storage, { ...retry, eventId: "97300000-0000-4000-8000-000000000001" }),
      "",
    );
  });
  it("keeps only the current owner recovery on initial auth, clears on sign-out, and ignores other storage", () => {
    const storage = memory();
    saveEventRetry(storage, retry);
    saveEventRetry(storage, { ...retry, userId: other });
    storage.setItem("unrelated", "ok");
    storage.setItem(`${EVENT_RETRY_PREFIX}${user}:bad`, "bad");
    clearEventRetryStorage(storage, user);
    assert.deepEqual(restoreEventRetry(storage, user, event).retry, retry);
    assert.equal(restoreEventRetry(storage, other, event).retry, null);
    assert.equal(storage.length, 2);
    clearEventRetryStorage(storage, null);
    assert.equal(storage.length, 1);
    assert.equal(storage.getItem("unrelated"), "ok");
  });
  it("reports unavailable storage and tolerates getter, enumeration and removal failures", () => {
    const storage = memory();
    const denied = {
      ...storage,
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
      removeItem() {
        throw new Error("denied");
      },
    };
    assert.match(restoreEventRetry(denied, user, event).warning, /can’t save/);
    assert.match(saveEventRetry(denied, retry), /can’t save/);
    assert.doesNotThrow(() => clearEventRetryStorage(denied, null));
    assert.doesNotThrow(() =>
      clearEventRetryStorage(
        {
          get length(): number {
            throw new Error("denied");
          },
          key() {
            throw new Error("denied");
          },
          removeItem() {},
        },
        null,
      ),
    );
  });
});
