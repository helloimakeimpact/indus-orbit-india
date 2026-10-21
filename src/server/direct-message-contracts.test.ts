import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  captureDirectMessageAccount,
  directMessagePage,
  parseConversationContacts,
  parseDirectInbox,
  parseDirectMessages,
} from "./direct-message-contracts";

import { transitionConversationAccount } from "@/features/conversations/conversation-lifecycle";

const owner = "31000000-0000-4000-8000-000000000001";
const peer = "31000000-0000-4000-8000-000000000002";
const outsider = "31000000-0000-4000-8000-000000000003";
const contact = { user_id: peer, display_name: "Peer", avatar_url: null, headline: null };
const row = {
  id: "32000000-0000-4000-8000-000000000001",
  sender_id: peer,
  recipient_id: owner,
  content: "A durable message",
  client_request_id: null,
  created_at: "2026-10-20T12:00:00.000Z",
  read_at: null,
};

describe("bounded expected-account direct message responses", () => {
  it("accepts only durable rows belonging to the expected pair", () => {
    assert.deepEqual(parseDirectMessages([row], owner, peer), [row]);
    assert.throws(() => parseDirectMessages([{ ...row, sender_id: outsider }], owner, peer));
    assert.throws(() => parseDirectMessages([{ ...row, id: "pending:browser-id" }], owner, peer));
  });
  it("rejects invalid dates, unexpected delivery state is not projected", () => {
    assert.throws(() => parseDirectMessages([{ ...row, created_at: "invalid" }], owner, peer));
    assert.equal(
      parseDirectMessages([{ ...row, delivery_state: "sending" }], owner, peer)[0].delivery_state,
      undefined,
    );
  });
  it("rejects unbounded message pages and long content", () => {
    assert.throws(() => parseDirectMessages(Array(102).fill(row), owner, peer));
    assert.throws(() => parseDirectMessages([{ ...row, content: "a".repeat(4_001) }], owner, peer));
  });
  it("keeps the last returned row as cursor in either forward or backward order", () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({ ...row, content: String(index) }));
    const page = directMessagePage(rows);
    assert.equal(page.messages.length, 50);
    assert.equal(page.messages.at(-1)?.content, "49");
    assert.deepEqual(page.nextCursor, { createdAt: row.created_at, id: row.id });
    assert.equal(directMessagePage(rows.slice(0, 50)).nextCursor, null);
  });
  it("rejects duplicate contacts and the owner as a peer", () => {
    assert.deepEqual(parseConversationContacts([contact], owner), [contact]);
    assert.throws(() => parseConversationContacts([contact, contact], owner));
    assert.throws(() => parseConversationContacts([{ ...contact, user_id: owner }], owner));
  });
  it("accepts bounded inbox evidence without inventing device delivery", () => {
    const input = {
      ...contact,
      last_message_id: row.id,
      last_message_content: row.content,
      last_message_at: row.created_at,
      last_sender_id: peer,
      unread_count: 2,
    };
    assert.deepEqual(parseDirectInbox([input], owner), [input]);
    assert.throws(() => parseDirectInbox([{ ...input, unread_count: -1 }], owner));
    assert.throws(() => parseDirectInbox([{ ...input, unread_count: "2" }], owner));
    assert.throws(() => parseDirectInbox([{ ...input, last_sender_id: outsider }], owner));
  });
});

describe("synchronous DM request identity generation", () => {
  it("rejects an A to B to A cycle even when the UID is restored", () => {
    transitionConversationAccount(owner);
    const guard = captureDirectMessageAccount(owner);
    guard();
    transitionConversationAccount(peer);
    transitionConversationAccount(owner);
    assert.throws(guard, (error: unknown) => (error as { code?: string }).code === "42501");
    transitionConversationAccount(null);
  });
  it("preserves same-account refresh but rejects missing or different owner", () => {
    transitionConversationAccount(owner);
    const guard = captureDirectMessageAccount(owner);
    transitionConversationAccount(owner);
    guard();
    assert.throws(captureDirectMessageAccount(peer));
    transitionConversationAccount(null);
    assert.throws(guard);
    assert.throws(captureDirectMessageAccount(owner));
  });
});
