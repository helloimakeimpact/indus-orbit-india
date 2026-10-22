import type { DirectMessage } from "./types";
import {
  isConversationMessage,
  loadConversationOutbox,
  mergeConversationMessages,
  projectConversationOutbox,
  saveConversationOutbox,
  type ConversationOutboxItem,
} from "./conversation-state";

export type MessageCursor = { createdAt: string; id: string };
type Page = { messages: DirectMessage[]; nextCursor: MessageCursor | null };
export type ConversationSubscription = {
  close: () => void;
  typing: (active: boolean) => Promise<void>;
};
export type ConversationTransport = {
  history: (peer: string, before?: MessageCursor) => Promise<Page>;
  after: (peer: string, cursor: MessageCursor) => Promise<Page>;
  send: (peer: string, content: string, requestId: string) => Promise<DirectMessage>;
  read: (peer: string, boundaryId: string) => Promise<void>;
  subscribe: (
    peer: string,
    handlers: {
      message: (row: DirectMessage) => void;
      connected: (connected: boolean) => void;
      typing: (active: boolean) => void;
    },
  ) => ConversationSubscription;
  storage: () => Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  current: () => boolean;
  visible: () => boolean;
  attention: () => void;
  randomId?: () => string;
  now?: () => number;
};

export type ConversationSnapshot = {
  messages: DirectMessage[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  isOtherTyping: boolean;
  conversationConnected: boolean;
  draft: string;
  draftRevision: number;
  storageWarning: string | null;
  catchingUp: boolean;
  hasNewer: boolean;
};

export const emptyConversationSnapshot: ConversationSnapshot = {
  messages: [],
  loading: false,
  error: null,
  sending: false,
  hasEarlier: false,
  loadingEarlier: false,
  isOtherTyping: false,
  conversationConnected: false,
  draft: "",
  draftRevision: 0,
  storageWarning: null,
  catchingUp: false,
  hasNewer: false,
};

type Entry = {
  snapshot: ConversationSnapshot;
  rows: DirectMessage[];
  recent: DirectMessage[];
  cursor: MessageCursor | null;
  reconciled: MessageCursor | null;
  consumers: number;
  listeners: Set<() => void>;
  channel: ConversationSubscription | null;
  request?: Promise<void>;
  earlierRequest?: Promise<void>;
  readRequest?: Promise<void>;
  readBoundary?: string;
  readPending?: string;
  closeTimer?: ReturnType<typeof setTimeout>;
  catchupTimer?: ReturnType<typeof setTimeout>;
  typingTimer?: ReturnType<typeof setTimeout>;
  lastTypingAt: number;
  sequence: number;
  authority: number;
  followingLatest: boolean;
  historyInitialized: boolean;
  initialTimer?: ReturnType<typeof setTimeout>;
};

const maximumRows = 200;
const maximumCachedConversations = 10;
const maximumPending = 100;

function cursorOf(row: DirectMessage): MessageCursor {
  return { createdAt: row.created_at, id: row.id };
}
function compareCursor(left: MessageCursor, right: MessageCursor) {
  return (
    Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id)
  );
}
function permissionDenied(cause: unknown) {
  return (
    !!cause &&
    typeof cause === "object" &&
    "code" in cause &&
    (cause.code === "42501" || cause.code === "PGRST301" || cause.code === "PGRST302")
  );
}

/** One account owns one dispatcher. Surfaces only acquire/release its views. */
export class DirectMessageClient {
  private entries = new Map<string, Entry>();
  private drafts = new Map<string, { value: string; revision: number }>();
  private outbox = new Map<string, ConversationOutboxItem>();
  private deliveries = new Map<string, Promise<DirectMessage | null>>();
  private submissions = new Map<
    string,
    { revision: number; promise: Promise<DirectMessage | null> }
  >();
  private alive = true;
  private online = true;
  private warning: string | null = null;
  private draftRevision = 0;

  constructor(
    readonly owner: string,
    private transport: ConversationTransport,
  ) {
    const storage = this.storage();
    if (storage) {
      for (const item of loadConversationOutbox(storage, owner))
        this.outbox.set(item.requestId, item);
    }
  }

