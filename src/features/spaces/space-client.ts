import { supabase } from "@/integrations/supabase/client";
import { isMissingSchemaContract } from "@/integrations/supabase/schema-compat";
import type { Database } from "@/integrations/supabase/types";
import {
  objectValue,
  normalizeSpaceMentionIds,
  parseSpaceFeedPayload,
  parseSpaceRoomControls,
  textValue,
  type SpaceFeed,
  type SpaceFeedCursor,
  type SpaceMessage,
  type SpaceNotificationPreference,
  type SpaceReaction,
  type SpaceRoomControls,
  type SpaceThreadSummary,
} from "./space-feed";

export type {
  SpaceAttachment,
  SpaceFeed,
  SpaceFeedCursor,
  SpaceMessage,
  SpaceNotificationPreference,
  SpaceReaction,
  SpaceRoomControls,
  SpaceThreadSummary,
} from "./space-feed";

type Space = Database["public"]["Tables"]["conversation_spaces"]["Row"];
type ContextGroup = Database["public"]["Tables"]["conversation_context_groups"]["Row"];
type Room = Database["public"]["Tables"]["conversation_rooms"]["Row"];
type Membership = Database["public"]["Tables"]["conversation_space_memberships"]["Row"];
type ProfileSummary = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "display_name" | "avatar_url" | "headline"
>;

export type SpaceMember = Membership & { profiles: ProfileSummary | null };
export type SpaceWorkspace = {
  space: Space;
  groups: ContextGroup[];
  rooms: Room[];
  members: SpaceMember[];
};

const notificationPreferences = new Set<SpaceNotificationPreference>([
  "default",
  "all",
  "mentions",
  "digest",
  "mute",
]);

const attachmentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
]);

async function signVisibleAttachments(messages: SpaceMessage[]): Promise<SpaceMessage[]> {
  return Promise.all(
    messages.map(async (message) => ({
      ...message,
      attachments: await Promise.all(
        message.attachments.map(async (attachment) => {
          const { data } = await supabase.storage
            .from(attachment.bucket)
            .createSignedUrl(attachment.path, 10 * 60);
          return { ...attachment, signedUrl: data?.signedUrl ?? null };
        }),
      ),
    })),
  );
}

export async function getSourceSpaceId(
  sourceType: "chapter" | "mission",
  sourceId: string,
): Promise<string | null> {
  const query = supabase.from("conversation_spaces").select("id");
  const { data, error } =
    sourceType === "chapter"
      ? await query.eq("chapter_id", sourceId).maybeSingle()
      : await query.eq("mission_id", sourceId).maybeSingle();
  if (!error) return data?.id ?? null;
  if (isMissingSchemaContract(error)) return null;
  throw new Error(error.message);
}

export async function getSpaceWorkspace(spaceId: string): Promise<SpaceWorkspace> {
  const [spaceResult, groupResult, roomResult, memberResult] = await Promise.all([
    supabase.from("conversation_spaces").select("*").eq("id", spaceId).single(),
    supabase
      .from("conversation_context_groups")
      .select("*")
      .eq("space_id", spaceId)
      .order("position"),
    supabase
      .from("conversation_rooms")
      .select("*")
      .eq("space_id", spaceId)
      .is("archived_at", null)
      .order("position"),
    supabase
      .from("conversation_space_memberships")
      .select(
        "*, profiles!conversation_space_memberships_user_id_fkey(display_name, avatar_url, headline)",
      )
      .eq("space_id", spaceId)
      .eq("membership_state", "active")
      .order("joined_at"),
  ]);
  const error =
    spaceResult.error ?? groupResult.error ?? roomResult.error ?? memberResult.error ?? null;
  if (error) throw new Error(error.message);
  if (!spaceResult.data) throw new Error("Space not found");
  return {
    space: spaceResult.data,
    groups: groupResult.data ?? [],
    rooms: roomResult.data ?? [],
    members: (memberResult.data ?? []) as SpaceMember[],
  };
}

export async function getRoomFeed(
  roomId: string,
  options: { threadId?: string; cursor?: SpaceFeedCursor; limit?: number } = {},
): Promise<SpaceFeed> {
  const { data, error } = await supabase.rpc("list_my_conversation_room_feed", {
    _room_id: roomId,
    _thread_id: (options.threadId ?? null) as unknown as string,
    _limit: options.limit ?? 50,
    _before_created_at: (options.cursor?.createdAt ?? null) as unknown as string,
    _before_id: (options.cursor?.id ?? null) as unknown as string,
  });
  if (error) throw new Error(error.message);
  const parsed = parseSpaceFeedPayload(data);
  return { ...parsed, items: await signVisibleAttachments(parsed.items) };
}

export async function getSpaceRoomControls(roomId: string): Promise<SpaceRoomControls> {
  const { data, error } = await supabase.rpc("get_my_conversation_room_controls", {
    _room_id: roomId,
  });
  if (error) throw new Error(error.message);
  return parseSpaceRoomControls(data);
}

export async function toggleSpaceBookmark(messageId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("toggle_my_conversation_bookmark", {
    _message_id: messageId,
  });
  if (error) throw new Error(error.message);
  const result = objectValue(data);
  if (textValue(result.messageId) !== messageId || typeof result.bookmarked !== "boolean") {
    throw new Error("The bookmark operation returned an invalid result");
  }
  return result.bookmarked;
}

export async function toggleSpacePin(messageId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("toggle_managed_conversation_pin", {
    _message_id: messageId,
  });
  if (error) throw new Error(error.message);
  const result = objectValue(data);
  if (textValue(result.messageId) !== messageId || typeof result.pinned !== "boolean") {
    throw new Error("The pin operation returned an invalid result");
  }
  return result.pinned;
}

