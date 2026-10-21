import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DirectMessageClient,
  type ConversationTransport,
  type MessageCursor,
} from "./direct-message-client";
import type { DirectMessage } from "./types";
import {
  getConversationAccount,
  onConversationAccountChange,
  transitionConversationAccount,
} from "./conversation-lifecycle";

const owner = "10000000-0000-4000-8000-000000000001";
const peer = "20000000-0000-4000-8000-000000000001";
const other = "30000000-0000-4000-8000-000000000001";
const baseTime = Date.parse("2026-10-20T10:00:00Z");
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function row(index: number, sender = peer, recipient = owner): DirectMessage {
  return {
    id: `40000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    sender_id: sender,
    recipient_id: recipient,
    content: `Message ${index}`,
    created_at: new Date(baseTime + index * 1_000).toISOString(),
    client_request_id: null,
    read_at: null,
  };
}
function cursor(row: DirectMessage): MessageCursor {
  return { createdAt: row.created_at, id: row.id };
}
function compare(a: MessageCursor, b: MessageCursor) {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id);
}
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
function fixture(overrides: Partial<ConversationTransport> = {}) {
  const storage = memoryStorage();
  const pool: DirectMessage[] = [];
  const subscriptions = new Map<string, Parameters<ConversationTransport["subscribe"]>[1]>();
  const calls = {
    joins: 0,
    closes: 0,
    history: 0,
    after: [] as string[],
    sends: [] as string[],
    reads: [] as string[],
    attention: 0,
  };
  let valid = true;
  let visible = true;
  let index = 0;
  const transport: ConversationTransport = {
    current: () => valid,
    visible: () => visible,
    storage: () => storage,
    now: () => baseTime + 1_000_000,
    randomId: () => `50000000-0000-4000-8000-${String(++index).padStart(12, "0")}`,
    attention: () => {
      calls.attention++;
    },
    history: async (selected, before) => {
      calls.history++;
      const rows = pool
        .filter(
          (r) =>
            (r.sender_id === selected || r.recipient_id === selected) &&
            (!before || compare(cursor(r), before) < 0),
        )
        .sort((a, b) => compare(cursor(b), cursor(a)));
      const messages = rows.slice(0, 50);
      return { messages, nextCursor: rows.length > 50 ? cursor(messages.at(-1)!) : null };
    },
    after: async (selected, after) => {
      const rows = pool
        .filter(
          (r) =>
            (r.sender_id === selected || r.recipient_id === selected) &&
            compare(cursor(r), after) > 0,
        )
        .sort((a, b) => compare(cursor(a), cursor(b)));
      const messages = rows.slice(0, 50);
      calls.after.push(...messages.map((r) => r.id));
      return { messages, nextCursor: rows.length > 50 ? cursor(messages.at(-1)!) : null };
    },
    send: async (selected, content, id) => {
      calls.sends.push(id);
      return { ...row(1000 + index, owner, selected), content, client_request_id: id };
    },
    read: async (_selected, boundary) => {
      calls.reads.push(boundary);
    },
    subscribe: (selected, handlers) => {
      calls.joins++;
      subscriptions.set(selected, handlers);
      queueMicrotask(() => handlers.connected(true));
      return {
        close: () => {
          calls.closes++;
          subscriptions.delete(selected);
        },
        typing: async () => undefined,
      };
    },
    ...overrides,
  };
  const client = new DirectMessageClient(owner, transport);
  return {
    client,
    pool,
    calls,
    storage,
    subscriptions,
    setCurrent: (value: boolean) => {
      valid = value;
    },
    setVisible: (value: boolean) => {
      visible = value;
    },
  };
}
function submit(client: DirectMessageClient, selected: string, content: string) {
  client.setDraft(selected, content);
  return client.send(selected, content, client.getSnapshot(selected).draftRevision);
}

describe("shared direct-message client", () => {
  it("shares one initial request, subscription, draft and outbox between surfaces", async (t) => {
    const pending = deferred<{ messages: DirectMessage[]; nextCursor: null }>();
    let fetches = 0;
    const f = fixture({
      history: () => {
        fetches++;
        return pending.promise;
      },
    });
    t.after(() => f.client.dispose());
    const a = f.client.acquire(peer);
    const b = f.client.acquire(peer);
    f.subscriptions.get(peer)!.connected(true);
    assert.equal(f.calls.joins, 1);
    assert.equal(fetches, 1);
    f.client.setDraft(peer, "Same draft");
    assert.equal(f.client.getSnapshot(peer).draft, "Same draft");
    pending.resolve({ messages: [], nextCursor: null });
    await tick();
    a();
    await tick();
    assert.equal(f.calls.closes, 0);
    b();
    await tick();
    assert.equal(f.calls.closes, 1);
  });
  it("enqueues once per submitted revision and preserves newer typing during a slow send", async (t) => {
    const pending = deferred<DirectMessage>();
    let sends = 0;
    let id = "";
    const f = fixture({
      send: (_peer, _text, key) => {
        sends++;
        id = key;
        return pending.promise;
      },
    });
    t.after(() => f.client.dispose());
    f.client.setDraft(peer, "First draft");
    const revision = f.client.getSnapshot(peer).draftRevision;
    const first = f.client.send(peer, "First draft", revision);
    const duplicate = f.client.send(peer, "First draft", revision);
    assert.equal(first, duplicate);
    assert.equal(sends, 1);
    assert.equal(f.client.getSnapshot(peer).messages.length, 1);
    assert.equal(f.client.getSnapshot(peer).draft, "");
    f.client.setDraft(peer, "Newer typing");
    pending.resolve({ ...row(10, owner, peer), content: "First draft", client_request_id: id });
    await first;
    assert.equal(f.client.getSnapshot(peer).draft, "Newer typing");
    assert.equal(f.client.getSnapshot(peer).messages.length, 1);
    assert.equal(f.client.getSnapshot(peer).messages[0].delivery_state, undefined);
  });
  it("keeps drafts isolated by peer and rejects stale draft revisions", async (t) => {
    const f = fixture();
    t.after(() => f.client.dispose());
    f.client.setDraft(peer, "For first person");
    f.client.setDraft(other, "For second person");
    const version = f.client.getSnapshot(peer).draftRevision;
    f.client.setDraft(peer, "Changed first draft");
    await assert.rejects(f.client.send(peer, "For first person", version), /draft changed/);
    assert.equal(f.client.getSnapshot(other).draft, "For second person");
    assert.equal(f.calls.sends.length, 0);
  });
  it("retries an uncertain response with its original idempotency key", async (t) => {
    const ids: string[] = [];
    const f = fixture({
      send: async (selected, content, id) => {
        ids.push(id);
        if (ids.length === 1) throw new Error("Response lost");
        return { ...row(8, owner, selected), content, client_request_id: id };
      },
    });
    t.after(() => f.client.dispose());
    await assert.rejects(submit(f.client, peer, "One persisted message"), /Response lost/);
    const failed = f.client.getSnapshot(peer).messages[0];
    assert.equal(failed.delivery_state, "failed");
    await f.client.retrySend(peer, failed.client_request_id!);
    assert.deepEqual(ids, [ids[0], ids[0]]);
    assert.equal(f.client.getSnapshot(peer).messages.length, 1);
    assert.equal(f.storage.values.size, 0);
  });
  it("accepts durable Broadcast evidence even when the matching HTTP response is lost", async (t) => {
    const pending = deferred<DirectMessage>();
    let id = "";
    const f = fixture({
      send: (_peer, _text, key) => {
        id = key;
        return pending.promise;
      },
    });
    t.after(() => f.client.dispose());
    f.client.acquire(peer);
    await tick();
    const sending = submit(f.client, peer, "Accepted once");
    f.subscriptions
      .get(peer)!
      .message({ ...row(10, owner, peer), content: "Accepted once", client_request_id: id });
    pending.reject(new Error("Network lost response"));
    await sending;
    assert.equal(f.client.getSnapshot(peer).messages[0].delivery_state, undefined);
    assert.equal(f.storage.values.size, 0);
  });
  it("does not send or publish obsolete account completions", async (t) => {
    const pending = deferred<DirectMessage>();
    let requestId = "";
    const f = fixture({
      send: (_peer, _content, id) => {
        requestId = id;
        return pending.promise;
      },
    });
    t.after(() => f.client.dispose());
    const request = submit(f.client, peer, "Old owner text");
    f.setCurrent(false);
    f.client.dispose();
    pending.resolve({ ...row(9, owner, peer), client_request_id: requestId });
    await request;
    assert.equal(f.client.getSnapshot(peer).messages.length, 0);
    assert.equal(f.calls.attention, 0);
    await assert.rejects(submit(f.client, peer, "No longer current"), /account changed/);
  });
  it("guards A→B→A with a monotonic generation rather than owner equality", () => {
    transitionConversationAccount(owner);
    const initial = getConversationAccount();
    let changes = 0;
    const off = onConversationAccountChange(() => {
      changes++;
    });
    transitionConversationAccount(other);
    transitionConversationAccount(owner);
    const final = getConversationAccount();
    off();
    transitionConversationAccount(null);
    assert.equal(final.owner, initial.owner);
    assert.equal(final.generation, initial.generation + 2);
    assert.equal(changes, 2);
  });
  it("retains unread state while hidden and advances only the visible received boundary", async (t) => {
    const pending = deferred<void>();
    const reads: string[] = [];
    const f = fixture({
      read: async (_peer, id) => {
        reads.push(id);
        await pending.promise;
      },
    });
    t.after(() => f.client.dispose());
    f.pool.push(row(1));
    f.client.acquire(peer);
    await tick();
    f.setVisible(false);
    f.subscriptions.get(peer)!.message(row(2));
    await f.client.acknowledgeVisible(peer, row(2).id);
    assert.equal(reads.length, 0);
    f.setVisible(true);
    const request = f.client.acknowledgeVisible(peer, row(2).id);
    f.subscriptions.get(peer)!.message(row(3));
    pending.resolve();
    await request;
    const messages = f.client.getSnapshot(peer).messages;
    assert.ok(messages.find((r) => r.id === row(2).id)!.read_at);
    assert.equal(messages.find((r) => r.id === row(3).id)!.read_at, null);
    await f.client.acknowledgeVisible(peer, row(2).id);
    assert.equal(reads.length, 1);
  });
  it("reconciles more than fifty missed rows in resumable bounded batches without a middle hole", async (t) => {
    const f = fixture();
    t.after(() => f.client.dispose());
    f.pool.push(row(1));
    f.client.acquire(peer);
    await tick();
    for (let i = 2; i <= 261; i++) f.pool.push(row(i));
    await f.client.refresh(peer);
    assert.equal(f.client.getSnapshot(peer).catchingUp, true);
    await new Promise((resolve) => setTimeout(resolve, 140));
    assert.deepEqual(
      f.calls.after,
      Array.from({ length: 260 }, (_, i) => row(i + 2).id),
    );
    const snapshot = f.client.getSnapshot(peer);
    assert.equal(snapshot.catchingUp, false);
    assert.equal(snapshot.messages.length, 200);
    assert.deepEqual(
      snapshot.messages.map((r) => r.id),
      Array.from({ length: 200 }, (_, i) => row(i + 62).id),
    );
  });
  it("preserves an older window and offers a return to the bounded recent window", async (t) => {
    const f = fixture();
    t.after(() => f.client.dispose());
    for (let i = 1; i <= 300; i++) f.pool.push(row(i));
    f.client.acquire(peer);
    await tick();
    for (let i = 0; i < 4; i++) await f.client.loadEarlier(peer);
    const old = f.client.getSnapshot(peer);
    assert.equal(old.messages.length, 200);
    assert.equal(old.hasNewer, true);
    const ids = old.messages.map((r) => r.id);
    f.pool.push(row(301));
    f.subscriptions.get(peer)!.message(row(301));
    assert.deepEqual(
      f.client.getSnapshot(peer).messages.map((r) => r.id),
      ids,
    );
    await f.client.acknowledgeVisible(peer, old.messages.at(-1)!.id);
    assert.equal(f.calls.reads.length, 0);
    await f.client.loadLatest(peer);
    assert.equal(f.client.getSnapshot(peer).hasNewer, false);
    assert.equal(f.client.getSnapshot(peer).messages.at(-1)!.id, row(301).id);
  });
  it("rejects the 101st pending item visibly without dropping the draft or any saved item", async (t) => {
    const f = fixture();
    t.after(() => f.client.dispose());
    f.client.setOnline(false);
    for (let i = 0; i < 100; i++) await submit(f.client, peer, `Pending ${i}`);
    await assert.rejects(submit(f.client, peer, "Keep this draft"), /outbox has 100/);
    assert.equal(f.client.getSnapshot(peer).messages.length, 100);
    assert.equal(f.client.getSnapshot(peer).draft, "Keep this draft");
    const saved = JSON.parse([...f.storage.values.values()][0]);
    assert.equal(saved.items.length, 100);
  });
  it("recovers an offline outbox with original keys and tolerates a throwing storage getter", async (t) => {
    const storage = memoryStorage();
    const a = fixture({ storage: () => storage });
    t.after(() => a.client.dispose());
    a.client.setOnline(false);
    await submit(a.client, peer, "Survive same-tab reload");
    const key = a.client.getSnapshot(peer).messages[0].client_request_id;
    const restored = fixture({ storage: () => storage });
    t.after(() => restored.client.dispose());
    assert.equal(restored.client.getSnapshot(peer).messages[0].client_request_id, key);
    const unavailable = fixture({
      storage: () => {
        throw new Error("SecurityError");
      },
    });
    t.after(() => unavailable.client.dispose());
    unavailable.client.setOnline(false);
    await submit(unavailable.client, peer, "Keep in memory");
    assert.match(unavailable.client.getSnapshot(peer).storageWarning!, /storage is unavailable/);
    assert.equal(unavailable.client.getSnapshot(peer).messages.length, 1);
  });
  it("clears cached history and closes the topic after a server permission denial", async (t) => {
    let denied = false;
    const f = fixture({
      after: async () => {
        if (denied) throw Object.assign(new Error("Access revoked"), { code: "42501" });
        return { messages: [], nextCursor: null };
      },
    });
    t.after(() => f.client.dispose());
    f.pool.push(row(1));
    f.client.acquire(peer);
    await tick();
    assert.equal(f.client.getSnapshot(peer).messages.length, 1);
    denied = true;
    await f.client.refresh(peer);
    assert.equal(f.client.getSnapshot(peer).messages.length, 0);
    assert.equal(f.calls.closes, 1);
  });

  it("does not restore revoked durable history from a delayed send acknowledgement", async (t) => {
    const pending = deferred<DirectMessage>();
    let id = "";
    let denied = false;
    const f = fixture({
      send: (_peer, _text, key) => {
        id = key;
        return pending.promise;
      },
      after: async () => {
        if (denied) throw Object.assign(new Error("Access revoked"), { code: "42501" });
        return { messages: [], nextCursor: null };
      },
    });
    t.after(() => f.client.dispose());
    f.pool.push(row(1));
    f.client.acquire(peer);
    await tick();
    const sent = submit(f.client, peer, "Already submitted");
    denied = true;
    await f.client.refresh(peer);
    assert.equal(f.client.getSnapshot(peer).messages.filter((r) => !r.delivery_state).length, 0);
    pending.resolve({
      ...row(9, owner, peer),
      content: "Already submitted",
      client_request_id: id,
    });
    await sent;
    assert.equal(f.client.getSnapshot(peer).messages.filter((r) => !r.delivery_state).length, 0);
    assert.match(f.client.getSnapshot(peer).error!, /Access revoked/);
  });

  it("preserves the first visible row at the exact history cap when the reader is not following", async (t) => {
    const f = fixture();
    t.after(() => f.client.dispose());
    for (let i = 1; i <= 200; i++) f.pool.push(row(i));
    f.client.acquire(peer);
    await tick();
    for (let i = 0; i < 3; i++) await f.client.loadEarlier(peer);
    f.client.setFollowingLatest(peer, false);
    assert.equal(f.client.getSnapshot(peer).messages[0].id, row(1).id);
    f.pool.push(row(201));
    f.subscriptions.get(peer)!.message(row(201));
    assert.equal(f.client.getSnapshot(peer).messages[0].id, row(1).id);
    assert.equal(f.client.getSnapshot(peer).messages.length, 200);
    assert.equal(f.client.getSnapshot(peer).hasNewer, true);
    await f.client.refresh(peer);
    assert.equal(f.client.getSnapshot(peer).hasEarlier, false);
    assert.equal(f.client.getSnapshot(peer).messages[0].id, row(1).id);
    await f.client.loadLatest(peer);
    assert.equal(f.client.getSnapshot(peer).messages.at(-1)!.id, row(201).id);
  });

  it("takes one initial snapshot after a fast join instead of refetching a pre-join snapshot", async (t) => {
    const f = fixture();
    t.after(() => f.client.dispose());
    f.pool.push(row(1));
    f.client.acquire(peer);
    await tick();
    await tick();
    assert.equal(f.calls.history, 1);
    assert.equal(f.calls.after.length, 0);
  });
});
