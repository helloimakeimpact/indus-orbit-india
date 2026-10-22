import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCommunityChatLinks, parseEventDiscussion } from "./event-discussion-contract";

const eventId = "10000000-0000-4000-8000-000000000001";
const roomId = "20000000-0000-4000-8000-000000000001";
const spaceId = "30000000-0000-4000-8000-000000000001";
const discussion = {
  eventId,
  enabled: true,
  version: 1,
  canManage: false,
  canJoin: true,
  joined: true,
  roomId,
  canPost: true,
  postingClosesAt: "2026-10-30T10:00:00Z",
};
describe("event discussion capability contracts", () => {
  it("accepts only the requested event identity and actual permission booleans", () => {
    assert.deepEqual(parseEventDiscussion(discussion, eventId), discussion);
    assert.throws(() => parseEventDiscussion({ ...discussion, eventId: spaceId }, eventId));
    assert.throws(() => parseEventDiscussion({ ...discussion, canManage: "true" }, eventId));
    assert.throws(() => parseEventDiscussion({ ...discussion, version: -1 }, eventId));
  });
  it("rejects a room exposed without membership and posting without enabled membership", () => {
    assert.throws(() => parseEventDiscussion({ ...discussion, joined: false }, eventId));
    assert.throws(() => parseEventDiscussion({ ...discussion, roomId: null }, eventId));
    assert.throws(() => parseEventDiscussion({ ...discussion, enabled: false }, eventId));
    assert.throws(() => parseEventDiscussion({ ...discussion, postingClosesAt: "later" }, eventId));
  });
  it("accepts a closed discussion without leaking its room", () => {
    const closed = {
      ...discussion,
      enabled: false,
      joined: false,
      canJoin: false,
      canPost: false,
      roomId: null,
      postingClosesAt: null,
    };
    assert.deepEqual(parseEventDiscussion(closed, eventId), closed);
  });
  it("bounds community links and rejects duplicate or inconsistent event sources", () => {
    const event = { id: spaceId, title: "A gathering", kind: "event", spaceId, roomId, eventId };
    assert.deepEqual(parseCommunityChatLinks([event]), [event]);
    assert.throws(() => parseCommunityChatLinks(Array(25).fill(event)));
    assert.throws(() => parseCommunityChatLinks([event, event]));
    assert.throws(() => parseCommunityChatLinks([{ ...event, eventId: null }]));
    assert.throws(() => parseCommunityChatLinks([{ ...event, kind: "chapter" }]));
  });
});