export async function setSpaceThreadFollowing(threadId: string, follow: boolean): Promise<void> {
  const { data, error } = await supabase.rpc("set_my_conversation_thread_follow", {
    _thread_id: threadId,
    _follow: follow,
  });
  if (error) throw new Error(error.message);
  const result = objectValue(data);
  if (textValue(result.threadId) !== threadId || result.following !== follow) {
    throw new Error("The Thread follow operation returned an invalid result");
  }
}

export async function markSpaceThreadRead(threadId: string, messageId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_my_conversation_thread_read", {
    _thread_id: threadId,
    _message_id: messageId,
  });
  if (error) throw new Error(error.message);
}

export async function setSpaceNotificationPreference(
  spaceId: string,
  roomId: string,
  preference: SpaceNotificationPreference,
): Promise<void> {
  if (!notificationPreferences.has(preference)) {
    throw new Error("Choose a valid notification preference");
  }
  const { data, error } = await supabase.rpc("set_my_conversation_notification_preference", {
    _space_id: spaceId,
    _room_id: roomId,
    _preference: preference,
  });
  if (error) throw new Error(error.message);
  const result = objectValue(data);
  if (
    textValue(result.spaceId) !== spaceId ||
    textValue(result.roomId) !== roomId ||
    textValue(result.preference) !== preference
  ) {
    throw new Error("The notification preference returned an invalid result");
  }
}

export async function sendSpaceMessage(
  roomId: string,
  content: string,
  threadId?: string,
  mentionedUserIds: readonly string[] = [],
): Promise<string> {
  const cleanContent = content.trim();
  if (!cleanContent) throw new Error("Write a message first");
  const mentions = normalizeSpaceMentionIds(mentionedUserIds, null);
  const { data, error } = await supabase.rpc("send_my_conversation_message_with_mentions", {
    _room_id: roomId,
    _thread_id: (threadId ?? null) as unknown as string,
    _content: cleanContent,
    _client_request_id: crypto.randomUUID(),
    _mentioned_user_ids: mentions,
  });
  if (error) throw new Error(error.message);
  return data.id;
}

export async function createMessageThread(
  roomId: string,
  parentMessageId: string,
  title?: string,
): Promise<SpaceThreadSummary> {
  const { data, error } = await supabase.rpc("create_my_conversation_thread", {
    _room_id: roomId,
    _parent_message_id: parentMessageId,
    _title: (title?.trim() || null) as unknown as string,
    _visibility: "room",
    _client_request_id: crypto.randomUUID(),
  });
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    title: data.title,
    replyCount: 0,
    updatedAt: data.updated_at,
    lockedAt: data.locked_at,
  };
}

export async function toggleSpaceReaction(
  messageId: string,
  reaction: SpaceReaction["key"],
): Promise<void> {
  const { error } = await supabase.rpc("toggle_my_conversation_reaction", {
    _message_id: messageId,
    _reaction_key: reaction,
  });
  if (error) throw new Error(error.message);
}

export async function reportSpaceMessage(
  messageId: string,
  category: string,
  description: string,
): Promise<void> {
  const { error } = await supabase.rpc("report_my_conversation_message", {
    _message_id: messageId,
    _category: category,
    _description: description.trim(),
    _client_request_id: crypto.randomUUID(),
  });
  if (error) throw new Error(error.message);
}

export async function updateSpaceRoom(
  roomId: string,
  displayName: string,
  description: string,
  postingPolicy: string,
): Promise<void> {
  const { error } = await supabase.rpc("update_managed_conversation_room", {
    _room_id: roomId,
    _display_name: displayName.trim(),
    _description: description.trim(),
    _posting_policy: postingPolicy,
  });
  if (error) throw new Error(error.message);
}

export async function moderateSpaceMessage(
  messageId: string,
  action: "content_restrict" | "restore",
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("moderate_conversation_message", {
    _message_id: messageId,
    _action: action,
    _reason: reason,
    _client_request_id: crypto.randomUUID(),
  });
  if (error) throw new Error(error.message);
}

export async function setSpaceThreadLock(
  threadId: string,
  locked: boolean,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("set_managed_conversation_thread_lock", {
    _thread_id: threadId,
    _locked: locked,
    _reason: reason,
    _client_request_id: crypto.randomUUID(),
  });
  if (error) throw new Error(error.message);
}

export async function uploadSpaceAttachment(messageId: string, file: File): Promise<void> {
  if (!attachmentTypes.has(file.type)) throw new Error("This file type is not supported");
  if (file.size < 1 || file.size > 10 * 1024 * 1024) {
    throw new Error("Attachments must be 10 MB or smaller");
  }
  const { data, error } = await supabase.rpc("prepare_my_conversation_attachment", {
    _message_id: messageId,
    _file_name: file.name,
    _content_type: file.type,
    _byte_size: file.size,
    _alt_text: null as unknown as string,
    _client_request_id: crypto.randomUUID(),
  });
  if (error) throw new Error(error.message);
  const attachment = objectValue(data);
  const id = textValue(attachment.id);
  const bucket = textValue(attachment.storage_bucket, "orbit-attachments");
  const path = textValue(attachment.storage_path);
  if (!id || !path) throw new Error("Attachment reservation was incomplete");
  const upload = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);
  const finalized = await supabase.rpc("finalize_my_conversation_attachment", {
    _attachment_id: id,
  });
  if (finalized.error) throw new Error(finalized.error.message);
}

export async function markSpaceRoomRead(roomId: string, messageId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_my_conversation_room_read", {
    _room_id: roomId,
    _message_id: messageId,
  });
  if (error) throw new Error(error.message);
}