  private current() {
    return this.alive && this.transport.current();
  }
  private now() {
    return this.transport.now?.() ?? Date.now();
  }
  private storage() {
    try {
      const storage = this.transport.storage();
      if (storage) return storage;
    } catch {
      /* Some browsers throw when accessing the storage getter itself. */
    }
    this.warning = "Private storage is unavailable. Keep this tab open to recover unsent messages.";
    return null;
  }
  private persist() {
    const storage = this.storage();
    if (storage && !saveConversationOutbox(storage, this.owner, this.outbox.values())) {
      this.warning = "Unsent messages could not be saved. Keep this tab open until they are sent.";
    }
  }

  private entry(peer: string): Entry {
    let entry = this.entries.get(peer);
    if (!entry) {
      const draft = this.drafts.get(peer);
      entry = {
        snapshot: {
          ...emptyConversationSnapshot,
          messages: [],
          draft: draft?.value ?? "",
          draftRevision: draft?.revision ?? 0,
          storageWarning: this.warning,
        },
        rows: [],
        recent: [],
        cursor: null,
        reconciled: null,
        consumers: 0,
        listeners: new Set(),
        channel: null,
        lastTypingAt: 0,
        sequence: 0,
        authority: 0,
        followingLatest: true,
        historyInitialized: false,
      };
      this.entries.set(peer, entry);
      this.publish(peer, entry);
      this.evict();
    }
    return entry;
  }

  private evict() {
    for (const [peer, entry] of this.entries) {
      if (this.entries.size <= maximumCachedConversations) break;
      if (entry.consumers || entry.listeners.size || entry.request || entry.earlierRequest)
        continue;
      this.close(entry);
      this.entries.delete(peer);
    }
  }

  private publish(peer: string, entry: Entry, patch: Partial<ConversationSnapshot> = {}) {
    if (!this.current()) return;
    const pending = projectConversationOutbox(this.owner, peer, this.outbox.values());
    entry.snapshot = {
      ...entry.snapshot,
      ...patch,
      messages: mergeConversationMessages(entry.rows, pending),
      sending: pending.some((row) => row.delivery_state === "sending"),
      hasEarlier: !!entry.cursor,
      storageWarning: this.warning,
    };
    for (const listener of entry.listeners) listener();
  }

  getSnapshot = (peer: string) =>
    this.current() ? this.entry(peer).snapshot : emptyConversationSnapshot;
  subscribe = (peer: string, listener: () => void) => {
    if (!this.current()) return () => undefined;
    const entry = this.entry(peer);
    entry.listeners.add(listener);
    return () => {
      entry.listeners.delete(listener);
      this.evict();
    };
  };

  acquire(peer: string) {
    if (!this.current() || !peer || peer === this.owner) return () => undefined;
    const entry = this.entry(peer);
    if (entry.closeTimer) clearTimeout(entry.closeTimer);
    entry.consumers += 1;
    this.connect(peer, entry);
    if (entry.reconciled) void this.refresh(peer);
    else if (!entry.request && !entry.initialTimer) {
      this.publish(peer, entry, { loading: !entry.rows.length });
      // A joined private topic plus its first snapshot closes the initial
      // fetch/join race. HTTP remains usable if Realtime cannot join promptly.
      entry.initialTimer = setTimeout(() => {
        entry.initialTimer = undefined;
        if (this.current() && entry.consumers) void this.refresh(peer);
      }, 200);
    }
    return () => {
      entry.consumers = Math.max(0, entry.consumers - 1);
      if (!entry.consumers) {
        // A page/sheet handoff and StrictMode re-acquisition share the same join.
        entry.closeTimer = setTimeout(() => {
          if (!entry.consumers) {
            this.close(entry);
            this.evict();
          }
        }, 0);
      }
    };
  }

  private connect(peer: string, entry: Entry) {
    if (entry.channel || !entry.consumers || !this.current()) return;
    const sequence = entry.sequence;
    const active = () => this.current() && entry.sequence === sequence && entry.consumers > 0;
    entry.channel = this.transport.subscribe(peer, {
      message: (row) => {
        if (active()) this.receive(peer, row);
      },
      connected: (connected) => {
        if (!active()) return;
        this.publish(peer, entry, { conversationConnected: connected });
        if (connected) {
          if (entry.initialTimer) clearTimeout(entry.initialTimer);
          entry.initialTimer = undefined;
          void this.refresh(peer);
          this.flush(peer);
        }
      },
      typing: (typing) => {
        if (!active()) return;
        if (entry.typingTimer) clearTimeout(entry.typingTimer);
        this.publish(peer, entry, { isOtherTyping: typing });
        if (typing)
          entry.typingTimer = setTimeout(() => {
            if (active()) this.publish(peer, entry, { isOtherTyping: false });
          }, 6_000);
      },
    });
  }

