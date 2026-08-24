import type { Json } from "@/integrations/supabase/types";

export type SpaceReaction = {
  key: "acknowledge" | "support" | "question" | "complete";
  count: number;
  reactedByMe: boolean;
};
export type SpaceAttachment = {
  id: string;
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  scanStatus: "pending" | "clean" | "blocked" | "failed";
  altText: string | null;
  signedUrl: string | null;
};
export type SpaceThreadSummary = {
  id: string;
  title: string | null;
  replyCount: number;
  updatedAt: string;
  lockedAt: string | null;
};
export type SpaceMessage = {
  id: string;
  roomId: string;
  threadId: string | null;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  messageType: string;
  content: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  reactions: SpaceReaction[];
  attachments: SpaceAttachment[];
  thread: SpaceThreadSummary | null;
};
export type SpaceFeedCursor = { createdAt: string; id: string };
export type SpaceFeed = {
  items: SpaceMessage[];
  hasMore: boolean;
  nextCursor: SpaceFeedCursor | null;
  canManage: boolean;
  canModerate: boolean;
};

export function objectValue(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

export function textValue(value: Json | undefined, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: Json | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: Json | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseAttachment(value: Json): SpaceAttachment | null {
  const row = objectValue(value);
  const id = textValue(row.id);
  const path = textValue(row.path);
  if (!id || !path) return null;
  const scanStatus = textValue(row.scanStatus);
  return {
    id,
    bucket: textValue(row.bucket, "orbit-attachments"),
    path,
    fileName: textValue(row.fileName, "Attachment"),
    contentType: textValue(row.contentType, "application/octet-stream"),
    byteSize: numberValue(row.byteSize),
    scanStatus:
      scanStatus === "clean" || scanStatus === "blocked" || scanStatus === "failed"
        ? scanStatus
        : "pending",
    altText: nullableText(row.altText),
    signedUrl: null,
  };
}

function parseMessage(value: Json): SpaceMessage | null {
  const row = objectValue(value);
  const id = textValue(row.id);
  const authorId = textValue(row.authorId);
  if (!id || !authorId) return null;
  const reactions: SpaceReaction[] = Array.isArray(row.reactions)
    ? row.reactions.flatMap((item) => {
        const reaction = objectValue(item);
        const key = textValue(reaction.key);
        if (!["acknowledge", "support", "question", "complete"].includes(key)) return [];
        return [
          {
            key: key as SpaceReaction["key"],
            count: numberValue(reaction.count),
            reactedByMe: reaction.reactedByMe === true,
          },
        ];
      })
    : [];
  const threadRow = objectValue(row.thread);
  const threadId = textValue(threadRow.id);
  return {
    id,
    roomId: textValue(row.roomId),
    threadId: nullableText(row.threadId),
    authorId,
    authorDisplayName: textValue(row.authorDisplayName, "Member"),
    authorAvatarUrl: nullableText(row.authorAvatarUrl),
    messageType: textValue(row.messageType, "human"),
    content: nullableText(row.content),
    createdAt: textValue(row.createdAt),
    editedAt: nullableText(row.editedAt),
    deletedAt: nullableText(row.deletedAt),
    reactions,
    attachments: Array.isArray(row.attachments)
      ? row.attachments.flatMap((item) => {
          const parsed = parseAttachment(item);
          return parsed ? [parsed] : [];
        })
      : [],
    thread: threadId
      ? {
          id: threadId,
          title: nullableText(threadRow.title),
          replyCount: numberValue(threadRow.replyCount),
          updatedAt: textValue(threadRow.updatedAt),
          lockedAt: nullableText(threadRow.lockedAt),
        }
      : null,
  };
}

export function parseSpaceFeedPayload(data: Json): SpaceFeed {
  const root = objectValue(data);
  const items = Array.isArray(root.items)
    ? root.items.flatMap((item) => {
        const parsed = parseMessage(item);
        return parsed ? [parsed] : [];
      })
    : [];
  const cursor = objectValue(root.nextCursor);
  const cursorCreatedAt = textValue(cursor.createdAt);
  const cursorId = textValue(cursor.id);
  return {
    items,
    hasMore: root.hasMore === true,
    nextCursor: cursorCreatedAt && cursorId ? { createdAt: cursorCreatedAt, id: cursorId } : null,
    canManage: root.canManage === true,
    canModerate: root.canModerate === true,
  };
}
