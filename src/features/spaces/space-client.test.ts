import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSpaceMentionIds,
  parseSpaceFeedPayload,
  parseSpaceRoomControls,
} from "./space-feed";

test("Orbit Space feed preserves chronological collaboration evidence", () => {
  const feed = parseSpaceFeedPayload({
    items: [
      {
        id: "10000000-0000-4000-8000-000000000001",
        roomId: "20000000-0000-4000-8000-000000000001",
        threadId: null,
        authorId: "30000000-0000-4000-8000-000000000001",
        authorDisplayName: "Asha",
        authorAvatarUrl: null,
        messageType: "human",
        content: "First",
        createdAt: "2026-08-24T10:00:00Z",
        editedAt: null,
        deletedAt: null,
        reactions: [{ key: "support", count: 2, reactedByMe: true }],
        attachments: [],
        thread: {
          id: "40000000-0000-4000-8000-000000000001",
          title: "Evidence",
          replyCount: 3,
          updatedAt: "2026-08-24T10:05:00Z",
          lockedAt: null,
        },
      },
      {
        id: "10000000-0000-4000-8000-000000000002",
        roomId: "20000000-0000-4000-8000-000000000001",
        authorId: "30000000-0000-4000-8000-000000000002",
        authorDisplayName: "Kabir",
        content: null,
        createdAt: "2026-08-24T10:01:00Z",
        deletedAt: "2026-08-24T10:02:00Z",
        reactions: [],
        attachments: [],
        thread: null,
      },
    ],
    hasMore: true,
    nextCursor: {
      createdAt: "2026-08-24T10:00:00Z",
      id: "10000000-0000-4000-8000-000000000001",
    },
    canManage: true,
    canModerate: true,
  });

  assert.deepEqual(
    feed.items.map((message) => message.content),
    ["First", null],
  );
  assert.deepEqual(feed.items[0].reactions[0], {
    key: "support",
    count: 2,
    reactedByMe: true,
  });
  assert.equal(feed.items[0].thread?.replyCount, 3);
  assert.equal(feed.nextCursor?.id, "10000000-0000-4000-8000-000000000001");
  assert.equal(feed.canManage, true);
  assert.equal(feed.canModerate, true);
});

test("Orbit Space feed drops malformed rows and unsafe reaction keys", () => {
  const feed = parseSpaceFeedPayload({
    items: [
      { id: "missing-author" },
      {
        id: "message-1",
        roomId: "room-1",
        authorId: "user-1",
        createdAt: "2026-08-24T10:00:00Z",
        reactions: [{ key: "arbitrary-emoji", count: 99, reactedByMe: true }],
      },
    ],
  });

  assert.equal(feed.items.length, 1);
  assert.deepEqual(feed.items[0].reactions, []);
  assert.equal(feed.hasMore, false);
});

test("Orbit Room controls preserve only recognized caller-bound attention state", () => {
  assert.deepEqual(
    parseSpaceRoomControls({
      roomId: "room-1",
      preference: "mentions",
      quietHours: {
        policyVersion: 1,
        timezone: "UTC",
        enabled: false,
        start: null,
        end: null,
        digestHour: 8,
      },
      quietActive: false,
      nextDeliveryAt: null,
      bookmarkedMessageIds: ["message-1", null],
      pinnedMessageIds: ["message-2"],
      followedThreadIds: ["thread-1"],
      unreadThreadIds: ["thread-1"],
      canManagePins: true,
    }),
    {
      roomId: "room-1",
      preference: "mentions",
      quietHours: {
        policyVersion: 1,
        timezone: "UTC",
        enabled: false,
        start: null,
        end: null,
        digestHour: 8,
      },
      quietActive: false,
      nextDeliveryAt: null,
      bookmarkedMessageIds: ["message-1"],
      pinnedMessageIds: ["message-2"],
      followedThreadIds: ["thread-1"],
      unreadThreadIds: ["thread-1"],
      canManagePins: true,
    },
  );
  assert.throws(
    () => parseSpaceRoomControls({ roomId: "room-1", preference: "everything" }),
    /invalid/,
  );
});

test("Orbit Room controls validate quiet-hour delivery evidence", () => {
  const controls = parseSpaceRoomControls({
    roomId: "room-1",
    preference: "digest",
    quietHours: {
      policyVersion: 1,
      timezone: "Asia/Kolkata",
      enabled: true,
      start: "22:00",
      end: "07:00",
      digestHour: 8,
    },
    quietActive: true,
    nextDeliveryAt: "2026-08-28T02:30:00Z",
  });
  assert.equal(controls.quietHours.timezone, "Asia/Kolkata");
  assert.equal(controls.quietActive, true);
  assert.deepEqual(
    parseSpaceRoomControls({
      roomId: "room-1",
      preference: "all",
      quietHours: {
        policyVersion: 1,
        timezone: "Not/AZone",
        enabled: true,
        start: "25:00",
        end: "07:00",
        digestHour: 99,
      },
      quietActive: true,
    }).quietHours,
    {
      policyVersion: 1,
      timezone: "UTC",
      enabled: false,
      start: null,
      end: null,
      digestHour: 8,
    },
  );
});

test("Orbit mentions are unique, actor-free and bounded", () => {
  const actor = "10000000-0000-4000-8000-000000000001";
  const member = "20000000-0000-4000-8000-000000000001";
  assert.deepEqual(normalizeSpaceMentionIds([actor, member, member, "not-a-user"], actor), [
    member,
  ]);
  assert.throws(
    () =>
      normalizeSpaceMentionIds(
        Array.from(
          { length: 11 },
          (_, index) => `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        ),
        actor,
      ),
    /at most 10/,
  );
});