  private close(entry: Entry) {
    entry.sequence += 1;
    if (entry.closeTimer) clearTimeout(entry.closeTimer);
    if (entry.catchupTimer) clearTimeout(entry.catchupTimer);
    if (entry.typingTimer) clearTimeout(entry.typingTimer);
    if (entry.initialTimer) clearTimeout(entry.initialTimer);
    entry.initialTimer = undefined;
    void entry.channel?.typing(false).catch(() => undefined);
    entry.channel?.close();
    entry.channel = null;
    entry.request = undefined;
    entry.earlierRequest = undefined;
    entry.readRequest = undefined;
    entry.readPending = undefined;
    entry.snapshot = {
      ...entry.snapshot,
      loading: false,
      loadingEarlier: false,
      conversationConnected: false,
      isOtherTyping: false,
      catchingUp: false,
    };
  }

  dispose() {
    if (!this.alive) return;
    for (const entry of this.entries.values()) this.close(entry);
    this.alive = false;
    for (const entry of this.entries.values()) for (const listener of entry.listeners) listener();
    this.entries.clear();
    this.drafts.clear();
    this.outbox.clear();
    this.deliveries.clear();
    this.submissions.clear();
  }

  setOnline(online: boolean) {
    if (!this.current()) return;
    const recovered = !this.online && online;
    this.online = online;
    if (recovered) this.recover();
  }
  recover() {
    if (!this.current() || !this.online) return;
    for (const [peer, entry] of this.entries)
      if (entry.consumers) {
        this.connect(peer, entry);
        void this.refresh(peer);
        this.flush(peer);
      }
  }
  hide() {
    for (const [peer, entry] of this.entries) {
      void this.broadcastTyping(peer, false);
      if (entry.typingTimer) clearTimeout(entry.typingTimer);
      this.publish(peer, entry, { isOtherTyping: false });
    }
  }

  setDraft(peer: string, value: string) {
    if (!this.current()) return;
    const entry = this.entry(peer);
    if (entry.snapshot.draft === value) return;
    if (value && !this.drafts.has(peer) && this.drafts.size >= 100) {
      this.publish(peer, entry, {
        error: "You have 100 unsent drafts. Clear a draft before starting another.",
      });
      return;
    }
    const revision = ++this.draftRevision;
    if (value) this.drafts.set(peer, { value, revision });
    else this.drafts.delete(peer);
    this.publish(peer, entry, { draft: value, draftRevision: revision });
  }

  setFollowingLatest(peer: string, following: boolean) {
    if (!this.current()) return;
    const entry = this.entry(peer);
    entry.followingLatest = following && !entry.snapshot.hasNewer;
  }

  send(peer: string, content: string, revision: number): Promise<DirectMessage | null> {
    if (!this.current())
      return Promise.reject(new Error("Your account changed. Select the conversation again."));
    const submitted = this.submissions.get(peer);
    if (submitted?.revision === revision) return submitted.promise;
    const entry = this.entry(peer);
    const normalized = content.trim();
    const reject = (message: string) => {
      this.publish(peer, entry, { error: message });
      return Promise.reject(new Error(message));
    };
    if (!normalized || normalized.length > 4_000)
      return reject("Enter a message of 1–4,000 characters.");
    if (entry.snapshot.draftRevision !== revision || entry.snapshot.draft !== content) {
      return reject("The draft changed. Review your current message before sending.");
    }
    if (this.outbox.size >= maximumPending) {
      return reject("Your outbox has 100 messages. Retry or discard an unsent message first.");
    }
    const requestId = this.transport.randomId?.() ?? crypto.randomUUID();
    const pending: ConversationOutboxItem = {
      requestId,
      recipientId: peer,
      content: normalized,
      createdAt: new Date(this.now()).toISOString(),
      state: this.online ? "sending" : "queued",
    };
    this.outbox.set(requestId, pending);
    this.persist();
    if (entry.snapshot.hasNewer) {
      entry.rows = entry.recent;
      const oldest = entry.rows[0];
      entry.cursor = oldest ? cursorOf(oldest) : null;
    }
    this.drafts.delete(peer);
    this.publish(peer, entry, {
      draft: "",
      draftRevision: ++this.draftRevision,
      error: null,
      hasNewer: false,
    });
    const promise = this.online
      ? this.deliver(requestId)
      : Promise.resolve(projectConversationOutbox(this.owner, peer, [pending])[0]);
    this.submissions.set(peer, { revision, promise });
    if (this.submissions.size > 100) this.submissions.delete(this.submissions.keys().next().value!);
    return promise;
  }

