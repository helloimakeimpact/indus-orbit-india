import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isConversationMessage, mergeConversationMessages } from "./conversation-state";
import type { DirectMessage } from "./types";

function message(id: string, sender: string, recipient: string, createdAt: string): DirectMessage {
  return {
    id,
    sender_id: sender,
    recipient_id: recipient,
    content: id,
    created_at: createdAt,
    read_at: null,
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
});
