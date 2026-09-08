import type { DirectMessage } from "./types";

export type ConversationOutboxItem = {
  requestId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  state: "queued" | "sending" | "failed";
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maximumOutboxItems = 100;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseDirectMessageBroadcast(value: unknown): DirectMessage | null {
  const event = asRecord(value);
  const payload = asRecord(event?.payload);
  const candidate = asRecord(payload?.new) ?? asRecord(event?.new);
  if (!candidate) return null;

  const required = ["id", "sender_id", "recipient_id", "content", "created_at"] as const;
  if (required.some((key) => typeof candidate[key] !== "string" || !candidate[key])) return null;
  if (
    candidate.client_request_id !== null &&
    candidate.client_request_id !== undefined &&
    typeof candidate.client_request_id !== "string"
  ) {
    return null;
  }
  if (
    candidate.read_at !== null &&
    candidate.read_at !== undefined &&
    typeof candidate.read_at !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id as string,
    sender_id: candidate.sender_id as string,
    recipient_id: candidate.recipient_id as string,
    content: candidate.content as string,
    client_request_id: (candidate.client_request_id as string | null | undefined) ?? null,
    created_at: candidate.created_at as string,
    read_at: (candidate.read_at as string | null | undefined) ?? null,
  };
}

export function isConversationMessage(message: DirectMessage, userId: string, otherUserId: string) {
  return (
    (message.sender_id === userId && message.recipient_id === otherUserId) ||
    (message.sender_id === otherUserId && message.recipient_id === userId)
  );
}

export function mergeConversationMessages(current: DirectMessage[], incoming: DirectMessage[]) {
  const messageKey = (message: DirectMessage) =>
    message.client_request_id
      ? `request:${message.sender_id}:${message.client_request_id}`
      : `message:${message.id}`;
  const byId = new Map(current.map((message) => [messageKey(message), message]));
  for (const message of incoming) {
    const key = messageKey(message);
    const existing = byId.get(key);
    // A durable server row replaces its optimistic browser projection. A late
    // optimistic state must never replace already-reconciled database evidence.
    if (!existing?.delivery_state && message.delivery_state) continue;
    byId.set(key, message);
  }

  return [...byId.values()].sort((left, right) => {
    const timeDifference = Date.parse(left.created_at) - Date.parse(right.created_at);
    return timeDifference || left.id.localeCompare(right.id);
  });
}

export function updateDirectMessageDelivery(
  messages: DirectMessage[],
  clientRequestId: string,
  state: DirectMessage["delivery_state"],
) {
  return messages.map((message) =>
    message.client_request_id === clientRequestId ? { ...message, delivery_state: state } : message,
  );
}

/**
 * Restores only a bounded, account-scoped direct-message outbox. A request
 * interrupted while sending is safe to retry because send_my_direct_message is
 * idempotent on client_request_id.
 */
export function parseConversationOutbox(value: unknown, expectedUserId: string) {
  const root = asRecord(value);
  if (root?.version !== 1 || root.userId !== expectedUserId || !Array.isArray(root.items)) {
    return [];
  }

  const seen = new Set<string>();
  return root.items.slice(0, maximumOutboxItems).flatMap((candidate): ConversationOutboxItem[] => {
    const item = asRecord(candidate);
    if (!item) return [];
    const requestId = item.requestId;
    const recipientId = item.recipientId;
    const content = typeof item.content === "string" ? item.content.trim() : "";
    const createdAt = item.createdAt;
    const state = item.state;
    if (
      typeof requestId !== "string" ||
      !uuidPattern.test(requestId) ||
      seen.has(requestId) ||
      typeof recipientId !== "string" ||
      !uuidPattern.test(recipientId) ||
      !content ||
      content.length > 4_000 ||
      typeof createdAt !== "string" ||
      !Number.isFinite(Date.parse(createdAt)) ||
      (state !== "queued" && state !== "sending" && state !== "failed")
    ) {
      return [];
    }
    seen.add(requestId);
    return [
      {
        requestId,
        recipientId,
        content,
        createdAt,
        // A browser can disappear after the request was sent but before its
        // durable row arrived. Replay the same key instead of stranding it.
        state: state === "sending" ? "queued" : state,
      },
    ];
  });
}

export function projectConversationOutbox(
  userId: string,
  recipientId: string,
  items: Iterable<ConversationOutboxItem>,
): DirectMessage[] {
  return [...items]
    .filter((item) => item.recipientId === recipientId)
    .map((item) => ({
      id: `pending:${item.requestId}`,
      sender_id: userId,
      recipient_id: recipientId,
      content: item.content,
      client_request_id: item.requestId,
      created_at: item.createdAt,
      read_at: null,
      delivery_state: item.state,
    }));
}