  private deliver(requestId: string): Promise<DirectMessage | null> {
    const inFlight = this.deliveries.get(requestId);
    if (inFlight) return inFlight;
    const pending = this.outbox.get(requestId);
    if (!this.current() || !pending) return Promise.resolve(null);
    const entry = this.entry(pending.recipientId);
    const authority = entry.authority;
    pending.state = "sending";
    this.persist();
    this.publish(pending.recipientId, entry);
    const promise = (async () => {
      try {
        const row = await this.transport.send(pending.recipientId, pending.content, requestId);
        if (!this.current()) return null;
        if (
          !isConversationMessage(row, this.owner, pending.recipientId) ||
          row.sender_id !== this.owner ||
          row.client_request_id !== requestId
        ) {
          throw new Error("Message acknowledgement did not match this request.");
        }
        if (entry.authority !== authority || this.entries.get(pending.recipientId) !== entry) {
          // A valid server acknowledgement settles this queue item, but cannot
          // repopulate history whose access was revoked while HTTP was pending.
          this.outbox.delete(requestId);
          this.persist();
          const activeEntry = this.entries.get(pending.recipientId);
          if (activeEntry) this.publish(pending.recipientId, activeEntry);
          this.transport.attention();
        } else this.receive(pending.recipientId, row);
        return row;
      } catch (cause) {
        if (!this.current()) return null;
        // A durable Broadcast may have resolved an uncertain RPC response already.
        if (!this.outbox.has(requestId)) return null;
        pending.state = "failed";
        this.persist();
        this.failure(pending.recipientId, entry, cause);
        throw cause;
      } finally {
        if (this.current()) this.deliveries.delete(requestId);
      }
    })();
    this.deliveries.set(requestId, promise);
    return promise;
  }

  private flush(peer: string) {
    if (!this.online || !this.current()) return;
    // Sequential replay preserves user order and respects the existing server rate limit.
    void (async () => {
      for (const item of this.outbox.values()) {
        if (!this.current() || !this.online) return;
        if (item.recipientId !== peer || item.state !== "queued") continue;
        try {
          await this.deliver(item.requestId);
        } catch {
          /* Visible explicit retry. */
        }
      }
    })();
  }

  retrySend(peer: string, requestId: string) {
    const pending = this.outbox.get(requestId);
    if (!this.current() || !pending || pending.recipientId !== peer) return Promise.resolve(null);
    if (!this.online) {
      pending.state = "queued";
      this.persist();
      this.publish(peer, this.entry(peer));
      return Promise.resolve(null);
    }
    return this.deliver(requestId);
  }
  discardSend(peer: string, requestId: string) {
    const pending = this.outbox.get(requestId);
    if (!this.current() || !pending || pending.recipientId !== peer) return;
    if (this.deliveries.has(requestId)) {
      this.publish(peer, this.entry(peer), {
        error: "This message is being sent. Wait for its result before discarding it.",
      });
      return;
    }
    this.outbox.delete(requestId);
    this.persist();
    this.publish(peer, this.entry(peer));
  }

  private receive(peer: string, row: DirectMessage) {
    if (!this.current() || !isConversationMessage(row, this.owner, peer)) return;
    const entry = this.entry(peer);
    if (row.sender_id === this.owner && row.client_request_id) {
      const pending = this.outbox.get(row.client_request_id);
      if (pending?.recipientId === peer) {
        this.outbox.delete(row.client_request_id);
        this.persist();
      }
    }
    entry.recent = mergeConversationMessages(entry.recent, [row]).slice(-50);
    if (entry.snapshot.hasNewer) {
      entry.rows = entry.rows.map((existing) =>
        existing.id === row.id ? mergeConversationMessages([existing], [row])[0] : existing,
      );
    } else {
      const merged = mergeConversationMessages(entry.rows, [row]);
      if (!entry.followingLatest && merged.length > maximumRows) {
        entry.rows = merged.slice(0, maximumRows);
        this.publish(peer, entry, { hasNewer: true });
      } else {
        entry.rows = merged.slice(-maximumRows);
        if (entry.rows.length === maximumRows) entry.cursor = cursorOf(entry.rows[0]);
      }
    }
    this.publish(peer, entry);
    this.transport.attention();
  }

