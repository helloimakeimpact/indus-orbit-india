import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearConversationOutbox,
  isConversationMessage,
  loadConversationOutbox,
  mergeConversationMessages,
  parseConversationOutbox,
  parseDirectMessageBroadcast,
  projectConversationOutbox,
  saveConversationOutbox,
  transitionConversationOutboxOwner,
} from "./conversation-state";
import type { DirectMessage } from "./types";

function message(id: string, sender: string, recipient: string, createdAt: string): DirectMessage {
  return {
    id,
    sender_id: sender,
    recipient_id: recipient,
    content: id,
    client_request_id: null,
    created_at: createdAt,
    read_at: null,
  };
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe("conversation state", () => {
  it("accepts only messages between the selected participants", () => {
    assert.equal(
      isConversationMessage(message("1", "a", "b", "2026-01-01T00:00:00Z"), "a", "b"),
      true,
    );
    assert.equal(
      isConversationMessage(message("2", "c", "b", "2026-01-01T00:00:00Z"), "a", "b"),
      false,
    );
  });

  it("deduplicates by durable ID and renders chronologically", () => {
    const first = message("a", "a", "b", "2026-01-02T00:00:00Z");
    const older = message("b", "b", "a", "2026-01-01T00:00:00Z");
    const updated = { ...first, read_at: "2026-01-03T00:00:00Z" };
    const merged = mergeConversationMessages([first], [older, updated]);
    assert.deepEqual(
      merged.map((item) => item.id),
      ["b", "a"],
    );
    assert.equal(merged[1].read_at, "2026-01-03T00:00:00Z");
  });

  it("accepts only a complete private Broadcast row", () => {
    const incoming = message("broadcast", "a", "b", "2026-01-01T00:00:00Z");
    assert.deepEqual(parseDirectMessageBroadcast({ payload: { new: incoming } }), incoming);
    assert.equal(parseDirectMessageBroadcast({ payload: { new: { id: "incomplete" } } }), null);
    assert.equal(parseDirectMessageBroadcast({ payload: "not-an-object" }), null);
  });

  it("reconciles an optimistic send with its replay-safe durable row", () => {
    const optimistic: DirectMessage = {
      ...message("pending:req-1", "a", "b", "2026-01-01T00:00:00Z"),
      client_request_id: "req-1",
      delivery_state: "queued",
    };
    const durable: DirectMessage = {
      ...message("durable-1", "a", "b", "2026-01-01T00:00:01Z"),
      client_request_id: "req-1",
    };

    assert.deepEqual(mergeConversationMessages([optimistic], [durable]), [durable]);
    assert.deepEqual(mergeConversationMessages([durable], [optimistic]), [durable]);
  });

  it("restores only the expected account's bounded replay-safe outbox", () => {
    const requestId = "10000000-0000-4000-8000-000000000001";
    const recipientId = "20000000-0000-4000-8000-000000000001";
    const restored = parseConversationOutbox(
      {
        version: 1,
        userId: "member-1",
        items: [
          {
            requestId,
            recipientId,
            content: "  Continue after refresh  ",
            createdAt: "2026-09-08T10:00:00.000Z",
            state: "sending",
          },
          {
            requestId,
            recipientId,
            content: "duplicate",
            createdAt: "2026-09-08T10:00:01.000Z",
            state: "queued",
          },
          {
            requestId: "not-a-request",
            recipientId,
            content: "unsafe",
            createdAt: "2026-09-08T10:00:02.000Z",
            state: "queued",
          },
        ],
      },
      "member-1",
    );

    assert.deepEqual(restored, [
      {
        requestId,
        recipientId,
        content: "Continue after refresh",
        createdAt: "2026-09-08T10:00:00.000Z",
        state: "queued",
      },
    ]);
    assert.deepEqual(
      parseConversationOutbox(
        { version: 1, userId: "another-member", items: restored },
        "member-1",
      ),
      [],
    );
  });

  it("projects a restored outbox only into its matching conversation", () => {
    const requestId = "10000000-0000-4000-8000-000000000001";
    const recipientId = "20000000-0000-4000-8000-000000000001";
    const items = [
      {
        requestId,
        recipientId,
        content: "Recovered",
        createdAt: "2026-09-08T10:00:00.000Z",
        state: "failed" as const,
      },
    ];

    assert.deepEqual(projectConversationOutbox("member-1", recipientId, items), [
      {
        id: `pending:${requestId}`,
        sender_id: "member-1",
        recipient_id: recipientId,
        content: "Recovered",
        client_request_id: requestId,
        created_at: "2026-09-08T10:00:00.000Z",
        read_at: null,
        delivery_state: "failed",
      },
    ]);
    assert.deepEqual(
      projectConversationOutbox("member-1", "30000000-0000-4000-8000-000000000001", items),
      [],
    );
  });

  it("treats unavailable private storage as an in-memory-only recovery path", () => {
    const unavailable = {
      getItem: () => {
        throw new Error("disabled");
      },
      setItem: () => {
        throw new Error("disabled");
      },
      removeItem: () => {
        throw new Error("disabled");
      },
    };
    const item = {
      requestId: "10000000-0000-4000-8000-000000000001",
      recipientId: "20000000-0000-4000-8000-000000000001",
      content: "Private fallback",
      createdAt: "2026-09-08T10:00:00.000Z",
      state: "queued" as const,
    };

    assert.deepEqual(loadConversationOutbox(unavailable, "member-1"), []);
    assert.equal(saveConversationOutbox(unavailable, "member-1", [item]), false);
    assert.equal(clearConversationOutbox(unavailable, "member-1"), false);
  });

  it("removes corrupt state and keeps accounts isolated", () => {
    const storage = memoryStorage();
    storage.setItem("indus-orbit:dm-outbox:v1:member-1", "{broken");
    assert.deepEqual(loadConversationOutbox(storage, "member-1"), []);
    assert.equal(storage.values.has("indus-orbit:dm-outbox:v1:member-1"), false);

    const item = {
      requestId: "10000000-0000-4000-8000-000000000001",
      recipientId: "20000000-0000-4000-8000-000000000001",
      content: "Only for member one",
      createdAt: "2026-09-08T10:00:00.000Z",
      state: "queued" as const,
    };
    assert.equal(saveConversationOutbox(storage, "member-1", [item]), true);
    assert.deepEqual(loadConversationOutbox(storage, "member-2"), []);
    assert.deepEqual(loadConversationOutbox(storage, "member-1"), [item]);
  });

  it("removes storage after delivery or discard leaves the outbox empty", () => {
    const storage = memoryStorage();
    const item = {
      requestId: "10000000-0000-4000-8000-000000000001",
      recipientId: "20000000-0000-4000-8000-000000000001",
      content: "Cleanup",
      createdAt: "2026-09-08T10:00:00.000Z",
      state: "queued" as const,
    };
    assert.equal(saveConversationOutbox(storage, "member-1", [item]), true);
    assert.equal(storage.values.has("indus-orbit:dm-outbox:v1:member-1"), true);
    assert.equal(saveConversationOutbox(storage, "member-1", []), true);
    assert.equal(storage.values.has("indus-orbit:dm-outbox:v1:member-1"), false);

    assert.equal(saveConversationOutbox(storage, "member-1", [item]), true);
    assert.equal(saveConversationOutbox(storage, "member-2", [item]), true);
    assert.equal(clearConversationOutbox(storage, "member-1"), true);
    assert.equal(storage.values.has("indus-orbit:dm-outbox:v1:member-1"), false);
    assert.equal(storage.values.has("indus-orbit:dm-outbox:v1:member-2"), true);
  });

  it("clears only the prior owner on a real auth transition", () => {
    const storage = memoryStorage();
    const item = {
      requestId: "10000000-0000-4000-8000-000000000001",
      recipientId: "20000000-0000-4000-8000-000000000001",
      content: "Account-scoped",
      createdAt: "2026-09-08T10:00:00.000Z",
      state: "queued" as const,
    };
    saveConversationOutbox(storage, "member-1", [item]);
    saveConversationOutbox(storage, "member-2", [item]);

    let owner = transitionConversationOutboxOwner(storage, null, "member-1");
    assert.equal(storage.values.has("indus-orbit:dm-outbox:v1:member-1"), true);
    owner = transitionConversationOutboxOwner(storage, owner, "member-1");
    assert.equal(storage.values.has("indus-orbit:dm-outbox:v1:member-1"), true);
    owner = transitionConversationOutboxOwner(storage, owner, "member-2");
    assert.equal(owner, "member-2");
    assert.equal(storage.values.has("indus-orbit:dm-outbox:v1:member-1"), false);
    assert.equal(storage.values.has("indus-orbit:dm-outbox:v1:member-2"), true);
    owner = transitionConversationOutboxOwner(storage, owner, null);
    assert.equal(owner, null);
    assert.equal(storage.values.has("indus-orbit:dm-outbox:v1:member-2"), false);

    assert.equal(transitionConversationOutboxOwner(null, "member-1", null), null);
  });
});
