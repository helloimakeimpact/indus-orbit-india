import { getConversationAccount } from "@/features/conversations/conversation-lifecycle";
import type { DirectMessage, ConversationContact } from "@/features/conversations/types";

export type DirectConversationCursor = { createdAt: string; id: string };
export type InboxCursor = { createdAt: string; id: string; peerId: string };
export type ConversationContactsCursor = { displayName: string; userId: string };
export type DirectInboxContact = ConversationContact & {
  last_message_id: string;
  last_message_content: string;
  last_message_at: string;
  last_sender_id: string;
  unread_count: number;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid = () => new Error("The conversation response could not be verified. Please refresh.");
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
};
const id = (value: unknown): string => {
  if (typeof value !== "string" || !uuid.test(value)) throw invalid();
  return value;
};
const text = (value: unknown, maximum: number): string => {
  if (typeof value !== "string" || value.length > maximum) throw invalid();
  return value;
};
const nullableText = (value: unknown, maximum: number) =>
  value === null ? null : text(value, maximum);
const timestamp = (value: unknown): string => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw invalid();
  return value;
};

export function parseDirectMessages(value: unknown, owner: string, peer: string): DirectMessage[] {
  if (!Array.isArray(value) || value.length > 101) throw invalid();
  return value.map((input) => {
    const row = record(input);
    const sender = id(row.sender_id);
    const recipient = id(row.recipient_id);
    if (!((sender === owner && recipient === peer) || (sender === peer && recipient === owner))) {
      throw invalid();
    }
    return {
      id: id(row.id),
      sender_id: sender,
      recipient_id: recipient,
      content: text(row.content, 4_000),
      client_request_id: row.client_request_id === null ? null : id(row.client_request_id),
      created_at: timestamp(row.created_at),
      read_at: row.read_at === null ? null : timestamp(row.read_at),
    };
  });
}

export function parseConversationContacts(value: unknown, owner: string): ConversationContact[] {
  if (!Array.isArray(value) || value.length > 101) throw invalid();
  const seen = new Set<string>();
  return value.map((input) => {
    const row = record(input);
    const userId = id(row.user_id);
    if (userId === owner || seen.has(userId)) throw invalid();
    seen.add(userId);
    return {
      user_id: userId,
      display_name: nullableText(row.display_name, 500),
      avatar_url: nullableText(row.avatar_url, 4_096),
      headline: nullableText(row.headline, 2_000),
    };
  });
}

export function parseDirectInbox(value: unknown, owner: string): DirectInboxContact[] {
  const contacts = parseConversationContacts(value, owner);
  return contacts.map((contact, index) => {
    const row = record((value as unknown[])[index]);
    const sender = id(row.last_sender_id);
    if (sender !== owner && sender !== contact.user_id) throw invalid();
    if (!Number.isSafeInteger(row.unread_count) || (row.unread_count as number) < 0)
      throw invalid();
    return {
      ...contact,
      last_message_id: id(row.last_message_id),
      last_message_content: text(row.last_message_content, 4_000),
      last_message_at: timestamp(row.last_message_at),
      last_sender_id: sender,
      unread_count: row.unread_count as number,
    };
  });
}

export function directMessagePage(rows: DirectMessage[], pageSize = 50) {
  const messages = rows.slice(0, pageSize);
  const boundary = messages.at(-1);
  return {
    messages,
    nextCursor:
      rows.length > pageSize && boundary
        ? { createdAt: boundary.created_at, id: boundary.id }
        : null,
  };
}

export function captureDirectMessageAccount(expectedUserId?: string) {
  const captured = getConversationAccount();
  return () => {
    const current = getConversationAccount();
    if (
      !captured.owner ||
      (expectedUserId && captured.owner !== expectedUserId) ||
      captured.owner !== current.owner ||
      captured.generation !== current.generation
    ) {
      throw Object.assign(new Error("Your account changed. Reopen Messages."), { code: "42501" });
    }
  };
}
