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
export type SpaceThreadControls = {
  threadId: string;
  roomId: string;
  visibility: "room" | "private";
  createdBy: string;
  memberUserIds: string[];
  memberCount: number;
  canManageMembers: boolean;
  maxMembers: number;
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
export type SpaceNotificationPreference = "default" | "all" | "mentions" | "digest" | "mute";
export type SpaceQuietHours = {
  policyVersion: number;
  timezone: string;
  enabled: boolean;
  start: string | null;
  end: string | null;
  digestHour: number;
};
export type SpaceRoomControls = {
  roomId: string;
  preference: SpaceNotificationPreference;
  quietHours: SpaceQuietHours;
  quietActive: boolean;
  nextDeliveryAt: string | null;
  bookmarkedMessageIds: string[];
  pinnedMessageIds: string[];
  followedThreadIds: string[];
  unreadThreadIds: string[];
  canManagePins: boolean;
};
export type SpaceSearchResult = {
  messageId: string;
  roomId: string;
  roomName: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  excerpt: string;
  createdAt: string;
  thread: {
    id: string;
    title: string | null;
    updatedAt: string;
    lockedAt: string | null;
    replyCount: number;
    parentMessageId: string;
    parentAuthorId: string;
    parentAuthorDisplayName: string;
    parentAuthorAvatarUrl: string | null;
    parentContent: string | null;
    parentCreatedAt: string;
  } | null;
};
export type SpaceSearchCursor = { relevance: number; createdAt: string; id: string };
export type SpaceSearchPage = {
  items: SpaceSearchResult[];
  hasMore: boolean;
  nextCursor: SpaceSearchCursor | null;
};
export type SpaceRoomPermissionCapability =
  | "room.view"
  | "message.create"
  | "thread.create"
  | "message.moderate"
  | "room.manage";
export type SpaceRoomPermission = {
  id: string;
  roleId: string | null;
  userId: string | null;
  capability: SpaceRoomPermissionCapability;
  effect: "allow" | "deny";
  createdAt: string;
};
export type ManagedSpaceMember = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  domainRole: string;
  membershipState: "invited" | "requested" | "active" | "suspended" | "left" | "removed";
  sourceMembershipVersion: number;
  timeoutExpiresAt: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SPACE_SLOW_MODE_OPTIONS = [
  0, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600,
] as const;

export type SpaceSlowModeSeconds = (typeof SPACE_SLOW_MODE_OPTIONS)[number];

export function normalizeSpaceSlowModeSeconds(value: number): SpaceSlowModeSeconds {
  if (!SPACE_SLOW_MODE_OPTIONS.includes(value as SpaceSlowModeSeconds)) {
    throw new Error("Choose a supported Room slow-mode interval");
  }
  return value as SpaceSlowModeSeconds;
}

export function formatSpaceMessageSendError(value: unknown): string {
  if (!value || typeof value !== "object") return "Could not send message";
  const error = value as { message?: unknown; details?: unknown };
  const message = typeof error.message === "string" ? error.message : "Could not send message";
  if (
    !["Room slow mode is active", "Space timeout is active"].includes(message) ||
    typeof error.details !== "string"
  )
    return message;
  try {
    const details = JSON.parse(error.details) as { retryAfterSeconds?: unknown };
    if (
      typeof details.retryAfterSeconds === "number" &&
      Number.isInteger(details.retryAfterSeconds) &&
      details.retryAfterSeconds > 0 &&
      details.retryAfterSeconds <= 3600
    ) {
      return message === "Space timeout is active"
        ? `Your Space timeout is active for ${details.retryAfterSeconds} more seconds.`
        : `Slow mode is active. Try again in ${details.retryAfterSeconds} seconds.`;
    }
  } catch {
    // A malformed server detail must not replace the safe public message.
  }
  return "Slow mode is active. Wait before sending another message in this Room.";
}

export function parseManagedSpaceMembers(value: unknown): ManagedSpaceMember[] {
  if (!Array.isArray(value)) return [];
  const states = new Set<ManagedSpaceMember["membershipState"]>([
    "invited",
    "requested",
    "active",
    "suspended",
    "left",
    "removed",
  ]);
  return value.flatMap((candidate): ManagedSpaceMember[] => {
    const row = objectValue(candidate);
    const userId = textValue(row.user_id);
    const displayName = textValue(row.display_name);
    const domainRole = textValue(row.domain_role);
    const membershipState = textValue(row.membership_state);
    const sourceMembershipVersion = row.source_membership_version;
    const timeoutExpiresAt = row.timeout_expires_at;
    if (
      !userId ||
      !displayName ||
      !domainRole ||
      !states.has(membershipState as ManagedSpaceMember["membershipState"]) ||
      !Number.isSafeInteger(sourceMembershipVersion) ||
      (sourceMembershipVersion as number) < 1 ||
      (timeoutExpiresAt !== null &&
        (typeof timeoutExpiresAt !== "string" || !Number.isFinite(Date.parse(timeoutExpiresAt))))
    ) {
      return [];
    }
    return [
      {
        userId,
        displayName,
        avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
        headline: typeof row.headline === "string" ? row.headline : null,
        domainRole,
        membershipState: membershipState as ManagedSpaceMember["membershipState"],
        sourceMembershipVersion: sourceMembershipVersion as number,
        timeoutExpiresAt,
      },
    ];
  });
}

export function normalizeSpaceMentionIds(values: readonly string[], actorId: string | null) {
  const normalized = Array.from(
    new Set(values.filter((value) => uuidPattern.test(value) && value !== actorId)),
  );
  if (normalized.length > 10) throw new Error("A message can mention at most 10 people");
  return normalized;
}

export function normalizeSpaceRoleMentionIds(values: readonly string[]) {
  const normalized = Array.from(new Set(values.filter((value) => uuidPattern.test(value))));
  if (normalized.length > 3) throw new Error("A message can mention at most 3 roles");
  return normalized;
}

const notificationPreferences = new Set<SpaceNotificationPreference>([
  "default",
  "all",
  "mentions",
  "digest",
  "mute",
]);
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function objectValue(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

export function textValue(value: Json | undefined, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function stringArray(value: Json | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item))
    : [];
}

export function parseSpaceRoomControls(value: Json): SpaceRoomControls {
  const controls = objectValue(value);
  const roomId = textValue(controls.roomId);
  const preference = textValue(controls.preference, "default") as SpaceNotificationPreference;
  if (!roomId || !notificationPreferences.has(preference)) {
    throw new Error("The Room attention controls are invalid");
  }
  const quiet = objectValue(controls.quietHours);
  const policyVersion = numberValue(quiet.policyVersion) || 1;
  const timezone = textValue(quiet.timezone, "UTC");
  const enabled = quiet.enabled === true;
  const start = nullableText(quiet.start);
  const end = nullableText(quiet.end);
  const digestHour = quiet.digestHour === undefined ? 8 : numberValue(quiet.digestHour);
  let timezoneValid = true;
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
  } catch {
    timezoneValid = false;
  }
  const quietHoursValid = !(
    !Number.isInteger(policyVersion) ||
    policyVersion < 1 ||
    !timezone ||
    !timezoneValid ||
    !Number.isInteger(digestHour) ||
    digestHour < 0 ||
    digestHour > 23 ||
    (enabled &&
      (!start || !end || start === end || !timePattern.test(start) || !timePattern.test(end)))
  );
  const safeQuietHours: SpaceQuietHours = quietHoursValid
    ? { policyVersion, timezone, enabled, start, end, digestHour }
    : {
        policyVersion: 1,
        timezone: "UTC",
        enabled: false,
        start: null,
        end: null,
        digestHour: 8,
      };
  return {
    roomId,
    preference,
    quietHours: safeQuietHours,
    quietActive: quietHoursValid && controls.quietActive === true,
    nextDeliveryAt: nullableText(controls.nextDeliveryAt),
    bookmarkedMessageIds: stringArray(controls.bookmarkedMessageIds),
    pinnedMessageIds: stringArray(controls.pinnedMessageIds),
    followedThreadIds: stringArray(controls.followedThreadIds),
    unreadThreadIds: stringArray(controls.unreadThreadIds),
    canManagePins: controls.canManagePins === true,
  };
}