  private failure(peer: string, entry: Entry, cause: unknown) {
    if (permissionDenied(cause)) {
      entry.authority += 1;
      this.close(entry);
      entry.rows = [];
      entry.recent = [];
      entry.cursor = null;
      entry.reconciled = null;
      entry.historyInitialized = false;
    }
    this.publish(peer, entry, {
      loading: false,
      catchingUp: false,
      loadingEarlier: false,
      error: cause instanceof Error ? cause.message : "This conversation could not be refreshed.",
    });
  }

  refresh(peer: string): Promise<void> {
    if (!this.current()) return Promise.resolve();
    const entry = this.entry(peer);
    if (entry.request) return entry.request;
    const sequence = entry.sequence;
    const active = () => this.current() && entry.sequence === sequence;
    this.publish(peer, entry, {
      loading: !entry.rows.length,
      catchingUp: !!entry.reconciled,
      error: null,
    });
    const promise = (async () => {
      let continuation = false;
      try {
        if (entry.reconciled) {
          // Four bounded requests per batch; a long outage resumes from its
          // acknowledged cursor instead of skipping the unseen middle.
          for (let pageNumber = 0; pageNumber < 4; pageNumber += 1) {
            const page = await this.transport.after(peer, entry.reconciled);
            if (!active()) return;
            this.mergePage(peer, entry, page.messages);
            const latest = page.messages.at(-1);
            if (latest) {
              const next = cursorOf(latest);
              if (compareCursor(next, entry.reconciled) <= 0)
                throw new Error("Conversation recovery cursor did not advance.");
              entry.reconciled = next;
            }
            if (!page.nextCursor) break;
            if (!latest) throw new Error("Conversation recovery returned an empty continuation.");
            continuation = pageNumber === 3;
          }
        }
        if (!continuation) {
          const page = await this.transport.history(peer);
          if (!active()) return;
          this.mergePage(peer, entry, page.messages);
          const latest = [...page.messages]
            .sort((a, b) => compareCursor(cursorOf(a), cursorOf(b)))
            .at(-1);
          if (latest && !entry.reconciled) entry.reconciled = cursorOf(latest);
          else if (
            latest &&
            entry.reconciled &&
            compareCursor(cursorOf(latest), entry.reconciled) > 0
          )
            continuation = true;
          if (!entry.historyInitialized) {
            entry.cursor = page.nextCursor;
            entry.historyInitialized = true;
          }
        }
      } catch (cause) {
        if (active()) this.failure(peer, entry, cause);
      } finally {
        if (active()) {
          this.publish(peer, entry, { loading: false, catchingUp: continuation });
          if (continuation && entry.consumers)
            entry.catchupTimer = setTimeout(() => {
              void this.refresh(peer);
            }, 100);
        }
      }
    })();
    entry.request = promise;
    void promise.finally(() => {
      if (entry.request === promise) {
        entry.request = undefined;
        this.evict();
      }
    });
    return promise;
  }

  private mergePage(peer: string, entry: Entry, rows: DirectMessage[]) {
    const allowed = rows.filter((row) => isConversationMessage(row, this.owner, peer));
    for (const row of allowed)
      if (
        row.sender_id === this.owner &&
        row.client_request_id &&
        this.outbox.get(row.client_request_id)?.recipientId === peer
      )
        this.outbox.delete(row.client_request_id);
    this.persist();
    entry.recent = mergeConversationMessages(entry.recent, allowed).slice(-50);
    if (entry.snapshot.hasNewer) {
      const byId = new Map(allowed.map((row) => [row.id, row]));
      entry.rows = entry.rows.map((row) =>
        byId.has(row.id) ? mergeConversationMessages([row], [byId.get(row.id)!])[0] : row,
      );
    } else {
      const merged = mergeConversationMessages(entry.rows, allowed);
      if (!entry.followingLatest && merged.length > maximumRows) {
        entry.rows = merged.slice(0, maximumRows);
        this.publish(peer, entry, { hasNewer: true });
      } else {
        entry.rows = merged.slice(-maximumRows);
        if (merged.length > maximumRows) entry.cursor = cursorOf(entry.rows[0]);
      }
    }
    this.publish(peer, entry);
  }

