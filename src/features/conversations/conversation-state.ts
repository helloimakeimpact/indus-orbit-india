import type { DirectMessage } from "./types";

export function isConversationMessage(message: DirectMessage, userId: string, otherUserId: string) {
  return (
    (message.sender_id === userId && message.recipient_id === otherUserId) ||
    (message.sender_id === otherUserId && message.recipient_id === userId)
  );
}

export function mergeConversationMessages(current: DirectMessage[], incoming: DirectMessage[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);

  return [...byId.values()].sort((left, right) => {
    const timeDifference = Date.parse(left.created_at) - Date.parse(right.created_at);
    return timeDifference || left.id.localeCompare(right.id);
  });
}