export function parseSpaceThreadControls(value: Json): SpaceThreadControls {
  const controls = objectValue(value);
  const threadId = textValue(controls.threadId);
  const roomId = textValue(controls.roomId);
  const createdBy = textValue(controls.createdBy);
  const visibility = textValue(controls.visibility);
  const memberUserIds = Array.from(
    new Set(stringArray(controls.memberUserIds).filter((id) => uuidPattern.test(id))),
  );
  const memberCount = Math.trunc(numberValue(controls.memberCount));
  const maxMembers = Math.trunc(numberValue(controls.maxMembers));
  if (
    !uuidPattern.test(threadId) ||
    !uuidPattern.test(roomId) ||
    !uuidPattern.test(createdBy) ||
    (visibility !== "room" && visibility !== "private") ||
    memberCount < 0 ||
    maxMembers < 1 ||
    maxMembers > 100 ||
    memberUserIds.length > maxMembers ||
    (visibility === "private" &&
      (memberCount !== memberUserIds.length || !memberUserIds.includes(createdBy))) ||
    (visibility === "room" && (memberCount !== 0 || memberUserIds.length !== 0))
  ) {
    throw new Error("The Thread controls are invalid");
  }
  return {
    threadId,
    roomId,
    visibility,
    createdBy,
    memberUserIds,
    memberCount,
    canManageMembers: controls.canManageMembers === true,
    maxMembers,
  };
}