  loadEarlier(peer: string): Promise<void> {
    if (!this.current()) return Promise.resolve();
    const entry = this.entry(peer);
    if (!entry.cursor || entry.earlierRequest) return entry.earlierRequest ?? Promise.resolve();
    const before = entry.cursor;
    entry.followingLatest = false;
    const sequence = entry.sequence;
    this.publish(peer, entry, { loadingEarlier: true, error: null });
    const promise = (async () => {
      try {
        const page = await this.transport.history(peer, before);
        if (!this.current() || entry.sequence !== sequence) return;
        const allowed = page.messages.filter((row) => isConversationMessage(row, this.owner, peer));
        const merged = mergeConversationMessages(entry.rows, allowed);
        entry.rows = merged.slice(0, maximumRows);
        entry.cursor = page.nextCursor;
        this.publish(peer, entry, {
          hasNewer: entry.snapshot.hasNewer || merged.length > maximumRows,
        });
      } catch (cause) {
        if (this.current() && entry.sequence === sequence) this.failure(peer, entry, cause);
      } finally {
        if (this.current() && entry.sequence === sequence)
          this.publish(peer, entry, { loadingEarlier: false });
      }
    })();
    entry.earlierRequest = promise;
    void promise.finally(() => {
      if (entry.earlierRequest === promise) entry.earlierRequest = undefined;
    });
    return promise;
  }

  async loadLatest(peer: string) {
    if (!this.current()) return;
    const entry = this.entry(peer);
    entry.followingLatest = true;
    // Keep the recent cache readable while the current authority is reconciled.
    entry.rows = entry.recent;
    entry.cursor = null;
    entry.historyInitialized = false;
    this.publish(peer, entry, { hasNewer: false });
    await this.refresh(peer);
  }

  acknowledgeVisible(peer: string, boundaryId: string): Promise<void> {
    if (!this.current() || !this.transport.visible()) return Promise.resolve();
    const entry = this.entry(peer);
    if (!entry.consumers || entry.snapshot.hasNewer) return Promise.resolve();
    const incoming = entry.rows.filter((row) => row.sender_id === peer && !row.delivery_state);
    const boundary = incoming.at(-1);
    if (
      !boundary ||
      boundary.id !== boundaryId ||
      boundary.read_at ||
      entry.readBoundary === boundaryId
    )
      return Promise.resolve();
    if (entry.readRequest) {
      entry.readPending = boundaryId;
      return entry.readRequest;
    }
    const sequence = entry.sequence;
    const promise = (async () => {
      try {
        await this.transport.read(peer, boundaryId);
        if (!this.current() || entry.sequence !== sequence) return;
        entry.readBoundary = boundaryId;
        const readAt = new Date(this.now()).toISOString();
        const mark = (row: DirectMessage) =>
          row.sender_id === peer && compareCursor(cursorOf(row), cursorOf(boundary)) <= 0
            ? { ...row, read_at: row.read_at ?? readAt }
            : row;
        entry.rows = entry.rows.map(mark);
        entry.recent = entry.recent.map(mark);
        this.publish(peer, entry);
        this.transport.attention();
      } catch (cause) {
        if (this.current() && entry.sequence === sequence) this.failure(peer, entry, cause);
      }
    })();
    entry.readRequest = promise;
    void promise.finally(() => {
      if (entry.readRequest !== promise) return;
      entry.readRequest = undefined;
      const pending = entry.readPending;
      entry.readPending = undefined;
      if (pending) void this.acknowledgeVisible(peer, pending);
    });
    return promise;
  }

  async broadcastTyping(peer: string, typing: boolean) {
    if (!this.current()) return;
    const entry = this.entry(peer);
    if (!entry.channel || !entry.snapshot.conversationConnected) return;
    if (typing && (!this.transport.visible() || this.now() - entry.lastTypingAt < 2_000)) return;
    if (typing) entry.lastTypingAt = this.now();
    try {
      await entry.channel.typing(typing);
    } catch {
      /* Typing is deliberately ephemeral. */
    }
  }
}