export function parseSpaceSearchPayload(value: Json): SpaceSearchResult[] {
  const root = objectValue(value);
  if (!Array.isArray(root.items)) return [];
  return root.items.flatMap((item) => {
    const row = objectValue(item);
    const messageId = textValue(row.messageId);
    const roomId = textValue(row.roomId);
    const authorId = textValue(row.authorId);
    const excerpt = textValue(row.excerpt);
    const createdAt = textValue(row.createdAt);
    if (!messageId || !roomId || !authorId || !excerpt || !createdAt) return [];

    const threadId = textValue(row.threadId);
    const parentMessageId = textValue(row.parentMessageId);
    const parentAuthorId = textValue(row.parentAuthorId);
    const parentCreatedAt = textValue(row.parentCreatedAt);
    const threadUpdatedAt = textValue(row.threadUpdatedAt);
    if (threadId && (!parentMessageId || !parentAuthorId || !parentCreatedAt || !threadUpdatedAt)) {
      return [];
    }

    return [
      {
        messageId,
        roomId,
        roomName: textValue(row.roomName, "Room"),
        authorId,
        authorDisplayName: textValue(row.authorDisplayName, "Member"),
        authorAvatarUrl: nullableText(row.authorAvatarUrl),
        excerpt,
        createdAt,
        thread: threadId
          ? {
              id: threadId,
              title: nullableText(row.threadTitle),
              updatedAt: threadUpdatedAt,
              lockedAt: nullableText(row.threadLockedAt),
              replyCount: Math.max(0, Math.trunc(numberValue(row.replyCount))),
              parentMessageId,
              parentAuthorId,
              parentAuthorDisplayName: textValue(row.parentAuthorDisplayName, "Member"),
              parentAuthorAvatarUrl: nullableText(row.parentAuthorAvatarUrl),
              parentContent: nullableText(row.parentContent),
              parentCreatedAt,
            }
          : null,
      },
    ];
  });
}

export function parseSpaceSearchPage(value: Json): SpaceSearchPage {
  const root = objectValue(value);
  const items = parseSpaceSearchPayload(value);
  const hasMore = root.hasMore === true;
  const cursor = objectValue(root.nextCursor);
  const relevance = cursor.relevance;
  const createdAt = textValue(cursor.createdAt);
  const id = textValue(cursor.id);
  if (
    hasMore &&
    (typeof relevance !== "number" ||
      !Number.isFinite(relevance) ||
      relevance < 0 ||
      !createdAt ||
      !uuidPattern.test(id))
  ) {
    throw new Error("The search cursor is invalid");
  }
  return {
    items,
    hasMore,
    nextCursor: hasMore && typeof relevance === "number" ? { relevance, createdAt, id } : null,
  };
}

const roomPermissionCapabilities = new Set<SpaceRoomPermissionCapability>([
  "room.view",
  "message.create",
  "thread.create",
  "message.moderate",
  "room.manage",
]);

export function parseSpaceRoomPermissions(value: Json): SpaceRoomPermission[] {
  const root = objectValue(value);
  if (!Array.isArray(root.items)) return [];
  return root.items.flatMap((item) => {
    const row = objectValue(item);
    const id = textValue(row.id);
    const roleId = nullableText(row.roleId);
    const userId = nullableText(row.userId);
    const capability = textValue(row.capability) as SpaceRoomPermissionCapability;
    const effect = textValue(row.effect);
    const createdAt = textValue(row.createdAt);
    if (
      !id ||
      !createdAt ||
      (roleId === null) === (userId === null) ||
      !roomPermissionCapabilities.has(capability) ||
      (effect !== "allow" && effect !== "deny")
    ) {
      return [];
    }
    return [{ id, roleId, userId, capability, effect, createdAt }];
  });
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
